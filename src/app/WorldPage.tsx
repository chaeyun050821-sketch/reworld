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
  loadOwnShopItems,
  loadPeerShopItems,
  type GiftBegPayload,
} from "../lib/commerce";
import { fetchUserInventory } from "../lib/user-sync";
import { loadNotifications, subscribeNotifications } from "../lib/notifications";
import { getShopItemImage, type ShopCatalogItem } from "./shop-catalog";
import BegGiftModal from "./BegGiftModal";
import GiftModal, { type GiftSuccessInfo } from "./GiftModal";
import worldBackgroundImage from "../assets/world-pink-house.png";

const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 450;
const WORLD_AVATAR_WIDTH = 28;
const WORLD_AVATAR_HEIGHT = avatarPreviewHeightForWidth(WORLD_AVATAR_WIDTH);
const WORLD_WALK_SPEED = 64;
const WORLD_JUMP_VELOCITY = 200;
const WORLD_GRAVITY = 520;

type WorldFloor = {
  y: number;
  minX: number;
  maxX: number;
  doorX: number;
  maxJumpRise: number;
};

/** 3층 픽셀 하우스의 바닥선·외벽 안쪽·문 중심을 800×450 좌표로 옮긴 값. */
const WORLD_FLOORS: WorldFloor[] = [
  { y: 182, minX: 222, maxX: 578, doorX: 400, maxJumpRise: 36 },
  { y: 284, minX: 82, maxX: 718, doorX: 400, maxJumpRise: 28 },
  { y: 389, minX: 82, maxX: 718, doorX: 400, maxJumpRise: 30 },
];
const WORLD_DOOR_ACTIVATION_RADIUS = 34;
const WORLD_SPAWN = { x: WORLD_FLOORS[2].doorX, y: WORLD_FLOORS[2].y, floorIndex: 2 };

type LocalPlayerPosition = {
  x: number;
  y: number;
  floorIndex: number;
  direction: "left" | "right";
  isMoving: boolean;
  isJumping: boolean;
};

type PlayerPhysics = LocalPlayerPosition & {
  velocityY: number;
  onGround: boolean;
};

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
  floorIndex?: number;
  direction: "left" | "right";
  isMoving: boolean;
  isJumping?: boolean;
  avatar: any;
  lastSeenAt: number;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  timestamp: number;
}

interface PublicChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

type SpeechBubble = {
  messageId: string;
  text: string;
};

type ConversationRequest = {
  id: string;
  fromUserId: string;
  fromNickname: string;
  toUserId: string;
  createdAt: number;
};

type ConversationResponse = {
  requestId: string;
  fromUserId: string;
  fromNickname: string;
  toUserId: string;
  accepted: boolean;
};

type BegResponseBroadcast = {
  requestId: string;
  fromUserId: string;
  fromNickname: string;
  toUserId: string;
  itemLabel: string;
  accepted: boolean;
};

type BegTarget = { userId: string; name: string };

