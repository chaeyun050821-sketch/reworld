export const config = {
  runtime: "edge",
  maxDuration: 30,
};

import { convertDrawingWithGemini } from "../src/lib/gemini-convert-server";

export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { Allow: "POST", "Content-Type": "application/json" },
    });
  }

  let body: {
    imageBase64?: string;
    customPrompt?: string;
    isCustomRefine?: boolean;
    refineFromSketch?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const svg = await convertDrawingWithGemini({
      imageBase64: body.imageBase64 ?? "",
      customPrompt: body.customPrompt,
      isCustomRefine: body.isCustomRefine,
      refineFromSketch: body.refineFromSketch,
    });
    return new Response(JSON.stringify({ svg }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "변환에 실패했어요.";
    const status = (err as Error & { status?: number }).status;
    const httpStatus = status === 408 ? 504 : 502;
    return new Response(JSON.stringify({ error: message }), {
      status: httpStatus,
      headers: { "Content-Type": "application/json" },
    });
  }
}
