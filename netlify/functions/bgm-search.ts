import { searchBgmOnServer } from "../../src/lib/bgm-search-server";

export const handler = async (event: {
  httpMethod: string;
  queryStringParameters?: Record<string, string | undefined> | null;
}) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: { Allow: "GET" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const query = event.queryStringParameters?.q ?? "";
  if (!query.trim()) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing search query" }),
    };
  }

  try {
    const results = await searchBgmOnServer(query);
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "s-maxage=300, stale-while-revalidate=600",
      },
      body: JSON.stringify({ results }),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "검색에 실패했습니다.";
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: message }),
    };
  }
};
