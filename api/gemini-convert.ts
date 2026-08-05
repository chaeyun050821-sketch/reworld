import { convertDrawingWithGemini } from "./lib/gemini-convert-server";

export const config = {
  runtime: "edge",
  maxDuration: 30,
};

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    
    const svg = await convertDrawingWithGemini({
      imageBase64: body.imageBase64 || "",
      customPrompt: body.customPrompt || "",
      isCustomRefine: body.isCustomRefine || false,
      refineFromSketch: body.refineFromSketch || false,
    });

    return new Response(JSON.stringify({ svg }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "변환에 실패했어요.";
    const status = (err as Error & { status?: number }).status;
    const httpStatus = status === 408 ? 504 : 502;
    
    return new Response(JSON.stringify({ error: message }), {
      status: httpStatus,
      headers: { "Content-Type": "application/json" },
    });
  }
}