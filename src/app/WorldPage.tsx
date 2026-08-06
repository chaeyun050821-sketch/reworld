import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { AvatarWithCompanions, PixelAvatar } from "./App";
import { avatarPreviewHeightForWidth } from "../lib/shop-storage";
import {
  loadOwnGiftableItems,
  loadPeerGiftableItems,
  type GiftBegPayload,
} from "../lib/commerce";
import { getShopCatalogItem, type ShopCatalogItem } from "./shop-catalog";
import BegGiftModal from "./BegGiftModal";
import GiftModal from "./GiftModal";

const WORLD_AVATAR_WIDTH = 52;
const WORLD_AVATAR_HEIGHT = avatarPreviewHeightForWidth(WORLD_AVATAR_WIDTH);

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
  const [begTarget, setBegTarget] = useState<BegTarget | null>(null);
  const [begItemsLoading, setBegItemsLoading] = useState(false);
  const [incomingBeg, setIncomingBeg] = useState<GiftBegPayload | null>(null);
  const [giftReply, setGiftReply] = useState<{
    recipientId: string;
    recipientNickname: string;
    itemId: string;
  } | null>(null);
  const [begSentToast, setBegSentToast] = useState<string | null>(null);

  const moveTimeout = useRef<NodeJS.Timeout | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeChat]);

  const broadcastMyInventory = useCallback(async (channel = channelRef.current) => {
    if (!channel || !user?.id) return;
    try {
      const items = await loadOwnGiftableItems(user.id);
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
        },
      });
    } catch (error) {
      console.warn("[world] inventory share failed:", error);
    }
  }, [user?.id]);

  const requestPeerInventory = useCallback((targetUserId: string) => {
    if (!channelRef.current || !user?.id) return;
    void channelRef.current.send({
      type: "broadcast",
      event: "inventory_request",
      payload: { fromUserId: user.id, toUserId: targetUserId },
    });
  }, [user?.id]);

  const openBegForPlayer = useCallback(async (player: PlayerData) => {
    setSelectedPlayerId(null);
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

  useEffect(() => {
    const channel = supabase.channel("meeting_square");
    channelRef.current = channel;

    channel.on(
      "broadcast",
      { event: "player_moved" },
      ({ payload }) => {
        if (payload.id !== user.id) {
          setPlayers((prev) => ({ ...prev, [payload.id]: payload }));
        }
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
      ({ payload }: { payload: { userId: string; items: ShopCatalogItem[] } }) => {
        if (!payload?.userId || payload.userId === user.id) return;
        const items = (payload.items ?? [])
          .map((entry) => getShopCatalogItem(entry.id) ?? entry)
          .filter((item): item is ShopCatalogItem => Boolean(item?.giftable !== false && item?.id));
        setPeerInventories((prev) => ({ ...prev, [payload.userId]: items }));
        setBegItemsLoading(false);
      }
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
  }, [user, myAvatar, broadcastMyInventory]);

  // Re-share inventory when closet / shop purchases change.
  useEffect(() => {
    void broadcastMyInventory();
  }, [inventoryRevision, broadcastMyInventory]);

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
      onClick={() => setSelectedPlayerId(null)}
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
              <div className="absolute bottom-[80px] left-1/2 flex gap-1.5 p-2 bg-white/95 backdrop-blur-md border border-amber-200 rounded-xl shadow-lg animate-pop-in whitespace-nowrap">
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
              <PixelAvatar avatar={player.avatar} width={WORLD_AVATAR_WIDTH} height={WORLD_AVATAR_HEIGHT} />
            </div>
            <div className="bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full text-center mt-1 shadow whitespace-nowrap">
              {player.name}
            </div>
          </div>
        ))}

        <div
          className="absolute transition-all duration-150 ease-out"
          style={{
            left: `${(myPos.x / 800) * 100}%`,
            top: `${(myPos.y / 450) * 100}%`,
            transform: "translate(-50%, -100%)",
            zIndex: 20,
          }}
        >
          <div
            className={myPos.isMoving ? "walking" : ""}
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
            {user?.nickname || "나"}
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
          onClose={() => setGiftReply(null)}
        />
      )}
    </div>
  );
}
