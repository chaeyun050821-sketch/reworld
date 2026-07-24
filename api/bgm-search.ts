export const config = {
  runtime: "edge",
};

type BgmSearchResult = {
  id: string;
  title: string;
  artist: string;
  previewUrl: string;
  artworkUrl: string;
  source: "itunes" | "deezer";
};

const RESULT_LIMIT = 20;

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

async function searchItunes(query: string, country: string): Promise<BgmSearchResult[]> {
  const url =
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}` +
    `&media=music&entity=song&limit=25&country=${country}`;

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = (await res.json()) as {
    results?: Array<{
      trackId: number;
      trackName: string;
      artistName: string;
      previewUrl?: string;
      artworkUrl100?: string;
    }>;
  };

  return (data.results ?? [])
    .filter((track) => !!track.previewUrl)
    .map((track) => ({
      id: `itunes-${track.trackId}`,
      title: track.trackName,
      artist: track.artistName,
      previewUrl: track.previewUrl!,
      artworkUrl: track.artworkUrl100 ?? "",
      source: "itunes" as const,
    }));
}

async function searchDeezer(query: string): Promise<BgmSearchResult[]> {
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=25`;
  const res = await fetch(url);
  if (!res.ok) return [];

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

  if (data.error) return [];

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
}

async function searchBgmOnServer(query: string): Promise<BgmSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const [deezerSettled, itunesKrSettled, itunesUsSettled] = await Promise.allSettled([
    searchDeezer(trimmed),
    searchItunes(trimmed, "KR"),
    searchItunes(trimmed, "US"),
  ]);

  const deezer = deezerSettled.status === "fulfilled" ? deezerSettled.value : [];
  const itunesKr = itunesKrSettled.status === "fulfilled" ? itunesKrSettled.value : [];
  const itunesUs = itunesUsSettled.status === "fulfilled" ? itunesUsSettled.value : [];

  const merged = mergeResults([itunesKr, itunesUs, deezer]);
  if (merged.length > 0) return merged;

  const itunesFailed =
    itunesKrSettled.status === "rejected" && itunesUsSettled.status === "rejected";
  const deezerFailed = deezerSettled.status === "rejected";

  if (itunesFailed && deezerFailed) {
    throw new Error("검색에 실패했습니다.");
  }

  return [];
}

export default async function handler(request: Request) {
  if (request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { Allow: "GET", "Content-Type": "application/json" },
    });
  }

  const query = new URL(request.url).searchParams.get("q") ?? "";
  if (!query.trim()) {
    return new Response(JSON.stringify({ error: "Missing search query" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const results = await searchBgmOnServer(query);
    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "검색에 실패했습니다.";
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
