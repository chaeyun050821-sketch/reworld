import { useState, useEffect, type Dispatch, type SetStateAction, type CSSProperties, type DragEvent, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import AuthPage from "./AuthPage";
import { getSession, signOut, updateUserNickname, type User } from "../lib/auth";
import { getUserProfile, saveUserProfile } from "../lib/profile";
import {
  ROOM_CATEGORIES,
  EMPTY_ROOM_SELECTIONS,
  ROOM_VIEW_WIDTH,
  ROOM_VIEW_HEIGHT,
  ROOM_WALL_HEIGHT,
  ROOM_FLOOR_Y,
  getItemsByCategory,
  getSelectedItems,
  getItemById,
  loadRoomSelections,
  saveRoomSelections,
  AVATAR_ITEMS,
  BOARD_POSTS,
  INIT_ENTRIES,
  INIT_FIELDS,
  PALETTE,
  PHOTO_BOOTH_GRADIENTS,
  PIXEL_COLS,
  PIXEL_ROWS,
  SAMPLE_EMOTICONS,
  STICKER_OPTIONS,
  TABS,
  WEATHER_OPTIONS,
  type ProfileField,
  type Privacy,
  type TabConfig,
  type RoomCategoryId,
  type RoomSelections,
  type PixelRect,
} from "./data";
import { useSharedPhotos } from "./hooks/useSharedPhotos";
import { formatDiaryDisplayDate, formatDottedDate, formatIsoDate } from "./utils/date";

/* ═══════════════════════════════════════════
   SHARED ATOMS
═══════════════════════════════════════════ */

const PixelHeart = ({ size = 14, color = "#7a8fd4" }: { size?: number; color?: string }) => (
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
    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 20%, rgba(194,203,237,0.5) 35%, rgba(122,143,212,0.45) 50%, rgba(168,184,232,0.4) 65%, rgba(255,255,255,0.5) 80%, transparent 100%)",
    filter: "blur(2px)",
  }} />
);

const Corner = ({ flip }: { flip?: boolean }) => (
  <svg width="90" height="90" viewBox="0 0 90 90" fill="none" style={{ transform: flip ? "scale(-1,1)" : undefined }}>
    <path d="M8 8 L8 40 Q8 50 18 50" stroke="#7a8fd4" strokeWidth="2" fill="none" opacity="0.7" />
    <path d="M8 8 L40 8 Q50 8 50 18" stroke="#5a6db0" strokeWidth="2" fill="none" opacity="0.7" />
    <circle cx="8" cy="8" r="4" fill="#C2CBED" />
    <circle cx="50" cy="18" r="3" fill="#7a8fd4" opacity="0.8" />
    <circle cx="18" cy="50" r="3" fill="#5a6db0" opacity="0.8" />
    <path d="M20 20 Q30 14 40 20 Q30 26 20 20Z" fill="#C2CBED" opacity="0.5" />
    <path d="M20 20 Q14 30 20 40 Q26 30 20 20Z" fill="#a8b8e8" opacity="0.4" />
    <circle cx="29" cy="29" r="4" fill="white" opacity="0.4" />
  </svg>
);

const ChromeBadge = ({ children }: { children: React.ReactNode }) => (
  <div className="px-4 py-1 rounded-full text-xs font-semibold tracking-widest uppercase" style={{
    fontFamily: "'Quicksand', sans-serif",
    background: "linear-gradient(135deg, #fff 0%, #eef1fb 30%, #C2CBED 60%, #fff 100%)",
    boxShadow: "0 2px 8px rgba(90,109,176,0.28), inset 0 1px 0 rgba(255,255,255,0.9)",
    color: "#3d4a7a", border: "1px solid rgba(255,255,255,0.8)",
  }}>{children}</div>
);

