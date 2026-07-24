import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import { completeNicknameSetup, type User } from "../lib/auth";
import {
  filterNicknameInput,
  NICKNAME_MAX_LENGTH,
  NICKNAME_PATTERN,
} from "../lib/nickname";
import { FONT_UI } from "./ui-fonts";

type NicknameSetupPageProps = {
  userId: string;
  onComplete: (user: User) => void;
};

export default function NicknameSetupPage({ userId, onComplete }: NicknameSetupPageProps) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const trimmed = nickname.trim();
  const formatOk = trimmed.length >= 2 && NICKNAME_PATTERN.test(trimmed);

  const handleChange = (value: string) => {
    setNickname(filterNicknameInput(value));
    if (error) setError("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await completeNicknameSetup(userId, nickname);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onComplete(result.user);
  };

  return (
    <div
      className="size-full flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #C2CBED 0%, #b8c4e8 40%, #d0d8f4 100%)",
      }}
    >
      <motion.div
        className="relative w-full max-w-[420px] rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, rgba(255,253,248,0.96) 0%, rgba(238,241,251,0.98) 100%)",
          border: "2px solid rgba(255,255,255,0.72)",
          boxShadow: "0 20px 80px rgba(90,109,176,0.22), 0 0 0 1px rgba(122,143,212,0.18)",
        }}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="px-8 pt-9 pb-7 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "0.82rem",
                lineHeight: 1.8,
                color: "#3d4a7a",
              }}
            >
              환영해요!
            </h1>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.62rem", color: "#5a6db0", lineHeight: 1.6 }}>
              Re:world에서 사용할<br />닉네임을 정해 주세요
            </p>
            <p style={{ fontFamily: FONT_UI, fontSize: "0.5rem", color: "#9aa8d8", lineHeight: 1.5 }}>
              한글·영문·숫자·_·. 사용 가능 · 중복 불가
            </p>
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label
                style={{
                  fontFamily: FONT_UI,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "#5a6db0",
                }}
              >
                닉네임
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="예: re.world_01"
                maxLength={NICKNAME_MAX_LENGTH}
                autoFocus
                className="w-full px-3.5 py-3 rounded-xl outline-none"
                style={{
                  fontFamily: FONT_UI,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#3d4a7a",
                  background: "rgba(255,255,255,0.9)",
                  border: "1.5px solid rgba(122,143,212,0.26)",
                }}
              />
            </div>

            {error && (
              <p
                style={{
                  fontFamily: FONT_UI,
                  fontSize: "0.58rem",
                  fontWeight: 600,
                  color: "#ff4757",
                  textAlign: "center",
                }}
              >
                {error}
              </p>
            )}

            <motion.button
              type="submit"
              disabled={loading || !formatOk}
              className="w-full py-3.5 rounded-xl text-white"
              style={{
                fontFamily: FONT_UI,
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                background: formatOk
                  ? "linear-gradient(90deg, #ff4757, #ff6b81)"
                  : "rgba(200,180,170,0.5)",
                boxShadow: formatOk ? "0 4px 16px rgba(255,71,87,0.28)" : "none",
                opacity: loading ? 0.8 : 1,
              }}
              whileHover={loading ? {} : { scale: 1.02 }}
              whileTap={loading ? {} : { scale: 0.98 }}
            >
              {loading ? "저장 중..." : "다이어리 시작하기 →"}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
