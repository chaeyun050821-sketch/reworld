import { kstDateKey } from "./visitors-sync";
import {
  getInventorySnapshot,
  loadCoins,
  loadCoinsUpdatedAt,
  saveCoins,
} from "./shop-storage";
import { isSupabaseConfigured } from "./supabase";
import { fetchUserInventory, upsertUserInventory } from "./user-sync";

export const CLOVER_REWARD = {
  attendance: 2,
  diary: 5,
  guestbookWrite: 3,
  guestbookReceive: 3,
  photoUpload: 1,
} as const;

export const PHOTO_UPLOAD_DAILY_MAX = 5;

type CloverRewardState = {
  /** YYYY-MM-DD list of attendance check-ins */
  attendanceDates: string[];
  /** YYYY-MM-DD already rewarded for first diary of the day */
  diaryRewardDates: string[];
  /** guestbook entry ids already rewarded (writer) */
  guestbookWriteIds: string[];
  /** guestbook entry ids already rewarded (owner receive) */
  guestbookReceiveIds: string[];
  /** existing guestbook entries were baselined without awarding */
  guestbookReceiveBaselined: boolean;
  /** KST dateKey -> rewarded upload count */
  photoUploadDailyCounts: Record<string, number>;
};

const STATE_KEY_PREFIX = "reworld_clover_rewards_";

type CloverListener = () => void;
const listeners = new Map<string, Set<CloverListener>>();

function emptyState(): CloverRewardState {
  return {
    attendanceDates: [],
    diaryRewardDates: [],
    guestbookWriteIds: [],
    guestbookReceiveIds: [],
    guestbookReceiveBaselined: false,
    photoUploadDailyCounts: {},
  };
}

function loadState(userId: string): CloverRewardState {
  try {
    const raw = localStorage.getItem(`${STATE_KEY_PREFIX}${userId}`);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<CloverRewardState>;
    return {
      attendanceDates: Array.isArray(parsed.attendanceDates)
        ? parsed.attendanceDates.filter((d): d is string => typeof d === "string")
        : [],
      diaryRewardDates: Array.isArray(parsed.diaryRewardDates)
        ? parsed.diaryRewardDates.filter((d): d is string => typeof d === "string")
        : [],
      guestbookWriteIds: Array.isArray(parsed.guestbookWriteIds)
        ? parsed.guestbookWriteIds.filter((d): d is string => typeof d === "string")
        : [],
      guestbookReceiveIds: Array.isArray(parsed.guestbookReceiveIds)
        ? parsed.guestbookReceiveIds.filter((d): d is string => typeof d === "string")
        : [],
      guestbookReceiveBaselined: !!parsed.guestbookReceiveBaselined,
      photoUploadDailyCounts:
        parsed.photoUploadDailyCounts && typeof parsed.photoUploadDailyCounts === "object"
          ? Object.fromEntries(
              Object.entries(parsed.photoUploadDailyCounts).filter(
                ([key, value]) => typeof key === "string" && typeof value === "number" && value > 0,
              ),
            )
          : {},
    };
  } catch {
    return emptyState();
  }
}