function CoverPage({ onOpen, nickname }: { onOpen: () => void; nickname?: string }) {
  const stars = [
    { x: "7%", y: "9%", size: 22, delay: 0, color: "#7a8fd4" },
    { x: "83%", y: "6%", size: 18, delay: 0.5, color: "#5a6db0" },
    { x: "90%", y: "70%", size: 24, delay: 1.1, color: "#C2CBED" },
    { x: "4%", y: "75%", size: 20, delay: 0.3, color: "#9aa8d8" },
    { x: "48%", y: "3%", size: 14, delay: 0.8, color: "#a8b8e8" },
    { x: "15%", y: "48%", size: 12, delay: 1.6, color: "#C2CBED" },
    { x: "75%", y: "45%", size: 12, delay: 2.0, color: "#7a8fd4" },
    { x: "35%", y: "87%", size: 16, delay: 0.6, color: "#5a6db0" },
    { x: "62%", y: "84%", size: 14, delay: 1.4, color: "#b8c4e8" },
    { x: "68%", y: "18%", size: 18, delay: 0.9, color: "#a8b8e8" },
    { x: "25%", y: "15%", size: 13, delay: 2.2, color: "#7a8fd4" },
  ];

  return (
    <div className="size-full flex items-center justify-center" style={{
      background: "linear-gradient(135deg, #C2CBED 0%, #b8c4e8 40%, #d0d8f4 70%, #e4e9f7 100%)",
    }}>
      <div className="absolute rounded-full pointer-events-none" style={{
        width: 500, height: 500,
        background: "radial-gradient(circle, rgba(122,143,212,0.18) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />
      <motion.div
        className="relative overflow-hidden cursor-pointer"
        style={{
          width: DIARY.pageW, height: DIARY.pageH,
          borderRadius: "4px 16px 16px 4px",
          boxShadow: "6px 10px 50px rgba(90,109,176,0.28), 2px 4px 16px rgba(122,143,212,0.2), 0 0 0 1px rgba(255,255,255,0.6)",
          background: "linear-gradient(148deg, #d8dff5 0%, #C2CBED 25%, #b8c4e8 50%, #c8d0ef 75%, #d8dff5 100%)",
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
          backgroundImage: "radial-gradient(circle, #7a8fd4 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }} />
        <div className="absolute inset-3 rounded-xl pointer-events-none" style={{
          border: "1.5px solid rgba(255,255,255,0.7)",
          boxShadow: "0 0 0 1px rgba(122,143,212,0.2) inset",
        }} />
        <div className="absolute inset-5 rounded-lg pointer-events-none" style={{
          border: "1px dashed rgba(122,143,212,0.4)",
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
                <PixelHeart size={i === 1 ? 20 : 14} color={i === 1 ? "#5a6db0" : "#7a8fd4"} />
              </motion.div>
            ))}
          </motion.div>
          <motion.div className="text-center" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.75, duration: 1, ease: [0.22, 1, 0.36, 1] }}>
            <h1 
              style={{ fontFamily: '"Great Vibes", "Comic Sans MS", "Malgun Gothic", sans-serif', fontSize: '1.3rem', color: '#3d4a7a', lineHeight: '1.1',
              background: "linear-gradient(135deg, #3d4a7a 0%, #5a6db0 30%, #7a8fd4 60%, #5a6db0 80%, #3d4a7a 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              filter: "drop-shadow(0 2px 8px rgba(90,109,176,0.35))",
            }}>Re:world</h1>
            <motion.div className="mx-auto mt-1 h-0.5 rounded-full" style={{
              background: "linear-gradient(90deg, transparent, #C2CBED, #fff, #7a8fd4, #C2CBED, transparent)",
              boxShadow: "0 0 6px rgba(122,143,212,0.5)",
            }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.2, duration: 0.9 }} />
          </motion.div>
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.42rem", color: "#5a6db0", letterSpacing: "0.08em", textAlign: "center", lineHeight: 2, opacity: 0.8 }}>
            thoughts · memories · dreams
          </p>
          <div className="flex items-center gap-2 w-full px-4">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(122,143,212,0.45))" }} />
            <span style={{ color: "#7a8fd4", fontSize: 14 }}>✦</span>
            <span style={{ color: "#5a6db0", fontSize: 10 }}>★</span>
            <span style={{ color: "#C2CBED", fontSize: 14 }}>✦</span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(90,109,176,0.45))" }} />
          </div>
          <motion.div className="relative px-6 py-1.5 rounded-full overflow-hidden" style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(232,236,250,0.92) 50%, rgba(255,255,255,0.85) 100%)",
            boxShadow: "0 3px 12px rgba(90,109,176,0.22), inset 0 1px 0 rgba(255,255,255,1)",
            border: "1.5px solid rgba(122,143,212,0.25)",
          }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.0 }}>
            <div className="absolute inset-x-0 top-0 h-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.6)" }} />
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 600, fontSize: "0.78rem", letterSpacing: "0.25em", color: "#3d4a7a", position: "relative" }}>2 0 2 6</span>
          </motion.div>
          <motion.div className="flex gap-3 items-center mt-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
            {[0.1, 0, 0.2, 0, 0.1].map((d, i) => (
              <motion.div key={i} animate={{ y: [0, -5, 0] }} transition={{ duration: 1.2, delay: d + i * 0.07, repeat: Infinity }}>
                <PixelHeart size={i === 2 ? 18 : 12} color={["#7a8fd4", "#C2CBED", "#5a6db0", "#a8b8e8", "#7a8fd4"][i]} />
              </motion.div>
            ))}
          </motion.div>
          {/* open hint */}
          <motion.p
            className="mt-2 text-center"
            style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.65rem", color: "#5a6db0", letterSpacing: "0.1em" }}
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
          background: "linear-gradient(to right, rgba(90,109,176,0.12), transparent)",
        }} />
      </motion.div>
      <div className="absolute" style={{
        width: 12, height: DIARY.pageH,
        left: `calc(50% - ${DIARY.pageW / 2}px - 8px)`,
        borderRadius: "4px 0 0 4px",
        background: "linear-gradient(to right, #9aa8d8, #C2CBED)",
        boxShadow: "-3px 0 10px rgba(90,109,176,0.2)",
      }} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   PIXEL AVATAR SVG (legacy — guestbook neighbors)
═══════════════════════════════════════════ */
type LegacyAvatarConfig = {
  hairDark: string;
  hairLight: string;
  skin: string;
  outfit: string;
  outfitDark: string;
  outfitInner: string;
  pants: string;
};

const DEFAULT_LEGACY_AVATAR: LegacyAvatarConfig = {
  hairDark: "#3d1a00",
  hairLight: "#5c2800",
  skin: "#ffc8a0",
  outfit: "#ff80c8",
  outfitDark: "#ff60b8",
  outfitInner: "#ffe0f4",
  pants: "#c8a0ff",
};

