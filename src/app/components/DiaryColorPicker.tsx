import { motion } from "motion/react";
import { DIARY_THEMES } from "../../lib/diary-theme";
import { useDiaryTheme } from "../../lib/diary-theme-context";
import { FONT_UI } from "../ui-fonts";

export default function DiaryColorPicker({ compact = false }: { compact?: boolean }) {
  const { themeId, setThemeId, canEditTheme } = useDiaryTheme();

  if (!canEditTheme) return null;

  return (
    <div
      className="pointer-events-auto flex flex-col items-center gap-1.5"
      style={{
        padding: compact ? "8px 10px" : "10px 12px",
        borderRadius: 16,
        background: "rgba(255,255,255,0.82)",
        border: "1px solid rgba(var(--diary-mid-rgb), 0.28)",
        boxShadow: "0 4px 20px rgba(var(--diary-dark-rgb), 0.12)",
        backdropFilter: "blur(8px)",
      }}
    >
      <p
        style={{
          fontFamily: FONT_UI,
          fontSize: compact ? "0.46rem" : "0.5rem",
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
    </div>
  );
}
