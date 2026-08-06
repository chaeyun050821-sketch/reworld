import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { AvatarWithCompanions } from "./App";
import {
  avatarPreviewHeightForWidth,
  canEquipOnAvatar,
  loadMyInventory,
  type HandMadeItem,
} from "../lib/shop-storage";
import {
  loadOwnGiftableItems,
  loadPeerGiftableItems,
  type GiftBegPayload,
} from "../lib/commerce";
import { fetchUserInventory } from "../lib/user-sync";
import { loadNotifications, subscribeNotifications } from "../lib/notifications";
import { getShopItemImage, type ShopCatalogItem } from "./shop-catalog";
import BegGiftModal from "./BegGiftModal";
import GiftModal, { type GiftSuccessInfo } from "./GiftModal";

const WORLD_AVATAR_WIDTH = 52;
const WORLD_AVATAR_HEIGHT = avatarPreviewHeightForWidth(WORLD_AVATAR_WIDTH);

type GiftReceivedToast = {
  id: string;
  fromNickname: string;
  text: string;
  note?: string;
};

type GiftReceivedBroadcast = {
  recipientId?: string;
  fromUserId?: string;
  fromNickname?: string;
  kind?: "item" | "clover";
  itemLabel?: string;
  amount?: number;
  note?: string;
  message?: string;
};

/** Equipped overlay items the local player can share for peer AvatarWithCompanions. */
function loadEquippedWearables(userId: string, equipped: string[] | undefined | null): HandMadeItem[] {
  const equippedSet = new Set(equipped ?? []);
  if (equippedSet.size === 0) return [];
  return loadMyInventory(userId).filter(
    (item) => equippedSet.has(item.id) && canEquipOnAvatar(item),
  );
}

