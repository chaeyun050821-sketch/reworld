import { useState, useEffect, type MouseEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import AuthPage from "./AuthPage";
import { getSession, signOut, updateUserNickname, type User } from "../lib/auth";
import { getUserProfile, saveUserProfile, type ProfileField } from "../lib/profile";

/* ═══════════════════════════════════════════
   SHARED ATOMS
═══════════════════════════════════════════ */

const PixelHeart = ({ size = 14, color = "#ff2d78" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 10 9" style={{ imageRendering: "pixelated" }} fill={color}>
    <rect x="1" y="0" width="3" height="1" /><rect x="6" y="0" width="3" height="1" />
    <rect x="0" y="1" width="4" height="1" /><rect x="6" y="1" width="4" height="1" />
    <rect x="0" y="2" width="10" height="1" /><rect x="0" y="3" width="10" height="1" />
    <rect x="1" y="4" width="8" height="1" /><rect x="2" y="5" width="6" height="1" />
    <rect x="3" y="6" width="4" height="1" /><rect x="4" y="7" width="2" height="1" />
    <rect x="5" y="8" width="1" height="1" />
  </svg>
);

const PixelStar = ({ x, y, size, delay, color }: { x: string; y: string; size: number; delay: number; color: string }) => (
  <motion.div
    className="absolute pointer-events-none select-none"
    style={{ left: x, top: y, fontSize: size, color, lineHeight: 1 }}
    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
    transition={{ duration: 2.5 + delay * 0.3, delay, repeat: Infinity, ease: "easeInOut" }}
  >✦</motion.div>
);

/* ═══════════════════════════════════════════
   COVER PAGE
═══════════════════════════════════════════ */

const HoloStripe = ({ top, rotate, opacity }: { top: string; rotate: number; opacity: number }) => (
  <div className="absolute w-full h-6 pointer-events-none" style={{
    top, transform: `rotate(${rotate}deg)`, opacity,
    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 20%, rgba(200,100,255,0.4) 35%, rgba(255,80,180,0.5) 50%, rgba(100,200,255,0.4) 65%, rgba(255,255,255,0.5) 80%, transparent 100%)",
    filter: "blur(2px)",
  }} />
);

const Corner = ({ flip }: { flip?: boolean }) => (
  <svg width="90" height="90" viewBox="0 0 90 90" fill="none" style={{ transform: flip ? "scale(-1,1)" : undefined }}>
    <path d="M8 8 L8 40 Q8 50 18 50" stroke="#ff2d78" strokeWidth="2" fill="none" opacity="0.7" />
    <path d="M8 8 L40 8 Q50 8 50 18" stroke="#c44dff" strokeWidth="2" fill="none" opacity="0.7" />
    <circle cx="8" cy="8" r="4" fill="#ff80c8" />
    <circle cx="50" cy="18" r="3" fill="#ff2d78" opacity="0.8" />
    <circle cx="18" cy="50" r="3" fill="#c44dff" opacity="0.8" />
    <path d="M20 20 Q30 14 40 20 Q30 26 20 20Z" fill="#ff80c8" opacity="0.5" />
    <path d="M20 20 Q14 30 20 40 Q26 30 20 20Z" fill="#c44dff" opacity="0.4" />
    <circle cx="29" cy="29" r="4" fill="white" opacity="0.4" />
  </svg>
);

const ChromeBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase" style={{
    fontFamily: "'Quicksand', sans-serif",
    background: "linear-gradient(135deg, #fff 0%, #f0c0e8 30%, #e8a0d8 60%, #fff 100%)",
    boxShadow: "0 2px 8px rgba(255,45,120,0.3), inset 0 1px 0 rgba(255,255,255,0.9)",
    color: "#c0006a", border: "1px solid rgba(255,255,255,0.8)",
  }}>{children}</div>
);

function CoverPage({ onOpen, nickname }: { onOpen: () => void; nickname?: string }) {
  const stars = [
    { x: "7%", y: "9%", size: 22, delay: 0, color: "#ff2d78" },
    { x: "83%", y: "6%", size: 18, delay: 0.5, color: "#c44dff" },
    { x: "90%", y: "70%", size: 24, delay: 1.1, color: "#ff80c8" },
    { x: "4%", y: "75%", size: 20, delay: 0.3, color: "#ff2d78" },
    { x: "48%", y: "3%", size: 14, delay: 0.8, color: "#e040fb" },
    { x: "15%", y: "48%", size: 12, delay: 1.6, color: "#ff80c8" },
    { x: "75%", y: "45%", size: 12, delay: 2.0, color: "#c44dff" },
    { x: "35%", y: "87%", size: 16, delay: 0.6, color: "#ff2d78" },
    { x: "62%", y: "84%", size: 14, delay: 1.4, color: "#c44dff" },
    { x: "68%", y: "18%", size: 18, delay: 0.9, color: "#ff80c8" },
    { x: "25%", y: "15%", size: 13, delay: 2.2, color: "#ff2d78" },
  ];

  return (
    <div className="size-full flex items-center justify-center" style={{
      background: "linear-gradient(135deg, #fce4f8 0%, #f0c8f8 40%, #fcd0ec 70%, #f8e0ff 100%)",
    }}>
      <div className="absolute rounded-full pointer-events-none" style={{
        width: 500, height: 500,
        background: "radial-gradient(circle, rgba(255,80,180,0.18) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />
      <motion.div
        className="relative overflow-hidden cursor-pointer"
        style={{
          width: "min(400px, 88vw)", height: "min(560px, 84vh)",
          borderRadius: "4px 16px 16px 4px",
          boxShadow: "6px 10px 50px rgba(200,0,120,0.28), 2px 4px 16px rgba(180,50,255,0.2), 0 0 0 1px rgba(255,255,255,0.6)",
          background: "linear-gradient(148deg, #ffd6f4 0%, #ffb3e8 20%, #f9a0e8 40%, #e8b0ff 65%, #ffc0ea 85%, #ffd6f4 100%)",
        }}
        onClick={onOpen}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <HoloStripe top="18%" rotate={-4} opacity={0.35} />
        <HoloStripe top="45%" rotate={3} opacity={0.25} />
        <HoloStripe top="72%" rotate={-2} opacity={0.3} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(255,255,255,0.55) 0%, transparent 70%)",
        }} />
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, #ff2d78 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }} />
        <div className="absolute inset-3 rounded-xl pointer-events-none" style={{
          border: "1.5px solid rgba(255,255,255,0.7)",
          boxShadow: "0 0 0 1px rgba(255,45,120,0.15) inset",
        }} />
        <div className="absolute inset-5 rounded-lg pointer-events-none" style={{
          border: "1px dashed rgba(196,77,255,0.35)",
        }} />
        <div className="absolute top-3 left-3"><Corner /></div>
        <div className="absolute top-3 right-3"><Corner flip /></div>
        <div className="absolute bottom-3 left-3" style={{ transform: "scaleY(-1)" }}><Corner /></div>
        <div className="absolute bottom-3 right-3" style={{ transform: "scale(-1) scaleX(-1)" }}><Corner flip /></div>
        {stars.map((s, i) => <PixelStar key={i} {...s} />)}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-10 z-10">
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.7 }}>
            <ChromeBadge>✦ My Personal Diary ✦</ChromeBadge>
          </motion.div>
          <motion.div className="flex gap-2 items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
            {[0, 0.15, 0.3].map((d, i) => (
              <motion.div key={i} animate={{ y: [0, -4, 0] }} transition={{ duration: 1.4, delay: d, repeat: Infinity, ease: "easeInOut" }}>
                <PixelHeart size={i === 1 ? 20 : 14} color={i === 1 ? "#ff2d78" : "#c44dff"} />
              </motion.div>
            ))}
          </motion.div>
          <motion.div className="text-center" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.75, duration: 1, ease: [0.22, 1, 0.36, 1] }}>
            <h1 
              style={{ fontFamily: '"Great Vibes", "Comic Sans MS", "Malgun Gothic", sans-serif', fontSize: '1.3rem', color: 'rgb(212, 0, 106)', lineHeight: '1.1',
              background: "linear-gradient(135deg, #d4006a 0%, #ff2d78 30%, #c44dff 60%, #ff2d78 80%, #d4006a 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              filter: "drop-shadow(0 2px 8px rgba(255,45,120,0.35))",
            }}>Re:world</h1>
            <motion.div className="mx-auto mt-1 h-0.5 rounded-full" style={{
              background: "linear-gradient(90deg, transparent, #ff80c8, #fff, #c44dff, #ff80c8, transparent)",
              boxShadow: "0 0 6px rgba(255,80,200,0.6)",
            }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.2, duration: 0.9 }} />
          </motion.div>
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.42rem", color: "#c44dff", letterSpacing: "0.08em", textAlign: "center", lineHeight: 2, opacity: 0.8 }}>
            thoughts · memories · dreams
          </p>
          <div className="flex items-center gap-2 w-full px-4">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(255,45,120,0.4))" }} />
            <span style={{ color: "#ff2d78", fontSize: 14 }}>✦</span>
            <span style={{ color: "#c44dff", fontSize: 10 }}>★</span>
            <span style={{ color: "#ff80c8", fontSize: 14 }}>✦</span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(196,77,255,0.4))" }} />
          </div>
          <motion.div className="relative px-6 py-1.5 rounded-full overflow-hidden" style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,200,240,0.9) 50%, rgba(255,255,255,0.8) 100%)",
            boxShadow: "0 3px 12px rgba(255,45,120,0.25), inset 0 1px 0 rgba(255,255,255,1)",
            border: "1.5px solid rgba(255,45,120,0.2)",
          }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.6)" }} />
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 600, fontSize: "0.78rem", letterSpacing: "0.25em", color: "#d4006a", position: "relative" }}>2 0 2 6</span>
          </motion.div>
          <motion.div className="flex gap-3 items-center mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
            {[0.1, 0, 0.2, 0, 0.1].map((d, i) => (
              <motion.div key={i} animate={{ y: [0, -5, 0] }} transition={{ duration: 1.2, delay: d + i * 0.07, repeat: Infinity }}>
                <PixelHeart size={i === 2 ? 18 : 12} color={["#c44dff", "#ff80c8", "#ff2d78", "#ff80c8", "#c44dff"][i]} />
              </motion.div>
            ))}
          </motion.div>
          {/* open hint */}
          <motion.p
            className="mt-2 text-center"
            style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.65rem", color: "#c44dff", letterSpacing: "0.1em" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {nickname ? `${nickname}님, ` : ""}클릭해서 열기 ▶
          </motion.p>
        </div>
        <div className="absolute inset-x-0 top-0 h-1/3 pointer-events-none rounded-t-2xl" style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)",
        }} />
        <motion.div className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%)",
        }} initial={{ x: "-100%" }} animate={{ x: "200%" }} transition={{ duration: 2.2, delay: 1.6, ease: "easeInOut" }} />
        <div className="absolute left-0 top-0 bottom-0 w-4 pointer-events-none" style={{
          background: "linear-gradient(to right, rgba(200,0,100,0.12), transparent)",
        }} />
      </motion.div>
      <div className="absolute" style={{
        width: 12, height: "min(560px, 84vh)",
        left: "calc(50% - min(200px, 44vw) - 8px)",
        borderRadius: "4px 0 0 4px",
        background: "linear-gradient(to right, #e060b0, #f090c8)",
        boxShadow: "-3px 0 10px rgba(180,0,100,0.2)",
      }} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   PIXEL AVATAR SVG
═══════════════════════════════════════════ */
type AvatarConfig = {
  hairDark: string;
  hairLight: string;
  skin: string;
  outfit: string;
  outfitDark: string;
  outfitInner: string;
  pants: string;
};

const DEFAULT_AVATAR: AvatarConfig = {
  hairDark: "#3d1a00",
  hairLight: "#5c2800",
  skin: "#ffc8a0",
  outfit: "#ff80c8",
  outfitDark: "#ff60b8",
  outfitInner: "#ffe0f4",
  pants: "#c8a0ff",
};

