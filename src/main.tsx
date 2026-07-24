import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { initCapacitor } from "./lib/capacitor-init";
import { applyDiaryTheme, getDiaryTheme, DEFAULT_DIARY_THEME_ID } from "./lib/diary-theme";
import "./styles/index.css";

applyDiaryTheme(getDiaryTheme(DEFAULT_DIARY_THEME_ID));

void initCapacitor().finally(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});