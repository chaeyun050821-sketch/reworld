export type DiaryThemeId =
  | "periwinkle"
  | "pink"
  | "mint"
  | "lavender"
  | "peach"
  | "sky"
  | "rose"
  | "lemon"
  | "sage";

export const DIARY_THEME_IDS: DiaryThemeId[] = [
  "periwinkle",
  "pink",
  "mint",
  "lavender",
  "peach",
  "sky",
  "rose",
  "lemon",
  "sage",
];

export function isDiaryThemeId(value: string | null | undefined): value is DiaryThemeId {
  return !!value && DIARY_THEME_IDS.includes(value as DiaryThemeId);
}

export type DiaryTheme = {
  id: DiaryThemeId;
  label: string;
  swatch: string;
  main: string;
  light: string;
  lighter: string;
  lightest: string;
  soft: string;
  soft2: string;
  muted: string;
  mid: string;
  dark: string;
  text: string;
  card: string;
  surface: string;
  midRgb: string;
  darkRgb: string;
  mainRgb: string;
};

export const DEFAULT_DIARY_THEME_ID: DiaryThemeId = "periwinkle";

export const DIARY_THEMES: DiaryTheme[] = [
  {
    id: "periwinkle",
    label: "연보라",
    swatch: "#C2CBED",
    main: "#C2CBED",
    light: "#b8c4e8",
    lighter: "#d0d8f4",
    lightest: "#e4e9f7",
    soft: "#9aa8d8",
    soft2: "#a8b8e8",
    muted: "#d8dff5",
    mid: "#7a8fd4",
    dark: "#5a6db0",
    text: "#3d4a7a",
    card: "#eef1fb",
    surface: "#f0eef8",
    midRgb: "122, 143, 212",
    darkRgb: "90, 109, 176",
    mainRgb: "194, 203, 237",
  },
  {
    id: "pink",
    label: "핑크",
    swatch: "#FFB8D8",
    main: "#FFB8D8",
    light: "#FFA0C8",
    lighter: "#FFD0E8",
    lightest: "#FFE8F4",
    soft: "#FF88B8",
    soft2: "#FF98C8",
    muted: "#FFD8EC",
    mid: "#FF6098",
    dark: "#D04078",
    text: "#6A2048",
    card: "#FFF0F8",
    surface: "#FFF4F9",
    midRgb: "255, 96, 152",
    darkRgb: "208, 64, 120",
    mainRgb: "255, 184, 216",
  },
  {
    id: "mint",
    label: "민트",
    swatch: "#A8E6CF",
    main: "#A8E6CF",
    light: "#90DCC0",
    lighter: "#C8F0E0",
    lightest: "#E4F8F0",
    soft: "#70C8A8",
    soft2: "#88D4B8",
    muted: "#D0F0E4",
    mid: "#48B890",
    dark: "#309870",
    text: "#1A5840",
    card: "#EEFAF4",
    surface: "#F0FAF6",
    midRgb: "72, 184, 144",
    darkRgb: "48, 152, 112",
    mainRgb: "168, 230, 207",
  },
  {
    id: "lavender",
    label: "라벤더",
    swatch: "#D4B8FF",
    main: "#D4B8FF",
    light: "#C4A0F8",
    lighter: "#E4D0FF",
    lightest: "#F2E8FF",
    soft: "#A880E8",
    soft2: "#B898F0",
    muted: "#E8D8FF",
    mid: "#9060D8",
    dark: "#7040B0",
    text: "#402070",
    card: "#F4EEFF",
    surface: "#F6F0FF",
    midRgb: "144, 96, 216",
    darkRgb: "112, 64, 176",
    mainRgb: "212, 184, 255",
  },
  {
    id: "peach",
    label: "피치",
    swatch: "#FFD4B8",
    main: "#FFD4B8",
    light: "#FFC8A0",
    lighter: "#FFE8D8",
    lightest: "#FFF4EC",
    soft: "#FFB080",
    soft2: "#FFC098",
    muted: "#FFE8D8",
    mid: "#FF9860",
    dark: "#D87040",
    text: "#6A3820",
    card: "#FFF6F0",
    surface: "#FFF8F4",
    midRgb: "255, 152, 96",
    darkRgb: "216, 112, 64",
    mainRgb: "255, 212, 184",
  },
  {
    id: "sky",
    label: "하늘",
    swatch: "#B8E4FF",
    main: "#B8E4FF",
    light: "#A0D8FF",
    lighter: "#D0F0FF",
    lightest: "#E8F8FF",
    soft: "#70C8F0",
    soft2: "#88D4F8",
    muted: "#D8F0FF",
    mid: "#40A8E8",
    dark: "#2080C0",
    text: "#104870",
    card: "#EEF8FF",
    surface: "#F0FAFF",
    midRgb: "64, 168, 232",
    darkRgb: "32, 128, 192",
    mainRgb: "184, 228, 255",
  },
  {
    id: "rose",
    label: "로즈",
    swatch: "#FFB8C8",
    main: "#FFB8C8",
    light: "#FFA0B8",
    lighter: "#FFD0DC",
    lightest: "#FFE8EE",
    soft: "#FF7898",
    soft2: "#FF90A8",
    muted: "#FFD8E4",
    mid: "#F04870",
    dark: "#C03058",
    text: "#601830",
    card: "#FFF0F4",
    surface: "#FFF4F6",
    midRgb: "240, 72, 112",
    darkRgb: "192, 48, 88",
    mainRgb: "255, 184, 200",
  },
  {
    id: "lemon",
    label: "레몬",
    swatch: "#FFF0A8",
    main: "#FFF0A8",
    light: "#FFE890",
    lighter: "#FFF8D0",
    lightest: "#FFFEE8",
    soft: "#FFE060",
    soft2: "#FFE878",
    muted: "#FFF8D0",
    mid: "#F0C830",
    dark: "#C8A018",
    text: "#685810",
    card: "#FFFCF0",
    surface: "#FFFDF4",
    midRgb: "240, 200, 48",
    darkRgb: "200, 160, 24",
    mainRgb: "255, 240, 168",
  },
  {
    id: "sage",
    label: "세이지",
    swatch: "#C8E6B8",
    main: "#C8E6B8",
    light: "#B8DCA8",
    lighter: "#DCF0D0",
    lightest: "#ECF8E8",
    soft: "#98C878",
    soft2: "#A8D088",
    muted: "#E0F0D8",
    mid: "#78B058",
    dark: "#589040",
    text: "#305020",
    card: "#F0FAEC",
    surface: "#F4FAF0",
    midRgb: "120, 176, 88",
    darkRgb: "88, 144, 64",
    mainRgb: "200, 230, 184",
  },
];

