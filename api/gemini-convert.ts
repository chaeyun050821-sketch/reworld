// Node.js 60초. Edge는 30초라 flash 수정이 자주 타임아웃났음.
// src/ 밖 import는 Node 번들에 안 들어가 500이 났으므로 api/lib 로 둠.
export const config = {
  maxDuration: 60,
};

import { convertDrawingWithGemini } from "./lib/gemini-convert-server";

type NodeReq = {
  method?: string;
  body?: unknown;
  on?: (event: string, cb: (chunk: Buffer | string) => void) => void;
};

type NodeRes = {
  statusCode: number;
  setHeader: (key: string, value: string) => void;
  end: (body?: string) => void;
};

function sendJson(res: NodeRes, status: number, payload: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req: NodeReq): Promise<unknown> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      return req.body ? JSON.parse(req.body) : {};
    }
    return req.body;
  }

  const raw = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    if (!req.on) {
      resolve("");
      return;
    }
    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

  if (!raw) return {};
  return JSON.parse(raw);
}

export default async function handler(req: NodeReq, res: NodeRes) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  let body: {
    imageBase64?: string;
    svgMarkup?: string;
    customPrompt?: string;
    isCustomRefine?: boolean;
    refineFromSketch?: boolean;
  };

  try {
    body = (await readJsonBody(req)) as typeof body;
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  try {
    const svg = await convertDrawingWithGemini({
      imageBase64: body.imageBase64,
      svgMarkup: body.svgMarkup,
      customPrompt: body.customPrompt,
      isCustomRefine: body.isCustomRefine,
      refineFromSketch: body.refineFromSketch,
    });
    sendJson(res, 200, { svg });
  } catch (err) {
    const message = err instanceof Error ? err.message : "변환에 실패했어요.";
    const status = (err as Error & { status?: number }).status;
    const httpStatus = status === 408 ? 504 : 502;
    sendJson(res, httpStatus, { error: message });
  }
}
