import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import type { User } from "../lib/auth";
import { getCloverBalance, subscribeCloverRewards } from "../lib/clover-rewards";
import {
  loadUnifiedGiftSnapshot,
  sendUnifiedCloverGift,
  sendUnifiedItemGift,
  type UnifiedGiftSnapshot,
} from "../lib/unified-gifts";
import { resolveHandMadeItemImageUrl, type HandMadeItem } from "../lib/shop-storage";
import { FONT_PIXEL, FONT_UI } from "./ui-fonts";
import shopCoinImage from "../../coin-transparent.png";

function GiftItemPreview({ item }: { item: HandMadeItem }) {
  const [broken, setBroken] = useState(false);
  const src = resolveHandMadeItemImageUrl(item);
  if (src && !broken) {
    return <img src={src} alt={item.label} width={38} height={38} onError={() => setBroken(true)} style={{ objectFit: "contain", imageRendering: "pixelated" }} />;
  }
  const fallback = item.type === "emoticon" ? (item.icon || "?ôÇ") : item.type === "room" ? "?™ë" : item.type === "companion" ? "?êæ" : "?ëï";
  return <span style={{ fontSize: 24 }}>{fallback}</span>;
}

export default function GiftModal({
  user,
  recipientId,
  recipientNickname,
  initialItemId = null,
  onClose,
}: {
  user: User;
  recipientId: string;
  recipientNickname: string;
  initialItemId?: string | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"item" | "clover">("item");
  const [snapshot, setSnapshot] = useState<UnifiedGiftSnapshot | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(initialItemId);
  const [amount, setAmount] = useState("100");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void loadUnifiedGiftSnapshot(user.id).then((next) => {
      setSnapshot(next);
      if (initialItemId) setSelectedItemId(initialItemId);
    });
  }, [user.id, initialItemId]);

  useEffect(() => {
    return subscribeCloverRewards(user.id, () => {
      setSnapshot((prev) =>
        prev ? { ...prev, coins: getCloverBalance(user.id) } : prev,
      );
    });
  }, [user.id]);

  const availableItems = useMemo(
    () => snapshot?.items ?? [],
    [snapshot],
  );

  const submit = async () => {
    if (!snapshot || busy) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    const result = tab === "item"
      ? selectedItemId
        ? await sendUnifiedItemGift({
            senderId: user.id,
            senderNickname: user.nickname,
            recipientId,
            itemId: selectedItemId,
            message,
            preferRemote: snapshot.remote,
          })
        : { ok: false as const, error: "?†Î¨º???ÑÏù¥?úÏùÑ Í≥®Îùº Ï£ºÏÑ∏??" }
      : await sendUnifiedCloverGift({
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
    setSnapshot(await loadUnifiedGiftSnapshot(user.id));
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
            <p style={{ fontFamily: FONT_UI, fontSize: "0.62rem", fontWeight: 900, color: "#5a3050" }}>{recipientNickname}?òÏóêÍ≤??†Î¨º?òÍ∏∞</p>
          </div>
          <button type="button" onClick={onClose} className="w-6 h-6 rounded-full" style={{ fontFamily: FONT_UI, fontSize: "0.52rem", color: "#8a6070", background: "rgba(255,96,128,0.1)" }}>√ó</button>
        </div>

        <div className="grid grid-cols-2 gap-1 flex-shrink-0">
          {(["item", "clover"] as const).map((entry) => (
            <button key={entry} type="button" onClick={() => { setTab(entry); setError(null); setSuccess(null); }} className="py-1.5 rounded-xl" style={{ fontFamily: FONT_UI, fontSize: "0.5rem", fontWeight: 900, color: tab === entry ? "white" : "#9a6070", background: tab === entry ? "linear-gradient(135deg,#ff6080,#ff80a0)" : "rgba(255,96,128,0.08)" }}>
              {entry === "item" ? "?éÅ ???ÑÏù¥?? : "?? ?¥Î°úÎ≤?}
            </button>
          ))}
        </div>

        {tab === "item" ? (
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl p-2" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,128,160,0.14)", scrollbarWidth: "thin" }}>
            {!snapshot ? (
              <p className="py-5 text-center" style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#b07080" }}>Î≥¥Ïú† ?ÑÏù¥??Î∂àÎü¨?§Îäî Ï§?..</p>
            ) : availableItems.length === 0 ? (
              <p className="py-5 text-center" style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#b07080", lineHeight: 1.5 }}>?†Î¨º Í∞Ä?•Ìïú ?ÑÏù¥?úÏù¥ ?ÜÏñ¥??<br />?êÎß§ Ï§ëÏù∏ ?ÑÏù¥?úÏ? Î®ºÏ? ?¥Î†§ Ï£ºÏÑ∏??</p>
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
              <span style={{ fontFamily: FONT_UI, fontSize: "0.48rem", fontWeight: 800, color: "#8a6030" }}>???¥Î°úÎ≤?/span>
              <span className="flex items-center gap-1" style={{ fontFamily: FONT_UI, fontSize: "0.56rem", fontWeight: 900, color: "#a06010" }}><img src={shopCoinImage} alt="" width={14} height={14} />{snapshot?.coins ?? "..."}</span>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[50, 100, 300, 500].map((value) => <button key={value} type="button" onClick={() => setAmount(String(value))} className="py-1 rounded-lg" style={{ fontFamily: FONT_UI, fontSize: "0.44rem", fontWeight: 800, color: amount === String(value) ? "white" : "#a06010", background: amount === String(value) ? "linear-gradient(135deg,#e0a020,#f0c050)" : "rgba(255,210,80,0.15)" }}>{value}</button>)}
            </div>
            <label className="flex items-center gap-2">
              <span style={{ fontFamily: FONT_UI, fontSize: "0.46rem", fontWeight: 800, color: "#8a6030" }}>ÏßÅÏ†ë ?ÖÎ†•</span>
              <input type="number" min={10} max={5000} value={amount} onChange={(event) => setAmount(event.target.value)} className="flex-1 min-w-0 px-2 py-1 rounded-lg outline-none" style={{ fontFamily: FONT_UI, fontSize: "0.52rem", border: "1px solid rgba(220,170,50,0.25)", background: "#fffdf4" }} />
            </label>
          </div>
        )}

        <label className="flex flex-col gap-1 flex-shrink-0">
          <span style={{ fontFamily: FONT_UI, fontSize: "0.44rem", fontWeight: 800, color: "#9a6070" }}>Î©îÏãúÏßÄ <span style={{ fontWeight: 500, color: "#c090a0" }}>(?†ÌÉù)</span></span>
          <input value={message} onChange={(event) => setMessage(event.target.value.slice(0, 40))} placeholder="ÎßàÏùå???®Íªò ?ÑÌï¥ Î≥¥ÏÑ∏?? className="px-2.5 py-1.5 rounded-xl outline-none" style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#6a4050", border: "1px solid rgba(255,128,160,0.18)", background: "rgba(255,255,255,0.9)" }} />
        </label>

        {error && <p style={{ fontFamily: FONT_UI, fontSize: "0.45rem", fontWeight: 800, color: "#ff4757" }}>{error}</p>}
        {success && <p style={{ fontFamily: FONT_UI, fontSize: "0.45rem", fontWeight: 800, color: "#3d8b5f" }}>{success}</p>}

        <div className="grid grid-cols-2 gap-2 flex-shrink-0">
          <button type="button" onClick={onClose} className="py-2 rounded-xl" style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 800, color: "#8a6070", background: "rgba(255,96,128,0.08)" }}>Ï∑®ÏÜå</button>
          <button type="button" onClick={() => void submit()} disabled={busy || !snapshot} className="py-2 rounded-xl text-white" style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 900, background: "linear-gradient(135deg,#ff6080,#ff80a0)", opacity: busy || !snapshot ? 0.55 : 1 }}>{busy ? "Î≥¥ÎÇ¥??Ï§?.." : "?†Î¨º Î≥¥ÎÇ¥Í∏?}</button>
        </div>
      </motion.div>
    </div>
  );
}
