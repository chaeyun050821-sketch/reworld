import { useState } from "react";
import { motion } from "motion/react";
import { DIARY_THEMES } from "../../lib/diary-theme";
import { useDiaryTheme } from "../../lib/diary-theme-context";
import { FONT_UI } from "../ui-fonts";

export default function DiaryColorPicker({ compact = false }: { compact?: boolean }) {
  const { themeId, setThemeId, canEditTheme } = useDiaryTheme();
  const [expanded, setExpanded] = useState(!compact);

  if (!canEditTheme) return null;

  const panelStyle = {
    padding: compact ? "8px 10px" : "10px 12px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.82)",
    border: "1px solid rgba(var(--diary-mid-rgb), 0.28)",
    boxShadow: "0 4px 20px rgba(var(--diary-dark-rgb), 0.12)",
    backdropFilter: "blur(8px)",
  } as const;

  if (compact && !expanded) {
    return (
      <motion.button
        type="button"
        aria-label="다이어리 색상 열기"
        aria-expanded={false}
        onClick={() => setExpanded(true)}
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        className="pointer-events-auto"
        style={{
          ...panelStyle,
          padding: "10px 12px",
          fontFamily: FONT_UI,
          fontSize: "0.48rem",
          fontWeight: 700,
          color: "var(--diary-dark)",
          letterSpacing: "0.04em",
          lineHeight: 1.35,
          whiteSpace: "pre-line",
          textAlign: "center",
          cursor: "pointer",
        }}
      >
        {"다이어리\n색상"}
      </motion.button>
    );
  }

  return (
    <motion.div
      className="pointer-events-auto flex flex-col items-center gap-1.5"
      style={panelStyle}
      initial={compact ? { opacity: 0, scale: 0.92 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18 }}
    >
      {compact ? (
        <button
          type="button"
          aria-label="다이어리 색상 접기"
          aria-expanded={true}
          onClick={() => setExpanded(false)}
          style={{
            fontFamily: FONT_UI,
            fontSize: "0.46rem",
            fontWeight: 700,
            color: "var(--diary-dark)",
            letterSpacing: "0.04em",
            textAlign: "center",
            lineHeight: 1.35,
            whiteSpace: "pre-line",
            cursor: "pointer",
            background: "none",
            border: "none",
            padding: 0,
          }}
        >
          {"다이어리\n색상"}
        </button>
      ) : (
        <p
          style={{
            fontFamily: FONT_UI,
            fontSize: "0.5rem",
            fontWeight: 700,
            color: "var(--diary-dark)",
            letterSpacing: "0.04em",
            textAlign: "center",
            lineHeight: 1.35,
            whiteSpace: "pre-line",
          }}
        >
          {"다이어리\n색상"}
        </p>
      )}
      <div
        className="flex flex-col items-center"
        style={{
          gap: compact ? 5 : 6,
        }}
      >
        {DIARY_THEMES.map((theme) => {
          const selected = theme.id === themeId;
          return (
            <motion.button
              key={theme.id}
              type="button"
              title={theme.label}
              aria-label={`${theme.label} 테마`}
              aria-pressed={selected}
              onClick={() => setThemeId(theme.id)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              className="relative rounded-full flex-shrink-0"
              style={{
                width: compact ? 18 : 22,
                height: compact ? 18 : 22,
                background: theme.swatch,
                border: selected ? "2px solid var(--diary-dark)" : "2px solid rgba(255,255,255,0.9)",
                boxShadow: selected
                  ? "0 0 0 2px rgba(255,255,255,0.95), 0 2px 8px rgba(var(--diary-dark-rgb), 0.35)"
                  : "0 1px 4px rgba(var(--diary-dark-rgb), 0.18)",
              }}
            >
              {selected && (
                <span
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ color: "var(--diary-dark)", fontSize: compact ? 8 : 9, fontWeight: 800 }}
                >
                  ✓
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
