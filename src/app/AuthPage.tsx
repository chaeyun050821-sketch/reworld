import { useState, type FormEvent, type CSSProperties } from "react";
import { motion, AnimatePresence } from "motion/react";
import { signIn, signUp, type User } from "../lib/auth";

const PixelHeart = ({ size = 14, color = "#ff2d78" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 10 9" style={{ imageRendering: "pixelated" }} fill={color}>
    <rect x="1" y="0" width="3" height="1" /><rect x="6" y="0" width="3" height="1" />
    <rect x="0" y="1" width="4" height="1" /><rect x="6" y="1" width="4" height="1" />
    <rect x="0" y="2" width="10" height="1" /><rect x="0" y="3" width="10" height="1" />
    <rect x="1" y="4" width="8" height="1" /><rect x="2" y="5" width="6" height="1" />
    <rect x="3" y="6" width="4" height="1" /><rect x="4" y="7" width="2" height="1" />
    <rect x="5" y="8" width="1" height="1" />
  </svg>
);

type AuthMode = "login" | "signup";

type AuthPageProps = {
  onSuccess: (user: User) => void;
};

export default function AuthPage({ onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError("");
    setPassword("");
    setConfirm("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    await new Promise((r) => setTimeout(r, 300));

    if (mode === "login") {
      const result = signIn(email, password);
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      onSuccess(result.user);
    } else {
      if (password !== confirm) {
        setError("비밀번호 확인이 일치하지 않아요.");
        setLoading(false);
        return;
      }
      const result = signUp(email, nickname, password);
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      onSuccess(result.user);
    }

    setLoading(false);
  };

  const inputStyle: CSSProperties = {
    fontFamily: "'Quicksand', sans-serif",
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "#4a2060",
    background: "rgba(255,255,255,0.92)",
    border: "1.5px solid rgba(196,77,255,0.2)",
  };

  return (
    <div
      className="size-full flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #fce4f8 0%, #f0c8f8 40%, #fcd0ec 70%, #f8e0ff 100%)",
      }}
    >
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 480,
          height: 480,
          background: "radial-gradient(circle, rgba(255,80,180,0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      <motion.div
        className="relative w-full max-w-[340px] rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(160deg, rgba(255,255,255,0.95) 0%, rgba(255,240,250,0.98) 100%)",
          border: "2px solid rgba(255,255,255,0.8)",
          boxShadow: "0 12px 48px rgba(200,0,120,0.18), 0 0 0 1px rgba(255,110,180,0.12)",
        }}
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className="absolute inset-x-0 top-0 h-24 pointer-events-none"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)",
          }}
        />

        <div className="px-6 pt-8 pb-6 flex flex-col gap-5">
          {/* logo */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2 items-center">
              {[0, 0.15, 0.3].map((d, i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 1.4, delay: d, repeat: Infinity, ease: "easeInOut" }}
                >
                  <PixelHeart size={i === 1 ? 18 : 12} color={i === 1 ? "#ff2d78" : "#c44dff"} />
                </motion.div>
              ))}
            </div>
            <h1
              style={{
                fontFamily: "'Great Vibes', cursive",
                fontSize: "2.4rem",
                lineHeight: 1,
                background: "linear-gradient(135deg, #d4006a, #ff2d78, #c44dff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Re:world
            </h1>
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "0.38rem",
                color: "#c44dff",
                letterSpacing: "0.06em",
              }}
            >
              MY PERSONAL DIARY
            </p>
          </div>

          {/* mode tabs */}
          <div
            className="flex rounded-full p-1"
            style={{ background: "rgba(196,77,255,0.08)", border: "1px solid rgba(196,77,255,0.15)" }}
          >
            {(["login", "signup"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchMode(tab)}
                className="flex-1 py-2 rounded-full transition-all"
                style={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: mode === tab ? "#fff" : "#9060b0",
                  background: mode === tab ? "linear-gradient(90deg, #ff2d78, #c44dff)" : "transparent",
                  boxShadow: mode === tab ? "0 2px 8px rgba(255,45,120,0.3)" : "none",
                }}
              >
                {tab === "login" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                className="flex flex-col gap-3"
                initial={{ opacity: 0, x: mode === "login" ? -12 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === "login" ? 12 : -12 }}
                transition={{ duration: 0.2 }}
              >
                {mode === "signup" && (
                  <div className="flex flex-col gap-1">
                    <label
                      style={{
                        fontFamily: "'Quicksand', sans-serif",
                        fontSize: "0.55rem",
                        fontWeight: 700,
                        color: "#9060b0",
                      }}
                    >
                      닉네임
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="2~12자"
                      maxLength={12}
                      className="w-full px-3 py-2.5 rounded-xl outline-none focus:ring-2"
                      style={inputStyle}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label
                    style={{
                      fontFamily: "'Quicksand', sans-serif",
                      fontSize: "0.55rem",
                      fontWeight: 700,
                      color: "#9060b0",
                    }}
                  >
                    이메일
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="hello@example.com"
                    autoComplete="email"
                    className="w-full px-3 py-2.5 rounded-xl outline-none"
                    style={inputStyle}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    style={{
                      fontFamily: "'Quicksand', sans-serif",
                      fontSize: "0.55rem",
                      fontWeight: 700,
                      color: "#9060b0",
                    }}
                  >
                    비밀번호
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "6자 이상" : "비밀번호 입력"}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="w-full px-3 py-2.5 rounded-xl outline-none"
                    style={inputStyle}
                  />
                </div>

                {mode === "signup" && (
                  <div className="flex flex-col gap-1">
                    <label
                      style={{
                        fontFamily: "'Quicksand', sans-serif",
                        fontSize: "0.55rem",
                        fontWeight: 700,
                        color: "#9060b0",
                      }}
                    >
                      비밀번호 확인
                    </label>
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="비밀번호 다시 입력"
                      autoComplete="new-password"
                      className="w-full px-3 py-2.5 rounded-xl outline-none"
                      style={inputStyle}
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    fontFamily: "'Quicksand', sans-serif",
                    fontSize: "0.58rem",
                    fontWeight: 600,
                    color: "#e04060",
                    textAlign: "center",
                  }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-white mt-1"
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                background: loading
                  ? "linear-gradient(90deg, #d080a0, #a080c0)"
                  : "linear-gradient(90deg, #ff2d78, #c44dff)",
                boxShadow: "0 4px 16px rgba(255,45,120,0.35)",
                opacity: loading ? 0.8 : 1,
              }}
              whileHover={loading ? {} : { scale: 1.02 }}
              whileTap={loading ? {} : { scale: 0.98 }}
            >
              {loading ? "잠시만요..." : mode === "login" ? "다이어리 열기 →" : "가입하고 시작하기 →"}
            </motion.button>
          </form>

          <p
            className="text-center"
            style={{
              fontFamily: "'Quicksand', sans-serif",
              fontSize: "0.5rem",
              color: "#b090c0",
              lineHeight: 1.6,
            }}
          >
            {mode === "login" ? (
              <>
                아직 계정이 없나요?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  style={{ color: "#ff2d78", fontWeight: 700 }}
                >
                  회원가입
                </button>
              </>
            ) : (
              <>
                이미 계정이 있나요?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  style={{ color: "#ff2d78", fontWeight: 700 }}
                >
                  로그인
                </button>
              </>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
