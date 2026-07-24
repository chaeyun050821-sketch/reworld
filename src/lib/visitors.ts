export type VisitorStats = {
  today: number;
  total: number;
  dateKey: string;
};

const VISITOR_KEY_PREFIX = "reworld_visitors_";

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function defaultStats(): VisitorStats {
  return { today: 0, total: 0, dateKey: todayKey() };
}

export function getVisitorStats(userId: string): VisitorStats {
  try {
    const raw = localStorage.getItem(`${VISITOR_KEY_PREFIX}${userId}`);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw) as VisitorStats;
    if (typeof parsed.today !== "number" || typeof parsed.total !== "number") return defaultStats();
    if (parsed.dateKey !== todayKey()) {
      return { today: 0, total: parsed.total, dateKey: todayKey() };
    }
    return parsed;
  } catch {
    return defaultStats();
  }
}

export function saveVisitorStats(userId: string, stats: VisitorStats) {
  localStorage.setItem(`${VISITOR_KEY_PREFIX}${userId}`, JSON.stringify(stats));
}

export function toVisitorDigits(count: number, length = 4): string[] {
  return String(Math.max(0, Math.floor(count))).padStart(length, "0").slice(-length).split("");
}

export function formatVisitorCount(count: number): string {
  return Math.max(0, Math.floor(count)).toLocaleString("en-US");
}
