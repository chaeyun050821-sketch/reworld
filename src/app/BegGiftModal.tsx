import { useEffect, useState } from "react";
import { motion } from "motion/react";
import type { User } from "../lib/auth";
import { sendGiftBegRequest } from "../lib/commerce";
import { getShopItemImage, type ShopCatalogItem } from "./shop-catalog";
import { FONT_PIXEL, FONT_UI } from "./ui-fonts";

function BegItemPreview({ item }: { item: ShopCatalogItem }) {
  const [broken, setBroken] = useState(false);
  const src = getShopItemImage(item);
  if (src && !broken) {
    return (
      <img
        src={src}
        alt={item.label}
        width={38}
        height={38}
        onError={() => setBroken(true)}
        style={{ objectFit: "contain", imageRendering: "pixelated" }}
      />
    );
  }
  return <span style={{ fontSize: 24 }}>{item.preview}</span>;
}

export default function BegGiftModal({
  user,
  targetId,
  targetNickname,
  items,
  loading,
  onRequestRefresh,
  onSent,
  onClose,
}: {
  user: User;
  targetId: string;
  targetNickname: string;
  items: ShopCatalogItem[];
  loading?: boolean;
  onRequestRefresh?: () => void;
  onSent: (beg: {
    id: string;
    fromUserId: string;
    fromNickname: string;
    toUserId: string;
    itemId: string;
    itemLabel: string;
    message?: string;
    createdAt: string;
  }) => void;
  onClose: () => void;
}) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onRequestRefresh?.();
  }, [targetId]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (busy || !selectedItemId) {
      setError("조를 아이템을 골라 주세요.");
      return;
    }
    setError(null);
    setBusy(true);
    const result = await sendGiftBegRequest({
      fromUserId: user.id,
      fromNickname: user.nickname,
      toUserId: targetId,
      itemId: selectedItemId,
      message,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.beg) onSent(result.beg);
    else onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3"
      style={{ background: "rgba(48,35,20,0.48)" }}
      onClick={onClose}
    >
      <motion.div
        className="rounded-2xl p-3 flex flex-col gap-2 overflow-hidden"
        style={{
          width: "min(330px, calc(100vw - 24px))",
          height: "min(520px, calc(100vh - 24px))",
          background: "linear-gradient(160deg,#fffdf6,#fff6e8)",
          border: "2px solid rgba(220,160,60,0.32)",
          boxShadow: "0 16px 48px rgba(70,45,20,0.22)",
        }}
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <p style={{ fontFamily: FONT_PIXEL, fontSize: "0.32rem", color: "#d09030" }}>BEG</p>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.62rem", fontWeight: 900, color: "#5a4030" }}>
              {targetNickname}님 아이템 조르기
            </p>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.42rem", color: "#a08060", marginTop: 2 }}>
              상대의 내 아이템에서 골라 선물해 달라고 부탁해요
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-full"
            style={{ fontFamily: FONT_UI, fontSize: "0.52rem", color: "#8a7060", background: "rgba(220,160,60,0.12)" }}
          >
            ×
          </button>
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto rounded-xl p-2"
          style={{ background: "rgba(255,255,255,0.72)", border: "1px solid rgba(220,170,80,0.18)", scrollbarWidth: "thin" }}
        >
          {loading ? (
            <p className="py-5 text-center" style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#b09070" }}>
              아이템 목록 불러오는 중...
            </p>
          ) : items.length === 0 ? (
            <p
              className="py-5 text-center"
              style={{ fontFamily: FONT_UI, fontSize: "0.48rem", color: "#b09070", lineHeight: 1.5 }}
            >
              조를 수 있는 아이템이 없어요.
              <br />
              상대가 광장에 있어야 목록을 볼 수 있어요.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {items.map((item) => {
                const selected = selectedItemId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    className="rounded-xl py-2 px-1 flex flex-col items-center gap-1"
                    style={{
                      background: selected ? `${item.color}35` : "rgba(255,255,255,0.82)",
                      border: selected ? `2px solid ${item.color}` : "1px solid rgba(220,170,80,0.16)",
                    }}
                  >
                    <BegItemPreview item={item} />
                    <span
                      style={{
                        fontFamily: FONT_UI,
                        fontSize: "0.39rem",
                        fontWeight: 800,
                        color: "#6a5040",
                        maxWidth: "100%",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <label className="flex flex-col gap-1 flex-shrink-0">
          <span style={{ fontFamily: FONT_UI, fontSize: "0.44rem", fontWeight: 800, color: "#9a8060" }}>
            메시지 <span style={{ fontWeight: 500, color: "#c0a080" }}>(선택)</span>
          </span>
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, 40))}
            placeholder="이거 나 줘… 🥺"
            className="px-2.5 py-1.5 rounded-xl outline-none"
            style={{
              fontFamily: FONT_UI,
              fontSize: "0.5rem",
              color: "#6a5040",
              border: "1px solid rgba(220,170,80,0.22)",
              background: "rgba(255,255,255,0.9)",
            }}
          />
        </label>

        {error && (
          <p style={{ fontFamily: FONT_UI, fontSize: "0.45rem", fontWeight: 800, color: "#ff4757" }}>{error}</p>
        )}

        <div className="grid grid-cols-2 gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2 rounded-xl"
            style={{ fontFamily: FONT_UI, fontSize: "0.52rem", fontWeight: 800, color: "#8a7060", background: "rgba(220,160,60,0.1)" }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || loading || !selectedItemId}
            className="py-2 rounded-xl text-white"
            style={{
              fontFamily: FONT_UI,
              fontSize: "0.52rem",
              fontWeight: 900,
              background: "linear-gradient(135deg,#e0a020,#f0c050)",
              opacity: busy || loading || !selectedItemId ? 0.55 : 1,
            }}
          >
            {busy ? "보내는 중..." : "조르기 보내기"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