function LegacyPixelAvatar({
  config = DEFAULT_LEGACY_AVATAR,
  width = 72,
  height = 90,
}: {
  config?: LegacyAvatarConfig;
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

function NeighborAvatar({ avatar, color, size = 40, showOnline = true }: { avatar: LegacyAvatarConfig; color: string; size?: number; showOnline?: boolean }) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-xl flex items-end justify-center overflow-hidden w-full h-full"
        style={{
          background: `linear-gradient(135deg, ${color}55, ${color}22)`,
          border: `2px solid ${color}`,
        }}
      >
        <LegacyPixelAvatar config={avatar} width={size * 0.72} height={size * 0.9} />
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
   MINI ROOM SVG — Slot-based interior
═══════════════════════════════════════════ */

function PixelRects({ pixels }: { pixels: PixelRect[] }) {
  return (
    <>
      {pixels.map((p, i) => (
        <rect
          key={i}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          fill={p.fill === "none" ? "none" : p.fill}
          opacity={p.opacity}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
        />
      ))}
    </>
  );
}

function MiniRoom({ selections = EMPTY_ROOM_SELECTIONS }: { selections?: RoomSelections }) {
  const placed = getSelectedItems(selections);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${ROOM_VIEW_WIDTH} ${ROOM_VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ imageRendering: "pixelated", display: "block" }}
    >
      {/* clean base wall */}
      <rect x="0" y="0" width={ROOM_VIEW_WIDTH} height={ROOM_WALL_HEIGHT} fill="#fafafc" />
      {Array.from({ length: 22 }, (_, i) =>
        Array.from({ length: Math.ceil(ROOM_WALL_HEIGHT / 20) }, (_, j) => (
          <rect
            key={`wd${i}${j}`}
            x={i * 20 + 3}
            y={j * 20 + 3}
            width="2"
            height="2"
            fill="#ececf0"
            opacity="0.35"
          />
        )),
      )}
      {/* clean base floor */}
      <rect x="0" y={ROOM_FLOOR_Y} width={ROOM_VIEW_WIDTH} height={ROOM_VIEW_HEIGHT - ROOM_FLOOR_Y} fill="#eeeef2" />
      {Array.from({ length: 22 }, (_, i) =>
        Array.from({ length: Math.ceil((ROOM_VIEW_HEIGHT - ROOM_FLOOR_Y) / 20) }, (_, j) => (
          <rect
            key={`fd${i}${j}`}
            x={i * 20}
            y={ROOM_FLOOR_Y + j * 20}
            width="20"
            height="20"
            fill={(i + j) % 2 === 0 ? "#eeeef2" : "#e8e8ec"}
          />
        )),
      )}
      <rect x="0" y={ROOM_FLOOR_Y} width={ROOM_VIEW_WIDTH} height="3" fill="#dcdce4" />

      {placed.map((item) => (
        <g key={item.id}>
          <PixelRects pixels={item.pixels} />
        </g>
      ))}
    </svg>
  );
}
/* ═══════════════════════════════════════════
   LEFT PAGE — PROFILE (merged)
═══════════════════════════════════════════ */
function LeftPage({
  user,
  avatar,
  onUserUpdate,
}: {
  user: User;
  avatar: AvatarProfile;
  onUserUpdate: (user: User) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState(() => getUserProfile(user.id, user.nickname).status);
  const [tags, setTags] = useState<string[]>(() => getUserProfile(user.id, user.nickname).tags);
  const [fields, setFields] = useState<ProfileField[]>(() => getUserProfile(user.id, user.nickname).fields);
  const [draft, setDraft] = useState<ProfileField[]>(fields);
  const [bgmTitle, setBgmTitle] = useState("♬ Lovefool - The Cardigans");

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
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{ background: "linear-gradient(160deg, #f4f6fc 0%, #C2CBED 100%)" }}>
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(140,155,210,0.35)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "#7a8fd4" }}>◆</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.7rem", color: "#5a6db0", letterSpacing: "0.12em" }}>MY PROFILE</span>
        </div>
        {!editing ? (
          <button onClick={startEdit} className="px-2 py-0.5 rounded-full" style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 700, background: "linear-gradient(90deg, #ff4757, #ff6b81)", color: "white", boxShadow: "0 1px 6px rgba(255,71,87,0.35)" }}>✎ 수정하기</button>
        ) : (
          <div className="flex gap-1">
            <button onClick={saveEdit} className="px-2 py-0.5 rounded-full" style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 700, background: "linear-gradient(90deg, #ff4757, #ff6b81)", color: "white" }}>저장</button>
            <button onClick={cancelEdit} className="px-2 py-0.5 rounded-full" style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 600, background: "rgba(140,155,210,0.2)", color: "#5a6db0" }}>취소</button>
          </div>
        )}
      </div>
      <div className="rounded-xl p-2.5 flex gap-3 items-start flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(194,203,237,0.45) 0%, rgba(140,155,210,0.15) 100%)", border: "1px solid rgba(140,155,210,0.3)" }}>
        <div className="relative flex-shrink-0">
          <div className="rounded-lg overflow-hidden flex items-center justify-center" style={{ width: 72, height: 80, background: "linear-gradient(135deg, #eef1fb 0%, #C2CBED 100%)", border: "2px solid rgba(122,143,212,0.35)", boxShadow: "0 2px 8px rgba(122,143,212,0.2)" }}>
            <PixelAvatar avatar={avatar} width={72} height={90} />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: "#4cda64" }} />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <p style={{ fontFamily: "Comic Sans MS, Malgun Gothic, sans-serif", fontSize: "1.3rem", color: "#5a6db0", lineHeight: "1.1", fontWeight: "bold" }}>{displayName}</p>
          {editing ? (
            <input value={status} onChange={(e) => setStatus(e.target.value)} className="px-2 py-0.5 rounded-lg outline-none" style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.56rem", color: "#5a6db0", background: "rgba(255,255,255,0.78)", border: "1px solid rgba(140,155,210,0.3)" }} />
          ) : (
            <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.6rem", color: "#7a8fd4", fontWeight: 500 }}>{status}</p>
          )}
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded-full" style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.5rem", fontWeight: 600, background: "rgba(122,143,212,0.12)", color: "#5a6db0", border: "1px solid rgba(122,143,212,0.25)" }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-xl p-2.5 flex flex-col gap-1.5 flex-shrink-0" style={{ background: "rgba(255,255,255,0.7)", border: editing ? "1px solid rgba(255,71,87,0.4)" : "1px solid rgba(140,155,210,0.2)" }}>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "#7a8fd4", marginBottom: 4 }}>PROFILE</p>
        {(editing ? draft : fields).map(({ label, value }, idx) => (
          <div key={label} className="flex gap-2 items-center">
            <span className="flex-shrink-0" style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.55rem", fontWeight: 700, color: "#7a8fd4", width: 32 }}>{label}</span>
            {editing ? (
              <input value={draft[idx].value} onChange={(e) => setDraft((prev) => prev.map((f, i) => (i === idx ? { ...f, value: e.target.value } : f)))} className="flex-1 px-1.5 py-0.5 rounded-lg outline-none" style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.55rem", color: "#5a6db0", background: "rgba(238,241,251,0.9)", border: "1px solid rgba(140,155,210,0.3)" }} />
            ) : (
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", color: "#5a6db0", borderBottom: "1px dotted rgba(140,155,210,0.3)", flex: 1, paddingBottom: 1 }}>{value}</span>
            )}
          </div>
        ))}
      </div>
      <div className="rounded-xl p-2.5 flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(194,203,237,0.15) 0%, rgba(140,155,210,0.1) 100%)", border: "1px solid rgba(140,155,210,0.25)" }}>
        <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "#7a8fd4", marginBottom: 6 }}>♬ BGM</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsPlaying(!isPlaying)} className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ff4757, #ff6b81)", boxShadow: "0 2px 8px rgba(255,71,87,0.35)" }}>
            <span style={{ color: "white", fontSize: 10, paddingLeft: isPlaying ? 0 : 2 }}>{isPlaying ? "⏸" : "▶"}</span>
          </button>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input value={bgmTitle} onChange={(e) => setBgmTitle(e.target.value)} className="w-full px-2 py-0.5 rounded-lg outline-none" style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.56rem", fontWeight: 700, color: "#5a6db0", background: "rgba(255,255,255,0.75)", border: "1px solid rgba(140,155,210,0.25)" }} />
            ) : (
              <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", fontWeight: 700, color: "#5a6db0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{bgmTitle}</p>
            )}
          </div>
        </div>
        <BgmProgressBar isPlaying={isPlaying} />
      </div>
      <div className="rounded-xl p-2.5 flex items-center justify-between flex-shrink-0" style={{ background: "linear-gradient(90deg, rgba(194,203,237,0.25) 0%, rgba(140,155,210,0.1) 100%)", border: "1px solid rgba(140,155,210,0.25)" }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 14 }}>👣</span>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "#7a8fd4" }}>TODAY</span>
        </div>
        <div className="flex items-center gap-1">
          {["0", "1", "2", "8"].map((d, i) => (
            <motion.div key={i} className="w-5 h-6 rounded flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7a8fd4, #5a6db0)", boxShadow: "0 1px 4px rgba(122,143,212,0.3)" }} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 + i * 0.08 }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.45rem", color: "white" }}>{d}</span>
            </motion.div>
          ))}
        </div>
        <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", color: "#7a8fd4" }}>전체 <b style={{ color: "#ff4757" }}>1,247</b></span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   RIGHT PAGE — GUESTBOOK
