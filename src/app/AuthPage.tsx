import { useState, type FormEvent, type CSSProperties } from "react";
import { motion, AnimatePresence } from "motion/react";
import { signIn, signUp, type User } from "../lib/auth";

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
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "#3d4a7a",
    background: "rgba(255,255,255,0.9)",
    border: "1.5px solid rgba(122,143,212,0.26)",
  };

  return (
    <div
      className="size-full flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(135deg, #C2CBED 0%, #b8c4e8 40%, #d0d8f4 100%)",
      }}
    >
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 480,
          height: 480,
          background: "radial-gradient(circle, rgba(122,143,212,0.18) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />

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
        <div
          className="absolute inset-x-0 top-0 h-24 pointer-events-none"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)",
          }}
        />

        <div className="px-8 pt-9 pb-7 flex flex-col gap-6">
          {/* logo */}
          <div className="flex flex-col items-center gap-2">
            <h1
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "1.08rem",
                lineHeight: 1.8,
                letterSpacing: "0.04em",
                color: "#3d4a7a",
                textShadow: "2px 2px 0 rgba(194,203,237,0.9), 4px 4px 0 rgba(90,109,176,0.28)",
              }}
            >
              Re:world
            </h1>
            <p
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "0.42rem",
                color: "#5a6db0",
                letterSpacing: "0.06em",
              }}
            >
              MY PERSONAL DIARY
            </p>
          </div>

          {/* mode tabs */}
          <div
            className="flex rounded-full p-1"
            style={{ background: "rgba(122,143,212,0.1)", border: "1px solid rgba(122,143,212,0.18)" }}
          >
            {(["login", "signup"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchMode(tab)}
                className="flex-1 py-2.5 rounded-full transition-all"
                style={{
                  fontFamily: "'Quicksand', sans-serif",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: mode === tab ? "#fff" : "#5a6db0",
                  background: mode === tab ? "linear-gradient(90deg, #5a6db0, #7a8fd4)" : "transparent",
                  boxShadow: mode === tab ? "0 2px 8px rgba(90,109,176,0.28)" : "none",
                }}
              >
                {tab === "login" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                className="flex flex-col gap-3.5"
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
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="2~12자"
                      maxLength={12}
                      className="w-full px-3.5 py-3 rounded-xl outline-none focus:ring-2"
                      style={inputStyle}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label
                    style={{
                      fontFamily: "'Quicksand', sans-serif",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: "#5a6db0",
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
                    className="w-full px-3.5 py-3 rounded-xl outline-none"
                    style={inputStyle}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    style={{
                      fontFamily: "'Quicksand', sans-serif",
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: "#5a6db0",
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
                    className="w-full px-3.5 py-3 rounded-xl outline-none"
                    style={inputStyle}
                  />
                </div>

                {mode === "signup" && (
                  <div className="flex flex-col gap-1">
                    <label
                      style={{
                        fontFamily: "'Quicksand', sans-serif",
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        color: "#5a6db0",
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
                      className="w-full px-3.5 py-3 rounded-xl outline-none"
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
                    color: "#ff4757",
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
              className="w-full py-3.5 rounded-xl text-white mt-1"
              style={{
                fontFamily: "'Quicksand', sans-serif",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                background: loading
                  ? "linear-gradient(90deg, #9aa8d8, #7a8fd4)"
                  : "linear-gradient(90deg, #ff4757, #ff6b81)",
                boxShadow: "0 4px 16px rgba(255,71,87,0.28)",
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
              fontSize: "0.56rem",
              color: "#7a8fd4",
              lineHeight: 1.6,
            }}
          >
            {mode === "login" ? (
              <>
                아직 계정이 없나요?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  style={{ color: "#ff4757", fontWeight: 700 }}
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
                  style={{ color: "#ff4757", fontWeight: 700 }}
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
