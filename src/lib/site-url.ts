/** OAuth·리다이렉트용 공개 URL — 브라우저에서는 항상 현재 origin 사용 */
export function getSiteUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }
  const envUrl = import.meta.env.VITE_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");
  return "";
}

export function getAuthCallbackUrl(): string {
  const base = getSiteUrl();
  return base ? `${base}/` : "/";
}

/** OAuth 콜백 URL의 code / error 파라미터 제거 */
export function clearAuthCallbackUrl(): void {
  if (typeof window === "undefined") return;
  const { search, hash, pathname } = window.location;
  const hasAuthParams =
    search.includes("code=") ||
    search.includes("error=") ||
    hash.includes("access_token=") ||
    hash.includes("error=");
  if (!hasAuthParams) return;
  window.history.replaceState({}, document.title, pathname || "/");
}

function readAuthCallbackParams(): URLSearchParams {
  if (typeof window === "undefined") return new URLSearchParams();
  const fromQuery = new URLSearchParams(window.location.search);
  const hashRaw = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const fromHash = new URLSearchParams(hashRaw);
  const merged = new URLSearchParams(fromQuery);
  fromHash.forEach((value, key) => {
    if (!merged.has(key)) merged.set(key, value);
  });
  return merged;
}

export function consumeAuthCallbackError(): string | null {
  const params = readAuthCallbackParams();
  const error = params.get("error");
  const description = params.get("error_description");
  if (!error && !description) return null;

  clearAuthCallbackUrl();

  const raw = decodeURIComponent(description ?? error ?? "로그인에 실패했어요.");
  const lower = raw.toLowerCase();

  if (lower.includes("unable to exchange external code")) {
    return "소셜 Provider Client ID/Secret이 맞지 않아요. Supabase → Authentication → Providers에서 해당 Provider(GitHub/Google)의 Client ID/Secret을 개발자 콘솔에서 다시 복사해 넣어 주세요.";
  }
  if (lower.includes("redirect_uri_mismatch")) {
    return "Redirect URI가 맞지 않아요. Google Cloud에는 Supabase 콜백 URL만 등록해야 해요.";
  }
  if (error === "server_error") {
    return "소셜 로그인 서버 오류예요. Supabase Provider 설정과 Redirect URLs를 확인해 주세요.";
  }

  return raw;
}
