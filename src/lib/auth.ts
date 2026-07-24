import type { Provider } from "@supabase/supabase-js";
import type { AuthChangeEvent, User as SupabaseUser } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";
import { ensureSupabaseProfile } from "./supabase-profile";
import {
  isNicknameTaken,
  validateNicknameFormat,
} from "./nickname";
import { getAuthCallbackUrl, clearAuthCallbackUrl, consumeAuthCallbackError } from "./site-url";

export type SocialAuthProvider = "google" | "github" | "kakao";

export type User = {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
};

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

export type AuthSessionResult = {
  user: User;
  needsNicknameSetup: boolean;
};

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 맞지 않아요.";
  }
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "이미 가입된 이메일이에요.";
  }
  if (lower.includes("password should be at least")) {
    return "비밀번호는 6자 이상이어야 해요.";
  }
  if (lower.includes("unable to validate email")) {
    return "올바른 이메일 형식이 아니에요.";
  }
  if (lower.includes("duplicate key") || lower.includes("profiles_nickname")) {
    return "이미 사용 중인 닉네임이에요.";
  }
  if (lower.includes("email rate limit exceeded") || lower.includes("rate limit")) {
    return "인증 메일 전송 한도에 걸렸어요. 1시간 정도 기다리거나 Supabase에서 이메일 인증을 끄고 다시 시도해 주세요.";
  }
  if (lower.includes("unable to exchange external code")) {
    return "소셜 Provider Client ID/Secret이 맞지 않아요. Supabase 대시보드에서 다시 확인해 주세요.";
  }

  return message;
}

function isSocialProvider(supabaseUser: SupabaseUser): boolean {
  const provider = supabaseUser.app_metadata?.provider;
  if (typeof provider === "string" && provider !== "email") return true;
  const providers = supabaseUser.app_metadata?.providers;
  return Array.isArray(providers) && providers.some((p) => p !== "email");
}

function hasCompletedProfile(supabaseUser: SupabaseUser): boolean {
  if (supabaseUser.user_metadata?.profile_complete === true) return true;

  if (!isSocialProvider(supabaseUser)) {
    const metaNick =
      typeof supabaseUser.user_metadata?.nickname === "string"
        ? supabaseUser.user_metadata.nickname.trim()
        : "";
    return metaNick.length >= 2;
  }

  return false;
}

async function fetchNickname(userId: string, fallback: string): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data?.nickname?.trim()) return fallback;
  return data.nickname.trim();
}

async function mapUserFromSession(supabaseUser: SupabaseUser): Promise<AuthSessionResult> {
  // 소셜 최초 로그인: profile_complete 없으면 무조건 닉네임 설정
  if (isSocialProvider(supabaseUser) && !hasCompletedProfile(supabaseUser)) {
    return {
      user: {
        id: supabaseUser.id,
        email: supabaseUser.email ?? "",
        nickname: "",
        createdAt: supabaseUser.created_at,
      },
      needsNicknameSetup: true,
    };
  }

  const metaNick =
    typeof supabaseUser.user_metadata?.nickname === "string"
      ? supabaseUser.user_metadata.nickname.trim()
      : "";
  const fallback = metaNick || supabaseUser.email?.split("@")[0] || "user";
  const storedNick = await fetchNickname(supabaseUser.id, fallback);
  const nickname = metaNick || storedNick;

  await ensureSupabaseProfile(supabaseUser.id, nickname);

  return {
    user: {
      id: supabaseUser.id,
      email: supabaseUser.email ?? "",
      nickname,
      createdAt: supabaseUser.created_at,
    },
    needsNicknameSetup: false,
  };
}

function clearOAuthCallbackUrl(): void {
  clearAuthCallbackUrl();
}

/** OAuth 콜백 URL에 남은 에러 메시지 (있으면 URL 정리 후 반환) */
export function readOAuthCallbackError(): string | null {
  return consumeAuthCallbackError();
}

/** OAuth 콜백 직후 onAuthStateChange 안에서 Supabase 호출 시 세션이 깨지지 않도록 defer */
function deferAuthWork(work: () => void): void {
  setTimeout(work, 0);
}

export function bootstrapAuth(
  onChange: (result: AuthSessionResult | null) => void,
  onCallbackError?: (message: string) => void,
): () => void {
  if (!isSupabaseConfigured()) {
    onChange(null);
    return () => {};
  }

  const callbackError = consumeAuthCallbackError();
  if (callbackError) {
    deferAuthWork(() => onCallbackError?.(callbackError));
  }

  let initialHandled = false;

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event: AuthChangeEvent, session) => {
      deferAuthWork(() => {
        void (async () => {
          if (!session?.user) {
            if (event === "INITIAL_SESSION" || event === "SIGNED_OUT") {
              onChange(null);
            }
            return;
          }

          try {
            const result = await mapUserFromSession(session.user);
            onChange(result);

            if (event === "SIGNED_IN" || (event === "INITIAL_SESSION" && !initialHandled)) {
              clearOAuthCallbackUrl();
            }
          } catch (err) {
            console.error("[auth] session resolve failed:", err);
            onChange(null);
          } finally {
            if (event === "INITIAL_SESSION") initialHandled = true;
          }
        })();
      });
    },
  );

  return () => subscription.unsubscribe();
}