function PixelAvatar({
  config = DEFAULT_AVATAR,
  width = 72,
  height = 90,
}: {
  config?: AvatarConfig;
  width?: number;
  height?: number;
}) {
  const c = config;
  return (
    <svg width={width} height={height} viewBox="0 0 18 22" style={{ imageRendering: "pixelated" }}>
      {/* hair */}
      <rect x="5" y="1" width="8" height="1" fill={c.hairDark} />
      <rect x="4" y="2" width="10" height="1" fill={c.hairDark} />
      <rect x="4" y="3" width="10" height="4" fill={c.hairLight} />
      <rect x="3" y="4" width="1" height="3" fill={c.hairLight} />
      <rect x="14" y="4" width="1" height="3" fill={c.hairLight} />
      {/* face */}
      <rect x="4" y="5" width="10" height="7" fill={c.skin} />
      {/* eyes */}
      <rect x="6" y="7" width="2" height="2" fill="#2d1a00" />
      <rect x="10" y="7" width="2" height="2" fill="#2d1a00" />
      <rect x="7" y="7" width="1" height="1" fill="#ffffff" />
      <rect x="11" y="7" width="1" height="1" fill="#ffffff" />
      {/* blush */}
      <rect x="5" y="9" width="2" height="1" fill="#ffaaaa" opacity="0.7" />
      <rect x="11" y="9" width="2" height="1" fill="#ffaaaa" opacity="0.7" />
      {/* mouth */}
      <rect x="8" y="10" width="2" height="1" fill="#ff8080" />
      {/* neck */}
      <rect x="7" y="12" width="4" height="2" fill={c.skin} />
      {/* outfit */}
      <rect x="3" y="14" width="12" height="6" fill={c.outfit} />
      <rect x="2" y="14" width="3" height="5" fill={c.outfitDark} />
      <rect x="13" y="14" width="3" height="5" fill={c.outfitDark} />
      <rect x="7" y="14" width="4" height="1" fill={c.outfitDark} />
      <rect x="7" y="15" width="4" height="3" fill={c.outfitInner} />
      {/* legs */}
      <rect x="5" y="20" width="3" height="2" fill={c.pants} />
      <rect x="10" y="20" width="3" height="2" fill={c.pants} />
    </svg>
  );
}

function NeighborAvatar({ avatar, color, size = 40, showOnline = true }: { avatar: AvatarConfig; color: string; size?: number; showOnline?: boolean }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-xl flex items-end justify-center overflow-hidden w-full h-full"
        style={{
          background: `linear-gradient(135deg, ${color}55, ${color}22)`,
          border: `2px solid ${color}`,
        }}
      >
        <PixelAvatar config={avatar} width={size * 0.72} height={size * 0.9} />
      </div>
      {showOnline && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
          style={{ background: "#4cda64", zIndex: 10 }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   MINI ROOM SVG
═══════════════════════════════════════════ */
type PlacedRoomItem = { uid: string; itemId: string; emoji: string; x: number; y: number };

function MiniRoom({
  placedItems = [],
  onRoomClick,
  onItemClick,
  eraseMode = false,
}: {
  placedItems?: PlacedRoomItem[];
  onRoomClick?: (x: number, y: number) => void;
  onItemClick?: (uid: string) => void;
  eraseMode?: boolean;
}) {
  const handleClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!onRoomClick) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 220;
    const y = ((e.clientY - rect.top) / rect.height) * 160;
    onRoomClick(x, y);
  };

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 220 160"
      style={{ imageRendering: "pixelated", cursor: onRoomClick ? (eraseMode ? "not-allowed" : "crosshair") : undefined }}
      onClick={onRoomClick ? handleClick : undefined}
    >
      {/* floor */}
      <rect x="0" y="100" width="220" height="60" fill="#e8d4f8" />
      {/* floor pattern */}
      {[0,1,2,3,4,5].map(i => [0,1,2].map(j => (
        <rect key={`f${i}${j}`} x={i*40} y={100+j*20} width="40" height="20"
          fill={((i+j)%2===0)?"#e0c8f0":"#d4b8e8"} />
      )))}
      {/* back wall */}
      <rect x="0" y="0" width="220" height="102" fill="#f0e8ff" />
      {/* wall stripes */}
      {[0,1,2,3,4].map(i => (
        <rect key={`w${i}`} x={i*44} y="0" width="22" height="102" fill="#ece0ff" opacity="0.5" />
      ))}
      {/* window */}
      <rect x="140" y="12" width="60" height="50" fill="#c8eeff" />
      <rect x="140" y="12" width="60" height="50" fill="none" stroke="#a0b8d8" strokeWidth="2" />
      <rect x="168" y="12" width="2" height="50" fill="#a0b8d8" />
      <rect x="140" y="35" width="60" height="2" fill="#a0b8d8" />
      {/* curtains */}
      <rect x="138" y="10" width="14" height="55" fill="#ffb3d9" opacity="0.7" />
      <rect x="188" y="10" width="14" height="55" fill="#ffb3d9" opacity="0.7" />
      {/* outside scene */}
      <rect x="142" y="14" width="24" height="34" fill="#b8e0ff" />
      <rect x="170" y="14" width="28" height="34" fill="#c0eaff" />
      <rect x="148" y="30" width="10" height="18" fill="#80c060" opacity="0.8" />
      <rect x="152" y="20" width="6" height="12" fill="#60a040" opacity="0.8" />
      {/* desk */}
      <rect x="20" y="80" width="70" height="8" fill="#d4a060" />
      <rect x="22" y="88" width="5" height="18" fill="#b88040" />
      <rect x="83" y="88" width="5" height="18" fill="#b88040" />
      {/* computer on desk */}
      <rect x="34" y="56" width="36" height="26" fill="#e0e0f8" />
      <rect x="36" y="58" width="32" height="20" fill="#9090e0" />
      <rect x="36" y="58" width="32" height="20" fill="#a0c0ff" opacity="0.6" />
      {/* screen glow */}
      <rect x="38" y="60" width="28" height="16" fill="#c8e0ff" opacity="0.5" />
      <rect x="46" y="81" width="12" height="4" fill="#d0d0e8" />
      {/* keyboard */}
      <rect x="30" y="78" width="30" height="4" fill="#d8d8e8" />
      {/* chair */}
      <rect x="38" y="94" width="24" height="16" fill="#ff80c8" />
      <rect x="38" y="88" width="24" height="8" fill="#ff60b8" />
      <rect x="36" y="106" width="5" height="8" fill="#e060a8" />
      <rect x="59" y="106" width="5" height="8" fill="#e060a8" />
      {/* shelf on wall */}
      <rect x="10" y="20" width="110" height="5" fill="#d4a060" />
      <rect x="8" y="24" width="4" height="20" fill="#b88040" />
      <rect x="118" y="24" width="4" height="20" fill="#b88040" />
      {/* shelf items */}
      {/* book 1 */}
      <rect x="14" y="8" width="8" height="13" fill="#ff6060" />
      <rect x="15" y="9" width="6" height="11" fill="#ff8080" />
      {/* book 2 */}
      <rect x="24" y="10" width="7" height="11" fill="#6080ff" />
      <rect x="25" y="11" width="5" height="9" fill="#80a0ff" />
      {/* book 3 */}
      <rect x="33" y="8" width="8" height="13" fill="#60c060" />
      {/* star lamp */}
      <rect x="100" y="12" width="14" height="10" fill="#ffe060" />
      <rect x="106" y="8" width="2" height="5" fill="#ffb020" />
      <rect x="100" y="20" width="14" height="2" fill="#ffb020" />
      {/* bear plushie */}
      <rect x="76" y="12" width="14" height="13" fill="#e8c090" />
      <rect x="73" y="14" width="5" height="5" fill="#e8c090" />
      <rect x="88" y="14" width="5" height="5" fill="#e8c090" />
      <rect x="78" y="15" width="4" height="4" fill="#3d1a00" />
      <rect x="84" y="15" width="4" height="4" fill="#3d1a00" />
      <rect x="80" y="21" width="6" height="2" fill="#3d1a00" />
      {/* small plant */}
      <rect x="170" y="82" width="14" height="14" fill="#80c060" />
      <rect x="172" y="80" width="10" height="4" fill="#60a040" />
      <rect x="174" y="76" width="6" height="5" fill="#80c060" />
      <rect x="173" y="94" width="12" height="6" fill="#d4a060" />
      {/* rug */}
      <rect x="50" y="112" width="100" height="40" fill="#ff99cc" opacity="0.5" />
      <rect x="54" y="116" width="92" height="32" fill="none" stroke="#ff60b0" strokeWidth="2" />
      <rect x="58" y="120" width="84" height="24" fill="none" stroke="#ff80c8" strokeWidth="1" />
      {/* user-placed items */}
      {placedItems.map((item) => (
        <g
          key={item.uid}
          transform={`translate(${item.x}, ${item.y})`}
          style={{ cursor: eraseMode && onItemClick ? "pointer" : undefined }}
          onClick={eraseMode && onItemClick ? (e) => { e.stopPropagation(); onItemClick(item.uid); } : undefined}
        >
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: 20, userSelect: "none" }}
          >
            {item.emoji}
          </text>
        </g>
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════
   BOOKMARK TABS
═══════════════════════════════════════════ */
const TABS = [
  { id: "home",    label: "홈",       color: "#ff80c8", active: true  },
  { id: "profile", label: "프로필",   color: "#c8a0ff", active: false },
  { id: "diary",   label: "다이어리", color: "#80c8ff", active: false },
  { id: "miniroom",label: "미니룸",   color: "#80e0b0", active: false },
  { id: "photo",   label: "사진첩",   color: "#ffe080", active: false },
  { id: "guest",   label: "방명록",   color: "#ffa880", active: false },
  { id: "emoticon",label: "이모티콘룸",color: "#ff80a0", active: false },
];

/* ═══════════════════════════════════════════
   LEFT PAGE — PROFILE
═══════════════════════════════════════════ */
function LeftPage({ user, onUserUpdate }: { user: User; onUserUpdate: (user: User) => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState("일상 기록중 🌸");
  const [tags, setTags] = useState<string[]>(() => getUserProfile(user.id, user.nickname).tags);
  const [fields, setFields] = useState<ProfileField[]>(() => getUserProfile(user.id, user.nickname).fields);
  const [draft, setDraft] = useState<ProfileField[]>(fields);

  useEffect(() => {
    const profile = getUserProfile(user.id, user.nickname);
    setFields(profile.fields);
    setDraft(profile.fields);
    setStatus(profile.status);
    setTags(profile.tags);
  }, [user.id, user.nickname]);

  const displayName = fields.find((f) => f.label === "이름")?.value || user.nickname;

  const startEdit = () => { setDraft([...fields]); setEditing(true); };
  const saveEdit = () => {
    setFields(draft);
    saveUserProfile(user.id, { fields: draft, status, tags });
    setEditing(false);

    const nameValue = draft.find((f) => f.label === "이름")?.value.trim();
    if (nameValue && nameValue !== user.nickname) {
      const updated = updateUserNickname(user.id, nameValue);
      if (updated) onUserUpdate(updated);
    }
  };
  const cancelEdit = () => { setDraft([...fields]); setEditing(false); };

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{
      background: "linear-gradient(160deg, #fff5fd 0%, #f0e8ff 100%)",
    }}>
      {/* page title */}
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(196,77,255,0.2)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "#c44dff" }}>★</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.7rem", color: "#c44dff", letterSpacing: "0.12em" }}>MY PROFILE</span>
        </div>
        {!editing ? (
          <button onClick={startEdit} className="px-2 py-0.5 rounded-full" style={{
            fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 700,
            background: "linear-gradient(90deg, #c44dff, #ff2d78)", color: "white",
            boxShadow: "0 1px 6px rgba(196,77,255,0.3)",
          }}>✏️ 수정하기</button>
        ) : (
          <div className="flex gap-1">
            <button onClick={saveEdit} className="px-2 py-0.5 rounded-full" style={{
              fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 700,
              background: "linear-gradient(90deg, #ff2d78, #c44dff)", color: "white",
            }}>저장</button>
            <button onClick={cancelEdit} className="px-2 py-0.5 rounded-full" style={{
              fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 600,
              background: "rgba(150,80,150,0.15)", color: "#9060b0",
            }}>취소</button>
          </div>
        )}
      </div>

      {/* avatar + name card */}
      <div className="rounded-xl p-2.5 flex gap-3 items-start flex-shrink-0" style={{
        background: "linear-gradient(135deg, rgba(255,180,220,0.35) 0%, rgba(196,77,255,0.12) 100%)",
        border: "1px solid rgba(255,110,180,0.25)",
      }}>
        <div className="relative flex-shrink-0">
          <div className="rounded-lg overflow-hidden flex items-center justify-center" style={{
            width: 72, height: 80,
            background: "linear-gradient(135deg, #ffe0f4 0%, #e8d0ff 100%)",
            border: "2px solid rgba(255,45,120,0.3)",
            boxShadow: "0 2px 8px rgba(255,45,120,0.15)",
          }}>
            <PixelAvatar />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: "#4cda64" }} />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <p style={{ fontFamily: 'Comic Sans MS, Malgun Gothic, sans-serif', fontSize: '1.3rem', color: '#d4006a', lineHeight: '1.1', fontWeight: 'bold' }}>{displayName}</p>
          <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.6rem", color: "#9060b0", fontWeight: 500 }}>{status}</p>
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {tags.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded-full" style={{
                fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 600,
                background: "rgba(255,45,120,0.1)", color: "#ff2d78",
                border: "1px solid rgba(255,45,120,0.2)",
              }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* profile info fields */}
      <div className="rounded-xl p-2.5 flex flex-col gap-1.5 flex-shrink-0" style={{
        background: "rgba(255,255,255,0.7)",
        border: editing ? "1px solid rgba(255,45,120,0.4)" : "1px solid rgba(196,77,255,0.15)",
        transition: "border-color 0.2s",
      }}>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "#c44dff", marginBottom: 4 }}>PROFILE</p>
        {(editing ? draft : fields).map(({ label, value }, idx) => (
          <div key={label} className="flex gap-2 items-center">
            <span className="flex-shrink-0" style={{
              fontFamily: "'Quicksand', sans-serif", fontSize: "0.55rem",
              fontWeight: 700, color: "#c44dff", width: 32,
            }}>{label}</span>
            {editing ? (
              <input
                value={draft[idx].value}
                onChange={e => setDraft(prev => prev.map((f, i) => i === idx ? { ...f, value: e.target.value } : f))}
                className="flex-1 px-1.5 py-0.5 rounded-lg outline-none"
                style={{
                  fontFamily: "'Quicksand', sans-serif", fontSize: "0.55rem", color: "#6040a0",
                  background: "rgba(255,230,250,0.8)", border: "1px solid rgba(255,45,120,0.3)",
                }}
              />
            ) : (
              <span style={{
                fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem",
                color: "#6040a0", borderBottom: "1px dotted rgba(196,77,255,0.25)",
                flex: 1, paddingBottom: 1,
              }}>{value}</span>
            )}
          </div>
        ))}
      </div>

      {/* music player */}
      <div className="rounded-xl p-2.5 flex-shrink-0" style={{
        background: "linear-gradient(135deg, rgba(255,45,120,0.08) 0%, rgba(196,77,255,0.08) 100%)",
        border: "1px solid rgba(255,80,180,0.2)",
      }}>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "#ff2d78", marginBottom: 6 }}>♪ BGM</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsPlaying(!isPlaying)}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #ff2d78, #c44dff)", boxShadow: "0 2px 8px rgba(255,45,120,0.4)" }}>
            <span style={{ color: "white", fontSize: 10, paddingLeft: isPlaying ? 0 : 2 }}>{isPlaying ? "⏸" : "▶"}</span>
          </button>
          <div className="flex-1 min-w-0">
            <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", fontWeight: 700, color: "#d4006a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              ✨ Lovefool - The Cardigans
            </p>
            <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(196,77,255,0.15)" }}>
              <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg, #ff2d78, #c44dff)" }}
                animate={isPlaying ? { width: ["30%", "80%"] } : { width: "30%" }}
                transition={isPlaying ? { duration: 20, ease: "linear" } : {}} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-1.5 pl-10">
          {["⏮", "⏭", "🔁"].map(btn => (
            <button key={btn} style={{ fontSize: 10, color: "#c44dff", opacity: 0.7 }}>{btn}</button>
          ))}
        </div>
      </div>

      {/* visitor count */}
      <div className="rounded-xl p-2.5 flex items-center justify-between flex-shrink-0" style={{
        background: "linear-gradient(90deg, rgba(255,180,220,0.25) 0%, rgba(196,77,255,0.1) 100%)",
        border: "1px solid rgba(255,110,180,0.2)",
      }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14 }}>👣</span>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "#9060b0" }}>TODAY</span>
        </div>
        <div className="flex items-center gap-1">
          {["0","1","2","8"].map((d, i) => (
            <motion.div key={i} className="w-5 h-6 rounded flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #ff2d78, #c44dff)", boxShadow: "0 1px 4px rgba(255,45,120,0.3)" }}
              initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.08 }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "white" }}>{d}</span>
            </motion.div>
          ))}
        </div>
        <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", color: "#b080d0" }}>전체 <b style={{ color: "#ff2d78" }}>1,247</b></span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RIGHT PAGE — PHOTO ALBUM
