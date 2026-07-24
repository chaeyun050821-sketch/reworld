import { convertDrawingWithGemini } from "../../src/lib/gemini-convert-server";

export const handler = async (event: { httpMethod: string; body?: string | null }) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { Allow: "POST" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  let body: { imageBase64?: string; customPrompt?: string; isCustomRefine?: boolean };
  try {
    body = JSON.parse(event.body ?? "{}") as typeof body;
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  try {
    const svg = await convertDrawingWithGemini({
      imageBase64: body.imageBase64 ?? "",
      customPrompt: body.customPrompt,
      isCustomRefine: body.isCustomRefine,
    });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ svg }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "변환에 실패했어요.";
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: message }),
    };
  }
};
