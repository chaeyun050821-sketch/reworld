import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { User } from "../lib/auth";
import {
  buyMarketplaceListing,
  cancelMarketplaceListing,
  createMarketplaceListing,
  DEMO_SHOP_USERS,
  ensureDemoMarketplaceListings,
  getReservedItemCount,
  loadCommerceSnapshot,
  loadSellerListings,
  type CommerceSnapshot,
  type MarketplaceListing,
} from "../lib/commerce";
import { getCloverBalance, subscribeCloverRewards } from "../lib/clover-rewards";
import { loadFriends } from "../lib/friends";
import { SHOP_CATALOG, SHOP_CATEGORIES, getShopCatalogItem, getShopItemImage, type ShopCatalogItem } from "./shop-catalog";
import { FONT_PIXEL, FONT_UI } from "./ui-fonts";
import shopCoinImage from "../../coin-transparent.png";

const PAPER_BG = "linear-gradient(160deg, #FFFDF8 0%, #FFF8F0 100%)";

type ShopOwner = { id: string; nickname: string };

function Coin({ size = 13 }: { size?: number }) {
  return <img src={shopCoinImage} alt="클로버" width={size} height={size} style={{ imageRendering: "pixelated", objectFit: "contain" }} />;
}

function CatalogItemPreview({ item, size = 44 }: { item: ShopCatalogItem; size?: number }) {
  const [broken, setBroken] = useState(false);
  const image = getShopItemImage(item);
  if (image && !broken) {
    return (
      <img
        src={image}
        alt={item.label}
        width={size}
        height={size}
        onError={() => setBroken(true)}
        style={{ objectFit: "contain", imageRendering: "pixelated" }}
      />
    );
  }
  return <span style={{ fontSize: Math.round(size * 0.58), lineHeight: 1 }}>{item.preview}</span>;
}