═══════════════════════════════════════════ */
function PhotoPage() {
  const { urls: sharedUrls, add: addPhoto } = useSharedPhotos();
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const photos = [...localPhotos, ...sharedUrls];

  const handleAdd = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      files.forEach(file => {
        const url = URL.createObjectURL(file);
        setLocalPhotos(prev => [...prev, url]);
      });
    };
    input.click();
  };

  const placeholders = ["🌸", "🌙", "✨", "🎀", "🌷", "💫"];

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{
      background: "linear-gradient(160deg, #fffbe8 0%, #fff8f0 100%)",
    }}>
      {/* header */}
      <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: "rgba(255,160,0,0.2)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "#e08000" }}>★</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.7rem", color: "#e08000", letterSpacing: "0.12em" }}>PHOTO ALBUM</span>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-white"
          style={{
            fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 700,
            background: "linear-gradient(90deg, #ffb020, #ff8040)",
            boxShadow: "0 2px 8px rgba(255,140,0,0.35)",
          }}
        >
          <span style={{ fontSize: 10 }}>＋</span> 사진 추가하기
        </button>
      </div>

      {/* grid */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {photos.length === 0 ? (
          /* empty state */
          <div className="h-full flex flex-col items-center justify-center gap-2 opacity-60">
            <span style={{ fontSize: 32 }}>📷</span>
            <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.6rem", color: "#c09040", textAlign: "center" }}>
              사진을 추가해서<br />앨범을 꾸며봐요 🌸
            </p>
          </div>
        ) : (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {photos.map((src, i) => (
              <motion.div
                key={i}
                className="relative rounded-lg overflow-hidden aspect-square"
                style={{ border: "1.5px solid rgba(255,160,0,0.25)" }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </motion.div>
            ))}
            {/* add more cell */}
            <button
              onClick={handleAdd}
              className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1"
              style={{
                border: "1.5px dashed rgba(255,160,0,0.4)",
                background: "rgba(255,180,0,0.05)",
              }}
            >
              <span style={{ fontSize: 18, color: "#ffb020" }}>＋</span>
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.4rem", color: "#e09020" }}>추가</span>
            </button>
          </div>
        )}
      </div>

      {/* placeholder sticker row */}
      <div className="rounded-xl p-2 flex items-center gap-1" style={{
        background: "rgba(255,255,255,0.7)",
        border: "1px solid rgba(255,160,0,0.15)",
      }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.3rem", color: "#e08000", marginRight: 4 }}>STICKER</span>
        {placeholders.map(s => (
          <div key={s} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer hover:scale-110 transition-transform" style={{
            background: "rgba(255,180,0,0.1)",
            border: "1px solid rgba(255,160,0,0.2)",
            fontSize: 14,
          }}>{s}</div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   PROFILE AVATAR CUSTOMIZER
═══════════════════════════════════════════ */

const AVATAR_ITEMS = [
  { id: "hat1",   cat: "모자",    emoji: "🎀", label: "리본 모자",   color: "#ff80c8" },
  { id: "hat2",   cat: "모자",    emoji: "👑", label: "크라운",      color: "#ffe060" },
  { id: "top1",   cat: "상의",    emoji: "👚", label: "핑크 후디",   color: "#ffb0d0" },
  { id: "top2",   cat: "상의",    emoji: "🎽", label: "보라 조끼",   color: "#c8a0ff" },
  { id: "acc1",   cat: "악세서리", emoji: "💎", label: "목걸이",      color: "#80e8ff" },
  { id: "acc2",   cat: "악세서리", emoji: "⭐", label: "별 귀걸이",   color: "#ffe060" },
  { id: "acc3",   cat: "악세서리", emoji: "🌸", label: "꽃 핀",      color: "#ff80c8" },
  { id: "shoes1", cat: "신발",    emoji: "👟", label: "스니커즈",    color: "#c8a0ff" },
];

const PIXEL_COLS = 16;
const PIXEL_ROWS = 16;
const PALETTE = ["#ff2d78","#c44dff","#ff80c8","#ffe060","#80c8ff","#80e0b0","#ffffff","#3d1a00","#000000","#f9a0e8","#b0f0ff","#ffb0d0"];

function PixelEditor({ onClose }: { onClose: () => void }) {
  const [grid, setGrid] = useState<string[][]>(() =>
    Array.from({ length: PIXEL_ROWS }, () => Array(PIXEL_COLS).fill("transparent"))
  );
  const [color, setColor] = useState("#ff2d78");
  const [painting, setPainting] = useState(false);

  const paint = (r: number, c: number) => {
    setGrid(prev => prev.map((row, ri) => row.map((cell, ci) => ri === r && ci === c ? color : cell)));
  };

  return (
    <motion.div className="absolute inset-0 z-50 flex flex-col p-3"
      style={{ background: "linear-gradient(160deg, #1a0828 0%, #0e0618 100%)" }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
      {/* header */}
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "#ff80c8" }}>PIXEL EDITOR ✦</span>
        <div className="flex gap-1.5">
          <button onClick={() => setGrid(Array.from({ length: PIXEL_ROWS }, () => Array(PIXEL_COLS).fill("transparent")))}
            className="px-2 py-0.5 rounded-full"
            style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 600, background: "rgba(255,255,255,0.1)", color: "rgba(255,200,240,0.8)" }}>
            지우기
          </button>
          <button onClick={onClose}
            className="px-2 py-0.5 rounded-full"
            style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 700, background: "linear-gradient(90deg, #ff2d78, #c44dff)", color: "white" }}>
            저장 ✓
          </button>
        </div>
      </div>
      {/* canvas + palette */}
      <div className="flex gap-2 flex-1" style={{ minHeight: 0 }}>
        {/* pixel grid */}
        <div className="flex-1 flex items-center justify-center" style={{ minWidth: 0 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${PIXEL_COLS}, 1fr)`,
              border: "1px solid rgba(255,80,180,0.3)",
              cursor: "crosshair",
              width: "min(220px, 100%)",
              aspectRatio: "1",
            }}
            onMouseLeave={() => setPainting(false)}
          >
            {grid.map((row, r) => row.map((cell, c) => (
              <div key={`${r}-${c}`}
                style={{
                  background: cell === "transparent" ? ((r + c) % 2 === 0 ? "#2a1040" : "#220c38") : cell,
                  aspectRatio: "1",
                  boxSizing: "border-box",
                  border: "0.5px solid rgba(255,80,180,0.08)",
                }}
                onMouseDown={() => { setPainting(true); paint(r, c); }}
                onMouseEnter={() => { if (painting) paint(r, c); }}
                onMouseUp={() => setPainting(false)}
              />
            )))}
          </div>
        </div>
        {/* palette */}
        <div className="flex flex-col gap-1.5 flex-shrink-0" style={{ width: 40 }}>
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.26rem", color: "rgba(255,120,200,0.6)", marginBottom: 2 }}>COLOR</p>
          {PALETTE.map(c => (
            <button key={c} onClick={() => setColor(c)}
              style={{
                width: 24, height: 24, borderRadius: 4, background: c === "transparent" ? "repeating-linear-gradient(45deg,#888 0,#888 4px,#fff 4px,#fff 8px)" : c,
                border: color === c ? "2px solid white" : "1px solid rgba(255,255,255,0.2)",
                boxShadow: color === c ? "0 0 6px rgba(255,255,255,0.5)" : "none",
              }} />
          ))}
          {/* eraser */}
          <button onClick={() => setColor("transparent")}
            className="flex items-center justify-center rounded"
            style={{
              width: 24, height: 24, fontSize: 12,
              background: color === "transparent" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)",
              border: color === "transparent" ? "2px solid white" : "1px solid rgba(255,255,255,0.2)",
            }}>🧹</button>
        </div>
      </div>
    </motion.div>
  );
}

function ProfileAvatarPage() {
  const [equipped, setEquipped] = useState<Set<string>>(new Set(["top1"]));
  const [activecat, setActiveCat] = useState("전체");
  const [showPixelEditor, setShowPixelEditor] = useState(false);

  const cats = ["전체", "모자", "상의", "악세서리", "신발"];
  const filtered = activecat === "전체" ? AVATAR_ITEMS : AVATAR_ITEMS.filter(i => i.cat === activecat);
  const toggle = (id: string) => setEquipped(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden relative" style={{
      background: "linear-gradient(160deg, #f8f0ff 0%, #fff0f8 100%)",
    }}>
      {/* header */}
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(196,77,255,0.2)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "#c44dff" }}>★</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.7rem", color: "#c44dff", letterSpacing: "0.12em" }}>AVATAR</span>
        </div>
        <button onClick={() => setShowPixelEditor(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-white"
          style={{
            fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 700,
            background: "linear-gradient(90deg, #c44dff, #ff2d78)",
            boxShadow: "0 2px 8px rgba(196,77,255,0.35)",
          }}>
          🎨 직접만들기
        </button>
      </div>

      {/* avatar preview */}
      <div className="flex-shrink-0 flex flex-col items-center py-2">
        <div className="relative flex items-end justify-center" style={{
          width: 110, height: 130,
          background: "linear-gradient(160deg, #f0e0ff 0%, #ffe0f4 100%)",
          borderRadius: 16,
          border: "2px solid rgba(196,77,255,0.25)",
          boxShadow: "0 4px 16px rgba(196,77,255,0.12)",
        }}>
          {/* hat overlay */}
          {equipped.has("hat1") && <div className="absolute top-1 left-1/2 -translate-x-1/2" style={{ fontSize: 22 }}>🎀</div>}
          {equipped.has("hat2") && <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{ fontSize: 22 }}>👑</div>}
          {/* necklace */}
          {equipped.has("acc1") && <div className="absolute" style={{ top: "44%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 12 }}>💎</div>}
          {/* ear accessories */}
          {equipped.has("acc2") && <>
            <div className="absolute" style={{ top: "28%", left: "14%", fontSize: 10 }}>⭐</div>
            <div className="absolute" style={{ top: "28%", right: "14%", fontSize: 10 }}>⭐</div>
          </>}
          {equipped.has("acc3") && <div className="absolute" style={{ top: "18%", right: "12%", fontSize: 12 }}>🌸</div>}
          {/* base avatar */}
          <PixelAvatar />
          {/* shoes overlay */}
          {equipped.has("shoes1") && <div className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ fontSize: 16 }}>👟</div>}
        </div>
        <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", color: "#9060b0", marginTop: 6, fontWeight: 600 }}>
          {equipped.size}개 착용중 ✦
        </p>
      </div>

      {/* category filter */}
      <div className="flex gap-1 flex-shrink-0 overflow-x-auto pb-0.5">
        {cats.map(cat => (
          <button key={cat} onClick={() => setActiveCat(cat)}
            className="flex-shrink-0 px-2 py-0.5 rounded-full"
            style={{
              fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 600,
              background: activecat === cat ? "linear-gradient(90deg, #c44dff, #ff2d78)" : "rgba(196,77,255,0.1)",
              color: activecat === cat ? "white" : "#9060b0",
              border: activecat === cat ? "none" : "1px solid rgba(196,77,255,0.2)",
              transition: "all 0.15s",
            }}>
            {cat}
          </button>
        ))}
      </div>

      {/* items grid */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {filtered.map((item, i) => {
            const on = equipped.has(item.id);
            return (
              <motion.button key={item.id} onClick={() => toggle(item.id)}
                className="flex flex-col items-center gap-0.5 rounded-xl py-2"
                style={{
                  background: on
                    ? `linear-gradient(135deg, ${item.color}44, ${item.color}22)`
                    : "rgba(255,255,255,0.65)",
                  border: on ? `1.5px solid ${item.color}` : "1px solid rgba(196,77,255,0.12)",
                  boxShadow: on ? `0 2px 8px ${item.color}44` : "none",
                  transition: "all 0.15s",
                }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.93 }}
              >
                <span style={{ fontSize: 22 }}>{item.emoji}</span>
                <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: on ? "#6040a0" : "#9060b0", fontWeight: 600 }}>{item.label}</span>
                {on && <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.28rem", color: "#ff2d78" }}>ON</span>}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* pixel editor overlay */}
      <AnimatePresence>
        {showPixelEditor && <PixelEditor onClose={() => setShowPixelEditor(false)} />}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EMOTICON ROOM
═══════════════════════════════════════════ */

const SAMPLE_EMOTICONS = [
  { id: 1, emoji: "😎", label: "쿨가이" },
  { id: 2, emoji: "🥺", label: "눈물눈물" },
  { id: 3, emoji: "💅", label: "우아해" },
  { id: 4, emoji: "🤩", label: "반짝반짝" },
  { id: 5, emoji: "😤", label: "으쌰으쌰" },
];

/* ── Face camera placeholder ── */
function FakeCameraView({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #1a0a2e 0%, #0d0820 100%)" }}>
      {/* scan lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px)",
        }} />
      {/* face silhouette */}
      <div className="relative flex flex-col items-center justify-center">
        <div className="rounded-full" style={{
          width: 90, height: 110,
          background: "radial-gradient(ellipse at 40% 30%, #ffe0c0 0%, #f0b890 60%, #d08060 100%)",
          boxShadow: "0 4px 24px rgba(255,180,120,0.3)",
        }}>
          {/* eyes */}
          <div className="flex justify-center gap-5 pt-8">
            <div className="w-4 h-4 rounded-full" style={{ background: "#2d1a00" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-white mt-0.5 ml-0.5" />
            </div>
            <div className="w-4 h-4 rounded-full" style={{ background: "#2d1a00" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-white mt-0.5 ml-0.5" />
            </div>
          </div>
          {/* mouth */}
          <div className="mx-auto mt-4 w-8 h-3 rounded-full" style={{ background: "#c06050", border: "1px solid #a04040" }} />
        </div>
        {/* neck + shoulder */}
        <div style={{ width: 40, height: 20, background: "#f0b890", marginTop: -2 }} />
        <div style={{ width: 120, height: 30, background: "#c44dff", borderRadius: "50% 50% 0 0" }} />
      </div>
      {/* corner guide brackets */}
      {[["top-2 left-2","border-t-2 border-l-2"],["top-2 right-2","border-t-2 border-r-2"],
        ["bottom-2 left-2","border-b-2 border-l-2"],["bottom-2 right-2","border-b-2 border-r-2"]
      ].map(([pos, border], i) => (
        <div key={i} className={`absolute w-5 h-5 ${pos} ${border}`} style={{ borderColor: "rgba(255,80,180,0.7)" }} />
      ))}
      {/* dot grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,120,200,0.8) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }} />
      {children}
    </div>
  );
}

/* ── Emoticon sidebar list ── */
function EmoticonSidebar({ selected, onSelect }: { selected: number | null; onSelect: (id: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ width: 56 }}>
      <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.28rem", color: "#c44dff", textAlign: "center", marginBottom: 2 }}>MY</p>
      {SAMPLE_EMOTICONS.map(e => (
        <motion.button
          key={e.id}
          onClick={() => onSelect(e.id)}
          className="flex flex-col items-center gap-0.5 rounded-lg p-1"
          style={{
            background: selected === e.id
              ? "linear-gradient(135deg, rgba(255,45,120,0.25), rgba(196,77,255,0.2))"
              : "rgba(255,255,255,0.08)",
            border: selected === e.id ? "1.5px solid rgba(255,45,120,0.5)" : "1px solid rgba(255,255,255,0.1)",
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span style={{ fontSize: 20 }}>{e.emoji}</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.3rem", color: "rgba(255,220,240,0.7)", lineHeight: 1.2, textAlign: "center" }}>{e.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

/* ── Emoticon Maker page ── */
function EmoticonMakerPage({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [isRec, setIsRec] = useState(true);

  return (
    <div className="h-full flex flex-col" style={{
      background: "linear-gradient(160deg, #140820 0%, #0e0618 100%)",
    }}>
      {/* top bar */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <button onClick={onBack}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,220,240,0.8)", fontSize: "0.5rem", fontFamily: "'Quicksand', sans-serif", fontWeight: 600 }}>
          ← 뒤로
        </button>
        {/* REC indicator */}
        <motion.div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: "rgba(255,40,40,0.18)", border: "1px solid rgba(255,80,80,0.4)" }}>
          <motion.div className="w-2 h-2 rounded-full" style={{ background: "#ff3030" }}
            animate={{ opacity: isRec ? [1, 0.2, 1] : 0.3 }}
            transition={{ duration: 1, repeat: Infinity }} />
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.35rem", color: "#ff6060" }}>REC</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", color: "rgba(255,180,180,0.7)" }}>00:12</span>
          <button onClick={() => setIsRec(v => !v)}
            className="px-1.5 py-0.5 rounded-full ml-1"
            style={{ background: isRec ? "rgba(255,80,80,0.3)" : "rgba(100,255,100,0.2)", fontSize: "0.4rem", color: isRec ? "#ff8080" : "#80ff80", fontFamily: "'Quicksand', sans-serif" }}>
            {isRec ? "■ 정지" : "● 시작"}
          </button>
        </motion.div>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "rgba(255,120,200,0.6)" }}>HAND TRACK</span>
      </div>

      {/* main area */}
      <div className="flex-1 flex gap-2 px-3 pb-3" style={{ minHeight: 0 }}>
        {/* camera */}
        <div className="flex-1 relative" style={{ minWidth: 0 }}>
          <FakeCameraView>
            {/* hand tracking dots */}
            {[[42,62],[50,55],[58,62],[54,72],[46,72],[40,80],[60,80]].map(([x,y],i) => (
              <motion.div key={i} className="absolute w-2 h-2 rounded-full"
                style={{ left: `${x}%`, top: `${y}%`, background: "#ff2d78", boxShadow: "0 0 6px #ff2d78" }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.2, delay: i * 0.15, repeat: Infinity }} />
            ))}
            {/* connecting lines hint */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.4 }}>
              <polyline points="42%,62% 50%,55% 58%,62% 54%,72% 46%,72% 40%,80% 60%,80%"
                fill="none" stroke="#ff80c8" strokeWidth="1" />
            </svg>
            {/* live label */}
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded"
              style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,80,120,0.4)" }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.3rem", color: "#ff80c8" }}>LIVE</span>
            </div>
          </FakeCameraView>
        </div>

        {/* sidebar */}
        <div className="flex flex-col gap-2" style={{ width: 56 }}>
          <EmoticonSidebar selected={selected} onSelect={setSelected} />
          {selected !== null && (
            <motion.button
              className="w-full py-1 rounded-lg text-white"
              style={{
                fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", fontWeight: 700,
                background: "linear-gradient(135deg, #ff2d78, #c44dff)",
                boxShadow: "0 2px 8px rgba(255,45,120,0.4)",
              }}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            >
              ✏️<br />수정
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

/* shared photo store — simple module-level ref so PhotoPage and PhotoBooth share state */
const sharedPhotoStore: { urls: string[]; listeners: Array<() => void> } = { urls: [], listeners: [] };
function useSharedPhotos() {
  const [urls, setUrls] = useState<string[]>(sharedPhotoStore.urls);
  const add = (url: string) => {
    sharedPhotoStore.urls = [url, ...sharedPhotoStore.urls];
    sharedPhotoStore.listeners.forEach(l => l());
  };
  useState(() => {
    const update = () => setUrls([...sharedPhotoStore.urls]);
    sharedPhotoStore.listeners.push(update);
    return () => { sharedPhotoStore.listeners = sharedPhotoStore.listeners.filter(l => l !== update); };
  });
  return { urls, add };
}

const PixelCharSvg = () => (
  <svg width="50" height="64" viewBox="0 0 18 22" style={{ imageRendering: "pixelated", filter: "drop-shadow(0 2px 6px rgba(196,77,255,0.6))" }}>
    <rect x="5" y="1" width="8" height="1" fill="#3d1a00" /><rect x="4" y="2" width="10" height="1" fill="#3d1a00" />
    <rect x="4" y="3" width="10" height="4" fill="#5c2800" /><rect x="3" y="4" width="1" height="3" fill="#5c2800" />
    <rect x="14" y="4" width="1" height="3" fill="#5c2800" /><rect x="4" y="5" width="10" height="7" fill="#ffc8a0" />
    <rect x="6" y="7" width="2" height="2" fill="#2d1a00" /><rect x="10" y="7" width="2" height="2" fill="#2d1a00" />
    <rect x="7" y="7" width="1" height="1" fill="#ffffff" /><rect x="11" y="7" width="1" height="1" fill="#ffffff" />
    <rect x="5" y="9" width="2" height="1" fill="#ffaaaa" opacity="0.7" /><rect x="11" y="9" width="2" height="1" fill="#ffaaaa" opacity="0.7" />
    <rect x="8" y="10" width="2" height="1" fill="#ff8080" /><rect x="7" y="12" width="4" height="2" fill="#ffc8a0" />
    <rect x="3" y="14" width="12" height="6" fill="#c44dff" /><rect x="2" y="14" width="3" height="5" fill="#a030d0" />
    <rect x="13" y="14" width="3" height="5" fill="#a030d0" /><rect x="7" y="14" width="4" height="1" fill="#a030d0" />
    <rect x="7" y="15" width="4" height="3" fill="#e8c0ff" /><rect x="5" y="20" width="3" height="2" fill="#ff80c8" />
    <rect x="10" y="20" width="3" height="2" fill="#ff80c8" />
  </svg>
);

function PhotoBoothPage({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showChar, setShowChar] = useState(false);
  const [shots, setShots] = useState<string[]>([]);
  const [shotIdx, setShotIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  const { add: addToAlbum } = useSharedPhotos();

  const GRADIENTS = [
    "linear-gradient(135deg,#ffb3e8,#c8a0ff)",
    "linear-gradient(135deg,#a0e8ff,#80c8ff)",
    "linear-gradient(135deg,#ffe080,#ffb040)",
    "linear-gradient(135deg,#80e0b0,#40c080)",
    "linear-gradient(135deg,#ff80c8,#ff2d78)",
  ];

  const takePhoto = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
    const gradient = GRADIENTS[shots.length % GRADIENTS.length];
    setShots(prev => {
      const next = [gradient, ...prev];
      setShotIdx(0);
      addToAlbum(gradient);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col" style={{ background: "linear-gradient(160deg, #140820 0%, #0e0618 100%)" }}>
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,220,240,0.8)", fontSize: "0.5rem", fontFamily: "'Quicksand', sans-serif", fontWeight: 600 }}>
          ← 뒤로
        </button>
        <button onClick={() => setShowChar(v => !v)} className="flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{
            fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 700,
            background: showChar ? "linear-gradient(90deg,#c44dff,#ff2d78)" : "rgba(255,255,255,0.12)",
            color: "white", border: "1px solid rgba(255,120,200,0.3)",
            boxShadow: showChar ? "0 2px 8px rgba(196,77,255,0.4)" : "none", transition: "all 0.2s",
          }}>
          {showChar ? "✓ 캐릭터 ON" : "🧸 캐릭터 불러오기"}
        </button>
      </div>

      <div className="flex-1 flex gap-2 px-3 pb-3" style={{ minHeight: 0 }}>
        <div className="flex-1 relative" style={{ minWidth: 0 }}>
          <FakeCameraView>
            <AnimatePresence>
              {flash && (
                <motion.div className="absolute inset-0 bg-white pointer-events-none"
                  initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.3 }} />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showChar && (
                <motion.div className="absolute bottom-16 left-4"
                  initial={{ scale: 0, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                  <PixelCharSvg />
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {selected !== null && (
                <motion.div className="absolute top-4 right-4"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}>
                  <span style={{ fontSize: 36, filter: "drop-shadow(0 2px 6px rgba(255,45,120,0.5))" }}>
                    {SAMPLE_EMOTICONS.find(e => e.id === selected)?.emoji}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            {/* shutter */}
            <motion.button onClick={takePhoto}
              className="absolute left-1/2 -translate-x-1/2 bottom-3 flex items-center justify-center"
              style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                border: "4px solid rgba(255,255,255,0.9)",
                backdropFilter: "blur(4px)",
                boxShadow: "0 0 20px rgba(255,80,180,0.4), 0 4px 16px rgba(0,0,0,0.3)",
              }}
              whileTap={{ scale: 0.82 }} whileHover={{ scale: 1.06 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.85)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)" }} />
            </motion.button>
            {/* thumbnail preview bottom-right */}
            <AnimatePresence>
              {shots.length > 0 && (
                <motion.div className="absolute bottom-3 right-3 flex flex-col items-end gap-1"
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <div className="relative rounded-lg overflow-hidden"
                    style={{ width: 52, height: 52, border: "2px solid rgba(255,255,255,0.8)", boxShadow: "0 2px 10px rgba(0,0,0,0.4)" }}>
                    <div className="w-full h-full" style={{ background: shots[shotIdx] }} />
                    <div className="absolute top-0.5 right-0.5 rounded-sm px-0.5"
                      style={{ background: "rgba(80,200,80,0.85)", fontSize: "0.28rem", fontFamily: "'Quicksand',sans-serif", color: "white", fontWeight: 700 }}>✓</div>
                  </div>
                  {shots.length > 1 && (
                    <div className="flex gap-1 items-center">
                      <button onClick={() => setShotIdx(i => Math.min(i + 1, shots.length - 1))}
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.2)", color: "white", fontSize: 10, opacity: shotIdx < shots.length - 1 ? 1 : 0.3 }}>‹</button>
                      <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "0.28rem", color: "rgba(255,200,240,0.8)" }}>
                        {shots.length - shotIdx}/{shots.length}
                      </span>
                      <button onClick={() => setShotIdx(i => Math.max(i - 1, 0))}
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.2)", color: "white", fontSize: 10, opacity: shotIdx > 0 ? 1 : 0.3 }}>›</button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </FakeCameraView>
        </div>
        <div className="flex flex-col gap-1.5" style={{ width: 56 }}>
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.28rem", color: "rgba(255,120,200,0.7)", textAlign: "center" }}>STAMP</p>
          <EmoticonSidebar selected={selected} onSelect={id => setSelected(prev => prev === id ? null : id)} />
        </div>
      </div>
    </div>
  );
}

/* ── Emoticon Room landing ── */
function EmoticonRoomPage() {
  const [view, setView] = useState<"home" | "maker" | "photo">("home");

  if (view === "maker") return <EmoticonMakerPage onBack={() => setView("home")} />;
  if (view === "photo") return <PhotoBoothPage onBack={() => setView("home")} />;

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{
      background: "linear-gradient(160deg, #f8f0ff 0%, #fff0f8 100%)",
    }}>
      <div className="flex items-center pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(255,45,120,0.2)" }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "#ff2d78" }}>★</span>
        <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.7rem", color: "#ff2d78", letterSpacing: "0.12em", marginLeft: 6 }}>EMOTICON ROOM</span>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.33rem", color: "#c44dff", marginBottom: 8 }}>MY EMOTICONS ✦</p>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {SAMPLE_EMOTICONS.map((e, i) => (
            <motion.div key={e.id} className="flex flex-col items-center gap-1 rounded-xl py-2.5"
              style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(196,77,255,0.15)" }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.04 }}>
              <span style={{ fontSize: 28 }}>{e.emoji}</span>
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", color: "#9060b0", fontWeight: 600 }}>{e.label}</span>
            </motion.div>
          ))}
          <button onClick={() => setView("maker")}
            className="flex flex-col items-center justify-center gap-1 rounded-xl py-2.5"
            style={{ border: "1.5px dashed rgba(196,77,255,0.3)", background: "rgba(196,77,255,0.04)" }}>
            <span style={{ fontSize: 22, color: "#c44dff" }}>＋</span>
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#c44dff" }}>추가</span>
          </button>
        </div>
      </div>
      {/* bottom action buttons — same size, side by side */}
      <div className="flex gap-2 flex-shrink-0">
        <motion.button onClick={() => setView("photo")}
          className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-white"
          style={{
            fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", fontWeight: 700,
            background: "linear-gradient(135deg, #ff6040, #ff2d78)",
            boxShadow: "0 3px 12px rgba(255,60,80,0.4)",
          }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <span style={{ fontSize: 15 }}>📸</span> 사진찍기
        </motion.button>
        <motion.button onClick={() => setView("maker")}
          className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-white"
          style={{
            fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", fontWeight: 700,
            background: "linear-gradient(135deg, #7c3aed, #c44dff)",
            boxShadow: "0 3px 12px rgba(130,60,255,0.4)",
          }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <span style={{ fontSize: 15 }}>✨</span> 이모티콘 생성
        </motion.button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RIGHT PAGE — GUESTBOOK
═══════════════════════════════════════════ */
const INITIAL_ENTRIES = [
  { id: 1, name: "별빛소녀✨", msg: "다이어리 너무 예뻐요!! 자주 올게요 🌸", date: "2026.06.22", color: "#ff80c8" },
  { id: 2, name: "하늘이💙", msg: "오늘도 행복한 하루 보내요~~ 또 놀러올게용", date: "2026.06.21", color: "#80c8ff" },
  { id: 3, name: "민트초코🍃", msg: "Y2K 감성 너무 좋다!! bgm도 최고야 ㅠㅠ💜", date: "2026.06.20", color: "#80e0b0" },
];

function GuestbookPage() {
  const [entries, setEntries] = useState(INITIAL_ENTRIES);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  const COLORS = ["#ff80c8", "#c8a0ff", "#80c8ff", "#80e0b0", "#ffe080", "#ffa880"];

  const handleSubmit = () => {
    if (!name.trim() || !msg.trim()) return;
    const today = new Date();
    const date = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,"0")}.${String(today.getDate()).padStart(2,"0")}`;
    setEntries(prev => [{ id: Date.now(), name: name.trim(), msg: msg.trim(), date, color: COLORS[prev.length % COLORS.length] }, ...prev]);
    setName(""); setMsg(""); setShowForm(false);
  };

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{
      background: "linear-gradient(160deg, #fff4f8 0%, #f8f0ff 100%)",
    }}>
      {/* header */}
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(255,120,80,0.2)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "#ff6040" }}>★</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.7rem", color: "#ff6040", letterSpacing: "0.12em" }}>GUESTBOOK</span>
          <span className="px-1.5 py-0.5 rounded-full" style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: "0.3rem",
            background: "rgba(255,96,64,0.12)", color: "#ff6040",
          }}>{entries.length}</span>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-white"
          style={{
            fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 700,
            background: showForm
              ? "linear-gradient(90deg, #aaa, #888)"
              : "linear-gradient(90deg, #ff6040, #ff2d78)",
            boxShadow: "0 2px 8px rgba(255,80,40,0.3)",
            transition: "background 0.2s",
          }}
        >
          {showForm ? "✕ 닫기" : "✏️ 기록 남기기"}
        </button>
      </div>

      {/* write form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="rounded-xl p-2.5 flex flex-col gap-2 flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(255,110,80,0.08), rgba(255,45,120,0.06))",
              border: "1px solid rgba(255,96,64,0.2)",
            }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="이름 (닉네임)"
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none"
              style={{
                fontFamily: "'Quicksand', sans-serif", fontSize: "0.6rem",
                background: "rgba(255,255,255,0.8)",
                border: "1px solid rgba(255,96,64,0.25)",
                color: "#4a2030",
              }}
            />
            <textarea
              value={msg}
              onChange={e => setMsg(e.target.value)}
              placeholder="방명록을 남겨주세요 🌸"
              rows={2}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none resize-none"
              style={{
                fontFamily: "'Quicksand', sans-serif", fontSize: "0.6rem",
                background: "rgba(255,255,255,0.8)",
                border: "1px solid rgba(255,96,64,0.25)",
                color: "#4a2030",
              }}
            />
            <button
              onClick={handleSubmit}
              className="self-end px-3 py-1 rounded-full text-white"
              style={{
                fontFamily: "'Quicksand', sans-serif", fontSize: "0.55rem", fontWeight: 700,
                background: "linear-gradient(90deg, #ff6040, #ff2d78)",
                boxShadow: "0 2px 6px rgba(255,80,40,0.3)",
                opacity: name && msg ? 1 : 0.5,
              }}
            >
              등록 ✦
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* entries list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5" style={{ minHeight: 0 }}>
        {entries.map((entry, i) => (
          <motion.div
            key={entry.id}
            className="rounded-xl p-2.5"
            style={{
              background: "rgba(255,255,255,0.75)",
              border: `1px solid ${entry.color}44`,
              boxShadow: `0 1px 6px ${entry.color}22`,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                {/* avatar circle */}
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{
                  background: `linear-gradient(135deg, ${entry.color}, ${entry.color}88)`,
                  fontSize: 10,
                }}>
                  {entry.name[0]}
                </div>
                <span style={{
                  fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.6rem", color: "#4a2030",
                }}>{entry.name}</span>
              </div>
              <span style={{
                fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", color: "#b090a0",
              }}>{entry.date}</span>
            </div>
            <p style={{
              fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", color: "#6a4060",
              lineHeight: 1.5, paddingLeft: "1.6rem",
            }}>{entry.msg}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RIGHT PAGE — MINI ROOM
