const KEY = "tvc_reading";
const MAX = 20;

export type ReadingEntry = { id: string; chapter: number; readAt: number };

export function getReadingHistory(): ReadingEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveReadingProgress(storyId: string, chapterNum: number) {
  if (typeof window === "undefined") return;
  const list = getReadingHistory().filter((e) => e.id !== storyId);
  list.unshift({ id: storyId, chapter: chapterNum, readAt: Date.now() });
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}