═══════════════════════════════════════════ */
type GuestbookEntryWithAvatar = {
  id: number;
  name: string;
  msg: string;
  date: string;
  color: string;
  avatarIndex: number;
};

const GUESTBOOK_INITIAL_ENTRIES: GuestbookEntryWithAvatar[] = [
  { id: 1, name: "별빛소녀", msg: "다이어리 너무 예뻐요! 자주 올게요 🌸", date: "2026.06.22", color: "#ff80c8", avatarIndex: 0 },
  { id: 2, name: "하늘이", msg: "오늘도 행복한 하루 보내요~ 또 놀러올게용", date: "2026.06.21", color: "#80c8ff", avatarIndex: 1 },
  { id: 3, name: "민트초코", msg: "Y2K 감성 너무 좋다!! bgm도 최고예요", date: "2026.06.20", color: "#80e0b0", avatarIndex: 2 },
];

function GuestbookPage() {
  const [entries, setEntries] = useState(GUESTBOOK_INITIAL_ENTRIES);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");

  const COLORS = ["#ff80c8", "#c8a0ff", "#80c8ff", "#80e0b0", "#ffe080", "#ffa880"];

  const handleSubmit = () => {
    if (!name.trim() || !msg.trim()) return;
    const today = new Date();
    const date = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,"0")}.${String(today.getDate()).padStart(2,"0")}`;
    setEntries(prev => [
  {
    id: Date.now(),
    name: name.trim(),
    msg: msg.trim(),
    date,
    color: COLORS[prev.length % COLORS.length],
    avatarIndex: prev.length % AVATAR_PRESETS.length,
  },
  ...prev,
]);
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
                <NeighborAvatar
  avatar={AVATAR_PRESETS[entry.avatarIndex % AVATAR_PRESETS.length]}
  color={entry.color}
  size={26}
  showOnline={false}
/>
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
              lineHeight: 1.5, paddingLeft: "2.1rem",
            }}>{entry.msg}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════
   RIGHT PAGE — MINI ROOM (Slot-based)
═══════════════════════════════════════════ */
function MiniRoomPage({
  selections,
  setSelections,
}: {
  selections: RoomSelections;
  setSelections: Dispatch<SetStateAction<RoomSelections>>;
}) {
  const [activeCategory, setActiveCategory] = useState<RoomCategoryId>("sofa");

  const categoryItems = getItemsByCategory(activeCategory);
  const selectedInCategory = selections[activeCategory];

  const selectItem = (itemId: string) => {
    setSelections((prev) => ({
      ...prev,
      [activeCategory]: prev[activeCategory] === itemId ? null : itemId,
    }));
  };

  const resetRoom = () => setSelections({ ...EMPTY_ROOM_SELECTIONS });

  const hasAnySelection = Object.values(selections).some((id) => {
    if (!id) return false;
    const item = getItemById(id);
    return !!item && item.pixels.length > 0;
  });

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
          {hasAnySelection && (
            <button
              onClick={resetRoom}
              className="px-2 py-0.5 rounded-full"
              style={{
                fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", fontWeight: 600,
                color: "#5a6db0", background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(122,143,212,0.2)",
              }}
            >
              초기화
            </button>
          )}
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", color: "#80b0a0" }}>
            카테고리 선택 → 아이템 교체
          </span>
        </div>
      </div>

      {/* room canvas — grows to fill available height */}
      <div className="flex-1 min-h-[340px] rounded-xl overflow-hidden" style={{
        border: "1.5px solid rgba(128,224,176,0.35)",
        background: "#fafafc",
        boxShadow: "inset 0 2px 8px rgba(128,224,176,0.08)",
      }}>
        <RoomCanvas selections={selections} fillHeight />
      </div>

      {/* category tabs — horizontal scroll */}
      <div className="rounded-xl px-2 pt-1.5 pb-1 flex-shrink-0" style={{
        background: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(128,224,176,0.25)",
      }}>
        <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
          {ROOM_CATEGORIES.map((cat) => {
            const on = activeCategory === cat.id;
            const filled = (() => {
              const id = selections[cat.id];
              if (!id) return false;
              const item = getItemById(id);
              return !!item && item.pixels.length > 0;
            })();
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full flex items-center gap-1"
                style={{
                  fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 600,
                  background: on ? "linear-gradient(90deg, #40b080, #60d0a0)" : "rgba(128,224,176,0.1)",
                  color: on ? "white" : "#508870",
                  border: on ? "none" : "1px solid rgba(128,224,176,0.25)",
                  transition: "all 0.15s",
                }}
              >
                {cat.label}
                {filled && !on && (
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#40b080", display: "inline-block" }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* item list for active category — horizontal scroll */}
      <div className="rounded-xl p-2 flex-shrink-0" style={{
        background: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(128,224,176,0.25)",
      }}>
        <div className="flex items-center gap-1 mb-1.5">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.3rem", color: "#40b080", marginRight: 2 }}>ITEM</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#80b0a0" }}>
            {ROOM_CATEGORIES.find((c) => c.id === activeCategory)?.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "thin" }}>
          {categoryItems.map((item) => {
            const on = selectedInCategory === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => selectItem(item.id)}
                className="flex-shrink-0 flex flex-col items-center gap-0.5 w-11"
                whileTap={{ scale: 0.92 }}
                title={item.label}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform"
                  style={{
                    background: on ? `${item.color}33` : "rgba(128,224,176,0.08)",
                    border: on ? `2px solid ${item.color}` : "1.5px solid rgba(128,224,176,0.2)",
                    transform: on ? "scale(1.08)" : undefined,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{item.preview}</span>
                </div>
                <span style={{
                  fontFamily: "'Quicksand', sans-serif", fontSize: "0.35rem", fontWeight: on ? 700 : 500,
                  color: on ? item.color : "#80a090", whiteSpace: "nowrap", maxWidth: 44, overflow: "hidden", textOverflow: "ellipsis",
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
  const toggleEntryPrivacy = (entryId: number) => {
  setEntries(prev => prev.map(entry => (
    entry.id === entryId
      ? { ...entry, privacy: entry.privacy === "private" ? "public" : "private" }
      : entry
  )));
};
  const fmtDate = (d: string) => {
    const [y,m,day] = d.split("-");
    return `${y}년 ${m}월 ${day}일`;
  };

  return (
    <div className="h-full flex flex-col" style={{ background: "linear-gradient(160deg, #FFFDF8 0%, #FFF8F0 100%)" }}>
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
            background: privacy === "private" ? "linear-gradient(90deg,#555,#333)" : "linear-gradient(90deg,#ff4757,#ff6b81)",
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
              background: "rgba(255,248,240,0.95)",
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
              <button
  type="button"
  onClick={() => toggleEntryPrivacy(entry.id)}
  aria-label={entry.privacy === "private" ? "공개로 바꾸기" : "비공개로 바꾸기"}
  title={entry.privacy === "private" ? "비공개 상태" : "공개 상태"}
  className="rounded-full flex items-center justify-center transition-all"
  style={{
    width: 24,
    height: 24,
    fontSize: 12,
    background: entry.privacy === "private" ? "rgba(80,80,80,0.12)" : "rgba(255,128,64,0.14)",
    border: entry.privacy === "private" ? "1px solid rgba(80,80,80,0.22)" : "1px solid rgba(255,128,64,0.25)",
    cursor: "pointer",
  }}
>
  {entry.privacy === "private" ? "🔒" : "🔓"}
</button>
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
type FriendNeighbor = {
  id: number;
  name: string;
  color: string;
  avatar: LegacyAvatarConfig;
};

const AVATAR_PRESETS: LegacyAvatarConfig[] = [
  { hairDark: "#2a1060", hairLight: "#7040c0", skin: "#ffe0c8", outfit: "#ffe060", outfitDark: "#e0c030", outfitInner: "#fff8b0", pants: "#9060d0" },
  { hairDark: "#103060", hairLight: "#4080c0", skin: "#ffc8a0", outfit: "#80c8ff", outfitDark: "#5090d0", outfitInner: "#c0e8ff", pants: "#4060a0" },
  { hairDark: "#1a4030", hairLight: "#40a080", skin: "#ffd8b8", outfit: "#80e0b0", outfitDark: "#50c090", outfitInner: "#c0ffe0", pants: "#308060" },
  { hairDark: "#501030", hairLight: "#c04080", skin: "#ffc8a0", outfit: "#ff80c8", outfitDark: "#ff60b8", outfitInner: "#ffe0f4", pants: "#c06090" },
  { hairDark: "#3d1a00", hairLight: "#5c2800", skin: "#ffc8a0", outfit: "#c8a0ff", outfitDark: "#a080e0", outfitInner: "#e8d8ff", pants: "#6040a0" },
  { hairDark: "#402010", hairLight: "#804030", skin: "#ffe0c0", outfit: "#ffa880", outfitDark: "#e08060", outfitInner: "#ffe0c0", pants: "#804040" },
  { hairDark: "#204040", hairLight: "#408080", skin: "#ffd0b0", outfit: "#80e8ff", outfitDark: "#50c0d0", outfitInner: "#c0f8ff", pants: "#306070" },
  { hairDark: "#402060", hairLight: "#8040a0", skin: "#ffe8d0", outfit: "#ffb0d0", outfitDark: "#ff80a0", outfitInner: "#ffe0f0", pants: "#804080" },
];

/* ═══════════════════════════════════════════
   HOME RIGHT — MINI ROOM + NEIGHBORS
═══════════════════════════════════════════ */
const FRIEND_COLORS = ["#ffe060", "#80c8ff", "#80e0b0", "#ff80c8", "#c8a0ff", "#ffa880", "#80e8ff", "#ffb0d0"];

const INITIAL_NEIGHBORS: FriendNeighbor[] = [
  { id: 1, name: "별빛소녀", color: "#ffe060", avatar: AVATAR_PRESETS[0] },
  { id: 2, name: "하늘이",   color: "#80c8ff", avatar: AVATAR_PRESETS[1] },
  { id: 3, name: "민트초코", color: "#80e0b0", avatar: AVATAR_PRESETS[2] },
  { id: 4, name: "핑크몽",   color: "#ff80c8", avatar: AVATAR_PRESETS[3] },
];

type VisitMode = "miniroom" | "guest" | "diary";

function FriendVisitPage({ nb, onBack }: { nb: FriendNeighbor; onBack: () => void }) {
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
          style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 600, background: "rgba(122,143,212,0.1)", color: "#5a6db0" }}>
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
              color: mode === m.id ? "#fff" : "#5a6db0",
              border: mode === m.id ? "none" : "1px solid rgba(122,143,212,0.15)",
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
          <div className="relative flex flex-col p-2 h-full" style={{ border: `1.5px solid ${nb.color}44`, background: "#fafafc", borderRadius: 12, overflow: "hidden" }}>
            <RoomCanvas selections={EMPTY_ROOM_SELECTIONS} />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(255,255,255,0.88)", border: `1px solid ${nb.color}` }}>
              <NeighborAvatar avatar={nb.avatar} color={nb.color} size={18} showOnline={false} />
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", fontWeight: 700, color: "#6040a0" }}>{nb.name}의 방</span>
            </div>
          </div>
        )}
        {mode === "guest" && (
          <div className="h-full flex flex-col gap-2 p-3 rounded-xl overflow-y-auto" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${nb.color}33` }}>
            <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.33rem", color: "#7a8fd4" }}>방명록</p>
            {[
              { user: "Re:world ✦", msg: "항상 행복하게 지내요 🌸", date: "2026.06.20" },
              { user: "민트초코🍃", msg: "자주 놀러올게요 💚", date: "2026.06.18" },
            ].map((e, i) => (
              <div key={i} className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${nb.color}33` }}>
                <div className="flex justify-between mb-0.5">
                  <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.55rem", color: "#6040a0" }}>{e.user}</span>
                  <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#7a8fd4" }}>{e.date}</span>
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
          border: "2px solid rgba(122,143,212,0.25)",
          boxShadow: "0 8px 32px rgba(122,143,212,0.2)",
        }}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.35rem", color: "#7a8fd4" }}>♡</span>
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
            background: "rgba(255,255,255,0.9)", border: "1.5px solid rgba(122,143,212,0.2)", color: "#4a2060",
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-1.5 rounded-xl"
            style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 600, color: "#5a6db0", background: "rgba(122,143,212,0.08)" }}
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="flex-1 py-1.5 rounded-xl text-white"
            style={{
              fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 700,
              background: name.trim() ? "linear-gradient(90deg, #ff4757, #ff6b81)" : "rgba(122,143,212,0.25)",
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

function HomeRightPage({
  roomSelections,
  onDecorate,
}: {
  roomSelections: RoomSelections;
  onDecorate: () => void;
}) {
  const [neighbors, setNeighbors] = useState<FriendNeighbor[]>(INITIAL_NEIGHBORS);
  const [selectedFriend, setSelectedFriend] = useState<FriendNeighbor | null>(null);
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
    <div className="h-full overflow-y-auto flex flex-col gap-2 p-3 relative" style={{
      background: "linear-gradient(160deg, #f8f0ff 0%, #fff0f8 100%)",
      scrollbarWidth: "thin",
    }}>
      {showAddFriend && (
        <AddFriendModal onClose={() => setShowAddFriend(false)} onAdd={handleAddFriend} />
      )}

      {/* ① 게시판 */}
      <HomeBoardSection onExpand={() => {}} />

      {/* ② 미니룸 (compact) */}
      <div className="rounded-xl overflow-hidden flex-shrink-0 relative" style={{
        border: "1.5px solid rgba(255,110,180,0.25)",
        background: "#fafafc",
        boxShadow: "inset 0 2px 8px rgba(122,143,212,0.06)",
      }}>
        <RoomCanvas selections={roomSelections} />
        <div className="absolute top-1.5 left-2 flex items-center gap-1">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.32rem", color: "#5a6db0" }}>★ MINI ROOM</span>
        </div>
        <button
          onClick={onDecorate}
          className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded-full text-white"
          style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", fontWeight: 700, background: "linear-gradient(90deg,#ff4757,#ff6b81)" }}>
          꾸미기
        </button>
      </div>

      {/* ③ 친구 목록 — 정사각형 그리드 */}
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <div className="flex items-center justify-between flex-shrink-0">
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.35rem", color: "#7a8fd4" }}>이웃 ♡</span>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", color: "#5a6db0" }}>{neighbors.length}명</span>
        </div>
        <div>
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
            background: "linear-gradient(90deg, #ff4757, #ff6b81)",
            color: "white",
            boxShadow: "0 2px 10px rgba(122,143,212,0.3)",
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
function HomeBoardSection({ onExpand }: { onExpand: () => void }) {
  const [liked, setLiked] = useState<Set<number>>(new Set());
  return (
    <div className="rounded-xl overflow-hidden flex-shrink-0" style={{
      background: "rgba(255,255,255,0.75)",
      border: "1px solid rgba(122,143,212,0.15)",
      boxShadow: "0 2px 10px rgba(122,143,212,0.06)",
    }}>
      <div className="flex items-center justify-between px-2.5 py-1.5" style={{
        background: "linear-gradient(90deg, rgba(194,203,237,0.22), rgba(122,143,212,0.1))",
        borderBottom: "1px solid rgba(122,143,212,0.12)",
      }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "#7a8fd4" }}>게시판 💬</span>
        <button onClick={onExpand}
          className="w-5 h-5 rounded-full flex items-center justify-center text-white"
          style={{ background: "linear-gradient(135deg, #ff4757, #ff6b81)", fontSize: 12, fontWeight: 700 }}>+</button>
      </div>
      {BOARD_POSTS.map((post, i) => (
        <div key={post.id} className="px-2.5 py-1.5 flex flex-col gap-0.5" style={{
          borderBottom: i < BOARD_POSTS.length - 1 ? "1px solid rgba(122,143,212,0.08)" : "none",
        }}>
          <div className="flex items-center justify-between">
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.5rem", color: "#7040a0" }}>{post.user}</span>
            <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#7a8fd4" }}>{post.time}</span>
          </div>
          <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.55rem", color: "#5a3080", lineHeight: 1.4,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.content}</p>
          <button onClick={() => setLiked(prev => { const n = new Set(prev); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
            className="self-start flex items-center gap-0.5"
            style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.45rem", color: liked.has(post.id) ? "#ff2d78" : "#7a8fd4", fontWeight: 600 }}>
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
    <div className="h-full flex flex-col gap-2 p-3" style={{ background: "linear-gradient(160deg, #f4f6fc 0%, #C2CBED 100%)" }}>
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(122,143,212,0.2)" }}>
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.42rem", color: "#7a8fd4" }}>게시판 💬</span>
        <button onClick={onBack} className="px-2 py-0.5 rounded-full" style={{
          fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", fontWeight: 600,
          background: "rgba(122,143,212,0.1)", color: "#5a6db0",
        }}>← 닫기</button>
      </div>
      <div className="flex gap-1.5 flex-shrink-0">
        <input value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="글 남기기 ✨"
          className="flex-1 px-2 py-1.5 rounded-xl outline-none"
          style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", color: "#5a3080", background: "rgba(255,255,255,0.8)", border: "1px solid rgba(122,143,212,0.2)" }} />
        <button onClick={submit} className="px-3 rounded-xl text-white"
          style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 700, background: "linear-gradient(90deg,#ff4757,#ff6b81)" }}>등록</button>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5" style={{ minHeight: 0 }}>
        {posts.map((post, i) => (
          <motion.div key={post.id} className="rounded-xl p-2.5"
            style={{ background: "rgba(255,255,255,0.75)", border: "1px solid rgba(122,143,212,0.12)" }}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <div className="flex justify-between mb-0.5">
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: "0.55rem", color: "#7040a0" }}>{post.user}</span>
              <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#7a8fd4" }}>{post.time}</span>
            </div>
            <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.58rem", color: "#5a3080", lineHeight: 1.5, marginBottom: 4 }}>{post.content}</p>
            <button onClick={() => setLiked(prev => { const n = new Set(prev); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
              style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.48rem", color: liked.has(post.id) ? "#ff2d78" : "#7a8fd4", fontWeight: 600 }}>
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
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{ background: "linear-gradient(160deg, #f4f6fc 0%, #C2CBED 100%)" }}>
      {/* bulletin board */}
      <HomeBoardSection onExpand={() => setShowBoard(true)} />

      {/* divider */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to right,transparent,rgba(122,143,212,0.3))" }} />
        <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.3rem", color: "#7a8fd4" }}>MY INFO</span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to left,transparent,rgba(122,143,212,0.3))" }} />
      </div>

      {/* compact avatar card */}
      <div className="rounded-xl p-2 flex gap-2 items-center flex-shrink-0" style={{
        background: "linear-gradient(135deg,rgba(194,203,237,0.35),rgba(122,143,212,0.1))",
        border: "1px solid rgba(255,110,180,0.2)",
      }}>
        <div className="rounded-lg overflow-hidden flex-shrink-0" style={{
          width: 44, height: 50,
          background: "linear-gradient(135deg,#ffe0f4,#e8d0ff)",
          border: "1.5px solid rgba(122,143,212,0.28)",
        }}>
          <div style={{ transform: "scale(0.6)", transformOrigin: "top left", width: "167%", height: "167%" }}>
            <PixelAvatar />
          </div>
        </div>
        <div>
          <p style={{ fontFamily: 'Great Vibes, Comic Sans MS, Malgun Gothic, sans-serif', fontSize: '1.3rem', color: 'rgb(212, 0, 106)', lineHeight: '1.1' }}>Re:world</p>
          <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", color: "#5a6db0" }}>일상 기록중 🌸</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: "#4cda64" }} />
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#70a060" }}>온라인</span>
        </div>
      </div>

      {/* music player compact */}
      <div className="rounded-xl p-2 flex items-center gap-2 flex-shrink-0" style={{
        background: "linear-gradient(90deg,rgba(194,203,237,0.15),rgba(122,143,212,0.08))",
        border: "1px solid rgba(255,80,180,0.18)",
      }}>
        <button onClick={() => setIsPlaying(!isPlaying)}
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#ff4757,#ff6b81)", boxShadow: "0 1px 6px rgba(255,45,120,0.35)" }}>
          <span style={{ color: "white", fontSize: 9, paddingLeft: isPlaying ? 0 : 1 }}>{isPlaying ? "⏸" : "▶"}</span>
        </button>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.52rem", fontWeight: 700, color: "#5a6db0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            ♪ Lovefool - The Cardigans
          </p>
          <div className="mt-0.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(122,143,212,0.15)" }}>
            <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#ff4757,#ff6b81)" }}
              animate={isPlaying ? { width: ["30%","80%"] } : { width: "30%" }}
              transition={isPlaying ? { duration: 20, ease: "linear" } : {}} />
          </div>
        </div>
      </div>

      {/* visitor count */}
      <div className="rounded-xl px-2.5 py-1.5 flex items-center justify-between flex-shrink-0" style={{
        background: "linear-gradient(90deg,rgba(194,203,237,0.22),rgba(122,143,212,0.1))",
        border: "1px solid rgba(255,110,180,0.18)",
      }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 12 }}>👣</span>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.33rem", color: "#5a6db0" }}>TODAY</span>
        </div>
        <div className="flex items-center gap-0.5">
          {["0","1","2","8"].map((d,i) => (
            <div key={i} className="w-4 h-5 rounded flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#ff4757,#ff6b81)" }}>
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "0.38rem", color: "white" }}>{d}</span>
            </div>
          ))}
        </div>
        <span style={{ fontFamily: "'Quicksand', sans-serif", fontSize: "0.42rem", color: "#7a8fd4" }}>전체 <b style={{ color: "#ff4757" }}>1,247</b></span>
      </div>
    </div>
  );
}

function RightPage({
  activeTab,
  roomSelections,
  setRoomSelections,
  onNavigateTab,
  avatar,
  onSaveAvatar,
}: {
  activeTab: string;
  roomSelections: RoomSelections;
  setRoomSelections: Dispatch<SetStateAction<RoomSelections>>;
  onNavigateTab: (tab: string) => void;
  avatar: AvatarProfile;
  onSaveAvatar: (avatar: AvatarProfile) => void;
}) {
  if (activeTab === "profile") return <ProfileAvatarPage avatar={avatar} onSaveAvatar={onSaveAvatar} />;
  if (activeTab === "photo") return <PhotoPage />;
  if (activeTab === "guest") return <GuestbookPage />;
  if (activeTab === "emoticon") return <EmoticonRoomPage />;
  if (activeTab === "diary") return <DiaryPage />;
  if (activeTab === "home") return <HomeRightPage roomSelections={roomSelections} onDecorate={() => onNavigateTab("miniroom")} />;
  if (activeTab === "miniroom") return <MiniRoomPage selections={roomSelections} setSelections={setRoomSelections} />;
  return null;
}

/* ═══════════════════════════════════════════
   SPREAD PAGE
═══════════════════════════════════════════ */
function SpreadPage({ user, onClose, onLogout, onUserUpdate }: { user: User; onClose: () => void; onLogout?: () => void; onUserUpdate: (user: User) => void }) {
  const [avatar, setAvatar] = useState<AvatarProfile>(DEFAULT_AVATAR_PROFILE);
  const [activeTab, setActiveTab] = useState("home");
  const [roomSelections, setRoomSelections] = useState<RoomSelections>(() => loadRoomSelections());

  useEffect(() => {
    saveRoomSelections(roomSelections);
  }, [roomSelections]);

  return (
    <div className="size-full flex items-center justify-center overflow-auto" style={{
      background: "linear-gradient(135deg, #C2CBED 0%, #b8c4e8 40%, #d0d8f4 100%)",
    }}>
      {/* ambient */}
      <div className="absolute pointer-events-none" style={{
        width: 600, height: 400, top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(ellipse, rgba(122,143,212,0.14) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />

      {/* book spread — fixed size */}
      <motion.div
        className="relative flex flex-shrink-0"
        style={{
          width: DIARY_SPREAD_W,
          height: DIARY.pageH,
          boxShadow: "0 20px 80px rgba(90,109,176,0.22), 0 4px 20px rgba(122,143,212,0.18)",
        }}
        initial={{ scaleX: 0.3, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* LEFT PAGE */}
        <div style={{
          width: DIARY.pageW,
          height: DIARY.pageH,
          borderRadius: "8px 0 0 8px",
          overflow: "hidden",
          boxShadow: "inset -4px 0 12px rgba(0,0,0,0.06)",
          flexShrink: 0,
        }}>
          <LeftPage user={user} avatar={avatar} onUserUpdate={onUserUpdate} />
        </div>

        {/* SPINE */}
        <div style={{
          width: DIARY.spineW,
          height: DIARY.pageH,
          background: "linear-gradient(to right, #b8c4e8, #9aa8d8, #b8c4e8)",
          boxShadow: "2px 0 8px rgba(0,0,0,0.08), -2px 0 8px rgba(0,0,0,0.08)",
          flexShrink: 0,
        }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="mx-auto mt-3 w-1.5 h-1.5 rounded-full" style={{
              background: i % 3 === 0 ? "#7a8fd4" : "rgba(255,255,255,0.45)",
            }} />
          ))}
        </div>

        {/* RIGHT PAGE */}
        <div style={{
          width: DIARY.pageW,
          height: DIARY.pageH,
          overflow: "hidden",
          boxShadow: "inset 4px 0 12px rgba(0,0,0,0.04)",
          flexShrink: 0,
        }}>
          <RightPage
            activeTab={activeTab}
            roomSelections={roomSelections}
            setRoomSelections={setRoomSelections}
            onNavigateTab={setActiveTab}
            avatar={avatar}
            onSaveAvatar={setAvatar}
          />
        </div>

        {/* BOOKMARK TABS on far right */}
        <div className="flex flex-col" style={{ flexShrink: 0 }}>
          {TABS.map((tab, i) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center justify-center"
              style={{
                width: DIARY.tabW,
                height: DIARY.pageH / TABS.length,
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
                color: activeTab === tab.id ? "#fff" : "rgba(61,74,122,0.78)",
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
            background: "linear-gradient(135deg, #5a6db0, #7a8fd4)",
            boxShadow: "0 2px 10px rgba(90,109,176,0.35)",
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
              color: "#5a6db0",
              background: "rgba(255,255,255,0.88)",
              border: "1px solid rgba(122,143,212,0.3)",
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
