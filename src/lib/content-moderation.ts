/**
 * 게시판 욕설·비방 필터 (간단 패턴 매칭)
 * 과도한 우회(띄어쓰기·특수문자)도 일부 잡습니다.
 */

const BLOCKED_PATTERNS: RegExp[] = [
  /[sS][hH][iI1!][tT]/,
  /[fF][uU][cC][kK]/,
  /[bB][iI][tT][cC][hH]/,
  /시\s*발|씨\s*발|ㅅ\s*ㅂ|ㅆ\s*ㅂ|ㅅ1발|씨1발/,
  /지\s*랄|ㅈ\s*ㄹ/,
  /병\s*신|븅\s*신|ㅂ\s*ㅅ/,
  /개\s*새|개\s*색|개\s*세/,
  /미\s*친|미\s*친놈|미\s*친년/,
  /좆|ㅈ\s*같|지\s*랄/,
  /죽\s*어|죽\s*어버/,
  /꺼\s*져|닥\s*쳐/,
  /섹\s*스|야\s*동|포\s*르노/,
  /한\s*녀|김\s*치\s*녀|맘\s*충/,
  /장\s*애| retard/i,
];

function normalizeForScan(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, "");
}

export function hasBlockedContent(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  const compact = normalizeForScan(raw);
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(raw) || pattern.test(compact));
}

export function validateBoardContent(text: string): { ok: true } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: "내용을 입력해 주세요." };
  if (trimmed.length > 500) return { ok: false, error: "500자 이내로 작성해 주세요." };
  if (hasBlockedContent(trimmed)) {
    return { ok: false, error: "욕설·비방·혐오 표현은 사용할 수 없어요." };
  }
  return { ok: true };
}

export const BOARD_RULES_TEXT =
  "모든 이용자가 함께 보는 공간이에요. 욕설·비방·혐오 표현은 금지입니다.";