export default function MarketplacePage({ user }: { user: User }) {
  const [snapshot, setSnapshot] = useState<CommerceSnapshot | null>(null);
  const [viewOwner, setViewOwner] = useState<ShopOwner | null>(null);
  const [registering, setRegistering] = useState(false);
  const [friendListings, setFriendListings] = useState<MarketplaceListing[]>([]);
  const [friends, setFriends] = useState<ShopOwner[]>([]);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [category, setCategory] = useState<(typeof SHOP_CATEGORIES)[number]>("전체");
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refreshMine = async () => {
    const next = await loadCommerceSnapshot(user.id);
    setSnapshot(next);
    setLoading(false);
  };

  useEffect(() => {
    ensureDemoMarketplaceListings();
    void refreshMine();
    void loadFriends(user.id).then((rows) => {
      setFriends(rows.map((friend) => ({ id: friend.friendUserId, nickname: friend.nickname })));
    });
  }, [user.id]);

  // Keep shop balance in lockstep with profile 네잎클로버 (shared clover store).
  useEffect(() => {
    return subscribeCloverRewards(user.id, () => {
      setSnapshot((prev) =>
        prev ? { ...prev, balance: getCloverBalance(user.id) } : prev,
      );
    });
  }, [user.id]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const shopCandidates = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const previewShops = snapshot?.remote
      ? []
      : DEMO_SHOP_USERS.map((entry) => ({ ...entry }));
    const merged = [...friends, ...previewShops];
    const unique = Array.from(new Map(merged.map((entry) => [entry.id, entry])).values());
    if (!normalized) return [];
    return unique.filter((entry) => entry.nickname.toLowerCase().includes(normalized)).slice(0, 6);
  }, [friends, query, snapshot?.remote]);

  const openFriendShop = async (owner: ShopOwner) => {
    setBusyId(`shop-${owner.id}`);
    const listings = await loadSellerListings(owner.id);
    setFriendListings(listings);
    setViewOwner(owner);
    setRegistering(false);
    setCategory("전체");
    setSearched(false);
    setBusyId(null);
  };

  const handleSearch = () => {
    if (!query.trim()) {
      setToast("친구 닉네임을 입력해 주세요.");
      return;
    }
    setSearched(true);
    if (shopCandidates.length === 1) void openFriendShop(shopCandidates[0]);
  };

  const filteredCatalog = SHOP_CATALOG.filter((item) => category === "전체" || item.category === category);
  const listingsByItem = new Map((snapshot?.listings ?? []).map((listing) => [listing.itemId, listing]));
  const ownedIds = new Set(snapshot?.inventory.filter((entry) => entry.quantity > 0).map((entry) => entry.itemId) ?? []);
  const myItems = filteredCatalog.filter((item) => ownedIds.has(item.id));
  const visibleMyListings = (snapshot?.listings ?? []).filter((listing) => {
    const item = getShopCatalogItem(listing.itemId);
    return item && (category === "전체" || item.category === category);
  });
  const visibleFriendListings = friendListings.filter((listing) => {
    const item = getShopCatalogItem(listing.itemId);
    return item && (category === "전체" || item.category === category);
  });

  const handleList = async (item: ShopCatalogItem) => {
    if (!snapshot || busyId) return;
    const price = Number(priceDrafts[item.id] || item.price);
    setBusyId(item.id);
    const result = await createMarketplaceListing(user.id, user.nickname, item.id, price, snapshot.remote);
    setBusyId(null);
    setToast(result.ok ? `“${item.label}”을(를) 상점에 등록했어요.` : result.error);
    if (result.ok) {
      await refreshMine();
      setRegistering(false);
      setCategory("전체");
    }
  };

  const handleCancel = async (listing: MarketplaceListing) => {
    if (!snapshot || busyId) return;
    setBusyId(listing.id);
    const result = await cancelMarketplaceListing(user.id, listing.id, snapshot.remote);
    setBusyId(null);
    setToast(result.ok ? result.message : result.error);
    if (result.ok) await refreshMine();
  };

  const handleBuy = async (listing: MarketplaceListing) => {
    if (!snapshot || busyId) return;
    setBusyId(listing.id);
    const result = await buyMarketplaceListing(user.id, listing, snapshot.remote);
    setBusyId(null);
    setToast(result.ok ? result.message : result.error);
    if (result.ok && viewOwner) {
      await Promise.all([
        refreshMine(),
        loadSellerListings(viewOwner.id).then(setFriendListings),
      ]);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden relative" style={{ background: PAPER_BG }}>
      <div className="px-3 pt-3 pb-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,128,160,0.22)" }}>
        {viewOwner ? (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setViewOwner(null);
                setFriendListings([]);
                setRegistering(false);
                setCategory("전체");
              }}
              className="px-2 py-1 rounded-full"
              style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 800, color: "#7c3aed", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}
            >
              ← 내 상점으로
            </button>
            <div className="min-w-0 text-right">
              <p style={{ fontFamily: FONT_PIXEL, fontSize: "0.34rem", color: "#7c3aed" }}>FRIEND SHOP</p>
              <p style={{ fontFamily: FONT_UI, fontSize: "0.66rem", fontWeight: 900, color: "#4a3060", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {viewOwner.nickname}의 상점
              </p>
            </div>
          </div>
        ) : registering ? (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setRegistering(false);
                setCategory("전체");
              }}
              className="px-2 py-1 rounded-full"
              style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 800, color: "#a05068", background: "rgba(255,96,128,0.1)", border: "1px solid rgba(255,96,128,0.2)" }}
            >
              ← 내 상점으로
            </button>
            <div className="min-w-0 text-right">
              <p style={{ fontFamily: FONT_PIXEL, fontSize: "0.34rem", color: "#ff6080" }}>MY ITEMS</p>
              <p style={{ fontFamily: FONT_UI, fontSize: "0.66rem", fontWeight: 900, color: "#6a3040" }}>보유 아이템 등록</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div>
                <p style={{ fontFamily: FONT_PIXEL, fontSize: "0.34rem", color: "#ff6080" }}>MY SHOP</p>
                <p style={{ fontFamily: FONT_UI, fontSize: "0.66rem", fontWeight: 900, color: "#6a3040" }}>{user.nickname}의 상점</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 px-2 py-1 rounded-full" style={{ background: "rgba(255,224,120,0.2)", border: "1px solid rgba(220,170,50,0.25)" }}>
                  <Coin />
                  <span style={{ fontFamily: FONT_UI, fontSize: "0.55rem", fontWeight: 900, color: "#a06010" }}>{snapshot?.balance ?? "..."}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRegistering(true);
                    setCategory("전체");
                  }}
                  className="px-2.5 py-1 rounded-full text-white"
                  style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 900, background: "linear-gradient(135deg,#ff6080,#ff80a0)", boxShadow: "0 2px 8px rgba(255,96,128,0.24)" }}
                >
                  ＋ 등록하기
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="flex gap-1">
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSearched(false);
                  }}
                  onKeyDown={(event) => event.key === "Enter" && handleSearch()}
                  placeholder="친구 닉네임으로 상점 검색"
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-xl outline-none"
                  style={{ fontFamily: FONT_UI, fontSize: "0.5rem", background: "rgba(255,255,255,0.9)", border: "1.5px solid rgba(124,58,237,0.2)", color: "#4a3060" }}
                />
                <button type="button" onClick={handleSearch} className="px-3 py-1.5 rounded-xl text-white" style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 800, background: "linear-gradient(135deg,#7c3aed,#9b6dff)" }}>
                  검색
                </button>
              </div>
              {searched && (
                <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl overflow-hidden" style={{ background: "#fffdfb", border: "1px solid rgba(124,58,237,0.2)", boxShadow: "0 8px 20px rgba(74,48,96,0.14)" }}>
                  {shopCandidates.length === 0 ? (
                    <p className="px-3 py-3 text-center" style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#9070b0" }}>검색되는 친구가 없어요.</p>
                  ) : shopCandidates.map((owner) => (
                    <button
                      key={owner.id}
                      type="button"
                      onClick={() => void openFriendShop(owner)}
                      className="w-full px-3 py-2 flex items-center justify-between text-left"
                      style={{ borderBottom: "1px solid rgba(124,58,237,0.08)" }}
                    >
                      <span style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 800, color: "#4a3060" }}>{owner.nickname}</span>
                      <span style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "#7c3aed" }}>{busyId === `shop-${owner.id}` ? "불러오는 중..." : "상점 보기 →"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="px-3 py-2 flex gap-1 overflow-x-auto flex-shrink-0" style={{ scrollbarWidth: "none" }}>
        {SHOP_CATEGORIES.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setCategory(entry)}
            className="px-2.5 py-1 rounded-full flex-shrink-0"
            style={{
              fontFamily: FONT_UI,
              fontSize: "0.46rem",
              fontWeight: 800,
              color: category === entry ? "white" : viewOwner ? "#7c3aed" : "#a05068",
              background: category === entry ? (viewOwner ? "linear-gradient(135deg,#7c3aed,#9b6dff)" : "linear-gradient(135deg,#ff6080,#ff80a0)") : "rgba(255,255,255,0.78)",
              border: category === entry ? "none" : "1px solid rgba(255,128,160,0.16)",
            }}
          >
            {entry}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3" style={{ scrollbarWidth: "thin" }}>
        {loading ? (
          <div className="h-full flex items-center justify-center"><p style={{ fontFamily: FONT_UI, fontSize: "0.52rem", color: "#b07080" }}>상점을 준비하고 있어요...</p></div>
        ) : viewOwner ? (
          visibleFriendListings.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 opacity-65"><span style={{ fontSize: 30 }}>🏪</span><p style={{ fontFamily: FONT_UI, fontSize: "0.54rem", color: "#9070b0" }}>판매 중인 아이템이 없어요.</p></div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {visibleFriendListings.map((listing) => {
                const item = getShopCatalogItem(listing.itemId);
                if (!item) return null;
                return (
                  <motion.div key={listing.id} className="rounded-2xl p-2 flex flex-col gap-1.5" style={{ background: "rgba(255,255,255,0.82)", border: "1px solid rgba(124,58,237,0.16)" }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="h-[74px] rounded-xl flex items-center justify-center" style={{ background: `${item.color}18` }}><CatalogItemPreview item={item} size={62} /></div>
                    <div className="min-w-0">
                      <p style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 900, color: "#4a3060", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</p>
                      <p style={{ fontFamily: FONT_UI, fontSize: "0.4rem", color: "#9070b0" }}>{item.category}</p>
                    </div>
                    <button type="button" onClick={() => void handleBuy(listing)} disabled={busyId === listing.id} className="py-1.5 rounded-xl text-white flex items-center justify-center gap-1" style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 900, background: "linear-gradient(135deg,#7c3aed,#9b6dff)", opacity: busyId === listing.id ? 0.55 : 1 }}>
                      <Coin size={11} /> {busyId === listing.id ? "구매 중..." : listing.price}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : registering ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 900, color: "#a05068" }}>내 보유 아이템</p>
              <p style={{ fontFamily: FONT_UI, fontSize: "0.4rem", color: "#b08090" }}>가격을 정하고 등록할 아이템을 골라 주세요</p>
            </div>
            {myItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-2 opacity-65"><span style={{ fontSize: 30 }}>🎁</span><p style={{ fontFamily: FONT_UI, fontSize: "0.54rem", color: "#a05068" }}>보유 중인 아이템이 없어요.</p></div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {myItems.map((item) => {
                  const listing = listingsByItem.get(item.id);
                  const inventoryQuantity = snapshot?.inventory.find((entry) => entry.itemId === item.id)?.quantity ?? 0;
                  const available = inventoryQuantity > getReservedItemCount(snapshot?.listings ?? [], item.id);
                  return (
                    <motion.div key={item.id} className="rounded-2xl p-2 flex flex-col gap-1.5" style={{ background: "rgba(255,255,255,0.82)", border: listing ? "1.5px solid rgba(255,96,128,0.38)" : "1px solid rgba(255,128,160,0.16)" }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="h-[70px] rounded-xl flex items-center justify-center relative" style={{ background: `${item.color}18` }}>
                        <CatalogItemPreview item={item} size={58} />
                        {listing && <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full" style={{ fontFamily: FONT_UI, fontSize: "0.34rem", fontWeight: 900, color: "white", background: "#ff6080" }}>판매 중</span>}
                      </div>
                      <div className="min-w-0">
                        <p style={{ fontFamily: FONT_UI, fontSize: "0.49rem", fontWeight: 900, color: "#6a3040", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</p>
                        <p style={{ fontFamily: FONT_UI, fontSize: "0.38rem", color: "#b08090" }}>{item.category} · 보유 {inventoryQuantity}</p>
                      </div>
                      {listing ? (
                        <span className="py-1 rounded-lg flex items-center justify-center gap-1" style={{ fontFamily: FONT_UI, fontSize: "0.44rem", fontWeight: 900, color: "#a06010", background: "rgba(255,224,120,0.18)" }}><Coin size={10} />{listing.price}에 등록됨</span>
                      ) : (
                        <div className="flex gap-1">
                          <input type="number" min={1} value={priceDrafts[item.id] ?? item.price} onChange={(event) => setPriceDrafts((prev) => ({ ...prev, [item.id]: event.target.value }))} className="flex-1 min-w-0 px-1 py-1 rounded-lg text-center outline-none" style={{ fontFamily: FONT_UI, fontSize: "0.43rem", border: "1px solid rgba(255,128,160,0.22)", background: "#fffaf4" }} />
                          <button type="button" onClick={() => void handleList(item)} disabled={!available || busyId === item.id} className="px-2 py-1 rounded-lg text-white" style={{ fontFamily: FONT_UI, fontSize: "0.42rem", fontWeight: 900, background: "linear-gradient(135deg,#ff6080,#ff80a0)", opacity: !available || busyId === item.id ? 0.45 : 1 }}>{busyId === item.id ? "등록 중" : "등록하기"}</button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        ) : visibleMyListings.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-2">
            <span style={{ fontSize: 30 }}>🏪</span>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.54rem", color: "#a05068" }}>내 상점에 등록된 아이템이 없어요.</p>
            <button type="button" onClick={() => setRegistering(true)} className="px-3 py-1.5 rounded-full text-white" style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 900, background: "linear-gradient(135deg,#ff6080,#ff80a0)" }}>＋ 등록하기</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {visibleMyListings.map((listing) => {
              const item = getShopCatalogItem(listing.itemId);
              if (!item) return null;
              return (
                <motion.div key={listing.id} className="rounded-2xl p-2 flex flex-col gap-1.5" style={{ background: "rgba(255,255,255,0.84)", border: "1.5px solid rgba(255,96,128,0.3)" }} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="h-[74px] rounded-xl flex items-center justify-center relative" style={{ background: `${item.color}18` }}>
                    <CatalogItemPreview item={item} size={62} />
                    <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full" style={{ fontFamily: FONT_UI, fontSize: "0.34rem", fontWeight: 900, color: "white", background: "#ff6080" }}>판매 중</span>
                  </div>
                  <div className="min-w-0">
                    <p style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 900, color: "#6a3040", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</p>
                    <p style={{ fontFamily: FONT_UI, fontSize: "0.4rem", color: "#b08090" }}>{item.category}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1" style={{ fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 900, color: "#a06010", background: "rgba(255,224,120,0.18)" }}><Coin size={10} />{listing.price}</span>
                    <button type="button" onClick={() => void handleCancel(listing)} disabled={busyId === listing.id} className="px-2 py-1.5 rounded-lg" style={{ fontFamily: FONT_UI, fontSize: "0.42rem", fontWeight: 800, color: "#a05068", background: "rgba(255,96,128,0.1)", opacity: busyId === listing.id ? 0.55 : 1 }}>내리기</button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full" style={{ background: "rgba(60,30,40,0.9)", boxShadow: "0 4px 18px rgba(0,0,0,0.2)" }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
            <span style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 800, color: "#ffe8ee", whiteSpace: "nowrap" }}>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
