export type BgmSearchResult = {
  id: string;
  title: string;
  artist: string;
  previewUrl: string;
  artworkUrl: string;
  source: "itunes" | "deezer";
};

const RESULT_LIMIT = 20;
const JSONP_TIMEOUT_MS = 12_000;

function dedupeKey(title: string, artist: string): string {
  return `${title.trim().toLowerCase()}|${artist.trim().toLowerCase()}`;
}

function mergeResults(batches: BgmSearchResult[][]): BgmSearchResult[] {
  const seen = new Set<string>();
  const merged: BgmSearchResult[] = [];

  for (const batch of batches) {
    for (const track of batch) {
      const key = dedupeKey(track.title, track.artist);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(track);
      if (merged.length >= RESULT_LIMIT) return merged;
    }
  }

  return merged;
}

async function searchViaApi(query: string): Promise<BgmSearchResult[] | null> {
  try {
    const res = await fetch(`/api/bgm-search?q=${encodeURIComponent(query)}`);
    const data = (await res.json()) as { results?: BgmSearchResult[]; error?: string };

    if (!res.ok) {
      if (data.error) throw new Error(data.error);
      return null;
    }

    if (Array.isArray(data.results)) return data.results;
    return null;
  } catch (err) {
    if (err instanceof Error && err.message !== "Failed to fetch") throw err;
    return null;
  }
}

type ItunesSearchPayload = {
  results?: Array<{
    trackId: number;
    trackName: string;
    artistName: string;
    previewUrl?: string;
    artworkUrl100?: string;
  }>;
};

/** iTunes Search API has no CORS — use JSONP callback. */
function searchItunesJsonp(query: string, country: string): Promise<BgmSearchResult[]> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("JSONP unavailable"));
      return;
    }

    const callbackName = `itunesBgmCb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.remove();
      try {
        delete (window as unknown as Record<string, unknown>)[callbackName];
      } catch {
        (window as unknown as Record<string, unknown>)[callbackName] = undefined;
      }
    };

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const timeoutId = window.setTimeout(() => {
      finish(() => reject(new Error("iTunes 검색 시간 초과")));
    }, JSONP_TIMEOUT_MS);

    (window as unknown as Record<string, unknown>)[callbackName] = (data: ItunesSearchPayload) => {
      finish(() => {
        const mapped = (data.results ?? [])
          .filter((track) => !!track.previewUrl)
          .map((track) => ({
            id: `itunes-${track.trackId}`,
            title: track.trackName,
            artist: track.artistName,
            previewUrl: track.previewUrl!,
            artworkUrl: track.artworkUrl100 ?? "",
            source: "itunes" as const,
          }));
        resolve(mapped);
      });
    };

    script.onerror = () => {
      finish(() => reject(new Error("iTunes 검색 실패")));
    };

    script.src =
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}` +
      `&media=music&entity=song&limit=25&country=${country}&lang=ko_kr` +
      `&callback=${callbackName}`;

    document.head.appendChild(script);
  });
}

async function searchDeezer(query: string): Promise<BgmSearchResult[]> {
  // Prefer same-origin Vite proxy when available (dev / web host with proxy).
  const candidates = [
    `/bgm-proxy/deezer/search?q=${encodeURIComponent(query)}&limit=25`,
    `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=25`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = (await res.json()) as {
        data?: Array<{
          id: number;
          title: string;
          preview?: string;
          artist?: { name?: string };
          album?: { cover_small?: string; cover_medium?: string };
        }>;
        error?: { message?: string };
      };

      if (data.error) continue;

      return (data.data ?? [])
        .filter((track) => !!track.preview)
        .map((track) => ({
          id: `deezer-${track.id}`,
          title: track.title,
          artist: track.artist?.name ?? "",
          previewUrl: track.preview!,
          artworkUrl: track.album?.cover_medium ?? track.album?.cover_small ?? "",
          source: "deezer" as const,
        }));
    } catch {
      /* try next candidate */
    }
  }

  return [];
}

export async function searchBgmTracks(query: string): Promise<BgmSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const apiResults = await searchViaApi(trimmed);
  if (apiResults && apiResults.length > 0) return apiResults.slice(0, RESULT_LIMIT);

  const [deezerSettled, itunesKrSettled, itunesUsSettled] = await Promise.allSettled([
    searchDeezer(trimmed),
    searchItunesJsonp(trimmed, "KR"),
    searchItunesJsonp(trimmed, "US"),
  ]);

  const deezer = deezerSettled.status === "fulfilled" ? deezerSettled.value : [];
  const itunesKr = itunesKrSettled.status === "fulfilled" ? itunesKrSettled.value : [];
  const itunesUs = itunesUsSettled.status === "fulfilled" ? itunesUsSettled.value : [];

  const merged = mergeResults([itunesKr, itunesUs, deezer]);
  if (merged.length > 0) return merged;

  const allRejected =
    deezerSettled.status === "rejected" &&
    itunesKrSettled.status === "rejected" &&
    itunesUsSettled.status === "rejected";

  // Deezer often "fulfills" with [] due to CORS; treat as failure only if iTunes also failed.
  const itunesFailed =
    itunesKrSettled.status === "rejected" && itunesUsSettled.status === "rejected";

  if (allRejected || itunesFailed) {
    throw new Error("검색에 실패했습니다.");
  }

  return [];
}
