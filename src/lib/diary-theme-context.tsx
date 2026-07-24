import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  applyDiaryTheme,
  DEFAULT_DIARY_THEME_ID,
  getDiaryTheme,
  isDiaryThemeId,
  loadDiaryThemeId,
  saveDiaryThemeId,
  type DiaryTheme,
  type DiaryThemeId,
} from "./diary-theme";
import { getUserProfile, mergeUserProfiles, saveUserProfile, withProfileTimestamp } from "./profile";
import { fetchUserProfileDetails, upsertUserProfileDetails } from "./supabase-profile";
import { isSupabaseConfigured } from "./supabase";

type ThemeViewTarget = { userId: string; nickname: string };

type DiaryThemeContextValue = {
  themeId: DiaryThemeId;
  theme: DiaryTheme;
  setThemeId: (id: DiaryThemeId) => void;
  canEditTheme: boolean;
  applyOwnThemeFromProfile: (id: DiaryThemeId) => void;
  setViewThemeTarget: (target: ThemeViewTarget | null) => void;
};

const DiaryThemeContext = createContext<DiaryThemeContextValue | null>(null);

function resolveOwnThemeId(userId: string, nickname: string): DiaryThemeId {
  const profileTheme = getUserProfile(userId, nickname).diaryThemeId;
  if (isDiaryThemeId(profileTheme)) return profileTheme;
  return loadDiaryThemeId(userId);
}

async function fetchThemeForUser(userId: string, nickname: string): Promise<DiaryThemeId> {
  const localProfile = getUserProfile(userId, nickname);
  if (isDiaryThemeId(localProfile.diaryThemeId)) {
    return localProfile.diaryThemeId;
  }

  if (!isSupabaseConfigured()) {
    return loadDiaryThemeId(userId);
  }

  const remoteResult = await fetchUserProfileDetails(userId, nickname);
  if (!remoteResult) return DEFAULT_DIARY_THEME_ID;

  const merged = mergeUserProfiles(localProfile, remoteResult.profile);
  saveUserProfile(userId, merged);

  if (isDiaryThemeId(merged.diaryThemeId)) {
    saveDiaryThemeId(merged.diaryThemeId, userId);
    return merged.diaryThemeId;
  }

  return DEFAULT_DIARY_THEME_ID;
}

export function DiaryThemeProvider({
  userId,
  userNickname,
  children,
}: {
  userId?: string | null;
  userNickname?: string;
  children: ReactNode;
}) {
  const [ownThemeId, setOwnThemeId] = useState<DiaryThemeId>(DEFAULT_DIARY_THEME_ID);
  const [viewThemeId, setViewThemeId] = useState<DiaryThemeId | null>(null);
  const [viewThemeTarget, setViewThemeTargetState] = useState<ThemeViewTarget | null>(null);

  const canEditTheme = !viewThemeTarget;
  const activeThemeId = viewThemeTarget ? (viewThemeId ?? DEFAULT_DIARY_THEME_ID) : ownThemeId;
  const theme = useMemo(() => getDiaryTheme(activeThemeId), [activeThemeId]);

  useEffect(() => {
    applyDiaryTheme(theme);
  }, [theme]);

  useEffect(() => {
    setViewThemeTargetState(null);
    setViewThemeId(null);

    try {
      localStorage.removeItem("reworld_diary_theme");
    } catch {
      /* legacy device-wide key */
    }

    if (!userId || !userNickname) {
      setOwnThemeId(DEFAULT_DIARY_THEME_ID);
      applyDiaryTheme(getDiaryTheme(DEFAULT_DIARY_THEME_ID));
      return;
    }

    let cancelled = false;
    const localTheme = resolveOwnThemeId(userId, userNickname);
    setOwnThemeId(localTheme);
    saveDiaryThemeId(localTheme, userId);

    void fetchThemeForUser(userId, userNickname).then((resolved) => {
      if (cancelled) return;
      setOwnThemeId(resolved);
      saveDiaryThemeId(resolved, userId);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, userNickname]);

  useEffect(() => {
    if (!viewThemeTarget) {
      setViewThemeId(null);
      return;
    }

    let cancelled = false;
    const cached = resolveOwnThemeId(viewThemeTarget.userId, viewThemeTarget.nickname);
    if (cached !== DEFAULT_DIARY_THEME_ID) {
      setViewThemeId(cached);
    } else {
      setViewThemeId(null);
    }

    void fetchThemeForUser(viewThemeTarget.userId, viewThemeTarget.nickname).then((resolved) => {
      if (!cancelled) setViewThemeId(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [viewThemeTarget]);

  const applyOwnThemeFromProfile = useCallback(
    (id: DiaryThemeId) => {
      if (!userId || viewThemeTarget) return;
      setOwnThemeId(id);
      saveDiaryThemeId(id, userId);
    },
    [userId, viewThemeTarget],
  );

  const setThemeId = useCallback(
    (id: DiaryThemeId) => {
      if (!canEditTheme || !userId || !userNickname) return;

      setOwnThemeId(id);
      saveDiaryThemeId(id, userId);

      const nextProfile = withProfileTimestamp({
        ...getUserProfile(userId, userNickname),
        diaryThemeId: id,
      });
      saveUserProfile(userId, nextProfile);

      if (isSupabaseConfigured()) {
        void upsertUserProfileDetails(userId, userNickname, nextProfile);
      }
    },
    [canEditTheme, userId, userNickname],
  );

  const setViewThemeTarget = useCallback(
    (target: ThemeViewTarget | null) => {
      setViewThemeTargetState(target);
      if (!target) {
        setViewThemeId(null);
        if (userId && userNickname) {
          const own = resolveOwnThemeId(userId, userNickname);
          setOwnThemeId(own);
          applyDiaryTheme(getDiaryTheme(own));
        }
      }
    },
    [userId, userNickname],
  );

  const value = useMemo(
    () => ({
      themeId: activeThemeId,
      theme,
      setThemeId,
      canEditTheme,
      applyOwnThemeFromProfile,
      setViewThemeTarget,
    }),
    [activeThemeId, theme, setThemeId, canEditTheme, applyOwnThemeFromProfile, setViewThemeTarget],
  );

  return <DiaryThemeContext.Provider value={value}>{children}</DiaryThemeContext.Provider>;
}

export function useDiaryTheme() {
  const ctx = useContext(DiaryThemeContext);
  if (!ctx) {
    const theme = getDiaryTheme(DEFAULT_DIARY_THEME_ID);
    return {
      themeId: DEFAULT_DIARY_THEME_ID,
      theme,
      setThemeId: (_id: DiaryThemeId) => {},
      canEditTheme: true,
      applyOwnThemeFromProfile: (_id: DiaryThemeId) => {},
      setViewThemeTarget: (_target: ThemeViewTarget | null) => {},
    };
  }
  return ctx;
}
