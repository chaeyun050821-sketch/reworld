import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import type { User } from "../lib/auth";
import {
  getAvailableInventoryItems,
  loadCommerceSnapshot,
  sendCloverGift,
  sendItemGift,
  type CommerceSnapshot,
} from "../lib/commerce";
import { getCloverBalance, subscribeCloverRewards } from "../lib/clover-rewards";
import { getShopItemImage, type ShopCatalogItem } from "./shop-catalog";
import { FONT_PIXEL, FONT_UI } from "./ui-fonts";
import shopCoinImage from "../../coin-transparent.png";

function GiftItemPreview({ item }: { item: ShopCatalogItem }) {
  const [broken, setBroken] = useState(false);
  const src = getShopItemImage(item);
  if (src && !broken) {
    return <img src={src} alt={item.label} width={38} height={38} onError={() => setBroken(true)} style={{ objectFit: "contain", imageRendering: "pixelated" }} />;
  }
  return <span style={{ fontSize: 24 }}>{item.preview}</span>;
}

export default function GiftModal({
  user,
  recipientId,
  recipientNickname,
  onClose,
}: {
  user: User;
  recipientId: string;
  recipientNickname: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"item" | "clover">("item");
  const [snapshot, setSnapshot] = useState<CommerceSnapshot | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [amount, setAmount] = useState("100");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadCommerceSnapshot(user.id).then(setSnapshot);
  }, [user.id]);

  useEffect(() => {
    return subscribeCloverRewards(user.id, () => {
      setSnapshot((prev) =>
        prev ? { ...prev, balance: getCloverBalance(user.id) } : prev,
      );
    });
  }, [user.id]);

  const availableItems = useMemo(
    () => (snapshot ? getAvailableInventoryItems(snapshot).filter((item) => item.giftable) : []),
    [snapshot],
  );

  const submit = async () => {
    if (!snapshot || busy) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    const result = tab === "item"
      ? selectedItemId
        ? await sendItemGift({
            senderId: user.id,
            senderNickname: user.nickname,
            recipientId,
            itemId: selectedItemId,
            message,
            preferRemote: snapshot.remote,
          })
        : { ok: false as const, error: "선물할 아이템을 골라 주세요." }
      : await sendCloverGift({
          senderId: user.id,
          senderNickname: user.nickname,
          recipientId,
          amount: Number(amount),
          message,
          preferRemote: snapshot.remote,
        });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(result.message);
    setSnapshot(await loadCommerceSnapshot(user.id));
    if (tab === "item") setSelectedItemId(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3" style={{ background: "rgba(48,25,65,0.5)" }} onClick={onClose}>
      <motion.div
        className="rounded-2xl p-3 flex flex-col gap-2 overflow-hidden"
        style={{ width: "min(330px, calc(100vw - 24px))", height: "min(520px, calc(100vh - 24px))", background: "linear-gradient(160deg,#fffdf8,#fff4f2)", border: "2px solid rgba(255,110,160,0.28)", boxShadow: "0 16px 48px rgba(70,30,80,0.25)" }}
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <p style={{ fontFamily: FONT_PIXEL, fontSize: "0.32rem", color: "#ff6080" }}>GIFT</p>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.62rem", fontWeight: 900, color: "#5a3050" }}>{recipientNickname}님에게 선물하기</p>
          </div>
          <button type="button" onClick={onClose} className="w-6 h-6 rounded-full" style={{ fontFamily: FONT_UI, fontSize: "0.52rem", color: "#8a6070", background: "rgba(255,96,128,0.1)" }}>×</button>
        </div>

        <div className="grid grid-cols-2 gap-1 flex-shrink-0">
          {(["item", "clover"] as const).map((entry) => (
            <button key={entry} type="button" onClick={() => { setTab(entry); setError(null); setSuccess(null); }} className="py-1.5 rounded-xl" style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 900, color: tab === entry ? "white" : "#9a6070", background: tab === entry ? "linear-gradient(135deg,#ff6080,#ff80a0)" : "rgba(255,96,128,0.08)" }}>
              {entry === "item" ? "🎁 내 아이템" : "🍀 클로버"}
            </button>
          ))}
        </div>

        {tab === "item" ? (
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl p-2" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,128,160,0.14)", scrollbarWidth: "thin" }}>
            {!snapshot ? (
              <p className="py-5 text-center" style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#b07080" }}>보유 아이템 불러오는 중...</p>
            ) : availableItems.length === 0 ? (
              <p className="py-5 text-center" style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#b07080", lineHeight: 1.5 }}>선물 가능한 아이템이 없어요.<br />판매 중인 아이템은 먼저 내려 주세요.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {availableItems.map((item) => {
                  const selected = selectedItemId === item.id;
                  return (
                    <button key={item.id} type="button" onClick={() => setSelectedItemId(item.id)} className="rounded-xl py-2 px-1 flex flex-col items-center gap-1" style={{ background: selected ? `${item.color}35` : "rgba(255,255,255,0.82)", border: selected ? `2px solid ${item.color}` : "1px solid rgba(255,128,160,0.13)" }}>
                      <GiftItemPreview item={item} />
                      <span style={{ fontFamily: FONT_UI, fontSize: "0.39rem", fontWeight: 800, color: "#6a4050", maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 rounded-xl p-3 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,180,80,0.2)" }}>
            <div className="flex items-center justify-between">
              <span style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 800, color: "#8a6030" }}>내 클로버</span>
              <span className="flex items-center gap-1" style={{ fontFamily: FONT_UI, fontSize: "0.56rem", fontWeight: 900, color: "#a06010" }}><img src={shopCoinImage} alt="" width={14} height={14} />{snapshot?.balance ?? "..."}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[50, 100, 300, 500].map((value) => <button key={value} type="button" onClick={() => setAmount(String(value))} className="py-1 rounded-lg" style={{ fontFamily: FONT_UI, fontSize: "0.44rem", fontWeight: 800, color: amount === String(value) ? "white" : "#a06010", background: amount === String(value) ? "linear-gradient(135deg,#e0a020,#f0c050)" : "rgba(255,210,80,0.15)" }}>{value}</button>)}
            </div>
            <label className="flex items-center gap-2">
              <span style={{ fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 800, color: "#8a6030" }}>직접 입력</span>
              <input type="number" min={10} max={5000} value={amount} onChange={(event) => setAmount(event.target.value)} className="flex-1 min-w-0 px-2 py-1 rounded-lg outline-none" style={{ fontFamily: FONT_UI, fontSize: "0.52rem", border: "1px solid rgba(220,170,50,0.25)", background: "#fffdf4" }} />
            </label>
          </div>
        )}

        <label className="flex flex-col gap-1 flex-shrink-0">
          <span style={{ fontFamily: FONT_UI, fontSize: "0.44rem", fontWeight: 800, color: "#9a6070" }}>메시지 <span style={{ fontWeight: 500, color: "#c090a0" }}>(선택)</span></span>
          <input value={message} onChange={(event) => setMessage(event.target.value.slice(0, 40))} placeholder="마음을 함께 전해 보세요" className="px-2.5 py-1.5 rounded-xl outline-none" style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#6a4050", border: "1px solid rgba(255,128,160,0.18)", background: "rgba(255,255,255,0.9)" }} />
        </label>

        {error && <p style={{ fontFamily: FONT_UI, fontSize: "0.45rem", fontWeight: 800, color: "#ff4757" }}>{error}</p>}
        {success && <p style={{ fontFamily: FONT_UI, fontSize: "0.45rem", fontWeight: 800, color: "#3d8b5f" }}>{success}</p>}

        <div className="grid grid-cols-2 gap-2 flex-shrink-0">
          <button type="button" onClick={onClose} className="py-2 rounded-xl" style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 800, color: "#8a6070", background: "rgba(255,96,128,0.08)" }}>취소</button>
          <button type="button" onClick={() => void submit()} disabled={busy || !snapshot} className="py-2 rounded-xl text-white" style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 900, background: "linear-gradient(135deg,#ff6080,#ff80a0)", opacity: busy || !snapshot ? 0.55 : 1 }}>{busy ? "보내는 중..." : "선물 보내기"}</button>
        </div>
      </motion.div>
    </div>
  );
}
