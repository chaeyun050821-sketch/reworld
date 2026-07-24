import { useState, useEffect, useRef, useMemo, type Dispatch, type SetStateAction, type CSSProperties, type ReactNode, type RefObject, type PointerEvent as ReactPointerEvent, type MouseEvent as ReactMouseEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import AuthPage from "./AuthPage";
import NicknameSetupPage from "./NicknameSetupPage";
import { FONT_KR, FONT_PIXEL, FONT_UI } from "./ui-fonts";
import { bootstrapAuth, signOut, updateUserNickname, type User } from "../lib/auth";
import {
  acceptFriendRequest,
  loadFriendRequests,
  loadFriends,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
  type FriendRequest,
  type StoredFriend,
} from "../lib/friends";
import {
  acceptIlchonRequest,
  loadIlchonList,
  loadIlchonRequests,
  rejectIlchonRequest,
  sendIlchonRequest,
  type IlchonRequest,
  type StoredIlchon,
} from "../lib/ilchon";
import { fetchOnlineUserIds, startPresenceHeartbeat } from "../lib/presence";
import { isSupabaseConfigured } from "../lib/supabase";
import {
  getUserProfile,
  mergeUserProfiles,
  profileDetailFields,
  profileTimestamp,
  saveUserProfile,
  withProfileTimestamp,
} from "../lib/profile";
import {
  filterNicknameInput,
  isNicknameTaken,
  NICKNAME_MAX_LENGTH,
  validateNicknameFormat,
} from "../lib/nickname";
import { fetchUserProfileDetails, upsertUserProfileDetails } from "../lib/supabase-profile";
import { loadAvatarProfile, saveAvatarProfile, type StoredAvatarProfile } from "../lib/avatar-storage";
import {
  emoticonSelectKey,
  getVisibleEmoticons,
  hideEmoticons,
  parseEmoticonSelectKey,
} from "../lib/emoticon-storage";
import {
  addGuestbookEntry,
  deleteGuestbookEntry,
  guestbookDateLabel,
  loadGuestbookEntries,
  startGuestbookPolling,
  subscribeGuestbook,
  type GuestbookEntryRecord,
} from "../lib/guestbook";
import {
  countUnreadNotifications,
  deleteNotification,
  fetchNotificationLastReadAt,
  formatNotificationTime,
  getLastReadAt,
  getNotificationIcon,
  loadNotifications,
  markNotificationsRead,
  subscribeNotifications,
  type AppNotification,
} from "../lib/notifications";
import {
  fetchUserAvatar,
  fetchUserAvatars,
  fetchUserInventories,
  fetchUserInventory,
  fetchUserMiniroom,
  checkUserDataTables,
  upsertUserAvatar,
  upsertUserInventory,
  upsertUserMiniroom,
} from "../lib/user-sync";
import {
  completePlayerShopPurchase,
  fetchActiveShopListings,
  fetchFriendShopCatalog,
  publishShopListing,
  removeShopListingsForItem,
  syncBuyerInventoryFromServer,
  syncSellerShopListings,
  syncShopListingItemSnapshot,
  unpublishShopListing,
} from "../lib/shop-sync";
import {
  loadDiaryEntries,
  loadDiaryTrashEntries,
  saveDiaryEntries,
  saveDiaryTrashEntries,
  type DiaryTrashEntry,
} from "../lib/diary-storage";
import { fetchDiaryEntries, upsertDiaryEntry, deleteDiaryEntry } from "../lib/diary-sync";
import { searchBgmTracks, type BgmSearchResult } from "../lib/bgm-search";
import { uploadProfileBgm } from "../lib/bgm-sync";
import { DiaryThemeProvider, useDiaryTheme } from "../lib/diary-theme-context";
import { isDiaryThemeId } from "../lib/diary-theme";
import DiaryColorPicker from "./components/DiaryColorPicker";
import {
  createBoardComment,
  createBoardPost,
  deleteBoardPost,
  fetchBoardPosts,
  formatBoardDateTime,
  toggleBoardLike,
  type BoardPostRecord,
} from "../lib/board";
import { BOARD_RULES_TEXT } from "../lib/content-moderation";
import {
  fetchVisitorStatsRemote,
  recordDiaryVisit,
  refreshVisitorStats,
  subscribeVisitorStats,
} from "../lib/visitors-sync";
import {
  formatVisitorCount,
  getVisitorStats,
  saveVisitorStats,
  toVisitorDigits,
  type VisitorStats,
} from "../lib/visitors";
import {
  applyInventorySnapshot,
  getInventorySnapshot,
  mergeInventoryWithRemoteSync,
  addHandMadeItem,
  canEquipOnAvatar,
  canEquipFromAvatarStudio,
  canListInMyShop,
  canPlaceAsInventoryDecor,
  DEFAULT_ITEM_PLACEMENT,
  DEFAULT_SHOP_COINS,
  deleteHandMadeItem,
  filterShopListingsByQuery,
  findLocalHandmadeMissingFromRemote,
  getEquippedCompanions,
  getDecorLayer,
  getMyListingsWithItems,
  GLOBAL_SHOP_LISTINGS,
  inventoryItemTypeLabel,
  isDecorItem,
  shouldShowDecorOnAvatar,
  loadAvatarCreatorItems,
  loadCoins,
  loadMyInventory,
  loadMyListings,
  loadOwnedListingIds,
  loadShopSourceItems,
  markAvatarPlacedItems,
  markListingOwned,
  hasPurchasedShopListing,
  mergePublicShopListings,
  normalizeItemPlacement,
  resolveHandMadeItemImageUrl,
  reorderEquippedDecorLayer,
  resolveDecorPlacement,
  resolveDecorPlacementForItem,
  splitDecorItemsByLayer,
  saveCoins,
  saveMyListings,
  saveOwnedListingIds,
  updateHandMadeItem,
  withPlacementReference,
  FULL_IMAGE_CONTENT_BOUNDS,
  isFullImageContentBounds,
  measureImageContentBounds,
  AVATAR_DECOR_SIZE_RATIO,
  ITEM_CREATOR_AVATAR_WIDTH,
  avatarPreviewHeightForWidth,
  clampItemScale,
  MAX_ITEM_SCALE,
  MIN_ITEM_SCALE,
  type HandMadeItem,
  type HandMadeItemContentBounds,
  type HandMadeItemPlacement,
  type ShopListingWithItem,
} from "../lib/shop-storage";
import {
  ROOM_CATEGORIES,
  EMPTY_ROOM_SELECTIONS,
  ROOM_VIEW_WIDTH,
  ROOM_VIEW_HEIGHT,
  ROOM_WALL_HEIGHT,
  ROOM_FLOOR_Y,
  ROOM_LEFT_PROP_FLOOR_Y,
  getItemsByCategory,
  getPlacedRoomItems,
  getPlacedRoomItemsByDepth,
  itemVisualBounds,
  roomItemHasVisual,
  getItemById,
  loadRoomSelections,
  loadMiniroomData,
  saveRoomSelections,
  saveMiniroomData,
  mergeMiniroomData,
  hasMiniroomSelections,
  ROOM_NON_DRAGGABLE,
  DEFAULT_ROOM_AVATAR_POSITION,
  EMPTY_MINIROOM_DATA,
  AVATAR_ITEMS,
  INIT_FIELDS,
  PALETTE,
  PHOTO_BOOTH_GRADIENTS,
  PIXEL_COLS,
  PIXEL_ROWS,
  SAMPLE_EMOTICONS,
  TABS,
  WEATHER_OPTIONS,
  type ProfileField,
  type Privacy,
  type DiaryEntry,
  type TabConfig,
  type RoomSelections,
  type RoomCategoryId,
  type RoomItemLookup,
  type RoomItemOffset,
  type RoomAvatarPosition,
  type MiniroomData,
  type InventoryPlacement,
  type PixelRect,
  defaultInventoryPlacement,
} from "./data";
import { usePhotoAlbum } from "./hooks/useSharedPhotos";
import { usePhotoSocial } from "./hooks/usePhotoSocial";
import type { PhotoComment } from "./hooks/usePhotoSocial";
import { fetchUserPhotos } from "../lib/photo-sync";
import type { StoredPhoto } from "../lib/photo-storage";
import { photoBoothShotStyle, useLiveCamera } from "../lib/camera-capture";
import { formatDiaryDisplayDate, formatDottedDate, formatIsoDate } from "./utils/date";
import shopCoinImage from "../../coin-transparent.png";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";

const DIARY = {
  pageW: 420,
  pageH: 640,
  spineW: 12,
  tabW: 28,
} as const;
const DIARY_SPREAD_W = DIARY.pageW * 2 + DIARY.spineW + DIARY.tabW;
const DIARY_PAPER_BG = "var(--diary-paper-bg)";
const MINIROOM_PREVIEW_FRAME_STYLE: CSSProperties = {
  border: "1.5px solid rgba(var(--diary-mid-rgb), 0.25)",
  background: "var(--diary-surface)",
  boxShadow: "inset 0 2px 8px rgba(var(--diary-mid-rgb),0.06)",
};
/** Home mini-room panel height (page minus board, notifications, padding). */
const HOME_MINIROOM_SLOT_HEIGHT = DIARY.pageH - 194;
const ACCENT_BTN_BG = "linear-gradient(90deg, #ff4757, #ff6b81)";
const ACCENT_BTN_BG_135 = "linear-gradient(135deg, #ff4757, #ff6b81)";
const ACCENT_BTN_SHADOW = "0 1px 6px rgba(255,71,87,0.35)";
const ROOM_ASPECT = `${ROOM_VIEW_WIDTH} / ${ROOM_VIEW_HEIGHT}`;
const FRIEND_ROOM_STANDING_AVATAR = { scale: 2.6 } as const;

function clientToRoomPoint(rect: DOMRect, clientX: number, clientY: number, slice = false) {
  const scaleX = rect.width / ROOM_VIEW_WIDTH;
  const scaleY = rect.height / ROOM_VIEW_HEIGHT;
  const scale = slice ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
  const drawnW = ROOM_VIEW_WIDTH * scale;
  const drawnH = ROOM_VIEW_HEIGHT * scale;
  const offsetX = (rect.width - drawnW) / 2;
  const offsetY = (rect.height - drawnH) / 2;
  return {
    x: (clientX - rect.left - offsetX) / scale,
    y: (clientY - rect.top - offsetY) / scale,
  };
}

function hitTestPlacedCategory(
  point: { x: number; y: number },
  selections: RoomSelections,
  offsets: Partial<Record<RoomCategoryId, RoomItemOffset>>,
  lookup: RoomItemLookup = getItemById,
): RoomCategoryId | null {
  const placed = getPlacedRoomItemsByDepth(selections, offsets, lookup);
  for (let i = placed.length - 1; i >= 0; i--) {
    const { categoryId, item } = placed[i];
    if (ROOM_NON_DRAGGABLE.includes(categoryId)) continue;
    const offset = offsets[categoryId] ?? { x: 0, y: 0 };
    const bounds = itemVisualBounds(item);
    if (!bounds) continue;
    const bx = bounds.x + offset.x;
    const by = bounds.y + offset.y;
    if (point.x >= bx && point.x <= bx + bounds.w && point.y >= by && point.y <= by + bounds.h) {
      return categoryId;
    }
  }
  return null;
}

function hitTestInventoryPlacement(
  point: { x: number; y: number },
  placements: InventoryPlacement[],
): string | null {
  for (let i = placements.length - 1; i >= 0; i--) {
    const placement = placements[i];
    if (
      point.x >= placement.x &&
      point.x <= placement.x + placement.w &&
      point.y >= placement.y &&
      point.y <= placement.y + placement.h
    ) {
      return placement.itemId;
    }
  }
  return null;
}

/** Mini room frame — preserves full viewBox, never crops */
function MiniRoomPreviewPanel({
  children,
  overlay,
  borderColor,
  className = "",
  style,
}: {
  children: ReactNode;
  overlay?: ReactNode;
  borderColor?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-xl overflow-hidden flex-1 min-h-0 relative ${className}`}
      style={{
        ...MINIROOM_PREVIEW_FRAME_STYLE,
        ...(borderColor ? { border: `1.5px solid ${borderColor}` } : {}),
        ...style,
      }}
    >
      {children}
      {overlay}
    </div>
  );
}

function RoomCanvas({
  selections,
  offsets = {},
  inventoryPlacements = [],
  inventoryById,
  style,
  className = "",
  fillHeight = false,
  standingAvatar,
  avatarPosition = DEFAULT_ROOM_AVATAR_POSITION,
  avatarUserId,
  avatarInventory,
  editableItems = false,
  editableAvatar = false,
  highlightCategory,
  roomItemLookup = getItemById,
  onItemOffsetChange,
  onInventoryPlacementChange,
  onAvatarPositionChange,
}: {
  selections?: RoomSelections;
  offsets?: Partial<Record<RoomCategoryId, RoomItemOffset>>;
  inventoryPlacements?: InventoryPlacement[];
  inventoryById?: Map<string, HandMadeItem>;
  style?: CSSProperties;
  className?: string;
  fillHeight?: boolean;
  standingAvatar?: AvatarProfile | null;
  avatarPosition?: RoomAvatarPosition;
  avatarUserId?: string;
  avatarInventory?: HandMadeItem[] | null;
  editableItems?: boolean;
  editableAvatar?: boolean;
  highlightCategory?: RoomCategoryId | null;
  roomItemLookup?: RoomItemLookup;
  onItemOffsetChange?: (categoryId: RoomCategoryId, offset: RoomItemOffset) => void;
  onInventoryPlacementChange?: (itemId: string, position: Pick<InventoryPlacement, "x" | "y">) => void;
  onAvatarPositionChange?: (position: RoomAvatarPosition) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<
    | { kind: "item"; categoryId: RoomCategoryId; startX: number; startY: number; baseX: number; baseY: number }
    | { kind: "inventory"; itemId: string; startX: number; startY: number; baseX: number; baseY: number }
    | { kind: "avatar"; startX: number; baseX: number }
    | null
  >(null);

  const avatarW = PIXEL_COLS * FRIEND_ROOM_STANDING_AVATAR.scale;
  const avatarH = avatarPreviewHeightForWidth(avatarW);
  const avatarTopY = ROOM_LEFT_PROP_FLOOR_Y - avatarH;
  const roomSlice = fillHeight;

  const finishDrag = () => {
    dragRef.current = null;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!editableItems && !editableAvatar) return;
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const point = clientToRoomPoint(rect, event.clientX, event.clientY, roomSlice);

    if (editableAvatar && standingAvatar) {
      const ax = avatarPosition.x;
      if (point.x >= ax && point.x <= ax + avatarW && point.y >= avatarTopY && point.y <= avatarTopY + avatarH) {
        dragRef.current = { kind: "avatar", startX: point.x, baseX: avatarPosition.x };
        stage.setPointerCapture(event.pointerId);
        event.preventDefault();
        return;
      }
    }

    if (editableItems && selections) {
      const inventoryItemId = hitTestInventoryPlacement(point, inventoryPlacements);
      if (inventoryItemId && onInventoryPlacementChange) {
        const placement = inventoryPlacements.find(entry => entry.itemId === inventoryItemId);
        if (placement) {
          dragRef.current = {
            kind: "inventory",
            itemId: inventoryItemId,
            startX: point.x,
            startY: point.y,
            baseX: placement.x,
            baseY: placement.y,
          };
          stage.setPointerCapture(event.pointerId);
          event.preventDefault();
          return;
        }
      }

      const categoryId = hitTestPlacedCategory(point, selections, offsets, roomItemLookup);
      if (categoryId) {
        const base = offsets[categoryId] ?? { x: 0, y: 0 };
        dragRef.current = { kind: "item", categoryId, startX: point.x, startY: point.y, baseX: base.x, baseY: base.y };
        stage.setPointerCapture(event.pointerId);
        event.preventDefault();
      }
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const stage = stageRef.current;
    if (!drag || !stage) return;
    const rect = stage.getBoundingClientRect();
    const point = clientToRoomPoint(rect, event.clientX, event.clientY, roomSlice);

    if (drag.kind === "item" && onItemOffsetChange) {
      const dx = point.x - drag.startX;
      const dy = point.y - drag.startY;
      onItemOffsetChange(drag.categoryId, {
        x: Math.round(drag.baseX + dx),
        y: Math.round(drag.baseY + dy),
      });
    } else if (drag.kind === "inventory" && onInventoryPlacementChange) {
      const dx = point.x - drag.startX;
      const dy = point.y - drag.startY;
      onInventoryPlacementChange(drag.itemId, {
        x: Math.round(drag.baseX + dx),
        y: Math.round(drag.baseY + dy),
      });
    } else if (drag.kind === "avatar" && onAvatarPositionChange) {
      const dx = point.x - drag.startX;
      const nextX = Math.round(Math.max(0, Math.min(ROOM_VIEW_WIDTH - avatarW, drag.baseX + dx)));
      onAvatarPositionChange({ x: nextX });
    }
  };

  const stageStyle: CSSProperties = fillHeight
    ? { width: "100%", height: "100%" }
    : { width: "100%", aspectRatio: ROOM_ASPECT };

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={
        fillHeight
          ? { width: "100%", height: "100%", background: "var(--diary-surface)", ...style }
          : { width: "100%", aspectRatio: ROOM_ASPECT, background: "var(--diary-surface)", ...style }
      }
    >
      <div
        ref={stageRef}
        className="relative touch-none"
        style={{
          ...stageStyle,
          cursor: editableItems || editableAvatar ? "grab" : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={finishDrag}
      >
        <MiniRoom
          selections={selections}
          offsets={offsets}
          highlightCategory={highlightCategory}
          roomItemLookup={roomItemLookup}
          inventoryPlacements={inventoryPlacements}
          inventoryById={inventoryById}
          fill={fillHeight}
        />
        {standingAvatar && (
          <div
            className="absolute"
            style={{
              left: `${(avatarPosition.x / ROOM_VIEW_WIDTH) * 100}%`,
              top: `${(avatarTopY / ROOM_VIEW_HEIGHT) * 100}%`,
              width: `${(avatarW / ROOM_VIEW_WIDTH) * 100}%`,
              height: `${(avatarH / ROOM_VIEW_HEIGHT) * 100}%`,
              zIndex: 2,
              pointerEvents: editableAvatar ? "auto" : "none",
              cursor: editableAvatar ? "auto" : undefined,
            }}
          >
            <AvatarWithCompanions
              avatar={standingAvatar}
              userId={avatarUserId}
              inventory={avatarInventory}
              width="100%"
              height="100%"
              companionScale={0.55}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   SHARED ATOMS
═══════════════════════════════════════════ */

const PixelHeart = ({ size = 14, color = "var(--diary-mid)" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 10 9" style={{ imageRendering: "pixelated" }} fill={color}>
    <rect x="1" y="0" width="3" height="1" /><rect x="6" y="0" width="3" height="1" />
    <rect x="0" y="1" width="4" height="1" /><rect x="6" y="1" width="4" height="1" />
    <rect x="0" y="2" width="10" height="1" /><rect x="0" y="3" width="10" height="1" />
    <rect x="1" y="4" width="8" height="1" /><rect x="2" y="5" width="6" height="1" />
    <rect x="3" y="6" width="4" height="1" /><rect x="4" y="7" width="2" height="1" />
    <rect x="5" y="8" width="1" height="1" />
  </svg>
);

const PixelStar = ({ x, y, size, delay, color }: { x: string; y: string; size: number; delay: number; color: string }) => (
  <motion.div
    className="absolute pointer-events-none select-none"
    style={{ left: x, top: y, fontSize: size, color, lineHeight: 1 }}
    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
    transition={{ duration: 2.5 + delay * 0.3, delay, repeat: Infinity, ease: "easeInOut" }}
  >✦</motion.div>
);

/* ═══════════════════════════════════════════
   COVER PAGE
═══════════════════════════════════════════ */

const HoloStripe = ({ top, rotate, opacity }: { top: string; rotate: number; opacity: number }) => (
  <div className="absolute w-full h-6 pointer-events-none" style={{
    top, transform: `rotate(${rotate}deg)`, opacity,
    background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 20%, rgba(var(--diary-main-rgb),0.5) 35%, rgba(var(--diary-mid-rgb),0.45) 50%, rgba(var(--diary-mid-rgb),0.35) 65%, rgba(255,255,255,0.5) 80%, transparent 100%)",
    filter: "blur(2px)",
  }} />
);

const Corner = ({ flip }: { flip?: boolean }) => (
  <svg width="90" height="90" viewBox="0 0 90 90" fill="none" style={{ transform: flip ? "scale(-1,1)" : undefined }}>
    <path d="M8 8 L8 40 Q8 50 18 50" stroke="var(--diary-mid)" strokeWidth="2" fill="none" opacity="0.7" />
    <path d="M8 8 L40 8 Q50 8 50 18" stroke="var(--diary-dark)" strokeWidth="2" fill="none" opacity="0.7" />
    <circle cx="8" cy="8" r="4" fill="var(--diary-main)" />
    <circle cx="50" cy="18" r="3" fill="var(--diary-mid)" opacity="0.8" />
    <circle cx="18" cy="50" r="3" fill="var(--diary-dark)" opacity="0.8" />
    <path d="M20 20 Q30 14 40 20 Q30 26 20 20Z" fill="var(--diary-main)" opacity="0.5" />
    <path d="M20 20 Q14 30 20 40 Q26 30 20 20Z" fill="var(--diary-soft2)" opacity="0.4" />
    <circle cx="29" cy="29" r="4" fill="white" opacity="0.4" />
  </svg>
);


function CoverPage({ onOpen, nickname }: { onOpen: () => void; nickname?: string }) {
  const { theme, setViewThemeTarget } = useDiaryTheme();

  useEffect(() => {
    setViewThemeTarget(null);
  }, [setViewThemeTarget]);
  const stars = [
    { x: "7%", y: "9%", size: 22, delay: 0, color: theme.mid },
    { x: "83%", y: "6%", size: 18, delay: 0.5, color: theme.dark },
    { x: "90%", y: "70%", size: 24, delay: 1.1, color: theme.main },
    { x: "4%", y: "75%", size: 20, delay: 0.3, color: theme.soft },
    { x: "48%", y: "3%", size: 14, delay: 0.8, color: theme.soft2 },
    { x: "15%", y: "48%", size: 12, delay: 1.6, color: theme.main },
    { x: "75%", y: "45%", size: 12, delay: 2.0, color: theme.mid },
    { x: "35%", y: "87%", size: 16, delay: 0.6, color: theme.dark },
    { x: "62%", y: "84%", size: 14, delay: 1.4, color: theme.light },
    { x: "68%", y: "18%", size: 18, delay: 0.9, color: theme.soft2 },
    { x: "25%", y: "15%", size: 13, delay: 2.2, color: theme.mid },
  ];

  return (
    <div className="size-full flex items-center justify-center relative" style={{
      background: "var(--diary-outer-bg)",
    }}>
      <div className="absolute bottom-4 right-4 z-20">
        <DiaryColorPicker />
      </div>
      <div className="absolute rounded-full pointer-events-none" style={{
        width: 500, height: 500,
        background: "radial-gradient(circle, rgba(var(--diary-mid-rgb), 0.18) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />
      <motion.div
        className="relative overflow-hidden cursor-pointer"
        style={{
          width: DIARY.pageW, height: DIARY.pageH,
          borderRadius: "4px 16px 16px 4px",
          boxShadow: "6px 10px 50px rgba(var(--diary-dark-rgb), 0.28), 2px 4px 16px rgba(var(--diary-mid-rgb), 0.2), 0 0 0 1px rgba(255,255,255,0.6)",
          background: "var(--diary-cover-bg)",
        }}
        onClick={onOpen}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <HoloStripe top="18%" rotate={-4} opacity={0.35} />
        <HoloStripe top="45%" rotate={3} opacity={0.25} />
        <HoloStripe top="72%" rotate={-2} opacity={0.3} />
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(255,255,255,0.55) 0%, transparent 70%)",
        }} />
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, var(--diary-mid) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }} />
        <div className="absolute inset-3 rounded-xl pointer-events-none" style={{
          border: "1.5px solid rgba(255,255,255,0.7)",
          boxShadow: "0 0 0 1px rgba(var(--diary-mid-rgb), 0.2) inset",
        }} />
        <div className="absolute inset-5 rounded-lg pointer-events-none" style={{
          border: "1px dashed rgba(var(--diary-mid-rgb), 0.4)",
        }} />
        <div className="absolute top-3 left-3"><Corner /></div>
        <div className="absolute top-3 right-3"><Corner flip /></div>
        <div className="absolute bottom-3 left-3" style={{ transform: "scaleY(-1)" }}><Corner /></div>
        <div className="absolute bottom-3 right-3" style={{ transform: "scale(-1) scaleX(-1)" }}><Corner flip /></div>
        {stars.map((s, i) => <PixelStar key={i} {...s} />)}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-10 z-10">
          <motion.p
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            style={{
              fontFamily: FONT_PIXEL,
              fontSize: "0.38rem",
              color: "var(--diary-dark)",
              letterSpacing: "0.06em",
              textAlign: "center",
              lineHeight: 2,
              textShadow: "1px 1px 0 rgba(var(--diary-main-rgb), 0.9)",
            }}
          >
            My Personal Diary
          </motion.p>
          <motion.div className="text-center" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.75, duration: 1, ease: [0.22, 1, 0.36, 1] }}>
            <h1
              style={{
                fontFamily: FONT_PIXEL,
                fontSize: "1.15rem",
                color: "var(--diary-text)",
                lineHeight: 1.8,
                letterSpacing: "0.04em",
                textShadow: "2px 2px 0 rgba(var(--diary-main-rgb), 0.9), 4px 4px 0 rgba(var(--diary-dark-rgb), 0.35)",
              }}
            >Re:world</h1>
            <motion.div className="mx-auto mt-1 h-0.5 rounded-full" style={{
              background: "linear-gradient(90deg, transparent, var(--diary-main), #fff, var(--diary-mid), var(--diary-main), transparent)",
              boxShadow: "0 0 6px rgba(var(--diary-mid-rgb), 0.5)",
            }} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.2, duration: 0.9 }} />
          </motion.div>
          <p style={{ fontFamily: FONT_PIXEL, fontSize: "0.42rem", color: "var(--diary-dark)", letterSpacing: "0.08em", textAlign: "center", lineHeight: 2, opacity: 0.8 }}>
            thoughts · memories · dreams
          </p>
          <div className="flex items-center gap-2 w-full px-4">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(var(--diary-mid-rgb), 0.45))" }} />
            <span style={{ color: "var(--diary-mid)", fontSize: 14 }}>✦</span>
            <span style={{ color: "var(--diary-dark)", fontSize: 10 }}>★</span>
            <span style={{ color: "var(--diary-main)", fontSize: 14 }}>✦</span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(var(--diary-dark-rgb), 0.45))" }} />
          </div>
          {/* open hint */}
          <motion.p
            className="mt-2 text-center"
            style={{ fontFamily: FONT_UI, fontSize: "0.65rem", color: "var(--diary-dark)", letterSpacing: "0.1em" }}
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {nickname ? `${nickname}님, ` : ""}클릭해서 열기 ▶
          </motion.p>
        </div>
        <div className="absolute inset-x-0 top-0 h-1/3 pointer-events-none rounded-t-2xl" style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)",
        }} />
        <motion.div className="absolute inset-0 pointer-events-none" style={{
          background: "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.22) 50%, transparent 65%)",
        }} initial={{ x: "-100%" }} animate={{ x: "200%" }} transition={{ duration: 2.2, delay: 1.6, ease: "easeInOut" }} />
        <div className="absolute left-0 top-0 bottom-0 w-4 pointer-events-none" style={{
          background: "linear-gradient(to right, rgba(var(--diary-dark-rgb), 0.12), transparent)",
        }} />
      </motion.div>
      <div className="absolute" style={{
        width: 12, height: DIARY.pageH,
        left: `calc(50% - ${DIARY.pageW / 2}px - 8px)`,
        borderRadius: "4px 0 0 4px",
        background: `linear-gradient(to right, ${theme.soft}, ${theme.main})`,
        boxShadow: "-3px 0 10px rgba(var(--diary-dark-rgb), 0.2)",
      }} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   PIXEL AVATAR SVG (legacy — guestbook neighbors)
═══════════════════════════════════════════ */
type LegacyAvatarConfig = {
  hairDark: string;
  hairLight: string;
  skin: string;
  outfit: string;
  outfitDark: string;
  outfitInner: string;
  pants: string;
};

const DEFAULT_LEGACY_AVATAR: LegacyAvatarConfig = {
  hairDark: "#3d1a00",
  hairLight: "#5c2800",
  skin: "#ffc8a0",
  outfit: "#ff80c8",
  outfitDark: "#ff60b8",
  outfitInner: "#ffe0f4",
  pants: "#c8a0ff",
};

function LegacyPixelAvatar({
  config = DEFAULT_LEGACY_AVATAR,
  width = 72,
  height = 90,
}: {
  config?: LegacyAvatarConfig;
  width?: number;
  height?: number;
}) {
  const c = config;
  return (
    <svg width={width} height={height} viewBox="0 0 18 22" style={{ imageRendering: "pixelated" }}>
      {/* hair */}
      <rect x="5" y="1" width="8" height="1" fill={c.hairDark} />
      <rect x="4" y="2" width="10" height="1" fill={c.hairDark} />
      <rect x="4" y="3" width="10" height="4" fill={c.hairLight} />
      <rect x="3" y="4" width="1" height="3" fill={c.hairLight} />
      <rect x="14" y="4" width="1" height="3" fill={c.hairLight} />
      {/* face */}
      <rect x="4" y="5" width="10" height="7" fill={c.skin} />
      {/* eyes */}
      <rect x="6" y="7" width="2" height="2" fill="#2d1a00" />
      <rect x="10" y="7" width="2" height="2" fill="#2d1a00" />
      <rect x="7" y="7" width="1" height="1" fill="#ffffff" />
      <rect x="11" y="7" width="1" height="1" fill="#ffffff" />
      {/* blush */}
      <rect x="5" y="9" width="2" height="1" fill="#ffaaaa" opacity="0.7" />
      <rect x="11" y="9" width="2" height="1" fill="#ffaaaa" opacity="0.7" />
      {/* mouth */}
      <rect x="8" y="10" width="2" height="1" fill="#ff8080" />
      {/* neck */}
      <rect x="7" y="12" width="4" height="2" fill={c.skin} />
      {/* outfit */}
      <rect x="3" y="14" width="12" height="6" fill={c.outfit} />
      <rect x="2" y="14" width="3" height="5" fill={c.outfitDark} />
      <rect x="13" y="14" width="3" height="5" fill={c.outfitDark} />
      <rect x="7" y="14" width="4" height="1" fill={c.outfitDark} />
      <rect x="7" y="15" width="4" height="3" fill={c.outfitInner} />
      {/* legs */}
      <rect x="5" y="20" width="3" height="2" fill={c.pants} />
      <rect x="10" y="20" width="3" height="2" fill={c.pants} />
    </svg>
  );
}

function NeighborAvatar({
  avatar,
  color,
  size = 40,
  showOnline = false,
  isOnline = false,
}: {
  avatar: LegacyAvatarConfig;
  color: string;
  size?: number;
  showOnline?: boolean;
  isOnline?: boolean;
}) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-xl flex items-end justify-center overflow-hidden w-full h-full"
        style={{
          background: `linear-gradient(135deg, ${color}55, ${color}22)`,
          border: `2px solid ${color}`,
        }}
      >
        <LegacyPixelAvatar config={avatar} width={size * 0.72} height={size * 0.9} />
      </div>
      {showOnline && (
        <div
          className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
          style={{ background: isOnline ? "#4cda64" : "#b8bcc6", zIndex: 10 }}
          title={isOnline ? "활동 중" : "비활동"}
        />
      )}
    </div>
  );
}
/* ═══════════════════════════════════════════
   PIXEL AVATAR SVG
═══════════════════════════════════════════ */
type AvatarPixelMap = Record<string, string>;

type AvatarConfig = {
  body: string;
  pixels: AvatarPixelMap;
};

type AvatarProfile = {
  config: AvatarConfig;
  equipped: string[];
};

type AvatarRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  part: keyof AvatarConfig | "fixed";
  opacity?: number;
};

const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  body: "#ffd0ad",
  pixels: {},
};

const DEFAULT_EQUIPPED = ["hair-basic", "outfit-whitetee", "pants-whiteshorts"] as const;

const DEFAULT_AVATAR_PROFILE: AvatarProfile = {
  config: DEFAULT_AVATAR_CONFIG,
  equipped: [...DEFAULT_EQUIPPED],
};

const SOLID_TOP_IDS = new Set(["outfit-whitetee", "outfit-pinktee", "outfit-sage"]);

function normalizeEquipped(equipped?: string[] | null): string[] {
  const next = (equipped ?? []).filter((id) => id !== "other-crown");
  return next.length > 0 ? next : [...DEFAULT_EQUIPPED];
}

type DiaryProfile = {
  title: string;
  status: string;
  tags: string[];
  fields: ProfileField[];
  bgmTitle: string;
};

const DEFAULT_DIARY_PROFILE: DiaryProfile = {
  title: "Re:world",
  status: "일상 기록중 🌸",
  tags: ["#daily", "#y2k", "#diary"],
  fields: INIT_FIELDS,
  bgmTitle: "Lovefool - The Cardigans",
};

const AVATAR_ITEM_CATEGORIES = ["전체", "내 아이템", "헤어", "얼굴", "의상", "악세사리", "기타"] as const;
type AvatarItemCategory = typeof AVATAR_ITEM_CATEGORIES[number];

type MiniRoomPickerTab = RoomCategoryId | "my-items";

const HAND_TRACKING_DRAW_URL = "./hand-tracking/index.html";
const DIARY_RESTORE_SPREAD_KEY = "reworld_diary_restore";

function openHandTrackingDrawPage(userId: string) {
  const url = new URL(HAND_TRACKING_DRAW_URL, window.location.href);
  const returnUrl = window.location.href;
  if (userId) {
    url.searchParams.set("userId", userId);
    try {
      sessionStorage.setItem("reworld_hand_tracking_user_id", userId);
      sessionStorage.setItem("reworld_hand_tracking_return", returnUrl);
      sessionStorage.setItem(DIARY_RESTORE_SPREAD_KEY, "spread");
    } catch {
      /* ignore quota / private mode */
    }
  }
  url.searchParams.set("return", returnUrl);
  window.location.assign(url.href);
}

function cloneAvatarProfile(profile: AvatarProfile): AvatarProfile {
  return {
    config: {
      ...profile.config,
      pixels: { ...profile.config.pixels },
    },
    equipped: [...normalizeEquipped(profile.equipped)],
  };
}

function isDecorEquipId(userId: string, itemId: string): boolean {
  const item = loadMyInventory(userId).find(entry => entry.id === itemId);
  return !!item && isDecorItem(item);
}

function stripUnplacedPurchasedEquipped(userId: string, profile: AvatarProfile): AvatarProfile {
  return {
    ...profile,
    equipped: profile.equipped.filter(id => {
      const item = loadMyInventory(userId).find(entry => entry.id === id);
      if (item?.source === "purchased" && !item.avatarPlaced) return false;
      return true;
    }),
  };
}

function buildItemCreatorSavedAvatar(
  userId: string,
  base: AvatarProfile,
  creator: AvatarProfile,
  clothesOn: boolean,
  clothesBackup: string[],
  activeDecorId: string | null,
): AvatarProfile {
  const decorIds = new Set<string>();
  for (const id of creator.equipped) {
    if (isDecorEquipId(userId, id)) decorIds.add(id);
  }
  for (const id of clothesBackup) {
    if (isDecorEquipId(userId, id)) decorIds.add(id);
  }
  if (activeDecorId && isDecorEquipId(userId, activeDecorId)) {
    decorIds.add(activeDecorId);
  }

  const catalogIds = (clothesOn ? creator.equipped : base.equipped).filter(
    id => !isDecorEquipId(userId, id),
  );

  return {
    ...base,
    config: {
      ...base.config,
      pixels: { ...creator.config.pixels },
    },
    equipped: Array.from(new Set([...catalogIds, ...decorIds])),
  };
}

const getPixelKey = (x: number, y: number) => x + "-" + y;

function cssColorToHex(color: string): string | null {
  const value = color.trim().toLowerCase();
  if (!value || value === "transparent") return null;
  if (/^#[0-9a-f]{6}$/.test(value)) return value;
  if (/^#[0-9a-f]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }
  const match = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(Number(match[1]))}${toHex(Number(match[2]))}${toHex(Number(match[3]))}`;
}

function getAvatarRects(config: AvatarConfig): AvatarRect[] {
  const skin = config.body ?? "#ffd0ad";
  const eye = "#5b3322";
  const blush = skin;
  const mouth = skin;
  const lip = "#f08aa8";
  const shirt = skin;
  const shirtShade = skin;
  const shirtMark = skin;
  const shorts = skin;
  const shoe = skin;
  const shoeLight = skin;

  return [
    { x: 12, y: 3, width: 8, height: 1, fill: skin, part: "body" },
    { x: 10, y: 4, width: 12, height: 2, fill: skin, part: "body" },
    { x: 9, y: 6, width: 14, height: 9, fill: skin, part: "body" },
    { x: 10, y: 15, width: 12, height: 2, fill: skin, part: "body" },
    { x: 12, y: 17, width: 8, height: 1, fill: skin, part: "body" },
    { x: 8, y: 10, width: 2, height: 5, fill: skin, part: "body" },
    { x: 22, y: 10, width: 2, height: 5, fill: skin, part: "body" },
    { x: 14, y: 18, width: 4, height: 2, fill: skin, part: "body" },
    { x: 12, y: 20, width: 8, height: 1, fill: skin, part: "body" },
    { x: 10, y: 21, width: 12, height: 10, fill: shirt, part: "body" },
    { x: 9, y: 21, width: 1, height: 2, fill: skin, part: "body" },
    { x: 22, y: 21, width: 1, height: 2, fill: skin, part: "body" },
    { x: 10, y: 30, width: 12, height: 1, fill: shirtShade, part: "body" },
    { x: 14, y: 23, width: 4, height: 3, fill: shirtMark, part: "body" },
    { x: 13, y: 26, width: 2, height: 2, fill: shirtMark, part: "body" },
    { x: 17, y: 26, width: 2, height: 2, fill: shirtMark, part: "body" },
    { x: 15, y: 28, width: 2, height: 2, fill: shirtMark, part: "body" },
    { x: 15, y: 23, width: 2, height: 7, fill: skin, part: "body" },
    { x: 10, y: 29, width: 5, height: 1, fill: skin, part: "body" },
    { x: 15, y: 29, width: 2, height: 1, fill: skin, part: "body" },
    { x: 17, y: 29, width: 5, height: 1, fill: skin, part: "body" },
    { x: 7, y: 23, width: 3, height: 10, fill: skin, part: "body" },
    { x: 22, y: 23, width: 3, height: 10, fill: skin, part: "body" },
    { x: 6, y: 33, width: 4, height: 2, fill: skin, part: "body" },
    { x: 22, y: 33, width: 4, height: 2, fill: skin, part: "body" },
    { x: 10, y: 31, width: 5, height: 8, fill: skin, part: "body" },
    { x: 15, y: 31, width: 2, height: 5, fill: skin, part: "body" },
    { x: 17, y: 31, width: 5, height: 8, fill: skin, part: "body" },
    { x: 10, y: 39, width: 5, height: 6, fill: skin, part: "body" },
    { x: 17, y: 39, width: 5, height: 6, fill: skin, part: "body" },
    { x: 10, y: 45, width: 5, height: 3, fill: shoe, part: "body" },
    { x: 8, y: 46, width: 2, height: 2, fill: shoe, part: "body" },
    { x: 11, y: 47, width: 3, height: 1, fill: shoeLight, part: "body" },
    { x: 17, y: 45, width: 5, height: 3, fill: shoe, part: "body" },
    { x: 22, y: 46, width: 2, height: 2, fill: shoe, part: "body" },
    { x: 18, y: 47, width: 3, height: 1, fill: shoeLight, part: "body" },
    { x: 12, y: 9, width: 2, height: 3, fill: eye, part: "body" },
    { x: 18, y: 9, width: 2, height: 3, fill: eye, part: "body" },
    { x: 13, y: 9, width: 1, height: 1, fill: "#fff7e8", part: "body" },
    { x: 19, y: 9, width: 1, height: 1, fill: "#fff7e8", part: "body" },
    { x: 10, y: 13, width: 3, height: 2, fill: blush, part: "body" },
    { x: 20, y: 13, width: 3, height: 2, fill: blush, part: "body" },
    { x: 14, y: 14, width: 4, height: 4, fill: mouth, part: "body" },
    { x: 15, y: 15, width: 2, height: 1, fill: lip, part: "body" },
  ];
}

function PixelAvatar({
  avatar = DEFAULT_AVATAR_PROFILE,
  width = 84,
  height = 102,
  viewBox = `0 0 ${PIXEL_COLS} ${PIXEL_ROWS}`,
}: {
  avatar?: AvatarProfile;
  width?: number;
  height?: number;
  viewBox?: string;
}) {
  const { config, equipped } = avatar;

  return (
    <svg width={width} height={height} viewBox={viewBox} style={{ imageRendering: "pixelated" }}>
      {getAvatarRects(config).map(({ part, ...rect }, i) => (
        <rect key={String(part) + "-" + i} {...rect} />
      ))}
      {Object.entries(config.pixels ?? {}).map(([key, fill]) => {
        const [x, y] = key.split("-").map(Number);
        if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
        return <rect key={"paint-" + key} x={x} y={y} width="1" height="1" fill={fill} />;
      })}
      {equipped.includes("hair-basic") && (
        <>
          <rect x="10" y="3" width="12" height="2" fill="#5a3a28" />
          <rect x="9" y="5" width="14" height="4" fill="#6b4a34" />
          <rect x="8" y="7" width="3" height="6" fill="#6b4a34" />
          <rect x="21" y="7" width="3" height="6" fill="#6b4a34" />
          <rect x="11" y="6" width="10" height="2" fill="#7a5a42" />
        </>
      )}
      {equipped.includes("hair-bob") && (
        <>
          <rect x="10" y="2" width="12" height="2" fill="#6a3a20" />
          <rect x="8" y="4" width="16" height="4" fill="#7a4a2a" />
          <rect x="7" y="7" width="4" height="8" fill="#7a4a2a" />
          <rect x="21" y="7" width="4" height="8" fill="#7a4a2a" />
          <rect x="10" y="6" width="12" height="2" fill="#8b5a36" />
          <rect x="13" y="7" width="2" height="3" fill="#6a3a20" />
        </>
      )}
      {equipped.includes("hair-twintail") && (
        <>
          <rect x="10" y="2" width="12" height="2" fill="#3b2a24" />
          <rect x="8" y="4" width="16" height="5" fill="#4b342b" />
          <rect x="5" y="8" width="5" height="9" fill="#4b342b" />
          <rect x="22" y="8" width="5" height="9" fill="#4b342b" />
          <rect x="6" y="12" width="3" height="7" fill="#3b2a24" />
          <rect x="23" y="12" width="3" height="7" fill="#3b2a24" />
          <rect x="7" y="8" width="3" height="2" fill="#d86f86" />
          <rect x="22" y="8" width="3" height="2" fill="#d86f86" />
        </>
      )}
      {equipped.includes("hair-wave") && (
        <>
          <rect x="9" y="1" width="14" height="3" fill="#2f2a35" />
          <rect x="7" y="4" width="18" height="5" fill="#3f3848" />
          <rect x="6" y="8" width="5" height="10" fill="#3f3848" />
          <rect x="21" y="8" width="5" height="10" fill="#3f3848" />
          <rect x="10" y="6" width="5" height="2" fill="#554c61" />
          <rect x="17" y="5" width="5" height="2" fill="#554c61" />
          <rect x="8" y="15" width="3" height="3" fill="#2f2a35" />
          <rect x="22" y="15" width="3" height="3" fill="#2f2a35" />
        </>
      )}
      {equipped.includes("face-blush") && (
        <>
          <rect x="10" y="12" width="3" height="2" fill="#d99a86" />
          <rect x="19" y="12" width="3" height="2" fill="#d99a86" />
        </>
      )}
      {equipped.includes("face-glasses") && (
        <>
          <rect x="11" y="7" width="5" height="1" fill="#5b4b2d" />
          <rect x="11" y="8" width="1" height="4" fill="#5b4b2d" />
          <rect x="15" y="8" width="1" height="4" fill="#5b4b2d" />
          <rect x="17" y="7" width="5" height="1" fill="#5b4b2d" />
          <rect x="17" y="8" width="1" height="4" fill="#5b4b2d" />
          <rect x="21" y="8" width="1" height="4" fill="#5b4b2d" />
          <rect x="16" y="9" width="1" height="1" fill="#5b4b2d" />
        </>
      )}
      {equipped.includes("face-freckle") && (
        <>
          <rect x="10" y="12" width="1" height="1" fill="#9b6a3c" />
          <rect x="12" y="13" width="1" height="1" fill="#9b6a3c" />
          <rect x="20" y="12" width="1" height="1" fill="#9b6a3c" />
          <rect x="22" y="13" width="1" height="1" fill="#9b6a3c" />
        </>
      )}
      {equipped.includes("face-mask") && (
        <>
          <rect x="12" y="13" width="9" height="3" fill="#f7efd9" />
          <rect x="11" y="14" width="1" height="1" fill="#e4d4a8" />
          <rect x="21" y="14" width="1" height="1" fill="#e4d4a8" />
        </>
      )}
      {equipped.includes("outfit-cardigan") && (
        <>
          <rect x="12" y="20" width="8" height="1" fill="#efe2c5" />
          <rect x="10" y="21" width="5" height="10" fill="#efe2c5" />
          <rect x="17" y="21" width="5" height="10" fill="#efe2c5" />
          <rect x="9" y="21" width="1" height="2" fill="#efe2c5" />
          <rect x="22" y="21" width="1" height="2" fill="#efe2c5" />
          <rect x="7" y="23" width="3" height="10" fill="#efe2c5" />
          <rect x="22" y="23" width="3" height="10" fill="#efe2c5" />
          <rect x="15" y="22" width="2" height="9" fill="#9a7b44" />
        </>
      )}
      {equipped.includes("outfit-sage") && (
        <>
          <rect x="12" y="20" width="8" height="1" fill="#9aa884" />
          <rect x="10" y="21" width="12" height="10" fill="#9aa884" />
          <rect x="9" y="21" width="1" height="2" fill="#9aa884" />
          <rect x="22" y="21" width="1" height="2" fill="#9aa884" />
          <rect x="7" y="23" width="3" height="8" fill="#9aa884" />
          <rect x="22" y="23" width="3" height="8" fill="#9aa884" />
          <rect x="13" y="21" width="6" height="1" fill="#d8e0c8" />
        </>
      )}
      {equipped.includes("outfit-whitetee") && (
        <>
          <rect x="12" y="20" width="8" height="1" fill="#f4f4f4" />
          <rect x="10" y="21" width="12" height="10" fill="#f4f4f4" />
          <rect x="9" y="21" width="1" height="2" fill="#f4f4f4" />
          <rect x="22" y="21" width="1" height="2" fill="#f4f4f4" />
          <rect x="7" y="23" width="3" height="6" fill="#f4f4f4" />
          <rect x="22" y="23" width="3" height="6" fill="#f4f4f4" />
          <rect x="13" y="21" width="6" height="1" fill="#ffffff" />
        </>
      )}
      {equipped.includes("outfit-pinktee") && (
        <>
          <rect x="12" y="20" width="8" height="1" fill="#e58aa8" />
          <rect x="10" y="21" width="12" height="10" fill="#e58aa8" />
          <rect x="9" y="21" width="1" height="2" fill="#e58aa8" />
          <rect x="22" y="21" width="1" height="2" fill="#e58aa8" />
          <rect x="7" y="23" width="3" height="6" fill="#e58aa8" />
          <rect x="22" y="23" width="3" height="6" fill="#e58aa8" />
          <rect x="13" y="21" width="6" height="1" fill="#ffd6e3" />
        </>
      )}
      {equipped.includes("outfit-denim") && (
        <>
          <rect x="12" y="20" width="2" height="1" fill="#6f8fb8" />
          <rect x="18" y="20" width="2" height="1" fill="#6f8fb8" />
          <rect x="11" y="21" width="2" height="2" fill="#6f8fb8" />
          <rect x="19" y="21" width="2" height="2" fill="#6f8fb8" />
          <rect x="9" y="21" width="2" height="2" fill="#6f8fb8" />
          <rect x="21" y="21" width="2" height="2" fill="#6f8fb8" />
          <rect x="10" y="23" width="12" height="8" fill="#6f8fb8" />
          <rect x="10" y="31" width="12" height="4" fill="#6f8fb8" />
          <rect x="10" y="35" width="5" height="3" fill="#6f8fb8" />
          <rect x="17" y="35" width="5" height="3" fill="#6f8fb8" />
          <rect x="15" y="28" width="2" height="6" fill="#4d6f9c" />
        </>
      )}
      {equipped.includes("outfit-ribbon") && (
        <>
          <rect x="15" y="19" width="2" height="2" fill="#b08a4a" />
          <rect x="12" y="19" width="3" height="3" fill="#b08a4a" />
          <rect x="17" y="19" width="3" height="3" fill="#b08a4a" />
        </>
      )}
      {equipped.includes("pants-whiteshorts") && (
        <>
          <rect x="10" y="30" width="12" height="2" fill="#f0f0f0" />
          <rect x="10" y="32" width="12" height="4" fill="#f0f0f0" />
          <rect x="10" y="36" width="5" height="3" fill="#f0f0f0" />
          <rect x="17" y="36" width="5" height="3" fill="#f0f0f0" />
          <rect x="15" y="31" width="2" height="4" fill="#d8d8d8" />
          <rect x="10" y="38" width="5" height="1" fill="#d8d8d8" />
          <rect x="17" y="38" width="5" height="1" fill="#d8d8d8" />
        </>
      )}
      {equipped.includes("pants-denim") && (
        <>
          <rect x="10" y="30" width="12" height="2" fill="#5a7a9e" />
          <rect x="10" y="32" width="12" height="5" fill="#5a7a9e" />
          <rect x="10" y="37" width="5" height="8" fill="#5a7a9e" />
          <rect x="17" y="37" width="5" height="8" fill="#5a7a9e" />
          <rect x="15" y="31" width="2" height="4" fill="#3f5f82" />
          <rect x="11" y="39" width="1" height="4" fill="#4a6a8e" />
          <rect x="20" y="39" width="1" height="4" fill="#4a6a8e" />
        </>
      )}
      {equipped.includes("pants-black") && (
        <>
          <rect x="10" y="30" width="12" height="2" fill="#3a3a42" />
          <rect x="10" y="32" width="12" height="5" fill="#3a3a42" />
          <rect x="10" y="37" width="5" height="8" fill="#3a3a42" />
          <rect x="17" y="37" width="5" height="8" fill="#3a3a42" />
          <rect x="15" y="31" width="2" height="4" fill="#2a2a30" />
        </>
      )}
      {equipped.includes("pants-beige") && (
        <>
          <rect x="10" y="30" width="12" height="2" fill="#cbb892" />
          <rect x="10" y="32" width="12" height="5" fill="#cbb892" />
          <rect x="10" y="37" width="5" height="8" fill="#cbb892" />
          <rect x="17" y="37" width="5" height="8" fill="#cbb892" />
          <rect x="15" y="31" width="2" height="4" fill="#b09a72" />
          <rect x="11" y="40" width="2" height="1" fill="#b09a72" opacity="0.7" />
          <rect x="18" y="40" width="2" height="1" fill="#b09a72" opacity="0.7" />
        </>
      )}
      {equipped.includes("pants-shorts") && (
        <>
          <rect x="10" y="30" width="12" height="2" fill="#7a9bb8" />
          <rect x="10" y="32" width="12" height="4" fill="#7a9bb8" />
          <rect x="10" y="36" width="5" height="3" fill="#7a9bb8" />
          <rect x="17" y="36" width="5" height="3" fill="#7a9bb8" />
          <rect x="15" y="31" width="2" height="4" fill="#5a7a9e" />
          <rect x="10" y="38" width="5" height="1" fill="#5a7a9e" />
          <rect x="17" y="38" width="5" height="1" fill="#5a7a9e" />
        </>
      )}
      {equipped.includes("skirt-pleat") && (
        <>
          <rect x="10" y="30" width="12" height="2" fill="#4a5a78" />
          <rect x="9" y="32" width="14" height="9" fill="#4a5a78" />
          <rect x="11" y="32" width="1" height="9" fill="#3a4a68" />
          <rect x="14" y="32" width="1" height="9" fill="#3a4a68" />
          <rect x="17" y="32" width="1" height="9" fill="#3a4a68" />
          <rect x="20" y="32" width="1" height="9" fill="#3a4a68" />
        </>
      )}
      {equipped.includes("skirt-pink") && (
        <>
          <rect x="10" y="30" width="12" height="2" fill="#e8a0b8" />
          <rect x="9" y="32" width="14" height="7" fill="#e8a0b8" />
          <rect x="8" y="38" width="16" height="1" fill="#d88aa8" />
          <rect x="15" y="32" width="2" height="6" fill="#f0c0d0" opacity="0.7" />
        </>
      )}
      {equipped.includes("skirt-check") && (
        <>
          <rect x="10" y="30" width="12" height="2" fill="#8b6b5c" />
          <rect x="9" y="32" width="14" height="8" fill="#8b6b5c" />
          <rect x="11" y="33" width="2" height="2" fill="#c9a878" />
          <rect x="15" y="33" width="2" height="2" fill="#c9a878" />
          <rect x="19" y="33" width="2" height="2" fill="#c9a878" />
          <rect x="13" y="36" width="2" height="2" fill="#c9a878" />
          <rect x="17" y="36" width="2" height="2" fill="#c9a878" />
          <rect x="11" y="37" width="2" height="2" fill="#6a4a3c" opacity="0.5" />
          <rect x="19" y="37" width="2" height="2" fill="#6a4a3c" opacity="0.5" />
        </>
      )}
      {equipped.includes("skirt-long") && (
        <>
          <rect x="10" y="30" width="12" height="2" fill="#6b7a5a" />
          <rect x="9" y="32" width="14" height="12" fill="#6b7a5a" />
          <rect x="8" y="42" width="16" height="2" fill="#5a6948" />
          <rect x="15" y="32" width="2" height="12" fill="#7a8a6a" opacity="0.55" />
        </>
      )}
      {equipped.includes("other-headband") && (
        <>
          <rect x="10" y="4" width="12" height="1" fill="#d8a878" />
          <rect x="9" y="5" width="2" height="1" fill="#d8a878" />
          <rect x="21" y="5" width="2" height="1" fill="#d8a878" />
        </>
      )}
      {equipped.includes("other-scarf") && (
        <>
          <rect x="12" y="19" width="8" height="2" fill="#8b9a72" />
          <rect x="18" y="21" width="2" height="5" fill="#8b9a72" />
          <rect x="19" y="25" width="1" height="2" fill="#6d7653" />
        </>
      )}
      {equipped.includes("other-ribbon") && (
        <>
          <rect x="14" y="2" width="2" height="2" fill="#c45a72" />
          <rect x="11" y="1" width="3" height="3" fill="#d86f86" />
          <rect x="16" y="1" width="3" height="3" fill="#d86f86" />
          <rect x="13" y="4" width="2" height="3" fill="#d86f86" />
          <rect x="17" y="4" width="2" height="3" fill="#d86f86" />
        </>
      )}
      {equipped.includes("other-flower") && (
        <>
          <rect x="22" y="5" width="1" height="1" fill="#d8c49b" />
          <rect x="23" y="4" width="1" height="1" fill="#d8c49b" />
          <rect x="24" y="5" width="1" height="1" fill="#d8c49b" />
          <rect x="23" y="6" width="1" height="1" fill="#d8c49b" />
          <rect x="23" y="5" width="1" height="1" fill="#b08a4a" />
        </>
      )}
      {equipped.includes("other-bag") && (
        <>
          <rect x="24" y="33" width="5" height="6" fill="#c9a878" />
          <rect x="25" y="32" width="3" height="1" fill="#8a6334" />
        </>
      )}
      {equipped.includes("other-sneakers") && (
        <>
          <rect x="9" y="45" width="6" height="3" fill="#f7efd9" />
          <rect x="8" y="46" width="2" height="2" fill="#f7efd9" />
          <rect x="10" y="47" width="4" height="1" fill="#9aa3ad" />
          <rect x="17" y="45" width="6" height="3" fill="#f7efd9" />
          <rect x="22" y="46" width="2" height="2" fill="#f7efd9" />
          <rect x="18" y="47" width="4" height="1" fill="#9aa3ad" />
        </>
      )}
      {equipped.includes("emote-heart") && <PixelHeart size={4} color="#d8a878" />}
      {equipped.includes("emote-sparkle") && <path d="M27 5 L28 7 L30 8 L28 9 L27 11 L26 9 L24 8 L26 7Z" fill="#e4d4a8" />}
      {equipped.includes("emote-note") && (
        <>
          <rect x="27" y="12" width="1" height="5" fill="#8b9a72" />
          <rect x="28" y="12" width="3" height="1" fill="#8b9a72" />
          <rect x="26" y="17" width="2" height="2" fill="#8b9a72" />
        </>
      )}
    </svg>
  );
}

function resolveAvatarDisplayInventory(
  userId?: string,
  inventory?: HandMadeItem[] | null,
): HandMadeItem[] {
  if (inventory) return inventory;
  if (userId) return loadMyInventory(userId);
  return [];
}

function AvatarWithCompanions({
  avatar = DEFAULT_AVATAR_PROFILE,
  userId,
  inventory,
  width = 84,
  height,
  viewBox,
  companionScale = 0.42,
  inventoryRevision = 0,
  excludeItemId = null,
  showUnplacedPurchased = false,
}: {
  avatar?: AvatarProfile;
  userId?: string;
  inventory?: HandMadeItem[] | null;
  width?: number | string;
  height?: number | string;
  viewBox?: string;
  companionScale?: number;
  inventoryRevision?: number;
  excludeItemId?: string | null;
  showUnplacedPurchased?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(
    typeof width === "number" ? width : AVATAR_STUDIO_PREVIEW_WIDTH,
  );

  useEffect(() => {
    if (typeof width === "number") {
      setMeasuredWidth(width);
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const next = el.getBoundingClientRect().width;
      if (next > 0) setMeasuredWidth(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  const companions = useMemo(() => {
    const inv = resolveAvatarDisplayInventory(userId, inventory);
    return getEquippedCompanions(avatar.equipped, inv, { showUnplacedPurchased });
  }, [avatar.equipped, userId, inventory, inventoryRevision, showUnplacedPurchased]);

  const displayWidth = typeof width === "number" ? width : measuredWidth;
  const displayHeight =
    typeof height === "number" && height > 0
      ? height
      : avatarPreviewHeightForWidth(displayWidth);
  const visibleCompanions = excludeItemId
    ? companions.filter(item => item.id !== excludeItemId)
    : companions;
  const { back: backCompanions, front: frontCompanions } = splitDecorItemsByLayer(visibleCompanions);

  const renderCompanion = (item: HandMadeItem) => {
    const imageSrc = resolveHandMadeItemImageUrl(item);
    if (!imageSrc) return null;
    const resolved = resolveDecorPlacementForItem(item, displayWidth, displayHeight);

    return (
      <div
        key={item.id}
        className="absolute pointer-events-none"
        style={{
          width: resolved.itemWidth,
          height: resolved.itemHeight,
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${resolved.offsetX}px), calc(-50% + ${resolved.offsetY}px)) rotate(${resolved.rotation}deg)`,
          zIndex: getDecorLayer(item) === "back" ? AVATAR_DECOR_LAYER_Z.back : AVATAR_DECOR_LAYER_Z.front,
        }}
      >
        <HandMadeItemDecorImage
          item={item}
          width={resolved.itemWidth}
          height={resolved.itemHeight}
          contentBounds={item.contentBounds}
        />
      </div>
    );
  };

  const layoutWidth = typeof width === "number" ? width : "100%";
  const layoutHeight = typeof height === "number" && height > 0 ? height : displayHeight;

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      style={{ width: layoutWidth, height: layoutHeight }}
    >
      {backCompanions.map(renderCompanion)}
      <div className="relative" style={{ zIndex: AVATAR_DECOR_LAYER_Z.avatar }}>
        <PixelAvatar avatar={avatar} width={displayWidth} height={displayHeight} viewBox={viewBox} />
      </div>
      {frontCompanions.map(renderCompanion)}
    </div>
  );
}

const AVATAR_STUDIO_PREVIEW_MARGIN = 5;
const AVATAR_STUDIO_PREVIEW_VIEWBOX = `0 -${AVATAR_STUDIO_PREVIEW_MARGIN} ${PIXEL_COLS} ${PIXEL_ROWS + AVATAR_STUDIO_PREVIEW_MARGIN * 2}`;
const AVATAR_BUST_VIEWBOX = "4 -2 24 33";

function PixelAvatarBust({
  avatar,
  width = 72,
  height = 80,
  userId,
  inventory,
  inventoryRevision = 0,
}: {
  avatar: AvatarProfile;
  width?: number;
  height?: number;
  userId?: string;
  inventory?: HandMadeItem[] | null;
  inventoryRevision?: number;
  companionScale?: number;
}) {
  const fullHeight = avatarPreviewHeightForWidth(width);
  const companions = useMemo(() => {
    const inv = resolveAvatarDisplayInventory(userId, inventory);
    return getEquippedCompanions(avatar.equipped, inv);
  }, [avatar.equipped, userId, inventory, inventoryRevision]);

  const { back: backCompanions, front: frontCompanions } = splitDecorItemsByLayer(companions);

  const renderCompanion = (item: HandMadeItem) => {
    const imageSrc = resolveHandMadeItemImageUrl(item);
    if (!imageSrc) return null;
    const resolved = resolveDecorPlacementForItem(item, width, fullHeight);

    return (
      <div
        key={item.id}
        className="absolute pointer-events-none"
        style={{
          width: resolved.itemWidth,
          height: resolved.itemHeight,
          left: "50%",
          top: "50%",
          transform: `translate(calc(-50% + ${resolved.offsetX}px), calc(-50% + ${resolved.offsetY}px)) rotate(${resolved.rotation}deg)`,
          zIndex: getDecorLayer(item) === "back" ? 1 : 10,
        }}
      >
        <HandMadeItemDecorImage
          item={item}
          width={resolved.itemWidth}
          height={resolved.itemHeight}
          contentBounds={item.contentBounds}
        />
      </div>
    );
  };

  if (companions.length === 0) {
    return <PixelAvatar avatar={avatar} width={width} height={height} viewBox={AVATAR_BUST_VIEWBOX} />;
  }

  return (
    <div className="relative overflow-hidden" style={{ width, height }}>
      <div className="relative" style={{ width, height: fullHeight }}>
        {backCompanions.map(renderCompanion)}
        <div className="relative" style={{ zIndex: 5 }}>
          <PixelAvatar
            avatar={avatar}
            width={width}
            height={fullHeight}
            viewBox={AVATAR_STUDIO_PREVIEW_VIEWBOX}
          />
        </div>
        {frontCompanions.map(renderCompanion)}
      </div>
    </div>
  );
}
const AVATAR_STUDIO_PREVIEW_FRAME = {
  background: "rgba(0,0,0,0.42)",
  border: "1px solid rgba(255,255,255,0.12)",
} as const;
const AVATAR_STUDIO_PREVIEW_WIDTH = 84;

function AvatarStudioPreviewFrame({
  avatar,
  userId,
  avatarWidth = AVATAR_STUDIO_PREVIEW_WIDTH,
  companionScale = 0.42,
  selectedItem = null,
  selectedItemScale = 0.36,
  inventoryRevision = 0,
}: {
  avatar: AvatarProfile;
  userId: string;
  avatarWidth?: number;
  companionScale?: number;
  selectedItem?: HandMadeItem | null;
  selectedItemScale?: number;
  inventoryRevision?: number;
}) {
  const avatarHeight = avatarPreviewHeightForWidth(avatarWidth);
  const framePad = Math.max(6, Math.round(avatarWidth * 0.095));

  return (
    <div
      className="relative rounded-xl inline-flex items-center justify-center"
      style={{
        padding: framePad,
        background: AVATAR_STUDIO_PREVIEW_FRAME.background,
        border: AVATAR_STUDIO_PREVIEW_FRAME.border,
      }}
    >
      <div className="relative">
        <AvatarWithCompanions
          avatar={avatar}
          userId={userId}
          width={avatarWidth}
          height={avatarHeight}
          viewBox={AVATAR_STUDIO_PREVIEW_VIEWBOX}
          companionScale={companionScale}
          inventoryRevision={inventoryRevision}
        />
        {selectedItem && (() => {
          const resolved = resolveDecorPlacement(selectedItem.placement, avatarWidth, avatarHeight);
          return (
            <div
              className="absolute pointer-events-none"
              style={{
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${resolved.offsetX}px), calc(-50% + ${resolved.offsetY}px)) rotate(${resolved.rotation}deg)`,
              }}
            >
              <HandMadeItemPreview item={selectedItem} size={resolved.itemSize} />
            </div>
          );
        })()}
      </div>
    </div>
  );
}


const AVATAR_DECOR_LAYER_Z = {
  back: 1,
  avatar: 5,
  front: 10,
  frontSelected: 20,
} as const;

function decorOverlayZIndex(item: HandMadeItem, selected: boolean): number {
  if (getDecorLayer(item) === "back") return AVATAR_DECOR_LAYER_Z.back;
  if (selected) return AVATAR_DECOR_LAYER_Z.frontSelected;
  return AVATAR_DECOR_LAYER_Z.front;
}

function useHandMadeItemContentBounds(item: HandMadeItem, userId?: string) {
  const [contentBounds, setContentBounds] = useState<HandMadeItemContentBounds | null>(
    item.contentBounds ?? null,
  );

  useEffect(() => {
    if (item.contentBounds) {
      setContentBounds(item.contentBounds);
      return;
    }

    const imageSrc = resolveHandMadeItemImageUrl(item);
    if (!imageSrc) {
      setContentBounds(FULL_IMAGE_CONTENT_BOUNDS);
      return;
    }

    let cancelled = false;
    measureImageContentBounds(imageSrc).then((bounds) => {
      if (cancelled) return;
      setContentBounds(bounds);
      if (userId && !isFullImageContentBounds(bounds)) {
        updateHandMadeItem(userId, item.id, { contentBounds: bounds });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [item.id, item.imageDataUrl, item.contentBounds, userId]);

  return contentBounds ?? FULL_IMAGE_CONTENT_BOUNDS;
}

function HandMadeItemDecorImage({
  item,
  width,
  height,
  contentBounds = item.contentBounds ?? FULL_IMAGE_CONTENT_BOUNDS,
}: {
  item: HandMadeItem;
  width: number;
  height: number;
  contentBounds?: HandMadeItemContentBounds;
}) {
  const imageSrc = resolveHandMadeItemImageUrl(item);
  if (!imageSrc) {
    return <HandMadeItemPreview item={item} size={Math.max(width, height)} />;
  }

  if (isFullImageContentBounds(contentBounds)) {
    return (
      <img
        src={imageSrc}
        alt=""
        width={width}
        height={height}
        className="block max-w-none"
        style={{ objectFit: "contain", imageRendering: "pixelated" }}
      />
    );
  }

  const imgWidth = width / Math.max(contentBounds.w, 0.001);
  const imgHeight = height / Math.max(contentBounds.h, 0.001);

  return (
    <div className="relative overflow-hidden" style={{ width, height }}>
      <img
        src={imageSrc}
        alt=""
        className="absolute max-w-none"
        style={{
          width: imgWidth,
          height: imgHeight,
          left: -contentBounds.x * imgWidth,
          top: -contentBounds.y * imgHeight,
          imageRendering: "pixelated",
        }}
      />
    </div>
  );
}

function EditablePlacedItemOverlay({
  item,
  userId,
  referenceWidth,
  referenceHeight,
  selected,
  onSelect,
  onRemove,
  onPlacementChange,
}: {
  item: HandMadeItem;
  userId?: string;
  referenceWidth: number;
  referenceHeight: number;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onPlacementChange: (placement: HandMadeItemPlacement) => void;
}) {
  const contentBounds = useHandMadeItemContentBounds(item, userId);
  const stored = normalizeItemPlacement(item.placement);
  const placement = withPlacementReference(stored, referenceWidth, referenceHeight);
  const resolved = resolveDecorPlacement(placement, referenceWidth, referenceHeight, contentBounds);
  const displayWidth = resolved.itemWidth;
  const displayHeight = resolved.itemHeight;
  const [dragMode, setDragMode] = useState<"move" | "resize" | "rotate" | null>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
    startScale: number;
    startRotation: number;
    centerX: number;
    centerY: number;
    startAngle: number;
  } | null>(null);
  const placementRef = useRef(placement);
  placementRef.current = placement;

  useEffect(() => {
    if (!dragMode) return;
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const current = placementRef.current;

      if (dragMode === "move") {
        onPlacementChange(withPlacementReference({
          ...current,
          offsetX: drag.startOffsetX + (event.clientX - drag.startX),
          offsetY: drag.startOffsetY + (event.clientY - drag.startY),
        }, referenceWidth, referenceHeight));
        return;
      }

      if (dragMode === "resize") {
        const nextScale = clampItemScale(drag.startScale + (event.clientX - drag.startX) / 55);
        onPlacementChange(withPlacementReference({
          ...current,
          scale: nextScale,
        }, referenceWidth, referenceHeight));
        return;
      }

      if (dragMode === "rotate") {
        const angle = Math.atan2(event.clientY - drag.centerY, event.clientX - drag.centerX);
        const delta = (angle - drag.startAngle) * (180 / Math.PI);
        onPlacementChange(withPlacementReference({
          ...current,
          rotation: Math.round(drag.startRotation + delta),
        }, referenceWidth, referenceHeight));
      }
    };
    const onUp = () => {
      dragRef.current = null;
      setDragMode(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragMode, onPlacementChange, referenceWidth, referenceHeight]);

  const beginDrag = (
    mode: "move" | "resize" | "rotate",
    event: React.PointerEvent<HTMLElement>,
    centerX?: number,
    centerY?: number,
  ) => {
    event.stopPropagation();
    event.preventDefault();
    const current = placementRef.current;
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: current.offsetX,
      startOffsetY: current.offsetY,
      startScale: current.scale,
      startRotation: current.rotation ?? 0,
      centerX: centerX ?? event.clientX,
      centerY: centerY ?? event.clientY,
      startAngle: Math.atan2(event.clientY - (centerY ?? event.clientY), event.clientX - (centerX ?? event.clientX)),
    };
    setDragMode(mode);
  };

  return (
    <div
      className="absolute"
      style={{
        left: "50%",
        top: "50%",
        transform: `translate(calc(-50% + ${resolved.offsetX}px), calc(-50% + ${resolved.offsetY}px))`,
        zIndex: decorOverlayZIndex(item, selected),
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <div
        className="relative"
        style={{
          width: displayWidth,
          height: displayHeight,
          border: selected ? "2px solid #7cb3ff" : "2px solid transparent",
          boxShadow: selected ? "0 0 0 1px rgba(124,179,255,0.35)" : "none",
          background: selected ? "rgba(124,179,255,0.08)" : "transparent",
          transform: `rotate(${resolved.rotation}deg)`,
          touchAction: selected ? "none" : "auto",
        }}
        onPointerDown={(event) => {
          if (!selected) return;
          if ((event.target as HTMLElement).dataset.handle) return;
          const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
          beginDrag("move", event, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }}
      >
        <HandMadeItemDecorImage
          item={item}
          width={displayWidth}
          height={displayHeight}
          contentBounds={contentBounds}
        />
        {selected && (
          <>
            <button
              type="button"
              data-handle="remove"
              aria-label="아이템 제거"
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
              className="absolute flex items-center justify-center rounded-full"
              style={{
                top: -8,
                left: -8,
                width: 18,
                height: 18,
                background: "#ff4757",
                border: "2px solid #fff",
                color: "#fff",
                fontFamily: FONT_UI,
                fontSize: "0.55rem",
                fontWeight: 800,
                lineHeight: 1,
                boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
              }}
            >
              ×
            </button>
            <div
              data-handle="rotate"
              role="presentation"
              onPointerDown={(event) => {
                const rect = (event.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                beginDrag("rotate", event, rect.left + rect.width / 2, rect.top + rect.height / 2);
              }}
              className="absolute flex items-center justify-center rounded-full"
              style={{
                top: -8,
                right: -8,
                width: 16,
                height: 16,
                background: "#fff",
                border: "2px solid #7cb3ff",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                cursor: "grab",
                touchAction: "none",
                fontFamily: FONT_UI,
                fontSize: "0.42rem",
                fontWeight: 800,
                color: "#5a8fd8",
                lineHeight: 1,
              }}
            >
              ↻
            </div>
            <div
              data-handle="resize"
              role="presentation"
              onPointerDown={(event) => beginDrag("resize", event)}
              className="absolute rounded-full"
              style={{
                right: -8,
                bottom: -8,
                width: 16,
                height: 16,
                background: "#fff",
                border: "2px solid #7cb3ff",
                boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                cursor: "nwse-resize",
                touchAction: "none",
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function storedToAvatarProfile(saved: StoredAvatarProfile | null | undefined): AvatarProfile | null {
  if (!saved) return null;
  return {
    config: {
      body: saved.config.body || DEFAULT_AVATAR_CONFIG.body,
      pixels: saved.config.pixels ?? {},
    },
    equipped: normalizeEquipped(saved.equipped),
  };
}

function FriendAvatarThumb({
  avatarProfile,
  legacyAvatar,
  color,
  size = 40,
  showOnline = false,
  isOnline = false,
  useBust = false,
  userId,
  inventory,
}: {
  avatarProfile?: AvatarProfile | null;
  legacyAvatar?: LegacyAvatarConfig;
  color: string;
  size?: number;
  showOnline?: boolean;
  isOnline?: boolean;
  useBust?: boolean;
  userId?: string;
  inventory?: HandMadeItem[] | null;
}) {
  if (useBust) {
    const profile = avatarProfile ?? DEFAULT_AVATAR_PROFILE;
    return (
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <div
          className="rounded-xl flex items-end justify-center overflow-hidden w-full h-full"
          style={{
            background: `linear-gradient(135deg, ${color}55, ${color}22)`,
            border: `2px solid ${color}`,
          }}
        >
          <PixelAvatarBust
            avatar={profile}
            width={size * 0.78}
            height={size * 0.88}
            userId={userId}
            inventory={inventory}
          />
        </div>
        {showOnline && (
          <div
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
            style={{ background: isOnline ? "#4cda64" : "#b8bcc6", zIndex: 10 }}
            title={isOnline ? "활동 중" : "비활동"}
          />
        )}
      </div>
    );
  }

  return (
    <NeighborAvatar
      avatar={legacyAvatar ?? AVATAR_PRESETS[0]}
      color={color}
      size={size}
      showOnline={showOnline}
      isOnline={isOnline}
    />
  );
}

function BgmPlayPauseIcon({ isPlaying, size = "md" }: { isPlaying: boolean; size?: "md" | "sm" }) {
  if (isPlaying) {
    const barW = size === "sm" ? 1.5 : 2;
    const barH = size === "sm" ? 7 : 8;
    const gap = size === "sm" ? 2 : 3;
    return (
      <span className="flex items-center justify-center" style={{ gap }}>
        <span style={{ width: barW, height: barH, background: "white", borderRadius: 1 }} />
        <span style={{ width: barW, height: barH, background: "white", borderRadius: 1 }} />
      </span>
    );
  }
  return (
    <span style={{ color: "white", fontSize: size === "sm" ? 9 : 10, paddingLeft: 2 }}>▶</span>
  );
}

function BgmSearchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="노래 검색"
      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
      style={{
        fontSize: "0.55rem",
        background: "rgba(255,255,255,0.95)",
        border: "1px solid rgba(var(--diary-mid-rgb),0.22)",
        boxShadow: "0 1px 3px rgba(var(--diary-dark-rgb),0.1)",
      }}
    >
      🔍
    </button>
  );
}

function BgmSearchModal({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (track: BgmSearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BgmSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setError("");
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        setResults(await searchBgmTracks(query));
      } catch (err) {
        setResults([]);
        setError(err instanceof Error ? err.message : "노래를 불러오지 못했어요.");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <motion.div
      className="absolute inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: "rgba(80,40,120,0.45)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="rounded-2xl p-3 flex flex-col gap-2"
        style={{
          width: "min(300px, calc(100vw - 24px))",
          height: "min(420px, calc(100vh - 24px))",
          background: DIARY_PAPER_BG,
          border: "2px solid rgba(var(--diary-mid-rgb),0.25)",
          boxShadow: "0 8px 32px rgba(var(--diary-mid-rgb),0.25)",
        }}
        initial={{ opacity: 0, scale: 0.92, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <span style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 700, color: "var(--diary-mid)" }}>♬ BGM 검색</span>
          <button type="button" onClick={onClose} className="px-2 py-0.5 rounded-full" style={{ fontFamily: FONT_UI, fontSize: "0.45rem", fontWeight: 700, background: "rgba(var(--diary-mid-rgb),0.15)", color: "var(--diary-dark)" }}>닫기</button>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl px-2 py-1.5" style={{ background: "rgba(255,255,255,0.85)", border: "1px solid rgba(var(--diary-mid-rgb),0.25)" }}>
          <span style={{ fontSize: 12, color: "var(--diary-mid)" }}>🔍</span>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="노래 또는 아티스트 검색"
            className="flex-1 min-w-0 outline-none bg-transparent"
            style={{ fontFamily: FONT_UI, fontSize: "0.58rem", color: "var(--diary-dark)" }}
          />
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col gap-1" style={{ minHeight: 0 }}>
          {loading && (
            <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", color: "var(--diary-mid)", textAlign: "center", padding: "12px 0" }}>검색 중...</p>
          )}
          {!loading && error && (
            <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", color: "#ff4757", textAlign: "center", padding: "12px 0" }}>{error}</p>
          )}
          {!loading && !error && query.trim() && results.length === 0 && (
            <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "var(--diary-mid)", textAlign: "center", padding: "12px 8px", lineHeight: 1.5 }}>
              검색 결과가 없어요.<br />
              미리듣기 제공 곡만 나와요. MP3 업로드도 가능해요.
            </p>
          )}
          {!loading && results.map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => onSelect(track)}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left"
              style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(var(--diary-mid-rgb),0.18)" }}
            >
              {track.artworkUrl ? (
                <img src={track.artworkUrl} alt="" className="w-8 h-8 rounded-md flex-shrink-0 object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center" style={{ background: "rgba(var(--diary-mid-rgb),0.15)", fontSize: 14 }}>♪</div>
              )}
              <div className="min-w-0 flex-1">
                <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 700, color: "var(--diary-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</p>
                <p style={{ fontFamily: FONT_UI, fontSize: "0.45rem", color: "var(--diary-mid)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════
   MINI ROOM SVG — Slot-based interior
═══════════════════════════════════════════ */

function PixelRects({ pixels }: { pixels: PixelRect[] }) {
  return (
    <>
      {pixels.map((p, i) => (
        <rect
          key={i}
          x={p.x}
          y={p.y}
          width={p.w}
          height={p.h}
          fill={p.fill === "none" ? "none" : p.fill}
          opacity={p.opacity}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
        />
      ))}
    </>
  );
}

function MiniRoom({
  selections = EMPTY_ROOM_SELECTIONS,
  offsets = {},
  highlightCategory = null,
  roomItemLookup = getItemById,
  inventoryPlacements = [],
  inventoryById,
  fill = false,
}: {
  selections?: RoomSelections;
  offsets?: Partial<Record<RoomCategoryId, RoomItemOffset>>;
  highlightCategory?: RoomCategoryId | null;
  roomItemLookup?: RoomItemLookup;
  inventoryPlacements?: InventoryPlacement[];
  inventoryById?: Map<string, HandMadeItem>;
  fill?: boolean;
}) {
  const placed = getPlacedRoomItemsByDepth(selections, offsets, roomItemLookup);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${ROOM_VIEW_WIDTH} ${ROOM_VIEW_HEIGHT}`}
      preserveAspectRatio={fill ? "xMidYMid slice" : "xMidYMid meet"}
      style={{ imageRendering: "pixelated", display: "block" }}
    >
      <defs>
        <linearGradient id="room-wall-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#faf8ff" />
          <stop offset="100%" stopColor="var(--diary-surface)" />
        </linearGradient>
        <linearGradient id="room-floor-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eeeef4" />
          <stop offset="100%" stopColor="#e4e4ec" />
        </linearGradient>
      </defs>

      {/* wall */}
      <rect x="0" y="0" width={ROOM_VIEW_WIDTH} height={ROOM_WALL_HEIGHT} fill="url(#room-wall-grad)" />
      {Array.from({ length: 22 }, (_, i) =>
        Array.from({ length: Math.ceil(ROOM_WALL_HEIGHT / 24) }, (_, j) => (
          <rect key={`wd${i}${j}`} x={i * 20 + 4} y={j * 24 + 4} width="1" height="1" fill="#dcd8e8" opacity="0.35" />
        )),
      )}
      {/* soft window light */}
      <rect x="0" y="0" width={ROOM_VIEW_WIDTH * 0.45} height={ROOM_WALL_HEIGHT} fill="#fff8e8" opacity="0.08" />

      {/* floor */}
      <rect x="0" y={ROOM_FLOOR_Y} width={ROOM_VIEW_WIDTH} height={ROOM_VIEW_HEIGHT - ROOM_FLOOR_Y} fill="url(#room-floor-grad)" />
      {Array.from({ length: 22 }, (_, i) =>
        Array.from({ length: Math.ceil((ROOM_VIEW_HEIGHT - ROOM_FLOOR_Y) / 20) }, (_, j) => (
          <rect
            key={`fd${i}${j}`}
            x={i * 20}
            y={ROOM_FLOOR_Y + j * 20}
            width="20"
            height="20"
            fill={(i + j) % 2 === 0 ? "#eeeef4" : "#e8e8f0"}
          />
        )),
      )}

      {/* baseboard + floor edge */}
      <rect x="0" y={ROOM_FLOOR_Y - 4} width={ROOM_VIEW_WIDTH} height="4" fill="#e8e4dc" />
      <rect x="0" y={ROOM_FLOOR_Y} width={ROOM_VIEW_WIDTH} height="2" fill="#d8d4cc" />

      {placed.map(({ categoryId, item }) => {
        const offset = offsets[categoryId] ?? { x: 0, y: 0 };
        const highlighted = highlightCategory === categoryId;
        return (
          <g
            key={`${categoryId}-${item.id}`}
            transform={`translate(${offset.x} ${offset.y})`}
            style={highlighted ? { filter: "drop-shadow(0 0 4px rgba(64,176,128,0.9))" } : undefined}
          >
            <PixelRects pixels={item.pixels} />
            {item.imageSrc && item.imageBounds && (
              <image
                href={item.imageSrc}
                x={item.imageBounds.x}
                y={item.imageBounds.y}
                width={item.imageBounds.w}
                height={item.imageBounds.h}
                preserveAspectRatio="xMidYMax meet"
              />
            )}
          </g>
        );
      })}
      {inventoryPlacements.map(placement => {
        const item = inventoryById?.get(placement.itemId);
        const imageSrc = item ? resolveHandMadeItemImageUrl(item) : undefined;
        if (!imageSrc) return null;
        return (
          <image
            key={`inv-${placement.itemId}`}
            href={imageSrc}
            x={placement.x}
            y={placement.y}
            width={placement.w}
            height={placement.h}
            preserveAspectRatio="xMidYMax meet"
          />
        );
      })}
    </svg>
  );
}
/* ═══════════════════════════════════════════
   VISITOR COUNT
═══════════════════════════════════════════ */
function VisitorCountBar({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const [stats, setStats] = useState<VisitorStats>(() => getVisitorStats(userId));

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const local = getVisitorStats(userId);
      if (!cancelled) setStats(local);

      if (!isSupabaseConfigured()) return;
      const remote = await fetchVisitorStatsRemote(userId);
      if (cancelled || !remote) return;
      setStats(remote);
      saveVisitorStats(userId, remote);
    };

    void refresh();
    const unsubscribe = subscribeVisitorStats(userId, () => void refresh());
    const intervalId = window.setInterval(() => void refresh(), 5_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [userId]);

  const digits = toVisitorDigits(stats.today, 4);

  return (
    <div
      className={`rounded-xl flex items-center justify-between flex-shrink-0 ${compact ? "px-2.5 py-1.5" : "p-2.5"}`}
      style={{
        background: "linear-gradient(90deg, rgba(var(--diary-main-rgb),0.25) 0%, rgba(var(--diary-mid-rgb),0.1) 100%)",
        border: "1px solid rgba(var(--diary-mid-rgb),0.25)",
      }}
    >
      <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
        <span style={{ fontSize: compact ? 12 : 14 }}>👣</span>
        <span style={{ fontFamily: FONT_PIXEL, fontSize: compact ? "0.33rem" : "0.38rem", color: "var(--diary-mid)" }}>TODAY</span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 px-1">
        {digits.map((d, i) => (
          <div
            key={i}
            className={`${compact ? "w-4 h-5" : "w-5 h-6"} rounded flex flex-shrink-0 items-center justify-center`}
            style={{ background: ACCENT_BTN_BG_135, boxShadow: ACCENT_BTN_SHADOW }}
          >
            <span
              style={{
                fontFamily: "ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', Consolas, monospace",
                fontSize: compact ? "0.62rem" : "0.7rem",
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
                color: "white",
                display: "block",
                width: "100%",
                textAlign: "center",
              }}
            >
              {d}
            </span>
          </div>
        ))}
      </div>
      <span
        className="flex-shrink-0 pl-1"
        style={{ fontFamily: FONT_UI, fontSize: compact ? "0.42rem" : "0.48rem", color: "var(--diary-mid)", whiteSpace: "nowrap" }}
      >
        전체 <b style={{ color: "#ff4757" }}>{formatVisitorCount(stats.total)}</b>
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LEFT PAGE — PROFILE (merged)
═══════════════════════════════════════════ */
function LeftPage({
  user,
  avatar,
  onUserUpdate,
  onVisitFriend,
  inventoryRevision = 0,
}: {
  user: User;
  avatar: AvatarProfile;
  onUserUpdate: (user: User) => void;
  onVisitFriend: (nb: FriendNeighbor) => void;
  inventoryRevision?: number;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [editing, setEditing] = useState(false);
  const initialProfile = getUserProfile(user.id, user.nickname);
  const [status, setStatus] = useState(() => initialProfile.status);
  const [tags, setTags] = useState<string[]>(() => initialProfile.tags);
  const [tagDraft, setTagDraft] = useState(() => initialProfile.tags.join(" "));
  const [fields, setFields] = useState<ProfileField[]>(() => initialProfile.fields);
  const [draft, setDraft] = useState<ProfileField[]>(fields);
  const [bgmTitle, setBgmTitle] = useState(() => initialProfile.bgmTitle ?? "♬ Lovefool - The Cardigans");
  const [bgmPreviewUrl, setBgmPreviewUrl] = useState<string | null>(() => initialProfile.bgmPreviewUrl ?? null);
  const [bgmSrc, setBgmSrc] = useState<string | null>(() => initialProfile.bgmPreviewUrl ?? null);
  const [showBgmSearch, setShowBgmSearch] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState(user.nickname);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const editingRef = useRef(false);
  const profileSaveSeq = useRef(0);
  const pendingBgmFileRef = useRef<File | null>(null);
  const { themeId, applyOwnThemeFromProfile } = useDiaryTheme();

  const applyProfileState = (profile: ReturnType<typeof getUserProfile>) => {
    setFields(profile.fields);
    setDraft(profile.fields);
    setStatus(profile.status);
    setTags(profile.tags);
    setTagDraft(profile.tags.join(" "));
    setBgmTitle(profile.bgmTitle ?? "♬ Lovefool - The Cardigans");
    setBgmPreviewUrl(profile.bgmPreviewUrl ?? null);
    setBgmSrc(profile.bgmPreviewUrl ?? null);
    if (isDiaryThemeId(profile.diaryThemeId)) {
      applyOwnThemeFromProfile(profile.diaryThemeId);
    }
  };

  useEffect(() => {
    editingRef.current = editing;
  }, [editing]);

  useEffect(() => {
    const local = getUserProfile(user.id, user.nickname);
    applyProfileState(local);
    setNicknameDraft(user.nickname);

    if (!isSupabaseConfigured()) return;

    const loadSeq = ++profileSaveSeq.current;
    let cancelled = false;

    (async () => {
      const remoteResult = await fetchUserProfileDetails(user.id, user.nickname);
      if (cancelled || loadSeq !== profileSaveSeq.current || editingRef.current) return;

      if (!remoteResult) return;

      let merged = local;
      if (remoteResult.hasDetails) {
        const remoteProfile = remoteResult.updatedAt
          ? { ...remoteResult.profile, updatedAt: remoteResult.updatedAt }
          : remoteResult.profile;
        merged = mergeUserProfiles(local, remoteProfile);
      } else if (profileTimestamp(local) > 0) {
        merged = local;
      } else {
        return;
      }

      if (cancelled || loadSeq !== profileSaveSeq.current || editingRef.current) return;

      applyProfileState(merged);
      saveUserProfile(user.id, merged);

      const remoteTime = remoteResult.updatedAt ? Date.parse(remoteResult.updatedAt) : 0;
      if (profileTimestamp(merged) > remoteTime || !remoteResult.hasDetails) {
        void upsertUserProfileDetails(user.id, user.nickname, merged).then((result) => {
          if (!result.ok) console.error("[profile] background sync failed:", result.error);
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user.id, user.nickname]);

  useEffect(() => {
    return () => {
      if (bgmSrc?.startsWith("blob:")) URL.revokeObjectURL(bgmSrc);
    };
  }, [bgmSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    const src = bgmSrc ?? bgmPreviewUrl;
    if (!audio || !src) return;

    if (isPlaying) {
      void audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [bgmSrc, bgmPreviewUrl, isPlaying]);

  const displayName = user.nickname;
  const normalizeTags = (value: string) =>
    value
      .split(/[\s,]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith("#") ? tag : "#" + tag))
      .slice(0, 5);
  const startEdit = () => {
    setProfileError("");
    setNicknameDraft(user.nickname);
    setDraft([...fields]);
    setTagDraft(tags.join(" "));
    setEditing(true);
  };
  const saveEdit = async () => {
    setProfileError("");

    const nickCheck = validateNicknameFormat(nicknameDraft);
    if (!nickCheck.ok) {
      setProfileError(nickCheck.error);
      return;
    }

    if (isSupabaseConfigured() && (await isNicknameTaken(nickCheck.value, user.id))) {
      setProfileError("이미 사용 중인 닉네임이에요.");
      return;
    }

    let nextUser = user;
    if (nickCheck.value !== user.nickname) {
      const nicknameResult = await updateUserNickname(user.id, nickCheck.value);
      if (!nicknameResult.ok) {
        setProfileError(nicknameResult.error);
        return;
      }
      nextUser = nicknameResult.user;
      onUserUpdate(nextUser);
    }

    const nextTags = normalizeTags(tagDraft);
    let nextBgmPreviewUrl = bgmPreviewUrl ?? undefined;
    let nextBgmSrc = bgmSrc;

    if (bgmSrc?.startsWith("blob:") && pendingBgmFileRef.current) {
      const upload = await uploadProfileBgm(nextUser.id, pendingBgmFileRef.current);
      if (!upload.ok) {
        setProfileError(upload.error);
        return;
      }
      nextBgmPreviewUrl = upload.publicUrl;
      nextBgmSrc = upload.publicUrl;
      setBgmPreviewUrl(upload.publicUrl);
      setBgmSrc(upload.publicUrl);
      pendingBgmFileRef.current = null;
    }

    const nextProfile = withProfileTimestamp({
      fields: draft,
      status,
      tags: nextTags,
      bgmTitle,
      bgmPreviewUrl: nextBgmPreviewUrl,
      diaryThemeId: themeId,
    });
    setFields(draft);
    setNicknameDraft(nextUser.nickname);
    setTags(nextTags);
    saveUserProfile(nextUser.id, nextProfile);
    profileSaveSeq.current += 1;

    if (isSupabaseConfigured()) {
      const result = await upsertUserProfileDetails(nextUser.id, nextUser.nickname, nextProfile);
      if (!result.ok) {
        setProfileError(result.error);
        return;
      }
    }

    setProfileError("");
    setEditing(false);
  };
  const cancelEdit = () => {
    setProfileError("");
    setNicknameDraft(user.nickname);
    setDraft([...fields]);
    setTagDraft(tags.join(" "));
    setEditing(false);
  };
  const handleBgmFileChange = (file: File | null) => {
    if (!file) return;
    if (bgmSrc?.startsWith("blob:")) URL.revokeObjectURL(bgmSrc);
    pendingBgmFileRef.current = file;
    setBgmSrc(URL.createObjectURL(file));
    setBgmPreviewUrl(null);
    setBgmTitle("♬ " + file.name.replace(/\.mp3$/i, ""));
    setIsPlaying(false);
  };

  const handleBgmSearchSelect = (track: BgmSearchResult) => {
    const title = `♬ ${track.title} - ${track.artist}`;
    pendingBgmFileRef.current = null;
    setBgmTitle(title);
    setBgmSrc(track.previewUrl);
    setBgmPreviewUrl(track.previewUrl);
    setIsPlaying(false);
    setShowBgmSearch(false);
    if (!editing) {
      const nextProfile = withProfileTimestamp({
        fields,
        status,
        tags,
        bgmTitle: title,
        bgmPreviewUrl: track.previewUrl,
        diaryThemeId: themeId,
      });
      saveUserProfile(user.id, nextProfile);
      profileSaveSeq.current += 1;
      if (isSupabaseConfigured()) {
        void upsertUserProfileDetails(user.id, user.nickname, nextProfile);
      }
    }
  };

  const activeBgmSrc = bgmSrc ?? bgmPreviewUrl;

  return (
    <div className="h-full flex flex-col overflow-hidden relative" style={{ background: DIARY_PAPER_BG }}>
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 p-3 pb-1" style={{ scrollbarWidth: "thin" }}>
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(var(--diary-mid-rgb),0.35)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.45rem", color: "var(--diary-mid)" }}>◆</span>
          <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.7rem", color: "var(--diary-dark)", letterSpacing: "0.12em" }}>MY PROFILE</span>
        </div>
        {!editing ? (
          <button onClick={startEdit} className="px-2 py-0.5 rounded-full" style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 700, background: "linear-gradient(90deg, #ff4757, #ff6b81)", color: "white", boxShadow: "0 1px 6px rgba(255,71,87,0.35)" }}>✎ 수정하기</button>
        ) : (
          <div className="flex gap-1">
            <button onClick={saveEdit} className="px-2 py-0.5 rounded-full" style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 700, background: "linear-gradient(90deg, #ff4757, #ff6b81)", color: "white" }}>저장</button>
            <button onClick={cancelEdit} className="px-2 py-0.5 rounded-full" style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 600, background: "rgba(var(--diary-mid-rgb),0.2)", color: "var(--diary-dark)" }}>취소</button>
          </div>
        )}
      </div>
      <div className="rounded-xl p-2.5 flex gap-3 items-start flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(var(--diary-main-rgb),0.45) 0%, rgba(var(--diary-mid-rgb),0.15) 100%)", border: "1px solid rgba(var(--diary-mid-rgb),0.3)" }}>
        <div className="relative flex-shrink-0">
          <div className="rounded-lg overflow-hidden" style={{ width: 72, height: 80, background: "linear-gradient(135deg, var(--diary-card) 0%, var(--diary-main) 100%)", border: "2px solid rgba(var(--diary-mid-rgb),0.35)", boxShadow: "0 2px 8px rgba(var(--diary-mid-rgb),0.2)" }}>
            <PixelAvatarBust avatar={avatar} width={72} height={80} userId={user.id} inventoryRevision={inventoryRevision} />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white" style={{ background: "#4cda64" }} />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <p style={{ fontFamily: "Comic Sans MS, Malgun Gothic, sans-serif", fontSize: "1.3rem", color: "var(--diary-dark)", lineHeight: "1.1", fontWeight: "bold" }}>{displayName}</p>
          {editing ? (
            <input value={status} onChange={(e) => setStatus(e.target.value)} className="px-2 py-0.5 rounded-lg outline-none" style={{ fontFamily: FONT_UI, fontSize: "0.56rem", color: "var(--diary-dark)", background: "rgba(255,255,255,0.78)", border: "1px solid rgba(var(--diary-mid-rgb),0.3)" }} />
          ) : (
            <p style={{ fontFamily: FONT_UI, fontSize: "0.6rem", color: "var(--diary-mid)", fontWeight: 500 }}>{status}</p>
          )}
          {editing ? (
            <input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              placeholder="#daily #y2k #diary"
              className="mt-0.5 px-2 py-0.5 rounded-lg outline-none"
              style={{
                fontFamily: FONT_UI,
                fontSize: "0.5rem",
                color: "var(--diary-dark)",
                background: "rgba(255,255,255,0.78)",
                border: "1px solid rgba(var(--diary-mid-rgb),0.3)",
              }}
            />
          ) : (
            <div className="flex gap-1 mt-0.5 flex-wrap">
              {tags.map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 rounded-full" style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 600, background: "rgba(var(--diary-mid-rgb),0.12)", color: "var(--diary-dark)", border: "1px solid rgba(var(--diary-mid-rgb),0.25)" }}>{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="rounded-xl p-2.5 flex flex-col gap-1.5 flex-shrink-0" style={{ background: "rgba(255,255,255,0.7)", border: editing ? "1px solid rgba(255,71,87,0.4)" : "1px solid rgba(var(--diary-mid-rgb),0.2)" }}>
        <p style={{ fontFamily: FONT_PIXEL, fontSize: "0.38rem", color: "var(--diary-mid)", marginBottom: 4 }}>PROFILE</p>
        <div className="flex gap-2 items-center">
          <span className="flex-shrink-0" style={{ fontFamily: FONT_UI, fontSize: "0.55rem", fontWeight: 700, color: "var(--diary-mid)", width: 36 }}>닉네임</span>
          {editing ? (
            <input
              value={nicknameDraft}
              onChange={(e) => {
                setNicknameDraft(filterNicknameInput(e.target.value));
                if (profileError) setProfileError("");
              }}
              maxLength={NICKNAME_MAX_LENGTH}
              placeholder="친구 검색용 · 중복 불가"
              className="flex-1 px-1.5 py-0.5 rounded-lg outline-none"
              style={{ fontFamily: FONT_UI, fontSize: "0.55rem", color: "var(--diary-dark)", background: "rgba(var(--diary-main-rgb), 0.12)", border: "1px solid rgba(var(--diary-mid-rgb),0.3)" }}
            />
          ) : (
            <span style={{ fontFamily: FONT_UI, fontSize: "0.58rem", color: "var(--diary-dark)", borderBottom: "1px dotted rgba(var(--diary-mid-rgb),0.3)", flex: 1, paddingBottom: 1 }}>{user.nickname}</span>
          )}
        </div>
        {profileDetailFields(editing ? draft : fields).map(({ label, value }) => (
          <div key={label} className="flex gap-2 items-center">
            <span className="flex-shrink-0" style={{ fontFamily: FONT_UI, fontSize: "0.55rem", fontWeight: 700, color: "var(--diary-mid)", width: 36 }}>{label}</span>
            {editing ? (
              <input
                value={draft.find((f) => f.label === label)?.value ?? value}
                onChange={(e) => {
                  setDraft((prev) =>
                    prev.map((f) => (f.label === label ? { ...f, value: e.target.value } : f)),
                  );
                  if (profileError) setProfileError("");
                }}
                className="flex-1 px-1.5 py-0.5 rounded-lg outline-none"
                style={{ fontFamily: FONT_UI, fontSize: "0.55rem", color: "var(--diary-dark)", background: "rgba(var(--diary-main-rgb), 0.12)", border: "1px solid rgba(var(--diary-mid-rgb),0.3)" }}
              />
            ) : (
              <span style={{ fontFamily: FONT_UI, fontSize: "0.58rem", color: "var(--diary-dark)", borderBottom: "1px dotted rgba(var(--diary-mid-rgb),0.3)", flex: 1, paddingBottom: 1 }}>{value}</span>
            )}
          </div>
        ))}
        {profileError && (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 600, color: "#ff4757", marginTop: 4 }}>
            {profileError}
          </p>
        )}
      </div>
      <div className="rounded-xl p-2.5 flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(var(--diary-main-rgb),0.15) 0%, rgba(var(--diary-mid-rgb),0.1) 100%)", border: "1px solid rgba(var(--diary-mid-rgb),0.25)" }}>
        <p style={{ fontFamily: FONT_PIXEL, fontSize: "0.38rem", color: "var(--diary-mid)", marginBottom: 6 }}>♬ BGM</p>
        <div className="flex items-center gap-2">
          {activeBgmSrc && <audio ref={audioRef} src={activeBgmSrc} loop />}
          <button onClick={() => setIsPlaying(!isPlaying)} className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #ff4757, #ff6b81)", boxShadow: "0 2px 8px rgba(255,71,87,0.35)" }}>
            <BgmPlayPauseIcon isPlaying={isPlaying} />
          </button>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-1">
                <input value={bgmTitle} onChange={(e) => setBgmTitle(e.target.value)} className="flex-1 min-w-0 px-2 py-0.5 rounded-lg outline-none" style={{ fontFamily: FONT_UI, fontSize: "0.56rem", fontWeight: 700, color: "var(--diary-dark)", background: "rgba(255,255,255,0.75)", border: "1px solid rgba(var(--diary-mid-rgb),0.25)" }} />
                <BgmSearchButton onClick={() => setShowBgmSearch(true)} />
                <label className="flex-shrink-0 px-2 py-0.5 rounded-full cursor-pointer" style={{ fontFamily: FONT_UI, fontSize: "0.45rem", fontWeight: 800, color: "white", background: "linear-gradient(90deg,var(--diary-mid),var(--diary-dark))" }}>
                  MP3
                  <input type="file" accept=".mp3,audio/mpeg" className="hidden" onChange={(e) => handleBgmFileChange(e.target.files?.[0] ?? null)} />
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-1 min-w-0">
                <p style={{ fontFamily: FONT_UI, fontSize: "0.58rem", fontWeight: 700, color: "var(--diary-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{bgmTitle}</p>
                <BgmSearchButton onClick={() => setShowBgmSearch(true)} />
              </div>
            )}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {showBgmSearch && (
          <BgmSearchModal
            onClose={() => setShowBgmSearch(false)}
            onSelect={handleBgmSearchSelect}
          />
        )}
      </AnimatePresence>
      <VisitorCountBar userId={user.id} />
      </div>
      <div className="flex-shrink-0 px-3 pb-3 pt-1">
        <ProfileActionButtons user={user} onVisitFriend={onVisitFriend} />
      </div>
    </div>
  );
}

/** 친구/파도타기 방문 시 — 이웃·일촌 관계 액션 */
function VisitRelationPanel({
  user,
  target,
}: {
  user: User;
  target: FriendNeighbor;
}) {
  const targetId = target.friendUserId;
  const [loading, setLoading] = useState(!!targetId && isSupabaseConfigured());
  const [isNeighbor, setIsNeighbor] = useState(false);
  const [isIlchon, setIsIlchon] = useState(false);
  const [outgoingFriend, setOutgoingFriend] = useState(false);
  const [outgoingIlchon, setOutgoingIlchon] = useState(false);
  const [incomingIlchonReq, setIncomingIlchonReq] = useState<IlchonRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshRelation = async () => {
    if (!targetId || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const [friends, ilchons, ilchonReqs, friendReqs] = await Promise.all([
      loadFriends(user.id),
      loadIlchonList(user.id),
      loadIlchonRequests(user.id),
      loadFriendRequests(user.id),
    ]);

    setIsNeighbor(friends.some((f) => f.friendUserId === targetId));
    setIsIlchon(ilchons.some((i) => i.ilchonUserId === targetId));
    setOutgoingFriend(friendReqs.outgoing.some((r) => r.toUserId === targetId));
    setOutgoingIlchon(ilchonReqs.outgoing.some((r) => r.toUserId === targetId));
    setIncomingIlchonReq(
      ilchonReqs.incoming.find((r) => r.fromUserId === targetId) ?? null,
    );
    setLoading(false);
  };

  useEffect(() => {
    void refreshRelation();
  }, [user.id, targetId, target.name]);

  const handleAddFriend = async () => {
    if (busy || !targetId) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    const result = await sendFriendRequest(user.id, target.name);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOutgoingFriend(true);
    setFeedback(`${target.name}님에게 친구 신청을 보냈어요.`);
    void refreshRelation();
  };

  const handleIlchonRequest = async () => {
    if (busy || !targetId) return;
    setBusy(true);
    setError(null);
    setFeedback(null);
    const result = await sendIlchonRequest(targetId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOutgoingIlchon(true);
    setFeedback(`${target.name}님에게 일촌 신청을 보냈어요.`);
    void refreshRelation();
  };

  const handleAcceptIlchon = async () => {
    if (busy || !incomingIlchonReq) return;
    setBusy(true);
    setError(null);
    const result = await acceptIlchonRequest(incomingIlchonReq.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFeedback(`${target.name}님과 일촌이 됐어요!`);
    void refreshRelation();
  };

  const handleRejectIlchon = async () => {
    if (busy || !incomingIlchonReq) return;
    setBusy(true);
    setError(null);
    const ok = await rejectIlchonRequest(incomingIlchonReq.id);
    setBusy(false);
    if (!ok) {
      setError("거절에 실패했어요.");
      return;
    }
    setIncomingIlchonReq(null);
    void refreshRelation();
  };

  if (!targetId) return null;

  return (
    <div
      className="rounded-xl h-full flex flex-col items-center justify-center gap-2 p-2.5 min-h-0"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,230,240,0.25) 100%)",
        border: "1px solid rgba(255,110,180,0.22)",
      }}
    >
      {loading ? (
        <p style={{ fontFamily: FONT_UI, fontSize: "0.44rem", color: "var(--diary-mid)" }}>불러오는 중...</p>
      ) : isIlchon ? (
        <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 700, color: "var(--diary-dark)", textAlign: "center" }}>
          💞 {target.name}님과 일촌이에요
        </p>
      ) : incomingIlchonReq ? (
        <div className="flex flex-col items-center gap-2 w-full">
          <p style={{ fontFamily: FONT_UI, fontSize: "0.44rem", color: "var(--diary-mid)", textAlign: "center", lineHeight: 1.45 }}>
            {target.name}님이 일촌 신청을 보냈어요
          </p>
          <div className="flex gap-1.5 w-full">
            <button
              type="button"
              onClick={() => void handleRejectIlchon()}
              disabled={busy}
              className="flex-1 py-2 rounded-xl"
              style={{ fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 700, color: "var(--diary-dark)", background: "rgba(var(--diary-mid-rgb),0.12)" }}
            >
              거절
            </button>
            <button
              type="button"
              onClick={() => void handleAcceptIlchon()}
              disabled={busy}
              className="flex-1 py-2 rounded-xl text-white"
              style={{ fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 700, background: "linear-gradient(90deg, #ff4757, #ff6b81)" }}
            >
              {busy ? "..." : "일촌 수락"}
            </button>
          </div>
        </div>
      ) : outgoingIlchon ? (
        <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 600, color: "var(--diary-mid)", textAlign: "center" }}>
          일촌 신청을 보냈어요 · 수락을 기다리는 중
        </p>
      ) : isNeighbor ? (
        <motion.button
          type="button"
          onClick={() => void handleIlchonRequest()}
          disabled={busy}
          className="w-full py-2.5 rounded-xl text-white"
          style={{
            fontFamily: FONT_UI,
            fontSize: "0.5rem",
            fontWeight: 700,
            background: "linear-gradient(90deg, var(--diary-dark), var(--diary-mid))",
            boxShadow: "0 2px 8px rgba(var(--diary-dark-rgb),0.3)",
            opacity: busy ? 0.6 : 1,
          }}
          whileTap={{ scale: 0.97 }}
        >
          {busy ? "..." : "💞 일촌 신청하기"}
        </motion.button>
      ) : outgoingFriend ? (
        <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 600, color: "var(--diary-mid)", textAlign: "center" }}>
          친구 신청을 보냈어요 · 수락을 기다리는 중
        </p>
      ) : (
        <motion.button
          type="button"
          onClick={() => void handleAddFriend()}
          disabled={busy}
          className="w-full py-2.5 rounded-xl text-white"
          style={{
            fontFamily: FONT_UI,
            fontSize: "0.5rem",
            fontWeight: 700,
            background: "linear-gradient(90deg, #ff4757, #ff6b81)",
            boxShadow: "0 2px 8px rgba(255,71,87,0.28)",
            opacity: busy ? 0.6 : 1,
          }}
          whileTap={{ scale: 0.97 }}
        >
          {busy ? "..." : "＋ 친구 추가하기"}
        </motion.button>
      )}

      {feedback && (
        <p style={{ fontFamily: FONT_UI, fontSize: "0.4rem", fontWeight: 600, color: "#3d8b5f", textAlign: "center" }}>
          {feedback}
        </p>
      )}
      {error && (
        <p style={{ fontFamily: FONT_UI, fontSize: "0.4rem", fontWeight: 600, color: "#ff4757", textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
}

/** Read-only left profile shown while visiting a friend */
function FriendProfileLeftPage({
  nb,
  user,
  onVisitFriend,
}: {
  nb: FriendNeighbor;
  user: User;
  onVisitFriend: (nb: FriendNeighbor) => void;
}) {
  const [avatar, setAvatar] = useState<AvatarProfile | null>(nb.avatarProfile ?? null);
  const [inventory, setInventory] = useState<HandMadeItem[]>(nb.inventory ?? []);
  const [isOnline, setIsOnline] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const initialProfile = getUserProfile(nb.friendUserId ?? String(nb.id), nb.name);
  const [status, setStatus] = useState(initialProfile.status);
  const [tags, setTags] = useState(initialProfile.tags);
  const [fields, setFields] = useState(initialProfile.fields);
  const [bgmTitle, setBgmTitle] = useState(initialProfile.bgmTitle ?? "♬ Lovefool - The Cardigans");
  const [bgmPreviewUrl, setBgmPreviewUrl] = useState<string | null>(initialProfile.bgmPreviewUrl ?? null);
  const [bgmSrc, setBgmSrc] = useState<string | null>(initialProfile.bgmPreviewUrl ?? null);
  const [bgmError, setBgmError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const displayName = nb.name;
  const accent = nb.color;
  const activeBgmSrc = bgmSrc ?? bgmPreviewUrl;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (nb.friendUserId && isSupabaseConfigured()) {
        const [remoteAvatar, remoteInventory, online, remoteProfile] = await Promise.all([
          fetchUserAvatar(nb.friendUserId),
          fetchUserInventory(nb.friendUserId),
          fetchOnlineUserIds([nb.friendUserId]),
          fetchUserProfileDetails(nb.friendUserId, nb.name),
        ]);
        if (cancelled) return;
        if (remoteAvatar) setAvatar(storedToAvatarProfile(remoteAvatar));
        if (remoteInventory) setInventory(remoteInventory.items);
        setIsOnline(online.has(nb.friendUserId));
        if (remoteProfile) {
          const profile = remoteProfile.profile;
          if (remoteProfile.hasDetails) {
            setStatus(profile.status);
            setTags(profile.tags);
            setFields(profile.fields);
          }
          if (profile.bgmPreviewUrl) {
            setBgmPreviewUrl(profile.bgmPreviewUrl);
            setBgmSrc(profile.bgmPreviewUrl);
            if (profile.bgmTitle) setBgmTitle(profile.bgmTitle);
          }
        }
      } else {
        setAvatar(nb.avatarProfile ?? null);
        setIsOnline(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nb.friendUserId, nb.avatarProfile, nb.name]);

  useEffect(() => {
    if (!nb.friendUserId || !isSupabaseConfigured()) return;

    const poll = window.setInterval(() => {
      void (async () => {
        const [remoteAvatar, remoteInventory] = await Promise.all([
          fetchUserAvatar(nb.friendUserId!),
          fetchUserInventory(nb.friendUserId!),
        ]);
        if (remoteAvatar) setAvatar(storedToAvatarProfile(remoteAvatar));
        if (remoteInventory) setInventory(remoteInventory.items);
      })();
    }, 8000);

    return () => window.clearInterval(poll);
  }, [nb.friendUserId]);

  useEffect(() => {
    setIsPlaying(false);
    setBgmError("");
  }, [activeBgmSrc]);

  useEffect(() => {
    const audio = audioRef.current;
    const src = activeBgmSrc;
    if (!audio || !src) return;

    if (isPlaying) {
      void audio.play().catch(() => {
        setIsPlaying(false);
        setBgmError("BGM을 재생하지 못했어요.");
      });
    } else {
      audio.pause();
    }
  }, [activeBgmSrc, isPlaying]);

  const displayAvatar = avatar ?? DEFAULT_AVATAR_PROFILE;

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden relative" style={{ background: DIARY_PAPER_BG }}>
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: `${accent}55` }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.45rem", color: accent }}>◆</span>
          <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.7rem", color: "var(--diary-dark)", letterSpacing: "0.12em" }}>FRIEND PROFILE</span>
        </div>
        <span
          className="px-2 py-0.5 rounded-full"
          style={{ fontFamily: FONT_UI, fontSize: "0.42rem", fontWeight: 700, background: `${accent}22`, color: "var(--diary-dark)", border: `1px solid ${accent}44` }}
        >
          {nb.name}
        </span>
      </div>

      <div className="rounded-xl p-2.5 flex gap-3 items-start flex-shrink-0" style={{ background: `linear-gradient(135deg, ${accent}33 0%, rgba(var(--diary-mid-rgb),0.12) 100%)`, border: `1px solid ${accent}44` }}>
        <div className="relative flex-shrink-0">
          <div className="rounded-lg overflow-hidden flex items-center justify-center" style={{ width: 72, height: 80, background: "linear-gradient(135deg, var(--diary-card) 0%, var(--diary-main) 100%)", border: `2px solid ${accent}88`, boxShadow: `0 2px 8px ${accent}33` }}>
            <PixelAvatarBust
              avatar={displayAvatar}
              width={72}
              height={80}
              userId={nb.friendUserId}
              inventory={inventory}
            />
          </div>
          <div
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
            style={{ background: isOnline ? "#4cda64" : "#b8bcc6" }}
            title={isOnline ? "활동 중" : "비활동"}
          />
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <p style={{ fontFamily: "Comic Sans MS, Malgun Gothic, sans-serif", fontSize: "1.3rem", color: "var(--diary-dark)", lineHeight: "1.1", fontWeight: "bold" }}>{displayName}</p>
          <p style={{ fontFamily: FONT_UI, fontSize: "0.6rem", color: "var(--diary-mid)", fontWeight: 500 }}>{status}</p>
          <div className="flex gap-1 mt-0.5 flex-wrap">
            {tags.map((tag) => (
              <span key={tag} className="px-1.5 py-0.5 rounded-full" style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 600, background: "rgba(var(--diary-mid-rgb),0.12)", color: "var(--diary-dark)", border: "1px solid rgba(var(--diary-mid-rgb),0.25)" }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl p-2.5 flex flex-col gap-1.5 flex-shrink-0" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(var(--diary-mid-rgb),0.2)" }}>
        <p style={{ fontFamily: FONT_PIXEL, fontSize: "0.38rem", color: "var(--diary-mid)", marginBottom: 4 }}>PROFILE</p>
        <div className="flex gap-2 items-center">
          <span className="flex-shrink-0" style={{ fontFamily: FONT_UI, fontSize: "0.55rem", fontWeight: 700, color: "var(--diary-mid)", width: 36 }}>닉네임</span>
          <span style={{ fontFamily: FONT_UI, fontSize: "0.58rem", color: "var(--diary-dark)", borderBottom: "1px dotted rgba(var(--diary-mid-rgb),0.3)", flex: 1, paddingBottom: 1 }}>{nb.name}</span>
        </div>
        {profileDetailFields(fields).map(({ label, value }) => (
          <div key={label} className="flex gap-2 items-center">
            <span className="flex-shrink-0" style={{ fontFamily: FONT_UI, fontSize: "0.55rem", fontWeight: 700, color: "var(--diary-mid)", width: 36 }}>{label}</span>
            <span style={{ fontFamily: FONT_UI, fontSize: "0.58rem", color: "var(--diary-dark)", borderBottom: "1px dotted rgba(var(--diary-mid-rgb),0.3)", flex: 1, paddingBottom: 1 }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-xl p-2.5 flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(var(--diary-main-rgb),0.15) 0%, rgba(var(--diary-mid-rgb),0.1) 100%)", border: "1px solid rgba(var(--diary-mid-rgb),0.25)" }}>
        <p style={{ fontFamily: FONT_PIXEL, fontSize: "0.38rem", color: "var(--diary-mid)", marginBottom: 6 }}>♬ BGM</p>
        <div className="flex items-center gap-2">
          {activeBgmSrc && <audio ref={audioRef} key={activeBgmSrc} src={activeBgmSrc} loop preload="metadata" />}
          <button
            type="button"
            onClick={() => {
              if (!activeBgmSrc) {
                setBgmError("친구가 설정한 재생 가능한 BGM이 없어요.");
                return;
              }
              setBgmError("");
              setIsPlaying((v) => !v);
            }}
            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #ff4757, #ff6b81)",
              boxShadow: "0 2px 8px rgba(255,71,87,0.35)",
              opacity: activeBgmSrc ? 1 : 0.55,
            }}
          >
            <BgmPlayPauseIcon isPlaying={isPlaying} />
          </button>
          <p style={{ fontFamily: FONT_UI, fontSize: "0.58rem", fontWeight: 700, color: "var(--diary-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1 }}>{bgmTitle}</p>
        </div>
        {bgmError && (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 600, color: "#ff4757", marginTop: 4 }}>
            {bgmError}
          </p>
        )}
      </div>

      {nb.friendUserId && <VisitorCountBar userId={nb.friendUserId} />}

      {nb.friendUserId ? (
        <div className="flex-1 flex flex-col min-h-0 gap-2">
          <div className="flex-[1] min-h-0 overflow-hidden flex flex-col">
            <IlchonPanel
              ownerUserId={nb.friendUserId}
              ownerName={nb.name}
              currentUserId={user.id}
              onVisitFriend={onVisitFriend}
              excludeUserIds={[user.id]}
            />
          </div>
          <div className="flex-[1] min-h-0 overflow-hidden flex flex-col">
            <VisitRelationPanel user={user} target={nb} />
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl p-2.5 flex items-center justify-center flex-1 min-h-0 flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.55)", border: "1px dashed rgba(var(--diary-mid-rgb),0.25)" }}
        >
          <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "var(--diary-mid)", textAlign: "center", lineHeight: 1.5 }}>
            {nb.name}님의 프로필을 보고 있어요
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   RIGHT PAGE — PHOTO ALBUM
═══════════════════════════════════════════ */
type PhotoDecoration =
  | {
      id: string;
      type: "emoticon";
      emoticonId: number;
      x: number;
      y: number;
    }
  | {
      id: string;
      type: "text";
      text: string;
      color: string;
      size: number;
      x: number;
      y: number;
    };

type PhotoEditTool = "emoticon" | null;
type PhotoDecorationMap = Record<string, PhotoDecoration[]>;

const PHOTO_TEXT_COLORS = ["#5b4b2d", "#ffffff", "#ff4757", "#3b82f6", "#22c55e", "#f59e0b", "#d946ef", "#111827"];
const DEFAULT_PHOTO_TEXT_SIZE = 1;

function resolveWeatherKind(weather: string): string {
  const w = weather.trim();
  if (!w) return "sun";
  if (w === "맑음" || w.includes("☀")) return "sun";
  if (w === "맑지만 구름" || w.includes("🌤")) return "sunCloud";
  if (w === "구름많음" || w.includes("⛅") || w.includes("🌥")) return "cloudy";
  if (w === "바람" || w.includes("🌬") || w.includes("💨")) return "wind";
  if (w === "비옴" || w.includes("🌧") || w === "🌦️") return "rain";
  if (w === "천둥침" || w.includes("⛈") || w.includes("🌩")) return "thunder";
  if (w === "무지개" || w.includes("🌈")) return "rainbow";
  if (w === "눈옴" || w.includes("❄") || w.includes("🌨")) return "snow";
  return "sun";
}

function WeatherPixelIcon({ weather, size = 18 }: { weather: string; size?: number }) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 20 20",
    style: { imageRendering: "pixelated" as const, display: "block", flexShrink: 0 },
  };

  const kind = resolveWeatherKind(weather);

  switch (kind) {
    case "sun":
      return (
        <svg {...commonProps} aria-hidden>
          <rect x="9" y="1" width="2" height="2" fill="#ffb300" />
          <rect x="9" y="17" width="2" height="2" fill="#ffb300" />
          <rect x="1" y="9" width="2" height="2" fill="#ffb300" />
          <rect x="17" y="9" width="2" height="2" fill="#ffb300" />
          <rect x="3" y="3" width="2" height="2" fill="#ffb300" />
          <rect x="15" y="3" width="2" height="2" fill="#ffb300" />
          <rect x="3" y="15" width="2" height="2" fill="#ffb300" />
          <rect x="15" y="15" width="2" height="2" fill="#ffb300" />
          <rect x="5" y="5" width="10" height="10" fill="#ffca28" />
          <rect x="6" y="6" width="8" height="8" fill="#ffeb3b" />
          <rect x="8" y="8" width="4" height="4" fill="#fff59d" />
        </svg>
      );
    case "sunCloud":
      return (
        <svg {...commonProps} aria-hidden>
          <rect x="2" y="2" width="2" height="2" fill="#ffb300" />
          <rect x="4" y="1" width="2" height="2" fill="#ffb300" />
          <rect x="1" y="4" width="2" height="2" fill="#ffb300" />
          <rect x="3" y="3" width="6" height="6" fill="#ffca28" />
          <rect x="4" y="4" width="4" height="4" fill="#ffeb3b" />
          <rect x="7" y="8" width="4" height="2" fill="#cfd8dc" />
          <rect x="5" y="10" width="8" height="2" fill="#eceff1" />
          <rect x="4" y="12" width="10" height="3" fill="#ffffff" />
          <rect x="5" y="14" width="8" height="2" fill="#f5f5f5" />
          <rect x="11" y="9" width="5" height="2" fill="#b0bec5" />
          <rect x="13" y="11" width="4" height="2" fill="#cfd8dc" />
        </svg>
      );
    case "cloudy":
      return (
        <svg {...commonProps} aria-hidden>
          <rect x="1" y="5" width="2" height="2" fill="#ffb300" />
          <rect x="3" y="3" width="2" height="2" fill="#ffb300" />
          <rect x="2" y="7" width="6" height="6" fill="#ffca28" />
          <rect x="3" y="8" width="4" height="4" fill="#ffeb3b" />
          <rect x="8" y="6" width="4" height="2" fill="#b0bec5" />
          <rect x="6" y="8" width="8" height="2" fill="#cfd8dc" />
          <rect x="5" y="10" width="12" height="3" fill="#ffffff" />
          <rect x="4" y="12" width="14" height="2" fill="#eceff1" />
          <rect x="6" y="14" width="10" height="2" fill="#e0e0e0" />
          <rect x="12" y="7" width="5" height="2" fill="#90a4ae" />
        </svg>
      );
    case "wind":
      return (
        <svg {...commonProps} aria-hidden>
          <rect x="1" y="6" width="7" height="1" fill="#4fc3f7" />
          <rect x="3" y="5" width="5" height="1" fill="#81d4fa" />
          <rect x="5" y="4" width="3" height="1" fill="#b3e5fc" />
          <rect x="2" y="10" width="8" height="1" fill="#4fc3f7" />
          <rect x="4" y="9" width="6" height="1" fill="#81d4fa" />
          <rect x="6" y="8" width="4" height="1" fill="#b3e5fc" />
          <rect x="3" y="14" width="6" height="1" fill="#4fc3f7" />
          <rect x="5" y="13" width="4" height="1" fill="#81d4fa" />
          <rect x="12" y="7" width="3" height="2" fill="#cfd8dc" />
          <rect x="11" y="9" width="6" height="2" fill="#eceff1" />
          <rect x="10" y="11" width="8" height="3" fill="#ffffff" />
          <rect x="11" y="14" width="6" height="2" fill="#f5f5f5" />
        </svg>
      );
    case "rain":
      return (
        <svg {...commonProps} aria-hidden>
          <rect x="5" y="3" width="4" height="2" fill="#b0bec5" />
          <rect x="4" y="5" width="12" height="2" fill="#cfd8dc" />
          <rect x="3" y="7" width="14" height="3" fill="#ffffff" />
          <rect x="4" y="9" width="12" height="2" fill="#eceff1" />
          <rect x="6" y="12" width="1" height="3" fill="#29b6f6" />
          <rect x="9" y="11" width="1" height="4" fill="#039be5" />
          <rect x="12" y="12" width="1" height="3" fill="#29b6f6" />
          <rect x="15" y="13" width="1" height="2" fill="#4fc3f7" />
          <rect x="7" y="14" width="1" height="2" fill="#81d4fa" />
          <rect x="13" y="15" width="1" height="1" fill="#81d4fa" />
        </svg>
      );
    case "thunder":
      return (
        <svg {...commonProps} aria-hidden>
          <rect x="5" y="3" width="4" height="2" fill="#78909c" />
          <rect x="4" y="5" width="12" height="2" fill="#90a4ae" />
          <rect x="3" y="7" width="14" height="3" fill="#b0bec5" />
          <rect x="4" y="9" width="12" height="2" fill="#cfd8dc" />
          <rect x="8" y="10" width="2" height="2" fill="#ffeb3b" />
          <rect x="10" y="11" width="2" height="3" fill="#ffc107" />
          <rect x="8" y="13" width="2" height="2" fill="#ffeb3b" />
          <rect x="6" y="15" width="2" height="2" fill="#ffc107" />
          <rect x="6" y="12" width="1" height="2" fill="#29b6f6" />
          <rect x="13" y="12" width="1" height="3" fill="#29b6f6" />
          <rect x="11" y="15" width="1" height="1" fill="#4fc3f7" />
        </svg>
      );
    case "rainbow":
      return (
        <svg {...commonProps} aria-hidden>
          <rect x="4" y="5" width="12" height="1" fill="#e57373" />
          <rect x="5" y="6" width="10" height="1" fill="#ffb74d" />
          <rect x="6" y="7" width="8" height="1" fill="#fff176" />
          <rect x="7" y="8" width="6" height="1" fill="#81c784" />
          <rect x="8" y="9" width="4" height="1" fill="#64b5f6" />
          <rect x="9" y="10" width="2" height="1" fill="#ba68c8" />
          <rect x="3" y="12" width="4" height="2" fill="#eceff1" />
          <rect x="2" y="13" width="5" height="2" fill="#ffffff" />
          <rect x="13" y="12" width="4" height="2" fill="#eceff1" />
          <rect x="13" y="13" width="5" height="2" fill="#ffffff" />
          <rect x="6" y="14" width="8" height="2" fill="#ffffff" />
          <rect x="7" y="15" width="6" height="1" fill="#f5f5f5" />
        </svg>
      );
    case "snow":
      return (
        <svg {...commonProps} aria-hidden>
          <rect x="5" y="3" width="4" height="2" fill="#b0bec5" />
          <rect x="4" y="5" width="12" height="2" fill="#cfd8dc" />
          <rect x="3" y="7" width="14" height="3" fill="#ffffff" />
          <rect x="4" y="9" width="12" height="2" fill="#eceff1" />
          <rect x="5" y="12" width="1" height="1" fill="#81d4fa" />
          <rect x="7" y="11" width="2" height="1" fill="#4fc3f7" />
          <rect x="6" y="12" width="4" height="1" fill="#b3e5fc" />
          <rect x="7" y="13" width="2" height="1" fill="#4fc3f7" />
          <rect x="6" y="14" width="4" height="1" fill="#81d4fa" />
          <rect x="7" y="15" width="2" height="1" fill="#b3e5fc" />
          <rect x="11" y="12" width="1" height="1" fill="#81d4fa" />
          <rect x="13" y="11" width="2" height="1" fill="#4fc3f7" />
          <rect x="12" y="12" width="4" height="1" fill="#b3e5fc" />
          <rect x="13" y="13" width="2" height="1" fill="#4fc3f7" />
          <rect x="12" y="14" width="4" height="1" fill="#81d4fa" />
          <rect x="13" y="15" width="2" height="1" fill="#b3e5fc" />
        </svg>
      );
    default:
      return <WeatherPixelIcon weather="맑음" size={size} />;
  }
}

const clampPhotoPercent = (value: number) => Math.max(5, Math.min(95, value));
const clampPhotoTextSize = (value: number) => Math.max(0.55, Math.min(3, value));

function getPhotoPointerPercent(surface: HTMLDivElement | null, event: ReactPointerEvent<HTMLElement>) {
  if (!surface) return null;
  const rect = surface.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  return {
    x: clampPhotoPercent(((event.clientX - rect.left) / rect.width) * 100),
    y: clampPhotoPercent(((event.clientY - rect.top) / rect.height) * 100),
  };
}

function AlbumPhoto({ src }: { src: string }) {
  if (src.startsWith("linear-gradient(")) {
    return <div className="w-full h-full" style={{ background: src }} />;
  }

  return <img src={src} alt="" className="w-full h-full object-cover" />;
}

function PhotoDecorationsOverlay({
  decorations,
  editable = false,
  surfaceRef,
  onMove,
  onResize,
  onDelete,
  emoticonSize = 56,
  textSize = "0.86rem",
}: {
  decorations: PhotoDecoration[];
  editable?: boolean;
  surfaceRef?: RefObject<HTMLDivElement | null>;
  onMove?: (id: string, x: number, y: number) => void;
  onResize?: (id: string, size: number) => void;
  onDelete?: (id: string) => void;
  emoticonSize?: number;
  textSize?: string;
}) {
  if (decorations.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {decorations.map((decoration) => {
        const deleteButton = editable ? (
          <button
            type="button"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete?.(decoration.id);
            }}
            className="absolute rounded-full flex items-center justify-center"
            style={{
              top: -16,
              right: -16,
              width: 20,
              height: 20,
              background: "rgba(255,71,87,0.96)",
              border: "1.5px solid rgba(255,255,255,0.9)",
              color: "white",
              fontFamily: FONT_UI,
              fontSize: "0.58rem",
              fontWeight: 900,
              lineHeight: 1,
              boxShadow: "0 2px 8px rgba(0,0,0,0.28)",
              cursor: "pointer",
            }}
            aria-label="사진 장식 삭제"
          >
            ×
          </button>
        ) : null;

        const dragProps = editable
          ? {
              onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                const point = getPhotoPointerPercent(surfaceRef?.current ?? null, event);
                if (point) onMove?.(decoration.id, point.x, point.y);
              },
              onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                event.preventDefault();
                const point = getPhotoPointerPercent(surfaceRef?.current ?? null, event);
                if (point) onMove?.(decoration.id, point.x, point.y);
              },
              onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              },
              onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              },
            }
          : {};

        return (
          <div
            key={decoration.id}
            aria-label="사진 장식"
            className="absolute flex items-center justify-center pointer-events-auto"
            style={{
              left: `${decoration.x}%`,
              top: `${decoration.y}%`,
              transform: "translate(-50%, -50%)",
              cursor: editable ? "move" : "default",
              touchAction: "none",
              userSelect: "none",
              padding: 0,
              border: "none",
              background: "transparent",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.28))",
            }}
            {...dragProps}
          >
            {decoration.type === "emoticon" ? (
              <div className="relative">
                <PixelEmoticonIcon
                  icon={SAMPLE_EMOTICONS.find((e) => e.id === decoration.emoticonId)?.icon ?? "sparkle-face"}
                  color={SAMPLE_EMOTICONS.find((e) => e.id === decoration.emoticonId)?.color ?? "#d8c49b"}
                  size={emoticonSize}
                  glow
                />
                {deleteButton}
              </div>
            ) : (
              <div className="relative">
                <span
                  style={{
                    display: "block",
                    maxWidth: "11em",
                    padding: editable ? "0.18em 0.3em" : 0,
                    color: decoration.color,
                    fontFamily: FONT_UI,
                    fontSize: `calc(${textSize} * ${decoration.size})`,
                    fontWeight: 900,
                    lineHeight: 1.22,
                    textShadow: decoration.color === "#ffffff" ? "0 1px 4px rgba(0,0,0,0.82)" : "0 1px 3px rgba(255,255,255,0.86), 0 2px 4px rgba(0,0,0,0.32)",
                    overflowWrap: "anywhere",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {decoration.text}
                </span>
                {editable && (
                  <>
                    {deleteButton}
                    <button
                      type="button"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.currentTarget.setPointerCapture(event.pointerId);
                      }}
                      onPointerMove={(event) => {
                        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                        event.preventDefault();
                        event.stopPropagation();
                        const point = getPhotoPointerPercent(surfaceRef?.current ?? null, event);
                        if (!point) return;
                        const distance = Math.hypot(point.x - decoration.x, point.y - decoration.y);
                        onResize?.(decoration.id, clampPhotoTextSize(distance / 11));
                      }}
                      onPointerUp={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                          event.currentTarget.releasePointerCapture(event.pointerId);
                        }
                      }}
                      onPointerCancel={(event) => {
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                          event.currentTarget.releasePointerCapture(event.pointerId);
                        }
                      }}
                      className="absolute"
                      style={{
                        right: -13,
                        bottom: -13,
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background: "rgba(255,248,232,0.96)",
                        border: "1.5px solid rgba(176,138,74,0.9)",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.22)",
                        cursor: "nwse-resize",
                        touchAction: "none",
                      }}
                      aria-label="텍스트 크기 조절"
                    >
                      <span
                        className="absolute"
                        style={{
                          right: 3,
                          bottom: 3,
                          width: 8,
                          height: 8,
                          borderRight: "2px solid #8a6334",
                          borderBottom: "2px solid #8a6334",
                        }}
                      />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PhotoSocialToolbar({
  photoId,
  user,
  viewCount,
  likeCount,
  likedByMe,
  comments,
  onToggleLike,
  onAddComment,
  onDeleteComment,
  accentColor = "#ff6080",
}: {
  photoId: string;
  user: User;
  viewCount: number;
  likeCount: number;
  likedByMe: boolean;
  comments: PhotoComment[];
  onToggleLike: (photoId: string) => Promise<unknown>;
  onAddComment: (photoId: string, content: string) => Promise<{ ok: boolean; error?: string }>;
  onDeleteComment: (photoId: string, commentId: string) => Promise<unknown>;
  accentColor?: string;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const btnStyle = {
    fontFamily: FONT_UI,
    fontSize: "0.52rem" as const,
    fontWeight: 800 as const,
    background: "rgba(255,255,255,0.12)",
    color: "#f7efd9",
    border: "1px solid rgba(247,239,217,0.18)",
  };

  const submitComment = async () => {
    if (!commentDraft.trim() || submitting) return;
    setSubmitting(true);
    setCommentError("");
    const result = await onAddComment(photoId, commentDraft);
    setSubmitting(false);
    if (!result.ok) {
      setCommentError(result.error ?? "댓글 등록에 실패했어요.");
      return;
    }
    setCommentDraft("");
    setShowComments(true);
  };

  return (
    <div className="flex flex-col gap-2 flex-shrink-0">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => void onToggleLike(photoId)}
          className="px-2.5 py-1 rounded-full"
          style={{
            ...btnStyle,
            background: likedByMe ? `linear-gradient(90deg,${accentColor},${accentColor}cc)` : btnStyle.background,
            color: likedByMe ? "white" : btnStyle.color,
            border: likedByMe ? "none" : btnStyle.border,
          }}
        >
          {likedByMe ? "♥" : "♡"} {likeCount}
        </button>
        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="px-2.5 py-1 rounded-full"
          style={{
            ...btnStyle,
            background: showComments ? `linear-gradient(90deg,${accentColor},${accentColor}cc)` : btnStyle.background,
            color: showComments ? "white" : btnStyle.color,
            border: showComments ? "none" : btnStyle.border,
          }}
        >
          💬 {comments.length}
        </button>
        <span
          className="px-2.5 py-1 rounded-full"
          style={{ ...btnStyle, cursor: "default" }}
        >
          조회 {viewCount}
        </span>
      </div>

      <AnimatePresence>
        {showComments && (
          <motion.div
            className="rounded-xl p-2 flex flex-col gap-1.5"
            style={{
              maxHeight: 180,
              background: "rgba(255,248,232,0.96)",
              border: "1.5px solid rgba(176,138,74,0.34)",
              boxShadow: "0 6px 20px rgba(42,33,20,0.24)",
            }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 900, color: "#8a6334" }}>댓글</span>
              <button
                type="button"
                onClick={() => setShowComments(false)}
                className="w-5 h-5 rounded-full"
                style={{ background: "rgba(176,138,74,0.14)", color: "#8a6334", fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 900 }}
              >
                ×
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1" style={{ scrollbarWidth: "thin" }}>
              {comments.length === 0 ? (
                <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", color: "#8a6334", textAlign: "center", padding: "6px 0" }}>
                  첫 댓글을 남겨 보세요
                </p>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex items-start gap-1.5 rounded-lg px-2 py-1"
                    style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(176,138,74,0.18)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <p style={{ fontFamily: FONT_UI, fontSize: "0.44rem", fontWeight: 800, color: "#8a6334" }}>
                        {comment.authorNickname}
                      </p>
                      <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#5b4b2d", lineHeight: 1.4, wordBreak: "break-word" }}>
                        {comment.content}
                      </p>
                    </div>
                    {comment.authorId === user.id && (
                      <button
                        type="button"
                        onClick={() => void onDeleteComment(photoId, comment.id)}
                        className="rounded-full px-1.5 py-0.5 flex-shrink-0"
                        style={{ background: "rgba(255,71,87,0.12)", color: "#ff4757", fontFamily: FONT_UI, fontSize: "0.4rem", fontWeight: 900 }}
                      >
                        삭제
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={commentDraft}
                onChange={(e) => {
                  setCommentDraft(e.target.value);
                  setCommentError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && void submitComment()}
                placeholder="댓글 입력..."
                maxLength={300}
                className="flex-1 min-w-0 px-2 py-1 rounded-lg outline-none"
                style={{
                  fontFamily: FONT_UI,
                  fontSize: "0.48rem",
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(176,138,74,0.25)",
                  color: "#5b4b2d",
                }}
              />
              <button
                type="button"
                onClick={() => void submitComment()}
                disabled={!commentDraft.trim() || submitting}
                className="px-2 py-1 rounded-lg text-white flex-shrink-0"
                style={{
                  fontFamily: FONT_UI,
                  fontSize: "0.46rem",
                  fontWeight: 800,
                  background: commentDraft.trim() && !submitting
                    ? `linear-gradient(90deg,${accentColor},${accentColor}cc)`
                    : "rgba(176,138,74,0.35)",
                  opacity: commentDraft.trim() && !submitting ? 1 : 0.6,
                }}
              >
                {submitting ? "..." : "등록"}
              </button>
            </div>
            {commentError && (
              <p style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "#ff4757", fontWeight: 700 }}>{commentError}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PhotoPage({
  avatar,
  user,
  inventoryRevision,
  onDeleteItem,
}: {
  avatar: AvatarProfile;
  user: User;
  inventoryRevision: number;
  onDeleteItem: (itemId: string) => void;
}) {
  const [subView, setSubView] = useState<"album" | "emoticon" | "photo">("album");
  const { photos, loading: photosLoading, uploading, error: photoError, addUpload, removePhoto } = usePhotoAlbum(user.id);
  const albumOwnerId = user.id;
  const isPhotoOwner = albumOwnerId === user.id;
  const photoIds = useMemo(() => photos.map((p) => p.id), [photos]);
  const {
    views,
    likeCounts,
    likedByMe,
    comments,
    reactions,
    addView,
    toggleLike,
    addComment,
    removeComment,
  } = usePhotoSocial(user.id, photoIds);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [photoDecorations, setPhotoDecorations] = useState<PhotoDecorationMap>({});
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [photoEditTool, setPhotoEditTool] = useState<PhotoEditTool>(null);
  const [showReactionFriends, setShowReactionFriends] = useState(false);
  const [showTextPopup, setShowTextPopup] = useState(false);
  const [textDraft, setTextDraft] = useState("");
  const [textDraftColor, setTextDraftColor] = useState(PHOTO_TEXT_COLORS[0]);
  const [confirmDeletePhoto, setConfirmDeletePhoto] = useState<StoredPhoto | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const selectedPhotoSurfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsEditingPhoto(false);
    setPhotoEditTool(null);
    setShowReactionFriends(false);
    setShowTextPopup(false);
  }, [selectedIndex]);

  if (subView === "emoticon") {
    return (
      <EmoticonRoomPage
        avatar={avatar}
        userId={user.id}
        inventoryRevision={inventoryRevision}
        onDeleteItem={onDeleteItem}
        onBack={() => setSubView("album")}
      />
    );
  }
  if (subView === "photo") {
    return <PhotoBoothPage onBack={() => setSubView("album")} avatar={avatar} userId={user.id} />;
  }

  const selectedPhoto = selectedIndex === null ? null : photos[selectedIndex];
  const selectedPhotoId = selectedPhoto?.id ?? null;
  const selectedReactions = selectedPhotoId ? reactions[selectedPhotoId] ?? [] : [];
  const selectedDecorations = selectedPhoto ? photoDecorations[selectedPhoto.src] ?? [] : [];

  const handleAddComment = async (photoId: string, content: string) => {
    const result = await addComment(photoId, user.nickname, content);
    if (!result.ok) return { ok: false as const, error: result.error };
    return { ok: true as const };
  };

  const handleAdd = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = (e) => {
      const files = Array.from((e.target as HTMLInputElement).files ?? []);
      void (async () => {
        for (const file of files) {
          await addUpload(file);
        }
      })();
    };
    input.click();
  };

  const openPhoto = (photo: StoredPhoto) => {
    const index = photos.findIndex((p) => p.id === photo.id);
    setSelectedIndex(index >= 0 ? index : null);
    setShowReactionFriends(false);
    void addView(photo.id);
  };

  const updatePhotoDecorationPosition = (src: string, id: string, x: number, y: number) => {
    setPhotoDecorations((prev) => ({
      ...prev,
      [src]: (prev[src] ?? []).map((decoration) =>
        decoration.id === id ? { ...decoration, x, y } : decoration,
      ),
    }));
  };

  const updatePhotoTextSize = (src: string, id: string, size: number) => {
    setPhotoDecorations((prev) => ({
      ...prev,
      [src]: (prev[src] ?? []).map((decoration) =>
        decoration.id === id && decoration.type === "text"
          ? { ...decoration, size }
          : decoration,
      ),
    }));
  };

  const deletePhotoDecoration = (src: string, id: string) => {
    setPhotoDecorations((prev) => ({
      ...prev,
      [src]: (prev[src] ?? []).filter((decoration) => decoration.id !== id),
    }));
  };

  const addEmoticonToSelectedPhoto = (emoticonId: number) => {
    if (!selectedPhoto) return;
    setPhotoDecorations((prev) => ({
      ...prev,
      [selectedPhoto.src]: [
        ...(prev[selectedPhoto.src] ?? []),
        {
          id: "emoticon-" + Date.now() + "-" + Math.random().toString(36).slice(2),
          type: "emoticon",
          emoticonId,
          x: 50,
          y: 50,
        },
      ],
    }));
    setPhotoEditTool(null);
  };

  const openTextPopup = () => {
    setPhotoEditTool(null);
    setShowTextPopup(true);
  };

  const resetTextPopup = () => {
    setShowTextPopup(false);
    setTextDraft("");
    setTextDraftColor(PHOTO_TEXT_COLORS[0]);
  };

  const addTextToSelectedPhoto = () => {
    if (!selectedPhoto) return;
    const trimmed = textDraft.trim();
    if (!trimmed) return;

    setPhotoDecorations((prev) => ({
      ...prev,
      [selectedPhoto.src]: [
        ...(prev[selectedPhoto.src] ?? []),
        {
          id: "text-" + Date.now() + "-" + Math.random().toString(36).slice(2),
          type: "text",
          text: trimmed,
          color: textDraftColor,
          size: DEFAULT_PHOTO_TEXT_SIZE,
          x: 50,
          y: 50,
        },
      ],
    }));
    resetTextPopup();
  };

  const handleConfirmDeletePhoto = async () => {
    if (!confirmDeletePhoto || deletingPhoto) return;
    setDeletingPhoto(true);
    const result = await removePhoto(confirmDeletePhoto);
    setDeletingPhoto(false);
    if (!result.ok) return;

    setPhotoDecorations((prev) => {
      const next = { ...prev };
      delete next[confirmDeletePhoto.src];
      return next;
    });
    setConfirmDeletePhoto(null);
    setSelectedIndex(null);
    setIsEditingPhoto(false);
    setPhotoEditTool(null);
    setShowReactionFriends(false);
    resetTextPopup();
  };

  return (
    <div className="relative h-full flex flex-col gap-2 p-3 overflow-hidden" style={{
      background: DIARY_PAPER_BG,
    }}>
      {/* header */}
      <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: "rgba(255,160,0,0.2)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.45rem", color: "#e08000" }}>★</span>
          <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.7rem", color: "#e08000", letterSpacing: "0.12em" }}>PHOTO ALBUM</span>
        </div>
        <button
          onClick={handleAdd}
          disabled={uploading}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full text-white"
          style={{
            fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 700,
            background: "linear-gradient(90deg, #c9a878, #c49a64)",
            boxShadow: "0 2px 8px rgba(255,140,0,0.35)",
            opacity: uploading ? 0.7 : 1,
          }}
        >
          <span style={{ fontSize: 10 }}>＋</span> {uploading ? "올리는 중..." : "사진 추가하기"}
        </button>
      </div>

      {photoError && (
        <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", color: "#c04040", flexShrink: 0 }}>
          {photoError} (Supabase에서 user-photos.sql 실행이 필요할 수 있어요)
        </p>
      )}

      {/* grid */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {photosLoading && photos.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p style={{ fontFamily: FONT_UI, fontSize: "0.55rem", color: "#c09040" }}>사진첩 불러오는 중...</p>
          </div>
        ) : photos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 opacity-60">
            <span style={{ fontSize: 32 }}>📷</span>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.6rem", color: "#c09040", textAlign: "center" }}>
              사진을 추가해서<br />앨범을 꾸며봐요 🌸
            </p>
          </div>
        ) : (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {photos.map((photo, i) => (
                <motion.button
                  key={photo.id}
                  type="button"
                  onClick={() => openPhoto(photo)}
                  className="relative rounded-lg overflow-hidden aspect-square"
                  style={{ border: "1.5px solid rgba(255,160,0,0.25)", padding: 0 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <AlbumPhoto src={photo.src} />
                  <PhotoDecorationsOverlay
                    decorations={photoDecorations[photo.src] ?? []}
                    emoticonSize={26}
                    textSize="0.36rem"
                  />
                  <span
                    className="absolute right-1 bottom-1 rounded-full px-1.5 py-0.5"
                    style={{
                      fontFamily: FONT_UI,
                      fontSize: "0.38rem",
                      fontWeight: 900,
                      color: "#fff8e8",
                      background: "rgba(42,33,20,0.72)",
                      border: "1px solid rgba(255,255,255,0.26)",
                      boxShadow: "0 1px 5px rgba(0,0,0,0.24)",
                    }}
                  >
                    조회 {views[photo.id] ?? 0}
                  </span>
                </motion.button>
            ))}
            <button
              onClick={handleAdd}
              className="aspect-square rounded-lg flex flex-col items-center justify-center gap-1"
              style={{
                border: "1.5px dashed rgba(255,160,0,0.4)",
                background: "rgba(255,180,0,0.05)",
              }}
            >
              <span style={{ fontSize: 18, color: "#c9a878" }}>＋</span>
              <span style={{ fontFamily: FONT_UI, fontSize: "0.4rem", color: "#e09020" }}>추가</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <motion.button
          type="button"
          onClick={() => setSubView("photo")}
          className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-white"
          style={{
            fontFamily: FONT_UI, fontSize: "0.58rem", fontWeight: 700,
            background: ACCENT_BTN_BG_135,
            boxShadow: ACCENT_BTN_SHADOW,
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <span style={{ fontSize: 15 }}>📸</span> 사진찍기
        </motion.button>
        <motion.button
          type="button"
          onClick={() => setSubView("emoticon")}
          className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-white"
          style={{
            fontFamily: FONT_UI, fontSize: "0.58rem", fontWeight: 700,
            background: "linear-gradient(135deg, #7c3aed, #8b9a72)",
            boxShadow: "0 3px 12px rgba(130,60,255,0.4)",
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <span style={{ fontSize: 15 }}>✨</span> 이모티콘룸
        </motion.button>
      </div>

      <AnimatePresence>
        {selectedPhoto && selectedIndex !== null && (
          <motion.div
            className="absolute inset-0 z-50 flex flex-col p-3"
            style={{ background: "rgba(42,33,20,0.92)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="relative flex items-center justify-between mb-2 flex-shrink-0">
              {isEditingPhoto ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPhotoEditTool((tool) => tool === "emoticon" ? null : "emoticon")}
                    className="px-2.5 py-1 rounded-full"
                    style={{
                      fontFamily: FONT_UI,
                      fontSize: "0.5rem",
                      fontWeight: 800,
                      background: photoEditTool === "emoticon" ? "linear-gradient(90deg,#b08a4a,#8b9a72)" : "rgba(255,255,255,0.12)",
                      color: "#f7efd9",
                      border: "1px solid rgba(247,239,217,0.18)",
                    }}
                  >
                    ✨ 이모티콘
                  </button>
                  <button
                    type="button"
                    onClick={openTextPopup}
                    className="px-2.5 py-1 rounded-full"
                    style={{
                      fontFamily: FONT_UI,
                      fontSize: "0.5rem",
                      fontWeight: 800,
                      background: showTextPopup ? "linear-gradient(90deg,#b08a4a,#8b9a72)" : "rgba(255,255,255,0.12)",
                      color: "#f7efd9",
                      border: "1px solid rgba(247,239,217,0.18)",
                    }}
                  >
                    T 텍스트
                  </button>
                </div>
              ) : (
                <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.36rem", color: "#f7efd9" }}>PHOTO</span>
              )}
              <div className="flex items-center gap-1.5">
                {isEditingPhoto ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingPhoto(false);
                      setPhotoEditTool(null);
                      resetTextPopup();
                    }}
                    className="px-2.5 py-1 rounded-full"
                    style={{
                      fontFamily: FONT_UI,
                      fontSize: "0.5rem",
                      fontWeight: 800,
                      background: ACCENT_BTN_BG,
                      color: "white",
                      boxShadow: ACCENT_BTN_SHADOW,
                    }}
                  >
                    수정완료
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowReactionFriends((value) => !value)}
                      className="px-2.5 py-1 rounded-full"
                      style={{
                        fontFamily: FONT_UI,
                        fontSize: "0.5rem",
                        fontWeight: 800,
                        background: showReactionFriends ? "linear-gradient(90deg,var(--diary-mid),var(--diary-dark))" : "rgba(255,255,255,0.12)",
                        color: showReactionFriends ? "white" : "#f7efd9",
                        border: showReactionFriends ? "none" : "1px solid rgba(247,239,217,0.18)",
                      }}
                    >
                      공감한 친구 {selectedReactions.length}
                    </button>
                    {isPhotoOwner && (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsEditingPhoto(true)}
                          className="px-2.5 py-1 rounded-full"
                          style={{
                            fontFamily: FONT_UI,
                            fontSize: "0.5rem",
                            fontWeight: 800,
                            background: "linear-gradient(90deg,#b08a4a,#8b9a72)",
                            color: "white",
                            boxShadow: "0 2px 8px rgba(176,138,74,0.34)",
                          }}
                        >
                          수정하기
                        </button>
                        <button
                          type="button"
                          onClick={() => selectedPhoto && setConfirmDeletePhoto(selectedPhoto)}
                          disabled={deletingPhoto}
                          className="px-2.5 py-1 rounded-full"
                          style={{
                            fontFamily: FONT_UI,
                            fontSize: "0.5rem",
                            fontWeight: 800,
                            background: ACCENT_BTN_BG,
                            color: "white",
                            boxShadow: ACCENT_BTN_SHADOW,
                            opacity: deletingPhoto ? 0.6 : 1,
                          }}
                        >
                          {deletingPhoto ? "삭제 중..." : "삭제하기"}
                        </button>
                      </>
                    )}
                  </>
                )}
                <button
                  onClick={() => {
                    setSelectedIndex(null);
                    setIsEditingPhoto(false);
                    setPhotoEditTool(null);
                    setShowReactionFriends(false);
                    resetTextPopup();
                  }}
                  className="px-2.5 py-1 rounded-full"
                  style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 700, background: "rgba(255,255,255,0.12)", color: "#f7efd9" }}
                >
                  닫기
                </button>
              </div>
              <AnimatePresence>
                {showReactionFriends && (
                  <motion.div
                    className="absolute right-0 top-[calc(100%+6px)] z-30 rounded-xl p-2"
                    style={{
                      width: 210,
                      maxWidth: "calc(100vw - 32px)",
                      maxHeight: 270,
                      overflowY: "auto",
                      background: "rgba(255,248,232,0.96)",
                      border: "1.5px solid rgba(176,138,74,0.34)",
                      boxShadow: "0 10px 28px rgba(42,33,20,0.32)",
                    }}
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 900, color: "#8a6334" }}>공감한 친구</span>
                      <button
                        type="button"
                        onClick={() => setShowReactionFriends(false)}
                        className="w-5 h-5 rounded-full"
                        style={{ background: "rgba(176,138,74,0.14)", color: "#8a6334", fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 900 }}
                      >
                        ×
                      </button>
                    </div>
                    {selectedReactions.length === 0 ? (
                      <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#8a6334", lineHeight: 1.45, textAlign: "center", padding: "10px 4px" }}>
                        아직 공감한 친구가 없어요
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {selectedReactions.map((reaction) => {
                          const emoticon = SAMPLE_EMOTICONS.find((item) => item.id === reaction.emoticonId) ?? SAMPLE_EMOTICONS[0];
                          return (
                            <div key={reaction.id} className="flex items-center gap-2 rounded-lg px-2 py-1" style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(176,138,74,0.18)" }}>
                              <PixelEmoticonIcon icon={emoticon.icon} color={emoticon.color} size={26} />
                              <span style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 800, color: "#5b4b2d", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {reaction.actorName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div
              ref={selectedPhotoSurfaceRef}
              className="relative flex-1 rounded-xl overflow-hidden"
              style={{
                minHeight: 0,
                border: "1.5px solid rgba(255,255,255,0.22)",
                background: "#fff8e8",
              }}
            >
              <AlbumPhoto src={selectedPhoto.src} />
              <PhotoDecorationsOverlay
                decorations={selectedDecorations}
                editable={isEditingPhoto}
                surfaceRef={selectedPhotoSurfaceRef}
                onMove={(id, x, y) => updatePhotoDecorationPosition(selectedPhoto.src, id, x, y)}
                onResize={(id, size) => updatePhotoTextSize(selectedPhoto.src, id, size)}
                onDelete={(id) => deletePhotoDecoration(selectedPhoto.src, id)}
                emoticonSize={62}
                textSize="0.9rem"
              />
              <AnimatePresence>
                {isEditingPhoto && photoEditTool === "emoticon" && (
                  <motion.div
                    className="absolute top-2 left-2 z-20 rounded-xl p-2"
                    style={{
                      width: 196,
                      maxWidth: "calc(100% - 16px)",
                      background: "rgba(42,33,20,0.86)",
                      border: "1px solid rgba(247,239,217,0.24)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
                      backdropFilter: "blur(8px)",
                    }}
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  >
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                      {SAMPLE_EMOTICONS.map((emoticon) => (
                        <button
                          key={"photo-edit-emoticon-" + emoticon.id}
                          type="button"
                          onClick={() => addEmoticonToSelectedPhoto(emoticon.id)}
                          aria-label={emoticon.label}
                          className="rounded-lg flex items-center justify-center"
                          style={{
                            height: 38,
                            background: "rgba(255,255,255,0.12)",
                            border: "1px solid rgba(247,239,217,0.14)",
                          }}
                        >
                          <PixelEmoticonIcon icon={emoticon.icon} color={emoticon.color} size={28} />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {isEditingPhoto && showTextPopup && (
                  <motion.div
                    className="absolute inset-0 z-30 flex items-center justify-center p-3"
                    style={{ background: "rgba(42,33,20,0.38)", backdropFilter: "blur(3px)" }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.div
                      className="w-full rounded-xl p-3"
                      style={{
                        maxWidth: 320,
                        background: "rgba(255,248,232,0.96)",
                        border: "1.5px solid rgba(176,138,74,0.36)",
                        boxShadow: "0 14px 38px rgba(42,33,20,0.36)",
                      }}
                      initial={{ scale: 0.94, y: 8 }}
                      animate={{ scale: 1, y: 0 }}
                      exit={{ scale: 0.94, y: 8 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span style={{ fontFamily: FONT_UI, fontSize: "0.62rem", fontWeight: 900, color: "#8a6334" }}>텍스트 추가</span>
                        <button
                          type="button"
                          onClick={resetTextPopup}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(176,138,74,0.12)", color: "#8a6334", fontFamily: FONT_UI, fontSize: "0.62rem", fontWeight: 900 }}
                          aria-label="텍스트 팝업 닫기"
                        >
                          ×
                        </button>
                      </div>

                      <textarea
                        value={textDraft}
                        onChange={(event) => setTextDraft(event.target.value)}
                        autoFocus
                        rows={3}
                        placeholder="사진에 넣을 문구"
                        className="w-full resize-none rounded-lg px-2 py-2 outline-none"
                        style={{
                          background: "rgba(255,255,255,0.82)",
                          border: "1px solid rgba(176,138,74,0.28)",
                          color: "#5b4b2d",
                          fontFamily: FONT_UI,
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          lineHeight: 1.45,
                        }}
                      />

                      <div className="mt-2">
                        <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 900, color: "#8a6334", marginBottom: 5 }}>색상</p>
                        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(8, 1fr)" }}>
                          {PHOTO_TEXT_COLORS.map((color) => (
                            <button
                              key={"photo-text-color-" + color}
                              type="button"
                              onClick={() => setTextDraftColor(color)}
                              aria-label="텍스트 색상 선택"
                              className="rounded-md"
                              style={{
                                height: 26,
                                background: color,
                                border: textDraftColor === color ? "2px solid #ff4757" : "1px solid rgba(176,138,74,0.28)",
                                boxShadow: color === "#ffffff" ? "inset 0 0 0 1px rgba(80,60,40,0.18)" : "none",
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="mt-2 rounded-lg px-2 py-2 text-center" style={{ background: "rgba(176,138,74,0.1)", border: "1px dashed rgba(176,138,74,0.3)" }}>
                        <span
                          style={{
                            color: textDraftColor,
                            fontFamily: FONT_UI,
                            fontSize: "0.98rem",
                            fontWeight: 900,
                            lineHeight: 1.25,
                            textShadow: textDraftColor === "#ffffff" ? "0 1px 3px rgba(0,0,0,0.65)" : "0 1px 0 rgba(255,255,255,0.6)",
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                          }}
                        >
                          {textDraft.trim() || "미리보기"}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-1.5">
                        <button
                          type="button"
                          onClick={resetTextPopup}
                          className="flex-1 rounded-lg py-2"
                          style={{ background: "rgba(176,138,74,0.12)", color: "#8a6334", fontFamily: FONT_UI, fontSize: "0.54rem", fontWeight: 900 }}
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          onClick={addTextToSelectedPhoto}
                          disabled={!textDraft.trim()}
                          className="flex-1 rounded-lg py-2"
                          style={{
                            background: textDraft.trim() ? ACCENT_BTN_BG : "rgba(120,100,80,0.22)",
                            color: "white",
                            fontFamily: FONT_UI,
                            fontSize: "0.54rem",
                            fontWeight: 900,
                            boxShadow: textDraft.trim() ? ACCENT_BTN_SHADOW : "none",
                            opacity: textDraft.trim() ? 1 : 0.58,
                          }}
                        >
                          추가
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {!isEditingPhoto && selectedPhotoId && (
              <PhotoSocialToolbar
                photoId={selectedPhotoId}
                user={user}
                viewCount={views[selectedPhotoId] ?? 0}
                likeCount={likeCounts[selectedPhotoId] ?? 0}
                likedByMe={likedByMe[selectedPhotoId] ?? false}
                comments={comments[selectedPhotoId] ?? []}
                onToggleLike={toggleLike}
                onAddComment={handleAddComment}
                onDeleteComment={removeComment}
                accentColor="#ff6080"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AlertDialog open={!!confirmDeletePhoto} onOpenChange={(open) => !open && !deletingPhoto && setConfirmDeletePhoto(null)}>
        <AlertDialogContent
          className="max-w-[calc(100%-2rem)] sm:max-w-sm"
          style={{
            background: "linear-gradient(180deg, #fffaf4, #fff2e6)",
            border: "1px solid rgba(255,160,80,0.18)",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: FONT_UI, fontSize: "0.78rem", fontWeight: 900, color: "#8a4b1f" }}>
              사진을 삭제할까요?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#b06a3f", lineHeight: 1.55 }}>
              삭제한 사진은 복구할 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full px-4 py-2"
              style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 900 }}
              disabled={deletingPhoto}
            >
              아니오
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDeletePhoto()}
              className="rounded-full px-4 py-2"
              disabled={deletingPhoto}
              style={{
                fontFamily: FONT_UI,
                fontSize: "0.5rem",
                fontWeight: 900,
                background: ACCENT_BTN_BG,
                color: "white",
                opacity: deletingPhoto ? 0.6 : 1,
              }}
            >
              {deletingPhoto ? "삭제 중..." : "네"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AvatarPixelCanvas({
  config,
  tool,
  selectedColor,
  onPaint,
  onErase,
  onSample,
}: {
  config: AvatarConfig;
  tool: "paint" | "erase" | "eyedropper";
  selectedColor: string;
  onPaint: (x: number, y: number, color: string) => void;
  onErase: (x: number, y: number) => void;
  onSample: (color: string) => void;
}) {
  const drawingRef = useRef(false);
  const lastCellRef = useRef<string | null>(null);

  const cells = Array.from({ length: PIXEL_ROWS }, () =>
    Array.from({ length: PIXEL_COLS }, () => ({ fill: "transparent", part: "fixed" as AvatarRect["part"] }))
  );

  getAvatarRects(config).forEach(rect => {
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        if (cells[y]?.[x]) cells[y][x] = { fill: rect.fill, part: rect.part };
      }
    }
  });

  Object.entries(config.pixels ?? {}).forEach(([key, fill]) => {
    const [x, y] = key.split("-").map(Number);
    if (Number.isInteger(x) && Number.isInteger(y) && cells[y]?.[x]) {
      cells[y][x] = { fill, part: cells[y][x].part === "body" ? "body" : "fixed" };
    }
  });

  const applyCell = (x: number, y: number, fill: string) => {
    const cellKey = x + "-" + y;
    if (lastCellRef.current === cellKey && tool !== "eyedropper") return;
    lastCellRef.current = cellKey;

    if (tool === "eyedropper") {
      const hex = cssColorToHex(fill);
      if (hex) onSample(hex);
      return;
    }
    if (tool === "erase") {
      onErase(x, y);
      return;
    }
    onPaint(x, y, selectedColor);
  };

  useEffect(() => {
    const stopDrawing = () => {
      drawingRef.current = false;
      lastCellRef.current = null;
    };
    window.addEventListener("pointerup", stopDrawing);
    window.addEventListener("pointercancel", stopDrawing);
    return () => {
      window.removeEventListener("pointerup", stopDrawing);
      window.removeEventListener("pointercancel", stopDrawing);
    };
  }, []);

  const cursor =
    tool === "erase" ? "cell" : tool === "eyedropper" ? "crosshair" : "crosshair";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(" + PIXEL_COLS + ", 1fr)",
        width: "min(260px, 100%)",
        aspectRatio: PIXEL_COLS + " / " + PIXEL_ROWS,
        border: "1px solid rgba(216,196,155,0.45)",
        background: "#f7efd9",
        boxShadow: "0 3px 14px rgba(0,0,0,0.18)",
        touchAction: "none",
        userSelect: "none",
      }}
      onPointerLeave={() => {
        if (tool === "eyedropper") return;
        lastCellRef.current = null;
      }}
    >
      {cells.map((row, r) => row.map((cell, c) => {
        return (
          <div
            key={r + "-" + c}
            role="button"
            tabIndex={0}
            onPointerDown={(e) => {
              e.preventDefault();
              drawingRef.current = tool !== "eyedropper";
              lastCellRef.current = null;
              applyCell(c, r, cell.fill);
              if (tool === "eyedropper") drawingRef.current = false;
            }}
            onPointerEnter={() => {
              if (!drawingRef.current || tool === "eyedropper") return;
              applyCell(c, r, cell.fill);
            }}
            style={{
              aspectRatio: "1",
              background: cell.fill === "transparent" ? ((r + c) % 2 === 0 ? "#fff4dc" : "#f2e5c8") : cell.fill,
              border: "0.5px solid rgba(110,90,50,0.12)",
              cursor,
              padding: 0,
            }}
            aria-label={
              tool === "erase"
                ? "추가 픽셀 지우기"
                : tool === "eyedropper"
                  ? "색 추출"
                  : "픽셀 칠하기"
            }
          />
        );
      }))}
    </div>
  );
}

function PixelItemIcon({ id, color, size = 30 }: { id: string; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ imageRendering: "pixelated" }}>
      {id === "hair-basic" && (
        <>
          <rect x="5" y="3" width="10" height="2" fill="#5a3a28" />
          <rect x="4" y="5" width="12" height="4" fill={color} />
          <rect x="3" y="8" width="3" height="6" fill={color} />
          <rect x="14" y="8" width="3" height="6" fill={color} />
          <rect x="6" y="6" width="8" height="2" fill="#7a5a42" />
        </>
      )}
      {id === "hair-bob" && (
        <>
          <rect x="5" y="3" width="10" height="2" fill="#6a3a20" />
          <rect x="4" y="5" width="12" height="4" fill={color} />
          <rect x="3" y="8" width="3" height="7" fill={color} />
          <rect x="14" y="8" width="3" height="7" fill={color} />
          <rect x="7" y="6" width="7" height="2" fill="#8b5a36" />
        </>
      )}
      {id === "hair-twintail" && (
        <>
          <rect x="5" y="3" width="10" height="2" fill="#3b2a24" />
          <rect x="4" y="5" width="12" height="4" fill={color} />
          <rect x="1" y="8" width="4" height="8" fill={color} />
          <rect x="15" y="8" width="4" height="8" fill={color} />
          <rect x="2" y="12" width="2" height="5" fill="#3b2a24" />
          <rect x="16" y="12" width="2" height="5" fill="#3b2a24" />
          <rect x="2" y="8" width="3" height="2" fill="#d86f86" />
          <rect x="15" y="8" width="3" height="2" fill="#d86f86" />
        </>
      )}
      {id === "hair-wave" && (
        <>
          <rect x="4" y="2" width="12" height="3" fill="#2f2a35" />
          <rect x="3" y="5" width="14" height="5" fill={color} />
          <rect x="2" y="9" width="4" height="8" fill={color} />
          <rect x="14" y="9" width="4" height="8" fill={color} />
          <rect x="6" y="6" width="4" height="2" fill="#554c61" />
          <rect x="11" y="5" width="4" height="2" fill="#554c61" />
        </>
      )}
      {id === "face-glasses" && (
        <>
          <rect x="3" y="8" width="5" height="1" fill={color} />
          <rect x="3" y="9" width="1" height="3" fill={color} />
          <rect x="7" y="9" width="1" height="3" fill={color} />
          <rect x="12" y="8" width="5" height="1" fill={color} />
          <rect x="12" y="9" width="1" height="3" fill={color} />
          <rect x="16" y="9" width="1" height="3" fill={color} />
          <rect x="8" y="10" width="4" height="1" fill={color} />
        </>
      )}
      {id === "face-blush" && (
        <>
          <rect x="3" y="10" width="4" height="2" fill={color} opacity="0.85" />
          <rect x="13" y="10" width="4" height="2" fill={color} opacity="0.85" />
        </>
      )}
      {id === "face-freckle" && (
        <>
          <rect x="5" y="8" width="1" height="1" fill={color} />
          <rect x="7" y="10" width="1" height="1" fill={color} />
          <rect x="13" y="8" width="1" height="1" fill={color} />
          <rect x="15" y="10" width="1" height="1" fill={color} />
        </>
      )}
      {id === "face-mask" && (
        <>
          <rect x="5" y="8" width="10" height="5" fill={color} />
          <rect x="4" y="9" width="1" height="2" fill="#d8c49b" />
          <rect x="15" y="9" width="1" height="2" fill="#d8c49b" />
          <rect x="7" y="10" width="6" height="1" fill="#e4d4a8" />
        </>
      )}
      {id === "outfit-whitetee" && (
        <>
          <rect x="5" y="6" width="10" height="8" fill={color} />
          <rect x="3" y="7" width="3" height="4" fill={color} />
          <rect x="14" y="7" width="3" height="4" fill={color} />
          <rect x="7" y="6" width="6" height="1" fill="#ffffff" />
        </>
      )}
      {id === "outfit-cardigan" && (
        <>
          <rect x="5" y="5" width="4" height="10" fill={color} />
          <rect x="11" y="5" width="4" height="10" fill={color} />
          <rect x="9" y="6" width="2" height="9" fill="#9a7b44" />
        </>
      )}
      {id === "outfit-sage" && (
        <>
          <rect x="5" y="6" width="10" height="8" fill={color} />
          <rect x="4" y="7" width="2" height="4" fill={color} />
          <rect x="14" y="7" width="2" height="4" fill={color} />
          <rect x="7" y="6" width="6" height="1" fill="#d8e0c8" />
        </>
      )}
      {id === "outfit-ribbon" && (
        <>
          <rect x="9" y="8" width="2" height="2" fill={color} />
          <rect x="5" y="7" width="4" height="4" fill={color} />
          <rect x="11" y="7" width="4" height="4" fill={color} />
        </>
      )}
      {id === "outfit-pinktee" && (
        <>
          <rect x="5" y="6" width="10" height="8" fill={color} />
          <rect x="3" y="7" width="3" height="4" fill={color} />
          <rect x="14" y="7" width="3" height="4" fill={color} />
          <rect x="7" y="6" width="6" height="1" fill="#ffd6e3" />
        </>
      )}
      {id === "outfit-denim" && (
        <>
          <rect x="6" y="8" width="8" height="8" fill={color} />
          <rect x="7" y="5" width="2" height="5" fill={color} />
          <rect x="11" y="5" width="2" height="5" fill={color} />
          <rect x="9" y="12" width="2" height="4" fill="#4d6f9c" />
        </>
      )}
      {id === "pants-whiteshorts" && (
        <>
          <rect x="5" y="5" width="10" height="2" fill={color} />
          <rect x="5" y="7" width="4" height="7" fill={color} />
          <rect x="11" y="7" width="4" height="7" fill={color} />
          <rect x="9" y="6" width="2" height="3" fill="#d8d8d8" />
        </>
      )}
      {id === "pants-denim" && (
        <>
          <rect x="5" y="4" width="10" height="2" fill={color} />
          <rect x="5" y="6" width="4" height="12" fill={color} />
          <rect x="11" y="6" width="4" height="12" fill={color} />
          <rect x="9" y="5" width="2" height="3" fill="#3f5f82" />
        </>
      )}
      {id === "pants-black" && (
        <>
          <rect x="5" y="4" width="10" height="2" fill={color} />
          <rect x="5" y="6" width="4" height="12" fill={color} />
          <rect x="11" y="6" width="4" height="12" fill={color} />
          <rect x="9" y="5" width="2" height="3" fill="#2a2a30" />
        </>
      )}
      {id === "pants-beige" && (
        <>
          <rect x="5" y="4" width="10" height="2" fill={color} />
          <rect x="5" y="6" width="4" height="12" fill={color} />
          <rect x="11" y="6" width="4" height="12" fill={color} />
          <rect x="9" y="5" width="2" height="3" fill="#b09a72" />
        </>
      )}
      {id === "pants-shorts" && (
        <>
          <rect x="5" y="5" width="10" height="2" fill={color} />
          <rect x="5" y="7" width="4" height="7" fill={color} />
          <rect x="11" y="7" width="4" height="7" fill={color} />
          <rect x="9" y="6" width="2" height="3" fill="#5a7a9e" />
        </>
      )}
      {id === "skirt-pleat" && (
        <>
          <rect x="5" y="5" width="10" height="2" fill={color} />
          <rect x="4" y="7" width="12" height="9" fill={color} />
          <rect x="6" y="7" width="1" height="9" fill="#3a4a68" />
          <rect x="9" y="7" width="1" height="9" fill="#3a4a68" />
          <rect x="12" y="7" width="1" height="9" fill="#3a4a68" />
        </>
      )}
      {id === "skirt-pink" && (
        <>
          <rect x="5" y="6" width="10" height="2" fill={color} />
          <rect x="4" y="8" width="12" height="7" fill={color} />
          <rect x="3" y="14" width="14" height="1" fill="#d88aa8" />
        </>
      )}
      {id === "skirt-check" && (
        <>
          <rect x="5" y="5" width="10" height="2" fill={color} />
          <rect x="4" y="7" width="12" height="8" fill={color} />
          <rect x="6" y="8" width="2" height="2" fill="#c9a878" />
          <rect x="10" y="8" width="2" height="2" fill="#c9a878" />
          <rect x="8" y="11" width="2" height="2" fill="#c9a878" />
          <rect x="12" y="11" width="2" height="2" fill="#c9a878" />
        </>
      )}
      {id === "skirt-long" && (
        <>
          <rect x="5" y="4" width="10" height="2" fill={color} />
          <rect x="4" y="6" width="12" height="12" fill={color} />
          <rect x="3" y="16" width="14" height="2" fill="#5a6948" />
        </>
      )}
      {id === "emote-heart" && (
        <>
          <rect x="5" y="6" width="3" height="3" fill={color} />
          <rect x="12" y="6" width="3" height="3" fill={color} />
          <rect x="4" y="9" width="12" height="3" fill={color} />
          <rect x="6" y="12" width="8" height="2" fill={color} />
          <rect x="8" y="14" width="4" height="2" fill={color} />
        </>
      )}
      {id === "emote-sparkle" && <path d="M10 3 L12 8 L17 10 L12 12 L10 17 L8 12 L3 10 L8 8Z" fill={color} />}
      {id === "emote-note" && (
        <>
          <rect x="10" y="4" width="2" height="9" fill={color} />
          <rect x="12" y="4" width="5" height="2" fill={color} />
          <rect x="6" y="12" width="4" height="4" fill={color} />
        </>
      )}
      {id === "other-sneakers" && (
        <>
          <rect x="4" y="9" width="5" height="4" fill={color} />
          <rect x="2" y="11" width="2" height="2" fill={color} />
          <rect x="5" y="13" width="4" height="1" fill="#9aa3ad" />
          <rect x="11" y="9" width="5" height="4" fill={color} />
          <rect x="16" y="11" width="2" height="2" fill={color} />
          <rect x="11" y="13" width="4" height="1" fill="#9aa3ad" />
        </>
      )}
      {id === "other-ribbon" && (
        <>
          <rect x="9" y="7" width="2" height="2" fill="#c45a72" />
          <rect x="5" y="5" width="4" height="4" fill={color} />
          <rect x="11" y="5" width="4" height="4" fill={color} />
          <rect x="7" y="9" width="2" height="4" fill={color} />
          <rect x="11" y="9" width="2" height="4" fill={color} />
        </>
      )}
      {id === "other-flower" && (
        <>
          <rect x="9" y="5" width="2" height="2" fill={color} />
          <rect x="6" y="8" width="2" height="2" fill={color} />
          <rect x="12" y="8" width="2" height="2" fill={color} />
          <rect x="9" y="11" width="2" height="2" fill={color} />
          <rect x="9" y="8" width="2" height="2" fill="#b08a4a" />
        </>
      )}
      {id === "other-bag" && (
        <>
          <rect x="6" y="8" width="8" height="8" fill={color} />
          <rect x="8" y="6" width="4" height="2" fill="#8a6334" />
          <rect x="7" y="11" width="6" height="1" fill="#ead3a1" />
        </>
      )}
      {id === "other-headband" && (
        <>
          <rect x="4" y="8" width="12" height="2" fill={color} />
          <rect x="3" y="10" width="2" height="2" fill={color} />
          <rect x="15" y="10" width="2" height="2" fill={color} />
        </>
      )}
      {id === "other-scarf" && (
        <>
          <rect x="5" y="7" width="10" height="3" fill={color} />
          <rect x="12" y="10" width="3" height="6" fill={color} />
          <rect x="13" y="15" width="2" height="2" fill="#6d7653" />
        </>
      )}
    </svg>
  );
}

function PixelEmoticonIcon({
  icon,
  color,
  size = 30,
  glow = false,
}: {
  icon: string;
  color: string;
  size?: number;
  glow?: boolean;
}) {
  const dark = "#5b4b2d";
  const cream = "#fff8e8";
  const face = "#f7d8a8";
  const faceShade = "#e9b98e";
  const pink = "#e58aa8";
  const blue = "#80c8ff";

  const drawFace = (fill = face) => (
    <>
      <rect x="7" y="3" width="10" height="1" fill={dark} />
      <rect x="5" y="4" width="14" height="2" fill={dark} />
      <rect x="4" y="6" width="16" height="12" fill={dark} />
      <rect x="5" y="18" width="14" height="2" fill={dark} />
      <rect x="7" y="20" width="10" height="1" fill={dark} />
      <rect x="7" y="4" width="10" height="1" fill={fill} />
      <rect x="6" y="6" width="12" height="2" fill={fill} />
      <rect x="5" y="8" width="14" height="9" fill={fill} />
      <rect x="6" y="17" width="12" height="1" fill={fill} />
      <rect x="8" y="18" width="8" height="1" fill={fill} />
      <rect x="7" y="7" width="2" height="1" fill={cream} opacity="0.8" />
      <rect x="17" y="13" width="1" height="3" fill={faceShade} opacity="0.65" />
    </>
  );

  let pixels: ReactNode;

  switch (icon) {
    case "cool-face":
      pixels = (
        <>
          {drawFace()}
          <rect x="6" y="9" width="5" height="2" fill={dark} />
          <rect x="13" y="9" width="5" height="2" fill={dark} />
          <rect x="11" y="10" width="2" height="1" fill={dark} />
          <rect x="7" y="9" width="1" height="1" fill={cream} opacity="0.75" />
          <rect x="14" y="9" width="1" height="1" fill={cream} opacity="0.75" />
          <rect x="9" y="15" width="6" height="1" fill={dark} />
          <rect x="15" y="14" width="1" height="1" fill={dark} />
        </>
      );
      break;
    case "teary-face":
      pixels = (
        <>
          {drawFace()}
          <rect x="7" y="8" width="3" height="3" fill={dark} />
          <rect x="14" y="8" width="3" height="3" fill={dark} />
          <rect x="8" y="8" width="1" height="1" fill={cream} />
          <rect x="15" y="8" width="1" height="1" fill={cream} />
          <rect x="6" y="12" width="2" height="3" fill={blue} />
          <rect x="17" y="12" width="2" height="3" fill={blue} />
          <rect x="10" y="15" width="4" height="1" fill={dark} />
          <rect x="9" y="16" width="1" height="1" fill={dark} />
          <rect x="14" y="16" width="1" height="1" fill={dark} />
        </>
      );
      break;
    case "sparkle-face":
      pixels = (
        <>
          {drawFace()}
          <rect x="7" y="7" width="1" height="1" fill={color} />
          <rect x="6" y="8" width="3" height="1" fill={color} />
          <rect x="7" y="9" width="1" height="1" fill={color} />
          <rect x="15" y="7" width="1" height="1" fill={color} />
          <rect x="14" y="8" width="3" height="1" fill={color} />
          <rect x="15" y="9" width="1" height="1" fill={color} />
          <rect x="9" y="14" width="6" height="1" fill={dark} />
          <rect x="10" y="15" width="4" height="1" fill={pink} />
          <rect x="18" y="5" width="1" height="1" fill={color} />
          <rect x="17" y="6" width="3" height="1" fill={color} />
          <rect x="18" y="7" width="1" height="1" fill={color} />
        </>
      );
      break;
    case "angry-face":
      pixels = (
        <>
          {drawFace("#f0b39a")}
          <rect x="6" y="7" width="4" height="1" fill={dark} />
          <rect x="7" y="8" width="2" height="1" fill={dark} />
          <rect x="14" y="7" width="4" height="1" fill={dark} />
          <rect x="15" y="8" width="2" height="1" fill={dark} />
          <rect x="8" y="10" width="2" height="2" fill={dark} />
          <rect x="14" y="10" width="2" height="2" fill={dark} />
          <rect x="9" y="15" width="6" height="1" fill="#7f1d1d" />
          <rect x="5" y="13" width="2" height="1" fill="#d86f86" opacity="0.8" />
          <rect x="17" y="13" width="2" height="1" fill="#d86f86" opacity="0.8" />
        </>
      );
      break;
    case "ribbon-hat":
      pixels = (
        <>
          <rect x="6" y="8" width="12" height="7" fill={dark} />
          <rect x="7" y="5" width="10" height="4" fill={dark} />
          <rect x="8" y="6" width="8" height="3" fill={color} />
          <rect x="7" y="9" width="10" height="4" fill={color} />
          <rect x="4" y="14" width="16" height="2" fill={dark} />
          <rect x="5" y="13" width="14" height="1" fill={color} />
          <rect x="11" y="10" width="2" height="2" fill="#b08a4a" />
          <rect x="8" y="10" width="3" height="3" fill="#d86f86" />
          <rect x="13" y="10" width="3" height="3" fill="#d86f86" />
          <rect x="9" y="6" width="2" height="1" fill={cream} opacity="0.65" />
        </>
      );
      break;
    case "crown-hat":
      pixels = (
        <>
          <rect x="5" y="14" width="14" height="4" fill={dark} />
          <rect x="6" y="11" width="2" height="3" fill={dark} />
          <rect x="11" y="8" width="2" height="6" fill={dark} />
          <rect x="16" y="11" width="2" height="3" fill={dark} />
          <rect x="6" y="14" width="12" height="3" fill={color} />
          <rect x="7" y="11" width="1" height="3" fill={color} />
          <rect x="12" y="9" width="1" height="5" fill={color} />
          <rect x="17" y="11" width="1" height="3" fill={color} />
          <rect x="8" y="15" width="2" height="1" fill="#fff8e8" />
          <rect x="11" y="15" width="2" height="1" fill="#d86f86" />
          <rect x="14" y="15" width="2" height="1" fill="#80c8ff" />
        </>
      );
      break;
    case "cardigan":
      pixels = (
        <>
          <rect x="6" y="5" width="12" height="15" fill={dark} />
          <rect x="7" y="6" width="10" height="13" fill={color} />
          <rect x="10" y="6" width="4" height="13" fill={cream} />
          <rect x="11" y="6" width="2" height="3" fill="#f7d8a8" />
          <rect x="7" y="9" width="3" height="10" fill="#ead8b5" />
          <rect x="14" y="9" width="3" height="10" fill="#ead8b5" />
          <rect x="12" y="10" width="1" height="8" fill="#b08a4a" opacity="0.7" />
          <rect x="8" y="13" width="1" height="1" fill="#b08a4a" />
          <rect x="15" y="13" width="1" height="1" fill="#b08a4a" />
        </>
      );
      break;
    case "sailor-outfit":
      pixels = (
        <>
          <rect x="5" y="6" width="14" height="14" fill={dark} />
          <rect x="6" y="7" width="12" height="12" fill={cream} />
          <rect x="6" y="7" width="12" height="4" fill={color} />
          <rect x="8" y="11" width="3" height="5" fill={color} />
          <rect x="13" y="11" width="3" height="5" fill={color} />
          <rect x="11" y="11" width="2" height="7" fill="#d86f86" />
          <rect x="8" y="8" width="8" height="1" fill={cream} />
          <rect x="9" y="19" width="6" height="1" fill={color} />
        </>
      );
      break;
    case "pixel-glasses":
      pixels = (
        <>
          <rect x="4" y="9" width="7" height="1" fill={dark} />
          <rect x="4" y="10" width="1" height="4" fill={dark} />
          <rect x="10" y="10" width="1" height="4" fill={dark} />
          <rect x="5" y="13" width="5" height="1" fill={dark} />
          <rect x="13" y="9" width="7" height="1" fill={dark} />
          <rect x="13" y="10" width="1" height="4" fill={dark} />
          <rect x="19" y="10" width="1" height="4" fill={dark} />
          <rect x="14" y="13" width="5" height="1" fill={dark} />
          <rect x="11" y="11" width="2" height="1" fill={dark} />
          <rect x="6" y="10" width="2" height="1" fill={cream} opacity="0.8" />
          <rect x="15" y="10" width="2" height="1" fill={cream} opacity="0.8" />
        </>
      );
      break;
    case "mini-bag":
      pixels = (
        <>
          <rect x="6" y="9" width="12" height="11" fill={dark} />
          <rect x="7" y="10" width="10" height="9" fill={color} />
          <rect x="9" y="6" width="6" height="2" fill={dark} />
          <rect x="8" y="7" width="2" height="3" fill={dark} />
          <rect x="14" y="7" width="2" height="3" fill={dark} />
          <rect x="10" y="7" width="4" height="1" fill={cream} opacity="0.5" />
          <rect x="8" y="13" width="8" height="1" fill="#8a6334" opacity="0.45" />
          <rect x="11" y="15" width="2" height="2" fill="#b08a4a" />
        </>
      );
      break;
    case "love-heart":
      pixels = (
        <>
          <rect x="7" y="5" width="4" height="2" fill={color} />
          <rect x="13" y="5" width="4" height="2" fill={color} />
          <rect x="5" y="7" width="14" height="5" fill={color} />
          <rect x="6" y="12" width="12" height="2" fill={color} />
          <rect x="8" y="14" width="8" height="2" fill={color} />
          <rect x="10" y="16" width="4" height="2" fill={color} />
          <rect x="11" y="18" width="2" height="1" fill={color} />
          <rect x="7" y="7" width="2" height="1" fill={cream} opacity="0.75" />
          <rect x="17" y="4" width="1" height="1" fill="#d4b45f" />
          <rect x="16" y="5" width="3" height="1" fill="#d4b45f" />
          <rect x="17" y="6" width="1" height="1" fill="#d4b45f" />
        </>
      );
      break;
    case "double-heart":
      pixels = (
        <>
          <rect x="6" y="8" width="3" height="2" fill={color} />
          <rect x="11" y="8" width="3" height="2" fill={color} />
          <rect x="5" y="10" width="10" height="4" fill={color} />
          <rect x="6" y="14" width="8" height="2" fill={color} />
          <rect x="8" y="16" width="4" height="2" fill={color} />
          <rect x="9" y="18" width="2" height="1" fill={color} />
          <rect x="15" y="4" width="2" height="1" fill="#d86f86" />
          <rect x="19" y="4" width="2" height="1" fill="#d86f86" />
          <rect x="14" y="5" width="8" height="3" fill="#d86f86" />
          <rect x="15" y="8" width="6" height="1" fill="#d86f86" />
          <rect x="17" y="9" width="2" height="1" fill="#d86f86" />
          <rect x="7" y="10" width="1" height="1" fill={cream} opacity="0.8" />
          <rect x="16" y="5" width="1" height="1" fill={cream} opacity="0.8" />
        </>
      );
      break;
    default:
      pixels = (
        <>
          {drawFace()}
          <rect x="8" y="9" width="2" height="2" fill={dark} />
          <rect x="14" y="9" width="2" height="2" fill={dark} />
          <rect x="9" y="15" width="6" height="1" fill={dark} />
        </>
      );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{
        imageRendering: "pixelated",
        filter: glow ? "drop-shadow(0 2px 8px rgba(216,196,155,0.65))" : undefined,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {pixels}
    </svg>
  );
}

function PixelEditor({
  initialConfig,
  onSave,
  onClose,
}: {
  initialConfig: AvatarConfig;
  onSave: (config: AvatarConfig) => void;
  onClose: () => void;
}) {
  const [config, setConfig] = useState<AvatarConfig>({
    ...initialConfig,
    body: initialConfig.body ?? "#ffffff",
    pixels: { ...(initialConfig.pixels ?? {}) },
  });
  const [selectedColor, setSelectedColor] = useState("#ffffff");
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const [tool, setTool] = useState<"paint" | "erase" | "eyedropper">("paint");

  const selectColor = (color: string) => {
    const hex = cssColorToHex(color) ?? color.trim().toLowerCase();
    setSelectedColor(hex);
    setRecentColors(prev => [hex, ...prev.filter(c => c !== hex)].slice(0, 8));
  };

  const paintPixel = (x: number, y: number, color: string) => {
    const hex = cssColorToHex(color) ?? color;
    setConfig(prev => ({
      ...prev,
      pixels: {
        ...(prev.pixels ?? {}),
        [getPixelKey(x, y)]: hex,
      },
    }));
  };

  const erasePixel = (x: number, y: number) => {
    setConfig(prev => {
      const pixels = { ...(prev.pixels ?? {}) };
      delete pixels[getPixelKey(x, y)];
      return { ...prev, pixels };
    });
  };

  const sampleColor = (color: string) => {
    selectColor(color);
    setTool("paint");
  };

  const clearAllPixels = () => {
    setConfig(prev => ({ ...prev, pixels: {} }));
  };

  const toolBtnStyle = (active: boolean): CSSProperties => ({
    fontFamily: FONT_UI,
    fontSize: "0.42rem",
    fontWeight: 700,
    padding: "4px 8px",
    borderRadius: 999,
    background: active ? "linear-gradient(90deg, #b08a4a, #8b9a72)" : "rgba(255,255,255,0.1)",
    color: active ? "#fff" : "#f7efd9",
    border: active ? "1px solid rgba(255,255,255,0.35)" : "1px solid rgba(255,255,255,0.12)",
  });

  return (
    <motion.div className="absolute inset-0 z-50 flex flex-col p-2"
      style={{ background: "linear-gradient(160deg, #2a2114 0%, #171309 100%)" }}
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
      <div className="flex items-center justify-between mb-2 flex-shrink-0 gap-2">
        <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.36rem", color: "#d8c49b" }}>AVATAR MAKER</span>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <button type="button" onClick={() => setTool("paint")} style={toolBtnStyle(tool === "paint")}>펜</button>
          <button type="button" onClick={() => setTool("erase")} style={toolBtnStyle(tool === "erase")}>지우개</button>
          <button type="button" onClick={() => setTool("eyedropper")} style={toolBtnStyle(tool === "eyedropper")}>스포이드</button>
          <button
            type="button"
            onClick={clearAllPixels}
            style={{
              fontFamily: FONT_UI,
              fontSize: "0.42rem",
              fontWeight: 700,
              padding: "4px 8px",
              borderRadius: 999,
              background: "rgba(180,70,70,0.28)",
              color: "#ffd0d0",
              border: "1px solid rgba(255,140,140,0.35)",
            }}
          >
            전체 지우기
          </button>
          <button onClick={onClose} className="px-2 py-0.5 rounded-full"
            style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 600, background: "rgba(255,255,255,0.1)", color: "rgba(248,234,198,0.8)" }}>
            닫기
          </button>
          <button onClick={() => { onSave(config); onClose(); }} className="px-2 py-0.5 rounded-full"
            style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 700, background: "linear-gradient(90deg, #b08a4a, #8b9a72)", color: "white" }}>
            저장
          </button>
        </div>
      </div>

      <div className="relative flex gap-2 flex-1" style={{ minHeight: 0 }}>
        <div className="flex-1 flex items-center justify-center" style={{ minWidth: 0 }}>
          <AvatarPixelCanvas
            config={config}
            tool={tool}
            selectedColor={selectedColor}
            onPaint={paintPixel}
            onErase={erasePixel}
            onSample={sampleColor}
          />
        </div>
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-1" style={{ width: 48 }}>
          <label
            className="relative block"
            style={{ width: 34, height: 34, cursor: "pointer" }}
            title="색상 선택"
          >
            <span
              aria-hidden
              style={{
                display: "block",
                width: 34,
                height: 34,
                borderRadius: 8,
                background: selectedColor,
                border: "2px solid rgba(255,255,255,0.75)",
                boxShadow: "0 0 8px rgba(255,255,255,0.22)",
              }}
            />
            <input
              type="color"
              value={/^#[0-9a-fA-F]{6}$/.test(selectedColor) ? selectedColor : "#ffffff"}
              onChange={(e) => {
                selectColor(e.target.value);
                setTool("paint");
              }}
              style={{
                position: "absolute",
                inset: 0,
                opacity: 0,
                width: "100%",
                height: "100%",
                cursor: "pointer",
                border: "none",
                padding: 0,
              }}
              aria-label="컬러 피커"
            />
          </label>
          <span style={{ fontFamily: FONT_UI, fontSize: "0.32rem", color: "#d8c49b", letterSpacing: "0.02em" }}>색상</span>
          {recentColors.map(color => (
            <button
              key={"side-" + color}
              type="button"
              onClick={() => {
                selectColor(color);
                setTool("paint");
              }}
              aria-label="최근 색상 선택"
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                background: color,
                border: selectedColor === color ? "2px solid white" : "1px solid rgba(255,255,255,0.28)",
              }}
            />
          ))}
        </div>
      </div>

      <p className="mt-2 flex-shrink-0" style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "rgba(248,234,198,0.55)" }}>
        {tool === "erase"
          ? "지우개: 직접 칠한 픽셀만 지워지고 기본 아바타는 유지됩니다."
          : tool === "eyedropper"
            ? "스포이드: 픽셀을 눌러 색을 가져온 뒤 펜으로 전환됩니다."
            : "펜: 드래그해서 연속으로 칠할 수 있습니다. 오른쪽에서 원하는 색을 고르세요."}
      </p>
    </motion.div>
  );
}

function CreatorCanvas({
  label,
  color,
  children,
}: {
  label: string;
  color: string;
  children: ReactNode;
}) {
  return (
    <div
      className="relative rounded-xl overflow-hidden flex items-center justify-center w-full h-full"
      style={{
        minHeight: 0,
        background: "#fff8e8",
        border: "1.5px solid rgba(216,196,155,0.32)",
        boxShadow: "inset 0 0 0 1px rgba(120,90,45,0.05)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(176,138,74,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(176,138,74,0.12) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      />
      <div className="absolute left-2 top-2 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.82)", border: "1px solid rgba(176,138,74,0.18)" }}>
        <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.26rem", color }}>{label}</span>
      </div>
      <motion.div
        className="relative flex items-center justify-center"
        style={{
          width: "min(86%, 190px)",
          height: "min(82%, 190px)",
          minWidth: 118,
          minHeight: 118,
          background: "rgba(255,255,255,0.58)",
          border: `1px dashed ${color}88`,
          borderRadius: 12,
        }}
        animate={{ boxShadow: [`0 0 0 ${color}00`, `0 0 18px ${color}55`, `0 0 0 ${color}00`] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      >
        {children}
      </motion.div>
    </div>
  );
}

function ItemCreatorLeftPage({
  creatorAvatar,
  userId,
  creatorClothesOn,
  onToggleClothes,
  selectedItem,
  overlayEditing,
  onSelectItem,
  onDeselectOverlay,
  onRemoveOverlay,
  onPlacementChange,
  onSave,
  saving,
  saved,
  saveError,
  inventoryRevision = 0,
}: {
  creatorAvatar: AvatarProfile;
  userId: string;
  creatorClothesOn: boolean;
  onToggleClothes: () => void;
  selectedItem: HandMadeItem | null;
  overlayEditing: boolean;
  onSelectItem: (itemId: string) => void;
  onDeselectOverlay: () => void;
  onRemoveOverlay: () => void;
  onPlacementChange: (placement: HandMadeItemPlacement) => void;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  saveError: string | null;
  inventoryRevision?: number;
}) {
  const previewWidth = ITEM_CREATOR_AVATAR_WIDTH;
  const previewHeight = avatarPreviewHeightForWidth(previewWidth);
  const framePad = Math.max(6, Math.round(previewWidth * 0.095));
  const equippedItems = useMemo(
    () => getEquippedCompanions(creatorAvatar.equipped, loadMyInventory(userId), { showUnplacedPurchased: true }),
    [creatorAvatar.equipped, userId, inventoryRevision],
  );
  const { back: backEquippedItems, front: frontEquippedItems } = splitDecorItemsByLayer(equippedItems);

  const renderCreatorOverlay = (item: HandMadeItem) => (
    <EditablePlacedItemOverlay
      key={item.id}
      item={item}
      userId={userId}
      referenceWidth={previewWidth}
      referenceHeight={previewHeight}
      selected={selectedItem?.id === item.id && overlayEditing}
      onSelect={() => onSelectItem(item.id)}
      onRemove={onRemoveOverlay}
      onPlacementChange={onPlacementChange}
    />
  );

  return (
    <div className="relative h-full w-full flex flex-col overflow-hidden" style={{ background: DIARY_PAPER_BG }}>
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b" style={{ borderColor: "rgba(139,154,114,0.2)" }}>
        <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.38rem", color: "#8b9a72" }}>MY AVATAR</span>
        <button
          type="button"
          onClick={onToggleClothes}
          className="px-2.5 py-1 rounded-full"
          style={{
            fontFamily: FONT_UI,
            fontSize: "0.45rem",
            fontWeight: 700,
            color: "#f7efd9",
            background: "linear-gradient(90deg,#8b9a72,#b08a4a)",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        >
          옷 {creatorClothesOn ? "ON" : "OFF"}
        </button>
      </div>

      <div
        className="flex-1 flex items-center justify-center p-4"
        style={{ minHeight: 0 }}
        onClick={() => {
          if (overlayEditing) onDeselectOverlay();
        }}
      >
        <div
          className="relative rounded-xl inline-flex items-center justify-center"
          style={{
            padding: framePad,
            background: AVATAR_STUDIO_PREVIEW_FRAME.background,
            border: AVATAR_STUDIO_PREVIEW_FRAME.border,
          }}
        >
          <div className="relative">
            {backEquippedItems.map(renderCreatorOverlay)}
            <div className="relative" style={{ zIndex: AVATAR_DECOR_LAYER_Z.avatar }}>
              <PixelAvatar
                avatar={creatorAvatar}
                width={previewWidth}
                height={previewHeight}
                viewBox={AVATAR_STUDIO_PREVIEW_VIEWBOX}
              />
            </div>
            {frontEquippedItems.map(renderCreatorOverlay)}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0 px-3 pb-3 pt-1 flex flex-col gap-1">
        {saveError && (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.42rem", fontWeight: 600, color: "#ff4757", textAlign: "center" }}>
            {saveError}
          </p>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="w-full py-2.5 rounded-full text-white"
          style={{
            fontFamily: FONT_UI,
            fontSize: "0.54rem",
            fontWeight: 800,
            background: saved
              ? "linear-gradient(90deg,#ff6b81,#ff8fa3)"
              : ACCENT_BTN_BG,
            boxShadow: ACCENT_BTN_SHADOW,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "저장 중..." : saved ? "저장 완료!" : "프로필에 저장"}
        </button>
      </div>
    </div>
  );
}

function ItemCreatorRightPage({
  userId,
  selectedCreatorItemId,
  equippedItemIds,
  onSelectItem,
  onDeleteItem,
  onSetDecorLayer,
  onClose,
  inventoryRevision = 0,
}: {
  userId: string;
  selectedCreatorItemId: string | null;
  equippedItemIds: string[];
  onSelectItem: (id: string | null) => void;
  onDeleteItem: (id: string) => void;
  onSetDecorLayer: (itemId: string, layer: "front" | "back") => void;
  onClose: () => void;
  inventoryRevision?: number;
}) {
  const [layerEditMode, setLayerEditMode] = useState(false);
  const [myInventory, setMyInventory] = useState<HandMadeItem[]>(() => loadMyInventory(userId));
  const myAvatarItems = useMemo(
    () => loadAvatarCreatorItems(userId),
    [userId, myInventory],
  );
  const creatorEquippedItemIds = useMemo(() => new Set(equippedItemIds), [equippedItemIds]);
  const selectedItem = selectedCreatorItemId
    ? myAvatarItems.find(item => item.id === selectedCreatorItemId) ?? null
    : null;
  const selectedLayer = selectedItem ? getDecorLayer(selectedItem) : null;

  useEffect(() => {
    setMyInventory(loadMyInventory(userId));
  }, [userId, inventoryRevision]);

  useEffect(() => {
    if (!selectedCreatorItemId) setLayerEditMode(false);
  }, [selectedCreatorItemId]);

  return (
    <div className="h-full flex flex-col overflow-hidden p-3" style={{ background: "linear-gradient(180deg, #2a2114, #171309)" }}>
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.36rem", color: "#d8c49b" }}>ITEM MAKER</span>
        <button
          type="button"
          onClick={onClose}
          className="px-2 py-0.5 rounded-full"
          style={{ fontFamily: FONT_UI, fontSize: "0.45rem", fontWeight: 700, background: "rgba(255,255,255,0.12)", color: "#f7efd9" }}
        >
          닫기
        </button>
      </div>

      <button
        type="button"
        onClick={() => setLayerEditMode(mode => !mode)}
        className="w-full py-1.5 mb-2 rounded-full flex-shrink-0"
        style={{
          fontFamily: FONT_UI,
          fontSize: "0.48rem",
          fontWeight: 800,
          color: layerEditMode ? "#2a2114" : "#f7efd9",
          background: layerEditMode
            ? "linear-gradient(90deg,#ffe080,#ffd060)"
            : "rgba(255,255,255,0.1)",
          border: layerEditMode ? "1px solid rgba(255,180,0,0.35)" : "1px solid rgba(255,255,255,0.14)",
        }}
      >
        레이어 수정하기 {layerEditMode ? "ON" : ""}
      </button>

      {layerEditMode && (
        <div className="mb-2 flex-shrink-0 rounded-xl p-2" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {!selectedItem ? (
            <p style={{ fontFamily: FONT_UI, fontSize: "0.44rem", color: "rgba(247,239,217,0.72)", textAlign: "center", lineHeight: 1.45 }}>
              아래에서 아이템을 선택한 뒤<br />레이어를 골라 주세요
            </p>
          ) : (
            <>
              <p style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "#d8c49b", textAlign: "center", marginBottom: 6 }}>
                「{selectedItem.label}」
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onSetDecorLayer(selectedItem.id, "front")}
                  className="flex-1 py-1.5 rounded-lg"
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: "0.44rem",
                    fontWeight: 800,
                    color: selectedLayer === "front" ? "#2a2114" : "#f7efd9",
                    background: selectedLayer === "front"
                      ? "linear-gradient(90deg,#a6c8ff,#c9b6f5)"
                      : "rgba(255,255,255,0.08)",
                    border: selectedLayer === "front" ? "1px solid rgba(166,200,255,0.5)" : "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  맨 위에 두기
                </button>
                <button
                  type="button"
                  onClick={() => onSetDecorLayer(selectedItem.id, "back")}
                  className="flex-1 py-1.5 rounded-lg"
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: "0.44rem",
                    fontWeight: 800,
                    color: selectedLayer === "back" ? "#2a2114" : "#f7efd9",
                    background: selectedLayer === "back"
                      ? "linear-gradient(90deg,#ffe080,#ffd060)"
                      : "rgba(255,255,255,0.08)",
                    border: selectedLayer === "back" ? "1px solid rgba(255,180,0,0.35)" : "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  맨 뒤에 두기
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <p style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 800, color: "#d8c49b", textAlign: "center", flexShrink: 0, marginBottom: 8 }}>
        내 아이템
      </p>

      <div className="flex-1 overflow-y-auto rounded-xl p-2" style={{ minHeight: 0, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
        {myAvatarItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 py-8">
            <span style={{ fontSize: 28 }}>✋</span>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", color: "rgba(247,239,217,0.72)", lineHeight: 1.5, textAlign: "center" }}>
              아직 보유한 아이템이 없어요.<br />상점에서 구매하거나 하단 「직접 만들기」로 만들어 보세요!
            </p>
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {myAvatarItems.map((item) => {
              const selected = selectedCreatorItemId === item.id;
              const equipped = creatorEquippedItemIds?.has(item.id);
              const needsPlacement = item.source === "purchased" && !item.avatarPlaced;
              return (
                <div key={item.id} className="relative">
                  <button
                    type="button"
                    onClick={() => onSelectItem(selected ? null : item.id)}
                    className="flex flex-col items-center gap-1 rounded-xl py-2 w-full"
                    style={{
                      background: selected ? "linear-gradient(135deg, rgba(176,138,74,0.35), rgba(139,154,114,0.25))" : "rgba(255,255,255,0.08)",
                      border: selected ? "1.5px solid rgba(216,196,155,0.65)" : "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <HandMadeItemPreview item={item} size={36} />
                    <span style={{ fontFamily: FONT_UI, fontSize: "0.4rem", color: "#f7efd9", fontWeight: 600, lineHeight: 1.2, textAlign: "center", padding: "0 4px" }}>
                      {item.label}
                    </span>
                    {item.source === "purchased" && (
                      <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.26rem", color: "#d8c49b" }}>구매</span>
                    )}
                    {needsPlacement && !equipped && (
                      <span style={{ fontFamily: FONT_UI, fontSize: "0.3rem", color: "rgba(247,239,217,0.72)", lineHeight: 1.2, textAlign: "center", padding: "0 2px" }}>탭해서 배치</span>
                    )}
                    {equipped && (
                      <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.26rem", color: "#b08a4a" }}>착용</span>
                    )}
                    {layerEditMode && equipped && (
                      <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.24rem", color: getDecorLayer(item) === "back" ? "#ffd060" : "#a6c8ff" }}>
                        {getDecorLayer(item) === "back" ? "뒤" : "앞"}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    title="영구 삭제"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!window.confirm(`「${item.label}」을(를) 영구 삭제할까요?\n복구할 수 없어요.`)) return;
                      onDeleteItem(item.id);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                      fontSize: "0.55rem",
                      background: "rgba(255,71,87,0.92)",
                      color: "white",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => openHandTrackingDrawPage(userId)}
        className="flex-shrink-0 w-full py-2.5 mt-2 rounded-full text-white"
        style={{ fontFamily: FONT_UI, fontSize: "0.54rem", fontWeight: 800, background: "linear-gradient(90deg,#a6c8ff,#c9b6f5)", boxShadow: "0 2px 10px rgba(166,200,255,0.35)" }}
      >
        ✏️ 직접 만들기
      </button>
    </div>
  );
}

function ProfileAvatarPage({
  avatar,
  userId,
  onSaveAvatar,
  onOpenItemCreator,
  inventoryRevision = 0,
}: {
  avatar: AvatarProfile;
  userId: string;
  onSaveAvatar: (avatar: AvatarProfile) => void;
  onOpenItemCreator: () => void;
  inventoryRevision?: number;
}) {
  const [draft, setDraft] = useState<AvatarProfile>(avatar);
  const [showPixelEditor, setShowPixelEditor] = useState(false);
  const [activeCategory, setActiveCategory] = useState<AvatarItemCategory>("전체");
  const [saved, setSaved] = useState(false);
  const [myInventory, setMyInventory] = useState<HandMadeItem[]>(() => loadMyInventory(userId));

  useEffect(() => {
    setDraft(avatar);
  }, [avatar]);

  useEffect(() => {
    setMyInventory(loadMyInventory(userId));
  }, [userId, inventoryRevision]);

  const equipped = new Set(draft.equipped);
  const catalogItems = activeCategory === "전체"
    ? AVATAR_ITEMS
    : activeCategory === "내 아이템"
      ? []
      : AVATAR_ITEMS.filter(item => item.cat === activeCategory);
  const avatarInventoryItems = myInventory.filter(item => canEquipOnAvatar(item));
  const studioInventoryItems = avatarInventoryItems.filter(item => canEquipFromAvatarStudio(item));
  const allItems = [...AVATAR_ITEMS, ...avatarInventoryItems.map(item => ({
    id: item.id,
    cat: item.cat,
    emoji: "",
    label: item.label,
    color: item.color,
  }))];
  const visibleEquipIds = activeCategory === "내 아이템"
    ? studioInventoryItems.map(item => item.id)
    : catalogItems.map(item => item.id);

  const openItemCreator = () => {
    onOpenItemCreator();
  };

  const toggle = (id: string) => {
    setDraft(prev => {
      const next = new Set(prev.equipped);
      if (next.has(id)) {
        next.delete(id);
      } else {
        const target = allItems.find(item => item.id === id);
        if (target?.cat === "헤어") {
          allItems.filter(item => item.cat === "헤어").forEach(item => next.delete(item.id));
        }
        const isBottom = (itemId: string) => itemId.startsWith("pants-") || itemId.startsWith("skirt-");
        if (isBottom(id)) {
          allItems.filter(item => isBottom(item.id)).forEach(item => next.delete(item.id));
        }
        if (SOLID_TOP_IDS.has(id)) {
          SOLID_TOP_IDS.forEach(topId => next.delete(topId));
        }
        next.add(id);
      }
      return { ...prev, equipped: [...next] };
    });
    setSaved(false);
  };

  const equipVisible = () => {
    setDraft(prev => ({
      ...prev,
      equipped: activeCategory === "헤어"
        ? [
            ...prev.equipped.filter(id => !allItems.some(item => item.cat === "헤어" && item.id === id)),
            ...(catalogItems[0] ? [catalogItems[0].id] : []),
          ]
        : Array.from(new Set([...prev.equipped, ...visibleEquipIds])),
    }));
    setSaved(false);
  };

  const clearVisible = () => {
    const clearIds = new Set(visibleEquipIds);
    setDraft(prev => ({ ...prev, equipped: prev.equipped.filter(id => !clearIds.has(id)) }));
    setSaved(false);
  };

  const saveAvatar = () => {
    onSaveAvatar(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden relative" style={{ background: DIARY_PAPER_BG }}>
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(139,154,114,0.2)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.45rem", color: "#8b9a72" }}>★</span>
          <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.7rem", color: "#8b9a72", letterSpacing: "0.12em" }}>AVATAR STUDIO</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={openItemCreator} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-white" style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 700, background: ACCENT_BTN_BG, boxShadow: ACCENT_BTN_SHADOW }}>아이템 생성하기</button>
          <button onClick={() => setShowPixelEditor(true)} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-white" style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 700, background: ACCENT_BTN_BG, boxShadow: ACCENT_BTN_SHADOW }}>아바타 만들기</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 overflow-hidden" style={{ minHeight: 0 }}>
        <div className="flex justify-center flex-shrink-0">
          <AvatarStudioPreviewFrame avatar={draft} userId={userId} inventoryRevision={inventoryRevision} />
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <div
            className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0"
            style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}
          >
            {AVATAR_ITEM_CATEGORIES.map(category => {
              const active = activeCategory === category;
              const isMyItems = category === "내 아이템";
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className="rounded-full flex-shrink-0"
                  style={{
                    height: 22,
                    padding: "0 7px",
                    fontFamily: FONT_UI,
                    fontSize: "0.48rem",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    background: active
                      ? (isMyItems ? "linear-gradient(90deg, #7c3aed, #9b6dff)" : ACCENT_BTN_BG)
                      : (isMyItems ? "rgba(124,58,237,0.08)" : "rgba(255,255,255,0.72)"),
                    color: active ? "white" : (isMyItems ? "#6a4090" : "#7a6846"),
                    border: active
                      ? (isMyItems ? "1px solid rgba(124,58,237,0.35)" : "1px solid rgba(255,71,87,0.35)")
                      : (isMyItems ? "1px solid rgba(124,58,237,0.2)" : "1px solid rgba(139,154,114,0.14)"),
                    boxShadow: active ? (isMyItems ? "0 1px 6px rgba(124,58,237,0.3)" : ACCENT_BTN_SHADOW) : "none",
                  }}
                >
                  {category}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button type="button" onClick={equipVisible} className="rounded-full" style={{ height: 22, padding: "0 7px", fontFamily: FONT_UI, fontSize: "0.4rem", fontWeight: 800, background: "rgba(176,138,74,0.12)", color: "#8a6334", border: "1px solid rgba(176,138,74,0.22)" }}>모두 착용하기</button>
            <button type="button" onClick={clearVisible} className="rounded-full" style={{ height: 22, padding: "0 7px", fontFamily: FONT_UI, fontSize: "0.4rem", fontWeight: 800, background: "rgba(139,154,114,0.1)", color: "#6d7653", border: "1px solid rgba(139,154,114,0.2)" }}>모두 해제하기</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          {activeCategory === "내 아이템" ? (
            avatarInventoryItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-1 opacity-60 py-6">
                <span style={{ fontSize: 24 }}>✋</span>
                <p style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#9070b0", textAlign: "center" }}>
                  아직 보유한 아이템이 없어요<br />상점에서 구매하거나 핸드트래킹으로 만들어 보세요
                </p>
              </div>
            ) : (
              <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                {avatarInventoryItems.map((item, i) => {
                  const canEquip = canEquipFromAvatarStudio(item);
                  const on = equipped.has(item.id);
                  const needsCreatorPlacement = item.source === "purchased" && !item.avatarPlaced;
                  return (
                    <motion.button
                      key={item.id}
                      type="button"
                      onClick={() => { if (canEquip) toggle(item.id); }}
                      className="flex flex-col items-center gap-0.5 rounded-xl py-2"
                      style={{
                        background: on ? "linear-gradient(135deg, " + item.color + "44, " + item.color + "22)" : "rgba(255,255,255,0.65)",
                        border: on ? "1.5px solid " + item.color : "1px solid rgba(139,154,114,0.12)",
                        boxShadow: on ? "0 2px 8px " + item.color + "44" : "none",
                        opacity: canEquip ? 1 : 0.88,
                        cursor: canEquip ? "pointer" : "default",
                        transition: "all 0.15s",
                      }}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileTap={canEquip ? { scale: 0.93 } : undefined}
                    >
                      <HandMadeItemPreview item={item} size={30} />
                      <span style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: on ? "#6040a0" : "#9060b0", fontWeight: 600 }}>{item.label}</span>
                      <span style={{ fontFamily: FONT_UI, fontSize: "0.34rem", color: "#9070b0" }}>{inventoryItemTypeLabel(item)}</span>
                      {item.source === "purchased" && (
                        <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.26rem", color: "#8a6334" }}>구매</span>
                      )}
                      {needsCreatorPlacement && (
                        <span style={{ fontFamily: FONT_UI, fontSize: "0.3rem", color: "#9070b0", lineHeight: 1.2, textAlign: "center", padding: "0 2px" }}>생성기에서 배치</span>
                      )}
                      {on && <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.28rem", color: "#b08a4a" }}>ON</span>}
                    </motion.button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              {catalogItems.map((item, i) => {
                const on = equipped.has(item.id);
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    onClick={() => toggle(item.id)}
                    className="flex flex-col items-center gap-0.5 rounded-xl py-2"
                    style={{ background: on ? "linear-gradient(135deg, " + item.color + "44, " + item.color + "22)" : "rgba(255,255,255,0.65)", border: on ? "1.5px solid " + item.color : "1px solid rgba(139,154,114,0.12)", boxShadow: on ? "0 2px 8px " + item.color + "44" : "none", transition: "all 0.15s" }}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileTap={{ scale: 0.93 }}
                  >
                    <PixelItemIcon id={item.id} color={item.color} />
                    <span style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: on ? "#6040a0" : "#9060b0", fontWeight: 600 }}>{item.label}</span>
                    {on && <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.28rem", color: "#b08a4a" }}>ON</span>}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <button onClick={saveAvatar} className="flex-shrink-0 py-2 rounded-xl text-white" style={{ fontFamily: FONT_UI, fontSize: "0.58rem", fontWeight: 800, background: saved ? "linear-gradient(90deg,#ff6b81,#ff8fa3)" : ACCENT_BTN_BG, boxShadow: ACCENT_BTN_SHADOW }}>
        {saved ? "프로필에 적용됨" : "프로필에 저장"}
      </button>

      <AnimatePresence>
        {showPixelEditor && (
          <PixelEditor
            initialConfig={draft.config}
            onSave={config => {
              setDraft(prev => ({ ...prev, config }));
              setSaved(false);
            }}
            onClose={() => setShowPixelEditor(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Face camera placeholder ── */
function FakeCameraView({ children }: { children?: ReactNode }) {
  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #1a0a2e 0%, #0d0820 100%)" }}>
      {/* scan lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px)",
        }} />
      {/* face silhouette */}
      <div className="relative flex flex-col items-center justify-center">
        <div className="rounded-full" style={{
          width: 90, height: 110,
          background: "radial-gradient(ellipse at 40% 30%, #ffe0c0 0%, #f0b890 60%, #d08060 100%)",
          boxShadow: "0 4px 24px rgba(255,180,120,0.3)",
        }}>
          {/* eyes */}
          <div className="flex justify-center gap-5 pt-8">
            <div className="w-4 h-4 rounded-full" style={{ background: "#2d1a00" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-white mt-0.5 ml-0.5" />
            </div>
            <div className="w-4 h-4 rounded-full" style={{ background: "#2d1a00" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-white mt-0.5 ml-0.5" />
            </div>
          </div>
          {/* mouth */}
          <div className="mx-auto mt-4 w-8 h-3 rounded-full" style={{ background: "#c06050", border: "1px solid #a04040" }} />
        </div>
        {/* neck + shoulder */}
        <div style={{ width: 40, height: 20, background: "#f0b890", marginTop: -2 }} />
        <div style={{ width: 120, height: 30, background: "#8b9a72", borderRadius: "50% 50% 0 0" }} />
      </div>
      {/* corner guide brackets */}
      {[["top-2 left-2","border-t-2 border-l-2"],["top-2 right-2","border-t-2 border-r-2"],
        ["bottom-2 left-2","border-b-2 border-l-2"],["bottom-2 right-2","border-b-2 border-r-2"]
      ].map(([pos, border], i) => (
        <div key={i} className={`absolute w-5 h-5 ${pos} ${border}`} style={{ borderColor: "rgba(216,196,155,0.7)" }} />
      ))}
      {/* dot grid overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,120,200,0.8) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }} />
      {children}
    </div>
  );
}

const CAMERA_FRAME_CORNERS = [
  ["top-2 left-2", "border-t-2 border-l-2"],
  ["top-2 right-2", "border-t-2 border-r-2"],
  ["bottom-2 left-2", "border-b-2 border-l-2"],
  ["bottom-2 right-2", "border-b-2 border-r-2"],
] as const;

function LiveCameraView({
  children,
  bindVideo,
  status,
}: {
  children?: ReactNode;
  bindVideo: (el: HTMLVideoElement | null) => void;
  status: "loading" | "live" | "unavailable";
}) {
  if (status === "unavailable") {
    return <FakeCameraView>{children}</FakeCameraView>;
  }

  return (
    <div
      className="relative w-full h-full rounded-xl overflow-hidden flex items-center justify-center"
      style={{ background: "linear-gradient(160deg, #1a0a2e 0%, #0d0820 100%)" }}
    >
      <video
        ref={bindVideo}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
        playsInline
        muted
        autoPlay
      />
      {status === "loading" && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <span style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#f7efd9", fontWeight: 600 }}>
            카메라 연결 중...
          </span>
        </div>
      )}
      {CAMERA_FRAME_CORNERS.map(([pos, border], i) => (
        <div
          key={i}
          className={`absolute w-5 h-5 ${pos} ${border}`}
          style={{ borderColor: "rgba(216,196,155,0.7)" }}
        />
      ))}
      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,80,120,0.4)" }}>
        <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.3rem", color: "#d8c49b" }}>LIVE</span>
      </div>
      {children}
    </div>
  );
}

/* ── Emoticon sidebar list ── */
function EmoticonSidebar({
  selected,
  onSelect,
  emoticons = SAMPLE_EMOTICONS,
}: {
  selected: number | null;
  onSelect: (id: number) => void;
  emoticons?: typeof SAMPLE_EMOTICONS;
}) {
  return (
    <div className="flex flex-col gap-1.5 overflow-y-auto" style={{ width: 56 }}>
      <p style={{ fontFamily: FONT_PIXEL, fontSize: "0.28rem", color: "#8b9a72", textAlign: "center", marginBottom: 2 }}>MY</p>
      {emoticons.map(e => (
        <motion.button
          key={e.id}
          onClick={() => onSelect(e.id)}
          className="flex flex-col items-center gap-0.5 rounded-lg p-1"
          style={{
            background: selected === e.id
              ? "linear-gradient(135deg, rgba(176,138,74,0.25), rgba(139,154,114,0.2))"
              : "rgba(255,255,255,0.08)",
            border: selected === e.id ? "1.5px solid rgba(176,138,74,0.5)" : "1px solid rgba(255,255,255,0.1)",
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <PixelEmoticonIcon icon={e.icon} color={e.color} size={28} />
          <span style={{ fontFamily: FONT_UI, fontSize: "0.3rem", color: "rgba(255,220,240,0.7)", lineHeight: 1.2, textAlign: "center" }}>{e.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

/* ── Emoticon Maker page ── */
function EmoticonMakerPage({ onBack, userId }: { onBack: () => void; userId: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [isRec, setIsRec] = useState(true);
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);
  const visibleEmoticons = useMemo(() => getVisibleEmoticons(userId), [userId]);
  const selectedEmoticon = visibleEmoticons.find(e => e.id === selected);

  return (
    <div className="h-full flex flex-col" style={{
      background: "linear-gradient(160deg, #140820 0%, #0e0618 100%)",
    }}>
      {/* top bar */}
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <button onClick={onBack}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,220,240,0.8)", fontSize: "0.5rem", fontFamily: FONT_UI, fontWeight: 600 }}>
          ← 뒤로
        </button>
        {/* REC indicator */}
        <motion.div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ background: "rgba(255,40,40,0.18)", border: "1px solid rgba(255,80,80,0.4)" }}>
          <motion.div className="w-2 h-2 rounded-full" style={{ background: "#ff3030" }}
            animate={{ opacity: isRec ? [1, 0.2, 1] : 0.3 }}
            transition={{ duration: 1, repeat: Infinity }} />
          <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.35rem", color: "#ff6060" }}>REC</span>
          <span style={{ fontFamily: FONT_UI, fontSize: "0.45rem", color: "rgba(255,180,180,0.7)" }}>00:12</span>
          <button onClick={() => setIsRec(v => !v)}
            className="px-1.5 py-0.5 rounded-full ml-1"
            style={{ background: isRec ? "rgba(255,80,80,0.3)" : "rgba(100,255,100,0.2)", fontSize: "0.4rem", color: isRec ? "#ff8080" : "#80ff80", fontFamily: FONT_UI }}>
            {isRec ? "■ 정지" : "● 시작"}
          </button>
        </motion.div>
        <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.38rem", color: "rgba(255,120,200,0.6)" }}>HAND TRACK</span>
      </div>

      {/* main area */}
      <div className="flex-1 grid gap-2 px-3 pb-3" style={{ minHeight: 0, gridTemplateColumns: "minmax(0, 1fr) 118px" }}>
        <div className="flex flex-col gap-2" style={{ minWidth: 0, minHeight: 0 }}>
          <div className="relative flex-1" style={{ minHeight: 0 }}>
            <FakeCameraView>
              {/* hand tracking dots */}
              {[[42,62],[50,55],[58,62],[54,72],[46,72],[40,80],[60,80]].map(([x,y],i) => (
                <motion.div key={i} className="absolute w-2 h-2 rounded-full"
                  style={{ left: `${x}%`, top: `${y}%`, background: selectedColor, boxShadow: `0 0 6px ${selectedColor}` }}
                  animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.2, delay: i * 0.15, repeat: Infinity }} />
              ))}
              {/* connecting lines hint */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.4 }}>
                <polyline points="42%,62% 50%,55% 58%,62% 54%,72% 46%,72% 40%,80% 60%,80%"
                  fill="none" stroke={selectedColor} strokeWidth="1" />
              </svg>
              {/* live label */}
              <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded"
                style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,80,120,0.4)" }}>
                <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.3rem", color: "#d8c49b" }}>LIVE</span>
              </div>
            </FakeCameraView>
          </div>
          <div className="flex-1" style={{ minHeight: 0 }}>
            <CreatorCanvas label="EMOTE CANVAS" color={selectedColor}>
              <PixelEmoticonIcon icon={selectedEmoticon?.icon ?? "sparkle-face"} color={selectedColor} size={96} glow />
            </CreatorCanvas>
          </div>
        </div>

        <div className="flex flex-col gap-2" style={{ minHeight: 0 }}>
          <div className="rounded-xl p-2 flex flex-col gap-2 flex-shrink-0" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.28rem", color: "#8b9a72" }}>COLOR</span>
              <span style={{ width: 18, height: 18, borderRadius: 4, background: selectedColor, border: "1px solid rgba(255,255,255,0.7)" }} />
            </div>
            <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {PALETTE.slice(0, 24).map(color => (
                <button
                  key={"emoticon-color-" + color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  aria-label="이모티콘 색상 선택"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: color,
                    border: selectedColor === color ? "2px solid white" : "1px solid rgba(255,255,255,0.22)",
                    boxShadow: selectedColor === color ? "0 0 7px rgba(255,255,255,0.48)" : "none",
                  }}
                />
              ))}
            </div>
            <div className="rounded-lg flex items-center justify-center py-2" style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(216,196,155,0.14)" }}>
              <PixelEmoticonIcon icon={selectedEmoticon?.icon ?? "sparkle-face"} color={selectedColor} size={42} glow />
            </div>
          </div>
          <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            <EmoticonSidebar selected={selected} onSelect={setSelected} emoticons={visibleEmoticons} />
          </div>
          {selected !== null && (
            <motion.button
              className="w-full py-1 rounded-lg text-white"
              style={{
                fontFamily: FONT_UI, fontSize: "0.45rem", fontWeight: 700,
                background: "linear-gradient(135deg, #b08a4a, #8b9a72)",
                boxShadow: "0 2px 8px rgba(176,138,74,0.4)",
              }}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            >
              ✏️<br />수정
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoBoothPage({ onBack, avatar, userId }: { onBack: () => void; avatar: AvatarProfile; userId: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [showChar, setShowChar] = useState(false);
  const [shots, setShots] = useState<string[]>([]);
  const [shotIdx, setShotIdx] = useState(0);
  const [flash, setFlash] = useState(false);
  const [previewShot, setPreviewShot] = useState<string | null>(null);
  const { addUpload, addGradient } = usePhotoAlbum(userId);
  const { bindVideo, status, capture } = useLiveCamera();
  const blobUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current.clear();
    };
  }, []);

  const visibleEmoticons = useMemo(() => getVisibleEmoticons(userId), [userId]);
  const selectedEmoticon = visibleEmoticons.find(e => e.id === selected);

  const takePhoto = async () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 300);

    if (status === "live") {
      const blob = await capture();
      if (blob) {
        const url = URL.createObjectURL(blob);
        blobUrlsRef.current.add(url);
        setShots((prev) => {
          setShotIdx(0);
          return [url, ...prev];
        });
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
        void addUpload(file);
        return;
      }
    }

    const gradient = PHOTO_BOOTH_GRADIENTS[shots.length % PHOTO_BOOTH_GRADIENTS.length];
    setShots((prev) => {
      setShotIdx(0);
      void addGradient(gradient);
      return [gradient, ...prev];
    });
  };

  return (
    <div className="h-full flex flex-col" style={{ background: "linear-gradient(160deg, #140820 0%, #0e0618 100%)" }}>
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.1)", color: "rgba(255,220,240,0.8)", fontSize: "0.5rem", fontFamily: FONT_UI, fontWeight: 600 }}>
          ← 뒤로
        </button>
        <button onClick={() => setShowChar(v => !v)} className="flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{
            fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 700,
            background: showChar ? "linear-gradient(90deg,#8b9a72,#b08a4a)" : "rgba(255,255,255,0.12)",
            color: "white", border: "1px solid rgba(255,120,200,0.3)",
            boxShadow: showChar ? "0 2px 8px rgba(139,154,114,0.4)" : "none", transition: "all 0.2s",
          }}>
          {showChar ? "✓ 캐릭터 ON" : "🧸 캐릭터 불러오기"}
        </button>
      </div>

      <div className="flex-1 flex gap-2 px-3 pb-3" style={{ minHeight: 0 }}>
        <div className="flex-1 relative" style={{ minWidth: 0 }}>
          <LiveCameraView bindVideo={bindVideo} status={status}>
            <AnimatePresence>
              {flash && (
                <motion.div className="absolute inset-0 bg-white pointer-events-none"
                  initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.3 }} />
              )}
            </AnimatePresence>
            <AnimatePresence>
              {showChar && (
                <motion.div className="absolute bottom-16 left-4"
                  initial={{ scale: 0, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}>
                  <div style={{ filter: "drop-shadow(0 2px 8px rgba(216,196,155,0.55))" }}>
                    <AvatarWithCompanions avatar={avatar} userId={userId} width={78} height={102} companionScale={0.5} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {selectedEmoticon && (
                <motion.div className="absolute top-4 right-4"
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}>
                  <PixelEmoticonIcon icon={selectedEmoticon.icon} color={selectedEmoticon.color} size={48} glow />
                </motion.div>
              )}
            </AnimatePresence>
            {/* shutter */}
            <motion.button onClick={() => void takePhoto()}
              disabled={status === "loading"}
              className="absolute left-1/2 -translate-x-1/2 bottom-3 flex items-center justify-center"
              style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                border: "4px solid rgba(255,255,255,0.9)",
                backdropFilter: "blur(4px)",
                boxShadow: "0 0 20px rgba(216,196,155,0.4), 0 4px 16px rgba(0,0,0,0.3)",
                opacity: status === "loading" ? 0.45 : 1,
              }}
              whileTap={{ scale: 0.82 }} whileHover={{ scale: 1.06 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(255,255,255,0.85)", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.15)" }} />
            </motion.button>
            {/* thumbnail preview bottom-right */}
            <AnimatePresence>
              {shots.length > 0 && (
                <motion.div className="absolute bottom-3 right-3 flex flex-col items-end gap-1"
                  initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                  <button type="button" onClick={() => setPreviewShot(shots[shotIdx])} className="relative rounded-lg overflow-hidden"
                    style={{ width: 52, height: 52, border: "2px solid rgba(255,255,255,0.8)", boxShadow: "0 2px 10px rgba(0,0,0,0.4)" }}>
                    <div className="w-full h-full" style={photoBoothShotStyle(shots[shotIdx])} />
                    <div className="absolute top-0.5 right-0.5 rounded-sm px-0.5"
                      style={{ background: "rgba(80,200,80,0.85)", fontSize: "0.28rem", fontFamily: FONT_UI, color: "white", fontWeight: 700 }}>✓</div>
                  </button>
                  {shots.length > 1 && (
                    <div className="flex gap-1 items-center">
                      <button onClick={() => setShotIdx(i => Math.min(i + 1, shots.length - 1))}
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.2)", color: "white", fontSize: 10, opacity: shotIdx < shots.length - 1 ? 1 : 0.3 }}>‹</button>
                      <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.28rem", color: "rgba(248,234,198,0.8)" }}>
                        {shots.length - shotIdx}/{shots.length}
                      </span>
                      <button onClick={() => setShotIdx(i => Math.max(i - 1, 0))}
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.2)", color: "white", fontSize: 10, opacity: shotIdx > 0 ? 1 : 0.3 }}>›</button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </LiveCameraView>
        </div>
        <div className="flex flex-col gap-1.5" style={{ width: 56 }}>
          <p style={{ fontFamily: FONT_PIXEL, fontSize: "0.28rem", color: "rgba(255,120,200,0.7)", textAlign: "center" }}>STAMP</p>
          <EmoticonSidebar selected={selected} onSelect={id => setSelected(prev => prev === id ? null : id)} emoticons={visibleEmoticons} />
        </div>
      </div>

      <AnimatePresence>
        {previewShot && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center p-3"
            style={{ background: "rgba(10, 8, 14, 0.78)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="w-full max-w-[560px] rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.18)", boxShadow: "0 16px 48px rgba(0,0,0,0.45)" }}>
              <div className="flex items-center justify-between px-3 py-2" style={{ background: "rgba(0,0,0,0.55)" }}>
                <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.3rem", color: "#d8c49b" }}>PHOTO PREVIEW</span>
                <button onClick={() => setPreviewShot(null)} className="px-2 py-0.5 rounded-full" style={{ fontFamily: FONT_UI, fontSize: "0.45rem", fontWeight: 700, background: "rgba(255,255,255,0.12)", color: "#fff" }}>
                  닫기
                </button>
              </div>
              <div className="aspect-square" style={photoBoothShotStyle(previewShot)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Emoticon Room landing ── */
function EmoticonRoomPage({
  avatar,
  userId,
  onBack,
  inventoryRevision = 0,
  onDeleteItem,
}: {
  avatar: AvatarProfile;
  userId: string;
  onBack?: () => void;
  inventoryRevision?: number;
  onDeleteItem?: (itemId: string) => void;
}) {
  const [view, setView] = useState<"home" | "maker" | "photo">("home");
  const [category, setCategory] = useState("전체");
  const [myInventory, setMyInventory] = useState<HandMadeItem[]>(() => loadMyInventory(userId));
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [emoticonRoomTick, setEmoticonRoomTick] = useState(0);
  const visibleEmoticons = useMemo(
    () => getVisibleEmoticons(userId),
    [userId, emoticonRoomTick],
  );

  useEffect(() => {
    setMyInventory(loadMyInventory(userId));
  }, [userId, view, inventoryRevision]);

  useEffect(() => {
    if (isDeleteMode) return;
    setSelectedIds(new Set());
    setConfirmDelete(false);
  }, [category, isDeleteMode]);

  const exitDeleteMode = () => {
    setIsDeleteMode(false);
    setSelectedIds(new Set());
    setConfirmDelete(false);
  };

  const enterDeleteMode = () => {
    if (visibleEmoticons.length === 0 && myInventory.length === 0) return;
    setIsDeleteMode(true);
  };

  const toggleSelect = (selectKey: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(selectKey)) next.delete(selectKey);
      else next.add(selectKey);
      return next;
    });
  };

  const confirmDeleteSelected = () => {
    if (selectedIds.size === 0) return;

    const emoticonIds: number[] = [];
    const inventoryIds: string[] = [];
    for (const key of selectedIds) {
      const emoticonId = parseEmoticonSelectKey(key);
      if (emoticonId !== null) emoticonIds.push(emoticonId);
      else inventoryIds.push(key);
    }

    if (emoticonIds.length > 0) {
      hideEmoticons(userId, emoticonIds);
      setEmoticonRoomTick((tick) => tick + 1);
    }
    if (onDeleteItem) {
      for (const itemId of inventoryIds) {
        onDeleteItem(itemId);
      }
    }

    setMyInventory(loadMyInventory(userId));
    exitDeleteMode();
  };

  if (view === "maker") return <EmoticonMakerPage onBack={() => setView("home")} userId={userId} />;
  if (view === "photo") return <PhotoBoothPage onBack={() => setView("home")} avatar={avatar} userId={userId} />;

  const sampleCategories = Array.from(new Set(visibleEmoticons.map(e => e.category)));
  const categories = ["전체", "내 아이템", ...sampleCategories];
  const showMyItems = category === "내 아이템";
  const showAllTab = category === "전체";
  const decorItems = myInventory.filter(item => isDecorItem(item));
  const categorized = showAllTab
    ? visibleEmoticons
    : showMyItems
      ? []
      : visibleEmoticons.filter(e => e.category === category);
  const hasDeletableContent = visibleEmoticons.length > 0 || myInventory.length > 0;
  const canDeleteInView = showMyItems
    ? myInventory.length > 0
    : showAllTab
      ? visibleEmoticons.length > 0 || decorItems.length > 0
      : categorized.length > 0;

  const renderInventoryItem = (
    item: HandMadeItem,
    i: number,
    options?: { sublabel?: string; border?: string; background?: string },
  ) => {
    const selected = selectedIds.has(item.id);
    const selectable = isDeleteMode && canDeleteInView;

    return (
      <motion.div
        key={item.id}
        role={selectable ? "button" : undefined}
        tabIndex={selectable ? 0 : undefined}
        onClick={() => selectable && toggleSelect(item.id)}
        onKeyDown={(event) => {
          if (selectable && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            toggleSelect(item.id);
          }
        }}
        className="flex flex-col items-center gap-1 rounded-xl py-2.5 relative"
        style={{
          background: selected
            ? "rgba(255,71,87,0.12)"
            : options?.background ?? "rgba(255,255,255,0.7)",
          border: selected
            ? "2px solid rgba(255,71,87,0.55)"
            : options?.border ?? "1px solid rgba(139,154,114,0.15)",
          cursor: selectable ? "pointer" : "default",
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        whileHover={selectable ? undefined : { scale: 1.04 }}
      >
        {isDeleteMode && canDeleteInView && (
          <span
            className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{
              fontSize: "0.42rem",
              fontWeight: 800,
              color: selected ? "white" : "#ff4757",
              background: selected ? "rgba(255,71,87,0.92)" : "rgba(255,255,255,0.9)",
              border: "1px solid rgba(255,71,87,0.35)",
            }}
          >
            {selected ? "✓" : ""}
          </span>
        )}
        <HandMadeItemPreview item={item} size={40} />
        <span style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#9060b0", fontWeight: 700 }}>{item.label}</span>
        <span style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "rgba(139,154,114,0.85)", lineHeight: 1.2 }}>
          {options?.sublabel ?? inventoryItemTypeLabel(item)}
        </span>
      </motion.div>
    );
  };

  const renderSampleEmoticon = (emoticon: (typeof SAMPLE_EMOTICONS)[number], i: number) => {
    const selectKey = emoticonSelectKey(emoticon.id);
    const selected = selectedIds.has(selectKey);
    const selectable = isDeleteMode && canDeleteInView;

    return (
      <motion.div
        key={emoticon.id}
        role={selectable ? "button" : undefined}
        tabIndex={selectable ? 0 : undefined}
        onClick={() => selectable && toggleSelect(selectKey)}
        onKeyDown={(event) => {
          if (selectable && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            toggleSelect(selectKey);
          }
        }}
        className="flex flex-col items-center gap-1 rounded-xl py-2.5 relative"
        style={{
          background: selected ? "rgba(255,71,87,0.12)" : "rgba(255,255,255,0.7)",
          border: selected ? "2px solid rgba(255,71,87,0.55)" : "1px solid rgba(139,154,114,0.15)",
          cursor: selectable ? "pointer" : "default",
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        whileHover={selectable ? undefined : { scale: 1.04 }}
      >
        {isDeleteMode && canDeleteInView && (
          <span
            className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{
              fontSize: "0.42rem",
              fontWeight: 800,
              color: selected ? "white" : "#ff4757",
              background: selected ? "rgba(255,71,87,0.92)" : "rgba(255,255,255,0.9)",
              border: "1px solid rgba(255,71,87,0.35)",
            }}
          >
            {selected ? "✓" : ""}
          </span>
        )}
        <PixelEmoticonIcon icon={emoticon.icon} color={emoticon.color} size={40} />
        <span style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#9060b0", fontWeight: 700 }}>{emoticon.label}</span>
        <span style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "rgba(139,154,114,0.85)", lineHeight: 1.2 }}>{emoticon.category}</span>
      </motion.div>
    );
  };

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{
      background: DIARY_PAPER_BG,
    }}>
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(176,138,74,0.2)" }}>
        <div className="flex items-center">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full mr-1.5"
              style={{ background: "rgba(176,138,74,0.12)", color: "#8a6334", fontSize: "0.48rem", fontFamily: FONT_UI, fontWeight: 700 }}
            >
              ←
            </button>
          )}
          <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.45rem", color: "#b08a4a" }}>★</span>
          <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.7rem", color: "#b08a4a", letterSpacing: "0.12em", marginLeft: 6 }}>EMOTICON ROOM</span>
        </div>
        {hasDeletableContent && (
          <div className="flex items-center gap-1">
            {!isDeleteMode ? (
              <button
                type="button"
                onClick={enterDeleteMode}
                title="아이템 삭제"
                aria-label="아이템 삭제"
                className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(255,71,87,0.25)",
                  fontSize: "0.72rem",
                }}
              >
                🗑️
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={exitDeleteMode}
                  className="px-2 py-1 rounded-full"
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: "0.46rem",
                    fontWeight: 700,
                    color: "var(--diary-dark)",
                    background: "rgba(var(--diary-mid-rgb),0.08)",
                  }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => selectedIds.size > 0 && setConfirmDelete(true)}
                  disabled={selectedIds.size === 0}
                  className="px-2.5 py-1 rounded-full"
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: "0.46rem",
                    fontWeight: 700,
                    color: "white",
                    background: selectedIds.size > 0 ? ACCENT_BTN_BG : "rgba(255,71,87,0.25)",
                    opacity: selectedIds.size > 0 ? 1 : 0.7,
                  }}
                >
                  삭제 {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {isDeleteMode && (
        <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", color: "#b08090", lineHeight: 1.4, flexShrink: 0 }}>
          {canDeleteInView
            ? "삭제할 이모티콘·아이템을 탭해서 선택하세요."
            : "이 탭에는 삭제할 항목이 없어요. 다른 탭을 선택해 보세요."}
        </p>
      )}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        <div className="flex items-center gap-1 overflow-x-auto pb-2" style={{ minHeight: 28 }}>
          {categories.map(cat => {
            const on = category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className="rounded-full flex-shrink-0 px-2 py-0.5"
                style={{
                  fontFamily: FONT_UI,
                  fontSize: "0.44rem",
                  fontWeight: 800,
                  background: on ? ACCENT_BTN_BG : "rgba(255,255,255,0.72)",
                  color: on ? "white" : "#7a6846",
                  border: on ? "1px solid rgba(255,71,87,0.35)" : "1px solid rgba(139,154,114,0.15)",
                  boxShadow: on ? ACCENT_BTN_SHADOW : "none",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {showMyItems && myInventory.length === 0 && (
            <div className="col-span-3 flex flex-col items-center justify-center gap-1 opacity-60 py-6">
              <span style={{ fontSize: 24 }}>✨</span>
              <p style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#9070b0", textAlign: "center" }}>
                보유한 아이템이 없어요<br />상점에서 구매하거나 직접 만들어 보세요
              </p>
            </div>
          )}
          {showMyItems && myInventory.map((item, i) => renderInventoryItem(item, i))}
          {!showMyItems && categorized.map((e, i) => renderSampleEmoticon(e, i))}
          {showAllTab && decorItems.map((item, i) =>
            renderInventoryItem(item, categorized.length + i, {
              sublabel: "내 아이템",
              border: "1px solid rgba(124,58,237,0.18)",
              background: "rgba(255,255,255,0.85)",
            }),
          )}
          {!showMyItems && !isDeleteMode && (
          <button onClick={() => setView("maker")}
            className="flex flex-col items-center justify-center gap-1 rounded-xl py-2.5"
            style={{ border: "1.5px dashed rgba(139,154,114,0.3)", background: "rgba(139,154,114,0.04)" }}>
            <span style={{ fontSize: 22, color: "#8b9a72" }}>＋</span>
            <span style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "#8b9a72" }}>추가</span>
          </button>
          )}
        </div>
      </div>
      {/* bottom action buttons — same size, side by side */}
      <div className="flex gap-2 flex-shrink-0">
        <motion.button onClick={() => setView("photo")}
          disabled={isDeleteMode}
          className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-white"
          style={{
            fontFamily: FONT_UI, fontSize: "0.58rem", fontWeight: 700,
            background: ACCENT_BTN_BG_135,
            boxShadow: ACCENT_BTN_SHADOW,
            opacity: isDeleteMode ? 0.45 : 1,
          }}
          whileHover={{ scale: isDeleteMode ? 1 : 1.02 }} whileTap={{ scale: isDeleteMode ? 1 : 0.97 }}>
          <span style={{ fontSize: 15 }}>📸</span> 사진찍기
        </motion.button>
        <motion.button onClick={() => setView("maker")}
          disabled={isDeleteMode}
          className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-white"
          style={{
            fontFamily: FONT_UI, fontSize: "0.58rem", fontWeight: 700,
            background: "linear-gradient(135deg, #7c3aed, #8b9a72)",
            boxShadow: "0 3px 12px rgba(130,60,255,0.4)",
            opacity: isDeleteMode ? 0.45 : 1,
          }}
          whileHover={{ scale: isDeleteMode ? 1 : 1.02 }} whileTap={{ scale: isDeleteMode ? 1 : 0.97 }}>
          <span style={{ fontSize: 15 }}>✨</span> 이모티콘 생성
        </motion.button>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent
          className="max-w-[calc(100%-2rem)] sm:max-w-sm"
          style={{
            background: "linear-gradient(180deg, #fffaf4, #fff2e6)",
            border: "1px solid rgba(255,160,80,0.18)",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: FONT_UI, fontSize: "0.78rem", fontWeight: 900, color: "#8a4b1f" }}>
              정말 삭제하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#b06a3f", lineHeight: 1.55 }}>
              선택한 {selectedIds.size}개 항목이 이모티콘룸·내 아이템에서 영구 삭제됩니다. 되돌릴 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full px-4 py-2"
              style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 900 }}
            >
              아니오
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteSelected}
              className="rounded-full px-4 py-2"
              style={{
                fontFamily: FONT_UI,
                fontSize: "0.5rem",
                fontWeight: 900,
                background: "linear-gradient(90deg,#ff4757,#ff6b81)",
                color: "white",
              }}
            >
              네
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


/* ═══════════════════════════════════════════
   RIGHT PAGE — GUESTBOOK
═══════════════════════════════════════════ */
type GuestbookEntryWithAvatar = {
  id: string;
  name: string;
  msg: string;
  date: string;
  color: string;
  authorId?: string | null;
  avatarProfile?: AvatarProfile | null;
};

function guestbookRecordToEntry(
  record: GuestbookEntryRecord,
  authorAvatars: Map<string, StoredAvatarProfile>,
): GuestbookEntryWithAvatar {
  const authorAvatar = record.authorId ? authorAvatars.get(record.authorId) : null;
  return {
    id: record.id,
    name: record.authorName,
    msg: record.message,
    date: guestbookDateLabel(record.createdAt),
    color: record.color,
    authorId: record.authorId,
    avatarProfile: storedToAvatarProfile(authorAvatar),
  };
}

async function loadGuestbookView(ownerId: string): Promise<GuestbookEntryWithAvatar[]> {
  const records = await loadGuestbookEntries(ownerId);
  const authorIds = records.map((row) => row.authorId).filter((id): id is string => !!id);
  const authorAvatars = await fetchUserAvatars(authorIds);
  return records.map((record) => guestbookRecordToEntry(record, authorAvatars));
}

function GuestbookEntryCard({
  entry,
  index,
  isEditMode,
  isSelected,
  onToggleSelect,
  onProfileClick,
}: {
  entry: GuestbookEntryWithAvatar;
  index: number;
  isEditMode: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onProfileClick: (entry: GuestbookEntryWithAvatar) => void;
}) {
  const handleClick = () => {
    if (isEditMode) {
      onToggleSelect(entry.id);
      return;
    }
  };

  return (
    <motion.div
      role={isEditMode ? "button" : undefined}
      tabIndex={isEditMode ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (isEditMode && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggleSelect(entry.id);
        }
      }}
      transition={{ type: "spring", stiffness: 420, damping: 32, delay: index * 0.04 }}
      className="rounded-xl p-2.5 relative flex-shrink-0"
      style={{
        cursor: isEditMode ? "pointer" : "default",
        background: isSelected ? "rgba(255,71,87,0.06)" : "#ffffff",
        border: isSelected ? "2px solid #ff4757" : `1px solid ${entry.color}44`,
        boxShadow: isSelected ? "0 0 0 2px rgba(255,71,87,0.18)" : `0 1px 6px ${entry.color}22`,
      }}
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {isEditMode && (
            <span
              aria-hidden
              className="flex-shrink-0 rounded flex items-center justify-center"
              style={{
                width: 16,
                height: 16,
                fontSize: 10,
                fontWeight: 800,
                color: isSelected ? "white" : "#ff6040",
                background: isSelected ? "#ff4757" : "rgba(255,96,64,0.12)",
                border: isSelected ? "none" : "1px solid rgba(255,96,64,0.35)",
              }}
            >
              {isSelected ? "✓" : ""}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              if (isEditMode) {
                e.stopPropagation();
                onToggleSelect(entry.id);
                return;
              }
              onProfileClick(entry);
            }}
            className="flex items-center gap-1.5 rounded-lg min-w-0"
            style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
          >
          <FriendAvatarThumb
            avatarProfile={entry.avatarProfile}
            color={entry.color}
            size={26}
            showOnline={false}
            useBust={!!entry.authorId}
            legacyAvatar={AVATAR_PRESETS[0]}
          />
          <span style={{
            fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.6rem", color: "#4a2030",
          }}>{entry.name}</span>
          </button>
        </div>
        <span style={{
          fontFamily: FONT_UI, fontSize: "0.45rem", color: "#b090a0",
        }}>{entry.date}</span>
      </div>
      <p style={{
        fontFamily: FONT_UI, fontSize: "0.58rem", color: "#6a4060",
        lineHeight: 1.5, paddingLeft: "2.1rem",
      }}>{entry.msg}</p>
    </motion.div>
  );
}

function GuestbookPage({
  user,
  visitingFriend,
  onVisitFriend,
  onLeaveFriend,
  onProfileFocus,
  onShopPurchase,
}: {
  user: User;
  visitingFriend: FriendNeighbor | null;
  onVisitFriend: (nb: FriendNeighbor) => void;
  onLeaveFriend: () => void;
  onProfileFocus: (nb: FriendNeighbor) => void;
  onShopPurchase?: () => void;
}) {
  const [entries, setEntries] = useState<GuestbookEntryWithAvatar[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [friends, setFriends] = useState<FriendNeighbor[]>([]);
  const [requestTarget, setRequestTarget] = useState<GuestbookEntryWithAvatar | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestMsg, setRequestMsg] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refreshEntries = async () => {
    if (!isSupabaseConfigured()) {
      setEntries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const next = await loadGuestbookView(user.id);
    setEntries(next);
    setLoading(false);
  };

  useEffect(() => {
    void refreshEntries();
  }, [user.id]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const unsubscribe = subscribeGuestbook(user.id, () => {
      void refreshEntries();
    });
    const stopPolling = startGuestbookPolling(user.id, () => {
      void refreshEntries();
    });
    return () => {
      unsubscribe();
      stopPolling();
    };
  }, [user.id]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let cancelled = false;
    loadFriends(user.id).then(async (stored) => {
      if (cancelled) return;
      const neighborBase = stored.map((friend, index) => storedFriendToNeighbor(friend, index));
      const friendIds = neighborBase.map((n) => n.friendUserId).filter((id): id is string => !!id);
      const avatars = await fetchUserAvatars(friendIds);
      setFriends(
        neighborBase.map((neighbor) => ({
          ...neighbor,
          avatarProfile: neighbor.friendUserId
            ? storedToAvatarProfile(avatars.get(neighbor.friendUserId) ?? null)
            : null,
        })),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const handleDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    setDeleting(true);
    setDeleteError(null);

    if (isSupabaseConfigured()) {
      const results = await Promise.all(ids.map((id) => deleteGuestbookEntry(id)));
      if (results.some((ok) => !ok)) {
        setDeleteError("방명록 삭제에 실패했어요. 잠시 후 다시 시도해 주세요.");
        setDeleting(false);
        return;
      }
    }

    const idSet = new Set(ids);
    setEntries((prev) => prev.filter((entry) => !idSet.has(entry.id)));
    setSelectedIds(new Set());
    setIsEditMode(false);
    setConfirmDelete(false);
    setDeleting(false);
  };

  const toggleSelect = (id: string) => {
    setDeleteError(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitEditMode = () => {
    setIsEditMode(false);
    setSelectedIds(new Set());
    setDeleteError(null);
  };

  const handleProfileClick = (entry: GuestbookEntryWithAvatar) => {
    if (isEditMode) return;
    if (!entry.authorId || entry.authorId === user.id) return;

    const isFriend = friends.some((f) => f.friendUserId === entry.authorId);
    if (isFriend) {
      onVisitFriend(guestbookEntryToFriend(entry, friends));
      return;
    }

    setRequestMsg(null);
    setRequestTarget(entry);
  };

  const handleConfirmFriendRequest = async () => {
    if (!requestTarget || requestBusy) return;
    setRequestBusy(true);
    setRequestMsg(null);
    const result = await sendFriendRequest(user.id, requestTarget.name);
    setRequestBusy(false);
    if (!result.ok) {
      setRequestMsg(result.error);
      return;
    }
    setRequestMsg(`${result.nickname}님에게 친구 신청을 보냈어요.`);
  };

  if (visitingFriend) {
    return (
      <FriendVisitPage
        nb={visitingFriend}
        user={user}
        onBack={onLeaveFriend}
        onProfileFocus={onProfileFocus}
        onShopPurchase={onShopPurchase}
      />
    );
  }

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden relative" style={{
      background: DIARY_PAPER_BG,
    }}>
      {requestTarget && (
        <FriendRequestConfirmModal
          nickname={requestTarget.name}
          busy={requestBusy}
          message={requestMsg}
          onClose={() => {
            if (requestBusy) return;
            setRequestTarget(null);
            setRequestMsg(null);
          }}
          onConfirm={() => void handleConfirmFriendRequest()}
        />
      )}
      {/* header */}
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(255,120,80,0.2)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.45rem", color: "#ff6040" }}>★</span>
          <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.7rem", color: "#ff6040", letterSpacing: "0.12em" }}>GUESTBOOK</span>
          <span className="px-1.5 py-0.5 rounded-full" style={{
            fontFamily: FONT_PIXEL, fontSize: "0.3rem",
            background: "rgba(255,96,64,0.12)", color: "#ff6040",
          }}>{entries.length}</span>
        </div>
        {entries.length > 0 && (
          <div className="flex items-center gap-1">
            {!isEditMode ? (
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setIsEditMode(true);
                }}
                className="px-2.5 py-1 rounded-full"
                style={{
                  fontFamily: FONT_UI,
                  fontSize: "0.48rem",
                  fontWeight: 700,
                  color: "#ff6040",
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(255,96,64,0.25)",
                }}
              >
                선택 삭제
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={exitEditMode}
                  className="px-2 py-1 rounded-full"
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: "0.46rem",
                    fontWeight: 700,
                    color: "var(--diary-dark)",
                    background: "rgba(var(--diary-mid-rgb),0.08)",
                  }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => selectedIds.size > 0 && setConfirmDelete(true)}
                  disabled={selectedIds.size === 0}
                  className="px-2.5 py-1 rounded-full"
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: "0.46rem",
                    fontWeight: 700,
                    color: "white",
                    background: selectedIds.size > 0 ? ACCENT_BTN_BG : "rgba(255,96,64,0.25)",
                    opacity: selectedIds.size > 0 ? 1 : 0.7,
                  }}
                >
                  삭제 {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: deleteError ? "#ff4757" : "#b08090", lineHeight: 1.4, flexShrink: 0 }}>
        {deleteError
          ? deleteError
          : isEditMode
            ? "삭제할 방명록을 눌러 선택한 뒤 삭제 버튼을 눌러주세요"
            : "친구가 내 프로필 방문 시 남긴 메시지가 여기에 표시돼요"}
      </p>

      {/* entries list */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-0.5" style={{ minHeight: 0 }}>
        {loading ? (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", color: "var(--diary-mid)", textAlign: "center", paddingTop: 24 }}>
            불러오는 중...
          </p>
        ) : entries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-70">
            <span style={{ fontSize: 28 }}>✍️</span>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.55rem", color: "#b08090", textAlign: "center", lineHeight: 1.5 }}>
              아직 방명록이 없어요<br />친구가 방문하면 메시지가 남아요
            </p>
          </div>
        ) : (
          entries.map((entry, i) => (
            <GuestbookEntryCard
              key={entry.id}
              entry={entry}
              index={i}
              isEditMode={isEditMode}
              isSelected={selectedIds.has(entry.id)}
              onToggleSelect={toggleSelect}
              onProfileClick={handleProfileClick}
            />
          ))
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={(open) => !open && !deleting && setConfirmDelete(false)}>
        <AlertDialogContent
          className="max-w-[calc(100%-2rem)] sm:max-w-sm"
          style={{
            background: DIARY_PAPER_BG,
            border: "1px solid rgba(255,96,64,0.25)",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: FONT_UI, fontSize: "0.78rem", fontWeight: 900, color: "#ff6040" }}>
              선택한 방명록을 삭제할까요?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#b08090", lineHeight: 1.55 }}>
              {selectedIds.size}개의 메시지가 삭제됩니다. 삭제 후에는 복구할 수 없어요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full px-4 py-2"
              style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 900 }}
              disabled={deleting}
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete(Array.from(selectedIds))}
              className="rounded-full px-4 py-2"
              disabled={deleting}
              style={{
                fontFamily: FONT_UI,
                fontSize: "0.5rem",
                fontWeight: 900,
                background: ACCENT_BTN_BG,
                color: "white",
                opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? "삭제 중..." : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
/* ═══════════════════════════════════════════
   RIGHT PAGE — MINI ROOM (Slot-based)
═══════════════════════════════════════════ */
function MiniRoomPage({
  userId,
  miniroomData,
  setMiniroomData,
}: {
  userId: string;
  miniroomData: MiniroomData;
  setMiniroomData: Dispatch<SetStateAction<MiniroomData>>;
}) {
  const selections = miniroomData.selections;
  const [activeCategory, setActiveCategory] = useState<MiniRoomPickerTab>("sofa");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [inventoryRoomItems, setInventoryRoomItems] = useState<HandMadeItem[]>(() =>
    loadMyInventory(userId),
  );

  useEffect(() => {
    setInventoryRoomItems(loadMyInventory(userId));
  }, [userId]);

  const inventoryById = useMemo(
    () => new Map(inventoryRoomItems.map(item => [item.id, item])),
    [inventoryRoomItems],
  );
  const inventoryPlacements = miniroomData.inventoryPlacements ?? [];

  const showingMyItems = activeCategory === "my-items";
  const categoryItems = showingMyItems ? [] : getItemsByCategory(activeCategory);
  const selectedInCategory = showingMyItems
    ? null
    : selections[activeCategory];

  const selectItem = (itemId: string) => {
    if (activeCategory === "my-items") return;
    const categoryId = activeCategory;
    setMiniroomData((prev) => {
      const isDeselect = prev.selections[categoryId] === itemId;
      const nextSelections = {
        ...prev.selections,
        [categoryId]: isDeselect ? null : itemId,
      };
      if (!isDeselect) {
        return { ...prev, selections: nextSelections };
      }
      const nextOffsets = { ...prev.offsets };
      delete nextOffsets[categoryId];
      return { ...prev, selections: nextSelections, offsets: nextOffsets };
    });
  };

  const toggleInventoryPlacement = (item: HandMadeItem) => {
    if (!canPlaceAsInventoryDecor(item)) return;
    setMiniroomData((prev) => {
      const placements = prev.inventoryPlacements ?? [];
      const existingIndex = placements.findIndex(placement => placement.itemId === item.id);
      if (existingIndex >= 0) {
        return {
          ...prev,
          inventoryPlacements: placements.filter((_, index) => index !== existingIndex),
        };
      }
      return {
        ...prev,
        inventoryPlacements: [...placements, defaultInventoryPlacement(item.id, placements.length)],
      };
    });
  };

  const resolveSelectionItem = (categoryId: RoomCategoryId, itemId: string | null) => {
    if (!itemId) return undefined;
    return getItemById(itemId);
  };

  const resetRoom = () => {
    setMiniroomData({ ...EMPTY_MINIROOM_DATA });
    setShowResetConfirm(false);
  };

  const hasAnySelection =
    inventoryPlacements.length > 0 ||
    (Object.keys(selections) as RoomCategoryId[]).some((categoryId) => {
      const id = selections[categoryId];
      if (!id) return false;
      const item = resolveSelectionItem(categoryId, id);
      return !!item && roomItemHasVisual(item);
    });

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{
      background: DIARY_PAPER_BG,
    }}>
      {/* header */}
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(128,224,176,0.3)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.45rem", color: "#40b080" }}>★</span>
          <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.7rem", color: "#40b080", letterSpacing: "0.12em" }}>MINI ROOM</span>
        </div>
        <div className="flex items-center gap-1.5">
          {hasAnySelection && (
            <button
              onClick={() => setShowResetConfirm(true)}
              title="방 꾸미기 초기화"
              className="px-2.5 py-0.5 rounded-full"
              style={{
                fontFamily: FONT_UI,
                fontSize: "0.52rem",
                fontWeight: 700,
                color: "var(--diary-dark)",
                background: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(var(--diary-mid-rgb),0.25)",
                minWidth: 52,
              }}
            >
              ↺ 리셋
            </button>
          )}
          <span style={{ fontFamily: FONT_UI, fontSize: "0.45rem", color: "#80b0a0" }}>
            카테고리 선택 → 아이템 교체 · 드래그로 위치 조정
          </span>
        </div>
      </div>

      {/* room canvas — grows to fill available height */}
      <div className="flex-1 min-h-[340px] rounded-xl overflow-hidden" style={{
        border: "1.5px solid rgba(128,224,176,0.35)",
        background: "var(--diary-surface)",
        boxShadow: "inset 0 2px 8px rgba(128,224,176,0.08)",
      }}>
        <RoomCanvas
          selections={selections}
          offsets={miniroomData.offsets}
          inventoryPlacements={inventoryPlacements}
          inventoryById={inventoryById}
          fillHeight
          editableItems
          onItemOffsetChange={(categoryId, offset) => {
            setMiniroomData((prev) => ({
              ...prev,
              offsets: { ...prev.offsets, [categoryId]: offset },
            }));
          }}
          onInventoryPlacementChange={(itemId, position) => {
            setMiniroomData((prev) => ({
              ...prev,
              inventoryPlacements: (prev.inventoryPlacements ?? []).map(placement =>
                placement.itemId === itemId ? { ...placement, ...position } : placement,
              ),
            }));
          }}
        />
      </div>

      {/* category tabs — horizontal scroll */}
      <div className="rounded-xl px-2 pt-1.5 pb-1 flex-shrink-0" style={{
        background: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(128,224,176,0.25)",
      }}>
        <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
          <button
            onClick={() => setActiveCategory("my-items")}
            className="flex-shrink-0 px-2.5 py-1 rounded-full flex items-center gap-1"
            style={{
              fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 600,
              background: showingMyItems ? "linear-gradient(90deg, #7c3aed, #9b6dff)" : "rgba(124,58,237,0.08)",
              color: showingMyItems ? "white" : "#6a4090",
              border: showingMyItems ? "none" : "1px solid rgba(124,58,237,0.2)",
              transition: "all 0.15s",
            }}
          >
            내 아이템
            {inventoryRoomItems.length > 0 && !showingMyItems && (
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#7c3aed", display: "inline-block" }} />
            )}
          </button>
          {ROOM_CATEGORIES.map((cat) => {
            const on = activeCategory === cat.id;
            const filled = (() => {
              const id = selections[cat.id];
              if (!id) return false;
              const item = resolveSelectionItem(cat.id, id);
              return !!item && roomItemHasVisual(item);
            })();
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="flex-shrink-0 px-2.5 py-1 rounded-full flex items-center gap-1"
                style={{
                  fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 600,
                  background: on ? "linear-gradient(90deg, #40b080, #60d0a0)" : "rgba(128,224,176,0.1)",
                  color: on ? "white" : "#508870",
                  border: on ? "none" : "1px solid rgba(128,224,176,0.25)",
                  transition: "all 0.15s",
                }}
              >
                {cat.label}
                {filled && !on && (
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#40b080", display: "inline-block" }} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* item list for active category — horizontal scroll */}
      <div className="rounded-xl p-2 flex-shrink-0" style={{
        background: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(128,224,176,0.25)",
      }}>
        <div className="flex items-center gap-1 mb-1.5">
          <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.3rem", color: "#40b080", marginRight: 2 }}>ITEM</span>
          <span style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "#80b0a0" }}>
            {showingMyItems ? "내 아이템" : ROOM_CATEGORIES.find((c) => c.id === activeCategory)?.label}
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "thin" }}>
          {showingMyItems ? (
            inventoryRoomItems.length === 0 ? (
              <p style={{ fontFamily: FONT_UI, fontSize: "0.44rem", color: "#80b0a0", padding: "4px 2px" }}>
                보유한 아이템이 없어요 · 전체 상점에서 구매해 보세요
              </p>
            ) : (
              inventoryRoomItems.map((item) => {
                const placeable = canPlaceAsInventoryDecor(item);
                const on = inventoryPlacements.some(placement => placement.itemId === item.id);
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => toggleInventoryPlacement(item)}
                    className="flex-shrink-0 flex flex-col items-center gap-0.5 w-11"
                    whileTap={placeable ? { scale: 0.92 } : undefined}
                    title={placeable ? item.label : `${item.label} (배치 불가)`}
                    style={{ opacity: placeable ? 1 : 0.55, cursor: placeable ? "pointer" : "default" }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform overflow-hidden"
                      style={{
                        background: on ? `${item.color}33` : "rgba(124,58,237,0.08)",
                        border: on ? `2px solid ${item.color}` : "1.5px solid rgba(124,58,237,0.2)",
                        transform: on ? "scale(1.08)" : undefined,
                      }}
                    >
                      <HandMadeItemPreview item={item} size={32} />
                    </div>
                    <span style={{
                      fontFamily: FONT_UI, fontSize: "0.42rem", fontWeight: on ? 700 : 500,
                      color: on ? item.color : "#6a4090", whiteSpace: "nowrap", maxWidth: 48, overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {item.label}
                    </span>
                  </motion.button>
                );
              })
            )
          ) : (
          categoryItems.map((item) => {
            const on = selectedInCategory === item.id;
            return (
              <motion.button
                key={item.id}
                onClick={() => selectItem(item.id)}
                className="flex-shrink-0 flex flex-col items-center gap-0.5 w-11"
                whileTap={{ scale: 0.92 }}
                title={item.label}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform"
                  style={{
                    background: on ? `${item.color}33` : "rgba(128,224,176,0.08)",
                    border: on ? `2px solid ${item.color}` : "1.5px solid rgba(128,224,176,0.2)",
                    transform: on ? "scale(1.08)" : undefined,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{item.preview}</span>
                </div>
                <span style={{
                  fontFamily: FONT_UI, fontSize: "0.42rem", fontWeight: on ? 700 : 500,
                  color: on ? item.color : "#508870", whiteSpace: "nowrap", maxWidth: 48, overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {item.label}
                </span>
              </motion.button>
            );
          })
          )}
        </div>
      </div>

      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent
          className="max-w-[calc(100%-2rem)] sm:max-w-sm"
          style={{
            background: DIARY_PAPER_BG,
            border: "1px solid rgba(128,224,176,0.35)",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: FONT_UI, fontSize: "0.78rem", fontWeight: 900, color: "#308860" }}>
              방을 초기화하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#508870", lineHeight: 1.55 }}>
              배치한 가구와 위치가 모두 지워지고 빈 방으로 돌아갑니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full px-4 py-2"
              style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 900 }}
            >
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={resetRoom}
              className="rounded-full px-4 py-2"
              style={{
                fontFamily: FONT_UI,
                fontSize: "0.5rem",
                fontWeight: 900,
                background: "linear-gradient(90deg,#ff4757,#ff6b81)",
                color: "white",
              }}
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
/* ═══════════════════════════════════════════
   DIARY PAGE
═══════════════════════════════════════════ */

function sortDiaryEntries(entries: DiaryEntry[]) {
  return [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function sortDiaryTrashEntries(entries: DiaryTrashEntry[]) {
  return [...entries].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt) || b.id.localeCompare(a.id));
}

function DiaryPage({ user }: { user: User }) {
  const [entries, setEntries] = useState<DiaryEntry[]>(() => loadDiaryEntries(user.id));
  const [trashEntries, setTrashEntries] = useState<DiaryTrashEntry[]>(() => loadDiaryTrashEntries(user.id));
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [selWeather, setSelWeather] = useState("맑음");
  const [content, setContent] = useState("");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState<DiaryEntry | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);

  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\. /g, ".").replace(".", ".");

  const persistEntries = (next: DiaryEntry[]) => {
    const sorted = sortDiaryEntries(next);
    setEntries(sorted);
    saveDiaryEntries(user.id, sorted);
  };

  const persistTrash = (next: DiaryTrashEntry[]) => {
    const sorted = sortDiaryTrashEntries(next);
    setTrashEntries(sorted);
    saveDiaryTrashEntries(user.id, sorted);
  };

  useEffect(() => {
    const localEntries = loadDiaryEntries(user.id);
    const localTrash = loadDiaryTrashEntries(user.id);
    setEntries(localEntries);
    setTrashEntries(localTrash);
    if (!isSupabaseConfigured()) return;

    let cancelled = false;
    (async () => {
      const remote = await fetchDiaryEntries(user.id);
      if (cancelled) return;

      const trashedIds = new Set(localTrash.map((entry) => entry.id));
      const byId = new Map<string, DiaryEntry>();
      for (const entry of remote) {
        if (!trashedIds.has(entry.id)) byId.set(entry.id, entry);
      }
      for (const entry of localEntries) {
        if (!trashedIds.has(entry.id) && !byId.has(entry.id)) {
          byId.set(entry.id, entry);
          void upsertDiaryEntry(user.id, entry);
        }
      }

      const merged = sortDiaryEntries(Array.from(byId.values()));
      saveDiaryEntries(user.id, merged);
      setEntries(merged);
    })();

    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const saveEntry = async () => {
    if (!content.trim() || saving) return;
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const entry: DiaryEntry = {
      id: crypto.randomUUID(),
      date,
      weather: selWeather,
      privacy,
      content: content.trim(),
      stickers: [],
    };
    const next = [entry, ...entries];
    persistEntries(next);
    setContent("");
    setSyncError(null);

    if (isSupabaseConfigured()) {
      setSaving(true);
      const result = await upsertDiaryEntry(user.id, entry);
      setSaving(false);
      if (!result.ok) setSyncError(result.error);
    }
  };

  const toggleEntryPrivacy = async (entryId: string) => {
    const target = entries.find((entry) => entry.id === entryId);
    if (!target) return;
    const updated: DiaryEntry = {
      ...target,
      privacy: target.privacy === "private" ? "public" : "private",
    };
    const next = entries.map((entry) => (entry.id === entryId ? updated : entry));
    persistEntries(next);
    setSyncError(null);

    if (isSupabaseConfigured()) {
      const result = await upsertDiaryEntry(user.id, updated);
      if (!result.ok) setSyncError(result.error);
    }
  };

  const openDeleteConfirm = (entryId: string) => {
    const target = entries.find((entry) => entry.id === entryId);
    if (!target) return;
    setConfirmDeleteEntry(target);
  };

  const handleConfirmDeleteEntry = () => {
    if (!confirmDeleteEntry) return;
    const deletedAt = new Date().toISOString();
    const nextEntries = entries.filter((entry) => entry.id !== confirmDeleteEntry.id);
    const nextTrash = [
      ...trashEntries.filter((entry) => entry.id !== confirmDeleteEntry.id),
      { ...confirmDeleteEntry, deletedAt },
    ];
    persistEntries(nextEntries);
    persistTrash(nextTrash);
    setConfirmDeleteEntry(null);
    setSyncError(null);
  };

  const handleRestoreEntry = (entryId: string) => {
    const target = trashEntries.find((entry) => entry.id === entryId);
    if (!target) return;
    const restored: DiaryEntry = {
      id: target.id,
      date: target.date,
      weather: target.weather,
      privacy: target.privacy,
      content: target.content,
      stickers: target.stickers,
    };
    persistTrash(trashEntries.filter((entry) => entry.id !== entryId));
    persistEntries([restored, ...entries]);
    setSyncError(null);
  };

  const handleEmptyTrash = async () => {
    if (trashEntries.length === 0) {
      setConfirmEmptyTrash(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      persistTrash([]);
      setConfirmEmptyTrash(false);
      return;
    }

    const results = await Promise.all(
      trashEntries.map(async (entry) => ({
        entry,
        result: await deleteDiaryEntry(user.id, entry.id),
      })),
    );
    const failed = results.filter(({ result }) => !result.ok).map(({ entry }) => entry);
    persistTrash(failed);
    setSyncError(failed.length > 0 ? "휴지통 비우기에 실패한 항목이 있어요." : null);
    setConfirmEmptyTrash(false);
  };

  const fmtDate = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${y}년 ${m}월 ${day}일`;
  };

  return (
    <div className="relative h-full flex flex-col" style={{ background: DIARY_PAPER_BG }}>
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 border-b flex-shrink-0" style={{ borderColor: "rgba(255,160,80,0.2)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.45rem", color: "#e08040" }}>★</span>
          <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.7rem", color: "#e08040", letterSpacing: "0.1em" }}>DIARY</span>
        </div>
        <button onClick={() => setPrivacy((p) => (p === "public" ? "private" : "public"))}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full"
          style={{
            fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 700,
            background: privacy === "private" ? "linear-gradient(90deg,#555,#333)" : "linear-gradient(90deg,#ff4757,#ff6b81)",
            color: "white", boxShadow: "0 1px 6px rgba(0,0,0,0.15)",
          }}>
          {privacy === "private" ? "🔒 비공개" : "🔓 공개"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 pb-16 flex flex-col gap-3" style={{ minHeight: 0 }}>
        {syncError && (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#c04040" }}>
            동기화 실패: {syncError} (로컬에는 저장됐어요. Supabase에 diary_entries SQL을 실행했는지 확인해 주세요.)
          </p>
        )}

        <div className="rounded-2xl p-3 flex flex-col gap-2 flex-shrink-0" style={{
          background: "rgba(255,255,255,0.85)",
          border: "1.5px solid rgba(255,160,80,0.3)",
          boxShadow: "0 2px 12px rgba(255,130,60,0.08)",
        }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.35rem", color: "#e08040" }}>📅</span>
              <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.6rem", color: "#c06030" }}>{today}</span>
            </div>
            <div className="flex gap-0.5">
              {WEATHER_OPTIONS.map((w) => (
                <button key={w} onClick={() => setSelWeather(w)} title={w}
                  className="rounded-lg flex items-center justify-center transition-all"
                  style={{
                    width: 22, height: 22,
                    background: selWeather === w ? "rgba(255,160,80,0.25)" : "transparent",
                    border: selWeather === w ? "1.5px solid rgba(255,130,60,0.5)" : "1px solid transparent",
                    padding: 0,
                  }}>
                  <WeatherPixelIcon weather={w} size={16} />
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="오늘 하루는 어땠나요? ✏️"
            rows={4}
            className="w-full resize-none outline-none rounded-xl px-2.5 py-2"
            style={{
              fontFamily: FONT_UI, fontSize: "0.62rem", color: "#5a3820", lineHeight: 1.8,
              background: "rgba(255,248,240,0.95)",
              border: "1px solid rgba(255,180,100,0.2)",
            }}
          />

          <div className="flex items-center justify-end">
            <button onClick={() => void saveEntry()}
              className="px-3 py-1 rounded-full text-white"
              style={{
                fontFamily: FONT_UI, fontSize: "0.55rem", fontWeight: 700,
                background: content.trim() ? "linear-gradient(90deg,#ff8040,#ff2d78)" : "rgba(200,180,170,0.5)",
                boxShadow: content.trim() ? "0 2px 8px rgba(255,100,40,0.3)" : "none",
                transition: "all 0.2s",
              }}>
              {saving ? "저장 중…" : "저장 ✦"}
            </button>
          </div>
        </div>

        {entries.length === 0 && (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.55rem", color: "#c09070", textAlign: "center", padding: "12px 0" }}>
            아직 작성한 일기가 없어요. 위에서 첫 일기를 남겨 보세요.
          </p>
        )}

        {entries.map((entry, i) => (
          <SwipeableDiaryEntry
            key={entry.id}
            entry={entry}
            index={i}
            fmtDate={fmtDate}
            onTogglePrivacy={() => void toggleEntryPrivacy(entry.id)}
            onRequestDelete={() => openDeleteConfirm(entry.id)}
          />
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-30">
        <button
          type="button"
          onClick={() => setShowTrash(true)}
          className="pointer-events-auto rounded-full px-3 py-2 flex items-center justify-center gap-1.5"
          style={{
            fontFamily: FONT_UI,
            fontSize: "0.5rem",
            fontWeight: 900,
            color: "#8a4b1f",
            background: trashEntries.length > 0 ? "linear-gradient(90deg, rgba(255,206,160,0.98), rgba(255,230,190,0.98))" : "rgba(240,226,214,0.95)",
            border: "1px solid rgba(255,160,80,0.24)",
            boxShadow: "0 2px 8px rgba(255,130,60,0.10)",
          }}
        >
          <span style={{ fontSize: 12 }}>🗑️</span>
          {trashEntries.length > 0 && (
            <span
              className="rounded-full px-1.5 py-0.5"
              style={{
                fontSize: "0.42rem",
                fontWeight: 900,
                color: "white",
                background: "#ff6b81",
              }}
            >
              {trashEntries.length}
            </span>
          )}
        </button>
      </div>

      <Dialog open={showTrash} onOpenChange={setShowTrash}>
        <DialogContent
          className="p-0 overflow-hidden"
          style={{
            width: "min(92vw, 360px)",
            height: "min(72vh, 500px)",
            maxWidth: "calc(100vw - 1.5rem)",
            maxHeight: "calc(100vh - 1.5rem)",
            background: "linear-gradient(180deg, #fffaf4, #fff2e6)",
            border: "1px solid rgba(255,160,80,0.22)",
          }}
        >
          <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-2" style={{ borderBottom: "1px solid rgba(255,160,80,0.14)" }}>
            <div>
              <DialogTitle style={{ fontFamily: FONT_UI, fontSize: "0.72rem", fontWeight: 900, color: "#8a4b1f" }}>
                휴지통
              </DialogTitle>
              <DialogDescription style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#b06a3f", marginTop: 4 }}>
                삭제한 다이어리를 복구하거나 완전히 비울 수 있어요.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => setConfirmEmptyTrash(true)}
              disabled={trashEntries.length === 0}
              className="rounded-full px-2.5 py-1.5"
              style={{
                fontFamily: FONT_UI,
                fontSize: "0.48rem",
                fontWeight: 900,
                color: trashEntries.length === 0 ? "rgba(138,75,31,0.35)" : "white",
                background: trashEntries.length === 0 ? "rgba(240,226,214,0.9)" : "linear-gradient(90deg,#ff6b81,#ff4757)",
                boxShadow: trashEntries.length === 0 ? "none" : "0 2px 8px rgba(255,71,87,0.24)",
              }}
            >
              휴지통 비우기
            </button>
          </div>
          <div className="max-h-[58vh] overflow-y-auto px-4 py-3">
            {trashEntries.length === 0 ? (
              <div className="py-10 text-center">
                <p style={{ fontFamily: FONT_UI, fontSize: "0.55rem", color: "#b8845a" }}>휴지통이 비어 있어요.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {trashEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-xl px-3 py-2"
                    style={{
                      background: "rgba(255,255,255,0.78)",
                      border: "1px solid rgba(255,160,80,0.16)",
                      boxShadow: "0 1px 6px rgba(255,130,60,0.05)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p style={{ fontFamily: FONT_UI, fontSize: "0.55rem", fontWeight: 800, color: "#8a4b1f" }}>
                          {entry.date}
                        </p>
                        <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", color: "#b06a3f", marginTop: 2, lineHeight: 1.45 }}>
                          {entry.content}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreEntry(entry.id)}
                        className="rounded-full px-2 py-1 flex-shrink-0"
                        style={{
                          fontFamily: FONT_UI,
                          fontSize: "0.45rem",
                          fontWeight: 900,
                          color: "white",
                          background: "linear-gradient(90deg,#80c8ff,#5090d0)",
                          boxShadow: "0 2px 8px rgba(80,144,208,0.18)",
                        }}
                      >
                        복구
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDeleteEntry} onOpenChange={(open) => !open && setConfirmDeleteEntry(null)}>
        <AlertDialogContent
          className="max-w-[calc(100%-2rem)] sm:max-w-sm"
          style={{
            background: "linear-gradient(180deg, #fffaf4, #fff2e6)",
            border: "1px solid rgba(255,160,80,0.18)",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: FONT_UI, fontSize: "0.78rem", fontWeight: 900, color: "#8a4b1f" }}>
              다이어리를 삭제할까요?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#b06a3f", lineHeight: 1.55 }}>
              삭제한 일기는 휴지통으로 이동합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full px-4 py-2"
              style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 900 }}
            >
              아니오
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteEntry}
              className="rounded-full px-4 py-2"
              style={{
                fontFamily: FONT_UI,
                fontSize: "0.5rem",
                fontWeight: 900,
                background: "linear-gradient(90deg,#ff4757,#ff6b81)",
                color: "white",
              }}
            >
              네
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmEmptyTrash} onOpenChange={setConfirmEmptyTrash}>
        <AlertDialogContent
          className="max-w-[calc(100%-2rem)] sm:max-w-sm"
          style={{
            background: "linear-gradient(180deg, #fffaf4, #fff2e6)",
            border: "1px solid rgba(255,160,80,0.18)",
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle style={{ fontFamily: FONT_UI, fontSize: "0.78rem", fontWeight: 900, color: "#8a4b1f" }}>
              휴지통을 비울까요?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#b06a3f", lineHeight: 1.55 }}>
              삭제한 다이어리가 모두 사라집니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full px-4 py-2"
              style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 900 }}
            >
              아니오
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleEmptyTrash()}
              className="rounded-full px-4 py-2"
              style={{
                fontFamily: FONT_UI,
                fontSize: "0.5rem",
                fontWeight: 900,
                background: "linear-gradient(90deg,#ff4757,#ff6b81)",
                color: "white",
              }}
            >
              네
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const SWIPE_DELETE_WIDTH = 68;

function SwipeableDiaryEntry({
  entry,
  index,
  fmtDate,
  onTogglePrivacy,
  onRequestDelete,
}: {
  entry: DiaryEntry;
  index: number;
  fmtDate: (d: string) => string;
  onTogglePrivacy: () => void;
  onRequestDelete: () => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const showDelete = offsetX < 0 || dragOffset < -4;

  return (
    <div className="relative rounded-2xl overflow-hidden flex-shrink-0">
      <div
        className="absolute inset-y-0 right-0 flex items-center justify-center"
        style={{
          width: SWIPE_DELETE_WIDTH,
          background: "linear-gradient(180deg, #ff4757, #ff6b81)",
          opacity: showDelete ? 1 : 0,
          pointerEvents: showDelete ? "auto" : "none",
          transition: "opacity 0.12s ease",
        }}
      >
        <button
          type="button"
          onClick={onRequestDelete}
          className="w-full h-full flex items-center justify-center text-white"
          style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 800 }}
        >
          삭제
        </button>
      </div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -SWIPE_DELETE_WIDTH, right: 0 }}
        dragElastic={0.08}
        onDrag={(_, info) => setDragOffset(info.offset.x)}
        onDragEnd={(_, info) => {
          const shouldOpen = info.offset.x < -SWIPE_DELETE_WIDTH / 2 || info.velocity.x < -400;
          setOffsetX(shouldOpen ? -SWIPE_DELETE_WIDTH : 0);
          setDragOffset(0);
        }}
        animate={{ x: offsetX }}
        transition={{ type: "spring", stiffness: 420, damping: 32, delay: index * 0.05 }}
        className="rounded-2xl overflow-hidden relative"
        style={{
          touchAction: "pan-y",
          background: "rgba(255,255,255,0.75)",
          border: "1px solid rgba(255,180,100,0.2)",
          boxShadow: "0 1px 8px rgba(255,130,60,0.06)",
        }}
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <div className="flex items-center justify-between px-3 py-1.5" style={{
          background: "linear-gradient(90deg, rgba(255,200,140,0.25), rgba(255,180,200,0.15))",
          borderBottom: "1px solid rgba(255,180,100,0.15)",
        }}>
          <div className="flex items-center gap-2">
            <WeatherPixelIcon weather={entry.weather} size={18} />
            <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.58rem", color: "#c06030" }}>{fmtDate(entry.date)}</span>
          </div>
          <button
            type="button"
            onClick={onTogglePrivacy}
            aria-label={entry.privacy === "private" ? "공개로 바꾸기" : "비공개로 바꾸기"}
            title={entry.privacy === "private" ? "비공개 상태" : "공개 상태"}
            className="rounded-full flex items-center justify-center transition-all"
            style={{
              width: 24,
              height: 24,
              fontSize: 12,
              background: entry.privacy === "private" ? "rgba(80,80,80,0.12)" : "rgba(255,128,64,0.14)",
              border: entry.privacy === "private" ? "1px solid rgba(80,80,80,0.22)" : "1px solid rgba(255,128,64,0.25)",
              cursor: "pointer",
            }}
          >
            {entry.privacy === "private" ? "🔒" : "🔓"}
          </button>
        </div>
        <div className="px-3 py-2">
          <p style={{ fontFamily: FONT_UI, fontSize: "0.6rem", color: "#6a4020", lineHeight: 1.7, paddingRight: 46 }}>{entry.content}</p>
          {entry.stickers.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap" style={{ paddingRight: 46 }}>
              {entry.stickers.map((s, j) => <span key={j} style={{ fontSize: 14 }}>{s}</span>)}
            </div>
          )}
          <button
            type="button"
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRequestDelete();
            }}
            className="absolute bottom-2 right-2 rounded-full px-2.5 py-1"
            style={{
              fontFamily: FONT_UI,
              fontSize: "0.45rem",
              fontWeight: 900,
              color: "white",
              background: "linear-gradient(90deg,#ff4757,#ff6b81)",
              boxShadow: "0 2px 8px rgba(255,71,87,0.28)",
              zIndex: 10,
            }}
          >
            삭제
          </button>
        </div>
      </motion.div>
    </div>
  );
}
type FriendNeighbor = {
  id: number;
  friendUserId?: string;
  name: string;
  color: string;
  avatar: LegacyAvatarConfig;
  avatarProfile?: AvatarProfile | null;
  inventory?: HandMadeItem[];
};

async function attachNeighborRemoteData(neighbors: FriendNeighbor[]): Promise<FriendNeighbor[]> {
  const friendIds = neighbors.map((neighbor) => neighbor.friendUserId).filter((id): id is string => !!id);
  if (friendIds.length === 0) return neighbors;

  const [avatars, inventories] = await Promise.all([
    fetchUserAvatars(friendIds),
    fetchUserInventories(friendIds),
  ]);

  return neighbors.map((neighbor) => ({
    ...neighbor,
    avatarProfile: neighbor.friendUserId
      ? storedToAvatarProfile(avatars.get(neighbor.friendUserId) ?? null)
      : null,
    inventory: neighbor.friendUserId ? inventories.get(neighbor.friendUserId) ?? [] : undefined,
  }));
}

function hashUserId(userId: string): number {
  return userId.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function storedFriendToNeighbor(friend: StoredFriend, index: number): FriendNeighbor {
  const presetIdx = index % AVATAR_PRESETS.length;
  const colorIdx = index % FRIEND_COLORS.length;
  return {
    id: hashUserId(friend.friendUserId),
    friendUserId: friend.friendUserId,
    name: friend.nickname,
    color: FRIEND_COLORS[colorIdx],
    avatar: AVATAR_PRESETS[presetIdx],
  };
}

function storedIlchonToNeighbor(ilchon: StoredIlchon, index: number): FriendNeighbor {
  return storedFriendToNeighbor(
    { friendUserId: ilchon.ilchonUserId, nickname: ilchon.nickname, addedAt: ilchon.addedAt },
    index,
  );
}

function IlchonAvatarGrid({
  ilchon,
  onlineIds,
  onVisitFriend,
  compact = false,
}: {
  ilchon: FriendNeighbor[];
  onlineIds: Set<string>;
  onVisitFriend: (nb: FriendNeighbor) => void;
  compact?: boolean;
}) {
  if (ilchon.length === 0) return null;

  return (
    <div
      className={`grid gap-1.5 ${compact ? "max-h-[56px] overflow-y-auto" : ""}`}
      style={{ gridTemplateColumns: compact ? "repeat(4, 1fr)" : "repeat(3, 1fr)", scrollbarWidth: "thin" }}
    >
      {ilchon.map((nb, i) => (
        <motion.button
          key={nb.friendUserId ?? String(nb.id)}
          type="button"
          onClick={() => onVisitFriend(nb)}
          className="flex flex-col items-center gap-0.5 rounded-lg py-1.5 px-1"
          style={{
            background: "rgba(255,255,255,0.78)",
            border: `1px solid ${nb.color}55`,
            boxShadow: `0 1px 4px ${nb.color}18`,
            cursor: "pointer",
          }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          whileHover={{ scale: 1.05, boxShadow: `0 2px 10px ${nb.color}33` }}
          whileTap={{ scale: 0.95 }}
        >
          <FriendAvatarThumb
            avatarProfile={nb.avatarProfile}
            legacyAvatar={nb.avatar}
            color={nb.color}
            size={compact ? 26 : 32}
            useBust={!!nb.friendUserId}
            showOnline={!!nb.friendUserId}
            isOnline={!!nb.friendUserId && onlineIds.has(nb.friendUserId)}
            userId={nb.friendUserId}
            inventory={nb.inventory}
          />
          <span
            style={{
              fontFamily: FONT_UI,
              fontWeight: 700,
              fontSize: compact ? "0.36rem" : "0.4rem",
              color: "#4a2060",
              textAlign: "center",
              lineHeight: 1.15,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "100%",
            }}
          >
            {nb.name}
          </span>
        </motion.button>
      ))}
    </div>
  );
}

function AddIlchonModal({
  userId,
  ilchonIds,
  pendingTargetIds,
  onClose,
  onSent,
}: {
  userId: string;
  ilchonIds: Set<string>;
  pendingTargetIds: Set<string>;
  onClose: () => void;
  onSent?: () => void;
}) {
  const [neighbors, setNeighbors] = useState<FriendNeighbor[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setNeighbors([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const friends = await loadFriends(userId);
      if (cancelled) return;
      const base = friends.map((friend, index) => storedFriendToNeighbor(friend, index));
      const neighborsWithRemote = await attachNeighborRemoteData(base);
      if (cancelled) return;
      setNeighbors(neighborsWithRemote);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const normalizedQuery = query.trim().toLowerCase();
  const candidates = neighbors.filter((nb) => {
    if (!nb.friendUserId) return false;
    if (ilchonIds.has(nb.friendUserId)) return false;
    if (pendingTargetIds.has(nb.friendUserId)) return false;
    if (!normalizedQuery) return true;
    return nb.name.toLowerCase().includes(normalizedQuery);
  });

  const handleSubmit = async () => {
    if (!selectedId || submitting) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    const result = await sendIlchonRequest(selectedId);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(`${result.nickname}님에게 일촌 신청을 보냈어요.`);
    setSelectedId(null);
    onSent?.();
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3"
      style={{ background: "rgba(80,40,120,0.45)" }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[240px] rounded-2xl p-3 flex flex-col gap-2 max-h-[85%]"
        style={{
          background: DIARY_PAPER_BG,
          border: "2px solid rgba(var(--diary-mid-rgb),0.25)",
          boxShadow: "0 8px 32px rgba(var(--diary-mid-rgb),0.2)",
        }}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span style={{ fontSize: 12 }}>💞</span>
          <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.62rem", color: "#6040a0" }}>일촌 추가하기</span>
        </div>
        <p style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "var(--diary-mid)", lineHeight: 1.4, flexShrink: 0 }}>
          이웃 중 한 명을 고르고 일촌 신청을 보내세요. 상대가 수락하면 일촌이 돼요.
        </p>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
          }}
          placeholder="이웃 닉네임 검색"
          className="w-full px-2.5 py-1.5 rounded-xl outline-none flex-shrink-0"
          style={{
            fontFamily: FONT_UI,
            fontSize: "0.55rem",
            fontWeight: 600,
            background: "rgba(255,255,255,0.9)",
            border: "1.5px solid rgba(var(--diary-mid-rgb),0.2)",
            color: "#4a2060",
          }}
        />
        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1" style={{ scrollbarWidth: "thin" }}>
          {loading ? (
            <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", color: "var(--diary-mid)", textAlign: "center", padding: "8px 0" }}>
              이웃 불러오는 중...
            </p>
          ) : candidates.length === 0 ? (
            <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", color: "var(--diary-mid)", textAlign: "center", lineHeight: 1.5, padding: "8px 0" }}>
              {neighbors.length === 0
                ? "이웃이 없어요.\n먼저 친구(이웃)를 추가해 주세요."
                : "일촌 신청 가능한 이웃이 없어요."}
            </p>
          ) : (
            candidates.map((nb) => {
              const isSelected = selectedId === nb.friendUserId;
              return (
                <button
                  key={nb.friendUserId}
                  type="button"
                  onClick={() => {
                    setSelectedId(nb.friendUserId ?? null);
                    setError(null);
                  }}
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left w-full"
                  style={{
                    background: isSelected ? "rgba(255,71,87,0.12)" : "rgba(255,255,255,0.75)",
                    border: isSelected ? "1.5px solid rgba(255,71,87,0.45)" : "1px solid rgba(var(--diary-mid-rgb),0.2)",
                  }}
                >
                  <FriendAvatarThumb
                    avatarProfile={nb.avatarProfile}
                    legacyAvatar={nb.avatar}
                    color={nb.color}
                    size={28}
                    useBust
                    userId={nb.friendUserId}
                    inventory={nb.inventory}
                  />
                  <span style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 700, color: "#4a2060", flex: 1 }}>
                    {nb.name}
                  </span>
                  <span style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: isSelected ? "#ff4757" : "#b0b8d8" }}>
                    {isSelected ? "●" : "○"}
                  </span>
                </button>
              );
            })
          )}
        </div>
        {error && (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.44rem", fontWeight: 700, color: "#ff4757", flexShrink: 0 }}>{error}</p>
        )}
        {success && (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.44rem", fontWeight: 700, color: "#3d8b5f", flexShrink: 0 }}>{success}</p>
        )}
        <div className="flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 py-1.5 rounded-xl"
            style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 600, color: "var(--diary-dark)", background: "rgba(var(--diary-mid-rgb),0.08)" }}
          >
            닫기
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!selectedId || submitting}
            className="flex-1 py-1.5 rounded-xl text-white"
            style={{
              fontFamily: FONT_UI,
              fontSize: "0.5rem",
              fontWeight: 700,
              background: "linear-gradient(90deg, #ff4757, #ff6b81)",
              opacity: !selectedId || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? "..." : "일촌 신청"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function IlchonPanel({
  ownerUserId,
  ownerName,
  currentUserId,
  onVisitFriend,
  excludeUserIds = [],
}: {
  ownerUserId: string;
  ownerName: string;
  currentUserId: string;
  onVisitFriend: (nb: FriendNeighbor) => void;
  excludeUserIds?: string[];
}) {
  const [ilchon, setIlchon] = useState<FriendNeighbor[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const excludeSet = useRef(new Set(excludeUserIds));
  excludeSet.current = new Set(excludeUserIds);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIlchon([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const ilchonRows = await loadIlchonList(ownerUserId);
      if (cancelled) return;

      const filtered = ilchonRows.filter((f) => !excludeSet.current.has(f.ilchonUserId));
      const neighbors = filtered.map((row, index) => storedIlchonToNeighbor(row, index));
      const friendIds = neighbors.map((n) => n.friendUserId).filter((id): id is string => !!id);

      const [avatars, online] = await Promise.all([
        fetchUserAvatars(friendIds),
        fetchOnlineUserIds(friendIds),
      ]);
      if (cancelled) return;

      setIlchon(
        neighbors.map((neighbor) => ({
          ...neighbor,
          avatarProfile: neighbor.friendUserId
            ? storedToAvatarProfile(avatars.get(neighbor.friendUserId) ?? null)
            : null,
        })),
      );
      setOnlineIds(online);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [ownerUserId, excludeUserIds.join(",")]);

  const handleRandomWave = () => {
    if (ilchon.length === 0) return;
    onVisitFriend(ilchon[Math.floor(Math.random() * ilchon.length)]);
  };

  return (
    <div
      className="rounded-xl flex flex-col gap-1.5 flex-1 min-h-0 p-2"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(var(--diary-main-rgb),0.18) 100%)",
        border: "1px solid rgba(var(--diary-mid-rgb),0.28)",
      }}
    >
      <div className="flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          <span style={{ fontSize: 11 }}>🌊</span>
          <p style={{ fontFamily: FONT_UI, fontSize: "0.44rem", fontWeight: 700, color: "var(--diary-dark)" }}>
            {ownerName}님의 일촌
          </p>
        </div>
        <motion.button
          type="button"
          onClick={handleRandomWave}
          disabled={loading || ilchon.length === 0}
          className="px-2 py-0.5 rounded-full flex-shrink-0 text-white"
          style={{
            fontFamily: FONT_UI,
            fontSize: "0.38rem",
            fontWeight: 700,
            background: "linear-gradient(90deg, var(--diary-dark), var(--diary-mid))",
            opacity: loading || ilchon.length === 0 ? 0.45 : 1,
          }}
          whileTap={ilchon.length > 0 ? { scale: 0.96 } : undefined}
        >
          파도타기 ↗
        </motion.button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
        {loading ? (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.44rem", color: "var(--diary-mid)", textAlign: "center", padding: "6px 0" }}>
            일촌 불러오는 중...
          </p>
        ) : ilchon.length === 0 ? (
          <div
            className="rounded-lg py-2 px-2 text-center"
            style={{ background: "rgba(255,255,255,0.55)", border: "1px dashed rgba(var(--diary-mid-rgb),0.25)" }}
          >
            <p style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "var(--diary-mid)", lineHeight: 1.45 }}>
              {ownerName}님의 일촌이 아직 없어요
            </p>
          </div>
        ) : (
          <IlchonAvatarGrid ilchon={ilchon} onlineIds={onlineIds} onVisitFriend={onVisitFriend} compact />
        )}
      </div>
    </div>
  );
}

function createLocalNeighbor(name: string, index: number): FriendNeighbor {
  return {
    id: Date.now() + index,
    name,
    color: FRIEND_COLORS[index % FRIEND_COLORS.length],
    avatar: AVATAR_PRESETS[index % AVATAR_PRESETS.length],
  };
}

const AVATAR_PRESETS: LegacyAvatarConfig[] = [
  { hairDark: "#2a1060", hairLight: "#7040c0", skin: "#ffe0c8", outfit: "#ffe060", outfitDark: "#e0c030", outfitInner: "#fff8b0", pants: "#9060d0" },
  { hairDark: "#103060", hairLight: "#4080c0", skin: "#ffc8a0", outfit: "#80c8ff", outfitDark: "#5090d0", outfitInner: "#c0e8ff", pants: "#4060a0" },
  { hairDark: "#1a4030", hairLight: "#40a080", skin: "#ffd8b8", outfit: "#80e0b0", outfitDark: "#50c090", outfitInner: "#c0ffe0", pants: "#308060" },
  { hairDark: "#501030", hairLight: "#c04080", skin: "#ffc8a0", outfit: "#ff80c8", outfitDark: "#ff60b8", outfitInner: "#ffe0f4", pants: "#c06090" },
  { hairDark: "#3d1a00", hairLight: "#5c2800", skin: "#ffc8a0", outfit: "#c8a0ff", outfitDark: "#a080e0", outfitInner: "#e8d8ff", pants: "#6040a0" },
  { hairDark: "#402010", hairLight: "#804030", skin: "#ffe0c0", outfit: "#ffa880", outfitDark: "#e08060", outfitInner: "#ffe0c0", pants: "#804040" },
  { hairDark: "#204040", hairLight: "#408080", skin: "#ffd0b0", outfit: "#80e8ff", outfitDark: "#50c0d0", outfitInner: "#c0f8ff", pants: "#306070" },
  { hairDark: "#402060", hairLight: "#8040a0", skin: "#ffe8d0", outfit: "#ffb0d0", outfitDark: "#ff80a0", outfitInner: "#ffe0f0", pants: "#804080" },
];

/* ═══════════════════════════════════════════
   HOME RIGHT — MINI ROOM + NEIGHBORS
═══════════════════════════════════════════ */
const FRIEND_COLORS = ["#ffe060", "#80c8ff", "#80e0b0", "#ff80c8", "#c8a0ff", "#ffa880", "#80e8ff", "#ffb0d0"];

const INITIAL_NEIGHBORS: FriendNeighbor[] = [
  { id: 1, name: "별빛소녀", color: "#ffe060", avatar: AVATAR_PRESETS[0] },
  { id: 2, name: "하늘이",   color: "#80c8ff", avatar: AVATAR_PRESETS[1] },
  { id: 3, name: "민트초코", color: "#80e0b0", avatar: AVATAR_PRESETS[2] },
  { id: 4, name: "핑크몽",   color: "#ff80c8", avatar: AVATAR_PRESETS[3] },
];

function guestbookEntryToFriend(entry: GuestbookEntryWithAvatar, friends: FriendNeighbor[] = []): FriendNeighbor {
  const matched = entry.authorId
    ? friends.find((n) => n.friendUserId === entry.authorId)
    : friends.find((n) => n.name === entry.name);
  if (matched) return matched;
  return {
    id: hashUserId(entry.authorId ?? entry.name),
    friendUserId: entry.authorId ?? undefined,
    name: entry.name,
    color: entry.color,
    avatar: AVATAR_PRESETS[0],
    avatarProfile: entry.avatarProfile ?? null,
  };
}

function FriendPhotoAlbum({ nb, user }: { nb: FriendNeighbor; user: User }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showReactionList, setShowReactionList] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [photos, setPhotos] = useState<StoredPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(!!nb.friendUserId && isSupabaseConfigured());
  const photoIds = useMemo(() => photos.map((p) => p.id), [photos]);
  const {
    views,
    likeCounts,
    likedByMe,
    comments,
    reactions,
    addView,
    toggleLike,
    addComment,
    removeComment,
    addReaction,
    removeReaction,
  } = usePhotoSocial(user.id, photoIds);

  const selectedPhoto = selectedIndex === null ? null : photos[selectedIndex];
  const selectedPhotoId = selectedPhoto?.id ?? null;
  const selectedReactions = selectedPhotoId ? reactions[selectedPhotoId] ?? [] : [];

  useEffect(() => {
    if (!nb.friendUserId || !isSupabaseConfigured()) {
      setPhotos([]);
      setLoadingPhotos(false);
      return;
    }

    let cancelled = false;
    setLoadingPhotos(true);
    fetchUserPhotos(nb.friendUserId).then((rows) => {
      if (cancelled) return;
      setPhotos(rows);
      setLoadingPhotos(false);
    });

    return () => {
      cancelled = true;
    };
  }, [nb.friendUserId]);

  const openFriendPhoto = (photo: StoredPhoto) => {
    const index = photos.findIndex((p) => p.id === photo.id);
    setSelectedIndex(index >= 0 ? index : null);
    setShowReactionList(false);
    setShowReactionPicker(false);
    void addView(photo.id);
  };

  const addFriendPhotoReaction = (emoticonId: number) => {
    if (!selectedPhotoId) return;
    void addReaction(selectedPhotoId, user.nickname, emoticonId);
    setShowReactionList(true);
    setShowReactionPicker(false);
  };

  const deleteMyFriendPhotoReaction = (reactionId: string) => {
    if (!selectedPhotoId) return;
    void removeReaction(selectedPhotoId, reactionId);
  };

  const handleAddComment = async (photoId: string, content: string) => {
    const result = await addComment(photoId, user.nickname, content);
    if (!result.ok) return { ok: false as const, error: result.error };
    return { ok: true as const };
  };

  return (
    <div className="relative h-full flex flex-col gap-2 p-2 rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${nb.color}33` }}>
      <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 700, color: "#e08000", flexShrink: 0 }}>
        {nb.name}의 사진첩 📷
      </p>
      <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {loadingPhotos ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 opacity-60">
            <p style={{ fontFamily: FONT_UI, fontSize: "0.55rem", color: "#c09040", textAlign: "center" }}>
              사진첩 불러오는 중...
            </p>
          </div>
        ) : photos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 opacity-60">
            <span style={{ fontSize: 28 }}>📷</span>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.55rem", color: "#c09040", textAlign: "center" }}>
              아직 사진이 없어요
            </p>
          </div>
        ) : (
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {photos.map((photo, i) => (
              <motion.button
                key={photo.id}
                type="button"
                onClick={() => openFriendPhoto(photo)}
                className="relative rounded-lg overflow-hidden aspect-square"
                style={{ border: `1.5px solid ${nb.color}44`, padding: 0 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <AlbumPhoto src={photo.src} />
                <span
                  className="absolute right-1 bottom-1 rounded-full px-1.5 py-0.5"
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: "0.38rem",
                    fontWeight: 900,
                    color: "#fff8e8",
                    background: "rgba(42,33,20,0.72)",
                    border: "1px solid rgba(255,255,255,0.26)",
                    boxShadow: "0 1px 5px rgba(0,0,0,0.24)",
                  }}
                >
                  조회 {views[photo.id] ?? 0}
                </span>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedPhoto && selectedIndex !== null && (
          <motion.div
            className="absolute inset-0 z-50 flex flex-col p-3"
            style={{ background: "rgba(42,33,20,0.92)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="relative flex items-center justify-between mb-2 flex-shrink-0">
              <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.36rem", color: "#f7efd9" }}>PHOTO</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowReactionList((value) => !value);
                    setShowReactionPicker(false);
                  }}
                  className="px-2.5 py-1 rounded-full"
                  style={{
                    fontFamily: FONT_UI,
                    fontSize: "0.5rem",
                    fontWeight: 800,
                    background: showReactionList ? `linear-gradient(90deg,${nb.color},${nb.color}aa)` : "rgba(255,255,255,0.12)",
                    color: "#f7efd9",
                    border: "1px solid rgba(247,239,217,0.18)",
                  }}
                >
                  공감 {selectedReactions.length}
                </button>
                <button
                  onClick={() => {
                    setSelectedIndex(null);
                    setShowReactionList(false);
                    setShowReactionPicker(false);
                  }}
                  className="px-2.5 py-1 rounded-full"
                  style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 700, background: "rgba(255,255,255,0.12)", color: "#f7efd9" }}
                >
                  닫기
                </button>
              </div>
              <AnimatePresence>
                {showReactionList && (
                  <motion.div
                    className="absolute right-0 top-[calc(100%+6px)] z-30 rounded-xl p-2"
                    style={{
                      width: 226,
                      maxWidth: "calc(100vw - 32px)",
                      maxHeight: 270,
                      overflowY: "auto",
                      background: "rgba(255,248,232,0.96)",
                      border: "1.5px solid rgba(176,138,74,0.34)",
                      boxShadow: "0 10px 28px rgba(42,33,20,0.32)",
                    }}
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 900, color: "#8a6334" }}>공감한 친구</span>
                      <button
                        type="button"
                        onClick={() => {
                          setShowReactionList(false);
                          setShowReactionPicker(false);
                        }}
                        className="w-5 h-5 rounded-full"
                        style={{ background: "rgba(176,138,74,0.14)", color: "#8a6334", fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 900 }}
                      >
                        ×
                      </button>
                    </div>
                    {selectedReactions.length === 0 ? (
                      <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#8a6334", lineHeight: 1.45, textAlign: "center", padding: "10px 4px" }}>
                        아직 공감한 친구가 없어요
                      </p>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {selectedReactions.map((reaction) => {
                          const emoticon = SAMPLE_EMOTICONS.find((item) => item.id === reaction.emoticonId) ?? SAMPLE_EMOTICONS[0];
                          const isMine = reaction.actorId === user.id;
                          return (
                            <div key={reaction.id} className="flex items-center gap-2 rounded-lg px-2 py-1" style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(176,138,74,0.18)" }}>
                              <PixelEmoticonIcon icon={emoticon.icon} color={emoticon.color} size={26} />
                              <span style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 800, color: "#5b4b2d", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                {reaction.actorName}
                              </span>
                              {isMine && (
                                <button
                                  type="button"
                                  onClick={() => deleteMyFriendPhotoReaction(reaction.id)}
                                  className="rounded-full px-1.5 py-0.5"
                                  style={{ background: "rgba(255,71,87,0.12)", color: "#ff4757", fontFamily: FONT_UI, fontSize: "0.42rem", fontWeight: 900 }}
                                >
                                  삭제
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowReactionPicker((value) => !value)}
                      className="mt-2 w-full rounded-lg py-1.5"
                      style={{
                        background: showReactionPicker ? `linear-gradient(90deg,${nb.color},${nb.color}aa)` : ACCENT_BTN_BG,
                        color: "white",
                        fontFamily: FONT_UI,
                        fontSize: "0.52rem",
                        fontWeight: 900,
                        boxShadow: ACCENT_BTN_SHADOW,
                      }}
                    >
                      공감하기
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {showReactionPicker && (
                  <motion.div
                    className="absolute right-0 top-[calc(100%+282px)] z-40 rounded-xl p-2"
                    style={{
                      width: 226,
                      maxWidth: "calc(100vw - 32px)",
                      background: "rgba(42,33,20,0.86)",
                      border: "1px solid rgba(247,239,217,0.24)",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
                      backdropFilter: "blur(8px)",
                    }}
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  >
                    <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                      {SAMPLE_EMOTICONS.map((emoticon) => (
                        <button
                          key={"friend-photo-reaction-" + emoticon.id}
                          type="button"
                          onClick={() => addFriendPhotoReaction(emoticon.id)}
                          aria-label={emoticon.label}
                          className="rounded-lg flex items-center justify-center"
                          style={{
                            height: 38,
                            background: "rgba(255,255,255,0.12)",
                            border: "1px solid rgba(247,239,217,0.14)",
                          }}
                        >
                          <PixelEmoticonIcon icon={emoticon.icon} color={emoticon.color} size={28} />
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div
              className="relative flex-1 rounded-xl overflow-hidden"
              style={{ minHeight: 0, border: "1.5px solid rgba(255,255,255,0.22)", background: "#fff8e8" }}
            >
              <AlbumPhoto src={selectedPhoto.src} />
            </div>

            {selectedPhotoId && (
              <PhotoSocialToolbar
                photoId={selectedPhotoId}
                user={user}
                viewCount={views[selectedPhotoId] ?? 0}
                likeCount={likeCounts[selectedPhotoId] ?? 0}
                likedByMe={likedByMe[selectedPhotoId] ?? false}
                comments={comments[selectedPhotoId] ?? []}
                onToggleLike={toggleLike}
                onAddComment={handleAddComment}
                onDeleteComment={removeComment}
                accentColor={nb.color}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type VisitMode = "miniroom" | "guest" | "diary" | "photo" | "shop";

function FriendVisitShopPanel({
  sellerId,
  sellerNickname,
  accentColor,
  buyer,
  onPurchaseComplete,
}: {
  sellerId: string;
  sellerNickname: string;
  accentColor: string;
  buyer: User;
  onPurchaseComplete?: () => void;
}) {
  const [catalog, setCatalog] = useState<{ listed: ShopListingWithItem[]; unlisted: HandMadeItem[] }>({
    listed: [],
    unlisted: [],
  });
  const [loading, setLoading] = useState(true);
  const [coins, setCoins] = useState(() => loadCoins(buyer.id));
  const [ownedIds, setOwnedIds] = useState<Set<string>>(() => loadOwnedListingIds(buyer.id));
  const [toast, setToast] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const refreshCatalog = async () => {
    setLoading(true);
    const next = await fetchFriendShopCatalog(sellerId, sellerNickname);
    setCatalog(next);
    setLoading(false);
  };

  useEffect(() => {
    void refreshCatalog();
  }, [sellerId, sellerNickname]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void syncBuyerInventoryFromServer(buyer.id).then((remoteCoins) => {
      if (remoteCoins !== null) setCoins(remoteCoins);
      setOwnedIds(loadOwnedListingIds(buyer.id));
    });
  }, [buyer.id]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = (message: string) => setToast(message);

  const handleBuy = async (listing: ShopListingWithItem) => {
    if (listing.sellerId === buyer.id) {
      showToast("내 아이템은 구매할 수 없어요");
      return;
    }
    if (hasPurchasedShopListing(buyer.id, listing, ownedIds)) {
      showToast("이미 구매한 아이템이에요");
      return;
    }
    if (coins < listing.price) {
      showToast("네잎클로버가 부족해요");
      return;
    }

    setBuyingId(listing.id);
    const result = await completePlayerShopPurchase(buyer.id, listing.id);
    if (!result.ok) {
      showToast(result.error);
      setBuyingId(null);
      return;
    }

    setCoins(result.buyerCoins);
    setOwnedIds(loadOwnedListingIds(buyer.id));
    showToast(`"${result.listing.item.label}" 구매 완료!`);
    setBuyingId(null);
    onPurchaseComplete?.();
  };

  const renderListedItem = (listing: ShopListingWithItem) => {
    const isSelf = listing.sellerId === buyer.id;
    const owned = !isSelf && hasPurchasedShopListing(buyer.id, listing, ownedIds);
    return (
      <div
        key={listing.id}
        className="rounded-xl flex items-center gap-2"
        style={{
          padding: "8px 10px",
          background: "rgba(255,255,255,0.85)",
          border: `1px solid ${accentColor}33`,
        }}
      >
        <div
          className="rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ width: 40, height: 40, background: "rgba(255,240,245,0.8)" }}
        >
          <HandMadeItemPreview item={listing.item} size={30} />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 700, color: "#4a3060" }}>{listing.item.label}</p>
          <p className="inline-flex items-center gap-0.5" style={{ fontFamily: FONT_UI, fontSize: "0.4rem", color: "#9070b0" }}>
            <CloverCoinIcon size={10} />
            {listing.price}
          </p>
        </div>
        <button
          type="button"
          disabled={isSelf || owned || buyingId === listing.id}
          onClick={() => void handleBuy(listing)}
          className="rounded-lg text-white flex-shrink-0"
          style={{
            padding: "4px 10px",
            fontFamily: FONT_UI,
            fontSize: "0.42rem",
            fontWeight: 800,
            background: isSelf || owned
              ? "rgba(180,160,200,0.5)"
              : `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`,
            cursor: isSelf || owned ? "default" : "pointer",
            opacity: buyingId === listing.id ? 0.7 : 1,
          }}
        >
          {buyingId === listing.id ? "..." : isSelf ? "내 상품" : owned ? "보유중" : (
            <span className="inline-flex items-center gap-0.5">
              <CloverCoinIcon size={11} />
              구매
            </span>
          )}
        </button>
      </div>
    );
  };

  const renderUnlistedItem = (item: HandMadeItem) => (
    <div
      key={item.id}
      className="rounded-xl flex items-center gap-2 opacity-80"
      style={{
        padding: "8px 10px",
        background: "rgba(255,255,255,0.65)",
        border: "1px dashed rgba(160,140,180,0.35)",
      }}
    >
      <div
        className="rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ width: 40, height: 40, background: "rgba(244,240,255,0.85)" }}
      >
        <HandMadeItemPreview item={item} size={30} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 700, color: "#5a4068" }}>{item.label}</p>
        <p style={{ fontFamily: FONT_UI, fontSize: "0.38rem", color: "#9a80b0" }}>{item.cat}</p>
      </div>
      <span
        className="rounded-lg flex-shrink-0 px-2 py-1"
        style={{
          fontFamily: FONT_UI,
          fontSize: "0.38rem",
          fontWeight: 700,
          color: "#8a7aa0",
          background: "rgba(140,120,160,0.12)",
        }}
      >
        미판매중
      </span>
    </div>
  );

  return (
    <div className="h-full flex flex-col gap-2 p-3 rounded-xl overflow-y-auto relative" style={{ background: "rgba(255,255,255,0.72)", border: `1px solid ${accentColor}33` }}>
      <div className="flex items-center justify-between flex-shrink-0">
        <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 700, color: accentColor }}>
          {sellerNickname}의 상점
        </p>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{
          background: "linear-gradient(90deg, #ffe080, #ffd060)",
          border: "1px solid rgba(255,180,0,0.35)",
        }}>
          <CloverCoinIcon size={12} />
          <span style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 800, color: "#a06010" }}>{coins}</span>
        </div>
      </div>

      {loading ? (
        <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#9a80b0", textAlign: "center", padding: "16px 0" }}>
          상점 불러오는 중...
        </p>
      ) : catalog.listed.length === 0 && catalog.unlisted.length === 0 ? (
        <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#9a80b0", textAlign: "center", padding: "16px 0", lineHeight: 1.5 }}>
          아직 등록된 아이템이 없어요.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {catalog.listed.length > 0 && (
            <>
              <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.3rem", color: accentColor }}>판매 중</span>
              {catalog.listed.map(renderListedItem)}
            </>
          )}
          {catalog.unlisted.length > 0 && (
            <>
              <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.3rem", color: "#8a7aa0", marginTop: catalog.listed.length > 0 ? 4 : 0 }}>
                제작만 된 아이템
              </span>
              {catalog.unlisted.map(renderUnlistedItem)}
            </>
          )}
        </div>
      )}

      {toast && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full z-10"
          style={{ background: "rgba(60,30,40,0.88)", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}
        >
          <span style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 700, color: "#ffe0e8", whiteSpace: "nowrap" }}>{toast}</span>
        </div>
      )}
    </div>
  );
}

function FriendVisitPage({
  nb,
  user,
  onBack,
  onProfileFocus,
  onShopPurchase,
}: {
  nb: FriendNeighbor;
  user: User;
  onBack: () => void;
  onProfileFocus?: (nb: FriendNeighbor) => void;
  onShopPurchase?: () => void;
}) {
  const [mode, setMode] = useState<VisitMode>("miniroom");
  const [friendRoom, setFriendRoom] = useState<MiniroomData>(EMPTY_MINIROOM_DATA);
  const [friendInventory, setFriendInventory] = useState<HandMadeItem[]>([]);
  const [friendAvatar, setFriendAvatar] = useState<AvatarProfile | null>(nb.avatarProfile ?? null);
  const [guestEntries, setGuestEntries] = useState<GuestbookEntryWithAvatar[]>([]);
  const [friendDiaries, setFriendDiaries] = useState<DiaryEntry[]>([]);
  const [loadingVisit, setLoadingVisit] = useState(!!nb.friendUserId && isSupabaseConfigured());
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [guestMsg, setGuestMsg] = useState("");
  const [guestError, setGuestError] = useState("");
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [visitDataError, setVisitDataError] = useState("");
  const [nestedVisit, setNestedVisit] = useState<FriendNeighbor | null>(null);
  const [myFriendIds, setMyFriendIds] = useState<Set<string>>(new Set());
  const [requestTarget, setRequestTarget] = useState<GuestbookEntryWithAvatar | null>(null);
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestMsg, setRequestMsg] = useState<string | null>(null);

  const MODES: { id: VisitMode; label: string; emoji: string }[] = [
    { id: "miniroom", label: "미니룸",  emoji: "🏠" },
    { id: "guest",    label: "방명록",  emoji: "✍️" },
    { id: "diary",    label: "일기",    emoji: "📖" },
    { id: "photo",    label: "사진첩",  emoji: "📷" },
    { id: "shop",     label: "상점",    emoji: "🛒" },
  ];

  const focusedNeighbor = nestedVisit ?? nb;
  useEffect(() => {
    onProfileFocus?.(focusedNeighbor);
    // intentionally omit onProfileFocus — parent setter identity changes every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedNeighbor.friendUserId, focusedNeighbor.id, focusedNeighbor.name]);

  const refreshGuestbook = async () => {
    if (!nb.friendUserId || !isSupabaseConfigured()) return;
    const next = await loadGuestbookView(nb.friendUserId);
    setGuestEntries(next);
  };

  const refreshFriendDiaries = async () => {
    if (!nb.friendUserId || !isSupabaseConfigured()) {
      setFriendDiaries([]);
      return;
    }
    const next = await fetchDiaryEntries(nb.friendUserId, { publicOnly: true });
    setFriendDiaries(next);
  };

  const reloadFriendProfile = async () => {
    if (!nb.friendUserId || !isSupabaseConfigured()) return;

    const tableCheck = await checkUserDataTables();
    if (!tableCheck.ok) {
      setVisitDataError(tableCheck.error);
      return;
    }

    const [room, avatar, inventory] = await Promise.all([
      fetchUserMiniroom(nb.friendUserId),
      fetchUserAvatar(nb.friendUserId),
      fetchUserInventory(nb.friendUserId),
    ]);
    if (room) setFriendRoom(room);
    if (avatar) setFriendAvatar(storedToAvatarProfile(avatar));
    setFriendInventory(inventory?.items ?? []);
    await refreshFriendDiaries();
    setVisitDataError("");
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    loadFriends(user.id).then((friends) => {
      if (cancelled) return;
      setMyFriendIds(new Set(friends.map((f) => f.friendUserId)));
    });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    if (!nb.friendUserId || !isSupabaseConfigured()) {
      setLoadingVisit(false);
      setFriendDiaries([]);
      return;
    }

    void (async () => {
      await recordDiaryVisit(nb.friendUserId!, user.id);
      await refreshVisitorStats(nb.friendUserId!);
    })();

    let cancelled = false;
    setLoadingVisit(true);

    (async () => {
      const tableCheck = await checkUserDataTables();
      if (cancelled) return;
      if (!tableCheck.ok) {
        setVisitDataError(tableCheck.error);
        setLoadingVisit(false);
        return;
      }

      const [room, avatar, inventory] = await Promise.all([
        fetchUserMiniroom(nb.friendUserId!),
        fetchUserAvatar(nb.friendUserId!),
        fetchUserInventory(nb.friendUserId!),
      ]);
      if (cancelled) return;
      if (room) setFriendRoom(room);
      if (avatar) setFriendAvatar(storedToAvatarProfile(avatar));
      setFriendInventory(inventory?.items ?? []);
      await refreshGuestbook();
      await refreshFriendDiaries();
      setLoadingVisit(false);
    })();

    const unsubscribe = subscribeGuestbook(nb.friendUserId, () => {
      void refreshGuestbook();
    });
    const stopPolling = startGuestbookPolling(nb.friendUserId, () => {
      void refreshGuestbook();
    });
    const stopAvatarPolling = window.setInterval(() => {
      void reloadFriendProfile();
    }, 8000);

    return () => {
      cancelled = true;
      unsubscribe();
      stopPolling();
      window.clearInterval(stopAvatarPolling);
    };
  }, [nb.friendUserId, user.id]);

  const handleGuestSubmit = async () => {
    if (!nb.friendUserId || !guestMsg.trim() || guestSubmitting) return;

    setGuestSubmitting(true);
    setGuestError("");

    const result = await addGuestbookEntry({
      ownerId: nb.friendUserId,
      authorId: user.id,
      authorName: user.nickname,
      message: guestMsg,
    });

    setGuestSubmitting(false);

    if (!result.ok) {
      setGuestError(result.error);
      return;
    }

    setGuestMsg("");
    setShowGuestForm(false);
    await refreshGuestbook();
  };

  const handleGuestbookProfileClick = (entry: GuestbookEntryWithAvatar) => {
    if (!entry.authorId) return;
    if (entry.authorId === user.id) return;
    if (entry.authorId === nb.friendUserId) return;

    if (myFriendIds.has(entry.authorId)) {
      setNestedVisit(guestbookEntryToFriend(entry));
      return;
    }

    setRequestMsg(null);
    setRequestTarget(entry);
  };

  const handleConfirmFriendRequest = async () => {
    if (!requestTarget || requestBusy) return;
    setRequestBusy(true);
    setRequestMsg(null);
    const result = await sendFriendRequest(user.id, requestTarget.name);
    setRequestBusy(false);
    if (!result.ok) {
      setRequestMsg(result.error);
      return;
    }
    setRequestMsg(`${result.nickname}님에게 친구 신청을 보냈어요.`);
  };

  const displayAvatar = friendAvatar ?? nb.avatarProfile ?? null;
  const friendInventoryById = useMemo(
    () => new Map(friendInventory.map(item => [item.id, item])),
    [friendInventory],
  );

  const visitHeader = (
    <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: `${nb.color}44` }}>
      <div className="flex items-center gap-2 min-w-0">
        <FriendAvatarThumb
          avatarProfile={displayAvatar}
          legacyAvatar={nb.avatar}
          color={nb.color}
          size={28}
          showOnline={false}
          useBust={!!nb.friendUserId}
          userId={nb.friendUserId}
          inventory={friendInventory}
        />
        <span
          className="truncate"
          style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.65rem", color: "#4a2060" }}
        >
          {nb.name}
        </span>
      </div>
      <button onClick={onBack} className="px-2 py-0.5 rounded-full"
        style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 600, background: "rgba(var(--diary-mid-rgb),0.1)", color: "var(--diary-dark)" }}>
        ← 돌아가기
      </button>
    </div>
  );

  const modeTabs = (
    <div className="flex gap-1 flex-shrink-0 flex-wrap">
      {MODES.map(m => (
        <button key={m.id} onClick={() => {
          setMode(m.id);
          if (m.id === "miniroom") void reloadFriendProfile();
          if (m.id === "diary") void refreshFriendDiaries();
        }}
          className="py-1 px-1.5 rounded-lg flex items-center justify-center gap-0.5"
          style={{
            fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 700,
            flex: "1 1 18%",
            minWidth: 0,
            background: mode === m.id ? `linear-gradient(135deg, ${nb.color}, ${nb.color}aa)` : "rgba(255,255,255,0.6)",
            color: mode === m.id ? "#fff" : "var(--diary-dark)",
            border: mode === m.id ? "none" : "1px solid rgba(var(--diary-mid-rgb),0.15)",
            boxShadow: mode === m.id ? `0 2px 8px ${nb.color}55` : "none",
            transition: "all 0.15s",
          }}>
          {m.emoji} {m.label}
        </button>
      ))}
    </div>
  );

  const requestModal = requestTarget ? (
    <FriendRequestConfirmModal
      nickname={requestTarget.name}
      busy={requestBusy}
      message={requestMsg}
      onClose={() => {
        if (requestBusy) return;
        setRequestTarget(null);
        setRequestMsg(null);
      }}
      onConfirm={() => void handleConfirmFriendRequest()}
    />
  ) : null;

  if (nestedVisit) {
    return (
      <FriendVisitPage
        nb={nestedVisit}
        user={user}
        onBack={() => setNestedVisit(null)}
        onProfileFocus={onProfileFocus}
        onShopPurchase={onShopPurchase}
      />
    );
  }

  return (
    <div className="h-full flex flex-col gap-2 p-3 relative" style={{ background: DIARY_PAPER_BG }}>
      {requestModal}

      {visitHeader}

      {modeTabs}

      {/* content */}
      <div className="flex-1 min-h-0 overflow-hidden" style={{ minHeight: 0 }}>
        {visitDataError && (
          <div className="mb-2 px-2.5 py-2 rounded-xl" style={{ background: "rgba(255,71,87,0.12)", border: "1px solid rgba(255,71,87,0.35)" }}>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 700, color: "#ff4757", lineHeight: 1.4 }}>
              {visitDataError}
            </p>
          </div>
        )}
        {loadingVisit && nb.friendUserId ? (
          <div className="h-full flex items-center justify-center">
            <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", color: "var(--diary-mid)" }}>불러오는 중...</p>
          </div>
        ) : null}
        {!loadingVisit && mode === "miniroom" && (
          <div className="h-full flex items-center justify-center overflow-hidden" style={{ background: DIARY_PAPER_BG }}>
            <MiniRoomPreviewPanel
              className="flex-none shrink-0"
              style={{ height: HOME_MINIROOM_SLOT_HEIGHT, maxHeight: "100%", width: "100%" }}
              borderColor={`${nb.color}44`}
              overlay={
                <div className="absolute top-1.5 left-2 px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(255,255,255,0.88)", border: `1px solid ${nb.color}` }}>
                  <FriendAvatarThumb
                    avatarProfile={displayAvatar}
                    legacyAvatar={nb.avatar}
                    color={nb.color}
                    size={18}
                    showOnline={false}
                    useBust={!!nb.friendUserId}
                    userId={nb.friendUserId}
                    inventory={friendInventory}
                  />
                  <span style={{ fontFamily: FONT_UI, fontSize: "0.45rem", fontWeight: 700, color: "#6040a0" }}>{nb.name}의 방</span>
                </div>
              }
            >
              <RoomCanvas
                selections={friendRoom.selections}
                offsets={friendRoom.offsets}
                standingAvatar={displayAvatar ?? DEFAULT_AVATAR_PROFILE}
                avatarPosition={friendRoom.avatarPosition}
                inventoryPlacements={friendRoom.inventoryPlacements ?? []}
                inventoryById={friendInventoryById}
                avatarUserId={nb.friendUserId}
                avatarInventory={friendInventory}
                fillHeight
              />
            </MiniRoomPreviewPanel>
          </div>
        )}
        {!loadingVisit && mode === "guest" && (
          <div className="h-full flex flex-col gap-2 p-3 rounded-xl overflow-y-auto" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${nb.color}33` }}>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 700, color: "var(--diary-mid)" }}>방명록</p>
            {guestEntries.length === 0 ? (
              <p style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#9a80b0", textAlign: "center", padding: "12px 0" }}>
                아직 방명록이 없어요. 첫 메시지를 남겨보세요!
              </p>
            ) : (
              guestEntries.map((entry) => {
                const canOpenProfile =
                  !!entry.authorId &&
                  entry.authorId !== user.id &&
                  entry.authorId !== nb.friendUserId;
                return (
                <div key={entry.id} className="rounded-xl p-2" style={{ background: "rgba(255,255,255,0.8)", border: `1px solid ${entry.color}33` }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <button
                      type="button"
                      onClick={() => canOpenProfile && handleGuestbookProfileClick(entry)}
                      disabled={!canOpenProfile}
                      className="flex items-center gap-1.5 rounded-lg"
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        cursor: canOpenProfile ? "pointer" : "default",
                      }}
                    >
                      <FriendAvatarThumb
                        avatarProfile={entry.avatarProfile}
                        color={entry.color}
                        size={22}
                        showOnline={false}
                        useBust={!!entry.authorId}
                        legacyAvatar={AVATAR_PRESETS[0]}
                      />
                      <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.55rem", color: "#6040a0" }}>{entry.name}</span>
                    </button>
                    <span style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "var(--diary-mid)" }}>{entry.date}</span>
                  </div>
                  <p style={{ fontFamily: FONT_UI, fontSize: "0.57rem", color: "#5a3080", paddingLeft: "1.8rem" }}>{entry.msg}</p>
                </div>
                );
              })
            )}

            <AnimatePresence>
              {showGuestForm && (
                <motion.div
                  className="rounded-xl p-2.5 flex flex-col gap-2 flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.85)", border: `1px solid ${nb.color}44` }}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                >
                  <textarea
                    value={guestMsg}
                    onChange={(e) => {
                      setGuestMsg(e.target.value);
                      setGuestError("");
                    }}
                    placeholder="방명록을 남겨주세요 🌸"
                    rows={2}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none resize-none"
                    style={{
                      fontFamily: FONT_UI, fontSize: "0.6rem",
                      background: "rgba(255,255,255,0.9)",
                      border: "1px solid rgba(var(--diary-mid-rgb),0.25)",
                      color: "#4a2030",
                    }}
                  />
                  {guestError && (
                    <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 700, color: "#ff4757" }}>{guestError}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowGuestForm(false);
                        setGuestError("");
                      }}
                      className="px-3 py-1 rounded-full"
                      style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 600, color: "var(--diary-dark)", background: "rgba(var(--diary-mid-rgb),0.1)" }}
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleGuestSubmit()}
                      disabled={!guestMsg.trim() || guestSubmitting || !nb.friendUserId}
                      className="px-3 py-1 rounded-full text-white"
                      style={{
                        fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 700,
                        background: `linear-gradient(90deg, ${nb.color}, ${nb.color}aa)`,
                        opacity: guestMsg.trim() && !guestSubmitting ? 1 : 0.5,
                      }}
                    >
                      {guestSubmitting ? "등록 중..." : "등록 ✦"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {nb.friendUserId ? (
              <button
                type="button"
                onClick={() => setShowGuestForm((v) => !v)}
                className="w-full py-1.5 rounded-xl text-white mt-auto"
                style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 700, background: `linear-gradient(90deg,${nb.color},${nb.color}aa)` }}
              >
                {showGuestForm ? "닫기" : "방명록 남기기 ✍️"}
              </button>
            ) : (
              <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", color: "#9a80b0", textAlign: "center" }}>
                Supabase 친구만 방명록을 남길 수 있어요
              </p>
            )}
          </div>
        )}
        {!loadingVisit && mode === "diary" && (
          <div className="h-full flex flex-col gap-2 p-3 rounded-xl overflow-y-auto" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${nb.color}33` }}>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 700, color: "#e08040" }}>공개 일기</p>
            {!nb.friendUserId || !isSupabaseConfigured() ? (
              <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#9a80b0" }}>
                Supabase에 연결된 친구의 공개 일기만 볼 수 있어요.
              </p>
            ) : friendDiaries.length === 0 ? (
              <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#9a80b0" }}>
                아직 공개된 일기가 없어요.
              </p>
            ) : (
              friendDiaries.map((e) => (
                <div key={e.id} className="rounded-xl overflow-hidden" style={{ border: `1px solid ${nb.color}33` }}>
                  <div className="flex items-center gap-1.5 px-2.5 py-1" style={{ background: `${nb.color}22`, borderBottom: `1px solid ${nb.color}22` }}>
                    <WeatherPixelIcon weather={e.weather} size={16} />
                    <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.55rem", color: "#c06030" }}>
                      {e.date.replace(/-/g, ".")}
                    </span>
                    <span style={{ fontSize: 10 }}>🔓</span>
                  </div>
                  <p className="px-2.5 py-1.5" style={{ fontFamily: FONT_UI, fontSize: "0.58rem", color: "#6a4020", lineHeight: 1.6 }}>{e.content}</p>
                  {e.stickers.length > 0 && (
                    <div className="flex gap-1 px-2.5 pb-1.5 flex-wrap">
                      {e.stickers.map((s, j) => <span key={j} style={{ fontSize: 13 }}>{s}</span>)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        {!loadingVisit && mode === "photo" && <FriendPhotoAlbum nb={nb} user={user} />}
        {!loadingVisit && mode === "shop" && (
          nb.friendUserId && isSupabaseConfigured() ? (
            <FriendVisitShopPanel
              sellerId={nb.friendUserId}
              sellerNickname={nb.name}
              accentColor={nb.color}
              buyer={user}
              onPurchaseComplete={onShopPurchase}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.7)", border: `1px solid ${nb.color}33` }}>
              <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#9a80b0", textAlign: "center", lineHeight: 1.5 }}>
                Supabase에 연결된 친구의 상점만 방문할 수 있어요.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function FriendRequestConfirmModal({
  nickname,
  onClose,
  onConfirm,
  busy,
  message,
}: {
  nickname: string;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  message?: string | null;
}) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(80,40,120,0.35)" }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[230px] rounded-2xl p-4 flex flex-col gap-3"
        style={{
          background: DIARY_PAPER_BG,
          border: "2px solid rgba(var(--diary-mid-rgb),0.25)",
          boxShadow: "0 8px 32px rgba(var(--diary-mid-rgb),0.2)",
        }}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.35rem", color: "var(--diary-mid)" }}>♡</span>
          <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.65rem", color: "#6040a0" }}>친구 신청</span>
        </div>
        <p style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#5a3080", lineHeight: 1.5 }}>
          <span style={{ fontWeight: 700, color: "#4a2060" }}>{nickname}</span>님에게<br />
          친구 추가 신청하시겠습니까?
        </p>
        <p style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "var(--diary-mid)", lineHeight: 1.4 }}>
          상대가 수락해야 미니룸·방명록·일기를 방문할 수 있어요.
        </p>
        {message && (
          <p style={{
            fontFamily: FONT_UI, fontSize: "0.44rem", fontWeight: 700,
            color: /실패|필요|못|이미|권한|실행/.test(message) ? "#ff4757" : "#3d8b5f",
          }}>
            {message}
          </p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-1.5 rounded-xl"
            style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 600, color: "var(--diary-dark)", background: "rgba(var(--diary-mid-rgb),0.08)" }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 py-1.5 rounded-xl text-white"
            style={{
              fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 700,
              background: "linear-gradient(90deg, #ff4757, #ff6b81)",
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? "신청 중..." : "신청하기"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AddFriendModal({
  userId,
  onClose,
  onSent,
}: {
  userId: string;
  onClose: () => void;
  onSent?: () => void;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed || loading) return;

    if (!isSupabaseConfigured()) {
      setError("Supabase 연결이 필요해요.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    const result = await sendFriendRequest(userId, trimmed);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSuccess(`${result.nickname}님에게 친구 신청을 보냈어요.`);
    setName("");
    onSent?.();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(80,40,120,0.35)" }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[220px] rounded-2xl p-4 flex flex-col gap-3"
        style={{
          background: DIARY_PAPER_BG,
          border: "2px solid rgba(var(--diary-mid-rgb),0.25)",
          boxShadow: "0 8px 32px rgba(var(--diary-mid-rgb),0.2)",
        }}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.35rem", color: "var(--diary-mid)" }}>♡</span>
          <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.65rem", color: "#6040a0" }}>친구 신청</span>
        </div>
        <p style={{ fontFamily: FONT_UI, fontSize: "0.44rem", color: "var(--diary-mid)", lineHeight: 1.4 }}>
          닉네임으로 검색해 신청하면, 상대가 수락해야 이웃이 돼요.
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
            setSuccess(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && void handleSubmit()}
          placeholder="닉네임 입력"
          maxLength={12}
          autoFocus
          disabled={loading}
          className="w-full px-3 py-2 rounded-xl outline-none"
          style={{
            fontFamily: FONT_UI, fontSize: "0.6rem", fontWeight: 600,
            background: "rgba(255,255,255,0.9)", border: "1.5px solid rgba(var(--diary-mid-rgb),0.2)", color: "#4a2060",
          }}
        />
        {error && (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 700, color: "#ff4757" }}>{error}</p>
        )}
        {success && (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 700, color: "#3d8b5f" }}>{success}</p>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-1.5 rounded-xl"
            style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 600, color: "var(--diary-dark)", background: "rgba(var(--diary-mid-rgb),0.08)" }}
          >
            닫기
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!name.trim() || loading}
            className="flex-1 py-1.5 rounded-xl text-white"
            style={{
              fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 700,
              background: name.trim() && !loading ? "linear-gradient(90deg, #ff4757, #ff6b81)" : "rgba(var(--diary-mid-rgb),0.25)",
              opacity: name.trim() && !loading ? 1 : 0.6,
            }}
          >
            {loading ? "신청 중..." : "신청"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function NeighborListModal({
  neighbors,
  onlineIds,
  loading,
  onClose,
  onVisitFriend,
  onRemoveFriend,
}: {
  neighbors: FriendNeighbor[];
  onlineIds: Set<string>;
  loading: boolean;
  onClose: () => void;
  onVisitFriend: (nb: FriendNeighbor) => void;
  onRemoveFriend: (nb: FriendNeighbor, e: ReactMouseEvent | ReactKeyboardEvent) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3"
      style={{ background: "rgba(80,40,120,0.35)" }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[300px] rounded-2xl p-3 flex flex-col gap-2 max-h-[92vh]"
        style={{
          background: DIARY_PAPER_BG,
          border: "2px solid rgba(var(--diary-mid-rgb),0.25)",
          boxShadow: "0 8px 32px rgba(var(--diary-mid-rgb),0.2)",
        }}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.35rem", color: "var(--diary-mid)" }}>♡</span>
            <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.62rem", color: "#6040a0" }}>내 이웃 목록</span>
          </div>
          <span style={{ fontFamily: FONT_UI, fontSize: "0.44rem", color: "var(--diary-dark)" }}>
            {loading ? "..." : `${neighbors.length}명`}
          </span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {loading ? (
            <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "var(--diary-mid)", textAlign: "center", padding: "16px 0" }}>
              이웃 불러오는 중...
            </p>
          ) : neighbors.length === 0 ? (
            <div className="rounded-xl py-6 px-3 text-center" style={{ background: "rgba(255,255,255,0.6)", border: "1px dashed rgba(var(--diary-mid-rgb),0.25)" }}>
              <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "var(--diary-mid)", lineHeight: 1.5 }}>
                아직 이웃이 없어요<br />친구 추가로 이웃을 맺어 보세요
              </p>
            </div>
          ) : (
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              {neighbors.map((nb, i) => (
                <motion.button
                  key={nb.friendUserId ?? String(nb.id)}
                  type="button"
                  onClick={() => {
                    onVisitFriend(nb);
                    onClose();
                  }}
                  className="flex flex-col items-center gap-1 rounded-xl py-2 px-1 relative"
                  style={{
                    background: "rgba(255,255,255,0.72)",
                    border: `1.5px solid ${nb.color}55`,
                    boxShadow: `0 1px 6px ${nb.color}22`,
                    cursor: "pointer",
                  }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ scale: 1.04, boxShadow: `0 3px 12px ${nb.color}44` }}
                  whileTap={{ scale: 0.95 }}
                >
                  {nb.friendUserId && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => void onRemoveFriend(nb, e)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          void onRemoveFriend(nb, e);
                        }
                      }}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{
                        fontFamily: FONT_UI, fontSize: "0.55rem", fontWeight: 700, lineHeight: 1,
                        color: "#fff", background: "rgba(var(--diary-dark-rgb),0.75)", zIndex: 2,
                      }}
                      title="이웃 삭제"
                    >
                      ×
                    </span>
                  )}
                  <FriendAvatarThumb
                    avatarProfile={nb.avatarProfile}
                    legacyAvatar={nb.avatar}
                    color={nb.color}
                    useBust={!!nb.friendUserId}
                    showOnline={!!nb.friendUserId}
                    isOnline={!!nb.friendUserId && onlineIds.has(nb.friendUserId)}
                    userId={nb.friendUserId}
                    inventory={nb.inventory}
                  />
                  <span style={{
                    fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.45rem",
                    color: "#4a2060", textAlign: "center", lineHeight: 1.2,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%",
                  }}>{nb.name}</span>
                </motion.button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-1.5 rounded-xl flex-shrink-0"
          style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 600, color: "var(--diary-dark)", background: "rgba(var(--diary-mid-rgb),0.08)" }}
        >
          닫기
        </button>
      </motion.div>
    </div>
  );
}

function IlchonListModal({
  userId,
  ilchon,
  onlineIds,
  loading,
  outgoingRequests,
  onClose,
  onVisitFriend,
  onRefresh,
}: {
  userId: string;
  ilchon: FriendNeighbor[];
  onlineIds: Set<string>;
  loading: boolean;
  outgoingRequests: IlchonRequest[];
  onClose: () => void;
  onVisitFriend: (nb: FriendNeighbor) => void;
  onRefresh: () => void;
}) {
  const [showAddIlchon, setShowAddIlchon] = useState(false);

  const ilchonIdSet = new Set(ilchon.map((n) => n.friendUserId).filter((id): id is string => !!id));
  const pendingTargetIds = new Set(outgoingRequests.map((r) => r.toUserId));

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-3"
        style={{ background: "rgba(80,40,120,0.35)" }}
        onClick={() => {
          if (!showAddIlchon) onClose();
        }}
      >
        <motion.div
          className="w-full max-w-[300px] rounded-2xl p-3 flex flex-col gap-2 max-h-[92vh]"
          style={{
            background: DIARY_PAPER_BG,
            border: "2px solid rgba(var(--diary-mid-rgb),0.25)",
            boxShadow: "0 8px 32px rgba(var(--diary-mid-rgb),0.2)",
          }}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <span style={{ fontSize: 13 }}>💞</span>
              <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.65rem", color: "#6040a0" }}>내 일촌</span>
            </div>
            <span style={{ fontFamily: FONT_UI, fontSize: "0.44rem", color: "var(--diary-dark)" }}>
              {loading ? "..." : `${ilchon.length}명`}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2" style={{ scrollbarWidth: "thin" }}>
            {loading ? (
              <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "var(--diary-mid)", textAlign: "center", padding: "16px 0" }}>
                일촌 불러오는 중...
              </p>
            ) : ilchon.length === 0 ? (
              <div className="rounded-xl py-6 px-3 text-center" style={{ background: "rgba(255,255,255,0.6)", border: "1px dashed rgba(var(--diary-mid-rgb),0.25)" }}>
                <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "var(--diary-mid)", lineHeight: 1.5 }}>
                  아직 일촌이 없어요<br />이웃 중에서 일촌을 맺어 보세요
                </p>
              </div>
            ) : (
              <IlchonAvatarGrid
                ilchon={ilchon}
                onlineIds={onlineIds}
                onVisitFriend={(nb) => {
                  onVisitFriend(nb);
                  onClose();
                }}
              />
            )}
          </div>

          <motion.button
            type="button"
            onClick={() => setShowAddIlchon(true)}
            className="w-full py-2 rounded-xl flex items-center justify-center gap-1 text-white flex-shrink-0"
            style={{
              fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 700,
              background: "linear-gradient(90deg, #ff4757, #ff6b81)",
              boxShadow: "0 2px 8px rgba(255,71,87,0.28)",
            }}
            whileTap={{ scale: 0.97 }}
          >
            <span style={{ fontSize: 12 }}>＋</span>
            일촌 추가하기
          </motion.button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 rounded-xl flex-shrink-0"
            style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 600, color: "var(--diary-dark)", background: "rgba(var(--diary-mid-rgb),0.08)" }}
          >
            닫기
          </button>
        </motion.div>
      </div>
      {showAddIlchon && (
        <AddIlchonModal
          userId={userId}
          ilchonIds={ilchonIdSet}
          pendingTargetIds={pendingTargetIds}
          onClose={() => setShowAddIlchon(false)}
          onSent={() => {
            onRefresh();
          }}
        />
      )}
    </>
  );
}

function ProfileActionButtons({
  user,
  onVisitFriend,
}: {
  user: User;
  onVisitFriend: (nb: FriendNeighbor) => void;
}) {
  const [ilchon, setIlchon] = useState<FriendNeighbor[]>([]);
  const [ilchonOnlineIds, setIlchonOnlineIds] = useState<Set<string>>(new Set());
  const [ilchonLoading, setIlchonLoading] = useState(isSupabaseConfigured());
  const [outgoingIlchonRequests, setOutgoingIlchonRequests] = useState<IlchonRequest[]>([]);
  const [neighbors, setNeighbors] = useState<FriendNeighbor[]>(() =>
    isSupabaseConfigured() ? [] : INITIAL_NEIGHBORS,
  );
  const [neighborOnlineIds, setNeighborOnlineIds] = useState<Set<string>>(new Set());
  const [neighborLoading, setNeighborLoading] = useState(isSupabaseConfigured());
  const [showIlchonList, setShowIlchonList] = useState(false);
  const [showNeighborList, setShowNeighborList] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [waveMsg, setWaveMsg] = useState<string | null>(null);

  const refreshIlchon = async () => {
    if (!isSupabaseConfigured()) {
      setIlchon([]);
      setIlchonLoading(false);
      return;
    }
    setIlchonLoading(true);
    const [ilchonRows, requests] = await Promise.all([
      loadIlchonList(user.id),
      loadIlchonRequests(user.id),
    ]);
    const neighborsList = ilchonRows.map((row, index) => storedIlchonToNeighbor(row, index));
    const friendIds = neighborsList.map((n) => n.friendUserId).filter((id): id is string => !!id);
    const [neighborsWithRemote, online] = await Promise.all([
      attachNeighborRemoteData(neighborsList),
      fetchOnlineUserIds(friendIds),
    ]);
    setIlchon(neighborsWithRemote);
    setIlchonOnlineIds(online);
    setOutgoingIlchonRequests(requests.outgoing);
    setIlchonLoading(false);
  };

  const refreshNeighbors = async () => {
    if (!isSupabaseConfigured()) {
      setNeighborLoading(false);
      return;
    }
    setNeighborLoading(true);
    const friends = await loadFriends(user.id);
    const neighborBase = friends.map((friend, index) => storedFriendToNeighbor(friend, index));
    const friendIds = neighborBase.map((n) => n.friendUserId).filter((id): id is string => !!id);
    const [neighborsWithRemote, online] = await Promise.all([
      attachNeighborRemoteData(neighborBase),
      fetchOnlineUserIds(friendIds),
    ]);
    setNeighbors(neighborsWithRemote);
    setNeighborOnlineIds(online);
    setNeighborLoading(false);
  };

  useEffect(() => {
    void refreshIlchon();
    void refreshNeighbors();
  }, [user.id]);

  useEffect(() => {
    if (!waveMsg) return;
    const t = window.setTimeout(() => setWaveMsg(null), 2000);
    return () => window.clearTimeout(t);
  }, [waveMsg]);

  const handleWave = () => {
    if (ilchonLoading) return;
    if (ilchon.length === 0) {
      setWaveMsg("일촌이 없어요 · 내 일촌에서 추가해 보세요");
      return;
    }
    onVisitFriend(ilchon[Math.floor(Math.random() * ilchon.length)]);
  };

  const handleRemoveFriend = async (nb: FriendNeighbor, e: ReactMouseEvent | ReactKeyboardEvent) => {
    e.stopPropagation();
    if (!nb.friendUserId || !isSupabaseConfigured()) return;
    if (!window.confirm(`${nb.name}님을 이웃 목록에서 삭제할까요?`)) return;
    const ok = await removeFriend(user.id, nb.friendUserId);
    if (!ok) return;
    setNeighbors((prev) => prev.filter((item) => item.friendUserId !== nb.friendUserId));
  };

  const btnBase = {
    fontFamily: FONT_UI,
    fontSize: "0.5rem" as const,
    fontWeight: 700 as const,
  };

  const NEIGHBOR_PREVIEW_LIMIT = 5;
  const previewNeighbors = neighbors.slice(0, NEIGHBOR_PREVIEW_LIMIT);

  return (
    <div className="flex flex-col gap-1.5 flex-shrink-0">
      {showIlchonList && (
        <IlchonListModal
          userId={user.id}
          ilchon={ilchon}
          onlineIds={ilchonOnlineIds}
          loading={ilchonLoading}
          outgoingRequests={outgoingIlchonRequests}
          onClose={() => setShowIlchonList(false)}
          onVisitFriend={onVisitFriend}
          onRefresh={() => void refreshIlchon()}
        />
      )}
      {showNeighborList && (
        <NeighborListModal
          neighbors={neighbors}
          onlineIds={neighborOnlineIds}
          loading={neighborLoading}
          onClose={() => setShowNeighborList(false)}
          onVisitFriend={onVisitFriend}
          onRemoveFriend={handleRemoveFriend}
        />
      )}
      {showAddFriend && (
        <AddFriendModal
          userId={user.id}
          onClose={() => setShowAddFriend(false)}
          onSent={() => void refreshNeighbors()}
        />
      )}

      {/* 이웃 미리보기 — 노래바와 파도타기 버튼 사이 */}
      <div
        className="rounded-xl p-2.5 flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, rgba(var(--diary-main-rgb),0.2) 0%, rgba(255,255,255,0.75) 100%)",
          border: "1px solid rgba(var(--diary-mid-rgb),0.28)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.35rem", color: "var(--diary-mid)" }}>♡</span>
            <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.58rem", color: "#6040a0" }}>내 이웃</span>
          </div>
          <div className="flex items-center gap-1.5">
            {neighbors.length > 0 && (
              <button
                type="button"
                onClick={() => setShowNeighborList(true)}
                className="px-2 py-0.5 rounded-full"
                style={{
                  fontFamily: FONT_UI,
                  fontSize: "0.42rem",
                  fontWeight: 800,
                  color: "#6040a0",
                  background: "rgba(255,255,255,0.85)",
                  border: "1px solid rgba(var(--diary-mid-rgb),0.35)",
                  boxShadow: "0 1px 4px rgba(var(--diary-mid-rgb),0.12)",
                }}
              >
                이웃 더보기
              </button>
            )}
            <span style={{ fontFamily: FONT_UI, fontSize: "0.44rem", color: "var(--diary-dark)", fontWeight: 600 }}>
              {neighborLoading ? "..." : `${neighbors.length}명`}
            </span>
          </div>
        </div>

        {neighborLoading ? (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "var(--diary-mid)", textAlign: "center", padding: "10px 0" }}>
            이웃 불러오는 중...
          </p>
        ) : neighbors.length === 0 ? (
          <div
            className="rounded-xl py-3 px-2 text-center"
            style={{ background: "rgba(255,255,255,0.6)", border: "1px dashed rgba(var(--diary-mid-rgb),0.25)" }}
          >
            <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "var(--diary-mid)", lineHeight: 1.5 }}>
              아직 이웃이 없어요
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-2 overflow-hidden">
            {previewNeighbors.map((nb, i) => (
              <motion.button
                key={nb.friendUserId ?? String(nb.id)}
                type="button"
                onClick={() => onVisitFriend(nb)}
                className="flex flex-col items-center gap-1 flex-1 min-w-0 rounded-xl py-2 px-1"
                style={{
                  background: "rgba(255,255,255,0.82)",
                  border: `1.5px solid ${nb.color}55`,
                  boxShadow: `0 2px 8px ${nb.color}22`,
                  cursor: "pointer",
                  maxWidth: 72,
                }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.04, boxShadow: `0 3px 12px ${nb.color}44` }}
                whileTap={{ scale: 0.95 }}
              >
                <FriendAvatarThumb
                  avatarProfile={nb.avatarProfile}
                  legacyAvatar={nb.avatar}
                  color={nb.color}
                  size={52}
                  useBust={!!nb.friendUserId}
                  showOnline={!!nb.friendUserId}
                  isOnline={!!nb.friendUserId && neighborOnlineIds.has(nb.friendUserId)}
                  userId={nb.friendUserId}
                  inventory={nb.inventory}
                />
                <span
                  style={{
                    fontFamily: FONT_UI,
                    fontWeight: 700,
                    fontSize: "0.48rem",
                    color: "#4a2060",
                    textAlign: "center",
                    lineHeight: 1.2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                >
                  {nb.name}
                </span>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {waveMsg && (
        <p style={{ fontFamily: FONT_UI, fontSize: "0.42rem", fontWeight: 600, color: "var(--diary-mid)", textAlign: "center" }}>
          {waveMsg}
        </p>
      )}

      <div className="grid grid-cols-2 gap-1.5 flex-shrink-0">
        <motion.button
          type="button"
          onClick={handleWave}
          disabled={ilchonLoading}
          className="py-2.5 rounded-xl text-white"
          style={{
            ...btnBase,
            background: "linear-gradient(90deg, var(--diary-dark), var(--diary-mid))",
            opacity: ilchonLoading ? 0.55 : 1,
            boxShadow: "0 2px 8px rgba(var(--diary-dark-rgb),0.25)",
          }}
          whileTap={{ scale: 0.97 }}
        >
          🌊 일촌 파도타기
        </motion.button>
        <motion.button
          type="button"
          onClick={() => setShowIlchonList(true)}
          className="py-2.5 rounded-xl text-white"
          style={{
            ...btnBase,
            background: "linear-gradient(90deg, var(--diary-dark), var(--diary-mid))",
            boxShadow: "0 2px 8px rgba(var(--diary-dark-rgb),0.25)",
          }}
          whileTap={{ scale: 0.97 }}
        >
          💞 내 일촌
        </motion.button>
      </div>

      <motion.button
        type="button"
        onClick={() => setShowAddFriend(true)}
        className="w-full py-2.5 rounded-xl text-white flex-shrink-0"
        style={{
          ...btnBase,
          background: "linear-gradient(90deg, #ff4757, #ff6b81)",
          boxShadow: "0 2px 8px rgba(255,71,87,0.28)",
        }}
        whileTap={{ scale: 0.97 }}
      >
        ＋ 친구 추가
      </motion.button>
    </div>
  );
}

function HomeRightPage({
  user,
  avatar,
  miniroomData,
  inventoryRevision,
  onMiniroomDataChange,
  onDecorate,
  visitingFriend,
  onVisitFriend,
  onLeaveFriend,
  onProfileFocus,
  onOpenBoard,
  onOpenMyItems,
  onCreateItem,
  onRenameItem,
  onDeleteItem,
  onShopPurchase,
}: {
  user: User;
  avatar: AvatarProfile;
  miniroomData: MiniroomData;
  inventoryRevision: number;
  onMiniroomDataChange: Dispatch<SetStateAction<MiniroomData>>;
  onDecorate: () => void;
  visitingFriend: FriendNeighbor | null;
  onVisitFriend: (nb: FriendNeighbor) => void;
  onLeaveFriend: () => void;
  onProfileFocus: (nb: FriendNeighbor) => void;
  onOpenBoard: () => void;
  onOpenMyItems: () => void;
  onCreateItem: () => void;
  onRenameItem: (itemId: string, label: string) => void;
  onDeleteItem: (itemId: string) => void;
  onShopPurchase?: () => void;
}) {
  const homeInventoryById = useMemo(
    () => new Map(loadMyInventory(user.id).map(item => [item.id, item])),
    [user.id, inventoryRevision],
  );

  if (visitingFriend) {
    return (
      <FriendVisitPage
        nb={visitingFriend}
        user={user}
        onBack={onLeaveFriend}
        onProfileFocus={onProfileFocus}
        onShopPurchase={onShopPurchase}
      />
    );
  }

  return (
    <div className="h-full overflow-hidden flex flex-col gap-1.5 p-2.5 relative" style={{
      background: DIARY_PAPER_BG,
    }}>
      {/* ① 게시판 + 내 아이템 미리보기 */}
      <HomeBoardShopRow
        user={user}
        inventoryRevision={inventoryRevision}
        onOpenBoard={onOpenBoard}
        onOpenMyItems={onOpenMyItems}
        onCreateItem={onCreateItem}
        onRenameItem={onRenameItem}
        onDeleteItem={onDeleteItem}
      />

      {/* ② 알림 */}
      <HomeNotificationsSection user={user} />

      {/* ③ 미니룸 (compact) */}
      <MiniRoomPreviewPanel
        overlay={
          <>
            <div className="absolute top-1.5 left-2 flex items-center gap-1">
              <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.32rem", color: "var(--diary-dark)" }}>★ MINI ROOM</span>
            </div>
            <button
              onClick={onDecorate}
              className="absolute top-1.5 right-2 px-1.5 py-0.5 rounded-full text-white"
              style={{ fontFamily: FONT_UI, fontSize: "0.42rem", fontWeight: 700, background: "linear-gradient(90deg,#ff4757,#ff6b81)" }}>
              꾸미기
            </button>
          </>
        }
      >
        <RoomCanvas
          selections={miniroomData.selections}
          offsets={miniroomData.offsets}
          inventoryPlacements={miniroomData.inventoryPlacements ?? []}
          inventoryById={homeInventoryById}
          fillHeight
          standingAvatar={avatar}
          avatarPosition={miniroomData.avatarPosition}
          avatarUserId={user.id}
          editableAvatar
          onAvatarPositionChange={(position) => {
            onMiniroomDataChange((prev) => ({ ...prev, avatarPosition: position }));
          }}
        />
      </MiniRoomPreviewPanel>
    </div>
  );
}
/* ═══════════════════════════════════════════
   HOME LEFT — BULLETIN BOARD + PROFILE
═══════════════════════════════════════════ */
function BoardLikeButton({
  post,
  onToggle,
}: {
  post: BoardPostRecord;
  onToggle: (postId: string, liked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(post.id, post.likedByMe)}
      className="self-start flex items-center gap-0.5"
      style={{
        fontFamily: FONT_UI,
        fontSize: "0.45rem",
        color: post.likedByMe ? "#ff2d78" : "var(--diary-mid)",
        fontWeight: 600,
      }}
    >
      {post.likedByMe ? "♥" : "♡"} {post.likeCount}
    </button>
  );
}

function BoardPostCard({
  post,
  user,
  compact = false,
  onToggleLike,
  onCommentAdded,
  onDeletePost,
}: {
  post: BoardPostRecord;
  user: User;
  compact?: boolean;
  onToggleLike: (postId: string, liked: boolean) => void;
  onCommentAdded: (postId: string, comment: BoardPostRecord["comments"][number]) => void;
  onDeletePost?: (postId: string) => void;
}) {
  const [commentDraft, setCommentDraft] = useState("");
  const [commentError, setCommentError] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const isAuthor = post.authorId === user.id;

  const submitComment = async () => {
    if (!commentDraft.trim() || submittingComment) return;
    setSubmittingComment(true);
    setCommentError("");
    const result = await createBoardComment(post.id, user.id, user.nickname, commentDraft);
    setSubmittingComment(false);
    if (!result.ok) {
      setCommentError(result.error);
      return;
    }
    onCommentAdded(post.id, result.comment);
    setCommentDraft("");
    setShowComments(true);
  };

  const handleDelete = async () => {
    if (!onDeletePost || deleting) return;
    if (!window.confirm("이 글을 삭제할까요?")) return;
    setDeleting(true);
    const result = await deleteBoardPost(user.id, post.id);
    setDeleting(false);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    onDeletePost(post.id);
  };

  return (
    <div className={compact ? "px-2.5 py-1.5 flex flex-col gap-0.5" : "rounded-xl p-2.5 flex flex-col gap-1.5"} style={
      compact ? undefined : { background: "rgba(255,255,255,0.75)", border: "1px solid rgba(var(--diary-mid-rgb),0.12)" }
    }>
      <div className="flex items-start justify-between gap-2">
        <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: compact ? "0.5rem" : "0.55rem", color: "#7040a0" }}>
          {post.authorNickname}
        </span>
        <span
          className="flex-shrink-0 text-right"
          style={{ fontFamily: FONT_UI, fontSize: "0.4rem", color: "var(--diary-mid)", lineHeight: 1.35, whiteSpace: "nowrap" }}
        >
          {formatBoardDateTime(post.createdAt)}
        </span>
      </div>
      <p
        style={{
          fontFamily: FONT_UI,
          fontSize: compact ? "0.55rem" : "0.58rem",
          color: "#5a3080",
          lineHeight: 1.5,
          whiteSpace: compact ? "nowrap" : "pre-wrap",
          overflow: compact ? "hidden" : "visible",
          textOverflow: compact ? "ellipsis" : "clip",
        }}
      >
        {post.content}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <BoardLikeButton post={post} onToggle={onToggleLike} />
        {!compact && (
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            style={{ fontFamily: FONT_UI, fontSize: "0.45rem", color: showComments ? "var(--diary-dark)" : "var(--diary-mid)", fontWeight: 600 }}
          >
            💬 댓글 {post.comments.length}
          </button>
        )}
        {!compact && isAuthor && onDeletePost && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            style={{ fontFamily: FONT_UI, fontSize: "0.45rem", color: "#ff4757", fontWeight: 600, opacity: deleting ? 0.6 : 1 }}
          >
            {deleting ? "삭제 중..." : "삭제"}
          </button>
        )}
        {compact && post.comments.length > 0 && (
          <span style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "var(--diary-mid)" }}>💬 {post.comments.length}</span>
        )}
      </div>

      {!compact && showComments && (
        <div
          className="rounded-lg p-2 flex flex-col gap-1.5"
          style={{ background: "rgba(var(--diary-main-rgb), 0.1)", border: "1px solid rgba(var(--diary-mid-rgb),0.2)" }}
        >
          {post.comments.length === 0 ? (
            <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "var(--diary-mid)" }}>첫 댓글을 남겨 보세요</p>
          ) : (
            post.comments.map((comment) => (
              <div key={comment.id} className="flex flex-col gap-0.5">
                <div className="flex items-start justify-between gap-2">
                  <span style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 700, color: "var(--diary-dark)" }}>
                    {comment.authorNickname}
                  </span>
                  <span style={{ fontFamily: FONT_UI, fontSize: "0.38rem", color: "var(--diary-soft)", whiteSpace: "nowrap" }}>
                    {formatBoardDateTime(comment.createdAt)}
                  </span>
                </div>
                <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", color: "#5a3080", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                  {comment.content}
                </p>
              </div>
            ))
          )}
          <div className="flex gap-1 mt-0.5">
            <input
              value={commentDraft}
              onChange={(e) => {
                setCommentDraft(e.target.value);
                if (commentError) setCommentError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitComment();
              }}
              placeholder="댓글 입력"
              maxLength={300}
              className="flex-1 min-w-0 px-2 py-1 rounded-lg outline-none"
              style={{
                fontFamily: FONT_UI,
                fontSize: "0.52rem",
                color: "#5a3080",
                background: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(var(--diary-mid-rgb),0.25)",
              }}
            />
            <button
              type="button"
              onClick={() => void submitComment()}
              disabled={submittingComment || !commentDraft.trim()}
              className="px-2 py-1 rounded-lg text-white flex-shrink-0"
              style={{
                fontFamily: FONT_UI,
                fontSize: "0.48rem",
                fontWeight: 700,
                background: "linear-gradient(90deg,var(--diary-mid),var(--diary-dark))",
                opacity: submittingComment || !commentDraft.trim() ? 0.55 : 1,
              }}
            >
              {submittingComment ? "..." : "등록"}
            </button>
          </div>
          {commentError && (
            <p style={{ fontFamily: FONT_UI, fontSize: "0.44rem", fontWeight: 600, color: "#ff4757" }}>{commentError}</p>
          )}
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  showActions,
  busyRequestId,
  onAccept,
  onReject,
}: {
  notification: AppNotification;
  showActions?: boolean;
  busyRequestId?: string | null;
  onAccept?: (notification: AppNotification) => void;
  onReject?: (notification: AppNotification) => void;
}) {
  const isActionable =
    showActions &&
    (notification.type === "friend_request" || notification.type === "ilchon_request") &&
    notification.requestId;

  return (
    <div
      className="flex items-start gap-2 px-2.5 py-2"
      style={{ borderBottom: "1px solid rgba(var(--diary-mid-rgb),0.08)" }}
    >
      <span
        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
        style={{
          fontSize: "0.55rem",
          background: "rgba(var(--diary-mid-rgb),0.12)",
        }}
      >
        {getNotificationIcon(notification.type)}
      </span>
      <div className="flex-1 min-w-0">
        <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 700, color: "#4a2060", lineHeight: 1.4 }}>
          {notification.message}
        </p>
        {notification.content && (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "var(--diary-mid)", lineHeight: 1.4, marginTop: 2 }}>
            &ldquo;{notification.content}&rdquo;
          </p>
        )}
        <span style={{ fontFamily: FONT_UI, fontSize: "0.38rem", color: "#a0b0d8" }}>
          {formatNotificationTime(notification.createdAt)}
        </span>
        {isActionable && onAccept && onReject && (
          <div className="flex gap-1 mt-1.5">
            <button
              type="button"
              onClick={() => onReject(notification)}
              disabled={busyRequestId === notification.requestId}
              className="px-2 py-0.5 rounded-lg"
              style={{
                fontFamily: FONT_UI, fontSize: "0.4rem", fontWeight: 700,
                color: "var(--diary-dark)", background: "rgba(var(--diary-mid-rgb),0.12)",
              }}
            >
              거절
            </button>
            <button
              type="button"
              onClick={() => onAccept(notification)}
              disabled={busyRequestId === notification.requestId}
              className="px-2 py-0.5 rounded-lg text-white"
              style={{
                fontFamily: FONT_UI, fontSize: "0.4rem", fontWeight: 700,
                background: "linear-gradient(90deg, #ff4757, #ff6b81)",
              }}
            >
              {busyRequestId === notification.requestId ? "..." : "수락"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationListModal({
  notifications,
  loading,
  actionError,
  busyRequestId,
  onClose,
  onAccept,
  onReject,
}: {
  notifications: AppNotification[];
  loading: boolean;
  actionError: string | null;
  busyRequestId: string | null;
  onClose: () => void;
  onAccept: (notification: AppNotification) => void;
  onReject: (notification: AppNotification) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3"
      style={{ background: "rgba(80,40,120,0.35)" }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[300px] rounded-2xl p-3 flex flex-col gap-2 max-h-[72vh]"
        style={{
          background: DIARY_PAPER_BG,
          border: "2px solid rgba(255,180,200,0.35)",
          boxShadow: "0 8px 32px rgba(255,110,180,0.18)",
        }}
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: 13 }}>🔔</span>
            <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.65rem", color: "#d06090" }}>알림</span>
          </div>
          <span style={{ fontFamily: FONT_UI, fontSize: "0.44rem", color: "#d06090" }}>
            {loading ? "..." : `${notifications.length}개`}
          </span>
        </div>

        {actionError && (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.44rem", fontWeight: 700, color: "#ff4757" }}>{actionError}</p>
        )}

        <div className="flex-1 min-h-0 overflow-y-auto rounded-xl" style={{
          background: "rgba(255,255,255,0.55)",
          border: "1px solid rgba(255,180,200,0.2)",
          scrollbarWidth: "thin",
        }}>
          {loading ? (
            <p className="px-2.5 py-4 text-center" style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#d06090" }}>
              불러오는 중...
            </p>
          ) : notifications.length === 0 ? (
            <p className="px-2.5 py-4 text-center" style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#d06090", lineHeight: 1.5 }}>
              새 알림이 없어요
            </p>
          ) : (
            notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                showActions
                busyRequestId={busyRequestId}
                onAccept={onAccept}
                onReject={onReject}
              />
            ))
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-1.5 rounded-xl flex-shrink-0"
          style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 600, color: "#d06090", background: "rgba(255,180,200,0.15)" }}
        >
          닫기
        </button>
      </motion.div>
    </div>
  );
}

function HomeNotificationsSection({ user }: { user: User }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured());
  const [showList, setShowList] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [lastReadAt, setLastReadAt] = useState<string | null>(() => getLastReadAt(user.id));

  const unreadCount = countUnreadNotifications(notifications, user.id, lastReadAt);

  const markAllRead = (items: AppNotification[] = notifications) => {
    const readAt = markNotificationsRead(user.id, items);
    setLastReadAt(readAt);
  };

  const openList = () => {
    markAllRead();
    setActionError(null);
    setShowList(true);
  };

  const closeList = () => {
    markAllRead();
    setShowList(false);
  };

  const refresh = async () => {
    if (!isSupabaseConfigured()) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const next = await loadNotifications(user.id);
    setNotifications(next);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    void fetchNotificationLastReadAt(user.id).then((readAt) => {
      if (!cancelled && readAt) setLastReadAt(readAt);
    });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    void refresh();
    const unsubscribe = subscribeNotifications(user.id, () => void refresh());
    const interval = window.setInterval(() => void refresh(), 60_000);
    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [user.id]);

  useEffect(() => {
    if (!showList || notifications.length === 0) return;
    markAllRead(notifications);
  }, [showList, notifications, user.id]);

  const handleAccept = async (notification: AppNotification) => {
    if (!notification.requestId || busyRequestId) return;
    setBusyRequestId(notification.requestId);
    setActionError(null);
    const result =
      notification.type === "friend_request"
        ? await acceptFriendRequest(notification.requestId)
        : await acceptIlchonRequest(notification.requestId);
    setBusyRequestId(null);
    if (!result.ok) {
      setActionError(result.error);
      return;
    }
    await deleteNotification(notification.id);
    await refresh();
  };

  const handleReject = async (notification: AppNotification) => {
    if (!notification.requestId || busyRequestId) return;
    setBusyRequestId(notification.requestId);
    setActionError(null);
    const result =
      notification.type === "friend_request"
        ? await rejectFriendRequest(notification.requestId)
        : await rejectIlchonRequest(notification.requestId);
    setBusyRequestId(null);
    if (notification.type === "friend_request") {
      if (!result.ok) {
        setActionError("error" in result ? result.error : "거절에 실패했어요.");
        return;
      }
    } else if (!result) {
      setActionError("거절에 실패했어요.");
      return;
    }
    await deleteNotification(notification.id);
    await refresh();
  };

  return (
    <>
      <div className="rounded-xl overflow-hidden flex-shrink-0" style={{
        background: "rgba(255,255,255,0.75)",
        border: "1px solid rgba(255,180,200,0.25)",
        boxShadow: "0 1px 6px rgba(255,110,180,0.05)",
      }}>
        <div className="flex items-center justify-between px-2.5 py-1.5" style={{
          background: "linear-gradient(90deg, rgba(255,200,220,0.22), rgba(255,150,180,0.08))",
        }}>
          <span style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 700, color: "#d06090" }}>알림</span>
          <div className="flex items-center gap-1.5">
            <span style={{ fontFamily: FONT_UI, fontSize: "0.44rem", fontWeight: 600, color: "#d06090" }}>
              {loading ? "새로운 알림 ..." : `새로운 알림 ${unreadCount}`}
            </span>
            <button
              type="button"
              onClick={openList}
              className="w-4 h-4 rounded-full flex items-center justify-center text-white"
              style={{ background: "linear-gradient(135deg, #ff4757, #ff6b81)", fontSize: 11, fontWeight: 700 }}
              aria-label="알림 목록"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {showList && (
        <NotificationListModal
          notifications={notifications}
          loading={loading}
          actionError={actionError}
          busyRequestId={busyRequestId}
          onClose={closeList}
          onAccept={(n) => void handleAccept(n)}
          onReject={(n) => void handleReject(n)}
        />
      )}
    </>
  );
}

function HomeBoardSection({ user, onOpenBoard, className = "" }: { user: User; onOpenBoard: () => void; className?: string }) {
  const [posts, setPosts] = useState<BoardPostRecord[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured());

  const loadPosts = async () => {
    if (!isSupabaseConfigured()) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const next = await fetchBoardPosts(user.id, 2);
    setPosts(next);
    setLoading(false);
  };

  useEffect(() => {
    void loadPosts();
  }, [user.id]);

  const handleToggleLike = async (postId: string, liked: boolean) => {
    const result = await toggleBoardLike(user.id, postId, liked);
    if (!result.ok) return;
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              likedByMe: result.liked,
              likeCount: Math.max(0, post.likeCount + (result.liked ? 1 : -1)),
            }
          : post,
      ),
    );
  };

  const handleCommentAdded = (postId: string, comment: BoardPostRecord["comments"][number]) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, comments: [...post.comments, comment] } : post,
      ),
    );
  };

  return (
    <div className={`rounded-xl overflow-hidden flex flex-col h-full min-h-0 ${className}`} style={{
      background: "rgba(255,255,255,0.75)",
      border: "1px solid rgba(var(--diary-mid-rgb),0.15)",
      boxShadow: "0 2px 10px rgba(var(--diary-mid-rgb),0.06)",
    }}>
      <div className="flex items-center justify-between px-2.5 py-1.5 flex-shrink-0" style={{
        background: "linear-gradient(90deg, rgba(var(--diary-main-rgb),0.22), rgba(var(--diary-mid-rgb),0.1))",
        borderBottom: "1px solid rgba(var(--diary-mid-rgb),0.12)",
      }}>
        <span style={{ fontFamily: FONT_UI, fontSize: "0.55rem", fontWeight: 700, color: "var(--diary-mid)" }}>게시판 💬</span>
        <button type="button" onClick={onOpenBoard}
          className="w-5 h-5 rounded-full flex items-center justify-center text-white"
          style={{ background: "linear-gradient(135deg, #ff4757, #ff6b81)", fontSize: 12, fontWeight: 700 }}>+</button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
      {loading ? (
        <p className="px-2.5 py-2" style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "var(--diary-mid)" }}>불러오는 중...</p>
      ) : posts.length === 0 ? (
        <p className="px-2.5 py-2" style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "var(--diary-mid)", lineHeight: 1.45 }}>
          아직 글이 없어요<br />+ 버튼으로 첫 글을 남겨 보세요
        </p>
      ) : (
        posts.map((post, i) => (
          <div
            key={post.id}
            style={{ borderBottom: i < posts.length - 1 ? "1px solid rgba(var(--diary-mid-rgb),0.08)" : "none" }}
          >
            <BoardPostCard
              post={post}
              user={user}
              compact
              onToggleLike={handleToggleLike}
              onCommentAdded={handleCommentAdded}
            />
          </div>
        ))
      )}
      </div>
    </div>
  );
}

function MyItemManageCard({
  item,
  compact = false,
  onRename,
  onDelete,
}: {
  item: HandMadeItem;
  compact?: boolean;
  onRename: (itemId: string, label: string) => void;
  onDelete: (itemId: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draftLabel, setDraftLabel] = useState(item.label);

  useEffect(() => {
    setDraftLabel(item.label);
  }, [item.label]);

  const commitRename = () => {
    const trimmed = draftLabel.trim();
    if (!trimmed) {
      setDraftLabel(item.label);
      setRenaming(false);
      return;
    }
    if (trimmed !== item.label) onRename(item.id, trimmed);
    setRenaming(false);
  };

  const previewSize = compact ? 20 : 40;
  const boxSize = compact ? 28 : 52;

  return (
    <div
      className={`relative rounded-xl flex flex-col items-center gap-1 ${compact ? "rounded-lg flex-row items-center gap-1.5 flex-shrink-0" : "p-2"}`}
      style={{
        padding: compact ? "5px 6px" : undefined,
        background: "rgba(255,255,255,0.85)",
        border: "1px solid rgba(255,128,160,0.16)",
      }}
    >
      <div
        className="rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ width: boxSize, height: boxSize, background: "rgba(255,240,245,0.7)" }}
      >
        <HandMadeItemPreview item={item} size={previewSize} />
      </div>
      <div className={`${compact ? "flex-1 min-w-0" : "w-full"}`}>
        {renaming ? (
          <input
            type="text"
            value={draftLabel}
            maxLength={24}
            autoFocus
            onChange={(event) => setDraftLabel(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitRename();
              if (event.key === "Escape") {
                setDraftLabel(item.label);
                setRenaming(false);
              }
            }}
            onBlur={commitRename}
            className="w-full rounded-md outline-none px-1 py-0.5"
            style={{
              fontFamily: FONT_UI,
              fontSize: compact ? "0.42rem" : "0.44rem",
              fontWeight: 700,
              color: "#6a3040",
              background: "rgba(255,248,232,0.95)",
              border: "1px solid rgba(255,128,160,0.3)",
            }}
          />
        ) : (
          <p
            style={{
              fontFamily: FONT_UI,
              fontSize: compact ? "0.44rem" : "0.44rem",
              fontWeight: 700,
              color: "#6a3040",
              textAlign: compact ? "left" : "center",
              lineHeight: 1.3,
              whiteSpace: compact ? "nowrap" : "normal",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {item.label}
          </p>
        )}
        {!renaming && (
          <p style={{ fontFamily: FONT_UI, fontSize: compact ? "0.36rem" : "0.36rem", color: "#b08090", textAlign: compact ? "left" : "center" }}>
            {item.cat}
          </p>
        )}
      </div>
      {!renaming && (
        <div className={`flex items-center gap-0.5 flex-shrink-0 ${compact ? "" : "mt-0.5"}`}>
          <span
            className="rounded-md px-1 py-0.5"
            style={{
              fontFamily: FONT_UI,
              fontSize: "0.34rem",
              fontWeight: 700,
              color: item.source === "purchased" ? "#7c3aed" : "#ff6080",
              background: item.source === "purchased" ? "rgba(124,58,237,0.1)" : "rgba(255,128,160,0.12)",
            }}
          >
            {item.source === "purchased" ? "구매" : "제작"}
          </span>
          <button
            type="button"
            title="이름 바꾸기"
            onClick={() => setRenaming(true)}
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ fontSize: "0.42rem", background: "rgba(124,58,237,0.12)", color: "#7c3aed" }}
          >
            ✎
          </button>
          <button
            type="button"
            title="영구 삭제"
            onClick={() => {
              if (!window.confirm(`「${item.label}」을(를) 영구 삭제할까요?\n상점 등록도 함께 제거돼요.`)) return;
              onDelete(item.id);
            }}
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{ fontSize: "0.55rem", background: "rgba(255,71,87,0.92)", color: "white" }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}

function HomeMyItemsPreview({
  user,
  inventoryRevision,
  onOpenMyItems,
  onCreateItem,
  onRenameItem,
  onDeleteItem,
}: {
  user: User;
  inventoryRevision: number;
  onOpenMyItems: () => void;
  onCreateItem: () => void;
  onRenameItem: (itemId: string, label: string) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  const PREVIEW_LIMIT = 3;
  const myInventory = useMemo(() => loadMyInventory(user.id), [user.id, inventoryRevision]);
  const previewItems = myInventory.slice(0, PREVIEW_LIMIT);

  return (
    <div className="rounded-xl overflow-hidden flex flex-col h-full min-h-0" style={{
      background: "rgba(255,255,255,0.75)",
      border: "1px solid rgba(255,128,160,0.18)",
      boxShadow: "0 2px 10px rgba(255,128,160,0.08)",
    }}>
      <div className="flex items-center justify-between px-2.5 py-1.5 flex-shrink-0" style={{
        background: "linear-gradient(90deg, rgba(255,240,245,0.9), rgba(255,128,160,0.08))",
        borderBottom: "1px solid rgba(255,128,160,0.12)",
      }}>
        <span style={{ fontFamily: FONT_UI, fontSize: "0.55rem", fontWeight: 700, color: "#ff6080" }}>내 아이템 🎒</span>
        <button type="button" onClick={onOpenMyItems}
          className="w-5 h-5 rounded-full flex items-center justify-center text-white"
          style={{ background: "linear-gradient(135deg, #ff6080, #ff80a0)", fontSize: 12, fontWeight: 700 }}>+</button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-1.5 flex flex-col gap-1" style={{ scrollbarWidth: "thin" }}>
        {previewItems.length === 0 ? (
          <p className="px-0.5 py-1" style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#b07080", lineHeight: 1.45 }}>
            아직 아이템이 없어요
          </p>
        ) : (
          previewItems.map((item) => (
            <MyItemManageCard
              key={item.id}
              item={item}
              compact
              onRename={onRenameItem}
              onDelete={onDeleteItem}
            />
          ))
        )}
      </div>
      <div className="px-2 pb-2 pt-0.5 flex-shrink-0">
        <button
          type="button"
          onClick={onCreateItem}
          className="w-full py-1 rounded-full text-white"
          style={{
            fontFamily: FONT_UI,
            fontSize: "0.44rem",
            fontWeight: 800,
            background: "linear-gradient(135deg, #7c3aed, #9b6dff)",
            boxShadow: "0 2px 6px rgba(124,58,237,0.2)",
          }}
        >
          ✏️ 직접 만들기
        </button>
      </div>
    </div>
  );
}

function HomeBoardShopRow({
  user,
  inventoryRevision,
  onOpenBoard,
  onOpenMyItems,
  onCreateItem,
  onRenameItem,
  onDeleteItem,
}: {
  user: User;
  inventoryRevision: number;
  onOpenBoard: () => void;
  onOpenMyItems: () => void;
  onCreateItem: () => void;
  onRenameItem: (itemId: string, label: string) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  return (
    <div className="flex gap-1.5 flex-shrink-0" style={{ height: 148, minHeight: 148 }}>
      <div className="flex-1 min-w-0 h-full">
        <HomeBoardSection user={user} onOpenBoard={onOpenBoard} />
      </div>
      <div className="flex-1 min-w-0 h-full">
        <HomeMyItemsPreview
          user={user}
          inventoryRevision={inventoryRevision}
          onOpenMyItems={onOpenMyItems}
          onCreateItem={onCreateItem}
          onRenameItem={onRenameItem}
          onDeleteItem={onDeleteItem}
        />
      </div>
    </div>
  );
}

function MyItemsExpandPage({
  user,
  inventoryRevision,
  onBack,
  onCreateItem,
  onRenameItem,
  onDeleteItem,
}: {
  user: User;
  inventoryRevision: number;
  onBack: () => void;
  onCreateItem: () => void;
  onRenameItem: (itemId: string, label: string) => void;
  onDeleteItem: (itemId: string) => void;
}) {
  const myInventory = useMemo(() => loadMyInventory(user.id), [user.id, inventoryRevision]);

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{ background: DIARY_PAPER_BG }}>
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(255,128,160,0.2)" }}>
        <span style={{ fontFamily: FONT_UI, fontSize: "0.58rem", fontWeight: 700, color: "#ff6080" }}>내 아이템 🎒</span>
        <button type="button" onClick={onBack} className="px-2 py-0.5 rounded-full" style={{
          fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 600,
          background: "rgba(255,128,160,0.12)", color: "#9a5060",
        }}>← 홈</button>
      </div>

      <button
        type="button"
        onClick={onCreateItem}
        className="w-full py-2 rounded-full text-white flex-shrink-0"
        style={{
          fontFamily: FONT_UI,
          fontSize: "0.52rem",
          fontWeight: 800,
          background: "linear-gradient(135deg, #7c3aed, #9b6dff)",
          boxShadow: "0 2px 8px rgba(124,58,237,0.25)",
        }}
      >
        ✏️ 직접 만들기
      </button>

      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl p-2" style={{
        background: "rgba(255,255,255,0.65)",
        border: "1px solid rgba(255,128,160,0.18)",
        scrollbarWidth: "thin",
      }}>
        {myInventory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 py-10">
            <span style={{ fontSize: 28 }}>🎒</span>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", color: "#b07080", lineHeight: 1.5, textAlign: "center" }}>
              아직 보유한 아이템이 없어요.<br />상점에서 구매하거나 직접 만들어 보세요!
            </p>
          </div>
        ) : (
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {myInventory.map((item) => (
              <MyItemManageCard
                key={item.id}
                item={item}
                onRename={onRenameItem}
                onDelete={onDeleteItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BoardExpandPage({ user, onBack }: { user: User; onBack: () => void }) {
  const [posts, setPosts] = useState<BoardPostRecord[]>([]);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadPosts = async () => {
    if (!isSupabaseConfigured()) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const next = await fetchBoardPosts(user.id, 50);
    setPosts(next);
    setLoading(false);
  };

  useEffect(() => {
    void loadPosts();
  }, [user.id]);

  const handleToggleLike = async (postId: string, liked: boolean) => {
    const result = await toggleBoardLike(user.id, postId, liked);
    if (!result.ok) return;
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? {
              ...post,
              likedByMe: result.liked,
              likeCount: Math.max(0, post.likeCount + (result.liked ? 1 : -1)),
            }
          : post,
      ),
    );
  };

  const handleCommentAdded = (postId: string, comment: BoardPostRecord["comments"][number]) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, comments: [...post.comments, comment] } : post,
      ),
    );
  };

  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  };

  const submit = async () => {
    if (!newPost.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    const result = await createBoardPost(user.id, user.nickname, newPost);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPosts((prev) => [result.post, ...prev]);
    setNewPost("");
  };

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{ background: DIARY_PAPER_BG }}>
      <div className="flex items-center justify-between pb-1 border-b flex-shrink-0" style={{ borderColor: "rgba(var(--diary-mid-rgb),0.2)" }}>
        <span style={{ fontFamily: FONT_UI, fontSize: "0.58rem", fontWeight: 700, color: "var(--diary-mid)" }}>게시판 글쓰기 💬</span>
        <button type="button" onClick={onBack} className="px-2 py-0.5 rounded-full" style={{
          fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 600,
          background: "rgba(var(--diary-mid-rgb),0.1)", color: "var(--diary-dark)",
        }}>← 홈</button>
      </div>
      <p
        className="flex-shrink-0 px-2 py-1.5 rounded-lg"
        style={{
          fontFamily: FONT_UI,
          fontSize: "0.48rem",
          color: "var(--diary-dark)",
          lineHeight: 1.45,
          background: "rgba(255,255,255,0.65)",
          border: "1px solid rgba(var(--diary-mid-rgb),0.18)",
        }}
      >
        {BOARD_RULES_TEXT}
      </p>
      <div className="flex gap-1.5 flex-shrink-0">
        <input
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
          placeholder="글 남기기 ✨"
          maxLength={500}
          className="flex-1 px-2 py-1.5 rounded-xl outline-none"
          style={{ fontFamily: FONT_UI, fontSize: "0.58rem", color: "#5a3080", background: "rgba(255,255,255,0.8)", border: "1px solid rgba(var(--diary-mid-rgb),0.2)" }}
        />
        <button type="button" onClick={() => void submit()} disabled={submitting || !newPost.trim()} className="px-3 rounded-xl text-white"
          style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 700, background: "linear-gradient(90deg,#ff4757,#ff6b81)", opacity: submitting || !newPost.trim() ? 0.6 : 1 }}>
          {submitting ? "..." : "등록"}
        </button>
      </div>
      {error && (
        <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 600, color: "#ff4757" }}>{error}</p>
      )}
      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5" style={{ minHeight: 0 }}>
        {loading ? (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", color: "var(--diary-mid)", textAlign: "center", paddingTop: 16 }}>불러오는 중...</p>
        ) : posts.length === 0 ? (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", color: "var(--diary-mid)", textAlign: "center", paddingTop: 16, lineHeight: 1.5 }}>
            아직 글이 없어요<br />첫 글을 남겨 보세요 ✨
          </p>
        ) : (
          posts.map((post, i) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <BoardPostCard
                post={post}
                user={user}
                onToggleLike={handleToggleLike}
                onCommentAdded={handleCommentAdded}
                onDeletePost={handleDeletePost}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════
   HOME LEFT PAGE (with board)
═══════════════════════════════════════════ */
function HomeLeftPage({ user, onOpenBoard }: { user: User; onOpenBoard: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="h-full flex flex-col gap-2 p-3 overflow-hidden" style={{ background: DIARY_PAPER_BG }}>
      {/* bulletin board */}
      <HomeBoardSection user={user} onOpenBoard={onOpenBoard} />

      {/* divider */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to right,transparent,rgba(var(--diary-mid-rgb),0.3))" }} />
        <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.3rem", color: "var(--diary-mid)" }}>MY INFO</span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to left,transparent,rgba(var(--diary-mid-rgb),0.3))" }} />
      </div>

      {/* compact avatar card */}
      <div className="rounded-xl p-2 flex gap-2 items-center flex-shrink-0" style={{
        background: "linear-gradient(135deg,rgba(var(--diary-main-rgb),0.35),rgba(var(--diary-mid-rgb),0.1))",
        border: "1px solid rgba(255,110,180,0.2)",
      }}>
        <div className="rounded-lg overflow-hidden flex-shrink-0" style={{
          width: 44, height: 50,
          background: "linear-gradient(135deg,#ffe0f4,#e8d0ff)",
          border: "1.5px solid rgba(var(--diary-mid-rgb),0.28)",
        }}>
          <div style={{ transform: "scale(0.6)", transformOrigin: "top left", width: "167%", height: "167%" }}>
            <PixelAvatar />
          </div>
        </div>
        <div>
          <p style={{ fontFamily: 'Great Vibes, Comic Sans MS, Malgun Gothic, sans-serif', fontSize: '1.3rem', color: 'rgb(212, 0, 106)', lineHeight: '1.1' }}>Re:world</p>
          <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", color: "var(--diary-dark)" }}>일상 기록중 🌸</p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ background: "#4cda64" }} />
          <span style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "#70a060" }}>온라인</span>
        </div>
      </div>

      {/* music player compact */}
      <div className="rounded-xl p-2 flex items-center gap-2 flex-shrink-0" style={{
        background: "linear-gradient(90deg,rgba(var(--diary-main-rgb),0.15),rgba(var(--diary-mid-rgb),0.08))",
        border: "1px solid rgba(255,80,180,0.18)",
      }}>
        <button onClick={() => setIsPlaying(!isPlaying)}
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#ff4757,#ff6b81)", boxShadow: "0 1px 6px rgba(255,45,120,0.35)" }}>
          <span style={{ color: "white", fontSize: 9, paddingLeft: isPlaying ? 0 : 1 }}>{isPlaying ? "⏸" : "▶"}</span>
        </button>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 700, color: "var(--diary-dark)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            ♬ Lovefool - The Cardigans
          </p>
          <div className="mt-0.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(var(--diary-mid-rgb),0.15)" }}>
            <motion.div className="h-full rounded-full" style={{ background: "linear-gradient(90deg,#ff4757,#ff6b81)" }}
              animate={isPlaying ? { width: ["30%","80%"] } : { width: "30%" }}
              transition={isPlaying ? { duration: 20, ease: "linear", repeat: Infinity } : {}} />
          </div>
        </div>
      </div>

      {/* visitor count */}
      <VisitorCountBar userId={user.id} compact />
    </div>
  );
}

function HandMadeItemPreview({ item, size = 36 }: { item: HandMadeItem; size?: number }) {
  const imageSrc = resolveHandMadeItemImageUrl(item);
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt=""
        width={size}
        height={size}
        className="flex-shrink-0"
        style={{ objectFit: "contain", imageRendering: "pixelated" }}
      />
    );
  }
  if (item.type === "emoticon" && item.icon) {
    return <PixelEmoticonIcon icon={item.icon} color={item.color} size={size} />;
  }
  return <PixelItemIcon id={item.templateId ?? "other-bag"} color={item.color} size={size} />;
}

function CloverCoinIcon({ size = 14, style }: { size?: number; style?: CSSProperties }) {
  return (
    <img
      src={shopCoinImage}
      alt=""
      width={size}
      height={size}
      className="inline-block flex-shrink-0"
      style={{ imageRendering: "pixelated", objectFit: "contain", verticalAlign: "middle", ...style }}
      aria-hidden
    />
  );
}

function ShopPage({
  user,
  inventoryRevision,
  onPurchaseComplete,
}: {
  user: User;
  inventoryRevision: number;
  onPurchaseComplete?: () => void;
}) {
  const PREVIEW_LIMIT = 2;
  const [shopSourceItems, setShopSourceItems] = useState<HandMadeItem[]>(() => loadShopSourceItems(user.id));
  const [myInventory, setMyInventory] = useState<HandMadeItem[]>(() => loadMyInventory(user.id));
  const [myListings, setMyListings] = useState(() => loadMyListings(user.id));
  const [publicListings, setPublicListings] = useState<ShopListingWithItem[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [expandMine, setExpandMine] = useState(false);
  const [expandGlobal, setExpandGlobal] = useState(false);
  const [globalShopQuery, setGlobalShopQuery] = useState("");
  const [coins, setCoins] = useState(() => loadCoins(user.id));
  const [ownedIds, setOwnedIds] = useState<Set<string>>(() => {
    const owned = loadOwnedListingIds(user.id);
    for (const listing of GLOBAL_SHOP_LISTINGS) {
      if (myInventory.some(item => item.id === listing.item.id)) {
        owned.add(listing.id);
      }
    }
    return owned;
  });
  const [toast, setToast] = useState<string | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const listedItemIds = new Set(myListings.map(listing => listing.itemId));
  const unlistedItems = shopSourceItems.filter(item => !listedItemIds.has(item.id));
  const activeListings = useMemo(
    () => getMyListingsWithItems(user.id, user.nickname, myListings),
    [user.id, user.nickname, myListings, shopSourceItems],
  );
  const playerShopListings = useMemo(
    () => mergePublicShopListings(publicListings, activeListings),
    [publicListings, activeListings],
  );
  const allGlobalListings = [...GLOBAL_SHOP_LISTINGS, ...playerShopListings];
  const filteredGlobalListings = useMemo(
    () => filterShopListingsByQuery(allGlobalListings, globalShopQuery),
    [allGlobalListings, globalShopQuery],
  );
  const filteredPlayerShopListings = useMemo(
    () => filterShopListingsByQuery(playerShopListings, globalShopQuery),
    [playerShopListings, globalShopQuery],
  );
  const filteredOfficialListings = useMemo(
    () => filterShopListingsByQuery(GLOBAL_SHOP_LISTINGS, globalShopQuery),
    [globalShopQuery],
  );
  const hasMoreMine = unlistedItems.length + activeListings.length > PREVIEW_LIMIT;
  const hasMoreGlobal = filteredGlobalListings.length > PREVIEW_LIMIT;
  const isGlobalShopSearching = globalShopQuery.trim().length > 0;

  const showToast = (message: string) => setToast(message);

  useEffect(() => {
    saveCoins(user.id, coins);
  }, [user.id, coins]);

  const refreshPublicListings = async () => {
    const next = await fetchActiveShopListings();
    setPublicListings(next);
  };

  const refreshMyListings = async () => {
    const next = await syncSellerShopListings(user.id, user.nickname);
    setMyListings(next);
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    void syncBuyerInventoryFromServer(user.id).then((remoteCoins) => {
      if (remoteCoins !== null) setCoins(remoteCoins);
    });
  }, [user.id, inventoryRevision]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    void refreshPublicListings();
    void refreshMyListings();
  }, [user.id, inventoryRevision]);

  useEffect(() => {
    setShopSourceItems(loadShopSourceItems(user.id));
    setMyInventory(loadMyInventory(user.id));
    if (!isSupabaseConfigured()) {
      setMyListings(loadMyListings(user.id));
    }
    setOwnedIds(() => {
      const owned = loadOwnedListingIds(user.id);
      for (const listing of GLOBAL_SHOP_LISTINGS) {
        if (loadMyInventory(user.id).some(item => item.id === listing.item.id)) {
          owned.add(listing.id);
        }
      }
      saveOwnedListingIds(user.id, owned);
      return owned;
    });
  }, [user.id, inventoryRevision]);

  const handleListItem = async (item: HandMadeItem) => {
    if (!canListInMyShop(item)) {
      showToast("구매한 아이템은 판매할 수 없어요");
      return;
    }
    const raw = priceDrafts[item.id] ?? "";
    const price = Number(raw);
    if (!Number.isFinite(price) || price <= 0) {
      showToast("가격을 올바르게 입력해 주세요");
      return;
    }
    const listing = {
      id: `listing-${Date.now()}`,
      itemId: item.id,
      sellerId: user.id,
      sellerNickname: user.nickname,
      price: Math.floor(price),
      listedAt: new Date().toISOString(),
    };
    const publishResult = await publishShopListing(user.id, user.nickname, listing, item);
    if (!publishResult.ok) {
      showToast(`등록 저장 실패: ${publishResult.error}`);
      return;
    }
    const synced = await syncSellerShopListings(user.id, user.nickname);
    setMyListings(synced);
    setPriceDrafts(prev => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    showToast(`"${item.label}" 상점에 등록했어요`);
    void refreshPublicListings();
  };

  const handleDelist = async (listingId: string) => {
    const result = await unpublishShopListing(listingId);
    if (!result.ok) {
      showToast(`판매 중단 실패: ${result.error}`);
      return;
    }
    showToast("판매를 중단했어요");
    const synced = await syncSellerShopListings(user.id, user.nickname);
    setMyListings(synced);
    void refreshPublicListings();
  };

  const handleBuyGlobalItem = (listing: ShopListingWithItem) => {
    if (hasPurchasedShopListing(user.id, listing, ownedIds)) {
      showToast("이미 구매한 아이템이에요");
      return;
    }
    if (coins < listing.price) {
      showToast("네잎클로버가 부족해요");
      return;
    }
    const nextCoins = coins - listing.price;
    setCoins(nextCoins);
    saveCoins(user.id, nextCoins);
    setOwnedIds(prev => new Set([...prev, listing.id]));
    markListingOwned(user.id, listing.id);
    addHandMadeItem(user.id, {
      ...listing.item,
      source: "purchased",
      createdAt: new Date().toISOString(),
    });
    setMyInventory(loadMyInventory(user.id));
    if (isSupabaseConfigured()) {
      void upsertUserInventory(user.id, getInventorySnapshot(user.id));
    }
    showToast(`"${listing.item.label}" 구매 완료!`);
    onPurchaseComplete?.();
  };

  const handleBuyPlayerListing = async (listing: ShopListingWithItem) => {
    if (listing.sellerId === user.id) {
      showToast("내 아이템은 구매할 수 없어요");
      return;
    }
    if (hasPurchasedShopListing(user.id, listing, ownedIds)) {
      showToast("이미 구매한 아이템이에요");
      return;
    }
    if (coins < listing.price) {
      showToast("네잎클로버가 부족해요");
      return;
    }

    setBuyingId(listing.id);
    const result = await completePlayerShopPurchase(user.id, listing.id);
    if (!result.ok) {
      showToast(result.error);
      setBuyingId(null);
      return;
    }

    setCoins(result.buyerCoins);
    setMyInventory(loadMyInventory(user.id));
    setOwnedIds(loadOwnedListingIds(user.id));
    showToast(`"${result.listing.item.label}" 구매 완료!`);
    setBuyingId(null);
    onPurchaseComplete?.();
  };

  const renderUnlistedItem = (item: HandMadeItem, compact = false) => (
    <div
      key={item.id}
      className="rounded-xl flex items-center gap-2"
      style={{
        padding: compact ? "6px 8px" : "10px",
        background: "rgba(255,255,255,0.78)",
        border: "1px solid rgba(255,128,160,0.18)",
      }}
    >
      <div
        className="rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ width: compact ? 32 : 44, height: compact ? 32 : 44, background: "rgba(255,240,245,0.7)" }}
      >
        <HandMadeItemPreview item={item} size={compact ? 24 : 36} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontFamily: FONT_UI, fontSize: compact ? "0.46rem" : "0.52rem", fontWeight: 700, color: "#6a3040" }}>{item.label}</p>
        <p style={{ fontFamily: FONT_UI, fontSize: "0.38rem", color: "#b08090" }}>{item.cat}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <input
          type="number"
          min={1}
          placeholder="가격"
          value={priceDrafts[item.id] ?? ""}
          onChange={e => setPriceDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
          className="rounded-lg outline-none text-center"
          style={{
            width: compact ? 40 : 56,
            padding: compact ? "2px 4px" : "4px 6px",
            fontFamily: FONT_UI,
            fontSize: "0.44rem",
            background: "rgba(255,248,232,0.95)",
            border: "1px solid rgba(255,128,160,0.25)",
          }}
        />
        <button
          type="button"
          onClick={() => handleListItem(item)}
          className="rounded-lg text-white"
          style={{
            padding: compact ? "3px 6px" : "4px 8px",
            fontFamily: FONT_UI,
            fontSize: "0.42rem",
            fontWeight: 800,
            background: "linear-gradient(135deg, #ff6080, #ff80a0)",
          }}
        >
          등록
        </button>
      </div>
    </div>
  );

  const renderListingItem = (listing: ShopListingWithItem, compact = false) => (
    <div
      key={listing.id}
      className="rounded-xl flex items-center gap-2"
      style={{
        padding: compact ? "6px 8px" : "10px",
        background: "rgba(255,255,255,0.78)",
        border: "1px solid rgba(255,128,160,0.18)",
      }}
    >
      <div
        className="rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ width: compact ? 32 : 44, height: compact ? 32 : 44, background: "rgba(255,240,245,0.7)" }}
      >
        <HandMadeItemPreview item={listing.item} size={compact ? 24 : 36} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontFamily: FONT_UI, fontSize: compact ? "0.46rem" : "0.52rem", fontWeight: 700, color: "#6a3040" }}>{listing.item.label}</p>
        <p className="inline-flex items-center gap-0.5" style={{ fontFamily: FONT_UI, fontSize: "0.38rem", color: "#b08090" }}>
          <CloverCoinIcon size={10} />
          {listing.price}
        </p>
      </div>
      <button
        type="button"
        onClick={() => handleDelist(listing.id)}
        className="rounded-lg flex-shrink-0"
        style={{
          padding: compact ? "3px 6px" : "4px 8px",
          fontFamily: FONT_UI,
          fontSize: "0.42rem",
          fontWeight: 800,
          background: "rgba(255,128,160,0.12)",
          color: "#9a5060",
        }}
      >
        내리기
      </button>
    </div>
  );

  const renderPlayerListing = (listing: ShopListingWithItem, compact = false) => {
    const isSelf = listing.sellerId === user.id;
    const owned = !isSelf && hasPurchasedShopListing(user.id, listing, ownedIds);
    return (
    <div
      key={listing.id}
      className="rounded-xl flex items-center gap-2"
      style={{
        padding: compact ? "6px 8px" : "10px",
        background: "rgba(255,255,255,0.78)",
        border: "1px solid rgba(255,128,160,0.18)",
      }}
    >
      <div
        className="rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ width: compact ? 32 : 44, height: compact ? 32 : 44, background: "rgba(255,240,245,0.7)" }}
      >
        <HandMadeItemPreview item={listing.item} size={compact ? 24 : 36} />
      </div>
      <div className="flex-1 min-w-0">
        <p style={{ fontFamily: FONT_UI, fontSize: compact ? "0.46rem" : "0.52rem", fontWeight: 700, color: "#6a3040" }}>{listing.item.label}</p>
        <p style={{ fontFamily: FONT_UI, fontSize: "0.38rem", color: "#b08090" }}>
          {listing.sellerNickname} · <CloverCoinIcon size={10} /> {listing.price}
        </p>
      </div>
      {isSelf ? (
        <span
          className="rounded-lg flex-shrink-0 px-1.5 py-0.5"
          style={{
            fontFamily: FONT_UI,
            fontSize: "0.38rem",
            fontWeight: 700,
            color: "#ff6080",
            background: "rgba(255,128,160,0.12)",
          }}
        >
          내 상품
        </span>
      ) : (
        <button
          type="button"
          disabled={owned || buyingId === listing.id}
          onClick={() => void handleBuyPlayerListing(listing)}
          className="rounded-lg text-white flex-shrink-0"
          style={{
            padding: compact ? "3px 8px" : "4px 10px",
            fontFamily: FONT_UI,
            fontSize: "0.42rem",
            fontWeight: 800,
            background: owned ? "rgba(180,160,200,0.5)" : "linear-gradient(135deg, #ff6080, #ff80a0)",
            cursor: owned ? "default" : "pointer",
            opacity: buyingId === listing.id ? 0.7 : 1,
          }}
        >
          {buyingId === listing.id ? "..." : owned ? "보유중" : (
            <span className="inline-flex items-center gap-0.5">
              <CloverCoinIcon size={11} />
              구매
            </span>
          )}
        </button>
      )}
    </div>
    );
  };

  const renderGlobalItem = (listing: ShopListingWithItem, compact = false) => {
    const owned = hasPurchasedShopListing(user.id, listing, ownedIds);
    return (
      <div
        key={listing.id}
        className="rounded-xl flex items-center gap-2"
        style={{
          padding: compact ? "6px 8px" : "10px",
          background: "rgba(255,255,255,0.78)",
          border: "1px solid rgba(124,58,237,0.18)",
        }}
      >
        <div
          className="rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ width: compact ? 32 : 44, height: compact ? 32 : 44, background: "rgba(244,240,255,0.8)" }}
        >
          <HandMadeItemPreview item={listing.item} size={compact ? 24 : 36} />
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: FONT_UI, fontSize: compact ? "0.46rem" : "0.52rem", fontWeight: 700, color: "#4a3060" }}>{listing.item.label}</p>
          <p style={{ fontFamily: FONT_UI, fontSize: "0.38rem", color: "#9070b0" }}>{listing.item.cat}</p>
        </div>
        <button
          type="button"
          onClick={() => handleBuyGlobalItem(listing)}
          disabled={owned}
          className="rounded-lg text-white flex-shrink-0"
          style={{
            padding: compact ? "3px 8px" : "4px 10px",
            fontFamily: FONT_UI,
            fontSize: "0.42rem",
            fontWeight: 800,
            background: owned ? "rgba(180,160,200,0.5)" : "linear-gradient(135deg, #7c3aed, #9b6dff)",
            cursor: owned ? "default" : "pointer",
          }}
        >
          {owned ? (
            "보유중"
          ) : (
            <span className="inline-flex items-center gap-0.5">
              <CloverCoinIcon size={11} />
              {listing.price}
            </span>
          )}
        </button>
      </div>
    );
  };

  const renderMyShopContent = (compact: boolean, limit?: number) => {
    if (shopSourceItems.length === 0) {
      return (
        <div className="h-full flex flex-col items-center justify-center gap-1 opacity-60">
          <span style={{ fontSize: compact ? 20 : 28 }}>✋</span>
          <p style={{ fontFamily: FONT_UI, fontSize: compact ? "0.44rem" : "0.55rem", color: "#b07080", textAlign: "center" }}>
            {compact ? "아이템이 없어요" : <>아직 등록할 아이템이 없어요<br />아바타 탭에서 핸드트래킹으로 만들어 보세요</>}
          </p>
        </div>
      );
    }

    const previewUnlisted = limit !== undefined ? unlistedItems.slice(0, limit) : unlistedItems;
    const remaining = limit !== undefined ? Math.max(0, limit - previewUnlisted.length) : activeListings.length;
    const previewListings = limit !== undefined ? activeListings.slice(0, remaining) : activeListings;

    return (
      <div className="flex flex-col gap-1.5">
        {previewUnlisted.length > 0 && (
          <>
            {!compact && <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.3rem", color: "#ff6080" }}>등록 대기</span>}
            {previewUnlisted.map(item => renderUnlistedItem(item, compact))}
          </>
        )}
        {(previewListings.length > 0 || (!compact && activeListings.length > 0)) && (
          <>
            {!compact && <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.3rem", color: "#ff6080" }}>판매 중</span>}
            {(compact ? previewListings : activeListings).map(listing => renderListingItem(listing, compact))}
            {!compact && activeListings.length === 0 && (
              <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#c090a0", textAlign: "center", padding: "8px 0" }}>
                판매 중인 아이템이 없어요
              </p>
            )}
          </>
        )}
      </div>
    );
  };

  const renderGlobalShopSearch = (compact = false) => (
    <div className="relative flex-shrink-0 mb-1.5">
      <input
        type="search"
        value={globalShopQuery}
        onChange={(event) => setGlobalShopQuery(event.target.value)}
        placeholder="판매자 · 아이템 이름 검색"
        className="w-full rounded-lg outline-none"
        style={{
          padding: compact ? "4px 22px 4px 8px" : "6px 28px 6px 10px",
          fontFamily: FONT_UI,
          fontSize: compact ? "0.44rem" : "0.48rem",
          color: "#4a3060",
          background: "rgba(255,255,255,0.88)",
          border: "1px solid rgba(124,58,237,0.22)",
        }}
      />
      {globalShopQuery && (
        <button
          type="button"
          aria-label="검색어 지우기"
          onClick={() => setGlobalShopQuery("")}
          className="absolute top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center"
          style={{
            right: compact ? 4 : 6,
            width: compact ? 14 : 16,
            height: compact ? 14 : 16,
            fontSize: compact ? "0.55rem" : "0.6rem",
            color: "#7c3aed",
            background: "rgba(124,58,237,0.12)",
          }}
        >
          ×
        </button>
      )}
    </div>
  );

  const renderGlobalShopContent = (compact: boolean, limit?: number) => {
    if (isGlobalShopSearching && filteredGlobalListings.length === 0) {
      return (
        <p style={{ fontFamily: FONT_UI, fontSize: compact ? "0.44rem" : "0.48rem", color: "#9070b0", textAlign: "center", padding: "12px 0", lineHeight: 1.5 }}>
          「{globalShopQuery.trim()}」 검색 결과가 없어요
        </p>
      );
    }

    if (limit !== undefined) {
      return (
        <div className="flex flex-col gap-1.5">
          {filteredOfficialListings.length > 0 && (
            <>
              <p style={{ fontFamily: FONT_UI, fontSize: "0.42rem", fontWeight: 700, color: "#7c3aed" }}>
                Re:world 공식 상점
              </p>
              {filteredOfficialListings.map(listing => renderGlobalItem(listing, compact))}
            </>
          )}
          {filteredPlayerShopListings.length > 0 && (
            <>
              <p style={{ fontFamily: FONT_UI, fontSize: "0.42rem", fontWeight: 700, color: "#ff6080", marginTop: filteredOfficialListings.length > 0 ? 4 : 0 }}>
                유저 상점
              </p>
              {filteredPlayerShopListings.slice(0, limit).map(listing => renderPlayerListing(listing, compact))}
            </>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1.5">
        {isGlobalShopSearching && (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "#9070b0" }}>
            검색 결과 {filteredGlobalListings.length}개
          </p>
        )}
        {filteredPlayerShopListings.length > 0 && (
          <>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 700, color: "#ff6080" }}>
              유저 상점
            </p>
            {filteredPlayerShopListings.map(listing => renderPlayerListing(listing, compact))}
          </>
        )}
        {filteredOfficialListings.length > 0 && (
          <>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 700, color: "#7c3aed", marginTop: filteredPlayerShopListings.length > 0 ? 4 : 0 }}>
              Re:world 공식 상점
            </p>
            {filteredOfficialListings.map(listing => renderGlobalItem(listing, compact))}
          </>
        )}
        {!isGlobalShopSearching && filteredPlayerShopListings.length === 0 && filteredOfficialListings.length === 0 && (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#9070b0", textAlign: "center", padding: "8px 0" }}>
            아직 등록된 상품이 없어요
          </p>
        )}
      </div>
    );
  };

  const expandButtonStyle: CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: 6,
    fontFamily: FONT_UI,
    fontSize: "0.75rem",
    fontWeight: 800,
    color: "white",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative" style={{ background: DIARY_PAPER_BG }}>
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b flex-shrink-0" style={{ borderColor: "rgba(255,128,160,0.25)" }}>
        <div className="flex items-center gap-1.5">
          <span style={{ fontFamily: FONT_PIXEL, fontSize: "0.45rem", color: "#ff6080" }}>★</span>
          <span style={{ fontFamily: FONT_UI, fontWeight: 700, fontSize: "0.7rem", color: "#ff6080", letterSpacing: "0.12em" }}>SHOP</span>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{
          background: "linear-gradient(90deg, #ffe080, #ffd060)",
          border: "1px solid rgba(255,180,0,0.35)",
          boxShadow: "0 2px 8px rgba(255,160,0,0.25)",
        }}>
          <CloverCoinIcon size={14} />
          <span style={{ fontFamily: FONT_UI, fontSize: "0.55rem", fontWeight: 800, color: "#a06010" }}>{coins}</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
        {/* 내 상점 — 상단 50% */}
        <div
          className="flex flex-col overflow-hidden px-3 py-2"
          style={{
            flex: 1,
            minHeight: 0,
            borderBottom: "1px solid rgba(255,128,160,0.2)",
            background: "linear-gradient(180deg, rgba(255,240,245,0.35), transparent)",
          }}
        >
          <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
            <span style={{ fontFamily: FONT_UI, fontSize: "0.56rem", fontWeight: 800, color: "#ff6080" }}>내 상점</span>
            <button
              type="button"
              onClick={() => setExpandMine(true)}
              style={{ ...expandButtonStyle, background: "linear-gradient(135deg, #ff6080, #ff80a0)", opacity: hasMoreMine || shopSourceItems.length > 0 ? 1 : 0.45 }}
              aria-label="내 상점 더보기"
            >
              ＋
            </button>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {renderMyShopContent(true, PREVIEW_LIMIT)}
          </div>
        </div>

        {/* 전체 상점 — 하단 50% */}
        <div
          className="flex flex-col overflow-hidden px-3 py-2"
          style={{
            flex: 1,
            minHeight: 0,
            background: "linear-gradient(180deg, rgba(244,240,255,0.4), transparent)",
          }}
        >
          <div className="flex items-center justify-between gap-1 mb-1.5 flex-shrink-0">
            <span style={{ fontFamily: FONT_UI, fontSize: "0.56rem", fontWeight: 800, color: "#7c3aed" }}>전체 상점</span>
            <button
              type="button"
              onClick={() => setExpandGlobal(true)}
              style={{ ...expandButtonStyle, background: "linear-gradient(135deg, #7c3aed, #9b6dff)", opacity: hasMoreGlobal ? 1 : 0.45 }}
              aria-label="전체 상점 더보기"
            >
              ＋
            </button>
          </div>
          {renderGlobalShopSearch(true)}
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {renderGlobalShopContent(true, isGlobalShopSearching ? undefined : PREVIEW_LIMIT)}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expandMine && (
          <motion.div
            className="absolute inset-0 z-40 flex flex-col p-3"
            style={{ background: DIARY_PAPER_BG }}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <span style={{ fontFamily: FONT_UI, fontSize: "0.62rem", fontWeight: 800, color: "#ff6080" }}>내 상점</span>
              <button
                type="button"
                onClick={() => setExpandMine(false)}
                className="px-2 py-0.5 rounded-full"
                style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 700, background: "rgba(255,128,160,0.12)", color: "#9a5060" }}
              >
                닫기
              </button>
            </div>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", color: "#b07080", marginBottom: 8, flexShrink: 0 }}>
              핸드트래킹으로 만든 아이템을 가격을 정해 판매해 보세요
            </p>
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              {renderMyShopContent(false)}
            </div>
          </motion.div>
        )}

        {expandGlobal && (
          <motion.div
            className="absolute inset-0 z-40 flex flex-col p-3"
            style={{ background: DIARY_PAPER_BG }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <span style={{ fontFamily: FONT_UI, fontSize: "0.62rem", fontWeight: 800, color: "#7c3aed" }}>전체 상점</span>
              <button
                type="button"
                onClick={() => setExpandGlobal(false)}
                className="px-2 py-0.5 rounded-full"
                style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 700, background: "rgba(124,58,237,0.12)", color: "#7c3aed" }}
              >
                닫기
              </button>
            </div>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.46rem", color: "#9070b0", marginBottom: 8, flexShrink: 0 }}>
              다른 유저가 등록한 아이템과 Re:world 공식 상품이에요
            </p>
            {renderGlobalShopSearch(false)}
            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
              {renderGlobalShopContent(false)}
            </div>
          </motion.div>
        )}

        {toast && (
          <motion.div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full z-50"
            style={{ background: "rgba(60,30,40,0.88)", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <span style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 700, color: "#ffe0e8", whiteSpace: "nowrap" }}>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RightPage({
  activeTab,
  miniroomData,
  setMiniroomData,
  onNavigateTab,
  avatar,
  onSaveAvatar,
  user,
  visitingFriend,
  onVisitFriend,
  onLeaveFriend,
  onProfileFocus,
  showItemCreator,
  onOpenItemCreator,
  onCloseItemCreator,
  selectedCreatorItemId,
  onSelectCreatorItem,
  onDeleteCreatorItem,
  creatorEquippedItemIds,
  inventoryRevision,
  onRenameInventoryItem,
  onDeleteInventoryItem,
  onSetDecorLayer,
  onShopPurchase,
}: {
  activeTab: string;
  miniroomData: MiniroomData;
  setMiniroomData: Dispatch<SetStateAction<MiniroomData>>;
  onNavigateTab: (tab: string) => void;
  avatar: AvatarProfile;
  onSaveAvatar: (avatar: AvatarProfile) => void;
  user: User;
  visitingFriend: FriendNeighbor | null;
  onVisitFriend: (nb: FriendNeighbor) => void;
  onLeaveFriend: () => void;
  onProfileFocus: (nb: FriendNeighbor) => void;
  showItemCreator: boolean;
  onOpenItemCreator: () => void;
  onCloseItemCreator: () => void;
  selectedCreatorItemId: string | null;
  onSelectCreatorItem: (id: string | null) => void;
  onDeleteCreatorItem: (id: string) => void;
  creatorEquippedItemIds: string[];
  inventoryRevision: number;
  onRenameInventoryItem: (itemId: string, label: string) => void;
  onDeleteInventoryItem: (itemId: string) => void;
  onSetDecorLayer: (itemId: string, layer: "front" | "back") => void;
  onShopPurchase?: () => void;
}) {
  if (activeTab === "profile") {
    if (showItemCreator) {
      return (
        <ItemCreatorRightPage
          userId={user.id}
          selectedCreatorItemId={selectedCreatorItemId}
          equippedItemIds={creatorEquippedItemIds}
          onSelectItem={onSelectCreatorItem}
          onDeleteItem={onDeleteCreatorItem}
          onSetDecorLayer={onSetDecorLayer}
          onClose={onCloseItemCreator}
          inventoryRevision={inventoryRevision}
        />
      );
    }
    return (
      <ProfileAvatarPage
        avatar={avatar}
        userId={user.id}
        onSaveAvatar={onSaveAvatar}
        onOpenItemCreator={onOpenItemCreator}
        inventoryRevision={inventoryRevision}
      />
    );
  }
  if (activeTab === "photo") {
    return (
      <PhotoPage
        avatar={avatar}
        user={user}
        inventoryRevision={inventoryRevision}
        onDeleteItem={onDeleteInventoryItem}
      />
    );
  }
  if (activeTab === "guest") {
    return (
      <GuestbookPage
        user={user}
        visitingFriend={visitingFriend}
        onVisitFriend={onVisitFriend}
        onLeaveFriend={onLeaveFriend}
        onProfileFocus={onProfileFocus}
        onShopPurchase={onShopPurchase}
      />
    );
  }
  if (activeTab === "shop") {
    return (
      <ShopPage
        user={user}
        inventoryRevision={inventoryRevision}
        onPurchaseComplete={onShopPurchase}
      />
    );
  }
  if (activeTab === "board") {
    return <BoardExpandPage user={user} onBack={() => onNavigateTab("home")} />;
  }
  if (activeTab === "myitems") {
    return (
      <MyItemsExpandPage
        user={user}
        inventoryRevision={inventoryRevision}
        onBack={() => onNavigateTab("home")}
        onCreateItem={() => openHandTrackingDrawPage(user.id)}
        onRenameItem={onRenameInventoryItem}
        onDeleteItem={onDeleteInventoryItem}
      />
    );
  }
  if (activeTab === "diary") return <DiaryPage user={user} />;
  if (activeTab === "home") {
    return (
      <HomeRightPage
        user={user}
        avatar={avatar}
        miniroomData={miniroomData}
        inventoryRevision={inventoryRevision}
        onMiniroomDataChange={setMiniroomData}
        onDecorate={() => onNavigateTab("miniroom")}
        visitingFriend={visitingFriend}
        onVisitFriend={onVisitFriend}
        onLeaveFriend={onLeaveFriend}
        onProfileFocus={onProfileFocus}
        onOpenBoard={() => onNavigateTab("board")}
        onOpenMyItems={() => onNavigateTab("myitems")}
        onCreateItem={() => openHandTrackingDrawPage(user.id)}
        onRenameItem={onRenameInventoryItem}
        onDeleteItem={onDeleteInventoryItem}
        onShopPurchase={onShopPurchase}
      />
    );
  }
  if (activeTab === "miniroom") return <MiniRoomPage userId={user.id} miniroomData={miniroomData} setMiniroomData={setMiniroomData} />;
  return null;
}

/* ═══════════════════════════════════════════
   SPREAD PAGE
═══════════════════════════════════════════ */
function SpreadPage({ user, onClose, onLogout, onUserUpdate }: { user: User; onClose: () => void; onLogout?: () => void; onUserUpdate: (user: User) => void }) {
  const { setViewThemeTarget } = useDiaryTheme();

  const handleCloseToCover = () => {
    setViewThemeTarget(null);
    onClose();
  };

  useEffect(() => () => setViewThemeTarget(null), [setViewThemeTarget]);
  const [avatar, setAvatar] = useState<AvatarProfile>(() => {
    const saved = loadAvatarProfile(user.id);
    if (!saved) return DEFAULT_AVATAR_PROFILE;
    return {
      config: {
        body: saved.config.body || DEFAULT_AVATAR_CONFIG.body,
        pixels: saved.config.pixels ?? {},
      },
      equipped: normalizeEquipped(saved.equipped),
    };
  });
  const [activeTab, setActiveTab] = useState("home");
  const [miniroomData, setMiniroomData] = useState<MiniroomData>(() => loadMiniroomData(user.id));
  const [remoteReady, setRemoteReady] = useState(!isSupabaseConfigured());
  const miniroomPersistReadyRef = useRef(!isSupabaseConfigured());
  const miniroomDirtyRef = useRef(false);
  const setMiniroomDataDirty: Dispatch<SetStateAction<MiniroomData>> = (value) => {
    miniroomDirtyRef.current = true;
    setMiniroomData(value);
  };
  const [syncError, setSyncError] = useState<string | null>(null);
  const [visitingFriend, setVisitingFriend] = useState<FriendNeighbor | null>(null);
  const [leftProfileFriend, setLeftProfileFriend] = useState<FriendNeighbor | null>(null);
  const [showItemCreator, setShowItemCreator] = useState(false);
  const [creatorAvatar, setCreatorAvatar] = useState<AvatarProfile>(() => DEFAULT_AVATAR_PROFILE);
  const [creatorClothesOn, setCreatorClothesOn] = useState(true);
  const [creatorEquippedBackup, setCreatorEquippedBackup] = useState<string[]>([]);
  const [selectedCreatorItemId, setSelectedCreatorItemId] = useState<string | null>(null);
  const [creatorOverlayEditing, setCreatorOverlayEditing] = useState(false);
  const [creatorInventoryTick, setCreatorInventoryTick] = useState(0);
  const [creatorSaving, setCreatorSaving] = useState(false);
  const [creatorSaved, setCreatorSaved] = useState(false);
  const [creatorSaveError, setCreatorSaveError] = useState<string | null>(null);
  const [inventoryRevision, setInventoryRevision] = useState(0);
  const [creatorDirty, setCreatorDirty] = useState(false);

  const myAvatarItemsForPreview = useMemo(
    () => loadAvatarCreatorItems(user.id),
    [user.id, showItemCreator, creatorInventoryTick],
  );
  const selectedCreatorItem = myAvatarItemsForPreview.find((item) => item.id === selectedCreatorItemId)
    ?? (selectedCreatorItemId ? loadMyInventory(user.id).find(item => item.id === selectedCreatorItemId) ?? null : null);

  const handleOpenItemCreator = () => {
    const saved = loadAvatarProfile(user.id);
    const profile = saved ? storedToAvatarProfile(saved) : null;
    const base = profile ?? avatar;
    const next = stripUnplacedPurchasedEquipped(user.id, cloneAvatarProfile(base));
    setCreatorAvatar(next);
    setCreatorClothesOn(true);
    setCreatorEquippedBackup(next.equipped.filter(id => !isDecorEquipId(user.id, id)));
    setSelectedCreatorItemId(null);
    setCreatorOverlayEditing(false);
    setCreatorDirty(false);
    setCreatorSaveError(null);
    setCreatorSaved(false);
    setShowItemCreator(true);
    if (activeTab !== "profile") setActiveTab("profile");
  };

  const handleCloseItemCreator = () => {
    setShowItemCreator(false);
    setSelectedCreatorItemId(null);
    setCreatorOverlayEditing(false);
    setCreatorSaveError(null);
    setCreatorSaved(false);
    setCreatorDirty(false);
    setCreatorAvatar(cloneAvatarProfile(avatar));
  };

  const handleSelectCreatorItem = (itemId: string | null) => {
    if (!itemId) {
      setSelectedCreatorItemId(null);
      setCreatorOverlayEditing(false);
      return;
    }
    if (selectedCreatorItemId === itemId) {
      setCreatorOverlayEditing(true);
      return;
    }
    setSelectedCreatorItemId(itemId);
    setCreatorOverlayEditing(true);
    setCreatorDirty(true);
    const creatorPreviewHeight = avatarPreviewHeightForWidth(ITEM_CREATOR_AVATAR_WIDTH);
    const existing = loadMyInventory(user.id).find(entry => entry.id === itemId);
    if (existing && !existing.placement?.referenceWidth) {
      updateHandMadeItem(user.id, itemId, {
        placement: withPlacementReference(
          normalizeItemPlacement(existing.placement),
          ITEM_CREATOR_AVATAR_WIDTH,
          creatorPreviewHeight,
        ),
      });
      setCreatorInventoryTick(tick => tick + 1);
    }
    setCreatorAvatar(prev => ({
      ...prev,
      equipped: prev.equipped.includes(itemId) ? prev.equipped : [...prev.equipped, itemId],
    }));
  };

  const handleRemoveCreatorOverlay = () => {
    if (!selectedCreatorItemId) return;
    const itemId = selectedCreatorItemId;
    setCreatorAvatar(prev => ({
      ...prev,
      equipped: prev.equipped.filter(id => id !== itemId),
    }));
    setSelectedCreatorItemId(null);
    setCreatorOverlayEditing(false);
    setCreatorDirty(true);
  };

  const handleCreatorPlacementChange = (placement: HandMadeItemPlacement) => {
    if (!selectedCreatorItemId) return;
    const creatorPreviewHeight = avatarPreviewHeightForWidth(ITEM_CREATOR_AVATAR_WIDTH);
    const existing = loadMyInventory(user.id).find(entry => entry.id === selectedCreatorItemId);
    updateHandMadeItem(user.id, selectedCreatorItemId, {
      placement: withPlacementReference(
        normalizeItemPlacement({
          ...normalizeItemPlacement(existing?.placement),
          ...normalizeItemPlacement(placement),
        }),
        ITEM_CREATOR_AVATAR_WIDTH,
        creatorPreviewHeight,
      ),
    });
    setCreatorInventoryTick(tick => tick + 1);
    setCreatorDirty(true);
    setCreatorSaved(false);
  };

  const handleSetDecorLayer = (itemId: string, layer: "front" | "back") => {
    const existing = loadMyInventory(user.id).find(entry => entry.id === itemId);
    if (!existing) return;
    const creatorPreviewHeight = avatarPreviewHeightForWidth(ITEM_CREATOR_AVATAR_WIDTH);
    updateHandMadeItem(user.id, itemId, {
      placement: withPlacementReference(
        normalizeItemPlacement({
          ...normalizeItemPlacement(existing.placement),
          layer,
        }),
        ITEM_CREATOR_AVATAR_WIDTH,
        creatorPreviewHeight,
      ),
    });
    setCreatorAvatar(prev => {
      const nextEquipped = prev.equipped.includes(itemId)
        ? prev.equipped
        : [...prev.equipped, itemId];
      return {
        ...prev,
        equipped: reorderEquippedDecorLayer(user.id, nextEquipped, itemId, layer),
      };
    });
    if (!selectedCreatorItemId || selectedCreatorItemId !== itemId) {
      setSelectedCreatorItemId(itemId);
      setCreatorOverlayEditing(true);
    }
    setCreatorInventoryTick(tick => tick + 1);
    setCreatorDirty(true);
    setCreatorSaved(false);
  };

  const toggleCreatorClothes = () => {
    setCreatorAvatar((prev) => {
      if (creatorClothesOn) {
        const decorIds = prev.equipped.filter(id => isDecorEquipId(user.id, id));
        const catalogIds = prev.equipped.filter(id => !isDecorEquipId(user.id, id));
        setCreatorEquippedBackup(catalogIds);
        return { ...prev, equipped: decorIds };
      }
      const decorIds = prev.equipped.filter(id => isDecorEquipId(user.id, id));
      return { ...prev, equipped: [...creatorEquippedBackup, ...decorIds] };
    });
    setCreatorClothesOn((on) => !on);
    setCreatorDirty(true);
    setCreatorSaved(false);
  };

  const removeInventoryItem = async (itemId: string) => {
    if (!deleteHandMadeItem(user.id, itemId)) return false;

    if (isSupabaseConfigured()) {
      const listingResult = await removeShopListingsForItem(user.id, itemId);
      if (!listingResult.ok) setSyncError(listingResult.error);
      const inventoryResult = await upsertUserInventory(user.id, getInventorySnapshot(user.id));
      if (!inventoryResult.ok) setSyncError(inventoryResult.error);
    }

    const stripItem = (profile: AvatarProfile) => ({
      ...profile,
      equipped: profile.equipped.filter(id => id !== itemId),
    });

    setCreatorAvatar(prev => stripItem(prev));
    handleSaveAvatar(stripItem(avatar));

    if (selectedCreatorItemId === itemId) {
      setSelectedCreatorItemId(null);
      setCreatorOverlayEditing(false);
    }

    setCreatorInventoryTick(tick => tick + 1);
    setInventoryRevision(revision => revision + 1);
    setCreatorDirty(true);
    setCreatorSaved(false);
    return true;
  };

  const handleRenameInventoryItem = async (itemId: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const updated = updateHandMadeItem(user.id, itemId, { label: trimmed });
    if (!updated) return;

    if (isSupabaseConfigured()) {
      const listingResult = await syncShopListingItemSnapshot(user.id, itemId, updated);
      if (!listingResult.ok) setSyncError(listingResult.error);
      const inventoryResult = await upsertUserInventory(user.id, getInventorySnapshot(user.id));
      if (!inventoryResult.ok) setSyncError(inventoryResult.error);
    }

    setCreatorInventoryTick(tick => tick + 1);
    setInventoryRevision(revision => revision + 1);
  };

  const handleDeleteInventoryItem = (itemId: string) => {
    void removeInventoryItem(itemId);
  };

  const handleDeleteCreatorItem = (itemId: string) => {
    void removeInventoryItem(itemId);
  };

  const handleVisitFriend = (nb: FriendNeighbor) => {
    setVisitingFriend(nb);
    setLeftProfileFriend(nb);
    setActiveTab("home");
  };

  const handleLeaveFriend = () => {
    setVisitingFriend(null);
    setLeftProfileFriend(null);
  };

  useEffect(() => {
    if (visitingFriend?.friendUserId) {
      setViewThemeTarget({ userId: visitingFriend.friendUserId, nickname: visitingFriend.name });
      return;
    }
    setViewThemeTarget(null);
  }, [visitingFriend, setViewThemeTarget]);

  const handleProfileFocus = (nb: FriendNeighbor) => {
    setLeftProfileFriend((prev) => {
      if (prev?.friendUserId && nb.friendUserId && prev.friendUserId === nb.friendUserId) return prev;
      if (!prev?.friendUserId && !nb.friendUserId && prev?.id === nb.id) return prev;
      return nb;
    });
  };

  const handleTabChange = (tabId: string) => {
    if (tabId !== activeTab) {
      handleLeaveFriend();
      setShowItemCreator(false);
    }
    setActiveTab(tabId);
  };

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    return startPresenceHeartbeat(user.id);
  }, [user.id]);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setRemoteReady(true);
      return;
    }

    let cancelled = false;
    setRemoteReady(false);
    miniroomPersistReadyRef.current = false;
    miniroomDirtyRef.current = false;
    setSyncError(null);

    (async () => {
      const tableCheck = await checkUserDataTables();
      if (cancelled) return;
      if (!tableCheck.ok) {
        setSyncError(tableCheck.error);
        setRemoteReady(true);
        return;
      }

      const localAvatar = loadAvatarProfile(user.id);
      const localRoom = loadMiniroomData(user.id);
      const localInventory = getInventorySnapshot(user.id);
      const [remoteAvatar, remoteRoom, remoteInventory] = await Promise.all([
        fetchUserAvatar(user.id),
        fetchUserMiniroom(user.id),
        fetchUserInventory(user.id),
      ]);

      if (cancelled) return;

      if (remoteInventory) {
        const localRecoverable = findLocalHandmadeMissingFromRemote(user.id, remoteInventory.items);
        const mergedItems = mergeInventoryWithRemoteSync(
          localInventory.items,
          remoteInventory.items,
          remoteInventory.updatedAt,
        );
        const finalItems = localRecoverable.length > 0
          ? mergeInventoryItems(localRecoverable, mergedItems)
          : mergedItems;
        const mergedOwned = Array.from(new Set([...localInventory.ownedListingIds, ...remoteInventory.ownedListingIds]));
        applyInventorySnapshot(user.id, finalItems, mergedOwned, remoteInventory.coins);
        if (localRecoverable.length > 0 || localInventory.items.some(
          item => !remoteInventory.items.some(remoteItem => remoteItem.id === item.id),
        )) {
          void upsertUserInventory(user.id, getInventorySnapshot(user.id));
        }
      } else if (localInventory.items.length > 0 || localInventory.coins !== DEFAULT_SHOP_COINS) {
        void upsertUserInventory(user.id, localInventory);
      }

      if (remoteAvatar) {
        setAvatar(storedToAvatarProfile(remoteAvatar) ?? DEFAULT_AVATAR_PROFILE);
        saveAvatarProfile(user.id, remoteAvatar);
      } else if (localAvatar) {
        const uploaded = await upsertUserAvatar(user.id, localAvatar);
        if (!uploaded.ok && !cancelled) setSyncError(uploaded.error);
      }

      const mergedRoom = mergeMiniroomData(localRoom, remoteRoom);
      setMiniroomData(mergedRoom);
      saveMiniroomData(mergedRoom, user.id);
      if (hasMiniroomSelections(mergedRoom) && !remoteRoom && hasMiniroomSelections(localRoom)) {
        const uploaded = await upsertUserMiniroom(user.id, mergedRoom);
        if (!uploaded.ok && !cancelled) setSyncError(uploaded.error);
      }

      miniroomPersistReadyRef.current = true;
      setRemoteReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [user.id]);

  useEffect(() => {
    saveMiniroomData(miniroomData, user.id);
    if (!remoteReady || !isSupabaseConfigured() || !miniroomPersistReadyRef.current) return;
    if (!hasMiniroomSelections(miniroomData) && !miniroomDirtyRef.current) return;

    const timer = window.setTimeout(() => {
      void upsertUserMiniroom(user.id, miniroomData).then((result) => {
        if (!result.ok) setSyncError(result.error);
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [miniroomData, user.id, remoteReady]);

  useEffect(() => {
    saveAvatarProfile(user.id, avatar);
    if (!remoteReady || !isSupabaseConfigured()) return;

    const timer = window.setTimeout(() => {
      void upsertUserAvatar(user.id, avatar).then((result) => {
        if (!result.ok) setSyncError(result.error);
      });
    }, 400);

    return () => window.clearTimeout(timer);
  }, [user.id, avatar, remoteReady]);

  const handleSaveAvatar = (next: AvatarProfile) => {
    const cleaned = stripUnplacedPurchasedEquipped(user.id, next);
    setAvatar(cleaned);
    saveAvatarProfile(user.id, cleaned);
    if (isSupabaseConfigured()) {
      const snapshot = getInventorySnapshot(user.id);
      void upsertUserAvatar(user.id, cleaned).then((result) => {
        if (!result.ok) setSyncError(result.error);
      });
      void upsertUserInventory(user.id, snapshot).then((result) => {
        if (!result.ok) setSyncError(result.error);
      });
    }
  };

  const handleSaveItemCreator = async () => {
    setCreatorSaving(true);
    setCreatorSaveError(null);

    const nextAvatar = buildItemCreatorSavedAvatar(
      user.id,
      avatar,
      creatorAvatar,
      creatorClothesOn,
      creatorEquippedBackup,
      selectedCreatorItemId,
    );
    const decorEquipIds = nextAvatar.equipped.filter(id => isDecorEquipId(user.id, id));
    markAvatarPlacedItems(user.id, decorEquipIds);
    const snapshot = getInventorySnapshot(user.id);

    handleSaveAvatar(nextAvatar);
    setCreatorAvatar(cloneAvatarProfile(nextAvatar));
    setCreatorEquippedBackup(nextAvatar.equipped.filter(id => isDecorEquipId(user.id, id)));
    setInventoryRevision(revision => revision + 1);
    setCreatorInventoryTick(tick => tick + 1);
    setCreatorDirty(false);

    if (isSupabaseConfigured()) {
      const inventoryResult = await upsertUserInventory(user.id, snapshot);
      if (!inventoryResult.ok) {
        setCreatorSaveError(`아바타는 저장됐어요. 인벤토리 동기화 실패: ${inventoryResult.error}`);
        setCreatorSaved(true);
        setCreatorSaving(false);
        window.setTimeout(() => setCreatorSaved(false), 2000);
        return;
      }
    }

    setCreatorSaved(true);
    setCreatorSaving(false);
    window.setTimeout(() => setCreatorSaved(false), 2000);
  };

  return (
    <div className="size-full flex items-center justify-center overflow-auto relative" style={{
      background: "var(--diary-outer-bg)",
    }}>
      <div className="absolute top-1/2 right-4 z-20 -translate-y-1/2">
        <DiaryColorPicker compact />
      </div>
      {syncError && (
        <div
          className="absolute top-3 left-1/2 z-50 px-3 py-2 rounded-xl max-w-[90vw]"
          style={{
            transform: "translateX(-50%)",
            background: "rgba(255,71,87,0.95)",
            boxShadow: "0 4px 16px rgba(255,71,87,0.35)",
          }}
        >
          <p style={{ fontFamily: FONT_UI, fontSize: "0.55rem", fontWeight: 700, color: "#fff", lineHeight: 1.4, textAlign: "center" }}>
            저장 오류: {syncError}
          </p>
          <button
            type="button"
            onClick={() => setSyncError(null)}
            className="mt-1 w-full py-0.5 rounded-lg"
            style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 700, color: "#ff4757", background: "#fff" }}
          >
            닫기
          </button>
        </div>
      )}
      {/* ambient */}
      <div className="absolute pointer-events-none" style={{
        width: 600, height: 400, top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        background: "radial-gradient(ellipse, rgba(var(--diary-mid-rgb), 0.14) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />

      {/* book spread — fixed size */}
      <motion.div
        className="relative flex flex-shrink-0"
        style={{
          width: DIARY_SPREAD_W,
          height: DIARY.pageH,
          boxShadow: "0 20px 80px rgba(var(--diary-dark-rgb), 0.22), 0 4px 20px rgba(var(--diary-mid-rgb), 0.18)",
        }}
        initial={{ scaleX: 0.3, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* LEFT PAGE */}
        <div style={{
          width: DIARY.pageW,
          height: DIARY.pageH,
          borderRadius: "8px 0 0 8px",
          overflow: "hidden",
          boxShadow: "inset -4px 0 12px rgba(0,0,0,0.06)",
          flexShrink: 0,
        }}>
          {leftProfileFriend ? (
            <FriendProfileLeftPage nb={leftProfileFriend} user={user} onVisitFriend={handleVisitFriend} />
          ) : showItemCreator && activeTab === "profile" ? (
            <ItemCreatorLeftPage
              creatorAvatar={creatorAvatar}
              userId={user.id}
              creatorClothesOn={creatorClothesOn}
              onToggleClothes={toggleCreatorClothes}
              selectedItem={selectedCreatorItem}
              overlayEditing={creatorOverlayEditing}
              onSelectItem={handleSelectCreatorItem}
              onDeselectOverlay={() => setCreatorOverlayEditing(false)}
              onRemoveOverlay={handleRemoveCreatorOverlay}
              onPlacementChange={handleCreatorPlacementChange}
              onSave={() => { void handleSaveItemCreator(); }}
              saving={creatorSaving}
              saved={creatorSaved}
              saveError={creatorSaveError}
              inventoryRevision={creatorInventoryTick}
            />
          ) : (
            <LeftPage user={user} avatar={avatar} onUserUpdate={onUserUpdate} onVisitFriend={handleVisitFriend} inventoryRevision={inventoryRevision} />
          )}
        </div>

        {/* SPINE */}
        <div style={{
          width: DIARY.spineW,
          height: DIARY.pageH,
          background: "var(--diary-spine-bg)",
          boxShadow: "2px 0 8px rgba(0,0,0,0.08), -2px 0 8px rgba(0,0,0,0.08)",
          flexShrink: 0,
        }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="mx-auto mt-3 w-1.5 h-1.5 rounded-full" style={{
              background: i % 3 === 0 ? "var(--diary-mid)" : "rgba(255,255,255,0.45)",
            }} />
          ))}
        </div>

        {/* RIGHT PAGE */}
        <div style={{
          width: DIARY.pageW,
          height: DIARY.pageH,
          overflow: "hidden",
          boxShadow: "inset 4px 0 12px rgba(0,0,0,0.04)",
          flexShrink: 0,
        }}>
          <RightPage
            activeTab={activeTab}
            miniroomData={miniroomData}
            setMiniroomData={setMiniroomDataDirty}
            onNavigateTab={handleTabChange}
            avatar={avatar}
            onSaveAvatar={handleSaveAvatar}
            user={user}
            visitingFriend={visitingFriend}
            onVisitFriend={handleVisitFriend}
            onLeaveFriend={handleLeaveFriend}
            onProfileFocus={handleProfileFocus}
            showItemCreator={showItemCreator}
            onOpenItemCreator={handleOpenItemCreator}
            onCloseItemCreator={handleCloseItemCreator}
            selectedCreatorItemId={selectedCreatorItemId}
            onSelectCreatorItem={handleSelectCreatorItem}
            onDeleteCreatorItem={handleDeleteCreatorItem}
            creatorEquippedItemIds={creatorAvatar.equipped}
            inventoryRevision={inventoryRevision}
            onRenameInventoryItem={handleRenameInventoryItem}
            onDeleteInventoryItem={handleDeleteInventoryItem}
            onSetDecorLayer={handleSetDecorLayer}
            onShopPurchase={() => setInventoryRevision(revision => revision + 1)}
          />
        </div>

        {/* BOOKMARK TABS on far right */}
        <div className="flex flex-col" style={{ flexShrink: 0 }}>
          {TABS.map((tab, i) => (
            <motion.button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="relative flex items-center justify-center"
              style={{
                width: DIARY.tabW,
                height: DIARY.pageH / TABS.length,
                borderRadius: i === 0 ? "0 8px 0 0" : i === TABS.length - 1 ? "0 0 8px 0" : "0",
                background: activeTab === tab.id
                  ? `linear-gradient(90deg, ${tab.color}, ${tab.color}dd)`
                  : `linear-gradient(90deg, ${tab.color}88, ${tab.color}66)`,
                borderLeft: `2px solid ${tab.color}`,
                borderTop: i === 0 ? `1px solid ${tab.color}` : "none",
                borderBottom: i === TABS.length - 1 ? `1px solid ${tab.color}` : `1px solid ${tab.color}44`,
                borderRight: `1px solid ${tab.color}`,
                boxShadow: activeTab === tab.id
                  ? `2px 0 8px ${tab.color}66`
                  : "none",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              whileHover={{ x: 2 }}
            >
              {/* active indicator */}
              {activeTab === tab.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r" style={{ background: "rgba(255,255,255,0.6)" }} />
              )}
              <span style={{
                writingMode: "vertical-rl",
                fontFamily: FONT_UI,
                fontSize: "0.48rem",
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? "#fff" : "rgba(80,30,60,0.75)",
                letterSpacing: "0.05em",
                userSelect: "none",
              }}>
                {tab.label}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* back button */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <motion.button
          className="px-3 py-1.5 rounded-full text-white text-xs font-semibold"
          style={{
            fontFamily: FONT_UI,
            background: "linear-gradient(135deg, var(--diary-dark), var(--diary-mid))",
            boxShadow: "0 2px 10px rgba(var(--diary-dark-rgb), 0.35)",
            fontSize: "0.65rem",
          }}
          onClick={handleCloseToCover}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          ← 표지로
        </motion.button>
        {onLogout && (
          <motion.button
            className="px-3 py-1.5 rounded-full"
            style={{
              fontFamily: FONT_UI,
              fontSize: "0.58rem",
              fontWeight: 600,
              color: "var(--diary-dark)",
              background: "rgba(255,255,255,0.88)",
              border: "1px solid rgba(var(--diary-mid-rgb), 0.3)",
            }}
            onClick={onLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            로그아웃
          </motion.button>
        )}
      </div>
    </div>
  );
}
/* ═══════════════════════════════════════════
   ROOT
═══════════════════════════════════════════ */
type AppPage = "auth" | "nickname-setup" | "cover" | "spread";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<AppPage>("auth");
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = bootstrapAuth(
      (result) => {
        if (!result) {
          setUser(null);
          setPage("auth");
          setAuthLoading(false);
          return;
        }

        setAuthError(null);
        setUser(result.user);
        try {
          const restore = sessionStorage.getItem(DIARY_RESTORE_SPREAD_KEY);
          if (restore === "spread") {
            sessionStorage.removeItem(DIARY_RESTORE_SPREAD_KEY);
            setPage("spread");
          } else {
            setPage(result.needsNicknameSetup ? "nickname-setup" : "cover");
          }
        } catch {
          setPage(result.needsNicknameSetup ? "nickname-setup" : "cover");
        }
        setAuthLoading(false);
      },
      (message) => {
        setAuthError(message);
        setUser(null);
        setPage("auth");
        setAuthLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const handleAuthSuccess = (loggedIn: User) => {
    setUser(loggedIn);
    setPage("cover");
  };

  const handleNicknameComplete = (loggedIn: User) => {
    setUser(loggedIn);
    setPage("cover");
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setPage("auth");
  };

  if (authLoading) {
    return (
      <DiaryThemeProvider userId={user?.id} userNickname={user?.nickname}>
        <div className="size-full flex items-center justify-center" style={{ background: "var(--diary-outer-bg)" }}>
          <p style={{ fontFamily: FONT_UI, fontSize: "0.75rem", fontWeight: 700, color: "var(--diary-dark)" }}>불러오는 중...</p>
        </div>
      </DiaryThemeProvider>
    );
  }

  return (
    <DiaryThemeProvider userId={user?.id} userNickname={user?.nickname}>
    <div className="size-full">
      <AnimatePresence mode="wait">
        {page === "auth" && (
          <motion.div key="auth" className="size-full" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <AuthPage
              onSuccess={handleAuthSuccess}
              initialError={authError}
              onClearError={() => setAuthError(null)}
            />
          </motion.div>
        )}
        {page === "nickname-setup" && user && (
          <motion.div key="nickname-setup" className="size-full" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
            <NicknameSetupPage userId={user.id} onComplete={handleNicknameComplete} />
          </motion.div>
        )}
        {page === "cover" && (
          <motion.div key="cover" className="size-full" exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}>
            <CoverPage onOpen={() => setPage("spread")} nickname={user?.nickname} />
          </motion.div>
        )}
        {page === "spread" && user && (
          <motion.div key="spread" className="size-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <SpreadPage
              user={user}
              onClose={() => setPage("cover")}
              onLogout={handleLogout}
              onUserUpdate={setUser}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </DiaryThemeProvider>
  );
}
