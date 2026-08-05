import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase"; 
import { PixelAvatar } from "./App"; 

interface PlayerData {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: "left" | "right";
  isMoving: boolean;
  avatar: any;
}

// ✨ 채팅 메시지 타입 정의
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  text: string;
  timestamp: number;
}
  
// ✨ onGoHome 프롭스(props) 추가
export default function WorldPage({ user, myAvatar, onGoHome }: any) {
  const [myPos, setMyPos] = useState({ x: 400, y: 320, direction: "right", isMoving: false });
  const [players, setPlayers] = useState<Record<string, PlayerData>>({});
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  
  // ✨ 귓속말 채팅 관련 상태
  const [activeChat, setActiveChat] = useState<{ userId: string; name: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  
  const moveTimeout = useRef<NodeJS.Timeout | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ✨ 채팅창에 새 메시지가 추가되면 맨 아래로 자동 스크롤
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeChat]);

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

    // ✨ 귓속말(whisper) 이벤트를 수신하는 부분
    channel.on(
      "broadcast",
      { event: "whisper" },
      ({ payload }: { payload: ChatMessage }) => {
        // 내가 보낸 메시지이거나, 나에게 온 메시지일 때만 기록에 추가
        if (payload.receiverId === user.id || payload.senderId === user.id) {
          setChatMessages((prev) => [...prev, payload]);
          
          // 만약 나에게 온 메시지인데 채팅창이 안 열려있다면 자동으로 열어주기 (선택 사항)
          if (payload.receiverId === user.id) {
            setActiveChat({ userId: payload.senderId, name: payload.senderName });
          }
        }
      }
    );

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        broadcastMyPosition(myPos.x, myPos.y, myPos.direction, myPos.isMoving);
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      // ✨ 채팅창에 글을 쓰고 있을 때는 캐릭터가 움직이지 않도록 막음
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

        const newState = { x: newX, y: newY, direction: newDir as "left"|"right", isMoving: true };
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
    };

    function broadcastMyPosition(x: number, y: number, direction: string, isMoving: boolean) {
      channel.send({
        type: "broadcast",
        event: "player_moved",
        payload: { id: user.id, name: user.nickname, x, y, direction, isMoving, avatar: myAvatar },
      });
    }
  }, [user, myAvatar, myPos.x, myPos.y]); 

  // ✨ 메시지 전송 함수
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

    // 서버로 메시지 방송
    channelRef.current.send({
      type: "broadcast",
      event: "whisper",
      payload: newMessage,
    });

    // 내 화면(기록)에도 즉시 추가
    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput("");
  };

  // 현재 열려있는 채팅창의 대상과 주고받은 메시지만 필터링
  const currentChatHistory = chatMessages.filter(
    (msg) =>
      (msg.senderId === user.id && msg.receiverId === activeChat?.userId) ||
      (msg.senderId === activeChat?.userId && msg.receiverId === user.id)
  );

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
        
        /* 스크롤바 숨기기 (깔끔한 UI용) */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ✨ 상단 타이틀 바 및 나가기 버튼 영역 */}
      <div className="absolute top-6 left-8 z-30 flex items-center gap-3">
        {/* 나가기 버튼 */}
        <button 
          onClick={onGoHome} 
          className="bg-white/90 backdrop-blur-sm px-3 py-2 rounded-2xl border border-amber-300 shadow-sm hover:bg-amber-100 hover:scale-105 transition-all flex items-center gap-1.5 text-amber-900 font-bold text-sm cursor-pointer"
        >
          <span>🏠</span>
          <span>나가기</span>
        </button>

        {/* 기존 타이틀 */}
        <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl border border-amber-200 shadow-sm flex items-center gap-3">
          <span className="text-base">🤝</span>
          <span className="text-sm font-bold text-amber-900">만남의 광장</span>
          <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-semibold shadow-inner">
            접속자: {Object.keys(players).length + 1}명
          </span>
        </div>
      </div>

      {/* 바닥 SVG */}
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

      {/* 아바타 영역 */}
      <div className="relative w-full h-full z-10">
        {Object.values(players).map((player) => (
          <div
            key={player.id}
            className="absolute transition-all duration-150 ease-out cursor-pointer group"
            style={{ 
              left: `${(player.x / 800) * 100}%`, 
              top: `${(player.y / 450) * 100}%`, 
              transform: "translate(-50%, -100%)",
              zIndex: selectedPlayerId === player.id ? 50 : 10
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
                    // ✨ 귓속말 버튼 클릭 시 해당 유저와의 채팅창 열기
                    setActiveChat({ userId: player.id, name: player.name }); 
                  }}
                >
                  💬 귓속말
                </button>
                <button 
                  className="px-3 py-1.5 bg-pink-50 text-pink-600 text-[11px] font-bold rounded-lg hover:bg-pink-100 transition-colors"
                  onClick={(e) => { e.stopPropagation(); alert(`${player.name}님에게 선물을 보냅니다!`); }}
                >
                  🎁 선물
                </button>
                <button 
                  className="px-3 py-1.5 bg-amber-50 text-amber-700 text-[11px] font-bold rounded-lg hover:bg-amber-100 transition-colors"
                  onClick={(e) => { e.stopPropagation(); alert(`${player.name}님에게 조르기를 합니다!`); }}
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
              <PixelAvatar avatar={player.avatar} width={52} height={64} />
            </div>
            <div className="bg-black/60 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full text-center mt-1 shadow whitespace-nowrap">
              {player.name}
            </div>
          </div>
        ))}

        {/* 내 아바타 */}
        <div
          className="absolute transition-all duration-150 ease-out"
          style={{ 
            left: `${(myPos.x / 800) * 100}%`, 
            top: `${(myPos.y / 450) * 100}%`, 
            transform: "translate(-50%, -100%)", 
            zIndex: 20 
          }}
        >
          <div 
            className={myPos.isMoving ? "walking" : ""}
            style={{ transform: myPos.direction === "left" ? "scaleX(-1)" : "scaleX(1)" }}
          >
            <PixelAvatar avatar={myAvatar} width={52} height={64} />
          </div>
          <div className="bg-amber-900/80 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full text-center mt-1 shadow border border-amber-300">
            {user?.nickname || '나'}
          </div>
        </div>
      </div>

      {/* ✨ 우측 하단 1:1 귓속말 채팅창 UI */}
      {activeChat && (
        <div 
          className="absolute bottom-6 right-6 w-72 h-80 bg-white border border-sky-200 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden"
          onClick={(e) => e.stopPropagation()} // 채팅창 클릭 시 닫히지 않도록
        >
          {/* 채팅창 헤더 */}
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

          {/* 대화 기록 영역 */}
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
                        isMe ? "bg-sky-500 text-white rounded-tr-sm" : "bg-white border border-gray-100 rounded-tl-sm text-gray-700"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 메시지 입력 영역 */}
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
    </div>
  );
}