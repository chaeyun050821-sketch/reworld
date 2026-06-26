const pad2 = (value: number) => String(value).padStart(2, "0");

export function formatDottedDate(date = new Date()) {
  return `${date.getFullYear()}.${pad2(date.getMonth() + 1)}.${pad2(date.getDate())}`;
}

export function formatIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatDiaryDisplayDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${year}년 ${month}월 ${day}일`;
}