export async function getSession(): Promise<AuthSessionResult | null> {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) return null;

  return mapUserFromSession(data.session.user);
}

export async function signUp(
  email: string,
  nickname: string,
  password: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Supabase 설정이 필요해요. 프로젝트 루트에 .env 파일을 만들어 주세요.",
    };
  }

  const trimmedEmail = email.trim().toLowerCase();
  const nickCheck = validateNicknameFormat(nickname);
  if (!nickCheck.ok) {
    return { ok: false, error: nickCheck.error };
  }
  const trimmedNick = nickCheck.value;

  if (!trimmedEmail || !password) {
    return { ok: false, error: "모든 항목을 입력해 주세요." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { ok: false, error: "올바른 이메일 형식이 아니에요." };
  }
  if (password.length < 6) {
    return { ok: false, error: "비밀번호는 6자 이상이어야 해요." };
  }

  if (await isNicknameTaken(trimmedNick)) {
    return { ok: false, error: "이미 사용 중인 닉네임이에요." };
  }

  const { data, error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: { nickname: trimmedNick, profile_complete: true },
    },
  });

  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }
  if (!data.user) {
    return { ok: false, error: "회원가입에 실패했어요." };
  }
  if (!data.session) {
    return {
      ok: false,
      error: "가입 확인 메일을 보냈어요. 메일 링크로 인증한 뒤 로그인해 주세요.",
    };
  }

  await ensureSupabaseProfile(data.user.id, trimmedNick);

  const result = await mapUserFromSession(data.user);
  return { ok: true, user: result.user };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Supabase 설정이 필요해요. 프로젝트 루트에 .env 파일을 만들어 주세요.",
    };
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail || !password) {
    return { ok: false, error: "이메일과 비밀번호를 입력해 주세요." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmedEmail,
    password,
  });

  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }
  if (!data.user) {
    return { ok: false, error: "로그인에 실패했어요." };
  }

  const result = await mapUserFromSession(data.user);
  return { ok: true, user: result.user };
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase.auth.signOut();
}

export async function signInWithSocial(
  provider: SocialAuthProvider,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      error: "Supabase 설정이 필요해요. .env 파일을 확인해 주세요.",
    };
  }

  const redirectTo = getAuthCallbackUrl();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo,
    },
  });

  if (error) {
    return { ok: false, error: mapAuthError(error.message) };
  }

  return { ok: true };
}

export async function completeNicknameSetup(
  userId: string,
  nickname: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 설정이 필요해요." };
  }

  const trimmed = nickname.trim();
  const nickCheck = validateNicknameFormat(trimmed);
  if (!nickCheck.ok) {
    return { ok: false, error: nickCheck.error };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) {
    return { ok: false, error: "로그인 세션이 만료됐어요. 다시 로그인해 주세요." };
  }

  if (await isNicknameTaken(nickCheck.value, userId)) {
    return { ok: false, error: "이미 사용 중인 닉네임이에요." };
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      nickname: nickCheck.value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (profileError) {
    if (profileError.code === "23505") {
      return { ok: false, error: "이미 사용 중인 닉네임이에요." };
    }
    return { ok: false, error: mapAuthError(profileError.message) };
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: { nickname: nickCheck.value, profile_complete: true },
  });

  if (metaError) {
    return { ok: false, error: mapAuthError(metaError.message) };
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.getUser();
  if (refreshError || !refreshed.user) {
    return { ok: false, error: "프로필 저장 후 세션을 불러오지 못했어요." };
  }

  const result = await mapUserFromSession(refreshed.user);
  return { ok: true, user: result.user };
}

export async function updateUserNickname(
  userId: string,
  nickname: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase 설정이 필요해요." };
  }

  const nickCheck = validateNicknameFormat(nickname.trim());
  if (!nickCheck.ok) {
    return { ok: false, error: nickCheck.error };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user || authData.user.id !== userId) {
    return { ok: false, error: "로그인 세션이 만료됐어요." };
  }

  if (await isNicknameTaken(nickCheck.value, userId)) {
    return { ok: false, error: "이미 사용 중인 닉네임이에요." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      nickname: nickCheck.value,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profileError) {
    if (profileError.code === "23505") {
      return { ok: false, error: "이미 사용 중인 닉네임이에요." };
    }
    return { ok: false, error: mapAuthError(profileError.message) };
  }

  const { error: metaError } = await supabase.auth.updateUser({
    data: { nickname: nickCheck.value, profile_complete: true },
  });

  if (metaError) {
    return { ok: false, error: mapAuthError(metaError.message) };
  }

  const { data: refreshed, error: refreshError } = await supabase.auth.getUser();
  if (refreshError || !refreshed.user) {
    return { ok: false, error: "닉네임 저장 후 세션을 불러오지 못했어요." };
  }

  const result = await mapUserFromSession(refreshed.user);
  return { ok: true, user: result.user };
}
