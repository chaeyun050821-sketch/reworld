export type TabConfig = {
  id: string;
  label: string;
  color: string;
  active: boolean;
};

export type ProfileField = {
  label: string;
  value: string;
};

export type AvatarItem = {
  id: string;
  cat: string;
  emoji: string;
  label: string;
  color: string;
};

export type Emoticon = {
  id: number;
  emoji: string;
  label: string;
};

export type GuestbookEntry = {
  id: number;
  name: string;
  msg: string;
  date: string;
  color: string;
};

export type Privacy = "public" | "private";

export type DiaryEntry = {
  id: number;
  date: string;
  weather: string;
  privacy: Privacy;
  content: string;
  stickers: string[];
};

export type Neighbor = {
  id: number;
  name: string;
  emoji: string;
  color: string;
};

export type VisitMode = "miniroom" | "guest" | "diary";

export type BoardPost = {
  id: number;
  user: string;
  content: string;
  likes: number;
  time: string;
};

export const TABS: TabConfig[] = [
  { id: "home", label: "홈", color: "#ff80c8", active: true },
  { id: "profile", label: "프로필", color: "#c8a0ff", active: false },
  { id: "diary", label: "다이어리", color: "#80c8ff", active: false },
  { id: "miniroom", label: "미니룸", color: "#80e0b0", active: false },
  { id: "photo", label: "사진첩", color: "#ffe080", active: false },
  { id: "guest", label: "방명록", color: "#ffa880", active: false },
  { id: "emoticon", label: "이모티콘룸", color: "#ff80a0", active: false },
];

export const INIT_FIELDS: ProfileField[] = [
  { label: "이름", value: "Re:world ✦" },
  { label: "생일", value: "2000.00.00 🎂" },
  { label: "지역", value: "서울 ☁️" },
  { label: "관심사", value: "음악, 일러스트" },
];

export const AVATAR_ITEMS: AvatarItem[] = [
  { id: "hat1", cat: "모자", emoji: "🎀", label: "리본 모자", color: "#ff80c8" },
  { id: "hat2", cat: "모자", emoji: "👑", label: "크라운", color: "#ffe060" },
  { id: "top1", cat: "상의", emoji: "👚", label: "핑크 후디", color: "#ffb0d0" },
  { id: "top2", cat: "상의", emoji: "🎽", label: "보라 조끼", color: "#c8a0ff" },
  { id: "acc1", cat: "악세서리", emoji: "💎", label: "목걸이", color: "#80e8ff" },
  { id: "acc2", cat: "악세서리", emoji: "⭐", label: "별 귀걸이", color: "#ffe060" },
  { id: "acc3", cat: "악세서리", emoji: "🌸", label: "꽃 핀", color: "#ff80c8" },
  { id: "shoes1", cat: "신발", emoji: "👟", label: "스니커즈", color: "#c8a0ff" },
];

export const PIXEL_COLS = 16;
export const PIXEL_ROWS = 16;

export const PALETTE = [
  "#ff2d78",
  "#c44dff",
  "#ff80c8",
  "#ffe060",
  "#80c8ff",
  "#80e0b0",
  "#ffffff",
  "#3d1a00",
  "#000000",
  "#f9a0e8",
  "#b0f0ff",
  "#ffb0d0",
];

export const SAMPLE_EMOTICONS: Emoticon[] = [
  { id: 1, emoji: "😎", label: "쿨가이" },
  { id: 2, emoji: "🥺", label: "눈물눈물" },
  { id: 3, emoji: "💅", label: "우아해" },
  { id: 4, emoji: "🤩", label: "반짝반짝" },
  { id: 5, emoji: "😤", label: "으쌰으쌰" },
];

export const PHOTO_BOOTH_GRADIENTS = [
  "linear-gradient(135deg,#ffb3e8,#c8a0ff)",
  "linear-gradient(135deg,#a0e8ff,#80c8ff)",
  "linear-gradient(135deg,#ffe080,#ffb040)",
  "linear-gradient(135deg,#80e0b0,#40c080)",
  "linear-gradient(135deg,#ff80c8,#ff2d78)",
];

export const INITIAL_ENTRIES: GuestbookEntry[] = [
  { id: 1, name: "별빛소녀✨", msg: "다이어리 너무 예뻐요!! 자주 올게요 🌸", date: "2026.06.22", color: "#ff80c8" },
  { id: 2, name: "하늘이💙", msg: "오늘도 행복한 하루 보내요~~ 또 놀러올게용", date: "2026.06.21", color: "#80c8ff" },
  { id: 3, name: "민트초코🍃", msg: "Y2K 감성 너무 좋다!! bgm도 최고야 ㅠㅠ💜", date: "2026.06.20", color: "#80e0b0" },
];

export const GUESTBOOK_COLORS = ["#ff80c8", "#c8a0ff", "#80c8ff", "#80e0b0", "#ffe080", "#ffa880"];

export const WEATHER_OPTIONS = ["☀️", "🌤️", "⛅", "🌧️", "⛈️", "❄️", "🌈", "🌙"];
export const STICKER_OPTIONS = ["🌸", "⭐", "💖", "🎀", "✨", "🦋", "🍀", "🌙", "💫", "🎵", "🌺", "💝"];

export const INIT_ENTRIES: DiaryEntry[] = [
  { id: 1, date: "2026-06-22", weather: "🌸", privacy: "public", content: "오늘은 날씨가 너무 좋았다. 카페에서 라떼 마시면서 음악 들었는데 너무 행복했어 ☕✨", stickers: ["💖", "🎵"] },
  { id: 2, date: "2026-06-19", weather: "🌧️", privacy: "private", content: "비 오는 날엔 괜히 감성적이 돼. 창밖 빗소리 들으면서 일기 썼다. 이런 날이 오히려 좋아.", stickers: ["🌙"] },
  { id: 3, date: "2026-06-15", weather: "☀️", privacy: "public", content: "친구들이랑 한강 나갔다! 사진도 많이 찍고 웃음이 넘쳤던 하루였어 🌻💛", stickers: ["✨", "🌸", "💖"] },
];

export const NEIGHBORS: Neighbor[] = [
  { id: 1, name: "별빛소녀", emoji: "🌟", color: "#ffe060" },
  { id: 2, name: "하늘이", emoji: "💙", color: "#80c8ff" },
  { id: 3, name: "민트초코", emoji: "🍃", color: "#80e0b0" },
  { id: 4, name: "핑크몽", emoji: "🎀", color: "#ff80c8" },
];

export const BOARD_POSTS: BoardPost[] = [
  { id: 1, user: "별빛소녀✨", content: "오늘 새로 산 픽셀 캐릭터 어때요?? 💖", likes: 24, time: "5분 전" },
  { id: 2, user: "민트초코🍃", content: "Re:world 다이어리 테마 너무 예쁘다ㅠ 저도 써보고 싶어요!", likes: 18, time: "12분 전" },
  { id: 3, user: "하늘이💙", content: "오늘 날씨 너무 좋아서 기분 최고 ☀️ 모두 좋은 하루 보내요~", likes: 31, time: "28분 전" },
];