function saveState(userId: string, state: CloverRewardState) {
  try {
    localStorage.setItem(`${STATE_KEY_PREFIX}${userId}`, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
  void persistCloverToServer(userId);
}

function parseRemoteRewardState(raw: unknown): CloverRewardState {
  if (!raw || typeof raw !== "object") return emptyState();
  const parsed = raw as Partial<CloverRewardState>;
  return {
    attendanceDates: Array.isArray(parsed.attendanceDates)
      ? parsed.attendanceDates.filter((d): d is string => typeof d === "string")
      : [],
    diaryRewardDates: Array.isArray(parsed.diaryRewardDates)
      ? parsed.diaryRewardDates.filter((d): d is string => typeof d === "string")
      : [],
    guestbookWriteIds: Array.isArray(parsed.guestbookWriteIds)
      ? parsed.guestbookWriteIds.filter((d): d is string => typeof d === "string")
      : [],
    guestbookReceiveIds: Array.isArray(parsed.guestbookReceiveIds)
      ? parsed.guestbookReceiveIds.filter((d): d is string => typeof d === "string")
      : [],
    guestbookReceiveBaselined: !!parsed.guestbookReceiveBaselined,
    photoUploadDailyCounts:
      parsed.photoUploadDailyCounts && typeof parsed.photoUploadDailyCounts === "object"
        ? Object.fromEntries(
            Object.entries(parsed.photoUploadDailyCounts).filter(
              ([key, value]) => typeof key === "string" && typeof value === "number" && value > 0,
            ),
          )
        : {},
  };
}

function mergeRewardState(local: CloverRewardState, remote: CloverRewardState): CloverRewardState {
  const photoUploadDailyCounts = { ...remote.photoUploadDailyCounts };
  for (const [key, value] of Object.entries(local.photoUploadDailyCounts)) {
    photoUploadDailyCounts[key] = Math.max(photoUploadDailyCounts[key] ?? 0, value);
  }
  return {
    attendanceDates: [...new Set([...local.attendanceDates, ...remote.attendanceDates])],
    diaryRewardDates: [...new Set([...local.diaryRewardDates, ...remote.diaryRewardDates])],
    guestbookWriteIds: [...new Set([...local.guestbookWriteIds, ...remote.guestbookWriteIds])].slice(-400),
    guestbookReceiveIds: [...new Set([...local.guestbookReceiveIds, ...remote.guestbookReceiveIds])].slice(-500),
    guestbookReceiveBaselined: local.guestbookReceiveBaselined || remote.guestbookReceiveBaselined,
    photoUploadDailyCounts,
  };
}

/**
 * Newer write wins. Math.max previously undid purchases: after a spend,
 * hydrate(local_prespend, remote_spent) restored the higher pre-spend balance.
 */
function mergeCloverBalance(
  local: number,
  remote: number,
  localUpdatedAt: number,
  remoteUpdatedAt: number | undefined,
): number {
  const localCoins = Math.floor(local);
  const remoteCoins = Math.floor(remote);
  if (!Number.isFinite(remoteUpdatedAt) || (remoteUpdatedAt ?? 0) <= 0) {
    // No server timestamp: keep local pending writes (rewards) when higher,
    // otherwise take remote so spends applied on the server stick.
    if (localUpdatedAt > 0 && localCoins !== remoteCoins) {
      return localUpdatedAt >= Date.now() - 15_000 ? localCoins : remoteCoins;
    }
    return remoteCoins;
  }
  if ((remoteUpdatedAt as number) > localUpdatedAt) return remoteCoins;
  if (localUpdatedAt > (remoteUpdatedAt as number)) return localCoins;
  return remoteCoins;
}

/** Supabase user_inventory.coins + clover_rewards 저장 */
export async function persistCloverToServer(userId: string): Promise<void> {
  if (!isSupabaseConfigured() || !userId) return;
  const snapshot = getInventorySnapshot(userId);
  const result = await upsertUserInventory(userId, {
    ...snapshot,
    cloverRewards: loadState(userId),
  });
  if (!result.ok) {
    console.error("[clover] persist failed:", result.error);
  }
}

export type RemoteCloverSnapshot = {
  coins?: number;
  cloverRewards?: unknown;
  updatedAt?: string;
};

/**
 * 서버·로컬 클로버 잔액·보상 기록 병합 후 로컬 반영.
 * 최신 쓰기(updated_at)가 이김 — 구매/판매 차감이 Math.max로 되돌아가는 것을 막음.
 */
export async function hydrateCloverFromServer(
  userId: string,
  remote?: RemoteCloverSnapshot | null,
): Promise<number> {
  if (!userId) return loadCoins(userId);

  // Explicit null = no remote inventory row yet — keep local, optionally push.
  if (remote === null) {
    const localCoins = loadCoins(userId);
    if (isSupabaseConfigured()) {
      await persistCloverToServer(userId);
    }
    notify(userId);
    return localCoins;
  }

  let remoteCoins = remote?.coins;
  let remoteRewards = remote?.cloverRewards;
  let remoteUpdatedAtMs: number | undefined =
    remote?.updatedAt != null ? Date.parse(remote.updatedAt) : undefined;
  if (remoteUpdatedAtMs !== undefined && !Number.isFinite(remoteUpdatedAtMs)) {
    remoteUpdatedAtMs = undefined;
  }

  if (remote === undefined && isSupabaseConfigured()) {
    const inventory = await fetchUserInventory(userId);
    if (inventory) {
      remoteCoins = inventory.coins;
      remoteRewards = inventory.cloverRewards;
      if (inventory.updatedAt) {
        const parsed = Date.parse(inventory.updatedAt);
        remoteUpdatedAtMs = Number.isFinite(parsed) ? parsed : undefined;
      }
    } else {
      const localCoins = loadCoins(userId);
      if (isSupabaseConfigured()) {
        await persistCloverToServer(userId);
      }
      notify(userId);
      return localCoins;
    }
  }

  // No remote coin value available (e.g. offline) — keep local as-is.
  if (remoteCoins === undefined) {
    notify(userId);
    return loadCoins(userId);
  }

  const localCoins = loadCoins(userId);
  const localUpdatedAt = loadCoinsUpdatedAt(userId);
  const mergedCoins = mergeCloverBalance(
    localCoins,
    remoteCoins,
    localUpdatedAt,
    remoteUpdatedAtMs,
  );
  const writeAt =
    remoteUpdatedAtMs !== undefined && mergedCoins === Math.floor(remoteCoins)
      ? Math.max(remoteUpdatedAtMs, localUpdatedAt)
      : Date.now();
  saveCoins(userId, mergedCoins, writeAt);

  const localState = loadState(userId);
  const mergedState = mergeRewardState(localState, parseRemoteRewardState(remoteRewards));
  try {
    localStorage.setItem(`${STATE_KEY_PREFIX}${userId}`, JSON.stringify(mergedState));
  } catch {
    /* ignore */
  }

  const shouldPush =
    isSupabaseConfigured() &&
    (mergedCoins !== remoteCoins ||
      JSON.stringify(mergedState) !== JSON.stringify(parseRemoteRewardState(remoteRewards)));

  if (shouldPush) {
    await persistCloverToServer(userId);
  }

  notify(userId);
  return mergedCoins;
}

function notify(userId: string) {
  listeners.get(userId)?.forEach((listener) => listener());
  window.dispatchEvent(new CustomEvent("reworld-clover-changed", { detail: { userId } }));
}

export function subscribeCloverRewards(userId: string, listener: CloverListener): () => void {
  if (!userId) return () => {};
  const bucket = listeners.get(userId) ?? new Set<CloverListener>();
  bucket.add(listener);
  listeners.set(userId, bucket);
  return () => {
    bucket.delete(listener);
    if (bucket.size === 0) listeners.delete(userId);
  };
}

export function getCloverBalance(userId: string): number {
  return loadCoins(userId);
}

/** Set absolute clover balance (shop + profile shared source of truth). */
export function setCloverBalance(userId: string, balance: number): number {
  if (!userId) return 0;
  const next = Math.max(0, Math.floor(balance));
  saveCoins(userId, next);
  notify(userId);
  void persistCloverToServer(userId);
  return next;
}

/** Add clovers locally and sync to Supabase user_inventory.coins */
export function addClovers(userId: string, amount: number): number {
  if (!userId || !Number.isFinite(amount) || amount <= 0) return loadCoins(userId);
  const next = loadCoins(userId) + Math.floor(amount);
  saveCoins(userId, next);
  notify(userId);
  void persistCloverToServer(userId);
  return next;
}

/** Spend clovers (buy / gift). Persists to the same store the profile reads. */
export function spendClovers(
  userId: string,
  amount: number,
): { ok: true; balance: number } | { ok: false; balance: number } {
  if (!userId || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, balance: loadCoins(userId) };
  }
  const cost = Math.floor(amount);
  const current = loadCoins(userId);
  if (current < cost) return { ok: false, balance: current };
  const next = current - cost;
  saveCoins(userId, next);
  notify(userId);
  void persistCloverToServer(userId);
  return { ok: true, balance: next };
}

/** Move clovers from buyer to seller and persist both sides. */
export function transferClovers(
  fromUserId: string,
  toUserId: string,
  amount: number,
): { ok: true; buyerBalance: number } | { ok: false; buyerBalance: number } {
  const spent = spendClovers(fromUserId, amount);
  if (!spent.ok) return { ok: false, buyerBalance: spent.balance };
  if (toUserId && toUserId !== fromUserId) {
    addClovers(toUserId, amount);
  }
  return { ok: true, buyerBalance: spent.balance };
}

export function hasCheckedInToday(userId: string, dateKey = kstDateKey()): boolean {
  return loadState(userId).attendanceDates.includes(dateKey);
}

export function getAttendanceDates(userId: string): string[] {
  return loadState(userId).attendanceDates;
}

export function getAttendanceDatesForMonth(userId: string, year: number, month: number): string[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  return loadState(userId).attendanceDates.filter((d) => d.startsWith(prefix));
}

export function claimAttendanceReward(
  userId: string,
): { ok: true; amount: number; balance: number } | { ok: false; reason: "already" | "invalid" } {
  if (!userId) return { ok: false, reason: "invalid" };
  const dateKey = kstDateKey();
  const state = loadState(userId);
  if (state.attendanceDates.includes(dateKey)) return { ok: false, reason: "already" };

  state.attendanceDates = [...state.attendanceDates, dateKey];
  saveState(userId, state);
  const balance = addClovers(userId, CLOVER_REWARD.attendance);
  return { ok: true, amount: CLOVER_REWARD.attendance, balance };
}

export function claimDiaryReward(
  userId: string,
): { ok: true; amount: number; balance: number } | { ok: false; reason: "already" | "invalid" } {
  if (!userId) return { ok: false, reason: "invalid" };
  const dateKey = kstDateKey();
  const state = loadState(userId);
  if (state.diaryRewardDates.includes(dateKey)) return { ok: false, reason: "already" };

  state.diaryRewardDates = [...state.diaryRewardDates, dateKey];
  saveState(userId, state);
  const balance = addClovers(userId, CLOVER_REWARD.diary);
  return { ok: true, amount: CLOVER_REWARD.diary, balance };
}

export function getPhotoUploadsRewardedToday(userId: string, dateKey = kstDateKey()): number {
  return loadState(userId).photoUploadDailyCounts[dateKey] ?? 0;
}

export function getPhotoUploadsRemainingToday(userId: string, dateKey = kstDateKey()): number {
  return Math.max(0, PHOTO_UPLOAD_DAILY_MAX - getPhotoUploadsRewardedToday(userId, dateKey));
}

export function claimPhotoUploadReward(
  userId: string,
): { ok: true; amount: number; balance: number } | { ok: false; reason: "daily_limit" | "invalid" } {
  if (!userId) return { ok: false, reason: "invalid" };
  const dateKey = kstDateKey();
  const state = loadState(userId);
  const count = state.photoUploadDailyCounts[dateKey] ?? 0;
  if (count >= PHOTO_UPLOAD_DAILY_MAX) return { ok: false, reason: "daily_limit" };

  state.photoUploadDailyCounts = { ...state.photoUploadDailyCounts, [dateKey]: count + 1 };
  saveState(userId, state);
  const balance = addClovers(userId, CLOVER_REWARD.photoUpload);
  return { ok: true, amount: CLOVER_REWARD.photoUpload, balance };
}

export function claimGuestbookWriteReward(
  userId: string,
  entryId: string,
): { ok: true; amount: number; balance: number } | { ok: false; reason: "already" | "invalid" } {
  if (!userId || !entryId) return { ok: false, reason: "invalid" };
  const state = loadState(userId);
  if (state.guestbookWriteIds.includes(entryId)) return { ok: false, reason: "already" };

  state.guestbookWriteIds = [...state.guestbookWriteIds, entryId].slice(-400);
  saveState(userId, state);
  const balance = addClovers(userId, CLOVER_REWARD.guestbookWrite);
  return { ok: true, amount: CLOVER_REWARD.guestbookWrite, balance };
}

/**
 * Baselining prevents awarding clovers for guestbook entries that already
 * existed before the reward system was introduced.
 */
export function baselineGuestbookReceiveRewards(userId: string, entryIds: string[]) {
  if (!userId) return;
  const state = loadState(userId);
  if (state.guestbookReceiveBaselined) return;
  state.guestbookReceiveIds = [...new Set([...state.guestbookReceiveIds, ...entryIds])].slice(-500);
  state.guestbookReceiveBaselined = true;
  saveState(userId, state);
}

export function claimGuestbookReceiveReward(
  userId: string,
  entryId: string,
): { ok: true; amount: number; balance: number } | { ok: false; reason: "already" | "invalid" | "unbaselined" } {
  if (!userId || !entryId) return { ok: false, reason: "invalid" };
  const state = loadState(userId);
  if (!state.guestbookReceiveBaselined) return { ok: false, reason: "unbaselined" };
  if (state.guestbookReceiveIds.includes(entryId)) return { ok: false, reason: "already" };

  state.guestbookReceiveIds = [...state.guestbookReceiveIds, entryId].slice(-500);
  saveState(userId, state);
  const balance = addClovers(userId, CLOVER_REWARD.guestbookReceive);
  return { ok: true, amount: CLOVER_REWARD.guestbookReceive, balance };
}

/**
 * On first run, mark current entries as already seen (no coins).
 * Afterwards, award 3 clovers for each newly appeared entry id.
 */
export function claimNewGuestbookReceiveRewards(userId: string, entryIds: string[]): number {
  if (!userId) return 0;
  const state = loadState(userId);
  if (!state.guestbookReceiveBaselined) {
    baselineGuestbookReceiveRewards(userId, entryIds);
    return 0;
  }
  let awarded = 0;
  for (const entryId of entryIds) {
    const result = claimGuestbookReceiveReward(userId, entryId);
    if (result.ok) awarded += result.amount;
  }
  return awarded;
}
