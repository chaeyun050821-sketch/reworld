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
  icon: string;
  label: string;
  color: string;
  category: string;
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
  { id: "home", label: "홈", color: "#d8c49b", active: true },
  { id: "profile", label: "아바타", color: "#c9b27f", active: false },
  { id: "diary", label: "다이어리", color: "#b8ab89", active: false },
  { id: "miniroom", label: "미니룸", color: "#aeb79b", active: false },
  { id: "photo", label: "사진첩", color: "#e4d4a8", active: false },
  { id: "guest", label: "방명록", color: "#c9a878", active: false },
  { id: "emoticon", label: "이모티콘룸", color: "#d6c7a4", active: false },
];

export const INIT_FIELDS: ProfileField[] = [
  { label: "이름", value: "Re:world ✦" },
  { label: "생일", value: "2000.00.00 🎂" },
  { label: "지역", value: "서울 ☁️" },
  { label: "관심사", value: "음악, 일러스트" },
];

export const AVATAR_ITEMS: AvatarItem[] = [
  { id: "face-blush", cat: "얼굴", emoji: "", label: "블러셔", color: "#d99a86" },
  { id: "face-glasses", cat: "얼굴", emoji: "", label: "픽셀 안경", color: "#5b4b2d" },
  { id: "face-freckle", cat: "얼굴", emoji: "", label: "주근깨", color: "#9b6a3c" },
  { id: "face-mask", cat: "얼굴", emoji: "", label: "마스크", color: "#f7efd9" },
  { id: "outfit-cardigan", cat: "의상", emoji: "", label: "아이보리 가디건", color: "#ead8b5" },
  { id: "outfit-sage", cat: "의상", emoji: "", label: "세이지 니트", color: "#b8c0a0" },
  { id: "outfit-ribbon", cat: "의상", emoji: "", label: "리본 타이", color: "#b08a4a" },
  { id: "outfit-pinktee", cat: "의상", emoji: "", label: "핑크 티셔츠", color: "#e58aa8" },
  { id: "outfit-denim", cat: "의상", emoji: "", label: "데님 멜빵", color: "#6f8fb8" },
  { id: "emote-heart", cat: "기타", emoji: "", label: "하트 픽셀", color: "#d8a878" },
  { id: "emote-sparkle", cat: "기타", emoji: "", label: "반짝 픽셀", color: "#e4d4a8" },
  { id: "emote-note", cat: "기타", emoji: "", label: "음표 픽셀", color: "#8b9a72" },
  { id: "other-sneakers", cat: "기타", emoji: "", label: "스니커즈", color: "#f7efd9" },
  { id: "other-crown", cat: "악세사리", emoji: "", label: "크라운", color: "#d4b45f" },
  { id: "other-flower", cat: "악세사리", emoji: "", label: "꽃핀", color: "#d8c49b" },
  { id: "other-bag", cat: "악세사리", emoji: "", label: "미니백", color: "#c9a878" },
  { id: "other-headband", cat: "악세사리", emoji: "", label: "헤어밴드", color: "#d8a878" },
  { id: "other-scarf", cat: "악세사리", emoji: "", label: "스카프", color: "#8b9a72" },
];

export const PIXEL_COLS = 32;
export const PIXEL_ROWS = 48;

export const PALETTE = [
  "#ffffff",
  "#f8fafc",
  "#e5e7eb",
  "#9ca3af",
  "#111827",
  "#2d1a00",
  "#7f1d1d",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#fde047",
  "#84cc16",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#f9a8d4",
  "#fecdd3",
  "#fed7aa",
  "#fde68a",
  "#bbf7d0",
  "#bae6fd",
  "#ddd6fe",
  "#b08a4a",
  "#8b9a72",
  "#d8c49b",
  "#e4d4a8",
  "#f7efd9",
  "#c8d0b0",
  "#ead3a1",
  "#c9b27f",
  "#b8ab89",
];

export const SAMPLE_EMOTICONS: Emoticon[] = [
  { id: 1, icon: "cool-face", label: "쿨픽셀", color: "#8b9a72", category: "감정" },
  { id: 2, icon: "teary-face", label: "눈물톡", color: "#80c8ff", category: "감정" },
  { id: 3, icon: "sparkle-face", label: "반짝눈", color: "#d8c49b", category: "감정" },
  { id: 4, icon: "angry-face", label: "으쌰!", color: "#d99a86", category: "감정" },
  { id: 5, icon: "ribbon-hat", label: "리본모자", color: "#d8a878", category: "모자" },
  { id: 6, icon: "crown-hat", label: "왕관", color: "#d4b45f", category: "모자" },
  { id: 7, icon: "cardigan", label: "가디건", color: "#ead8b5", category: "의상" },
  { id: 8, icon: "sailor-outfit", label: "스쿨룩", color: "#8b9a72", category: "의상" },
  { id: 9, icon: "pixel-glasses", label: "안경", color: "#5b4b2d", category: "악세사리" },
  { id: 10, icon: "mini-bag", label: "미니백", color: "#c9a878", category: "악세사리" },
  { id: 11, icon: "love-heart", label: "하트톡", color: "#d86f86", category: "하트" },
  { id: 12, icon: "double-heart", label: "두근", color: "#e58aa8", category: "하트" },
];

export const PHOTO_BOOTH_GRADIENTS = [
  "linear-gradient(135deg,#fff8e8,#d8c49b)",
  "linear-gradient(135deg,#f7efd9,#b8c0a0)",
  "linear-gradient(135deg,#f5e7c7,#c9a878)",
  "linear-gradient(135deg,#fffaf0,#e4d4a8)",
  "linear-gradient(135deg,#ead3a1,#b08a4a)",
];

export const INITIAL_ENTRIES: GuestbookEntry[] = [
  { id: 1, name: "별빛소녀✨", msg: "다이어리 너무 예뻐요!! 자주 올게요 🌸", date: "2026.06.22", color: "#d8c49b" },
  { id: 2, name: "하늘이💙", msg: "오늘도 행복한 하루 보내요~~ 또 놀러올게용", date: "2026.06.21", color: "#80c8ff" },
  { id: 3, name: "민트초코🍃", msg: "Y2K 감성 너무 좋다!! bgm도 최고야 ㅠㅠ💜", date: "2026.06.20", color: "#80e0b0" },
];

export const GUESTBOOK_COLORS = ["#d8c49b", "#c9b27f", "#b8ab89", "#aeb79b", "#e4d4a8", "#c9a878"];

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
  { id: 4, name: "크림몽", emoji: "🎀", color: "#d8c49b" },
];

export const BOARD_POSTS: BoardPost[] = [
  { id: 1, user: "별빛소녀✨", content: "오늘 새로 산 픽셀 캐릭터 어때요?? 💖", likes: 24, time: "5분 전" },
  { id: 2, user: "민트초코🍃", content: "Re:world 다이어리 테마 너무 예쁘다ㅠ 저도 써보고 싶어요!", likes: 18, time: "12분 전" },
  { id: 3, user: "하늘이💙", content: "오늘 날씨 너무 좋아서 기분 최고 ☀️ 모두 좋은 하루 보내요~", likes: 31, time: "28분 전" },
];