═══════════════════════════════════════════ */
const ROOM_ITEMS = [
  { id: "sofa",    emoji: "🛋️", label: "소파",     color: "#ff80c8" },
  { id: "lamp",    emoji: "💡", label: "램프",     color: "#ffe060" },
  { id: "plant",   emoji: "🪴", label: "화분",     color: "#80e0b0" },
  { id: "books",   emoji: "📚", label: "책장",     color: "#80c8ff" },
  { id: "bear",    emoji: "🧸", label: "인형",     color: "#e8c090" },
  { id: "clock",   emoji: "🕰️", label: "시계",     color: "#c8a0ff" },
  { id: "frame",   emoji: "🖼️", label: "액자",     color: "#ffa880" },
  { id: "rug",     emoji: "🟫", label: "러그",     color: "#d4a060" },
  { id: "pc",      emoji: "💻", label: "컴퓨터",   color: "#9090e0" },
  { id: "music",   emoji: "🎵", label: "스피커",   color: "#ff80a0" },
  { id: "star",    emoji: "⭐", label: "별 장식",  color: "#ffe060" },
  { id: "flower",  emoji: "🌸", label: "꽃병",     color: "#ffb0d0" },
];

function MiniRoomPage() {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [eraseMode, setEraseMode] = useState(false);
  const [placedItems, setPlacedItems] = useState<PlacedRoomItem[]>([]);

  const handleRoomClick = (x: number, y: number) => {
    if (eraseMode || !selectedItemId) return;
    const item = ROOM_ITEMS.find((i) => i.id === selectedItemId);
    if (!item) return;
    setPlacedItems((prev) => [
      ...prev,
      { uid: `${Date.now()}-${Math.random()}`, itemId: item.id, emoji: item.emoji, x, y },
    ]);
  };

  const handleItemClick = (uid: string) => {
    if (!eraseMode) return;
    setPlacedItems((prev) => prev.filter((p) => p.uid !== uid));
  };

  const selectItem = (id: string) => {
    setEraseMode(false);
    setSelectedItemId((prev) => (prev === id ? null : id));
  };

  const selectErase = () => {
    setEraseMode((prev) => !prev);
    if (!eraseMode) setSelectedItemId(null);
  };

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{
      background: "linear-gradient(160deg, #f8f0ff 0%, #fff0f8 100%)",
    }}>
      {/* header */}
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(128,224,176,0.3)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "#40b080" }}>★</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.7rem", color: "#40b080", letterSpacing: "0.12em" }}>MINI ROOM</span>
        </div>
        <div className="flex items-center gap-1.5">
          {placedItems.length > 0 && (
            <button
              onClick={() => setPlacedItems([])}
              className="px-2 py-0.5 rounded-full"
              style={{
                fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", fontWeight: 600,
                color: "#9060b0", background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(196,77,255,0.2)",
              }}
            >
              초기화
            </button>
          )}
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", color: "#80b0a0" }}>
            {eraseMode ? "지울 아이템을 탭하세요" : selectedItemId ? "방을 탭해서 배치" : "아이템을 선택하세요"}
          </span>
        </div>
      </div>

      {/* room canvas */}
      <div className="flex-1 rounded-xl overflow-hidden relative" style={{
        border: "1.5px solid rgba(128,224,176,0.35)",
        background: "#f0e8ff",
        minHeight: 0,
        boxShadow: "inset 0 2px 8px rgba(128,224,176,0.08)",
      }}>
        <MiniRoom
          placedItems={placedItems}
          onRoomClick={handleRoomClick}
          onItemClick={handleItemClick}
          eraseMode={eraseMode}
        />
      </div>

      {/* bottom item palette */}
      <div className="rounded-xl p-2 flex-shrink-0" style={{
        background: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(128,224,176,0.25)",
      }}>
        <div className="flex items-center gap-1 mb-1.5">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.3rem", color: "#40b080", marginRight: 2 }}>ITEM</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#80b0a0" }}>꾸미기 아이템</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "thin" }}>
          <motion.button
            onClick={selectErase}
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: eraseMode ? "rgba(255,100,100,0.2)" : "rgba(255,100,100,0.08)",
              border: eraseMode ? "2px solid #ff6060" : "1.5px solid rgba(255,100,100,0.25)",
            }}
            whileTap={{ scale: 0.92 }}
            title="지우기"
          >
            <span style={{ fontSize: 16 }}>🗑️</span>
          </motion.button>
          <div className="w-px h-7 flex-shrink-0" style={{ background: "rgba(128,224,176,0.3)" }} />
          {ROOM_ITEMS.map((item) => {
            const on = !eraseMode && selectedItemId === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => selectItem(item.id)}
                className="flex-shrink-0 flex flex-col items-center gap-0.5 w-9"
                whileTap={{ scale: 0.92 }}
                title={item.label}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-transform"
                  style={{
                    background: on ? `${item.color}33` : "rgba(128,224,176,0.08)",
                    border: on ? `2px solid ${item.color}` : "1.5px solid rgba(128,224,176,0.2)",
                    transform: on ? "scale(1.08)" : undefined,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{item.emoji}</span>
                </div>
                <span style={{
                  fontFamily: "'Quicksand', sans-serif", fontSize: "0.35rem", fontWeight: on ? 700 : 500,
                  color: on ? item.color : "#80a090", whiteSpace: "nowrap",
                }}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DIARY PAGE
═══════════════════════════════════════════ */
const WEATHER_OPTIONS = ["☀️","🌤️","⛅","🌧️","⛈️","❄️","🌈","🌙"];
const STICKER_OPTIONS = ["🌸","⭐","💖","🎀","✨","🦋","🍀","🌙","💫","🎵","🌺","💝"];

const INIT_ENTRIES = [
  { id: 1, date: "2026-06-22", weather: "🌸", privacy: "public", content: "오늘은 날씨가 너무 좋았다. 카페에서 라떼 마시면서 음악 들었는데 너무 행복했어 ☕✨", stickers: ["💖","🎵"] },
  { id: 2, date: "2026-06-19", weather: "🌧️", privacy: "private", content: "비 오는 날엔 괜히 감성적이 돼. 창밖 빗소리 들으면서 일기 썼다. 이런 날이 오히려 좋아.", stickers: ["🌙"] },
  { id: 3, date: "2026-06-15", weather: "☀️", privacy: "public", content: "친구들이랑 한강 나갔다! 사진도 많이 찍고 웃음이 넘쳤던 하루였어 🌻💛", stickers: ["✨","🌸","💖"] },
];

function DiaryPage() {
  const [entries, setEntries] = useState(INIT_ENTRIES);
  const [privacy, setPrivacy] = useState<"public"|"private">("public");
  const [selWeather, setSelWeather] = useState("☀️");
  const [content, setContent] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [activeStickers, setActiveStickers] = useState<string[]>([]);
  const [showBoard, setShowBoard] = useState(false);

  const today = new Date().toLocaleDateString("ko-KR", { year:"numeric", month:"2-digit", day:"2-digit" }).replace(/\. /g,".").replace(".",".");

  const saveEntry = () => {
    if (!content.trim()) return;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    setEntries(prev => [{ id: Date.now(), date, weather: selWeather, privacy, content, stickers: [...activeStickers] }, ...prev]);
    setContent(""); setActiveStickers([]);
  };

  const fmtDate = (d: string) => {
    const [y,m,day] = d.split("-");
    return `${y}년 ${m}월 ${day}일`;
  };

  return (
    <div className="h-full flex flex-col" style={{ background: "linear-gradient(160deg, #fffdf0 0%, #fff8f4 100%)" }}>
      {/* top bar */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b flex-shrink-0" style={{ borderColor: "rgba(255,160,80,0.2)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "#e08040" }}>★</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.7rem", color: "#e08040", letterSpacing: "0.1em" }}>DIARY</span>
        </div>
        <button onClick={() => setPrivacy(p => p === "public" ? "private" : "public")}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{
            fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 700,
            background: privacy === "private" ? "linear-gradient(90deg,#555,#333)" : "linear-gradient(90deg,#ff8040,#ff2d78)",
            color: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.15)",
          }}>
          {privacy === "private" ? "🔒 비공개" : "🔓 공개"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-3" style={{ minHeight: 0 }}>
        {/* NEW ENTRY EDITOR */}
        <div className="rounded-2xl p-3 flex flex-col gap-2 flex-shrink-0" style={{
          background: "rgba(255,255,255,0.85)",
          border: "1.5px solid rgba(255,160,80,0.3)",
          boxShadow: "0 2px 12px rgba(255,130,60,0.08)",
        }}>
          {/* date + weather row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.35rem", color: "#e08040" }}>📅</span>
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.6rem", color: "#c06030" }}>{today}</span>
            </div>
            {/* weather picker */}
            <div className="flex gap-0.5">
              {WEATHER_OPTIONS.map(w => (
                <button key={w} onClick={() => setSelWeather(w)}
                  className="rounded-lg flex items-center justify-center transition-all"
                  style={{
                    width: 22, height: 22, fontSize: 12,
                    background: selWeather === w ? "rgba(255,160,80,0.25)" : "transparent",
                    border: selWeather === w ? "1.5px solid rgba(255,130,60,0.5)" : "1px solid transparent",
                  }}>{w}</button>
              ))}
            </div>
          </div>

          {/* active stickers row */}
          {activeStickers.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {activeStickers.map((s, i) => (
                <button key={i} onClick={() => setActiveStickers(prev => prev.filter((_,j)=>j!==i))}
                  className="rounded-lg px-1.5 py-0.5 text-sm"
                  style={{ background: "rgba(255,200,150,0.2)", border: "1px solid rgba(255,160,80,0.2)" }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* textarea */}
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="오늘 하루는 어땠나요? ✏️"
            rows={4}
            className="w-full resize-none outline-none rounded-xl px-2.5 py-2"
            style={{
              fontFamily: "'Quicksand', sans-serif", fontSize: "0.62rem", color: "#5a3820", lineHeight: 1.8,
              background: "rgba(255,250,240,0.8)",
              border: "1px solid rgba(255,180,100,0.2)",
            }}
          />

          {/* bottom toolbar */}
          <div className="flex items-center justify-between">
            <button onClick={() => setShowStickers(v=>!v)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full"
              style={{
                fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 600,
                background: showStickers ? "rgba(255,160,80,0.2)" : "rgba(255,160,80,0.1)",
                color: "#d06020", border: "1px solid rgba(255,160,80,0.3)",
              }}>
              🌸 스티커 추가
            </button>
            <button onClick={saveEntry}
              className="px-3 py-1 rounded-full text-white"
              style={{
                fontFamily: "'Quicksand', sans-serif", fontSize: "0.55rem", fontWeight: 700,
                background: content.trim() ? "linear-gradient(90deg,#ff8040,#ff2d78)" : "rgba(200,180,170,0.5)",
                boxShadow: content.trim() ? "0 2px 8px rgba(255,100,40,0.3)" : "none",
                transition: "all 0.2s",
              }}>
              저장 ✦
            </button>
          </div>

          {/* sticker picker */}
          <AnimatePresence>
            {showStickers && (
              <motion.div className="grid gap-1" style={{ gridTemplateColumns: "repeat(6,1fr)" }}
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                {STICKER_OPTIONS.map(s => (
                  <button key={s} onClick={() => { setActiveStickers(prev=>[...prev,s]); }}
                    className="rounded-lg flex items-center justify-center"
                    style={{ height: 30, fontSize: 16, background: "rgba(255,200,150,0.15)", border: "1px solid rgba(255,160,80,0.2)" }}>
                    {s}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* PAST ENTRIES */}
        {entries.map((entry, i) => (
          <motion.div key={entry.id} className="rounded-2xl overflow-hidden flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.75)",
              border: "1px solid rgba(255,180,100,0.2)",
              boxShadow: "0 1px 8px rgba(255,130,60,0.06)",
            }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            {/* entry header */}
            <div className="flex items-center justify-between px-3 py-1.5" style={{
              background: "linear-gradient(90deg, rgba(255,200,140,0.25), rgba(255,180,200,0.15))",
              borderBottom: "1px solid rgba(255,180,100,0.15)",
            }}>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 16 }}>{entry.weather}</span>
                <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.58rem", color: "#c06030" }}>{fmtDate(entry.date)}</span>
              </div>
              <span style={{ fontSize: 12 }}>{entry.privacy === "private" ? "🔒" : "🔓"}</span>
            </div>
            {/* entry body */}
            <div className="px-3 py-2">
              <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.6rem", color: "#6a4020", lineHeight: 1.7 }}>{entry.content}</p>
              {entry.stickers.length > 0 && (
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {entry.stickers.map((s, j) => <span key={j} style={{ fontSize: 14 }}>{s}</span>)}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HOME RIGHT — MINI ROOM + NEIGHBORS
═══════════════════════════════════════════ */
type Neighbor = {
  id: number;
  name: string;
  color: string;
  avatar: AvatarConfig;
};

const AVATAR_PRESETS: AvatarConfig[] = [
  { hairDark: "#2a1060", hairLight: "#7040c0", skin: "#ffe0c8", outfit: "#ffe060", outfitDark: "#e0c030", outfitInner: "#fff8b0", pants: "#9060d0" },
  { hairDark: "#103060", hairLight: "#4080c0", skin: "#ffc8a0", outfit: "#80c8ff", outfitDark: "#5090d0", outfitInner: "#c0e8ff", pants: "#4060a0" },
  { hairDark: "#1a4030", hairLight: "#40a080", skin: "#ffd8b8", outfit: "#80e0b0", outfitDark: "#50c090", outfitInner: "#c0ffe0", pants: "#308060" },
  { hairDark: "#501030", hairLight: "#c04080", skin: "#ffc8a0", outfit: "#ff80c8", outfitDark: "#ff60b8", outfitInner: "#ffe0f4", pants: "#c06090" },
  { hairDark: "#3d1a00", hairLight: "#5c2800", skin: "#ffc8a0", outfit: "#c8a0ff", outfitDark: "#a080e0", outfitInner: "#e8d8ff", pants: "#6040a0" },
  { hairDark: "#402010", hairLight: "#804030", skin: "#ffe0c0", outfit: "#ffa880", outfitDark: "#e08060", outfitInner: "#ffe0c0", pants: "#804040" },
  { hairDark: "#204040", hairLight: "#408080", skin: "#ffd0b0", outfit: "#80e8ff", outfitDark: "#50c0d0", outfitInner: "#c0f8ff", pants: "#306070" },
  { hairDark: "#402060", hairLight: "#8040a0", skin: "#ffe8d0", outfit: "#ffb0d0", outfitDark: "#ff80a0", outfitInner: "#ffe0f0", pants: "#804080" },
];

const FRIEND_COLORS = ["#ffe060", "#80c8ff", "#80e0b0", "#ff80c8", "#c8a0ff", "#ffa880", "#80e8ff", "#ffb0d0"];

const INITIAL_NEIGHBORS: Neighbor[] = [
  { id: 1, name: "별빛소녀", color: "#ffe060", avatar: AVATAR_PRESETS[0] },
  { id: 2, name: "하늘이",   color: "#80c8ff", avatar: AVATAR_PRESETS[1] },
  { id: 3, name: "민트초코", color: "#80e0b0", avatar: AVATAR_PRESETS[2] },
  { id: 4, name: "핑크몽",   color: "#ff80c8", avatar: AVATAR_PRESETS[3] },
];

type VisitMode = "miniroom" | "guest" | "diary";

function FriendVisitPage({ nb, onBack }: { nb: Neighbor; onBack: () => void }) {
  const [mode, setMode] = useState<VisitMode>("miniroom");
  const MODES: { id: VisitMode; label: string; emoji: string }[] = [
    { id: "miniroom", label: "미니룸",  emoji: "🏠" },
    { id: "guest",    label: "방명록",  emoji: "✍️" },
    { id: "diary",    label: "일기",    emoji: "📖" },
  ];

  return (
    <div className="h-full flex flex-col gap-2 p-3" style={{ background: "linear-gradient(160deg, #f0f4ff 0%, #f8f0ff 100%)" }}>
      {/* header */}
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: `${nb.color}44` }}>
        <div className="flex items-center gap-2">
          <NeighborAvatar avatar={nb.avatar} color={nb.color} size={28} />
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.65rem", color: "#4a2060" }}>{nb.name}</span>
        </div>
        <button onClick={onBack} className="px-2 py-0.5 rounded-full"
          style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 600, background: "rgba(196,77,255,0.1)", color: "#9060b0" }}>
          ← 돌아가기
        </button>
      </div>

      {/* mode tabs */}
      <div className="flex gap-1.5 flex-shrink-0">
        {MODES.map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            className="flex-1 py-1 rounded-lg flex items-center justify-center gap-1"
            style={{
              fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 700,
              background: mode === m.id ? `linear-gradient(135deg, ${nb.color}, ${nb.color}aa)` : "rgba(255,255,255,0.6)",
              color: mode === m.id ? "#fff" : "#9060b0",
              border: mode === m.id ? "none" : "1px solid rgba(196,77,255,0.15)",
              boxShadow: mode === m.id ? `0 2px 8px ${nb.color}55` : "none",
              transition: "all 0.15s",
            }}>
            {m.emoji} {m.label}
          </button>
        ))}
      </div>

      {/* content */}
      <div className="flex-1 rounded-xl overflow-hidden" style={{ minHeight: 0 }}>
        {mode === "miniroom" && (
          <div className="relative h-full" style={{ border: `1.5px solid ${nb.color}44`, background: "#f0e8ff", borderRadius: 12, overflow: "hidden" }}>
            <MiniRoom />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(255,255,255,0.88)", border: `1px solid ${nb.color}` }}>
              <NeighborAvatar avatar={nb.avatar} color={nb.color} size={18} showOnline={false} />
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", fontWeight: 700, color: "#6040a0" }}>{nb.name}의 방</span>
            </div>
          </div>
        )}
        {mode === "guest" && (
          <div className="h-full flex flex-col gap-2 p-3 rounded-xl overflow-y-auto" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${nb.color}33` }}>
            <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.33rem", color: "#c44dff" }}>방명록</p>
            {[
              { user: "Re:world ✦", msg: "항상 행복하게 지내요 🌸", date: "2026.06.20" },
              { user: "민트초코🍃", msg: "자주 놀러올게요 💚", date: "2026.06.18" },
            ].map((e, i) => (
              <div key={i} className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${nb.color}33` }}>
                <div className="flex justify-between mb-0.5">
                  <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.55rem", color: "#6040a0" }}>{e.user}</span>
                  <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#b090c0" }}>{e.date}</span>
                </div>
                <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.57rem", color: "#5a3080" }}>{e.msg}</p>
              </div>
            ))}
            <button className="w-full py-1.5 rounded-xl text-white mt-auto"
              style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 700, background: `linear-gradient(90deg,${nb.color},${nb.color}aa)` }}>
              방명록 남기기 ✍️
            </button>
          </div>
        )}
        {mode === "diary" && (
          <div className="h-full flex flex-col gap-2 p-3 rounded-xl overflow-y-auto" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${nb.color}33` }}>
            <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.33rem", color: "#e08040" }}>공개 일기</p>
            {[
              { date: "2026.06.21", weather: "🌸", content: "오늘 날씨가 진짜 좋았어서 산책 다녀왔어요 ✨" },
              { date: "2026.06.18", weather: "☀️", content: "카페에서 라떼 마시면서 음악 들었는데 너무 행복 ☕" },
            ].map((e, i) => (
              <div key={i} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${nb.color}33` }}>
                <div className="flex items-center gap-1.5 px-2.5 py-1" style={{ background: `${nb.color}22`, borderBottom: `1px solid ${nb.color}22` }}>
                  <span style={{ fontSize: 13 }}>{e.weather}</span>
                  <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.55rem", color: "#c06030" }}>{e.date}</span>
                  <span style={{ fontSize: 10 }}>🔓</span>
                </div>
                <p className="px-2.5 py-1.5" style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", color: "#6a4020", lineHeight: 1.6 }}>{e.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AddFriendModal({ onClose, onAdd }: { onClose: () => void; onAdd: (name: string) => void }) {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    onClose();
  };

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(80,40,120,0.35)" }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[220px] rounded-2xl p-4 flex flex-col gap-3"
        style={{
          background: "linear-gradient(160deg, #fff8ff 0%, #f8f0ff 100%)",
          border: "2px solid rgba(196,77,255,0.25)",
          boxShadow: "0 8px 32px rgba(196,77,255,0.2)",
        }}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.35rem", color: "#c44dff" }}>♡</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.65rem", color: "#6040a0" }}>친구 추가</span>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="닉네임 입력"
          maxLength={12}
          autoFocus
          className="w-full px-3 py-2 rounded-xl outline-none"
          style={{
            fontFamily: "'Quicksand', sans-serif", fontSize: "0.6rem", fontWeight: 600,
            background: "rgba(255,255,255,0.9)", border: "1.5px solid rgba(196,77,255,0.2)", color: "#4a2060",
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 rounded-xl"
            style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 600, color: "#9060b0", background: "rgba(196,77,255,0.08)" }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 py-1.5 rounded-xl text-white"
            style={{
              fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 700,
              background: name.trim() ? "linear-gradient(90deg, #c44dff, #ff2d78)" : "rgba(196,77,255,0.25)",
              opacity: name.trim() ? 1 : 0.6,
            }}
          >
            추가
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function HomeRightPage() {
  const [neighbors, setNeighbors] = useState<Neighbor[]>(INITIAL_NEIGHBORS);
  const [selectedFriend, setSelectedFriend] = useState<Neighbor | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);

  const handleAddFriend = (name: string) => {
    const presetIdx = neighbors.length % AVATAR_PRESETS.length;
    const colorIdx = neighbors.length % FRIEND_COLORS.length;
    setNeighbors((prev) => [
      ...prev,
      {
        id: Date.now(),
        name,
        color: FRIEND_COLORS[colorIdx],
        avatar: AVATAR_PRESETS[presetIdx],
      },
    ]);
  };

  if (selectedFriend) return <FriendVisitPage nb={selectedFriend} onBack={() => setSelectedFriend(null)} />;

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden relative" style={{ background: "linear-gradient(160deg, #f8f0ff 0%, #fff0f8 100%)" }}>
      {showAddFriend && (
        <AddFriendModal onClose={() => setShowAddFriend(false)} onAdd={handleAddFriend} />
      )}

      {/* ① 게시판 */}
      <HomeBoardSection onExpand={() => {}} />

      {/* ② 미니룸 (compact) */}
      <div className="rounded-xl overflow-hidden flex-shrink-0 relative" style={{
        height: "30%",
        border: "1.5px solid rgba(255,110,180,0.25)",
        background: "#f0e8ff",
        boxShadow: "inset 0 2px 8px rgba(196,77,255,0.06)",
      }}>
        <MiniRoom />
        <div className="absolute top-1.5 left-2 flex items-center gap-1">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.32rem", color: "#ff2d78" }}>★ MINI ROOM</span>
        </div>
        <button className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded-full text-white"
          style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", fontWeight: 700, background: "linear-gradient(90deg,#ff2d78,#c44dff)" }}>
          꾸미기
        </button>
      </div>

      {/* ③ 친구 목록 — 정사각형 그리드 */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-hidden" style={{ minHeight: 0 }}>
        <div className="flex items-center justify-between flex-shrink-0">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.35rem", color: "#c44dff" }}>이웃 ♡</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", color: "#9060b0" }}>{neighbors.length}명</span>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {neighbors.map((nb, i) => (
              <motion.button
                key={nb.id}
                onClick={() => setSelectedFriend(nb)}
                className="flex flex-col items-center gap-1 rounded-xl py-2 px-1"
                style={{
                  background: "rgba(255,255,255,0.72)",
                  border: `1.5px solid ${nb.color}55`,
                  boxShadow: `0 1px 6px ${nb.color}22`,
                  cursor: "pointer",
                }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ scale: 1.04, boxShadow: `0 3px 12px ${nb.color}44` }}
                whileTap={{ scale: 0.95 }}
              >
                <NeighborAvatar avatar={nb.avatar} color={nb.color} />
                <span style={{
                  fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.45rem",
                  color: "#4a2060", textAlign: "center", lineHeight: 1.2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
                }}>{nb.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
        <motion.button
          onClick={() => setShowAddFriend(true)}
          className="w-full py-2 rounded-xl flex items-center justify-center gap-1.5 flex-shrink-0"
          style={{
            fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 700,
            background: "linear-gradient(90deg, #c44dff, #ff2d78)",
            color: "white",
            boxShadow: "0 2px 10px rgba(196,77,255,0.3)",
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <span style={{ fontSize: 12 }}>＋</span>
          친구 추가
        </motion.button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HOME LEFT — BULLETIN BOARD + PROFILE
═══════════════════════════════════════════ */
const BOARD_POSTS = [
  { id: 1, user: "별빛소녀✨", content: "오늘 새로 산 픽셀 캐릭터 어때요?? 💖", likes: 24, time: "5분 전" },
  { id: 2, user: "민트초코🍃", content: "Re:world 다이어리 테마 너무 예쁘다ㅠ 저도 써보고 싶어요!", likes: 18, time: "12분 전" },
  { id: 3, user: "하늘이💙", content: "오늘 날씨 너무 좋아서 기분 최고 ☀️ 모두 좋은 하루 보내요~", likes: 31, time: "28분 전" },
];

function HomeBoardSection({ onExpand }: { onExpand: () => void }) {
  const [liked, setLiked] = useState<Set<number>>(new Set());
  return (
    <div className="rounded-xl overflow-hidden flex-shrink-0" style={{
      background: "rgba(255,255,255,0.75)",
      border: "1px solid rgba(196,77,255,0.15)",
      boxShadow: "0 2px 10px rgba(196,77,255,0.06)",
    }}>
      <div className="flex items-center justify-between px-2.5 py-1.5" style={{
        background: "linear-gradient(90deg, rgba(255,180,220,0.2), rgba(196,77,255,0.1))",
        borderBottom: "1px solid rgba(196,77,255,0.12)",
      }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "#c44dff" }}>게시판 💬</span>
        <button onClick={onExpand}
          className="w-5 h-5 rounded-full flex items-center justify-center text-white"
          style={{ background: "linear-gradient(135deg, #ff2d78, #c44dff)", fontSize: 12, fontWeight: 700 }}>+</button>
      </div>
      {BOARD_POSTS.map((post, i) => (
        <div key={post.id} className="px-2.5 py-1.5 flex flex-col gap-0.5" style={{
          borderBottom: i < BOARD_POSTS.length - 1 ? "1px solid rgba(196,77,255,0.08)" : "none",
        }}>
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.5rem", color: "#7040a0" }}>{post.user}</span>
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#b090c0" }}>{post.time}</span>
          </div>
          <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.55rem", color: "#5a3080", lineHeight: 1.4,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.content}</p>
          <button onClick={() => setLiked(prev => { const n = new Set(prev); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
            className="self-start flex items-center gap-0.5"
            style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", color: liked.has(post.id) ? "#ff2d78" : "#b090c0", fontWeight: 600 }}>
            {liked.has(post.id) ? "♥" : "♡"} {post.likes + (liked.has(post.id) ? 1 : 0)}
          </button>
        </div>
      ))}
    </div>
  );
}

function BoardExpandPage({ onBack }: { onBack: () => void }) {
  const [posts, setPosts] = useState(BOARD_POSTS);
  const [newPost, setNewPost] = useState("");
  const [liked, setLiked] = useState<Set<number>>(new Set());

  const submit = () => {
    if (!newPost.trim()) return;
    setPosts(prev => [{ id: Date.now(), user: "Re:world ✦", content: newPost, likes: 0, time: "방금" }, ...prev]);
    setNewPost("");
  };

  return (
    <div className="h-full flex flex-col gap-2 p-3" style={{ background: "linear-gradient(160deg, #fff5fd 0%, #f0e8ff 100%)" }}>
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(196,77,255,0.2)" }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.42rem", color: "#c44dff" }}>게시판 💬</span>
        <button onClick={onBack} className="px-2 py-0.5 rounded-full" style={{
          fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 600,
          background: "rgba(196,77,255,0.1)", color: "#9060b0",
        }}>← 닫기</button>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <input value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="글 남기기 ✨"
          className="flex-1 px-2 py-1.5 rounded-xl outline-none"
          style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", color: "#5a3080", background: "rgba(255,255,255,0.8)", border: "1px solid rgba(196,77,255,0.2)" }} />
        <button onClick={submit} className="px-3 rounded-xl text-white"
          style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 700, background: "linear-gradient(90deg,#ff2d78,#c44dff)" }}>등록</button>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5" style={{ minHeight: 0 }}>
        {posts.map((post, i) => (
          <motion.div key={post.id} className="rounded-xl p-2.5"
            style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(196,77,255,0.12)" }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <div className="flex justify-between mb-0.5">
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.55rem", color: "#7040a0" }}>{post.user}</span>
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#b090c0" }}>{post.time}</span>
            </div>
            <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", color: "#5a3080", lineHeight: 1.5, marginBottom: 4 }}>{post.content}</p>
            <button onClick={() => setLiked(prev => { const n = new Set(prev); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
              style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", color: liked.has(post.id) ? "#ff2d78" : "#b090c0", fontWeight: 600 }}>
              {liked.has(post.id) ? "♥" : "♡"} {post.likes + (liked.has(post.id) ? 1 : 0)}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HOME LEFT PAGE (with board)
═══════════════════════════════════════════ */
function HomeLeftPage() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showBoard, setShowBoard] = useState(false);

  if (showBoard) return <BoardExpandPage onBack={() => setShowBoard(false)} />;

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{ background: "linear-gradient(160deg, #fff5fd 0%, #f0e8ff 100%)" }}>
      {/* bulletin board */}
      <HomeBoardSection onExpand={() => setShowBoard(true)} />

      {/* divider */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to right,transparent,rgba(196,77,255,0.3))" }} />
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.3rem", color: "#c44dff" }}>MY INFO</span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to left,transparent,rgba(196,77,255,0.3))" }} />
      </div>

      {/* compact avatar card */}
      <div className="rounded-xl p-2 flex gap-2 items-center flex-shrink-0" style={{
        background: "linear-gradient(135deg,rgba(255,180,220,0.3),rgba(196,77,255,0.1))",
        border: "1px solid rgba(255,110,180,0.2)",
      }}>
        <div className="rounded-lg overflow-hidden flex-shrink-0" style={{
          width: 44, height: 50,
          background: "linear-gradient(135deg,#ffe0f4,#e8d0ff)",
          border: "1.5px solid rgba(255,45,120,0.25)",
        }}>
          <div style={{ transform: "scale(0.6)", transformOrigin: "top left", width: "167%", height: "167%" }}>
            <PixelAvatar />
          </div>
        </div>
        <div>
          <p style={{ fontFamily: 'Great Vibes, Comic Sans MS, Malgun Gothic, sans-serif', fontSize: '1.3rem', color: 'rgb(212, 0, 106)', lineHeight: '1.1' }}>Re:world</p>
          <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", color: "#9060b0" }}>일상 기록중 🌸</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: "#4cda64" }} />
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#70a060" }}>온라인</span>
        </div>
      </div>

      {/* music player compact */}
      <div className="rounded-xl p-2 flex items-center gap-2 flex-shrink-0" style={{
        background: "linear-gradient(90deg,rgba(255,45,120,0.07),rgba(196,77,255,0.07))",
        border: "1px solid rgba(255,80,180,0.18)",
      }}>
        <button onClick={() => setIsPlaying(!isPlaying)}
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#ff2d78,#c44dff)", boxShadow: "0 1px 6px rgba(255,45,120,0.35)" }}>
          <span style={{ color: "white", fontSize: 9, paddingLeft: isPlaying ? 0 : 1 }}>{isPlaying ? "⏸" : "▶"}</span>
        </button>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 700, color: "#d4006a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            ♪ Lovefool - The Cardigans
          </p>
          <div className="mt-0.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(196,77,255,0.15)" }}>
            <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#ff2d78,#c44dff)" }}
              animate={isPlaying ? { width: ["30%","80%"] } : { width: "30%" }}
              transition={isPlaying ? { duration: 20, ease: "linear" } : {}} />
          </div>
        </div>
      </div>

      {/* visitor count */}
      <div className="rounded-xl px-2.5 py-1.5 flex items-center justify-between flex-shrink-0" style={{
        background: "linear-gradient(90deg,rgba(255,180,220,0.2),rgba(196,77,255,0.08))",
        border: "1px solid rgba(255,110,180,0.18)",
      }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 12 }}>👣</span>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.33rem", color: "#9060b0" }}>TODAY</span>
        </div>
        <div className="flex items-center gap-0.5">
          {["0","1","2","8"].map((d,i) => (
            <div key={i} className="w-4 h-5 rounded flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#ff2d78,#c44dff)" }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "white" }}>{d}</span>
            </div>
          ))}
        </div>
        <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#b080d0" }}>전체 <b style={{ color: "#ff2d78" }}>1,247</b></span>
      </div>
    </div>
  );
}

function RightPage({ activeTab }: { activeTab: string }) {
  if (activeTab === "profile") return <ProfileAvatarPage />;
  if (activeTab === "photo") return <PhotoPage />;
  if (activeTab === "guest") return <GuestbookPage />;
  if (activeTab === "emoticon") return <EmoticonRoomPage />;
  if (activeTab === "diary") return <DiaryPage />;
  if (activeTab === "home") return <HomeRightPage />;
  if (activeTab === "miniroom") return <MiniRoomPage />;
  return null;
}

/* ═══════════════════════════════════════════
   SPREAD PAGE
═══════════════════════════════════════════ */
function SpreadPage({ user, onClose, onLogout, onUserUpdate }: { user: User; onClose: () => void; onLogout?: () => void; onUserUpdate: (user: User) => void }) {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="size-full flex items-center justify-center overflow-hidden" style={{
      background: "linear-gradient(135deg, #fce4f8 0%, #f0d0ff 40%, #ffd4f0 100%)",
    }}>
      {/* ambient */}
      <div className="absolute pointer-events-none" style={{
        width: 600, height: 400, top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(ellipse, rgba(255,80,180,0.12) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />

      {/* book spread */}
      <motion.div
        className="relative flex"
        style={{
          height: "min(580px, 88vh)",
          boxShadow: "0 20px 80px rgba(180,0,120,0.2), 0 4px 20px rgba(180,50,255,0.15)",
        }}
        initial={{ scaleX: 0.3, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* LEFT PAGE */}
        <div style={{
          width: "min(400px, calc(50vw - 30px))",
          borderRadius: "8px 0 0 8px",
          overflow: "hidden",
          boxShadow: "inset -4px 0 12px rgba(0,0,0,0.06)",
        }}>
          <LeftPage user={user} onUserUpdate={onUserUpdate} />
        </div>

        {/* SPINE */}
        <div style={{
          width: 12,
          background: "linear-gradient(to right, #e8b0d8, #d090c0, #e8b0d8)",
          boxShadow: "2px 0 8px rgba(0,0,0,0.08), -2px 0 8px rgba(0,0,0,0.08)",
          flexShrink: 0,
        }}>
          {/* spine dots */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="mx-auto mt-3 w-1.5 h-1.5 rounded-full" style={{
              background: i % 3 === 0 ? "#ff80c8" : "rgba(255,255,255,0.4)",
            }} />
          ))}
        </div>

        {/* RIGHT PAGE */}
        <div style={{
          width: "min(400px, calc(50vw - 30px))",
          overflow: "hidden",
          boxShadow: "inset 4px 0 12px rgba(0,0,0,0.04)",
        }}>
          <RightPage activeTab={activeTab} />
        </div>

        {/* BOOKMARK TABS on far right */}
        <div className="flex flex-col" style={{ flexShrink: 0 }}>
          {TABS.map((tab, i) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center justify-center"
              style={{
                width: 28,
                height: "calc(min(580px, 88vh) / 7)",
                borderRadius: i === 0 ? "0 8px 0 0" : i === TABS.length - 1 ? "0 0 8px 0" : "0",
                background: activeTab === tab.id
                  ? `linear-gradient(90deg, ${tab.color}, ${tab.color}dd)`
                  : `linear-gradient(90deg, ${tab.color}88, ${tab.color}66)`,
                borderLeft: `2px solid ${tab.color}`,
                borderTop: i === 0 ? `1px solid ${tab.color}` : "none",
                borderBottom: i === TABS.length - 1 ? `1px solid ${tab.color}` : `1px solid ${tab.color}44`,
                borderRight: `1px solid ${tab.color}`,
                boxShadow: activeTab === tab.id
                  ? `2px 0 8px ${tab.color}66`
                  : "none",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              whileHover={{ x: 2 }}
            >
              {/* active indicator */}
              {activeTab === tab.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r" style={{ background: "rgba(255,255,255,0.6)" }} />
              )}
              <span style={{
                writingMode: "vertical-rl",
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "0.48rem",
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? "#fff" : "rgba(80,30,60,0.75)",
                letterSpacing: "0.05em",
                userSelect: "none",
              }}>
                {tab.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* back button */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <motion.button
          className="px-3 py-1.5 rounded-full text-white text-xs font-semibold"
          style={{
            fontFamily: "'Quicksand', sans-serif",
            background: "linear-gradient(135deg, #ff2d78, #c44dff)",
            boxShadow: "0 2px 10px rgba(255,45,120,0.35)",
            fontSize: "0.65rem",
          }}
          onClick={onClose}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          ← 표지로
        </motion.button>
        {onLogout && (
          <motion.button
            className="px-3 py-1.5 rounded-full"
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "0.58rem",
              fontWeight: 600,
              color: "#9060b0",
              background: "rgba(255,255,255,0.85)",
              border: "1px solid rgba(196,77,255,0.2)",
            }}
            onClick={onLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            로그아웃
          </motion.button>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   ROOT
═══════════════════════════════════════════ */
type AppPage = "auth" | "cover" | "spread";

export default function App() {
  const [user, setUser] = useState<User | null>(() => getSession());
  const [page, setPage] = useState<AppPage>(() => (getSession() ? "cover" : "auth"));

  const handleAuthSuccess = (loggedIn: User) => {
    setUser(loggedIn);
    setPage("cover");
  };

  const handleLogout = () => {
    signOut();
    setUser(null);
    setPage("auth");
  };

  return (
    <div className="size-full">
      <AnimatePresence mode="wait">
        {page === "auth" && (
          <motion.div key="auth" className="size-full" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <AuthPage onSuccess={handleAuthSuccess} />
          </motion.div>
        )}
        {page === "cover" && (
          <motion.div key="cover" className="size-full" exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}>
            <CoverPage onOpen={() => setPage("spread")} nickname={user?.nickname} />
          </motion.div>
        )}
        {page === "spread" && user && (
          <motion.div key="spread" className="size-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <SpreadPage
              user={user}
              onClose={() => setPage("cover")}
              onLogout={handleLogout}
              onUserUpdate={setUser}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
