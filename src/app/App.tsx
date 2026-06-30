import { type DragEvent, type ReactNode, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  AVATAR_ITEMS,
  BOARD_POSTS,
  GUESTBOOK_COLORS,
  INIT_ENTRIES,
  INIT_FIELDS,
  INITIAL_ENTRIES,
  NEIGHBORS,
  PALETTE,
  PHOTO_BOOTH_GRADIENTS,
  PIXEL_COLS,
  PIXEL_ROWS,
  SAMPLE_EMOTICONS,
  STICKER_OPTIONS,
  TABS,
  WEATHER_OPTIONS,
  type Neighbor,
  type ProfileField,
  type Privacy,
  type VisitMode,
} from "./data";
import { useSharedPhotos } from "./hooks/useSharedPhotos";
import { formatDiaryDisplayDate, formatDottedDate, formatIsoDate } from "./utils/date";

/* ═══════════════════════════════════════════
   SHARED ATOMS
═══════════════════════════════════════════ */

const PixelHeart = ({ size = 14, color = "#b08a4a" }: { size?: number; color?: string }) => (
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
    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 20%, rgba(180,160,108,0.4) 35%, rgba(216,196,155,0.5) 50%, rgba(100,200,255,0.4) 65%, rgba(255,255,255,0.5) 80%, transparent 100%)",
    filter: "blur(2px)",
  }} />
);

const Corner = ({ flip }: { flip?: boolean }) => (
  <svg width="90" height="90" viewBox="0 0 90 90" fill="none" style={{ transform: flip ? "scale(-1,1)" : undefined }}>
    <path d="M8 8 L8 40 Q8 50 18 50" stroke="#b08a4a" strokeWidth="2" fill="none" opacity="0.7" />
    <path d="M8 8 L40 8 Q50 8 50 18" stroke="#8b9a72" strokeWidth="2" fill="none" opacity="0.7" />
    <circle cx="8" cy="8" r="4" fill="#d8c49b" />
    <circle cx="50" cy="18" r="3" fill="#b08a4a" opacity="0.8" />
    <circle cx="18" cy="50" r="3" fill="#8b9a72" opacity="0.8" />
    <path d="M20 20 Q30 14 40 20 Q30 26 20 20Z" fill="#d8c49b" opacity="0.5" />
    <path d="M20 20 Q14 30 20 40 Q26 30 20 20Z" fill="#8b9a72" opacity="0.4" />
    <circle cx="29" cy="29" r="4" fill="white" opacity="0.4" />
  </svg>
);

const ChromeBadge = ({ children }: { children: ReactNode }) => (
  <div className="px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase" style={{
    fontFamily: "'Quicksand', sans-serif",
    background: "linear-gradient(135deg, #fff 0%, #f3e7c6 30%, #d8c49b 60%, #fff 100%)",
    boxShadow: "0 2px 8px rgba(176,138,74,0.3), inset 0 1px 0 rgba(255,255,255,0.9)",
    color: "#c0006a", border: "1px solid rgba(255,255,255,0.8)",
  }}>{children}</div>
);

function CoverPage({ onOpen }: { onOpen: () => void }) {
  const stars = [
    { x: "7%", y: "9%", size: 22, delay: 0, color: "#b08a4a" },
    { x: "83%", y: "6%", size: 18, delay: 0.5, color: "#8b9a72" },
    { x: "90%", y: "70%", size: 24, delay: 1.1, color: "#d8c49b" },
    { x: "4%", y: "75%", size: 20, delay: 0.3, color: "#b08a4a" },
    { x: "48%", y: "3%", size: 14, delay: 0.8, color: "#c9b27f" },
    { x: "15%", y: "48%", size: 12, delay: 1.6, color: "#d8c49b" },
    { x: "75%", y: "45%", size: 12, delay: 2.0, color: "#8b9a72" },
    { x: "35%", y: "87%", size: 16, delay: 0.6, color: "#b08a4a" },
    { x: "62%", y: "84%", size: 14, delay: 1.4, color: "#8b9a72" },
    { x: "68%", y: "18%", size: 18, delay: 0.9, color: "#d8c49b" },
    { x: "25%", y: "15%", size: 13, delay: 2.2, color: "#b08a4a" },
  ];

  return (
    <div className="size-full flex items-center justify-center" style={{
      background: "linear-gradient(135deg, #fbf8ef 0%, #f6efd8 40%, #f8f1df 70%, #fffaf0 100%)",
    }}>
      <div className="absolute rounded-full pointer-events-none" style={{
        width: 500, height: 500,
        background: "radial-gradient(circle, rgba(216,196,155,0.18) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />
      <motion.div
        className="relative overflow-hidden cursor-pointer"
        style={{
          width: "min(460px, 92vw)", height: "min(640px, 88vh)",
          borderRadius: "4px 16px 16px 4px",
          boxShadow: "6px 10px 50px rgba(130,92,46,0.28), 2px 4px 16px rgba(129,142,102,0.2), 0 0 0 1px rgba(255,255,255,0.6)",
          background: "linear-gradient(148deg, #fff8e8 0%, #f3e3bd 20%, #ead3a1 40%, #e6dcc2 65%, #f5e7c7 85%, #fff8e8 100%)",
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
          backgroundImage: "radial-gradient(circle, #b08a4a 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }} />
        <div className="absolute inset-3 rounded-xl pointer-events-none" style={{
          border: "1.5px solid rgba(255,255,255,0.7)",
          boxShadow: "0 0 0 1px rgba(176,138,74,0.15) inset",
        }} />
        <div className="absolute inset-5 rounded-lg pointer-events-none" style={{
          border: "1px dashed rgba(139,154,114,0.35)",
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
                <PixelHeart size={i === 1 ? 20 : 14} color={i === 1 ? "#b08a4a" : "#8b9a72"} />
              </motion.div>
            ))}
          </motion.div>
          <motion.div className="text-center" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.75, duration: 1, ease: [0.22, 1, 0.36, 1] }}>
            <h1 style={{
              fontFamily: "'Great Vibes', cursive",
              fontSize: "clamp(3.2rem, 11vw, 5rem)",
              lineHeight: 1,
              background: "linear-gradient(135deg, #8a6334 0%, #b08a4a 30%, #8b9a72 60%, #b08a4a 80%, #8a6334 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              filter: "drop-shadow(0 2px 8px rgba(176,138,74,0.35))",
            }}>Re:world</h1>
            <motion.div className="mx-auto mt-1 h-0.5 rounded-full" style={{
              background: "linear-gradient(90deg, transparent, #d8c49b, #fff, #8b9a72, #d8c49b, transparent)",
              boxShadow: "0 0 6px rgba(216,196,155,0.6)",
            }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.2, duration: 0.9 }} />
          </motion.div>
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.42rem", color: "#8b9a72", letterSpacing: "0.08em", textAlign: "center", lineHeight: 2, opacity: 0.8 }}>
            thoughts · memories · dreams
          </p>
          <div className="flex items-center gap-2 w-full px-4">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(176,138,74,0.4))" }} />
            <span style={{ color: "#b08a4a", fontSize: 14 }}>✦</span>
            <span style={{ color: "#8b9a72", fontSize: 10 }}>★</span>
            <span style={{ color: "#d8c49b", fontSize: 14 }}>✦</span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(139,154,114,0.4))" }} />
          </div>
          <motion.div className="relative px-6 py-1.5 rounded-full overflow-hidden" style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,234,198,0.9) 50%, rgba(255,255,255,0.8) 100%)",
            boxShadow: "0 3px 12px rgba(176,138,74,0.25), inset 0 1px 0 rgba(255,255,255,1)",
            border: "1.5px solid rgba(176,138,74,0.2)",
          }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.6)" }} />
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 600, fontSize: "0.78rem", letterSpacing: "0.25em", color: "#8a6334", position: "relative" }}>2 0 2 6</span>
          </motion.div>
          <motion.div className="flex gap-3 items-center mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
            {[0.1, 0, 0.2, 0, 0.1].map((d, i) => (
              <motion.div key={i} animate={{ y: [0, -5, 0] }} transition={{ duration: 1.2, delay: d + i * 0.07, repeat: Infinity }}>
                <PixelHeart size={i === 2 ? 18 : 12} color={["#8b9a72", "#d8c49b", "#b08a4a", "#d8c49b", "#8b9a72"][i]} />
              </motion.div>
            ))}
          </motion.div>
          {/* open hint */}
          <motion.p
            className="mt-2 text-center"
            style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.65rem", color: "#8b9a72", letterSpacing: "0.1em" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            클릭해서 열기 ▶
          </motion.p>
        </div>
        <div className="absolute inset-x-0 top-0 h-1/3 pointer-events-none rounded-t-2xl" style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)",
        }} />
        <motion.div className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%)",
        }} initial={{ x: "-100%" }} animate={{ x: "200%" }} transition={{ duration: 2.2, delay: 1.6, ease: "easeInOut" }} />
        <div className="absolute left-0 top-0 bottom-0 w-4 pointer-events-none" style={{
          background: "linear-gradient(to right, rgba(130,92,46,0.12), transparent)",
        }} />
      </motion.div>
      <div className="absolute" style={{
        width: 14, height: "min(640px, 88vh)",
        left: "calc(50% - min(230px, 46vw) - 9px)",
        borderRadius: "4px 0 0 4px",
        background: "linear-gradient(to right, #c7aa70, #ead3a1)",
        boxShadow: "-3px 0 10px rgba(130,92,46,0.2)",
      }} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   PIXEL AVATAR SVG
═══════════════════════════════════════════ */
type AvatarPixelMap = Record<string, string>;

type AvatarConfig = {
  body: string;
  pixels: AvatarPixelMap;
};

type AvatarProfile = {
  config: AvatarConfig;
  equipped: string[];
};

type AvatarRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  part: keyof AvatarConfig | "fixed";
  opacity?: number;
};

const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  body: "#ffd0ad",
  pixels: {},
};

const DEFAULT_AVATAR_PROFILE: AvatarProfile = {
  config: DEFAULT_AVATAR_CONFIG,
  equipped: [],
};

type DiaryProfile = {
  title: string;
  status: string;
  tags: string[];
  fields: ProfileField[];
  bgmTitle: string;
};

const DEFAULT_DIARY_PROFILE: DiaryProfile = {
  title: "Re:world",
  status: "일상 기록중 🌸",
  tags: ["#daily", "#y2k", "#diary"],
  fields: INIT_FIELDS,
  bgmTitle: "Lovefool - The Cardigans",
};

const AVATAR_ITEM_CATEGORIES = ["전체", "얼굴", "의상", "악세사리", "기타"] as const;
type AvatarItemCategory = typeof AVATAR_ITEM_CATEGORIES[number];

const getPixelKey = (x: number, y: number) => x + "-" + y;

function getAvatarRects(config: AvatarConfig): AvatarRect[] {
  const skin = config.body ?? "#ffd0ad";
  const eye = "#5b3322";
  const blush = "#e58aa8";
  const mouth = skin;
  const lip = "#f08aa8";
  const shirt = skin;
  const shirtShade = skin;
  const shirtMark = skin;
  const shorts = skin;
  const shoe = skin;
  const shoeLight = skin;

  return [
    { x: 12, y: 3, width: 8, height: 1, fill: skin, part: "body" },
    { x: 10, y: 4, width: 12, height: 2, fill: skin, part: "body" },
    { x: 9, y: 6, width: 14, height: 9, fill: skin, part: "body" },
    { x: 10, y: 15, width: 12, height: 2, fill: skin, part: "body" },
    { x: 12, y: 17, width: 8, height: 1, fill: skin, part: "body" },
    { x: 8, y: 10, width: 2, height: 5, fill: skin, part: "body" },
    { x: 22, y: 10, width: 2, height: 5, fill: skin, part: "body" },
    { x: 14, y: 18, width: 4, height: 2, fill: skin, part: "body" },
    { x: 10, y: 20, width: 12, height: 1, fill: skin, part: "body" },
    { x: 9, y: 21, width: 1, height: 2, fill: skin, part: "body" },
    { x: 8, y: 22, width: 2, height: 1, fill: skin, part: "body" },
    { x: 22, y: 21, width: 1, height: 2, fill: skin, part: "body" },
    { x: 22, y: 22, width: 2, height: 1, fill: skin, part: "body" },
    { x: 10, y: 21, width: 12, height: 2, fill: shirt, part: "body" },
    { x: 10, y: 21, width: 12, height: 8, fill: shirt, part: "body" },
    { x: 10, y: 30, width: 12, height: 1, fill: shirtShade, part: "body" },
    { x: 14, y: 22, width: 4, height: 3, fill: shirtMark, part: "body" },
    { x: 13, y: 25, width: 2, height: 2, fill: shirtMark, part: "body" },
    { x: 17, y: 25, width: 2, height: 2, fill: shirtMark, part: "body" },
    { x: 15, y: 27, width: 2, height: 2, fill: shirtMark, part: "body" },
    { x: 15, y: 22, width: 2, height: 8, fill: skin, part: "body" },
    { x: 10, y: 29, width: 5, height: 1, fill: skin, part: "body" },
    { x: 15, y: 29, width: 2, height: 1, fill: skin, part: "body" },
    { x: 17, y: 29, width: 5, height: 1, fill: skin, part: "body" },
    { x: 7, y: 23, width: 3, height: 10, fill: skin, part: "body" },
    { x: 22, y: 23, width: 3, height: 10, fill: skin, part: "body" },
    { x: 6, y: 33, width: 4, height: 2, fill: skin, part: "body" },
    { x: 22, y: 33, width: 4, height: 2, fill: skin, part: "body" },
    { x: 10, y: 31, width: 6, height: 8, fill: skin, part: "body" },
    { x: 16, y: 31, width: 1, height: 5, fill: skin, part: "body" },
    { x: 17, y: 31, width: 6, height: 8, fill: skin, part: "body" },
    { x: 10, y: 39, width: 6, height: 6, fill: skin, part: "body" },
    { x: 17, y: 39, width: 6, height: 6, fill: skin, part: "body" },
    { x: 10, y: 45, width: 6, height: 3, fill: shoe, part: "body" },
    { x: 8, y: 46, width: 2, height: 2, fill: shoe, part: "body" },
    { x: 11, y: 47, width: 3, height: 1, fill: shoeLight, part: "body" },
    { x: 17, y: 45, width: 6, height: 3, fill: shoe, part: "body" },
    { x: 23, y: 46, width: 2, height: 2, fill: shoe, part: "body" },
    { x: 19, y: 47, width: 3, height: 1, fill: shoeLight, part: "body" },
    { x: 12, y: 9, width: 2, height: 3, fill: eye, part: "body" },
    { x: 18, y: 9, width: 2, height: 3, fill: eye, part: "body" },
    { x: 13, y: 9, width: 1, height: 1, fill: "#fff7e8", part: "body" },
    { x: 19, y: 9, width: 1, height: 1, fill: "#fff7e8", part: "body" },
    { x: 10, y: 13, width: 3, height: 2, fill: blush, part: "body", opacity: 0.82 },
    { x: 20, y: 13, width: 3, height: 2, fill: blush, part: "body", opacity: 0.82 },
    { x: 14, y: 14, width: 4, height: 4, fill: mouth, part: "body" },
    { x: 15, y: 15, width: 2, height: 1, fill: lip, part: "body" },
  ];
}

