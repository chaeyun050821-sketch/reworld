import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const root = path.resolve(".");

function gitShow(ref, file) {
  return execSync(`git show ${ref}:${file}`, { encoding: "utf8", cwd: root }).replace(/\r\n/g, "\n");
}

const chaeyunApp = gitShow("HEAD", "src/app/App.tsx");
const refactorApp = gitShow("origin/refactor-avatar-photo-sticker-flows", "src/app/App.tsx");
const chaeyunData = gitShow("HEAD", "src/app/data.ts").replace(/\r\n/g, "\n");
const refactorData = gitShow("origin/refactor-avatar-photo-sticker-flows", "src/app/data.ts").replace(/\r\n/g, "\n");

function section(src, title) {
  const needle = `   ${title}\n`;
  const start = src.indexOf(needle);
  if (start === -1) throw new Error(`Section not found: ${title}`);
  const blockStart = src.lastIndexOf("/* ═", start);
  const next = src.indexOf("\n/* ═", start + needle.length);
  return src.slice(blockStart, next === -1 ? src.length : next);
}

function replacePeriwinkle(text) {
  return text
    .replace(/linear-gradient\(135deg, #fce4f8 0%, #f0d0ff 40%, #ffd4f0 100%\)/g,
      "linear-gradient(135deg, #C2CBED 0%, #b8c4e8 40%, #d0d8f4 100%)")
    .replace(/linear-gradient\(160deg, #fff5fd 0%, #f0e8ff 100%\)/g,
      "linear-gradient(160deg, #f4f6fc 0%, #C2CBED 100%)");
}

function ivoryDiary(text) {
  return text
    .replace(/#fffef0/g, "#FFF8F0")
    .replace(/#fffde8/g, "#FFF8F0")
    .replace(/#fffef8/g, "#FFFDF8")
    .replace(/#fff8e8/g, "#FFF8F0");
}

/* ── data.ts ── */
const refactorTypes = refactorData.slice(
  refactorData.indexOf("export type TabConfig"),
  refactorData.indexOf("export const TABS"),
);

const refactorAppConstants = refactorData.slice(
  refactorData.indexOf("export const INIT_FIELDS"),
);

const chaeyunTabs = `export const TABS: TabConfig[] = [
  { id: "home", label: "홈", color: "#ff80c8", active: true },
  { id: "profile", label: "아바타", color: "#c8a0ff", active: false },
  { id: "diary", label: "다이어리", color: "#80c8ff", active: false },
  { id: "miniroom", label: "미니룸", color: "#80e0b0", active: false },
  { id: "photo", label: "사진첩", color: "#ffe080", active: false },
  { id: "guest", label: "방명록", color: "#ffa880", active: false },
  { id: "emoticon", label: "이모티콘룸", color: "#ff80a0", active: false },
];

`;

const mergedData =
  chaeyunData.replace(
    'const ROOM_STORAGE_KEY = "diary-miniroom-selections";',
    `${refactorTypes}\nconst ROOM_STORAGE_KEY = "diary-miniroom-selections";`,
  ) +
  "\n\n/* ── App constants ── */\n" +
  chaeyunTabs +
  refactorAppConstants;

fs.writeFileSync(path.join(root, "src/app/data.ts"), mergedData, "utf8");

/* ── App.tsx ── */
const legacyAvatar = section(chaeyunApp, "PIXEL AVATAR SVG")
  .replace("type AvatarConfig", "type LegacyAvatarConfig")
  .replace("const DEFAULT_AVATAR:", "const DEFAULT_LEGACY_AVATAR:")
  .replace("config = DEFAULT_AVATAR", "config = DEFAULT_LEGACY_AVATAR")
  .replace("config?: AvatarConfig", "config?: LegacyAvatarConfig")
  .replace("function PixelAvatar", "function LegacyPixelAvatar")
  .replace("avatar: AvatarConfig", "avatar: LegacyAvatarConfig")
  .replace("<PixelAvatar config={avatar}", "<LegacyPixelAvatar config={avatar}");

const refactorAvatar = section(refactorApp, "PIXEL AVATAR SVG");
const refactorPhoto = section(refactorApp, "RIGHT PAGE — PHOTO ALBUM");

const chaeyunProfileEmoticon = section(chaeyunApp, "RIGHT PAGE — PHOTO ALBUM").includes("PROFILE AVATAR")
  ? ""
  : section(chaeyunApp, "PROFILE AVATAR CUSTOMIZER") + section(chaeyunApp, "EMOTICON ROOM");

// chaeyun has PROFILE AVATAR + EMOTICON between photo and guestbook
const refactorProfileEmoticon =
  section(chaeyunApp, "PROFILE AVATAR CUSTOMIZER").replace(
    section(chaeyunApp, "PROFILE AVATAR CUSTOMIZER"),
    "",
  );

// Extract refactor profile+emoticon from chaeyun structure - use refactor photo section tail
// Refactor bundles: photo, profile, emoticon, guestbook, diary in one flow
// Get from refactor: from after MINI ROOM to HOME LEFT
const refactorMiddle = (() => {
  const start = refactorApp.indexOf("   RIGHT PAGE — PHOTO ALBUM");
  const end = refactorApp.indexOf("   HOME LEFT PAGE (with board)");
  return refactorApp.slice(refactorApp.lastIndexOf("/* ═", start), end);
})();

const guestbook = section(chaeyunApp, "RIGHT PAGE — GUESTBOOK")
  .replace(/type Neighbor = \{[\s\S]*?\};\n\n/, "")
  .replace(/const AVATAR_PRESETS: AvatarConfig\[\]/, "const AVATAR_PRESETS: LegacyAvatarConfig[]")
  .replace(/avatar: AvatarConfig/g, "avatar: LegacyAvatarConfig");

const miniRoomPage = section(chaeyunApp, "RIGHT PAGE — MINI ROOM (Slot-based)");
const diary = ivoryDiary(section(chaeyunApp, "DIARY PAGE")
  .replace(/const WEATHER_OPTIONS = \[[^\]]+\];\n/, "")
  .replace(/const STICKER_OPTIONS = \[[^\]]+\];\n/, "")
  .replace(/const INIT_ENTRIES[^;]+;\n/, ""));

const homeRight = section(chaeyunApp, "HOME RIGHT — MINI ROOM + NEIGHBORS")
  .replace(/type Neighbor = \{[\s\S]*?\};\n\n/, "")
  .replace(/const AVATAR_PRESETS: AvatarConfig\[\][\s\S]*?\];\n\n/, "");

const homeLeft = section(chaeyunApp, "HOME LEFT — BULLETIN BOARD + PROFILE")
  .replace(/const BOARD_POSTS = \[[\s\S]*?\];\n\n/, "");

const homeLeftPage = section(chaeyunApp, "HOME LEFT PAGE (with board)");

const mergedLeftPage = `/* ═══════════════════════════════════════════
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

`;

const mergedRightPage = `function RightPage({
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

`;

let spreadPage = replacePeriwinkle(section(chaeyunApp, "SPREAD PAGE"));
spreadPage = spreadPage.replace(
  "function SpreadPage({ user, onClose, onLogout, onUserUpdate }: { user: User; onClose: () => void; onLogout?: () => void; onUserUpdate: (user: User) => void }) {",
  "function SpreadPage({ user, onClose, onLogout, onUserUpdate }: { user: User; onClose: () => void; onLogout?: () => void; onUserUpdate: (user: User) => void }) {\n  const [avatar, setAvatar] = useState<AvatarProfile>(DEFAULT_AVATAR_PROFILE);",
);
spreadPage = spreadPage.replace(
  "<LeftPage user={user} onUserUpdate={onUserUpdate} />",
  "<LeftPage user={user} avatar={avatar} onUserUpdate={onUserUpdate} />",
);
spreadPage = spreadPage.replace(
  `onNavigateTab={setActiveTab}
          />`,
  `onNavigateTab={setActiveTab}
            avatar={avatar}
            onSaveAvatar={setAvatar}
          />`,
);
spreadPage = spreadPage.replace("function RightPage({", mergedRightPage + "function _RemovedRightPage({");

// Remove old RightPage from spread - it's before SPREAD PAGE in chaeyun
const oldRightPage = section(chaeyunApp, "SPREAD PAGE");
// RightPage is defined just before SPREAD in chaeyun - extract and skip
const chaeyunBeforeSpread = (() => {
  const idx = chaeyunApp.indexOf("function RightPage({");
  const spreadIdx = chaeyunApp.indexOf("   SPREAD PAGE");
  return chaeyunApp.slice(0, idx) + chaeyunApp.slice(spreadIdx);
})();

const layoutBlock = chaeyunBeforeSpread.slice(
  chaeyunBeforeSpread.indexOf("/* ═"),
  chaeyunBeforeSpread.indexOf("   PIXEL AVATAR SVG"),
);

const coverBlock = replacePeriwinkle(section(chaeyunApp, "COVER PAGE"));
const miniRoomBlock = section(chaeyunApp, "MINI ROOM SVG — Slot-based interior");

// Profile + emoticon from chaeyun (between photo and guestbook) - replace with refactor middle
const chaeyunPhotoOnly = section(chaeyunApp, "RIGHT PAGE — PHOTO ALBUM");
// Use refactor's full photo+profile+emoticon+guestbook+diary block, but keep chaeyun guestbook/diary/miniroom

const refactorPhotoToDiary = (() => {
  const s = refactorApp.indexOf("   RIGHT PAGE — PHOTO ALBUM");
  const e = refactorApp.indexOf("   HOME LEFT PAGE (with board)");
  return refactorApp.slice(refactorApp.lastIndexOf("/* ═", s), e);
})();

// Split refactor block: take photo+profile+emoticon, skip guestbook+diary (use chaeyun)
const refactorPhotoProfileEmoticon = (() => {
  const block = refactorPhotoToDiary;
  const guestStart = block.indexOf("   RIGHT PAGE — GUESTBOOK") !== -1
    ? block.indexOf("   RIGHT PAGE — GUESTBOOK")
    : block.indexOf("function GuestbookPage");
  if (guestStart === -1) {
    // refactor may not have guestbook section title - find GuestbookPage
    const gs = block.indexOf("function GuestbookPage");
    return gs === -1 ? block : block.slice(0, block.lastIndexOf("/* ═", gs));
  }
  return block.slice(0, block.lastIndexOf("/* ═", guestStart));
})();

const neighborTypes = section(chaeyunApp, "HOME RIGHT — MINI ROOM + NEIGHBORS").match(/type Neighbor = \{[\s\S]*?\};\n\nconst AVATAR_PRESETS[\s\S]*?\];\n\n/)?.[0] ?? "";

const mergedImports = `import { useState, useEffect, type Dispatch, type SetStateAction, type CSSProperties, type DragEvent, type ReactNode } from "react";
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
  type TabConfig,
  type RoomCategoryId,
  type RoomSelections,
  type PixelRect,
} from "./data";
import { useSharedPhotos } from "./hooks/useSharedPhotos";
import { formatDiaryDisplayDate, formatDottedDate, formatIsoDate } from "./utils/date";

`;

const mergedApp =
  mergedImports +
  layoutBlock +
  coverBlock +
  legacyAvatar +
  refactorAvatar +
  miniRoomBlock +
  mergedLeftPage +
  refactorPhotoProfileEmoticon +
  guestbook +
  miniRoomPage +
  diary +
  neighborTypes +
  homeRight +
  homeLeft +
  homeLeftPage +
  mergedRightPage +
  spreadPage +
  section(chaeyunApp, "ROOT");

fs.writeFileSync(path.join(root, "src/app/App.tsx"), mergedApp, "utf8");
console.log("Merge complete.");
