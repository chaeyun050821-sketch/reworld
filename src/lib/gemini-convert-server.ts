// Vite/dev와 Netlify가 쓰던 경로 유지용 re-export
export {
  ACTIVE_GEMINI_MODEL_DEFAULT,
  convertDrawingWithGemini,
} from "../../api/lib/gemini-convert-server";

export type { GeminiConvertRequest } from "../../api/lib/gemini-convert-server";