function PixelAvatar({
  avatar = DEFAULT_AVATAR_PROFILE,
  width = 84,
  height = 102,
}: {
  avatar?: AvatarProfile;
  width?: number;
  height?: number;
}) {
  const { config, equipped } = avatar;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${PIXEL_COLS} ${PIXEL_ROWS}`} style={{ imageRendering: "pixelated" }}>
      {getAvatarRects(config).map(({ part, ...rect }, i) => (
        <rect key={String(part) + "-" + i} {...rect} />
      ))}
      {Object.entries(config.pixels ?? {}).map(([key, fill]) => {
        const [x, y] = key.split("-").map(Number);
        if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
        return <rect key={"paint-" + key} x={x} y={y} width="1" height="1" fill={fill} />;
      })}
      {equipped.includes("face-blush") && (
        <>
          <rect x="8" y="11" width="4" height="2" fill="#d99a86" opacity="0.75" />
          <rect x="20" y="11" width="4" height="2" fill="#d99a86" opacity="0.75" />
        </>
      )}
      {equipped.includes("face-glasses") && (
        <>
          <rect x="11" y="7" width="5" height="1" fill="#5b4b2d" />
          <rect x="11" y="8" width="1" height="4" fill="#5b4b2d" />
          <rect x="15" y="8" width="1" height="4" fill="#5b4b2d" />
          <rect x="17" y="7" width="5" height="1" fill="#5b4b2d" />
          <rect x="17" y="8" width="1" height="4" fill="#5b4b2d" />
          <rect x="21" y="8" width="1" height="4" fill="#5b4b2d" />
          <rect x="16" y="9" width="1" height="1" fill="#5b4b2d" />
        </>
      )}
      {equipped.includes("face-freckle") && (
        <>
          <rect x="10" y="12" width="1" height="1" fill="#9b6a3c" />
          <rect x="12" y="13" width="1" height="1" fill="#9b6a3c" />
          <rect x="20" y="12" width="1" height="1" fill="#9b6a3c" />
          <rect x="22" y="13" width="1" height="1" fill="#9b6a3c" />
        </>
      )}
      {equipped.includes("face-mask") && (
        <>
          <rect x="12" y="13" width="9" height="3" fill="#f7efd9" />
          <rect x="11" y="14" width="1" height="1" fill="#e4d4a8" />
          <rect x="21" y="14" width="1" height="1" fill="#e4d4a8" />
        </>
      )}
      {equipped.includes("outfit-cardigan") && (
        <>
          <rect x="9" y="22" width="4" height="11" fill="#efe2c5" opacity="0.9" />
          <rect x="19" y="22" width="4" height="11" fill="#efe2c5" opacity="0.9" />
          <rect x="15" y="23" width="2" height="10" fill="#9a7b44" opacity="0.65" />
        </>
      )}
      {equipped.includes("outfit-sage") && <rect x="11" y="24" width="10" height="8" fill="#9aa884" opacity="0.82" />}
      {equipped.includes("outfit-pinktee") && (
        <>
          <rect x="10" y="21" width="12" height="9" fill="#e58aa8" />
          <rect x="8" y="23" width="3" height="4" fill="#e58aa8" />
          <rect x="21" y="23" width="3" height="4" fill="#e58aa8" />
          <rect x="13" y="22" width="6" height="1" fill="#ffd6e3" />
        </>
      )}
      {equipped.includes("outfit-denim") && (
        <>
          <rect x="11" y="25" width="10" height="10" fill="#6f8fb8" />
          <rect x="12" y="22" width="2" height="5" fill="#6f8fb8" />
          <rect x="18" y="22" width="2" height="5" fill="#6f8fb8" />
          <rect x="15" y="30" width="2" height="5" fill="#4d6f9c" />
        </>
      )}
      {equipped.includes("outfit-ribbon") && (
        <>
          <rect x="15" y="20" width="2" height="2" fill="#b08a4a" />
          <rect x="12" y="21" width="3" height="3" fill="#b08a4a" />
          <rect x="17" y="21" width="3" height="3" fill="#b08a4a" />
        </>
      )}
      {equipped.includes("other-headband") && (
        <>
          <rect x="10" y="4" width="12" height="1" fill="#d8a878" />
          <rect x="9" y="5" width="2" height="1" fill="#d8a878" />
          <rect x="21" y="5" width="2" height="1" fill="#d8a878" />
        </>
      )}
      {equipped.includes("other-scarf") && (
        <>
          <rect x="12" y="19" width="8" height="2" fill="#8b9a72" />
          <rect x="18" y="21" width="2" height="5" fill="#8b9a72" />
          <rect x="19" y="25" width="1" height="2" fill="#6d7653" />
        </>
      )}
      {equipped.includes("other-crown") && (
        <>
          <rect x="10" y="0" width="12" height="2" fill="#d4b45f" />
          <rect x="11" y="-1" width="2" height="2" fill="#d4b45f" />
          <rect x="15" y="-2" width="2" height="3" fill="#d4b45f" />
          <rect x="20" y="-1" width="2" height="2" fill="#d4b45f" />
        </>
      )}
      {equipped.includes("other-flower") && (
        <>
          <rect x="22" y="5" width="1" height="1" fill="#d8c49b" />
          <rect x="23" y="4" width="1" height="1" fill="#d8c49b" />
          <rect x="24" y="5" width="1" height="1" fill="#d8c49b" />
          <rect x="23" y="6" width="1" height="1" fill="#d8c49b" />
          <rect x="23" y="5" width="1" height="1" fill="#b08a4a" />
        </>
      )}
      {equipped.includes("other-bag") && (
        <>
          <rect x="24" y="33" width="5" height="6" fill="#c9a878" />
          <rect x="25" y="32" width="3" height="1" fill="#8a6334" />
        </>
      )}
      {equipped.includes("other-sneakers") && (
        <>
          <rect x="9" y="45" width="7" height="3" fill="#f7efd9" />
          <rect x="8" y="46" width="2" height="2" fill="#f7efd9" />
          <rect x="10" y="47" width="5" height="1" fill="#9aa3ad" />
          <rect x="17" y="45" width="7" height="3" fill="#f7efd9" />
          <rect x="23" y="46" width="2" height="2" fill="#f7efd9" />
          <rect x="18" y="47" width="5" height="1" fill="#9aa3ad" />
        </>
      )}
      {equipped.includes("emote-heart") && <PixelHeart size={4} color="#d8a878" />}
      {equipped.includes("emote-sparkle") && <path d="M27 5 L28 7 L30 8 L28 9 L27 11 L26 9 L24 8 L26 7Z" fill="#e4d4a8" />}
      {equipped.includes("emote-note") && (
        <>
          <rect x="27" y="12" width="1" height="5" fill="#8b9a72" />
          <rect x="28" y="12" width="3" height="1" fill="#8b9a72" />
          <rect x="26" y="17" width="2" height="2" fill="#8b9a72" />
        </>
      )}
    </svg>
  );
}

const BGM_DURATION_SECONDS = 198;

function formatTrackTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function BgmProgressBar({ isPlaying, compact = false }: { isPlaying: boolean; compact?: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const progress = Math.min(100, (elapsed / BGM_DURATION_SECONDS) * 100);

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      setElapsed(prev => (prev >= BGM_DURATION_SECONDS ? 0 : prev + 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  return (
    <div className={compact ? "mt-0.5" : "mt-1.5"}>
      <div className="flex items-center justify-between mb-0.5">
        <span style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: compact ? "0.28rem" : "0.32rem",
          color: "#8b9a72",
        }}>{formatTrackTime(elapsed)}</span>
        <span style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: compact ? "0.28rem" : "0.32rem",
          color: "rgba(138,99,52,0.72)",
        }}>{formatTrackTime(BGM_DURATION_SECONDS)}</span>
      </div>
      <div
        className="rounded-full overflow-hidden"
        role="progressbar"
        aria-label="BGM 재생 진행률"
        aria-valuemin={0}
        aria-valuemax={BGM_DURATION_SECONDS}
        aria-valuenow={elapsed}
        style={{
          height: compact ? 4 : 6,
          background: "rgba(139,154,114,0.16)",
          boxShadow: "inset 0 1px 2px rgba(90,70,35,0.14)",
        }}
      >
        <motion.div
          className="h-full rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.22, ease: "linear" }}
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg,#b08a4a,#8b9a72)",
            boxShadow: "0 0 6px rgba(176,138,74,0.45)",
          }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MINI ROOM SVG
═══════════════════════════════════════════ */
function MiniRoom() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 220 160" style={{ imageRendering: "pixelated" }}>
      {/* floor */}
      <rect x="0" y="100" width="220" height="60" fill="#e8d4f8" />
      {/* floor pattern */}
      {[0,1,2,3,4,5].map(i => [0,1,2].map(j => (
        <rect key={`f${i}${j}`} x={i*40} y={100+j*20} width="40" height="20"
          fill={((i+j)%2===0)?"#e0c8f0":"#d4b8e8"} />
      )))}
      {/* back wall */}
      <rect x="0" y="0" width="220" height="102" fill="#f5f0df" />
      {/* wall stripes */}
      {[0,1,2,3,4].map(i => (
        <rect key={`w${i}`} x={i*44} y="0" width="22" height="102" fill="#f7efd9" opacity="0.5" />
      ))}
      {/* window */}
      <rect x="140" y="12" width="60" height="50" fill="#c8eeff" />
      <rect x="140" y="12" width="60" height="50" fill="none" stroke="#a0b8d8" strokeWidth="2" />
      <rect x="168" y="12" width="2" height="50" fill="#a0b8d8" />
      <rect x="140" y="35" width="60" height="2" fill="#a0b8d8" />
      {/* curtains */}
      <rect x="138" y="10" width="14" height="55" fill="#e8d7b5" opacity="0.7" />
      <rect x="188" y="10" width="14" height="55" fill="#e8d7b5" opacity="0.7" />
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
      <rect x="38" y="94" width="24" height="16" fill="#d8c49b" />
      <rect x="38" y="88" width="24" height="8" fill="#c7aa70" />
      <rect x="36" y="106" width="5" height="8" fill="#b8945c" />
      <rect x="59" y="106" width="5" height="8" fill="#b8945c" />
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
      <rect x="106" y="8" width="2" height="5" fill="#c9a878" />
      <rect x="100" y="20" width="14" height="2" fill="#c9a878" />
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
      <rect x="50" y="112" width="100" height="40" fill="#dfc383" opacity="0.5" />
      <rect x="54" y="116" width="92" height="32" fill="none" stroke="#c29a57" strokeWidth="2" />
      <rect x="58" y="120" width="84" height="24" fill="none" stroke="#d8c49b" strokeWidth="1" />
    </svg>
  );
}

function LeftPage({
  profile,
  avatar,
  onSaveProfile,
}: {
  profile: DiaryProfile;
  avatar: AvatarProfile;
  onSaveProfile: (profile: DiaryProfile) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DiaryProfile>(profile);
  const [tagDraft, setTagDraft] = useState(profile.tags.join(", "));

  const startEdit = () => {
    setDraft(profile);
    setTagDraft(profile.tags.join(", "));
    setEditing(true);
  };
  const saveEdit = () => {
    onSaveProfile({
      ...draft,
      tags: tagDraft.split(",").map(tag => tag.trim()).filter(Boolean),
    });
    setEditing(false);
  };
  const cancelEdit = () => {
    setDraft(profile);
    setTagDraft(profile.tags.join(", "));
    setEditing(false);
  };
  const visibleProfile = editing ? draft : profile;

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{
      background: "linear-gradient(160deg, #fffaf0 0%, #f5f0df 100%)",
    }}>
      {/* page title */}
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(139,154,114,0.2)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "#8b9a72" }}>★</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.7rem", color: "#8b9a72", letterSpacing: "0.12em" }}>MY PROFILE</span>
        </div>
        {!editing ? (
          <button onClick={startEdit} className="px-2 py-0.5 rounded-full" style={{
            fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 700,
            background: "linear-gradient(90deg, #8b9a72, #b08a4a)", color: "white",
            boxShadow: "0 1px 6px rgba(139,154,114,0.3)",
          }}>수정하기</button>
        ) : (
          <div className="flex gap-1">
            <button onClick={saveEdit} className="px-2 py-0.5 rounded-full" style={{
              fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 700,
              background: "linear-gradient(90deg, #b08a4a, #8b9a72)", color: "white",
            }}>저장</button>
            <button onClick={cancelEdit} className="px-2 py-0.5 rounded-full" style={{
              fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 600,
              background: "rgba(150,128,84,0.15)", color: "#9060b0",
            }}>취소</button>
          </div>
        )}
      </div>

      {/* avatar + name card */}
      <div className="rounded-xl p-2.5 flex gap-3 items-start flex-shrink-0" style={{
        background: "linear-gradient(135deg, rgba(244,226,186,0.35) 0%, rgba(139,154,114,0.12) 100%)",
        border: "1px solid rgba(206,178,116,0.25)",
      }}>
        <div className="relative flex-shrink-0">
          <div className="rounded-lg overflow-hidden flex items-center justify-center" style={{
            width: 72, height: 80,
            background: "linear-gradient(135deg, #fff4dc 0%, #eee4cf 100%)",
            border: "2px solid rgba(176,138,74,0.3)",
            boxShadow: "0 2px 8px rgba(176,138,74,0.15)",
          }}>
            <PixelAvatar avatar={avatar} width={72} height={90} />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: "#4cda64" }} />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          {editing ? (
            <>
              <input
                value={draft.title}
                onChange={e => setDraft(prev => ({ ...prev, title: e.target.value }))}
                className="px-2 py-0.5 rounded-lg outline-none"
                style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.65rem", fontWeight: 700, color: "#6a4f2b", background: "rgba(255,255,255,0.78)", border: "1px solid rgba(176,138,74,0.25)" }}
              />
              <input
                value={draft.status}
                onChange={e => setDraft(prev => ({ ...prev, status: e.target.value }))}
                className="px-2 py-0.5 rounded-lg outline-none"
                style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.56rem", color: "#75613f", background: "rgba(255,255,255,0.72)", border: "1px solid rgba(176,138,74,0.2)" }}
              />
              <input
                value={tagDraft}
                onChange={e => setTagDraft(e.target.value)}
                placeholder="#daily, #diary"
                className="px-2 py-0.5 rounded-lg outline-none"
                style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", color: "#75613f", background: "rgba(255,255,255,0.72)", border: "1px solid rgba(176,138,74,0.2)" }}
              />
            </>
          ) : (
            <>
              <p style={{ fontFamily: "'Great Vibes', cursive", fontSize: "1.3rem", color: "#8a6334", lineHeight: 1.1 }}>{visibleProfile.title}</p>
              <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.6rem", color: "#9060b0", fontWeight: 500 }}>{visibleProfile.status}</p>
              <div className="flex gap-1 mt-0.5 flex-wrap">
                {visibleProfile.tags.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 rounded-full" style={{
                    fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 600,
                    background: "rgba(176,138,74,0.1)", color: "#b08a4a",
                    border: "1px solid rgba(176,138,74,0.2)",
                  }}>{tag}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* profile info fields */}
      <div className="rounded-xl p-2.5 flex flex-col gap-1.5 flex-shrink-0" style={{
        background: "rgba(255,255,255,0.7)",
        border: editing ? "1px solid rgba(176,138,74,0.4)" : "1px solid rgba(139,154,114,0.15)",
        transition: "border-color 0.2s",
      }}>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "#8b9a72", marginBottom: 4 }}>PROFILE</p>
        {visibleProfile.fields.map(({ label, value }, idx) => (
          <div key={label} className="flex gap-2 items-center">
            <span className="flex-shrink-0" style={{
              fontFamily: "'Quicksand', sans-serif", fontSize: "0.55rem",
              fontWeight: 700, color: "#8b9a72", width: 32,
            }}>{label}</span>
            {editing ? (
              <input
                value={draft.fields[idx].value}
                onChange={e => setDraft(prev => ({
                  ...prev,
                  fields: prev.fields.map((field, i) => i === idx ? { ...field, value: e.target.value } : field),
                }))}
                className="flex-1 px-1.5 py-0.5 rounded-lg outline-none"
                style={{
                  fontFamily: "'Quicksand', sans-serif", fontSize: "0.55rem", color: "#6040a0",
                  background: "rgba(255,230,250,0.8)", border: "1px solid rgba(176,138,74,0.3)",
                }}
              />
            ) : (
              <span style={{
                fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem",
                color: "#6040a0", borderBottom: "1px dotted rgba(139,154,114,0.25)",
                flex: 1, paddingBottom: 1,
              }}>{value}</span>
            )}
          </div>
        ))}
      </div>

      {/* music player */}
      <div className="rounded-xl p-2.5 flex-shrink-0" style={{
        background: "linear-gradient(135deg, rgba(176,138,74,0.08) 0%, rgba(139,154,114,0.08) 100%)",
        border: "1px solid rgba(216,196,155,0.2)",
      }}>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "#b08a4a", marginBottom: 6 }}>♪ BGM</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsPlaying(!isPlaying)}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #b08a4a, #8b9a72)", boxShadow: "0 2px 8px rgba(176,138,74,0.4)" }}>
            <span style={{ color: "white", fontSize: 10, paddingLeft: isPlaying ? 0 : 2 }}>{isPlaying ? "⏸" : "▶"}</span>
          </button>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={draft.bgmTitle}
                onChange={e => setDraft(prev => ({ ...prev, bgmTitle: e.target.value }))}
                className="w-full px-2 py-0.5 rounded-lg outline-none"
                style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.56rem", fontWeight: 700, color: "#8a6334", background: "rgba(255,255,255,0.75)", border: "1px solid rgba(176,138,74,0.25)" }}
              />
            ) : (
              <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", fontWeight: 700, color: "#8a6334", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {profile.bgmTitle}
              </p>
            )}
          </div>
        </div>
        <BgmProgressBar isPlaying={isPlaying} />
      </div>

      {/* visitor count */}
      <div className="rounded-xl p-2.5 flex items-center justify-between flex-shrink-0" style={{
        background: "linear-gradient(90deg, rgba(244,226,186,0.25) 0%, rgba(139,154,114,0.1) 100%)",
        border: "1px solid rgba(206,178,116,0.2)",
      }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14 }}>👣</span>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "#9060b0" }}>TODAY</span>
        </div>
        <div className="flex items-center gap-1">
          {["0","1","2","8"].map((d, i) => (
            <motion.div key={i} className="w-5 h-6 rounded flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #b08a4a, #8b9a72)", boxShadow: "0 1px 4px rgba(176,138,74,0.3)" }}
              initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.08 }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "white" }}>{d}</span>
            </motion.div>
          ))}
        </div>
        <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", color: "#b080d0" }}>전체 <b style={{ color: "#b08a4a" }}>1,247</b></span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RIGHT PAGE — PHOTO ALBUM
═══════════════════════════════════════════ */
type PhotoSticker = {
  id: number;
  sticker?: string;
  icon?: string;
  color?: string;
  x: number;
  y: number;
};

type PhotoStickerChoice = {
  id: string;
  label: string;
  sticker?: string;
  icon?: string;
  color?: string;
};

const serializePhotoSticker = (item: Pick<PhotoSticker, "sticker" | "icon" | "color"> & { id?: number }) =>
  JSON.stringify({ sticker: item.sticker, icon: item.icon, color: item.color, id: item.id });

function PhotoStickerGraphic({
  sticker,
  icon,
  color,
  size,
}: Pick<PhotoSticker, "sticker" | "icon" | "color"> & { size: number }) {
  if (icon) return <PixelEmoticonIcon icon={icon} color={color ?? "#d8c49b"} size={size} />;
  return <>{sticker}</>;
}

function PhotoStickerChoiceTile({
  choice,
  size,
  tileSize,
  draggable = false,
}: {
  choice: PhotoStickerChoice;
  size: number;
  tileSize: number;
  draggable?: boolean;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={event => {
        if (draggable) {
          event.dataTransfer.setData("application/x-photo-sticker", serializePhotoSticker({
            sticker: choice.sticker,
            icon: choice.icon,
            color: choice.color,
          }));
        }
      }}
      className="rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
      style={{
        width: tileSize,
        height: tileSize,
        background: draggable ? "rgba(255,248,232,0.9)" : "rgba(255,180,0,0.1)",
        border: draggable ? "1px solid rgba(216,196,155,0.45)" : "1px solid rgba(255,160,0,0.2)",
        fontSize: size,
        cursor: draggable ? "grab" : "pointer",
      }}
    >
      <PhotoStickerGraphic sticker={choice.sticker} icon={choice.icon} color={choice.color} size={choice.icon ? size + 6 : size} />
    </div>
  );
}

function AlbumPhoto({ src }: { src: string }) {
  if (src.startsWith("linear-gradient(")) {
    return <div className="w-full h-full" style={{ background: src }} />;
  }

  return <img src={src} alt="" className="w-full h-full object-cover" />;
}

function PhotoStickerLayer({ stickers, compact = false }: { stickers: PhotoSticker[]; compact?: boolean }) {
  return (
    <>
      {stickers.map(item => (
        <span
          key={item.id}
          className="absolute select-none flex items-center justify-center"
          style={{
            left: item.x + "%",
            top: item.y + "%",
            transform: "translate(-50%, -50%)",
            fontSize: compact ? 13 : 24,
            lineHeight: 1,
            filter: "drop-shadow(0 1px 2px rgba(70,45,10,0.35))",
            pointerEvents: compact ? "none" : "auto",
          }}
        >
          <PhotoStickerGraphic sticker={item.sticker} icon={item.icon} color={item.color} size={compact ? 18 : 34} />
        </span>
      ))}
    </>
  );
}

function PhotoPage() {
  const { urls: sharedUrls } = useSharedPhotos();
  const [localPhotos, setLocalPhotos] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [showEmoticonPicker, setShowEmoticonPicker] = useState(false);
  const [photoStickers, setPhotoStickers] = useState<Record<string, PhotoSticker[]>>({});
  const [draftStickers, setDraftStickers] = useState<PhotoSticker[]>([]);
  const [customStickerChoices, setCustomStickerChoices] = useState<PhotoStickerChoice[]>([]);
  const photos = [...localPhotos, ...sharedUrls];
  const selectedSrc = selectedIndex === null ? null : photos[selectedIndex];
  const selectedKey = selectedIndex === null ? "" : selectedIndex + "-" + selectedSrc;
  const stickerChoices: PhotoStickerChoice[] = [
    ...STICKER_OPTIONS.slice(0, 10).map(sticker => ({ id: "emoji-" + sticker, label: sticker, sticker })),
    ...customStickerChoices,
  ];

  const getPhotoKey = (src: string, index: number) => index + "-" + src;
  const openPhoto = (index: number) => {
    const key = getPhotoKey(photos[index], index);
    setSelectedIndex(index);
    setDraftStickers([...(photoStickers[key] ?? [])]);
    setEditing(false);
  };
  const closePhoto = () => {
    setSelectedIndex(null);
    setDraftStickers([]);
    setEditing(false);
  };
  const saveStickers = () => {
    if (!selectedKey) return;
    setPhotoStickers(prev => ({ ...prev, [selectedKey]: draftStickers }));
    setEditing(false);
  };
  const handleStickerDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!editing) return;
    const payload = event.dataTransfer.getData("application/x-photo-sticker");
    if (!payload) return;

    const data = JSON.parse(payload) as { sticker?: string; icon?: string; color?: string; id?: number };
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(94, Math.max(6, ((event.clientX - rect.left) / rect.width) * 100));
    const y = Math.min(94, Math.max(6, ((event.clientY - rect.top) / rect.height) * 100));

    setDraftStickers(prev => {
      if (data.id) return prev.map(item => item.id === data.id ? { ...item, x, y } : item);
      return [...prev, { id: Date.now(), sticker: data.sticker, icon: data.icon, color: data.color, x, y }];
    });
  };

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

  const addEmoticonSticker = (emoticon: typeof SAMPLE_EMOTICONS[number]) => {
    const id = "emoticon-" + emoticon.id;
    setCustomStickerChoices(prev => prev.some(item => item.id === id) ? prev : [
      ...prev,
      { id, label: emoticon.label, icon: emoticon.icon, color: emoticon.color },
    ]);
    setShowEmoticonPicker(false);
  };

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
            background: "linear-gradient(90deg, #c9a878, #c49a64)",
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
              <motion.button
                key={i}
                type="button"
                onClick={() => openPhoto(i)}
                className="relative rounded-lg overflow-hidden aspect-square"
                style={{ border: "1.5px solid rgba(255,160,0,0.25)", padding: 0 }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <AlbumPhoto src={src} />
                <PhotoStickerLayer stickers={photoStickers[getPhotoKey(src, i)] ?? []} compact />
              </motion.button>
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
              <span style={{ fontSize: 18, color: "#c9a878" }}>＋</span>
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
        <div className="flex-1 flex items-center gap-1 overflow-x-auto" style={{ minWidth: 0 }}>
          {stickerChoices.map(choice => (
            <PhotoStickerChoiceTile key={choice.id} choice={choice} size={14} tileSize={28} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowEmoticonPicker(true)}
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg,#c9a878,#b08a4a)",
            border: "1px solid rgba(176,138,74,0.35)",
            color: "white",
            fontSize: 16,
            fontWeight: 800,
          }}
        >
          +
        </button>
      </div>

      <AnimatePresence>
        {showEmoticonPicker && (
          <motion.div
            className="absolute inset-x-3 bottom-14 z-40 rounded-xl p-2"
            style={{
              background: "rgba(255,251,232,0.98)",
              border: "1px solid rgba(201,168,120,0.35)",
              boxShadow: "0 10px 28px rgba(90,60,20,0.2)",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.32rem", color: "#b08a4a" }}>EMOTICON</span>
              <button
                type="button"
                onClick={() => setShowEmoticonPicker(false)}
                className="px-2 py-0.5 rounded-full"
                style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 800, background: "rgba(176,138,74,0.12)", color: "#8a6334" }}
              >
                닫기
              </button>
            </div>
            <div className="grid gap-1.5 overflow-y-auto" style={{ gridTemplateColumns: "repeat(4, 1fr)", maxHeight: 140 }}>
              {SAMPLE_EMOTICONS.map(emoticon => (
                <button
                  key={emoticon.id}
                  type="button"
                  onClick={() => addEmoticonSticker(emoticon)}
                  className="rounded-lg flex flex-col items-center justify-center gap-0.5 py-1.5"
                  style={{
                    background: customStickerChoices.some(item => item.id === "emoticon-" + emoticon.id) ? "rgba(139,154,114,0.16)" : "rgba(255,255,255,0.72)",
                    border: "1px solid rgba(201,168,120,0.22)",
                  }}
                >
                  <PixelEmoticonIcon icon={emoticon.icon} color={emoticon.color} size={26} />
                  <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.38rem", fontWeight: 700, color: "#8a6334" }}>{emoticon.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {selectedSrc && selectedIndex !== null && (
          <motion.div
            className="absolute inset-0 z-50 flex flex-col p-3"
            style={{ background: "rgba(42,33,20,0.92)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.36rem", color: "#f7efd9" }}>PHOTO</span>
              <div className="flex items-center gap-1.5">
                {editing ? (
                  <button onClick={saveStickers} className="px-2.5 py-1 rounded-full text-white"
                    style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 800, background: "linear-gradient(90deg,#b08a4a,#8b9a72)" }}>
                    저장하기
                  </button>
                ) : (
                  <button onClick={() => setEditing(true)} className="px-2.5 py-1 rounded-full"
                    style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 800, background: "rgba(255,255,255,0.16)", color: "#f7efd9" }}>
                    수정하기
                  </button>
                )}
                <button onClick={closePhoto} className="px-2.5 py-1 rounded-full"
                  style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 700, background: "rgba(255,255,255,0.12)", color: "#f7efd9" }}>
                  닫기
                </button>
              </div>
            </div>

            <div
              className="relative flex-1 rounded-xl overflow-hidden"
              onDragOver={event => editing && event.preventDefault()}
              onDrop={handleStickerDrop}
              style={{
                minHeight: 0,
                border: editing ? "2px dashed rgba(216,196,155,0.55)" : "1.5px solid rgba(255,255,255,0.22)",
                background: "#fff8e8",
              }}
            >
              <AlbumPhoto src={selectedSrc} />
              {(editing ? draftStickers : photoStickers[selectedKey] ?? []).map(item => (
                <span
                  key={item.id}
                  draggable={editing}
                  onDragStart={event => {
                    event.dataTransfer.setData("application/x-photo-sticker", serializePhotoSticker(item));
                  }}
                  className="absolute select-none flex items-center justify-center"
                  style={{
                    left: item.x + "%",
                    top: item.y + "%",
                    transform: "translate(-50%, -50%)",
                    fontSize: 26,
                    lineHeight: 1,
                    cursor: editing ? "grab" : "default",
                    filter: "drop-shadow(0 2px 3px rgba(70,45,10,0.4))",
                  }}
                >
                  <PhotoStickerGraphic sticker={item.sticker} icon={item.icon} color={item.color} size={34} />
                </span>
              ))}
            </div>

            {editing && (
              <div className="mt-2 rounded-xl p-2 flex items-center gap-1.5 overflow-x-auto flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(216,196,155,0.22)" }}>
                {stickerChoices.map(choice => (
                  <PhotoStickerChoiceTile key={"edit-" + choice.id} choice={choice} size={18} tileSize={36} draggable />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AvatarPixelCanvas({
  config,
  selectedColor,
  onPaint,
}: {
  config: AvatarConfig;
  selectedColor: string;
  onPaint: (x: number, y: number, color: string) => void;
}) {
  const cells = Array.from({ length: PIXEL_ROWS }, () =>
    Array.from({ length: PIXEL_COLS }, () => ({ fill: "transparent", part: "fixed" as AvatarRect["part"] }))
  );

  getAvatarRects(config).forEach(rect => {
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        if (cells[y]?.[x]) cells[y][x] = { fill: rect.fill, part: rect.part };
      }
    }
  });

  Object.entries(config.pixels ?? {}).forEach(([key, fill]) => {
    const [x, y] = key.split("-").map(Number);
    if (Number.isInteger(x) && Number.isInteger(y) && cells[y]?.[x]?.part === "body") {
      cells[y][x] = { fill, part: "body" };
    }
  });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(" + PIXEL_COLS + ", 1fr)",
        width: "min(260px, 100%)",
        aspectRatio: PIXEL_COLS + " / " + PIXEL_ROWS,
        border: "1px solid rgba(216,196,155,0.45)",
        background: "#f7efd9",
        boxShadow: "0 3px 14px rgba(0,0,0,0.18)",
      }}
    >
      {cells.map((row, r) => row.map((cell, c) => {
        const paintable = cell.part === "body";
        return (
          <button
            key={r + "-" + c}
            type="button"
            onClick={() => {
              if (paintable) onPaint(c, r, selectedColor);
            }}
            style={{
              aspectRatio: "1",
              background: cell.fill === "transparent" ? ((r + c) % 2 === 0 ? "#fff4dc" : "#f2e5c8") : cell.fill,
              border: paintable ? "0.5px solid rgba(110,90,50,0.12)" : "0.5px solid rgba(110,90,50,0.05)",
              cursor: paintable ? "crosshair" : "default",
              padding: 0,
            }}
            aria-label={paintable ? "아바타 픽셀 칠하기" : "고정 픽셀"}
          />
        );
      }))}
    </div>
  );
}

function PixelItemIcon({ id, color }: { id: string; color: string }) {
  return (
    <svg width="30" height="30" viewBox="0 0 20 20" style={{ imageRendering: "pixelated" }}>
      {id === "face-glasses" && (
        <>
          <rect x="3" y="8" width="5" height="1" fill={color} />
          <rect x="3" y="9" width="1" height="3" fill={color} />
          <rect x="7" y="9" width="1" height="3" fill={color} />
          <rect x="12" y="8" width="5" height="1" fill={color} />
          <rect x="12" y="9" width="1" height="3" fill={color} />
          <rect x="16" y="9" width="1" height="3" fill={color} />
          <rect x="8" y="10" width="4" height="1" fill={color} />
        </>
      )}
      {id === "face-blush" && (
        <>
          <rect x="4" y="9" width="4" height="2" fill={color} opacity="0.85" />
          <rect x="12" y="9" width="4" height="2" fill={color} opacity="0.85" />
        </>
      )}
      {id === "face-freckle" && (
        <>
          <rect x="5" y="8" width="1" height="1" fill={color} />
          <rect x="7" y="10" width="1" height="1" fill={color} />
          <rect x="13" y="8" width="1" height="1" fill={color} />
          <rect x="15" y="10" width="1" height="1" fill={color} />
        </>
      )}
      {id === "face-mask" && (
        <>
          <rect x="5" y="8" width="10" height="5" fill={color} />
          <rect x="4" y="9" width="1" height="2" fill="#d8c49b" />
          <rect x="15" y="9" width="1" height="2" fill="#d8c49b" />
          <rect x="7" y="10" width="6" height="1" fill="#e4d4a8" />
        </>
      )}
      {id === "outfit-cardigan" && (
        <>
          <rect x="5" y="5" width="4" height="10" fill={color} />
          <rect x="11" y="5" width="4" height="10" fill={color} />
          <rect x="9" y="6" width="2" height="9" fill="#9a7b44" />
        </>
      )}
      {id === "outfit-sage" && (
        <>
          <rect x="5" y="6" width="10" height="8" fill={color} />
          <rect x="4" y="7" width="2" height="4" fill={color} />
          <rect x="14" y="7" width="2" height="4" fill={color} />
          <rect x="7" y="6" width="6" height="1" fill="#d8e0c8" />
        </>
      )}
      {id === "outfit-ribbon" && (
        <>
          <rect x="9" y="8" width="2" height="2" fill={color} />
          <rect x="5" y="7" width="4" height="4" fill={color} />
          <rect x="11" y="7" width="4" height="4" fill={color} />
        </>
      )}
      {id === "outfit-pinktee" && (
        <>
          <rect x="5" y="6" width="10" height="8" fill={color} />
          <rect x="3" y="7" width="3" height="4" fill={color} />
          <rect x="14" y="7" width="3" height="4" fill={color} />
          <rect x="7" y="6" width="6" height="1" fill="#ffd6e3" />
        </>
      )}
      {id === "outfit-denim" && (
        <>
          <rect x="6" y="8" width="8" height="8" fill={color} />
          <rect x="7" y="5" width="2" height="5" fill={color} />
          <rect x="11" y="5" width="2" height="5" fill={color} />
          <rect x="9" y="12" width="2" height="4" fill="#4d6f9c" />
        </>
      )}
      {id === "emote-heart" && (
        <>
          <rect x="5" y="6" width="3" height="3" fill={color} />
          <rect x="12" y="6" width="3" height="3" fill={color} />
          <rect x="4" y="9" width="12" height="3" fill={color} />
          <rect x="6" y="12" width="8" height="2" fill={color} />
          <rect x="8" y="14" width="4" height="2" fill={color} />
        </>
      )}
      {id === "emote-sparkle" && <path d="M10 3 L12 8 L17 10 L12 12 L10 17 L8 12 L3 10 L8 8Z" fill={color} />}
      {id === "emote-note" && (
        <>
          <rect x="10" y="4" width="2" height="9" fill={color} />
          <rect x="12" y="4" width="5" height="2" fill={color} />
          <rect x="6" y="12" width="4" height="4" fill={color} />
        </>
      )}
      {id === "other-sneakers" && (
        <>
          <rect x="4" y="9" width="5" height="4" fill={color} />
          <rect x="2" y="11" width="2" height="2" fill={color} />
          <rect x="5" y="13" width="4" height="1" fill="#9aa3ad" />
          <rect x="11" y="9" width="5" height="4" fill={color} />
          <rect x="16" y="11" width="2" height="2" fill={color} />
          <rect x="11" y="13" width="4" height="1" fill="#9aa3ad" />
        </>
      )}
      {id === "other-crown" && (
        <>
          <rect x="4" y="11" width="12" height="3" fill={color} />
          <rect x="5" y="7" width="2" height="4" fill={color} />
          <rect x="9" y="5" width="2" height="6" fill={color} />
          <rect x="14" y="7" width="2" height="4" fill={color} />
        </>
      )}
      {id === "other-flower" && (
        <>
          <rect x="9" y="5" width="2" height="2" fill={color} />
          <rect x="6" y="8" width="2" height="2" fill={color} />
          <rect x="12" y="8" width="2" height="2" fill={color} />
          <rect x="9" y="11" width="2" height="2" fill={color} />
          <rect x="9" y="8" width="2" height="2" fill="#b08a4a" />
        </>
      )}
      {id === "other-bag" && (
        <>
          <rect x="6" y="8" width="8" height="8" fill={color} />
          <rect x="8" y="6" width="4" height="2" fill="#8a6334" />
          <rect x="7" y="11" width="6" height="1" fill="#ead3a1" />
        </>
      )}
      {id === "other-headband" && (
        <>
          <rect x="4" y="8" width="12" height="2" fill={color} />
          <rect x="3" y="10" width="2" height="2" fill={color} />
          <rect x="15" y="10" width="2" height="2" fill={color} />
        </>
      )}
      {id === "other-scarf" && (
        <>
          <rect x="5" y="7" width="10" height="3" fill={color} />
          <rect x="12" y="10" width="3" height="6" fill={color} />
          <rect x="13" y="15" width="2" height="2" fill="#6d7653" />
        </>
      )}
    </svg>
  );
}

function PixelEmoticonIcon({
  icon,
  color,
  size = 30,
  glow = false,
}: {
  icon: string;
  color: string;
  size?: number;
  glow?: boolean;
}) {
  const dark = "#5b4b2d";
  const cream = "#fff8e8";
  const face = "#f7d8a8";
  const faceShade = "#e9b98e";
  const pink = "#e58aa8";
  const blue = "#80c8ff";

  const drawFace = (fill = face) => (
    <>
      <rect x="7" y="3" width="10" height="1" fill={dark} />
      <rect x="5" y="4" width="14" height="2" fill={dark} />
      <rect x="4" y="6" width="16" height="12" fill={dark} />
      <rect x="5" y="18" width="14" height="2" fill={dark} />
      <rect x="7" y="20" width="10" height="1" fill={dark} />
      <rect x="7" y="4" width="10" height="1" fill={fill} />
      <rect x="6" y="6" width="12" height="2" fill={fill} />
      <rect x="5" y="8" width="14" height="9" fill={fill} />
      <rect x="6" y="17" width="12" height="1" fill={fill} />
      <rect x="8" y="18" width="8" height="1" fill={fill} />
      <rect x="7" y="7" width="2" height="1" fill={cream} opacity="0.8" />
      <rect x="17" y="13" width="1" height="3" fill={faceShade} opacity="0.65" />
    </>
  );

  let pixels: ReactNode;

  switch (icon) {
    case "cool-face":
      pixels = (
        <>
          {drawFace()}
          <rect x="6" y="9" width="5" height="2" fill={dark} />
          <rect x="13" y="9" width="5" height="2" fill={dark} />
          <rect x="11" y="10" width="2" height="1" fill={dark} />
          <rect x="7" y="9" width="1" height="1" fill={cream} opacity="0.75" />
          <rect x="14" y="9" width="1" height="1" fill={cream} opacity="0.75" />
          <rect x="9" y="15" width="6" height="1" fill={dark} />
          <rect x="15" y="14" width="1" height="1" fill={dark} />
        </>
      );
      break;
    case "teary-face":
      pixels = (
        <>
          {drawFace()}
          <rect x="7" y="8" width="3" height="3" fill={dark} />
          <rect x="14" y="8" width="3" height="3" fill={dark} />
          <rect x="8" y="8" width="1" height="1" fill={cream} />
          <rect x="15" y="8" width="1" height="1" fill={cream} />
          <rect x="6" y="12" width="2" height="3" fill={blue} />
          <rect x="17" y="12" width="2" height="3" fill={blue} />
          <rect x="10" y="15" width="4" height="1" fill={dark} />
          <rect x="9" y="16" width="1" height="1" fill={dark} />
          <rect x="14" y="16" width="1" height="1" fill={dark} />
        </>
      );
      break;
    case "sparkle-face":
      pixels = (
        <>
          {drawFace()}
          <rect x="7" y="7" width="1" height="1" fill={color} />
          <rect x="6" y="8" width="3" height="1" fill={color} />
          <rect x="7" y="9" width="1" height="1" fill={color} />
          <rect x="15" y="7" width="1" height="1" fill={color} />
          <rect x="14" y="8" width="3" height="1" fill={color} />
          <rect x="15" y="9" width="1" height="1" fill={color} />
          <rect x="9" y="14" width="6" height="1" fill={dark} />
          <rect x="10" y="15" width="4" height="1" fill={pink} />
          <rect x="18" y="5" width="1" height="1" fill={color} />
          <rect x="17" y="6" width="3" height="1" fill={color} />
          <rect x="18" y="7" width="1" height="1" fill={color} />
        </>
      );
      break;
    case "angry-face":
      pixels = (
        <>
          {drawFace("#f0b39a")}
          <rect x="6" y="7" width="4" height="1" fill={dark} />
          <rect x="7" y="8" width="2" height="1" fill={dark} />
          <rect x="14" y="7" width="4" height="1" fill={dark} />
          <rect x="15" y="8" width="2" height="1" fill={dark} />
          <rect x="8" y="10" width="2" height="2" fill={dark} />
          <rect x="14" y="10" width="2" height="2" fill={dark} />
          <rect x="9" y="15" width="6" height="1" fill="#7f1d1d" />
          <rect x="5" y="13" width="2" height="1" fill="#d86f86" opacity="0.8" />
          <rect x="17" y="13" width="2" height="1" fill="#d86f86" opacity="0.8" />
        </>
      );
      break;
    case "ribbon-hat":
      pixels = (
        <>
          <rect x="6" y="8" width="12" height="7" fill={dark} />
          <rect x="7" y="5" width="10" height="4" fill={dark} />
          <rect x="8" y="6" width="8" height="3" fill={color} />
          <rect x="7" y="9" width="10" height="4" fill={color} />
          <rect x="4" y="14" width="16" height="2" fill={dark} />
          <rect x="5" y="13" width="14" height="1" fill={color} />
          <rect x="11" y="10" width="2" height="2" fill="#b08a4a" />
          <rect x="8" y="10" width="3" height="3" fill="#d86f86" />
          <rect x="13" y="10" width="3" height="3" fill="#d86f86" />
          <rect x="9" y="6" width="2" height="1" fill={cream} opacity="0.65" />
        </>
      );
      break;
    case "crown-hat":
      pixels = (
        <>
          <rect x="5" y="14" width="14" height="4" fill={dark} />
          <rect x="6" y="11" width="2" height="3" fill={dark} />
          <rect x="11" y="8" width="2" height="6" fill={dark} />
          <rect x="16" y="11" width="2" height="3" fill={dark} />
          <rect x="6" y="14" width="12" height="3" fill={color} />
          <rect x="7" y="11" width="1" height="3" fill={color} />
          <rect x="12" y="9" width="1" height="5" fill={color} />
          <rect x="17" y="11" width="1" height="3" fill={color} />
          <rect x="8" y="15" width="2" height="1" fill="#fff8e8" />
          <rect x="11" y="15" width="2" height="1" fill="#d86f86" />
          <rect x="14" y="15" width="2" height="1" fill="#80c8ff" />
        </>
      );
      break;
    case "cardigan":
      pixels = (
        <>
          <rect x="6" y="5" width="12" height="15" fill={dark} />
          <rect x="7" y="6" width="10" height="13" fill={color} />
          <rect x="10" y="6" width="4" height="13" fill={cream} />
          <rect x="11" y="6" width="2" height="3" fill="#f7d8a8" />
          <rect x="7" y="9" width="3" height="10" fill="#ead8b5" />
          <rect x="14" y="9" width="3" height="10" fill="#ead8b5" />
          <rect x="12" y="10" width="1" height="8" fill="#b08a4a" opacity="0.7" />
          <rect x="8" y="13" width="1" height="1" fill="#b08a4a" />
          <rect x="15" y="13" width="1" height="1" fill="#b08a4a" />
        </>
      );
      break;
    case "sailor-outfit":
      pixels = (
        <>
          <rect x="5" y="6" width="14" height="14" fill={dark} />
          <rect x="6" y="7" width="12" height="12" fill={cream} />
          <rect x="6" y="7" width="12" height="4" fill={color} />
          <rect x="8" y="11" width="3" height="5" fill={color} />
          <rect x="13" y="11" width="3" height="5" fill={color} />
          <rect x="11" y="11" width="2" height="7" fill="#d86f86" />
          <rect x="8" y="8" width="8" height="1" fill={cream} />
          <rect x="9" y="19" width="6" height="1" fill={color} />
        </>
      );
      break;
    case "pixel-glasses":
      pixels = (
        <>
          <rect x="4" y="9" width="7" height="1" fill={dark} />
          <rect x="4" y="10" width="1" height="4" fill={dark} />
          <rect x="10" y="10" width="1" height="4" fill={dark} />
          <rect x="5" y="13" width="5" height="1" fill={dark} />
          <rect x="13" y="9" width="7" height="1" fill={dark} />
          <rect x="13" y="10" width="1" height="4" fill={dark} />
          <rect x="19" y="10" width="1" height="4" fill={dark} />
          <rect x="14" y="13" width="5" height="1" fill={dark} />
          <rect x="11" y="11" width="2" height="1" fill={dark} />
          <rect x="6" y="10" width="2" height="1" fill={cream} opacity="0.8" />
          <rect x="15" y="10" width="2" height="1" fill={cream} opacity="0.8" />
        </>
      );
      break;
    case "mini-bag":
      pixels = (
        <>
          <rect x="6" y="9" width="12" height="11" fill={dark} />
          <rect x="7" y="10" width="10" height="9" fill={color} />
          <rect x="9" y="6" width="6" height="2" fill={dark} />
          <rect x="8" y="7" width="2" height="3" fill={dark} />
          <rect x="14" y="7" width="2" height="3" fill={dark} />
          <rect x="10" y="7" width="4" height="1" fill={cream} opacity="0.5" />
          <rect x="8" y="13" width="8" height="1" fill="#8a6334" opacity="0.45" />
          <rect x="11" y="15" width="2" height="2" fill="#b08a4a" />
        </>
      );
      break;
    case "love-heart":
      pixels = (
        <>
          <rect x="7" y="5" width="4" height="2" fill={color} />
          <rect x="13" y="5" width="4" height="2" fill={color} />
          <rect x="5" y="7" width="14" height="5" fill={color} />
          <rect x="6" y="12" width="12" height="2" fill={color} />
          <rect x="8" y="14" width="8" height="2" fill={color} />
          <rect x="10" y="16" width="4" height="2" fill={color} />
          <rect x="11" y="18" width="2" height="1" fill={color} />
          <rect x="7" y="7" width="2" height="1" fill={cream} opacity="0.75" />
          <rect x="17" y="4" width="1" height="1" fill="#d4b45f" />
          <rect x="16" y="5" width="3" height="1" fill="#d4b45f" />
          <rect x="17" y="6" width="1" height="1" fill="#d4b45f" />
        </>
      );
      break;
    case "double-heart":
      pixels = (
        <>
          <rect x="6" y="8" width="3" height="2" fill={color} />
          <rect x="11" y="8" width="3" height="2" fill={color} />
          <rect x="5" y="10" width="10" height="4" fill={color} />
          <rect x="6" y="14" width="8" height="2" fill={color} />
          <rect x="8" y="16" width="4" height="2" fill={color} />
          <rect x="9" y="18" width="2" height="1" fill={color} />
          <rect x="15" y="4" width="2" height="1" fill="#d86f86" />
          <rect x="19" y="4" width="2" height="1" fill="#d86f86" />
          <rect x="14" y="5" width="8" height="3" fill="#d86f86" />
          <rect x="15" y="8" width="6" height="1" fill="#d86f86" />
          <rect x="17" y="9" width="2" height="1" fill="#d86f86" />
          <rect x="7" y="10" width="1" height="1" fill={cream} opacity="0.8" />
          <rect x="16" y="5" width="1" height="1" fill={cream} opacity="0.8" />
        </>
      );
      break;
    default:
      pixels = (
        <>
          {drawFace()}
          <rect x="8" y="9" width="2" height="2" fill={dark} />
          <rect x="14" y="9" width="2" height="2" fill={dark} />
          <rect x="9" y="15" width="6" height="1" fill={dark} />
        </>
      );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        imageRendering: "pixelated",
        filter: glow ? "drop-shadow(0 2px 8px rgba(216,196,155,0.65))" : undefined,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {pixels}
    </svg>
  );
}

function PixelEditor({
  initialConfig,
  onSave,
  onClose,
}: {
  initialConfig: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
  onClose: () => void;
}) {
  const [config, setConfig] = useState<AvatarConfig>({
    ...initialConfig,
    body: initialConfig.body ?? "#ffffff",
    pixels: { ...(initialConfig.pixels ?? {}) },
  });
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [showPalette, setShowPalette] = useState(false);

  const selectColor = (color: string) => {
    setSelectedColor(color);
    setRecentColors(prev => [color, ...prev.filter(c => c !== color)].slice(0, 9));
  };

  const paintPixel = (x: number, y: number, color: string) => {
    setConfig(prev => ({
      ...prev,
      pixels: {
        ...(prev.pixels ?? {}),
        [getPixelKey(x, y)]: color,
      },
    }));
  };

  return (
    <motion.div className="absolute inset-0 z-50 flex flex-col p-2"
      style={{ background: "linear-gradient(160deg, #2a2114 0%, #171309 100%)" }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.36rem", color: "#d8c49b" }}>AVATAR MAKER</span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowPalette(v => !v)} className="px-2 py-0.5 rounded-full"
            style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 700, background: selectedColor, color: selectedColor === "#ffffff" ? "#5b4b2d" : "white", border: "1px solid rgba(255,255,255,0.45)" }}>
            색상
          </button>
          <button onClick={onClose} className="px-2 py-0.5 rounded-full"
            style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 600, background: "rgba(255,255,255,0.1)", color: "rgba(248,234,198,0.8)" }}>
            닫기
          </button>
          <button onClick={() => { onSave(config); onClose(); }} className="px-2 py-0.5 rounded-full"
            style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 700, background: "linear-gradient(90deg, #b08a4a, #8b9a72)", color: "white" }}>
            저장
          </button>
        </div>
      </div>

      <div className="relative flex gap-2 flex-1" style={{ minHeight: 0 }}>
        <div className="flex-1 flex items-center justify-center" style={{ minWidth: 0 }}>
          <AvatarPixelCanvas config={config} selectedColor={selectedColor} onPaint={paintPixel} />
        </div>
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-1" style={{ width: 44 }}>
          <button
            type="button"
            onClick={() => setShowPalette(true)}
            aria-label="선택된 색상"
            style={{
              width: 30,
              height: 30,
              borderRadius: 6,
              background: selectedColor,
              border: "2px solid rgba(255,255,255,0.75)",
              boxShadow: "0 0 8px rgba(255,255,255,0.22)",
            }}
          />
          {!showPalette && recentColors.map(color => (
            <button
              key={"side-" + color}
              type="button"
              onClick={() => selectColor(color)}
              aria-label="최근 색상 선택"
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                background: color,
                border: selectedColor === color ? "2px solid white" : "1px solid rgba(255,255,255,0.28)",
              }}
            />
          ))}
        </div>

        <AnimatePresence>
          {showPalette && (
            <motion.div
              className="absolute right-0 top-0 z-10 rounded-xl p-2"
              style={{
                width: 172,
                background: "rgba(30,24,15,0.96)",
                border: "1px solid rgba(216,196,155,0.24)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.34)",
              }}
              initial={{ opacity: 0, scale: 0.94, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: -4 }}
            >
              <div className="flex items-center justify-end mb-1.5">
                <button onClick={() => setShowPalette(false)} className="px-2 py-0.5 rounded-full"
                  style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", fontWeight: 700, background: "rgba(255,255,255,0.12)", color: "#f7efd9" }}>
                  닫기
                </button>
              </div>
              <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
                {PALETTE.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => selectColor(color)}
                    aria-label="색상 선택"
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: color,
                      border: selectedColor === color ? "2px solid white" : "1px solid rgba(255,255,255,0.22)",
                      boxShadow: selectedColor === color ? "0 0 7px rgba(255,255,255,0.48)" : "none",
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ProfileAvatarPage({
  avatar,
  onSaveAvatar,
}: {
  avatar: AvatarProfile;
  onSaveAvatar: (avatar: AvatarProfile) => void;
}) {
  const [draft, setDraft] = useState<AvatarProfile>(avatar);
  const [showPixelEditor, setShowPixelEditor] = useState(false);
  const [showItemCreator, setShowItemCreator] = useState(false);
  const [recording, setRecording] = useState(true);
  const [itemMode, setItemMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState<AvatarItemCategory>("전체");
  const [saved, setSaved] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<AvatarItem[]>([]);
  const [creatorDraft, setCreatorDraft] = useState({
    label: "새 아이템",
    cat: "악세사리" as AvatarItemCategory,
    color: "#b08a4a",
    templateId: "mini-bag",
  });

  const equipped = new Set(draft.equipped);
  const allItems = [...AVATAR_ITEMS, ...generatedItems];
  const visibleItems = activeCategory === "전체" ? allItems : allItems.filter(item => item.cat === activeCategory);

  const toggle = (id: string) => {
    setDraft(prev => {
      const next = new Set(prev.equipped);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...prev, equipped: [...next] };
    });
    setSaved(false);
  };

  const equipVisible = () => {
    setDraft(prev => ({
      ...prev,
      equipped: Array.from(new Set([...prev.equipped, ...visibleItems.map(item => item.id)])),
    }));
    setSaved(false);
  };

  const clearVisible = () => {
    const clearIds = new Set(visibleItems.map(item => item.id));
    setDraft(prev => ({ ...prev, equipped: prev.equipped.filter(id => !clearIds.has(id)) }));
    setSaved(false);
  };

  const saveAvatar = () => {
    if (!itemMode) {
      setItemMode(true);
      return;
    }
    onSaveAvatar(draft);
    setItemMode(false);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  const createItem = () => {
    const id = `custom-${Date.now()}`;
    setGeneratedItems(prev => [{
      id,
      cat: creatorDraft.cat,
      emoji: "",
      label: creatorDraft.label,
      color: creatorDraft.color,
    }, ...prev]);
    setActiveCategory(creatorDraft.cat);
    setShowItemCreator(false);
    setSaved(false);
  };

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden relative" style={{ background: "linear-gradient(160deg, #fbf5e8 0%, #fff9ec 100%)" }}>
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(139,154,114,0.2)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "#8b9a72" }}>★</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.7rem", color: "#8b9a72", letterSpacing: "0.12em" }}>AVATAR STUDIO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowItemCreator(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-white" style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 700, background: "linear-gradient(90deg, #b08a4a, #8b9a72)", boxShadow: "0 2px 8px rgba(139,154,114,0.35)" }}>아이템 생성하기</button>
          <button onClick={() => setShowPixelEditor(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-white" style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 700, background: "linear-gradient(90deg, #8b9a72, #b08a4a)", boxShadow: "0 2px 8px rgba(139,154,114,0.35)" }}>아바타 만들기</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 overflow-hidden" style={{ minHeight: 0 }}>
        <div className="flex justify-center flex-shrink-0">
          <div className="relative rounded-xl p-2" style={{ background: "rgba(0,0,0,0.42)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <PixelAvatar avatar={draft} width={84} height={104} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-1 flex-shrink-0" style={{ minHeight: 26 }}>
          <div className="flex items-center gap-1 overflow-x-auto" style={{ minWidth: 0, height: 26 }}>
            {AVATAR_ITEM_CATEGORIES.map(category => {
              const active = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className="rounded-full flex-shrink-0"
                  style={{
                    height: 24,
                    padding: "0 7px",
                    fontFamily: "'Quicksand', sans-serif",
                    fontSize: "0.44rem",
                    fontWeight: 800,
                    background: active ? "linear-gradient(90deg,#b08a4a,#8b9a72)" : "rgba(255,255,255,0.72)",
                    color: active ? "white" : "#7a6846",
                    border: active ? "1px solid rgba(176,138,74,0.35)" : "1px solid rgba(139,154,114,0.14)",
                  }}
                >
                  {category}
                </button>
              );
            })}
          </div>
          {itemMode && (
            <div className="flex items-center gap-1 flex-shrink-0" style={{ height: 26 }}>
              <button type="button" onClick={equipVisible} className="rounded-full" style={{ height: 24, padding: "0 7px", fontFamily: "'Quicksand', sans-serif", fontSize: "0.4rem", fontWeight: 800, background: "rgba(176,138,74,0.12)", color: "#8a6334", border: "1px solid rgba(176,138,74,0.22)" }}>모두 착용하기</button>
              <button type="button" onClick={clearVisible} className="rounded-full" style={{ height: 24, padding: "0 7px", fontFamily: "'Quicksand', sans-serif", fontSize: "0.4rem", fontWeight: 800, background: "rgba(139,154,114,0.1)", color: "#6d7653", border: "1px solid rgba(139,154,114,0.2)" }}>모두 해제하기</button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {visibleItems.map((item, i) => {
              const on = equipped.has(item.id);
              const enabled = itemMode;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => enabled && toggle(item.id)}
                  disabled={!enabled}
                  className="flex flex-col items-center gap-0.5 rounded-xl py-2"
                  style={{ background: on ? "linear-gradient(135deg, " + item.color + "44, " + item.color + "22)" : "rgba(255,255,255,0.65)", border: on ? "1.5px solid " + item.color : "1px solid rgba(139,154,114,0.12)", boxShadow: on ? "0 2px 8px " + item.color + "44" : "none", transition: "all 0.15s", opacity: enabled ? 1 : 0.7 }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: enabled ? 0.93 : 1 }}
                >
                  <PixelItemIcon id={item.id} color={item.color} />
                  <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: on ? "#6040a0" : "#9060b0", fontWeight: 600 }}>{item.label}</span>
                  {on && <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.28rem", color: "#b08a4a" }}>ON</span>}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <button onClick={saveAvatar} className="flex-shrink-0 py-2 rounded-xl text-white" style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", fontWeight: 800, background: saved ? "linear-gradient(90deg,#8b9a72,#aeb79b)" : "linear-gradient(90deg,#b08a4a,#8b9a72)", boxShadow: "0 2px 8px rgba(176,138,74,0.25)" }}>
        {!itemMode ? "아이템 착용하기" : saved ? "프로필에 적용됨" : "아바타 저장"}
      </button>

      <AnimatePresence>
        {showItemCreator && (
          <motion.div className="absolute inset-0 z-50 p-3 flex items-center justify-center" style={{ background: "rgba(20,16,10,0.72)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="w-full max-w-[760px] rounded-2xl p-3" style={{ background: "linear-gradient(180deg, #2a2114, #171309)", border: "1px solid rgba(216,196,155,0.22)", boxShadow: "0 16px 40px rgba(0,0,0,0.35)" }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.36rem", color: "#d8c49b" }}>HAND TRACKING ITEM MAKER</span>
                <button onClick={() => setShowItemCreator(false)} className="px-2 py-0.5 rounded-full" style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", fontWeight: 700, background: "rgba(255,255,255,0.12)", color: "#f7efd9" }}>닫기</button>
              </div>
              <div className="grid gap-3 md:grid-cols-[1.35fr_0.95fr]">
                <div className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="relative rounded-lg overflow-hidden" style={{ minHeight: 340 }}>
                    <FakeCameraView>
                      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full px-2 py-1" style={{ background: "rgba(0,0,0,0.42)" }}>
                        <motion.span className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff3b3b", boxShadow: "0 0 10px #ff3b3b" }} animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.32rem", color: "#f7efd9" }}>REC</span>
                      </div>
                      <div className="absolute inset-0 pointer-events-none">
                        {[[28, 24], [44, 18], [61, 29], [70, 43], [54, 58], [36, 54], [24, 70], [68, 72]].map(([x, y], i) => (
                          <motion.div key={i} className="absolute w-2 h-2 rounded-full" style={{ left: `${x}%`, top: `${y}%`, background: "#d8c49b", boxShadow: "0 0 6px #d8c49b" }} animate={{ scale: [1, 1.45, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.3, delay: i * 0.12, repeat: Infinity }} />
                        ))}
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                        <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", color: "#f7efd9", fontWeight: 700 }}>아이템을 그려서 픽셀화하세요</span>
                      </div>
                    </FakeCameraView>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="flex-1 py-2 rounded-xl text-white" style={{ background: "linear-gradient(90deg,#b08a4a,#8b9a72)", fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 800 }}>픽셀화하기</button>
                    <button type="button" className="flex-1 py-2 rounded-xl text-white" onClick={createItem} style={{ background: "linear-gradient(90deg,#8b9a72,#b08a4a)", fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 800 }}>저장하기</button>
                  </div>
                </div>
                <div className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="grid gap-2">
                    <label className="flex flex-col gap-1">
                      <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#d8c49b" }}>이름</span>
                      <input value={creatorDraft.label} onChange={e => setCreatorDraft(prev => ({ ...prev, label: e.target.value }))} className="px-2 py-1 rounded-lg outline-none" style={{ background: "rgba(255,255,255,0.9)", fontFamily: "'Quicksand', sans-serif", fontSize: "0.55rem" }} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#d8c49b" }}>카테고리</span>
                      <select value={creatorDraft.cat} onChange={e => setCreatorDraft(prev => ({ ...prev, cat: e.target.value as AvatarItemCategory }))} className="px-2 py-1 rounded-lg outline-none" style={{ background: "rgba(255,255,255,0.9)", fontFamily: "'Quicksand', sans-serif", fontSize: "0.55rem" }}>
                        {AVATAR_ITEM_CATEGORIES.filter(v => v !== "전체").map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </label>
                    <div>
                      <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.28rem", color: "#8b9a72", marginBottom: 8 }}>COLOR</p>
                      <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
                        {PALETTE.slice(0, 24).map(color => (
                          <button key={color} type="button" onClick={() => setCreatorDraft(prev => ({ ...prev, color }))} style={{ width: 20, height: 20, borderRadius: 4, background: color, border: creatorDraft.color === color ? "2px solid white" : "1px solid rgba(255,255,255,0.2)" }} />
                        ))}
                      </div>
                    </div>
                    <button type="button" onClick={createItem} className="px-3 py-1.5 rounded-full text-white" style={{ background: "linear-gradient(90deg,#b08a4a,#8b9a72)", fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 700 }}>저장하기</button>
                    <button type="button" onClick={() => setShowItemCreator(false)} className="px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)", color: "#f7efd9", fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 700 }}>취소</button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPixelEditor && (
          <PixelEditor
            initialConfig={draft.config}
            onSave={config => {
              setDraft(prev => ({ ...prev, config }));
              setSaved(false);
            }}
            onClose={() => setShowPixelEditor(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Face camera placeholder ── */
function FakeCameraView({ children }: { children?: ReactNode }) {
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
        <div style={{ width: 120, height: 30, background: "#8b9a72", borderRadius: "50% 50% 0 0" }} />
      </div>
      {/* corner guide brackets */}
      {[["top-2 left-2","border-t-2 border-l-2"],["top-2 right-2","border-t-2 border-r-2"],
        ["bottom-2 left-2","border-b-2 border-l-2"],["bottom-2 right-2","border-b-2 border-r-2"]
      ].map(([pos, border], i) => (
        <div key={i} className={`absolute w-5 h-5 ${pos} ${border}`} style={{ borderColor: "rgba(216,196,155,0.7)" }} />
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
      <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.28rem", color: "#8b9a72", textAlign: "center", marginBottom: 2 }}>MY</p>
      {SAMPLE_EMOTICONS.map(e => (
        <motion.button
          key={e.id}
          onClick={() => onSelect(e.id)}
          className="flex flex-col items-center gap-0.5 rounded-lg p-1"
          style={{
            background: selected === e.id
              ? "linear-gradient(135deg, rgba(176,138,74,0.25), rgba(139,154,114,0.2))"
              : "rgba(255,255,255,0.08)",
            border: selected === e.id ? "1.5px solid rgba(176,138,74,0.5)" : "1px solid rgba(255,255,255,0.1)",
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <PixelEmoticonIcon icon={e.icon} color={e.color} size={28} />
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
                style={{ left: `${x}%`, top: `${y}%`, background: "#b08a4a", boxShadow: "0 0 6px #b08a4a" }}
                animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.2, delay: i * 0.15, repeat: Infinity }} />
            ))}
            {/* connecting lines hint */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.4 }}>
              <polyline points="42%,62% 50%,55% 58%,62% 54%,72% 46%,72% 40%,80% 60%,80%"
                fill="none" stroke="#d8c49b" strokeWidth="1" />
            </svg>
            {/* live label */}
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded"
              style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,80,120,0.4)" }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.3rem", color: "#d8c49b" }}>LIVE</span>
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
                background: "linear-gradient(135deg, #b08a4a, #8b9a72)",
                boxShadow: "0 2px 8px rgba(176,138,74,0.4)",
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

const PixelCharSvg = () => (
  <svg width="50" height="64" viewBox="0 0 18 22" style={{ imageRendering: "pixelated", filter: "drop-shadow(0 2px 6px rgba(139,154,114,0.6))" }}>
    <rect x="5" y="1" width="8" height="1" fill="#3d1a00" /><rect x="4" y="2" width="10" height="1" fill="#3d1a00" />
    <rect x="4" y="3" width="10" height="4" fill="#5c2800" /><rect x="3" y="4" width="1" height="3" fill="#5c2800" />
    <rect x="14" y="4" width="1" height="3" fill="#5c2800" /><rect x="4" y="5" width="10" height="7" fill="#ffc8a0" />
    <rect x="6" y="7" width="2" height="2" fill="#2d1a00" /><rect x="10" y="7" width="2" height="2" fill="#2d1a00" />
    <rect x="7" y="7" width="1" height="1" fill="#ffffff" /><rect x="11" y="7" width="1" height="1" fill="#ffffff" />
    <rect x="5" y="9" width="2" height="1" fill="#ffaaaa" opacity="0.7" /><rect x="11" y="9" width="2" height="1" fill="#ffaaaa" opacity="0.7" />
    <rect x="8" y="10" width="2" height="1" fill="#ff8080" /><rect x="7" y="12" width="4" height="2" fill="#ffc8a0" />
    <rect x="3" y="14" width="12" height="6" fill="#8b9a72" /><rect x="2" y="14" width="3" height="5" fill="#a030d0" />
    <rect x="13" y="14" width="3" height="5" fill="#a030d0" /><rect x="7" y="14" width="4" height="1" fill="#a030d0" />
    <rect x="7" y="15" width="4" height="3" fill="#f5e7c7" /><rect x="5" y="20" width="3" height="2" fill="#d8c49b" />
    <rect x="10" y="20" width="3" height="2" fill="#d8c49b" />
  </svg>
);

function PhotoBoothPage({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showChar, setShowChar] = useState(false);
  const [shots, setShots] = useState<string[]>([]);
  const [shotIdx, setShotIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  const [previewShot, setPreviewShot] = useState<string | null>(null);
  const { add: addToAlbum } = useSharedPhotos();

  const selectedEmoticon = SAMPLE_EMOTICONS.find(e => e.id === selected);

  const takePhoto = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 300);
    const gradient = PHOTO_BOOTH_GRADIENTS[shots.length % PHOTO_BOOTH_GRADIENTS.length];
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
            background: showChar ? "linear-gradient(90deg,#8b9a72,#b08a4a)" : "rgba(255,255,255,0.12)",
            color: "white", border: "1px solid rgba(255,120,200,0.3)",
            boxShadow: showChar ? "0 2px 8px rgba(139,154,114,0.4)" : "none", transition: "all 0.2s",
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
              {selectedEmoticon && (
                <motion.div className="absolute top-4 right-4"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}>
                  <PixelEmoticonIcon icon={selectedEmoticon.icon} color={selectedEmoticon.color} size={48} glow />
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
                boxShadow: "0 0 20px rgba(216,196,155,0.4), 0 4px 16px rgba(0,0,0,0.3)",
              }}
              whileTap={{ scale: 0.82 }} whileHover={{ scale: 1.06 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.85)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)" }} />
            </motion.button>
            {/* thumbnail preview bottom-right */}
            <AnimatePresence>
              {shots.length > 0 && (
                <motion.div className="absolute bottom-3 right-3 flex flex-col items-end gap-1"
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <button type="button" onClick={() => setPreviewShot(shots[shotIdx])} className="relative rounded-lg overflow-hidden"
                    style={{ width: 52, height: 52, border: "2px solid rgba(255,255,255,0.8)", boxShadow: "0 2px 10px rgba(0,0,0,0.4)" }}>
                    <div className="w-full h-full" style={{ background: shots[shotIdx] }} />
                    <div className="absolute top-0.5 right-0.5 rounded-sm px-0.5"
                      style={{ background: "rgba(80,200,80,0.85)", fontSize: "0.28rem", fontFamily: "'Quicksand',sans-serif", color: "white", fontWeight: 700 }}>✓</div>
                  </button>
                  {shots.length > 1 && (
                    <div className="flex gap-1 items-center">
                      <button onClick={() => setShotIdx(i => Math.min(i + 1, shots.length - 1))}
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.2)", color: "white", fontSize: 10, opacity: shotIdx < shots.length - 1 ? 1 : 0.3 }}>‹</button>
                      <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "0.28rem", color: "rgba(248,234,198,0.8)" }}>
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

      <AnimatePresence>
        {previewShot && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center p-3"
            style={{ background: "rgba(10, 8, 14, 0.78)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-full max-w-[560px] rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.18)", boxShadow: "0 16px 48px rgba(0,0,0,0.45)" }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ background: "rgba(0,0,0,0.55)" }}>
                <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.3rem", color: "#d8c49b" }}>PHOTO PREVIEW</span>
                <button onClick={() => setPreviewShot(null)} className="px-2 py-0.5 rounded-full" style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", fontWeight: 700, background: "rgba(255,255,255,0.12)", color: "#fff" }}>
                  닫기
                </button>
              </div>
              <div className="aspect-square" style={{ background: previewShot }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Emoticon Room landing ── */
function EmoticonRoomPage() {
  const [view, setView] = useState<"home" | "maker" | "photo">("home");
  const [category, setCategory] = useState("전체");

  if (view === "maker") return <EmoticonMakerPage onBack={() => setView("home")} />;
  if (view === "photo") return <PhotoBoothPage onBack={() => setView("home")} />;

  const categorized = category === "전체" ? SAMPLE_EMOTICONS : SAMPLE_EMOTICONS.filter(e => e.category === category);
  const categories = ["전체", ...Array.from(new Set(SAMPLE_EMOTICONS.map(e => e.category)))];

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{
      background: "linear-gradient(160deg, #fbf5e8 0%, #fff9ec 100%)",
    }}>
      <div className="flex items-center pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(176,138,74,0.2)" }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "#b08a4a" }}>★</span>
        <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.7rem", color: "#b08a4a", letterSpacing: "0.12em", marginLeft: 6 }}>EMOTICON ROOM</span>
      </div>
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div className="flex items-center gap-1 overflow-x-auto pb-2" style={{ minHeight: 28 }}>
          {categories.map(cat => {
            const on = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className="rounded-full flex-shrink-0 px-2 py-0.5"
                style={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: "0.44rem",
                  fontWeight: 800,
                  background: on ? "linear-gradient(90deg,#b08a4a,#8b9a72)" : "rgba(255,255,255,0.72)",
                  color: on ? "white" : "#7a6846",
                  border: "1px solid rgba(139,154,114,0.15)",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {categorized.map((e, i) => (
            <motion.div key={e.id} className="flex flex-col items-center gap-1 rounded-xl py-2.5"
              style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(139,154,114,0.15)" }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.04 }}>
              <PixelEmoticonIcon icon={e.icon} color={e.color} size={40} />
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", color: "#9060b0", fontWeight: 700 }}>{e.label}</span>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.24rem", color: "rgba(139,154,114,0.75)", lineHeight: 1 }}>{e.category}</span>
            </motion.div>
          ))}
          <button onClick={() => setView("maker")}
            className="flex flex-col items-center justify-center gap-1 rounded-xl py-2.5"
            style={{ border: "1.5px dashed rgba(139,154,114,0.3)", background: "rgba(139,154,114,0.04)" }}>
            <span style={{ fontSize: 22, color: "#8b9a72" }}>＋</span>
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#8b9a72" }}>추가</span>
          </button>
        </div>
      </div>
      {/* bottom action buttons — same size, side by side */}
      <div className="flex gap-2 flex-shrink-0">
        <motion.button onClick={() => setView("photo")}
          className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-white"
          style={{
            fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", fontWeight: 700,
            background: "linear-gradient(135deg, #b88a54, #b08a4a)",
            boxShadow: "0 3px 12px rgba(255,60,80,0.4)",
          }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <span style={{ fontSize: 15 }}>📸</span> 사진찍기
        </motion.button>
        <motion.button onClick={() => setView("maker")}
          className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-white"
          style={{
            fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", fontWeight: 700,
            background: "linear-gradient(135deg, #7c3aed, #8b9a72)",
            boxShadow: "0 3px 12px rgba(130,60,255,0.4)",
          }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <span style={{ fontSize: 15 }}>✨</span> 이모티콘 생성
        </motion.button>
      </div>
    </div>
  );
}

function GuestbookPage() {
  const [entries, setEntries] = useState(INITIAL_ENTRIES);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  const handleSubmit = () => {
    if (!name.trim() || !msg.trim()) return;
    setEntries(prev => [{
      id: Date.now(),
      name: name.trim(),
      msg: msg.trim(),
      date: formatDottedDate(),
      color: GUESTBOOK_COLORS[prev.length % GUESTBOOK_COLORS.length],
    }, ...prev]);
    setName(""); setMsg(""); setShowForm(false);
  };

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{
      background: "linear-gradient(160deg, #fffaf0 0%, #fbf5e8 100%)",
    }}>
      {/* header */}
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(255,120,80,0.2)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "#b88a54" }}>★</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.7rem", color: "#b88a54", letterSpacing: "0.12em" }}>GUESTBOOK</span>
          <span className="px-1.5 py-0.5 rounded-full" style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: "0.3rem",
            background: "rgba(255,96,64,0.12)", color: "#b88a54",
          }}>{entries.length}</span>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-white"
          style={{
            fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 700,
            background: showForm
              ? "linear-gradient(90deg, #aaa, #888)"
              : "linear-gradient(90deg, #b88a54, #b08a4a)",
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
              background: "linear-gradient(135deg, rgba(255,110,80,0.08), rgba(176,138,74,0.06))",
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
                background: "linear-gradient(90deg, #b88a54, #b08a4a)",
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

function DiaryPage() {
  const [entries, setEntries] = useState(INIT_ENTRIES);
  const [privacy, setPrivacy] = useState<Privacy>("public");
  const [selWeather, setSelWeather] = useState("☀️");
  const [content, setContent] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [activeStickers, setActiveStickers] = useState<string[]>([]);
  const today = formatDottedDate();

  const saveEntry = () => {
    if (!content.trim()) return;
    setEntries(prev => [{ id: Date.now(), date: formatIsoDate(), weather: selWeather, privacy, content, stickers: [...activeStickers] }, ...prev]);
    setContent(""); setActiveStickers([]);
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
            background: privacy === "private" ? "linear-gradient(90deg,#555,#333)" : "linear-gradient(90deg,#c49a64,#b08a4a)",
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
                background: content.trim() ? "linear-gradient(90deg,#c49a64,#b08a4a)" : "rgba(200,180,170,0.5)",
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
                <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.58rem", color: "#c06030" }}>{formatDiaryDisplayDate(entry.date)}</span>
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

function FriendVisitPage({ nb, onBack }: { nb: Neighbor; onBack: () => void }) {
  const [mode, setMode] = useState<VisitMode>("miniroom");
  const MODES: { id: VisitMode; label: string; emoji: string }[] = [
    { id: "miniroom", label: "미니룸",  emoji: "🏠" },
    { id: "guest",    label: "방명록",  emoji: "✍️" },
    { id: "diary",    label: "일기",    emoji: "📖" },
  ];

  return (
    <div className="h-full flex flex-col gap-2 p-3" style={{ background: "linear-gradient(160deg, #f8f5ec 0%, #fbf5e8 100%)" }}>
      {/* header */}
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: `${nb.color}44` }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${nb.color}33`, border: `1.5px solid ${nb.color}`, fontSize: 14 }}>
            {nb.emoji}
          </div>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.65rem", color: "#4a2060" }}>{nb.name}</span>
        </div>
        <button onClick={onBack} className="px-2 py-0.5 rounded-full"
          style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 600, background: "rgba(139,154,114,0.1)", color: "#9060b0" }}>
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
              border: mode === m.id ? "none" : "1px solid rgba(139,154,114,0.15)",
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
          <div className="relative h-full" style={{ border: `1.5px solid ${nb.color}44`, background: "#f5f0df", borderRadius: 12, overflow: "hidden" }}>
            <MiniRoom />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.88)", border: `1px solid ${nb.color}` }}>
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", fontWeight: 700, color: "#6040a0" }}>{nb.emoji} {nb.name}의 방</span>
            </div>
          </div>
        )}
        {mode === "guest" && (
          <div className="h-full flex flex-col gap-2 p-3 rounded-xl overflow-y-auto" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${nb.color}33` }}>
            <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.33rem", color: "#8b9a72" }}>방명록</p>
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

function HomeRightPage() {
  const [selectedFriend, setSelectedFriend] = useState<Neighbor | null>(null);

  if (selectedFriend) return <FriendVisitPage nb={selectedFriend} onBack={() => setSelectedFriend(null)} />;

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{ background: "linear-gradient(160deg, #fbf5e8 0%, #fff9ec 100%)" }}>

      {/* ① 게시판 */}
      <HomeBoardSection onExpand={() => {}} />

      {/* ② 미니룸 (compact) */}
      <div className="rounded-xl overflow-hidden flex-shrink-0 relative" style={{
        height: "30%",
        border: "1.5px solid rgba(206,178,116,0.25)",
        background: "#f5f0df",
        boxShadow: "inset 0 2px 8px rgba(139,154,114,0.06)",
      }}>
        <MiniRoom />
        <div className="absolute top-1.5 left-2 flex items-center gap-1">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.32rem", color: "#b08a4a" }}>★ MINI ROOM</span>
        </div>
        <button className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded-full text-white"
          style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", fontWeight: 700, background: "linear-gradient(90deg,#b08a4a,#8b9a72)" }}>
          꾸미기
        </button>
      </div>

      {/* ③ 친구 목록 — 정사각형 그리드 */}
      <div className="flex-1 flex flex-col gap-1.5 overflow-hidden" style={{ minHeight: 0 }}>
        <div className="flex items-center justify-between flex-shrink-0">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.35rem", color: "#8b9a72" }}>이웃 ♡</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", color: "#9060b0" }}>{NEIGHBORS.length}명</span>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {NEIGHBORS.map((nb, i) => (
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
                {/* square avatar */}
                <div className="rounded-xl flex items-center justify-center"
                  style={{
                    width: 40, height: 40,
                    background: `linear-gradient(135deg, ${nb.color}55, ${nb.color}22)`,
                    border: `2px solid ${nb.color}`,
                    fontSize: 20,
                    position: "relative",
                  }}>
                  {nb.emoji}
                  {/* online dot */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                    style={{ background: "#4cda64" }} />
                </div>
                <span style={{
                  fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.45rem",
                  color: "#4a2060", textAlign: "center", lineHeight: 1.2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
                }}>{nb.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function HomeBoardSection({ onExpand }: { onExpand: () => void }) {
  const [liked, setLiked] = useState<Set<number>>(new Set());
  return (
    <div className="rounded-xl overflow-hidden flex-shrink-0" style={{
      background: "rgba(255,255,255,0.75)",
      border: "1px solid rgba(139,154,114,0.15)",
      boxShadow: "0 2px 10px rgba(139,154,114,0.06)",
    }}>
      <div className="flex items-center justify-between px-2.5 py-1.5" style={{
        background: "linear-gradient(90deg, rgba(244,226,186,0.2), rgba(139,154,114,0.1))",
        borderBottom: "1px solid rgba(139,154,114,0.12)",
      }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "#8b9a72" }}>게시판 💬</span>
        <button onClick={onExpand}
          className="w-5 h-5 rounded-full flex items-center justify-center text-white"
          style={{ background: "linear-gradient(135deg, #b08a4a, #8b9a72)", fontSize: 12, fontWeight: 700 }}>+</button>
      </div>
      {BOARD_POSTS.map((post, i) => (
        <div key={post.id} className="px-2.5 py-1.5 flex flex-col gap-0.5" style={{
          borderBottom: i < BOARD_POSTS.length - 1 ? "1px solid rgba(139,154,114,0.08)" : "none",
        }}>
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.5rem", color: "#7040a0" }}>{post.user}</span>
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#b090c0" }}>{post.time}</span>
          </div>
          <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.55rem", color: "#5a3080", lineHeight: 1.4,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.content}</p>
          <button onClick={() => setLiked(prev => { const n = new Set(prev); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
            className="self-start flex items-center gap-0.5"
            style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", color: liked.has(post.id) ? "#b08a4a" : "#b090c0", fontWeight: 600 }}>
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
    <div className="h-full flex flex-col gap-2 p-3" style={{ background: "linear-gradient(160deg, #fffaf0 0%, #f5f0df 100%)" }}>
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(139,154,114,0.2)" }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.42rem", color: "#8b9a72" }}>게시판 💬</span>
        <button onClick={onBack} className="px-2 py-0.5 rounded-full" style={{
          fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 600,
          background: "rgba(139,154,114,0.1)", color: "#9060b0",
        }}>← 닫기</button>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <input value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="글 남기기 ✨"
          className="flex-1 px-2 py-1.5 rounded-xl outline-none"
          style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", color: "#5a3080", background: "rgba(255,255,255,0.8)", border: "1px solid rgba(139,154,114,0.2)" }} />
        <button onClick={submit} className="px-3 rounded-xl text-white"
          style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 700, background: "linear-gradient(90deg,#b08a4a,#8b9a72)" }}>등록</button>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5" style={{ minHeight: 0 }}>
        {posts.map((post, i) => (
          <motion.div key={post.id} className="rounded-xl p-2.5"
            style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(139,154,114,0.12)" }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <div className="flex justify-between mb-0.5">
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.55rem", color: "#7040a0" }}>{post.user}</span>
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#b090c0" }}>{post.time}</span>
            </div>
            <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", color: "#5a3080", lineHeight: 1.5, marginBottom: 4 }}>{post.content}</p>
            <button onClick={() => setLiked(prev => { const n = new Set(prev); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
              style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", color: liked.has(post.id) ? "#b08a4a" : "#b090c0", fontWeight: 600 }}>
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
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{ background: "linear-gradient(160deg, #fffaf0 0%, #f5f0df 100%)" }}>
      {/* bulletin board */}
      <HomeBoardSection onExpand={() => setShowBoard(true)} />

      {/* divider */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to right,transparent,rgba(139,154,114,0.3))" }} />
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.3rem", color: "#8b9a72" }}>MY INFO</span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to left,transparent,rgba(139,154,114,0.3))" }} />
      </div>

      {/* compact avatar card */}
      <div className="rounded-xl p-2 flex gap-2 items-center flex-shrink-0" style={{
        background: "linear-gradient(135deg,rgba(244,226,186,0.3),rgba(139,154,114,0.1))",
        border: "1px solid rgba(206,178,116,0.2)",
      }}>
        <div className="rounded-lg overflow-hidden flex-shrink-0" style={{
          width: 44, height: 50,
          background: "linear-gradient(135deg,#fff4dc,#eee4cf)",
          border: "1.5px solid rgba(176,138,74,0.25)",
        }}>
          <div style={{ transform: "scale(0.6)", transformOrigin: "top left", width: "167%", height: "167%" }}>
            <PixelAvatar />
          </div>
        </div>
        <div>
          <p style={{ fontFamily: "'Great Vibes', cursive", fontSize: "1.1rem", color: "#8a6334", lineHeight: 1 }}>Re:world</p>
          <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", color: "#9060b0" }}>일상 기록중 🌸</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: "#4cda64" }} />
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#70a060" }}>온라인</span>
        </div>
      </div>

      {/* music player compact */}
      <div className="rounded-xl p-2 flex items-center gap-2 flex-shrink-0" style={{
        background: "linear-gradient(90deg,rgba(176,138,74,0.07),rgba(139,154,114,0.07))",
        border: "1px solid rgba(216,196,155,0.18)",
      }}>
        <button onClick={() => setIsPlaying(!isPlaying)}
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#b08a4a,#8b9a72)", boxShadow: "0 1px 6px rgba(176,138,74,0.35)" }}>
          <span style={{ color: "white", fontSize: 9, paddingLeft: isPlaying ? 0 : 1 }}>{isPlaying ? "⏸" : "▶"}</span>
        </button>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 700, color: "#8a6334", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            ♪ Lovefool - The Cardigans
          </p>
          <BgmProgressBar isPlaying={isPlaying} compact />
        </div>
      </div>

      {/* visitor count */}
      <div className="rounded-xl px-2.5 py-1.5 flex items-center justify-between flex-shrink-0" style={{
        background: "linear-gradient(90deg,rgba(244,226,186,0.2),rgba(139,154,114,0.08))",
        border: "1px solid rgba(206,178,116,0.18)",
      }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 12 }}>👣</span>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.33rem", color: "#9060b0" }}>TODAY</span>
        </div>
        <div className="flex items-center gap-0.5">
          {["0","1","2","8"].map((d,i) => (
            <div key={i} className="w-4 h-5 rounded flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#b08a4a,#8b9a72)" }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "white" }}>{d}</span>
            </div>
          ))}
        </div>
        <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#b080d0" }}>전체 <b style={{ color: "#b08a4a" }}>1,247</b></span>
      </div>
    </div>
  );
}

function RightPage({
  activeTab,
  avatar,
  onSaveAvatar,
}: {
  activeTab: string;
  avatar: AvatarProfile;
  onSaveAvatar: (avatar: AvatarProfile) => void;
}) {
  if (activeTab === "profile") return <ProfileAvatarPage avatar={avatar} onSaveAvatar={onSaveAvatar} />;
  if (activeTab === "photo") return <PhotoPage />;
  if (activeTab === "guest") return <GuestbookPage />;
  if (activeTab === "emoticon") return <EmoticonRoomPage />;
  if (activeTab === "diary") return <DiaryPage />;
  if (activeTab === "home") return <HomeRightPage />;
  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{
      background: "linear-gradient(160deg, #fbf5e8 0%, #fff9ec 100%)",
    }}>
      {/* mini room — fallback */}
      <div className="flex-1 rounded-xl overflow-hidden" style={{ border: "1.5px solid rgba(206,178,116,0.25)", background: "#f5f0df", minHeight: 0 }}>
        <MiniRoom />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SPREAD PAGE
═══════════════════════════════════════════ */
function SpreadPage({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState("home");
  const [profile, setProfile] = useState<DiaryProfile>(DEFAULT_DIARY_PROFILE);
  const [avatar, setAvatar] = useState<AvatarProfile>(DEFAULT_AVATAR_PROFILE);

  return (
    <div className="size-full flex items-center justify-center overflow-hidden" style={{
      background: "linear-gradient(135deg, #fbf8ef 0%, #f5edda 40%, #fff4df 100%)",
    }}>
      {/* ambient */}
      <div className="absolute pointer-events-none" style={{
        width: 600, height: 400, top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(ellipse, rgba(216,196,155,0.12) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />

      {/* book spread */}
      <motion.div
        className="relative flex"
        style={{
          height: "min(660px, 92vh)",
          boxShadow: "0 20px 80px rgba(180,0,120,0.2), 0 4px 20px rgba(129,142,102,0.15)",
        }}
        initial={{ scaleX: 0.3, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* LEFT PAGE */}
        <div style={{
          width: "min(460px, calc(50vw - 34px))",
          borderRadius: "8px 0 0 8px",
          overflow: "hidden",
          boxShadow: "inset -4px 0 12px rgba(0,0,0,0.06)",
        }}>
          <LeftPage profile={profile} avatar={avatar} onSaveProfile={setProfile} />
        </div>

        {/* SPINE */}
        <div style={{
          width: 14,
          background: "linear-gradient(to right, #ead3a1, #c7aa70, #ead3a1)",
          boxShadow: "2px 0 8px rgba(0,0,0,0.08), -2px 0 8px rgba(0,0,0,0.08)",
          flexShrink: 0,
        }}>
          {/* spine dots */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="mx-auto mt-3 w-1.5 h-1.5 rounded-full" style={{
              background: i % 3 === 0 ? "#d8c49b" : "rgba(255,255,255,0.4)",
            }} />
          ))}
        </div>

        {/* RIGHT PAGE */}
        <div style={{
          width: "min(460px, calc(50vw - 34px))",
          overflow: "hidden",
          boxShadow: "inset 4px 0 12px rgba(0,0,0,0.04)",
        }}>
          <RightPage activeTab={activeTab} avatar={avatar} onSaveAvatar={setAvatar} />
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
                height: "calc(min(660px, 92vh) / 7)",
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
                color: activeTab === tab.id ? "#fff" : "rgba(91,75,45,0.75)",
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
      <motion.button
        className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-white text-xs font-semibold"
        style={{
          fontFamily: "'Quicksand', sans-serif",
          background: "linear-gradient(135deg, #b08a4a, #8b9a72)",
          boxShadow: "0 2px 10px rgba(176,138,74,0.35)",
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
    </div>
  );
}

/* ═══════════════════════════════════════════
   ROOT
═══════════════════════════════════════════ */
export default function App() {
  const [page, setPage] = useState<"cover" | "spread">("cover");

  return (
    <div className="size-full">
      <AnimatePresence mode="wait">
        {page === "cover" ? (
          <motion.div key="cover" className="size-full" exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}>
            <CoverPage onOpen={() => setPage("spread")} />
          </motion.div>
        ) : (
          <motion.div key="spread" className="size-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <SpreadPage onClose={() => setPage("cover")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
