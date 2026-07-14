export type Theme = "paper" | "sepia" | "green" | "night";
export type LineHeight = "compact" | "normal" | "loose";
export type FontFamily = "serif" | "sans";

export type ReaderSettings = {
  fontSize: number;
  fontFamily: FontFamily;
  theme: Theme;
  lineHeight: LineHeight;
};

const KEY = "tvc_reader_settings";

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  fontSize: 18,
  fontFamily: "serif",
  theme: "paper",
  lineHeight: "normal",
};

export function getReaderSettings(): ReaderSettings {
  if (typeof window === "undefined") return DEFAULT_READER_SETTINGS;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return stored ? { ...DEFAULT_READER_SETTINGS, ...stored } : DEFAULT_READER_SETTINGS;
  } catch {
    return DEFAULT_READER_SETTINGS;
  }
}

export function saveReaderSettings(settings: ReaderSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(settings));
}
