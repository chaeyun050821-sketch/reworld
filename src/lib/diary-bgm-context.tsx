import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_BGM_TITLE,
  getUserProfile,
  resolveBgm,
  type ResolvedBgm,
} from "./profile";

type DiaryBgmContextValue = {
  title: string;
  src: string;
  isDefault: boolean;
  isPlaying: boolean;
  toggle: () => void;
  setPlaying: (playing: boolean) => void;
  /** 프로필에서 고른 곡/기본 BGM으로 트랙 갱신 */
  setTrack: (
    input: { title?: string; previewUrl?: string | null },
    options?: { autoplay?: boolean },
  ) => void;
  refreshFromProfile: () => void;
};

const DiaryBgmContext = createContext<DiaryBgmContextValue | null>(null);

function profileToResolved(userId: string | null | undefined, nickname: string): ResolvedBgm {
  if (!userId) {
    return resolveBgm({});
  }
  return resolveBgm(getUserProfile(userId, nickname));
}

export function DiaryBgmProvider({
  userId,
  nickname = "",
  active,
  children,
}: {
  userId?: string | null;
  nickname?: string;
  /** cover / spread 일 때만 재생 허용 */
  active: boolean;
  children: ReactNode;
}) {
  const [resolved, setResolved] = useState<ResolvedBgm>(() =>
    profileToResolved(userId, nickname),
  );
  const [isPlaying, setIsPlaying] = useState(() => profileToResolved(userId, nickname).isDefault);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wantPlayRef = useRef(isPlaying);

  useEffect(() => {
    wantPlayRef.current = isPlaying;
  }, [isPlaying]);

  const refreshFromProfile = useCallback(() => {
    if (!userId) return;
    const next = profileToResolved(userId, nickname);
    setResolved(next);
    if (next.isDefault) {
      setIsPlaying(true);
    }
  }, [userId, nickname]);

  useEffect(() => {
    if (!userId) {
      setIsPlaying(false);
      return;
    }
    const next = profileToResolved(userId, nickname);
    setResolved(next);
    setIsPlaying(next.isDefault);
  }, [userId, nickname]);

  const setTrack = useCallback((
    input: { title?: string; previewUrl?: string | null },
    options?: { autoplay?: boolean },
  ) => {
    const next = resolveBgm({
      bgmTitle: input.title ?? DEFAULT_BGM_TITLE,
      bgmPreviewUrl: input.previewUrl,
    });
    setResolved(next);
    if (options?.autoplay) {
      setIsPlaying(true);
    }
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    // 실제로 안 나오고 있으면(브라우저 autoplay 차단 등) 재생 시도
    if (!audio || audio.paused) {
      setIsPlaying(true);
      void audio?.play().catch(() => setIsPlaying(false));
      return;
    }
    setIsPlaying(false);
  }, []);

  const setPlaying = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  // 활성 페이지가 아니면 일시정지 (로그아웃/인증 화면)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!active) {
      audio.pause();
    }
  }, [active]);

  const loadedSrcRef = useRef<string | null>(null);

  // src / 재생 상태 동기화 — 페이지 전환과 무관하게 유지
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (loadedSrcRef.current !== resolved.src) {
      loadedSrcRef.current = resolved.src;
      audio.src = resolved.src;
      audio.loop = true;
      audio.load();
    }

    audio.loop = true;

    if (active && isPlaying) {
      void audio.play().catch(() => {
        /* autoplay 차단 시 아래 interaction 리스너가 처리 */
      });
    } else {
      audio.pause();
    }
  }, [resolved.src, isPlaying, active]);

  // 브라우저 autoplay 정책: 첫 제스처에서 재생 재시도
  useEffect(() => {
    if (!active || !isPlaying) return;

    const unlock = () => {
      if (!wantPlayRef.current) return;
      void audioRef.current?.play().catch(() => {});
    };

    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [active, isPlaying, resolved.src]);

  const value = useMemo<DiaryBgmContextValue>(
    () => ({
      title: resolved.title,
      src: resolved.src,
      isDefault: resolved.isDefault,
      isPlaying,
      toggle,
      setPlaying,
      setTrack,
      refreshFromProfile,
    }),
    [resolved, isPlaying, toggle, setPlaying, setTrack, refreshFromProfile],
  );

  return (
    <DiaryBgmContext.Provider value={value}>
      <audio ref={audioRef} preload="auto" loop playsInline style={{ display: "none" }} />
      {children}
    </DiaryBgmContext.Provider>
  );
}

export function useDiaryBgm(): DiaryBgmContextValue {
  const ctx = useContext(DiaryBgmContext);
  if (!ctx) {
    throw new Error("useDiaryBgm must be used within DiaryBgmProvider");
  }
  return ctx;
}

/** Provider 밖(예: 친구 프로필)에서도 안전하게 쓰기 위한 optional hook */
export function useDiaryBgmOptional(): DiaryBgmContextValue | null {
  return useContext(DiaryBgmContext);
}