const THEME_STORAGE_KEY = "reworld_diary_theme";

function themeStorageKey(userId: string) {
  return `${THEME_STORAGE_KEY}_${userId}`;
}

export function getDiaryTheme(id: DiaryThemeId | string | null | undefined): DiaryTheme {
  const found = DIARY_THEMES.find((theme) => theme.id === id);
  return found ?? DIARY_THEMES[0];
}

/** 계정별 localStorage 캐시 (없으면 기본 연보라). */
export function loadDiaryThemeId(userId?: string | null): DiaryThemeId {
  if (!userId) return DEFAULT_DIARY_THEME_ID;

  try {
    const saved = localStorage.getItem(themeStorageKey(userId));
    if (isDiaryThemeId(saved)) return saved;
  } catch {
    /* ignore */
  }

  return DEFAULT_DIARY_THEME_ID;
}

/** 계정별로만 저장 (디바이스 공용 키 사용 안 함). */
export function saveDiaryThemeId(themeId: DiaryThemeId, userId?: string | null) {
  if (!userId) return;

  try {
    localStorage.setItem(themeStorageKey(userId), themeId);
  } catch {
    /* ignore quota */
  }
}

export function clearDiaryThemeCache(userId?: string | null) {
  if (!userId) return;
  try {
    localStorage.removeItem(themeStorageKey(userId));
  } catch {
    /* ignore */
  }
}

export function applyDiaryTheme(theme: DiaryTheme) {
  const root = document.documentElement;
  root.style.setProperty("--diary-main", theme.main);
  root.style.setProperty("--diary-light", theme.light);
  root.style.setProperty("--diary-lighter", theme.lighter);
  root.style.setProperty("--diary-lightest", theme.lightest);
  root.style.setProperty("--diary-soft", theme.soft);
  root.style.setProperty("--diary-soft2", theme.soft2);
  root.style.setProperty("--diary-muted", theme.muted);
  root.style.setProperty("--diary-mid", theme.mid);
  root.style.setProperty("--diary-dark", theme.dark);
  root.style.setProperty("--diary-text", theme.text);
  root.style.setProperty("--diary-card", theme.card);
  root.style.setProperty("--diary-surface", theme.surface);
  root.style.setProperty(
    "--diary-paper-bg",
    `linear-gradient(160deg, ${theme.lightest} 0%, ${theme.card} 55%, #FFFDF8 100%)`,
  );
  root.style.setProperty("--diary-mid-rgb", theme.midRgb);
  root.style.setProperty("--diary-dark-rgb", theme.darkRgb);
  root.style.setProperty("--diary-main-rgb", theme.mainRgb);
  root.style.setProperty(
    "--diary-outer-bg",
    `linear-gradient(135deg, ${theme.main} 0%, ${theme.light} 40%, ${theme.lighter} 70%, ${theme.lightest} 100%)`,
  );
  root.style.setProperty(
    "--diary-cover-bg",
    `linear-gradient(148deg, ${theme.muted} 0%, ${theme.main} 25%, ${theme.light} 50%, ${theme.lighter} 75%, ${theme.muted} 100%)`,
  );
  root.style.setProperty("--diary-spine-bg", `linear-gradient(to right, ${theme.light}, ${theme.soft}, ${theme.light})`);
  root.style.setProperty("--background", theme.main);
  root.style.setProperty("--foreground", theme.text);
  root.style.setProperty("--primary", theme.dark);
  root.style.setProperty("--primary-foreground", "#ffffff");
  root.style.setProperty("--secondary", theme.mid);
  root.style.setProperty("--muted", theme.muted);
  root.style.setProperty("--muted-foreground", theme.dark);
  root.style.setProperty("--accent", theme.main);
  root.style.setProperty("--accent-foreground", theme.text);
  root.style.setProperty("--ring", theme.dark);
  root.style.setProperty("--input-background", theme.card);
  root.style.setProperty("--switch-background", theme.mid);
  root.style.setProperty("--border", `rgba(${theme.darkRgb}, 0.28)`);
}

export function diaryOuterBgStyle(): string {
  return "var(--diary-outer-bg)";
}

export function diaryCoverBgStyle(): string {
  return "var(--diary-cover-bg)";
}