function mergePeerWearInventory(
  prev: HandMadeItem[] | undefined,
  next: HandMadeItem[],
): HandMadeItem[] {
  if (!prev?.length) return next;
  const map = new Map(prev.map((item) => [item.id, item]));
  for (const item of next) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

interface PlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: "left" | "right";
  isMoving: boolean;
  avatar: any;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

type BegTarget = { userId: string; name: string };

export default function WorldPage({ user, myAvatar, inventoryRevision = 0, onGoHome }: any) {
  const [myPos, setMyPos] = useState({ x: 400, y: 320, direction: "right" as "left" | "right", isMoving: false });
  const [players, setPlayers] = useState<Record<string, PlayerData>>({});
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const [activeChat, setActiveChat] = useState<{ userId: string; name: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");

  const [peerInventories, setPeerInventories] = useState<Record<string, ShopCatalogItem[]>>({});
  /** Handmade/purchased overlays for peer AvatarWithCompanions (not giftable shop catalog). */
  const [peerWearInventories, setPeerWearInventories] = useState<Record<string, HandMadeItem[]>>({});
  const [begTarget, setBegTarget] = useState<BegTarget | null>(null);
  const [begItemsLoading, setBegItemsLoading] = useState(false);
  const [incomingBeg, setIncomingBeg] = useState<GiftBegPayload | null>(null);
  const [giftReply, setGiftReply] = useState<{
    recipientId: string;
    recipientNickname: string;
    itemId: string;
  } | null>(null);
  const [begSentToast, setBegSentToast] = useState<string | null>(null);
  const [giftReceivedToast, setGiftReceivedToast] = useState<GiftReceivedToast | null>(null);
  const [showMyItems, setShowMyItems] = useState(false);
  const [myItems, setMyItems] = useState<ShopCatalogItem[]>([]);
  const [myItemsLoading, setMyItemsLoading] = useState(false);

  const moveTimeout = useRef<NodeJS.Timeout | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerWearFetchRef = useRef<Set<string>>(new Set());
  const seenGiftNotifIdsRef = useRef<Set<string>>(new Set());
  const giftToastTimerRef = useRef<number | null>(null);
  const recentGiftToastKeysRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeChat]);

  const broadcastMyInventory = useCallback(async (channel = channelRef.current) => {
    if (!channel || !user?.id) return;
    try {
      const items = await loadOwnGiftableItems(user.id);
      const wearItems = loadEquippedWearables(user.id, myAvatar?.equipped);
      void channel.send({
        type: "broadcast",
        event: "inventory_share",
        payload: {
          userId: user.id,
          items: items.map((item) => ({
            id: item.id,
            label: item.label,
            kind: item.kind,
            category: item.category,
            color: item.color,
            preview: item.preview,
            price: item.price,
            contentId: item.contentId,
            imageFile: item.imageFile,
            giftable: item.giftable,
          })),
          // Equipped handmade overlays so peers can render AvatarWithCompanions.
          wearItems: wearItems.map((item) => ({
            id: item.id,
            type: item.type,
            label: item.label,
            cat: item.cat,
            color: item.color,
            source: item.source,
            artStyle: item.artStyle,
            templateId: item.templateId,
            icon: item.icon,
            roomCategory: item.roomCategory,
            placement: item.placement,
            contentBounds: item.contentBounds,
            avatarPlaced: item.avatarPlaced,
            imageDataUrl: item.imageDataUrl,
            createdAt: item.createdAt,
          })),
          equipped: myAvatar?.equipped ?? [],
        },
      });
    } catch (error) {
      console.warn("[world] inventory share failed:", error);
    }
  }, [user?.id, myAvatar?.equipped]);

  const requestPeerInventory = useCallback((targetUserId: string) => {
    if (!channelRef.current || !user?.id) return;
    void channelRef.current.send({
      type: "broadcast",
      event: "inventory_request",
      payload: { fromUserId: user.id, toUserId: targetUserId },
    });
  }, [user?.id]);

  const applyPeerWearItems = useCallback((peerId: string, items: HandMadeItem[]) => {
    if (!peerId || peerId === user?.id || !items?.length) return;
    setPeerWearInventories((prev) => ({
      ...prev,
      [peerId]: mergePeerWearInventory(prev[peerId], items),
    }));
  }, [user?.id]);

  const ensurePeerWearables = useCallback((peerId: string) => {
    if (!peerId || peerId === user?.id) return;

    requestPeerInventory(peerId);

    if (peerWearFetchRef.current.has(peerId)) return;
    peerWearFetchRef.current.add(peerId);

    void (async () => {
      try {
        const remote = await fetchUserInventory(peerId);
        if (!remote?.items?.length) return;
        // Keep all equipable items; AvatarWithCompanions filters by avatar.equipped.
        applyPeerWearItems(
          peerId,
          remote.items.filter((item) => canEquipOnAvatar(item)),
        );
      } catch (error) {
        console.warn("[world] peer wearables fetch failed:", error);
        peerWearFetchRef.current.delete(peerId);
      }
    })();
  }, [user?.id, requestPeerInventory, applyPeerWearItems]);

  const openBegForPlayer = useCallback(async (player: PlayerData) => {
    setSelectedPlayerId(null);
    setShowMyItems(false);
    setBegTarget({ userId: player.id, name: player.name });
    setBegItemsLoading(true);

    const cached = peerInventories[player.id];
    if (cached && cached.length > 0) {
      setBegItemsLoading(false);
    }

    requestPeerInventory(player.id);

    const peer = await loadPeerGiftableItems(player.id);
    if (peer && peer.length > 0) {
      setPeerInventories((prev) => ({ ...prev, [player.id]: peer }));
      setBegItemsLoading(false);
      return;
    }

    // Wait briefly for broadcast reply; keep spinner if still empty.
    window.setTimeout(() => {
      setBegItemsLoading(false);
    }, 1800);
  }, [peerInventories, requestPeerInventory]);

  const showGiftToast = useCallback((toast: Omit<GiftReceivedToast, "id"> & { id?: string }) => {
    const key = `${toast.fromNickname}|${toast.text}`;
    const now = Date.now();
    const last = recentGiftToastKeysRef.current.get(key) ?? 0;
    if (now - last < 5000) return;
    recentGiftToastKeysRef.current.set(key, now);

    if (giftToastTimerRef.current) window.clearTimeout(giftToastTimerRef.current);
    const next = { ...toast, id: toast.id ?? crypto.randomUUID() };
    setGiftReceivedToast(next);
    giftToastTimerRef.current = window.setTimeout(() => {
      setGiftReceivedToast((prev) => (prev?.id === next.id ? null : prev));
      giftToastTimerRef.current = null;
    }, 4200);
  }, []);

  const openMyItems = useCallback(async () => {
    setSelectedPlayerId(null);
    setBegTarget(null);
    setShowMyItems(true);
    setMyItemsLoading(true);
    try {
      const items = await loadOwnGiftableItems(user.id);
      setMyItems(items);
    } catch (error) {
      console.warn("[world] load own items failed:", error);
      setMyItems([]);
    } finally {
      setMyItemsLoading(false);
    }
  }, [user?.id]);

  const handleGiftReceivedRealtime = useCallback(
    (payload: GiftReceivedBroadcast) => {
      if (!payload?.recipientId || payload.recipientId !== user.id) return;
      void import("../lib/unified-gifts").then(({ pullGiftedInventory }) =>
        pullGiftedInventory(user.id),
      );
      void broadcastMyInventory();

      const fromNickname = payload.fromNickname?.trim() || "친구";
      const text =
        payload.message?.trim() ||
        (payload.kind === "clover" && payload.amount
          ? `${fromNickname}님이 ${payload.amount} 클로버를 선물했어요 🍀`
          : payload.itemLabel
            ? `${fromNickname}님이 ${payload.itemLabel}을(를) 선물했어요 🎁`
            : `${fromNickname}님이 선물을 보냈어요 🎁`);
      showGiftToast({
        fromNickname,
        text,
        note: payload.note,
      });
    },
    [user?.id, broadcastMyInventory, showGiftToast],
  );

  useEffect(() => {
    const channel = supabase.channel("meeting_square");
    channelRef.current = channel;

    channel.on(
      "broadcast",
      { event: "player_moved" },
      ({ payload }) => {
        if (payload.id === user.id) return;
        setPlayers((prev) => {
          if (!prev[payload.id]) {
            // Defer so we don't run async work inside the state updater.
            queueMicrotask(() => ensurePeerWearables(payload.id));
          }
          return { ...prev, [payload.id]: payload };
        });
      }
    );

    channel.on(
      "broadcast",
      { event: "whisper" },
      ({ payload }: { payload: ChatMessage }) => {
        if (payload.receiverId === user.id || payload.senderId === user.id) {
          setChatMessages((prev) => [...prev, payload]);
          if (payload.receiverId === user.id) {
            setActiveChat({ userId: payload.senderId, name: payload.senderName });
          }
        }
      }
    );

    channel.on(
      "broadcast",
      { event: "inventory_share" },
      ({
        payload,
      }: {
        payload: {
          userId: string;
          items: ShopCatalogItem[];
          wearItems?: HandMadeItem[];
          equipped?: string[];
        };
      }) => {
        if (!payload?.userId || payload.userId === user.id) return;
        const items = (payload.items ?? [])
          .filter((item): item is ShopCatalogItem => Boolean(item?.giftable !== false && item?.id && item?.label));
        setPeerInventories((prev) => ({ ...prev, [payload.userId]: items }));
        if (payload.wearItems?.length) {
          applyPeerWearItems(payload.userId, payload.wearItems);
        }
        setBegItemsLoading(false);
      }
    );

    channel.on(
      "broadcast",
      { event: "gift_received" },
      ({ payload }: { payload: GiftReceivedBroadcast }) => {
        handleGiftReceivedRealtime(payload);
      },
    );

    channel.on(
      "broadcast",
      { event: "inventory_request" },
      ({ payload }: { payload: { fromUserId: string; toUserId: string } }) => {
        if (payload?.toUserId === user.id) {
          void broadcastMyInventory(channel);
        }
      }
    );

    channel.on(
      "broadcast",
      { event: "gift_beg" },
      ({ payload }: { payload: GiftBegPayload }) => {
        if (payload?.toUserId === user.id && payload.fromUserId !== user.id) {
          setIncomingBeg(payload);
        }
      }
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        broadcastMyPosition(myPos.x, myPos.y, myPos.direction, myPos.isMoving);
        void broadcastMyInventory(channel);
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT") return;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setSelectedPlayerId(null);
        setShowMyItems(false);
      }

      setMyPos((prev) => {
        let newX = prev.x;
        let newY = prev.y;
        let newDir = prev.direction;
        const speed = 15;

        if (e.key === "ArrowUp") newY -= speed;
        if (e.key === "ArrowDown") newY += speed;
        if (e.key === "ArrowLeft") { newX -= speed; newDir = "left"; }
        if (e.key === "ArrowRight") { newX += speed; newDir = "right"; }

        if (newX < 50) newX = 50;
        if (newX > 750) newX = 750;

        let minY, maxY;
        if (newX <= 400) {
          const ratio = (newX - 50) / 350;
          minY = 310 - (90 * ratio);
          maxY = 310 + (90 * ratio);
        } else {
          const ratio = (newX - 400) / 350;
          minY = 220 + (90 * ratio);
          maxY = 400 - (90 * ratio);
        }

        if (newY < minY) newY = minY;
        if (newY > maxY) newY = maxY;

        const newState = { x: newX, y: newY, direction: newDir as "left" | "right", isMoving: true };
        broadcastMyPosition(newX, newY, newDir, true);
        return newState;
      });

      if (moveTimeout.current) clearTimeout(moveTimeout.current);
      moveTimeout.current = setTimeout(() => {
        setMyPos((prev) => {
          broadcastMyPosition(prev.x, prev.y, prev.direction, false);
          return { ...prev, isMoving: false };
        });
      }, 150);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      supabase.removeChannel(channel);
      if (moveTimeout.current) clearTimeout(moveTimeout.current);
      channelRef.current = null;
    };

    function broadcastMyPosition(x: number, y: number, direction: string, isMoving: boolean) {
      channel.send({
        type: "broadcast",
        event: "player_moved",
        payload: { id: user.id, name: user.nickname, x, y, direction, isMoving, avatar: myAvatar },
      });
    }
  }, [user, myAvatar, broadcastMyInventory, ensurePeerWearables, applyPeerWearItems, handleGiftReceivedRealtime]);

  // Seed known gift notification ids, then toast on new gift rows while in WORLD.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    let seeded = false;

    void loadNotifications(user.id).then((rows) => {
      if (cancelled) return;
      rows
        .filter((row) => row.type === "gift")
        .forEach((row) => seenGiftNotifIdsRef.current.add(row.id));
      seeded = true;
    });

    const handleGiftRows = (rows: Awaited<ReturnType<typeof loadNotifications>>) => {
      if (cancelled || !seeded) return;
      const gifts = rows.filter((row) => row.type === "gift");
      for (const row of gifts) {
        if (seenGiftNotifIdsRef.current.has(row.id)) continue;
        seenGiftNotifIdsRef.current.add(row.id);
        void import("../lib/unified-gifts").then(({ pullGiftedInventory }) =>
          pullGiftedInventory(user.id),
        );
        void broadcastMyInventory();
        showGiftToast({
          id: row.id,
          fromNickname: row.actorNickname,
          text: row.message,
          note: row.content,
        });
      }
    };

    const unsubscribe = subscribeNotifications(user.id, () => {
      void loadNotifications(user.id).then(handleGiftRows);
    });

    const onLocalChange = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (detail?.userId && detail.userId !== user.id) return;
      void loadNotifications(user.id).then(handleGiftRows);
    };
    window.addEventListener("reworld-notifications-changed", onLocalChange);

    return () => {
      cancelled = true;
      unsubscribe();
      window.removeEventListener("reworld-notifications-changed", onLocalChange);
      if (giftToastTimerRef.current) window.clearTimeout(giftToastTimerRef.current);
    };
  }, [user?.id, broadcastMyInventory, showGiftToast]);

  // Re-share giftable + equipped wearables when closet / shop purchases change.
  useEffect(() => {
    void broadcastMyInventory();
  }, [inventoryRevision, myAvatar?.equipped, broadcastMyInventory]);

  const sendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChat || !channelRef.current) return;

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: user.id,
      senderName: user.nickname || "나",
      receiverId: activeChat.userId,
      text: chatInput.trim(),
      timestamp: Date.now(),
    };

    channelRef.current.send({
      type: "broadcast",
      event: "whisper",
      payload: newMessage,
    });

    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput("");
  };

  const handleBegSent = (beg: GiftBegPayload) => {
    if (channelRef.current) {
      void channelRef.current.send({
        type: "broadcast",
        event: "gift_beg",
        payload: beg,
      });
    }
    setBegTarget(null);
    setBegSentToast(`${beg.itemLabel} 조르기를 보냈어요!`);
    window.setTimeout(() => setBegSentToast(null), 2400);
  };

  const currentChatHistory = chatMessages.filter(
    (msg) =>
      (msg.senderId === user.id && msg.receiverId === activeChat?.userId) ||
      (msg.senderId === activeChat?.userId && msg.receiverId === user.id)
  );

  const begItems = begTarget ? (peerInventories[begTarget.userId] ?? []) : [];

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-lg flex flex-col select-none cursor-default"
      style={{ backgroundColor: "#FDF6E3" }}
      onClick={() => {
        setSelectedPlayerId(null);
        setShowMyItems(false);
      }}
    >
      <style>{`
        @keyframes walk {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-4px) rotate(-6deg); }
          75% { transform: translateY(-4px) rotate(6deg); }
        }
        .walking { animation: walk 0.3s infinite; }
        @keyframes popIn {
          0% { opacity: 0; transform: translate(-50%, 10px) scale(0.9); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        .animate-pop-in { animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="absolute top-6 left-8 z-30 flex items-center gap-3">
        <button
          onClick={onGoHome}
          className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl border border-amber-300 shadow-sm hover:bg-amber-100 hover:scale-105 transition-all flex items-center gap-1.5 text-amber-900 font-bold text-sm cursor-pointer"
        >
          <span>🏠</span>
          <span>나가기</span>
        </button>

        <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl border border-amber-200 shadow-sm flex items-center gap-3">
          <span className="text-base">🤝</span>
          <span className="text-sm font-bold text-amber-900">만남의 광장</span>
          <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-semibold shadow-inner">
            접속자: {Object.keys(players).length + 1}명
          </span>
        </div>
      </div>

      {begSentToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-amber-900/85 text-white text-xs font-bold shadow-lg">
          🥺 {begSentToast}
        </div>
      )}

      {giftReceivedToast && (
        <div
          className="absolute top-20 left-1/2 -translate-x-1/2 z-[70] w-[min(320px,calc(100%-24px))] rounded-2xl border border-pink-200 bg-white shadow-2xl overflow-hidden animate-pop-in"
          style={{ transform: "translateX(-50%)" }}
        >
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 px-4 py-3 border-b border-pink-100">
            <p className="text-sm font-bold text-pink-700">🎁 선물 도착!</p>
            <p className="text-[12px] text-pink-900/85 mt-1 leading-snug">{giftReceivedToast.text}</p>
            {giftReceivedToast.note && (
              <p className="text-[11px] text-pink-700/70 mt-1 italic">&ldquo;{giftReceivedToast.note}&rdquo;</p>
            )}
          </div>
          <button
            type="button"
            className="w-full py-2 text-xs font-bold text-pink-700 hover:bg-pink-50"
            onClick={() => setGiftReceivedToast(null)}
          >
            확인
          </button>
        </div>
      )}

      <div className="absolute inset-0 z-0 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 800 450" preserveAspectRatio="none">
          <polygon points="50,110 400,20 400,220 50,310" fill="#E8E2D2" />
          <polygon points="400,20 750,110 750,310 400,220" fill="#F4EFE1" />
          <polygon points="400,220 750,310 400,400 50,310" fill="#D3C9B3" />
          <line x1="50" y1="310" x2="400" y2="220" stroke="#B8AD94" strokeWidth="2.5" />
          <line x1="400" y1="220" x2="750" y2="310" stroke="#B8AD94" strokeWidth="2.5" />
          <line x1="400" y1="20" x2="400" y2="220" stroke="#CFC5AF" strokeWidth="2.5" strokeDasharray="4 4" />
        </svg>
      </div>

      <div className="relative w-full h-full z-10">
        {Object.values(players).map((player) => (
          <div
            key={player.id}
            className="absolute transition-all duration-150 ease-out cursor-pointer group"
            style={{
              left: `${(player.x / 800) * 100}%`,
              top: `${(player.y / 450) * 100}%`,
              transform: "translate(-50%, -100%)",
              zIndex: selectedPlayerId === player.id ? 50 : 10,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPlayerId(selectedPlayerId === player.id ? null : player.id);
            }}
          >
            {selectedPlayerId === player.id && (
              <div className="absolute bottom-[calc(100%+10px)] left-1/2 flex gap-1.5 p-2 bg-white/95 backdrop-blur-md border border-amber-200 rounded-xl shadow-lg animate-pop-in whitespace-nowrap">
                <button
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-lg hover:bg-blue-100 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlayerId(null);
                    setActiveChat({ userId: player.id, name: player.name });
                  }}
                >
                  💬 귓속말
                </button>
                <button
                  className="px-3 py-1.5 bg-pink-50 text-pink-600 text-[11px] font-bold rounded-lg hover:bg-pink-100 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlayerId(null);
                    setGiftReply({
                      recipientId: player.id,
                      recipientNickname: player.name,
                      itemId: "",
                    });
                  }}
                >
                  🎁 선물
                </button>
                <button
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-lg hover:bg-amber-100 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    void openBegForPlayer(player);
                  }}
                >
                  🥺 조르기
                </button>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/95 border-b border-r border-amber-200 rotate-45"></div>
              </div>
            )}

            <div
              className={`${player.isMoving ? "walking" : ""} transition-transform group-hover:scale-110`}
              style={{ transform: player.direction === "left" ? "scaleX(-1)" : "scaleX(1)" }}
            >
              <AvatarWithCompanions
                avatar={player.avatar}
                inventory={peerWearInventories[player.id] ?? []}
                width={WORLD_AVATAR_WIDTH}
                height={WORLD_AVATAR_HEIGHT}
                companionScale={0.42}
              />
            </div>
            <div className="bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full text-center mt-1 shadow whitespace-nowrap">
              {player.name}
            </div>
          </div>
        ))}

        <div
          className="absolute transition-all duration-150 ease-out cursor-pointer group"
          style={{
            left: `${(myPos.x / 800) * 100}%`,
            top: `${(myPos.y / 450) * 100}%`,
            transform: "translate(-50%, -100%)",
            zIndex: showMyItems ? 50 : 20,
          }}
          onClick={(e) => {
            e.stopPropagation();
            void openMyItems();
          }}
        >
          {showMyItems && (
            <div
              className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 px-2.5 py-1 bg-white/95 border border-amber-200 rounded-lg shadow text-[10px] font-bold text-amber-800 whitespace-nowrap animate-pop-in"
              onClick={(e) => e.stopPropagation()}
            >
              내 아이템 보는 중
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/95 border-b border-r border-amber-200 rotate-45" />
            </div>
          )}
          <div
            className={`${myPos.isMoving ? "walking" : ""} transition-transform group-hover:scale-110`}
            style={{ transform: myPos.direction === "left" ? "scaleX(-1)" : "scaleX(1)" }}
          >
            <AvatarWithCompanions
              avatar={myAvatar}
              userId={user?.id}
              width={WORLD_AVATAR_WIDTH}
              height={WORLD_AVATAR_HEIGHT}
              inventoryRevision={inventoryRevision}
              companionScale={0.42}
            />
          </div>
          <div className="bg-amber-900/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full text-center mt-1 shadow border border-amber-300">
            {user?.nickname || "나"} · 내 아이템
          </div>
        </div>
      </div>

      {activeChat && (
        <div
          className="absolute bottom-6 right-6 w-72 h-80 bg-white border border-sky-200 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-sky-50 px-4 py-3 border-b border-sky-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <span className="text-sm font-bold text-sky-900">{activeChat.name}님과 귓속말</span>
            </div>
            <button
              onClick={() => setActiveChat(null)}
              className="text-sky-400 hover:text-sky-600 transition-colors"
            >
              ✕
            </button>
          </div>

          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar bg-sky-50/30">
            {currentChatHistory.length === 0 ? (
              <div className="text-xs text-center text-gray-400 mt-4">대화를 시작해보세요!</div>
            ) : (
              currentChatHistory.map((msg) => {
                const isMe = msg.senderId === user.id;
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] text-gray-400 mb-1 mx-1">
                      {isMe ? "나" : msg.senderName}
                    </span>
                    <div
                      className={`px-3 py-2 rounded-2xl text-xs max-w-[80%] break-words shadow-sm ${
                        isMe
                          ? "bg-sky-500 text-white rounded-tr-sm"
                          : "bg-white border border-gray-100 rounded-tl-sm text-gray-700"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form onSubmit={sendChatMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="메시지를 입력하세요..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-sky-300 focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="bg-sky-500 text-white px-3 py-2 rounded-xl text-xs font-bold disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              전송
            </button>
          </form>
        </div>
      )}

      {incomingBeg && (
        <div
          className="absolute bottom-6 left-6 z-[60] w-72 rounded-2xl border border-amber-200 bg-white shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
            <p className="text-sm font-bold text-amber-900">🥺 조르기 도착</p>
            <p className="text-[11px] text-amber-800/80 mt-0.5">
              {incomingBeg.fromNickname}님이 <strong>{incomingBeg.itemLabel}</strong>을(를) 조르고 있어요
            </p>
            {incomingBeg.message && (
              <p className="text-[11px] text-amber-700/70 mt-1 italic">&ldquo;{incomingBeg.message}&rdquo;</p>
            )}
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100"
              onClick={() => setIncomingBeg(null)}
            >
              나중에
            </button>
            <button
              type="button"
              className="py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-pink-500 to-rose-400 hover:opacity-90"
              onClick={() => {
                setGiftReply({
                  recipientId: incomingBeg.fromUserId,
                  recipientNickname: incomingBeg.fromNickname,
                  itemId: incomingBeg.itemId,
                });
                setIncomingBeg(null);
              }}
            >
              선물하기
            </button>
          </div>
        </div>
      )}

      {begTarget && (
        <BegGiftModal
          user={user}
          targetId={begTarget.userId}
          targetNickname={begTarget.name}
          items={begItems}
          loading={begItemsLoading && begItems.length === 0}
          onRequestRefresh={() => requestPeerInventory(begTarget.userId)}
          onSent={handleBegSent}
          onClose={() => setBegTarget(null)}
        />
      )}

      {giftReply && (
        <GiftModal
          user={user}
          recipientId={giftReply.recipientId}
          recipientNickname={giftReply.recipientNickname}
          initialItemId={giftReply.itemId || null}
          onSuccess={(info: GiftSuccessInfo) => {
            if (channelRef.current) {
              void channelRef.current.send({
                type: "broadcast",
                event: "gift_received",
                payload: {
                  recipientId: giftReply.recipientId,
                  fromUserId: user.id,
                  fromNickname: user.nickname,
                  kind: info.kind,
                  itemLabel: info.itemLabel,
                  amount: info.amount,
                  note: info.note,
                  message:
                    info.kind === "clover" && info.amount
                      ? `${user.nickname}님이 ${info.amount} 클로버를 선물했어요 🍀`
                      : info.itemLabel
                        ? `${user.nickname}님이 ${info.itemLabel}을(를) 선물했어요 🎁`
                        : `${user.nickname}님이 선물을 보냈어요 🎁`,
                } satisfies GiftReceivedBroadcast,
              });
            }
            void broadcastMyInventory();
          }}
          onClose={() => setGiftReply(null)}
        />
      )}

      {showMyItems && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-3"
          style={{ background: "rgba(48,35,20,0.42)" }}
          onClick={() => setShowMyItems(false)}
        >
          <div
            className="rounded-2xl p-3 flex flex-col gap-2 overflow-hidden w-full"
            style={{
              maxWidth: 330,
              maxHeight: "min(520px, calc(100vh - 24px))",
              background: "linear-gradient(160deg,#fffdf6,#fff6e8)",
              border: "2px solid rgba(220,160,60,0.32)",
              boxShadow: "0 16px 48px rgba(70,45,20,0.22)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between flex-shrink-0">
              <div>
                <p className="text-[10px] font-bold text-amber-600 tracking-wide">MY ITEMS</p>
                <p className="text-sm font-black text-amber-950">내 아이템</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMyItems(false)}
                className="w-7 h-7 rounded-full text-amber-800/70 bg-amber-100/80 text-sm font-bold"
              >
                ×
              </button>
            </div>
            <p className="text-[11px] text-amber-800/70 flex-shrink-0">
              월드에서 선물하거나 조르기 받을 수 있는 아이템이에요.
            </p>
            <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-3 gap-2 content-start min-h-0">
              {myItemsLoading ? (
                <p className="col-span-3 text-center text-xs text-amber-700/60 py-8">불러오는 중...</p>
              ) : myItems.length === 0 ? (
                <p className="col-span-3 text-center text-xs text-amber-700/60 py-8">
                  아직 선물 가능한 아이템이 없어요
                </p>
              ) : (
                myItems.map((item) => {
                  const src = getShopItemImage(item);
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-amber-200/80 bg-white/80 p-2 flex flex-col items-center gap-1"
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ background: `${item.color}22` }}
                      >
                        {src ? (
                          <img
                            src={src}
                            alt={item.label}
                            width={40}
                            height={40}
                            style={{ objectFit: "contain", imageRendering: "pixelated" }}
                          />
                        ) : (
                          <span className="text-2xl">{item.preview}</span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-amber-950 text-center leading-tight line-clamp-2">
                        {item.label}
                      </p>
                      <p className="text-[9px] text-amber-700/60">{item.category}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