export default function WorldPage({ user, myAvatar, inventoryRevision = 0, onGoHome }: any) {
  const worldRef = useRef<HTMLDivElement>(null);
  const [viewportScale, setViewportScale] = useState({ x: 1, y: 1 });
  const [myPos, setMyPos] = useState<LocalPlayerPosition>({
    ...WORLD_SPAWN,
    direction: "right",
    isMoving: false,
    isJumping: false,
  });
  const [players, setPlayers] = useState<Record<string, PlayerData>>({});
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const [activeChat, setActiveChat] = useState<{ userId: string; name: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [publicChatMessages, setPublicChatMessages] = useState<PublicChatMessage[]>([]);
  const [publicChatInput, setPublicChatInput] = useState("");
  const [publicChatOpen, setPublicChatOpen] = useState(false);
  const [speechBubbles, setSpeechBubbles] = useState<Record<string, SpeechBubble>>({});
  const [incomingChatRequest, setIncomingChatRequest] = useState<ConversationRequest | null>(null);
  const [outgoingChatRequest, setOutgoingChatRequest] = useState<ConversationRequest | null>(null);
  const [approvedChatUserIds, setApprovedChatUserIds] = useState<Set<string>>(() => new Set());
  const [conversationToast, setConversationToast] = useState<string | null>(null);

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
  const [showControlsGuide, setShowControlsGuide] = useState(true);

  const physicsRef = useRef<PlayerPhysics>({
    ...WORLD_SPAWN,
    direction: "right",
    isMoving: false,
    isJumping: false,
    velocityY: 0,
    onGround: true,
  });
  const pressedKeysRef = useRef<Set<"left" | "right">>(new Set());
  const jumpRequestedRef = useRef(false);
  const floorChangeRequestedRef = useRef<-1 | 1 | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const publicChatScrollRef = useRef<HTMLDivElement>(null);
  const publicChatInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerWearFetchRef = useRef<Set<string>>(new Set());
  const seenGiftNotifIdsRef = useRef<Set<string>>(new Set());
  const giftToastTimerRef = useRef<number | null>(null);
  const conversationToastTimerRef = useRef<number | null>(null);
  const speechBubbleTimersRef = useRef<Map<string, number>>(new Map());
  const recentGiftToastKeysRef = useRef<Map<string, number>>(new Map());
  const renderedAvatarWidth = Math.max(18, Math.round(WORLD_AVATAR_WIDTH * viewportScale.x));
  const renderedAvatarHeight = Math.max(32, Math.round(WORLD_AVATAR_HEIGHT * viewportScale.y));

  const showConversationToast = useCallback((message: string) => {
    if (conversationToastTimerRef.current) window.clearTimeout(conversationToastTimerRef.current);
    setConversationToast(message);
    conversationToastTimerRef.current = window.setTimeout(() => {
      setConversationToast(null);
      conversationToastTimerRef.current = null;
    }, 3200);
  }, []);

  const showSpeechBubble = useCallback((userId: string, messageId: string, text: string) => {
    const currentTimer = speechBubbleTimersRef.current.get(userId);
    if (currentTimer) window.clearTimeout(currentTimer);
    setSpeechBubbles((prev) => ({ ...prev, [userId]: { messageId, text } }));
    const timer = window.setTimeout(() => {
      setSpeechBubbles((prev) => {
        if (prev[userId]?.messageId !== messageId) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      speechBubbleTimersRef.current.delete(userId);
    }, 5200);
    speechBubbleTimersRef.current.set(userId, timer);
  }, []);

  const broadcastMyPosition = useCallback((position: LocalPlayerPosition) => {
    const channel = channelRef.current;
    if (!channel || !user?.id) return;
    void channel.send({
      type: "broadcast",
      event: "player_moved",
      payload: {
        id: user.id,
        name: user.nickname,
        x: position.x,
        y: position.y,
        floorIndex: position.floorIndex,
        direction: position.direction,
        isMoving: position.isMoving,
        isJumping: position.isJumping,
        avatar: myAvatar,
      },
    });
  }, [user?.id, user?.nickname, myAvatar]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeChat]);

  useEffect(() => {
    if (publicChatScrollRef.current) {
      publicChatScrollRef.current.scrollTop = publicChatScrollRef.current.scrollHeight;
    }
  }, [publicChatMessages]);

  useEffect(() => {
    if (!publicChatOpen) return;
    window.setTimeout(() => publicChatInputRef.current?.focus(), 0);
  }, [publicChatOpen]);

  useEffect(() => () => {
    speechBubbleTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    speechBubbleTimersRef.current.clear();
    if (conversationToastTimerRef.current) window.clearTimeout(conversationToastTimerRef.current);
  }, []);

  useEffect(() => {
    const element = worldRef.current;
    if (!element) return;
    const updateScale = () => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const next = {
        x: rect.width / WORLD_WIDTH,
        y: rect.height / WORLD_HEIGHT,
      };
      setViewportScale((current) =>
        Math.abs(current.x - next.x) < 0.01 && Math.abs(current.y - next.y) < 0.01
          ? current
          : next,
      );
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const broadcastMyInventory = useCallback(async (channel = channelRef.current) => {
    if (!channel || !user?.id) return;
    try {
      const items = await loadOwnShopItems(user.id, user.nickname);
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
            imageDataUrl: item.imageDataUrl,
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
  }, [user?.id, user?.nickname, myAvatar?.equipped]);

  const requestPeerInventory = useCallback((targetUserId: string) => {
    if (!channelRef.current || !user?.id) return;
    void channelRef.current.send({
      type: "broadcast",
      event: "inventory_request",
      payload: { fromUserId: user.id, toUserId: targetUserId },
    });
  }, [user?.id, user?.nickname]);

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

    const peer = await loadPeerShopItems(player.id);
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
      const items = await loadOwnShopItems(user.id, user.nickname);
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
            ? `${fromNickname}님에게서 아이템 '${payload.itemLabel}'을 선물받았습니다.`
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

    const upsertPlayer = (payload: Omit<PlayerData, "lastSeenAt">) => {
      if (!payload?.id || payload.id === user.id) return;
      setPlayers((prev) => {
        if (!prev[payload.id]) {
          // Defer so we don't run async work inside the state updater.
          queueMicrotask(() => ensurePeerWearables(payload.id));
        }
        return {
          ...prev,
          [payload.id]: { ...payload, lastSeenAt: Date.now() },
        };
      });
    };

    channel.on(
      "broadcast",
      { event: "player_moved" },
      ({ payload }) => {
        upsertPlayer(payload);
      }
    );

    channel.on(
      "broadcast",
      { event: "player_joined" },
      ({ payload }) => upsertPlayer(payload),
    );

    channel.on(
      "broadcast",
      { event: "player_left" },
      ({ payload }: { payload: { userId?: string } }) => {
        if (!payload?.userId || payload.userId === user.id) return;
        setPlayers((prev) => {
          const next = { ...prev };
          delete next[payload.userId!];
          return next;
        });
        setSelectedPlayerId((current) => current === payload.userId ? null : current);
      },
    );

    channel.on(
      "broadcast",
      { event: "world_chat" },
      ({ payload }: { payload: PublicChatMessage }) => {
        if (!payload?.id || !payload.senderId || payload.senderId === user.id || !payload.text?.trim()) return;
        setPublicChatMessages((prev) => [...prev.slice(-79), payload]);
        showSpeechBubble(payload.senderId, payload.id, payload.text.trim());
      },
    );

    channel.on(
      "broadcast",
      { event: "whisper" },
      ({ payload }: { payload: ChatMessage }) => {
        if (payload.receiverId === user.id || payload.senderId === user.id) {
          setChatMessages((prev) => [...prev.slice(-199), payload]);
        }
      }
    );

    channel.on(
      "broadcast",
      { event: "chat_request" },
      ({ payload }: { payload: ConversationRequest }) => {
        if (payload?.toUserId === user.id && payload.fromUserId !== user.id) {
          setIncomingChatRequest(payload);
        }
      },
    );

    channel.on(
      "broadcast",
      { event: "chat_response" },
      ({ payload }: { payload: ConversationResponse }) => {
        if (payload?.toUserId !== user.id || payload.fromUserId === user.id) return;
        setOutgoingChatRequest((current) => current?.id === payload.requestId ? null : current);
        if (payload.accepted) {
          setApprovedChatUserIds((prev) => new Set(prev).add(payload.fromUserId));
          setActiveChat({ userId: payload.fromUserId, name: payload.fromNickname });
          showConversationToast(`${payload.fromNickname}님이 대화 신청을 수락했어요.`);
        } else {
          showConversationToast(`${payload.fromNickname}님이 대화 신청을 거절했어요.`);
        }
      },
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

    channel.on(
      "broadcast",
      { event: "gift_beg_response" },
      ({ payload }: { payload: BegResponseBroadcast }) => {
        if (payload?.toUserId !== user.id || payload.fromUserId === user.id) return;
        if (!payload.accepted) {
          setBegSentToast(`${payload.fromNickname}님이 '${payload.itemLabel}' 요청을 거절했어요.`);
          window.setTimeout(() => setBegSentToast(null), 3200);
        }
      },
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        const position = physicsRef.current;
        void channel.send({
          type: "broadcast",
          event: "player_joined",
          payload: {
            id: user.id,
            name: user.nickname,
            x: position.x,
            y: position.y,
            floorIndex: position.floorIndex,
            direction: position.direction,
            isMoving: position.isMoving,
            isJumping: position.isJumping,
            avatar: myAvatar,
          },
        });
        broadcastMyPosition(physicsRef.current);
        void broadcastMyInventory(channel);
      }
    });

    return () => {
      void channel.send({
        type: "broadcast",
        event: "player_left",
        payload: { userId: user.id },
      });
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, myAvatar, broadcastMyInventory, broadcastMyPosition, ensurePeerWearables, applyPeerWearItems, handleGiftReceivedRealtime, showConversationToast, showSpeechBubble]);

  // A stationary avatar must remain visible and newly joined users must discover it.
  useEffect(() => {
    const heartbeat = window.setInterval(() => broadcastMyPosition(physicsRef.current), 4000);
    const prune = window.setInterval(() => {
      const cutoff = Date.now() - 13000;
      setPlayers((prev) => {
        const next = Object.fromEntries(
          Object.entries(prev).filter(([, player]) => player.lastSeenAt >= cutoff),
        );
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 5000);
    return () => {
      window.clearInterval(heartbeat);
      window.clearInterval(prune);
    };
  }, [broadcastMyPosition]);

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

  const queueJump = useCallback(() => {
    jumpRequestedRef.current = true;
    setSelectedPlayerId(null);
    setShowMyItems(false);
  }, []);

  const queueFloorChange = useCallback((direction: -1 | 1) => {
    floorChangeRequestedRef.current = direction;
    setSelectedPlayerId(null);
    setShowMyItems(false);
  }, []);

  const setMovePressed = useCallback((direction: "left" | "right", pressed: boolean) => {
    if (pressed) pressedKeysRef.current.add(direction);
    else pressedKeysRef.current.delete(direction);
    if (pressed) {
      setSelectedPlayerId(null);
      setShowMyItems(false);
    }
  }, []);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const element = target instanceof HTMLElement ? target : null;
      return !!element?.closest("input, textarea, [contenteditable='true']");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.key === "Enter") {
        event.preventDefault();
        setPublicChatOpen(true);
        setSelectedPlayerId(null);
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setMovePressed("left", true);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setMovePressed("right", true);
      }
      if (event.code === "Space") {
        event.preventDefault();
        if (!event.repeat) queueJump();
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!event.repeat) queueFloorChange(-1);
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!event.repeat) queueFloorChange(1);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setMovePressed("left", false);
      }
      if (event.key === "ArrowRight") {
        setMovePressed("right", false);
      }
    };

    const clearMovement = () => pressedKeysRef.current.clear();
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", clearMovement);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", clearMovement);
      clearMovement();
    };
  }, [queueFloorChange, queueJump, setMovePressed]);

  useEffect(() => {
    let animationFrame = 0;
    let previousTime = performance.now();
    let lastBroadcastAt = 0;
    let lastBroadcastPosition: LocalPlayerPosition = { ...myPos };

    const animate = (now: number) => {
      const deltaSeconds = Math.min(0.035, Math.max(0, (now - previousTime) / 1000));
      previousTime = now;

      const previous = physicsRef.current;
      const next: PlayerPhysics = { ...previous };
      const left = pressedKeysRef.current.has("left");
      const right = pressedKeysRef.current.has("right");
      const horizontalDirection = left === right ? 0 : left ? -1 : 1;

      let currentFloor = WORLD_FLOORS[next.floorIndex] ?? WORLD_FLOORS[WORLD_SPAWN.floorIndex];
      const requestedFloorChange = floorChangeRequestedRef.current;
      if (requestedFloorChange !== null) {
        const targetFloorIndex = next.floorIndex + requestedFloorChange;
        const targetFloor = WORLD_FLOORS[targetFloorIndex];
        const isAtDoor = Math.abs(next.x - currentFloor.doorX) <= WORLD_DOOR_ACTIVATION_RADIUS;
        if (targetFloor && next.onGround && isAtDoor) {
          next.floorIndex = targetFloorIndex;
          next.x = targetFloor.doorX;
          next.y = targetFloor.y;
          next.velocityY = 0;
          next.onGround = true;
          currentFloor = targetFloor;
        }
        floorChangeRequestedRef.current = null;
      }

      if (horizontalDirection !== 0) {
        next.x += horizontalDirection * WORLD_WALK_SPEED * deltaSeconds;
        next.direction = horizontalDirection < 0 ? "left" : "right";
      }
      next.x = Math.max(currentFloor.minX, Math.min(currentFloor.maxX, next.x));

      if (jumpRequestedRef.current) {
        if (next.onGround) {
          next.velocityY = -WORLD_JUMP_VELOCITY;
          next.onGround = false;
        }
        jumpRequestedRef.current = false;
      }

      if (!next.onGround) {
        next.velocityY += WORLD_GRAVITY * deltaSeconds;
        next.y += next.velocityY * deltaSeconds;
        const highestAllowedY = currentFloor.y - currentFloor.maxJumpRise;
        if (next.y < highestAllowedY) {
          next.y = highestAllowedY;
          next.velocityY = Math.max(0, next.velocityY);
        }
        if (next.velocityY >= 0 && next.y >= currentFloor.y) {
          next.y = currentFloor.y;
          next.velocityY = 0;
          next.onGround = true;
        }
      } else {
        next.y = currentFloor.y;
        next.velocityY = 0;
      }

      next.isJumping = !next.onGround;
      next.isMoving = horizontalDirection !== 0 || next.isJumping;
      physicsRef.current = next;

      const visiblePosition: LocalPlayerPosition = {
        x: Math.round(next.x * 10) / 10,
        y: Math.round(next.y * 10) / 10,
        floorIndex: next.floorIndex,
        direction: next.direction,
        isMoving: next.isMoving,
        isJumping: next.isJumping,
      };
      setMyPos((current) =>
        current.x === visiblePosition.x &&
        current.y === visiblePosition.y &&
        current.floorIndex === visiblePosition.floorIndex &&
        current.direction === visiblePosition.direction &&
        current.isMoving === visiblePosition.isMoving &&
        current.isJumping === visiblePosition.isJumping
          ? current
          : visiblePosition,
      );

      const positionChanged =
        Math.abs(lastBroadcastPosition.x - visiblePosition.x) >= 0.5 ||
        Math.abs(lastBroadcastPosition.y - visiblePosition.y) >= 0.5 ||
        lastBroadcastPosition.floorIndex !== visiblePosition.floorIndex ||
        lastBroadcastPosition.direction !== visiblePosition.direction ||
        lastBroadcastPosition.isMoving !== visiblePosition.isMoving ||
        lastBroadcastPosition.isJumping !== visiblePosition.isJumping;
      if (positionChanged && now - lastBroadcastAt >= 75) {
        broadcastMyPosition(visiblePosition);
        lastBroadcastPosition = visiblePosition;
        lastBroadcastAt = now;
      }

      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [broadcastMyPosition]);

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

  const sendPublicChatMessage = (event: React.FormEvent) => {
    event.preventDefault();
    const text = publicChatInput.trim();
    if (!text || !channelRef.current || !user?.id) return;

    const message: PublicChatMessage = {
      id: crypto.randomUUID(),
      senderId: user.id,
      senderName: user.nickname || "나",
      text: text.slice(0, 120),
      timestamp: Date.now(),
    };
    void channelRef.current.send({
      type: "broadcast",
      event: "world_chat",
      payload: message,
    });
    setPublicChatMessages((prev) => [...prev.slice(-79), message]);
    showSpeechBubble(user.id, message.id, message.text);
    setPublicChatInput("");
    setPublicChatOpen(false);
  };

  const requestConversation = (player: PlayerData) => {
    setSelectedPlayerId(null);
    if (approvedChatUserIds.has(player.id)) {
      setActiveChat({ userId: player.id, name: player.name });
      return;
    }
    if (outgoingChatRequest?.toUserId === player.id) {
      showConversationToast(`${player.name}님의 응답을 기다리고 있어요.`);
      return;
    }
    if (!channelRef.current) return;
    const request: ConversationRequest = {
      id: crypto.randomUUID(),
      fromUserId: user.id,
      fromNickname: user.nickname || "친구",
      toUserId: player.id,
      createdAt: Date.now(),
    };
    void channelRef.current.send({ type: "broadcast", event: "chat_request", payload: request });
    setOutgoingChatRequest(request);
    window.setTimeout(() => {
      setOutgoingChatRequest((current) => current?.id === request.id ? null : current);
    }, 15000);
    showConversationToast(`${player.name}님에게 대화를 신청했어요.`);
  };

  const answerConversationRequest = (accepted: boolean) => {
    const request = incomingChatRequest;
    if (!request || !channelRef.current) return;
    const response: ConversationResponse = {
      requestId: request.id,
      fromUserId: user.id,
      fromNickname: user.nickname || "친구",
      toUserId: request.fromUserId,
      accepted,
    };
    void channelRef.current.send({ type: "broadcast", event: "chat_response", payload: response });
    if (accepted) {
      setApprovedChatUserIds((prev) => new Set(prev).add(request.fromUserId));
      setActiveChat({ userId: request.fromUserId, name: request.fromNickname });
    }
    setIncomingChatRequest(null);
  };

  const rejectIncomingBeg = () => {
    const beg = incomingBeg;
    if (!beg) return;
    if (channelRef.current) {
      const response: BegResponseBroadcast = {
        requestId: beg.id,
        fromUserId: user.id,
        fromNickname: user.nickname || "친구",
        toUserId: beg.fromUserId,
        itemLabel: beg.itemLabel,
        accepted: false,
      };
      void channelRef.current.send({
        type: "broadcast",
        event: "gift_beg_response",
        payload: response,
      });
    }
    setIncomingBeg(null);
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
  const currentFloor = WORLD_FLOORS[myPos.floorIndex] ?? WORLD_FLOORS[WORLD_SPAWN.floorIndex];
  const isStandingAtDoor =
    !myPos.isJumping && Math.abs(myPos.x - currentFloor.doorX) <= WORLD_DOOR_ACTIVATION_RADIUS;
  const canMoveUp = isStandingAtDoor && myPos.floorIndex > 0;
  const canMoveDown = isStandingAtDoor && myPos.floorIndex < WORLD_FLOORS.length - 1;

  return (
    <div
      ref={worldRef}
      className="relative w-full h-full overflow-hidden rounded-lg flex flex-col select-none cursor-default"
      style={{ backgroundColor: "#75c8ff", touchAction: "none" }}
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

      {showControlsGuide && (
        <div
          className="absolute top-5 right-6 z-30 rounded-xl border-2 border-stone-600 bg-[#f7ead5]/95 px-4 pb-3 pt-4 shadow-[4px_4px_0_rgba(51,42,46,0.55)]"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-label="키보드 조작 안내"
        >
          <button
            type="button"
            aria-label="조작 안내 닫기"
            className="absolute right-1.5 top-0.5 flex h-5 w-5 items-center justify-center text-sm font-black text-stone-600 hover:text-stone-950"
            onClick={() => setShowControlsGuide(false)}
          >
            ×
          </button>
          <div className="flex min-w-[166px] flex-col items-center gap-1" aria-label="좌우 방향키 이동, Space 점프, ↑ 위층, ↓ 아래층">
            <div className="flex w-full gap-1.5">
              {([ ["←", "왼쪽 이동"], ["→", "오른쪽 이동"] ] as const).map(([key, label]) => (
                <div
                  key={key}
                  className="flex h-7 flex-1 items-center justify-center gap-1 border-2 border-stone-600 bg-white px-1 text-[9px] font-black text-stone-800 shadow-[0_2px_0_#57504d]"
                >
                  <kbd className="font-mono text-[12px]">{key}</kbd>
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-1 flex h-7 w-full items-center justify-center gap-2 border-2 border-stone-600 bg-white px-2 text-[10px] font-black text-stone-800 shadow-[0_2px_0_#57504d]">
              <kbd className="font-mono">SPACE</kbd>
              <span>점프</span>
            </div>
            <p className="mt-1 text-[9px] font-bold text-stone-600">
              {isStandingAtDoor ? `${WORLD_FLOORS.length - myPos.floorIndex}층 문 앞` : "문 앞에서 활성화"}
            </p>
            <div className="mt-0.5 flex w-full flex-col gap-1.5">
              <button
                type="button"
                disabled={!canMoveUp}
                className={`flex h-8 w-full items-center gap-2 rounded border-2 border-stone-600 px-2 text-left text-[10px] font-black shadow-[0_2px_0_#57504d] transition-colors ${
                  canMoveUp
                    ? "bg-[#ffe5ec] text-stone-800 hover:bg-[#ffd1df]"
                    : "cursor-not-allowed bg-stone-200 text-stone-400 opacity-65"
                }`}
                onClick={() => queueFloorChange(-1)}
              >
                <kbd className="font-mono text-[11px]">↑</kbd>
                <span>위층으로 이동</span>
              </button>
              <button
                type="button"
                disabled={!canMoveDown}
                className={`flex h-8 w-full items-center gap-2 rounded border-2 border-stone-600 px-2 text-left text-[10px] font-black shadow-[0_2px_0_#57504d] transition-colors ${
                  canMoveDown
                    ? "bg-[#e8e0ff] text-stone-800 hover:bg-[#dcd0ff]"
                    : "cursor-not-allowed bg-stone-200 text-stone-400 opacity-65"
                }`}
                onClick={() => queueFloorChange(1)}
              >
                <kbd className="font-mono text-[11px]">↓</kbd>
                <span>아래층으로 이동</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {begSentToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-amber-900/85 text-white text-xs font-bold shadow-lg">
          🥺 {begSentToast}
        </div>
      )}

      {conversationToast && (
        <div className="absolute top-[7.25rem] left-1/2 -translate-x-1/2 z-[65] px-4 py-2 rounded-xl bg-sky-900/90 text-white text-xs font-bold shadow-lg">
          💬 {conversationToast}
        </div>
      )}

      {incomingChatRequest && (
        <div
          className="absolute top-20 left-1/2 z-[70] w-[min(310px,calc(100%-24px))] -translate-x-1/2 overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-sky-100 bg-sky-50 px-4 py-3">
            <p className="text-sm font-black text-sky-900">💬 대화 신청</p>
            <p className="mt-1 text-xs font-semibold text-sky-800">
              {incomingChatRequest.fromNickname}님이 대화를 신청했습니다.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            <button
              type="button"
              className="rounded-xl bg-gray-100 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200"
              onClick={() => answerConversationRequest(false)}
            >
              거절
            </button>
            <button
              type="button"
              className="rounded-xl bg-sky-500 py-2 text-xs font-bold text-white hover:bg-sky-600"
              onClick={() => answerConversationRequest(true)}
            >
              수락
            </button>
          </div>
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

      <img
        src={worldBackgroundImage}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 z-0 pointer-events-none w-full h-full"
        style={{ objectFit: "fill", imageRendering: "pixelated" }}
      />

      <div className="relative w-full h-full z-10">
        {Object.values(players).map((player) => (
          <div
            key={player.id}
            className="absolute transition-[left,top] duration-100 ease-linear cursor-pointer group"
            style={{
              left: `${(player.x / WORLD_WIDTH) * 100}%`,
              top: `${(player.y / WORLD_HEIGHT) * 100}%`,
              transform: "translate(-50%, -100%)",
              width: renderedAvatarWidth,
              height: renderedAvatarHeight,
              zIndex: selectedPlayerId === player.id ? 50 : 10,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPlayerId(selectedPlayerId === player.id ? null : player.id);
            }}
          >
            {speechBubbles[player.id] && selectedPlayerId !== player.id && (
              <div className="absolute bottom-[calc(100%+9px)] left-1/2 z-20 w-max max-w-[180px] -translate-x-1/2 rounded-xl border border-sky-200 bg-white px-3 py-2 text-[11px] font-bold leading-snug text-gray-800 shadow-lg break-words">
                {speechBubbles[player.id].text}
                <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-sky-200 bg-white" />
              </div>
            )}
            {selectedPlayerId === player.id && (
              <div className="absolute bottom-[calc(100%+8px)] left-1/2 flex gap-1.5 p-2 bg-white/95 backdrop-blur-md border border-amber-200 rounded-xl shadow-lg animate-pop-in whitespace-nowrap">
                <button
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-lg hover:bg-blue-100 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    requestConversation(player);
                  }}
                >
                  💬 {approvedChatUserIds.has(player.id) ? "대화 열기" : "대화걸기"}
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
                  🎁 선물하기
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

            <div style={{ transform: player.direction === "left" ? "scaleX(-1)" : "scaleX(1)" }}>
              <div className={player.isMoving && !player.isJumping ? "walking" : ""}>
                <AvatarWithCompanions
                  avatar={player.avatar}
                  inventory={peerWearInventories[player.id] ?? []}
                  width={renderedAvatarWidth}
                  height={renderedAvatarHeight}
                  companionScale={0.34}
                />
              </div>
            </div>
            <div className="absolute top-[calc(100%+2px)] left-1/2 -translate-x-1/2 bg-black/60 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full text-center shadow whitespace-nowrap">
              {player.name}
            </div>
          </div>
        ))}

        <div
          className="absolute cursor-pointer group"
          style={{
            left: `${(myPos.x / WORLD_WIDTH) * 100}%`,
            top: `${(myPos.y / WORLD_HEIGHT) * 100}%`,
            transform: "translate(-50%, -100%)",
            width: renderedAvatarWidth,
            height: renderedAvatarHeight,
            zIndex: showMyItems ? 50 : 20,
          }}
          onClick={(e) => {
            e.stopPropagation();
            void openMyItems();
          }}
        >
          {speechBubbles[user.id] && !showMyItems && (
            <div className="absolute bottom-[calc(100%+9px)] left-1/2 z-20 w-max max-w-[180px] -translate-x-1/2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-[11px] font-bold leading-snug text-gray-800 shadow-lg break-words">
              {speechBubbles[user.id].text}
              <span className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-amber-200 bg-white" />
            </div>
          )}
          {showMyItems && (
            <div
              className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 px-2.5 py-1 bg-white/95 border border-amber-200 rounded-lg shadow text-[10px] font-bold text-amber-800 whitespace-nowrap animate-pop-in"
              onClick={(e) => e.stopPropagation()}
            >
              내 상점 보는 중
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/95 border-b border-r border-amber-200 rotate-45" />
            </div>
          )}
          <div style={{ transform: myPos.direction === "left" ? "scaleX(-1)" : "scaleX(1)" }}>
            <div className={`${myPos.isMoving && !myPos.isJumping ? "walking" : ""} transition-transform group-hover:scale-110`}>
              <AvatarWithCompanions
                avatar={myAvatar}
                userId={user?.id}
                width={renderedAvatarWidth}
                height={renderedAvatarHeight}
                inventoryRevision={inventoryRevision}
                companionScale={0.34}
              />
            </div>
          </div>
          <div className="absolute top-[calc(100%+2px)] left-1/2 -translate-x-1/2 bg-amber-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full text-center shadow border border-amber-300 whitespace-nowrap">
            {user?.nickname || "나"} · 내 상점
          </div>
        </div>
      </div>

      <div
        className="absolute bottom-4 left-4 z-[45] w-[min(320px,calc(100%-32px))] overflow-hidden rounded-2xl border border-white/50 bg-slate-950/70 shadow-xl backdrop-blur-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          ref={publicChatScrollRef}
          className="no-scrollbar h-[92px] overflow-y-auto px-3 py-2 text-[11px] leading-relaxed text-white"
          aria-live="polite"
        >
          {publicChatMessages.length === 0 ? (
            <p className="pt-6 text-center text-white/65">Enter를 눌러 광장 대화를 시작해보세요.</p>
          ) : (
            publicChatMessages.map((message) => (
              <p key={message.id} className="break-words">
                <strong className={message.senderId === user.id ? "text-amber-300" : "text-sky-300"}>
                  {message.senderName}:
                </strong>
                <span className="ml-1">{message.text}</span>
              </p>
            ))
          )}
        </div>
        {publicChatOpen ? (
          <form onSubmit={sendPublicChatMessage} className="flex gap-2 border-t border-white/15 bg-white/10 p-2">
            <input
              ref={publicChatInputRef}
              value={publicChatInput}
              onChange={(event) => setPublicChatInput(event.target.value.slice(0, 120))}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setPublicChatOpen(false);
                  setPublicChatInput("");
                }
              }}
              placeholder="문구 입력 후 Enter"
              className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white px-2.5 py-1.5 text-xs text-gray-800 outline-none focus:border-sky-300"
            />
            <button
              type="submit"
              disabled={!publicChatInput.trim()}
              className="rounded-lg bg-sky-500 px-3 text-[11px] font-bold text-white disabled:bg-gray-400"
            >
              전송
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="w-full border-t border-white/15 bg-white/10 py-2 text-[11px] font-bold text-white/80 hover:bg-white/20"
            onClick={() => setPublicChatOpen(true)}
          >
            Enter · 대화 입력
          </button>
        )}
      </div>

      {activeChat && (
        <div
          className="absolute bottom-6 right-6 w-72 h-80 bg-white border border-sky-200 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-sky-50 px-4 py-3 border-b border-sky-100 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-lg">💬</span>
              <span className="text-sm font-bold text-sky-900">{activeChat.name}님과 1:1 대화</span>
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
          className={`absolute left-1/2 z-[60] w-72 -translate-x-1/2 rounded-2xl border border-amber-200 bg-white shadow-2xl overflow-hidden ${incomingChatRequest ? "top-[220px]" : "top-20"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
            <p className="text-sm font-bold text-amber-900">🥺 조르기 도착</p>
            <p className="text-[11px] text-amber-800/80 mt-0.5">
              {incomingBeg.fromNickname}님이 아이템 &apos;<strong>{incomingBeg.itemLabel}</strong>&apos;를 요청합니다.
            </p>
            {incomingBeg.message && (
              <p className="text-[11px] text-amber-700/70 mt-1 italic">&ldquo;{incomingBeg.message}&rdquo;</p>
            )}
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="py-2 rounded-xl text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100"
              onClick={rejectIncomingBeg}
            >
              거절하기
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
          itemsOnly
          shopOnly
          sourceLabel="내 상점"
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
                        ? `${user.nickname}님에게서 아이템 '${info.itemLabel}'을 선물받았습니다.`
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
                <p className="text-sm font-black text-amber-950">내 상점</p>
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
              상점에 등록해 둔 아이템을 WORLD에서 선물할 수 있어요.
            </p>
            <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-3 gap-2 content-start min-h-0">
              {myItemsLoading ? (
                <p className="col-span-3 text-center text-xs text-amber-700/60 py-8">불러오는 중...</p>
              ) : myItems.length === 0 ? (
                <p className="col-span-3 text-center text-xs text-amber-700/60 py-8">
                  내 상점에 등록된 아이템이 없어요
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
