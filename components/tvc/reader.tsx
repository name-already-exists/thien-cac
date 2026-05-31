"use client";

import React, { useState } from "react";
import { CHAPTER_TEXT, type Story } from "@/lib/data";
import { Icon } from "./icons";

type Props = {
  story: Story;
  onBack: () => void;
  onDetail: (s: Story) => void;
};

type Theme = "paper" | "sepia" | "green" | "night";
type LineHeight = "compact" | "normal" | "loose";
type FontFamily = "serif" | "sans";

const THEME_MAP: Record<Theme, { bg: string; fg: string }> = {
  paper: { bg: "#FBF7EE", fg: "#1A1410" },
  sepia: { bg: "#F4E8D0", fg: "#3D2F1F" },
  green: { bg: "#DCE5D6", fg: "#1F2D1F" },
  night: { bg: "#1A1A1A", fg: "#C7C2B8" },
};

const LH_MAP: Record<LineHeight, number> = {
  compact: 1.55,
  normal: 1.85,
  loose: 2.15,
};

function OrnDivider({ color }: { color?: string }) {
  const c = color ?? "var(--brand-gold)";
  return (
    <div
      className="tvc-divider-orn"
      style={{ color: c }}
    >
      <div className="line" style={{ background: c, opacity: 0.5 }} />
      <div className="dot" style={{ background: c }} />
      <div className="diamond" style={{ background: c }} />
      <div className="dot" style={{ background: c }} />
      <div className="line" style={{ background: c, opacity: 0.5 }} />
    </div>
  );
}

export function Reader({ story, onBack, onDetail }: Props) {
  const [chromeOpen, setChromeOpen] = useState(false);
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState<FontFamily>("serif");
  const [theme, setTheme] = useState<Theme>("paper");
  const [lineHeight, setLineHeight] = useState<LineHeight>("normal");

  const { bg, fg } = THEME_MAP[theme];

  const readerTopBg =
    theme === "night"
      ? "rgba(26,26,26,0.92)"
      : "rgba(245,239,227,0.92)";

  return (
    <div
      className="tvc-reader-page"
      style={{ background: bg, color: fg }}
    >
      {/* Header bar */}
      <div
        className="tvc-reader-top"
        style={{ background: readerTopBg }}
      >
        <div className="tvc-container inner">
          <button
            className="tvc-icon-btn"
            onClick={onBack}
            title="Quay lại"
          >
            <Icon name="arrowLeft" size={18} />
          </button>
          <div className="ti">
            {story.title}{" "}
            <span className="author">· {story.author}</span>
          </div>
          <button className="tvc-icon-btn" title="Đánh dấu">
            <Icon name="bookmark" size={18} />
          </button>
          <button
            className="tvc-icon-btn"
            onClick={() => setChromeOpen(!chromeOpen)}
            title="Tuỳ chỉnh"
          >
            <Icon name="settings" size={18} />
          </button>
        </div>
      </div>

      {/* Chapter content */}
      <div className="tvc-container-narrow tvc-reader-content">
        <div className="chapter-num">Chương 13 · 第十三章</div>
        <h2 className="chapter-title">Bất tử dược</h2>
        <OrnDivider />
        <div
          className="text"
          style={{
            fontSize,
            lineHeight: LH_MAP[lineHeight],
            fontFamily:
              fontFamily === "serif"
                ? "var(--font-serif-vn)"
                : "var(--font-sans-tvc)",
            color: fg,
          }}
        >
          {CHAPTER_TEXT.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <OrnDivider />

        <div className="tvc-reader-nav">
          <button className="tvc-btn tvc-btn-secondary">
            <Icon name="chevronLeft" size={16} /> Chương trước
          </button>
          <button
            className="tvc-btn tvc-btn-ghost"
            onClick={() => onDetail(story)}
          >
            <Icon name="library" size={16} /> Mục lục
          </button>
          <button className="tvc-btn tvc-btn-primary">
            Chương sau <Icon name="chevronRight" size={16} />
          </button>
        </div>
      </div>

      {/* Reader settings panel */}
      {chromeOpen && (
        <div className="tvc-reader-chrome">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <strong
              style={{ fontFamily: "var(--font-serif-vn)", fontSize: 14 }}
            >
              Tuỳ chỉnh đọc
            </strong>
            <button
              className="tvc-icon-btn"
              onClick={() => setChromeOpen(false)}
              style={{ width: 24, height: 24 }}
            >
              <Icon name="x" size={14} />
            </button>
          </div>

          <div className="field">
            <span className="lbl">Cỡ chữ</span>
            <div className="stepper">
              <button onClick={() => setFontSize(Math.max(14, fontSize - 1))}>
                −
              </button>
              <span className="val">{fontSize}</span>
              <button onClick={() => setFontSize(Math.min(24, fontSize + 1))}>
                +
              </button>
            </div>
          </div>

          <div className="field">
            <span className="lbl">Font</span>
            <div className="seg">
              <button
                className={`seg-item ${fontFamily === "serif" ? "on" : ""}`}
                onClick={() => setFontFamily("serif")}
              >
                Serif
              </button>
              <button
                className={`seg-item ${fontFamily === "sans" ? "on" : ""}`}
                onClick={() => setFontFamily("sans")}
              >
                Sans
              </button>
            </div>
          </div>

          <div className="field">
            <span className="lbl">Giãn dòng</span>
            <div className="seg">
              <button
                className={`seg-item ${lineHeight === "compact" ? "on" : ""}`}
                onClick={() => setLineHeight("compact")}
              >
                Hẹp
              </button>
              <button
                className={`seg-item ${lineHeight === "normal" ? "on" : ""}`}
                onClick={() => setLineHeight("normal")}
              >
                Vừa
              </button>
              <button
                className={`seg-item ${lineHeight === "loose" ? "on" : ""}`}
                onClick={() => setLineHeight("loose")}
              >
                Rộng
              </button>
            </div>
          </div>

          <div className="field">
            <span className="lbl">Nền</span>
            <div className="themes">
              {(["paper", "sepia", "green", "night"] as Theme[]).map((t) => (
                <div
                  key={t}
                  className={`theme-dot ${theme === t ? "on" : ""}`}
                  style={{ background: THEME_MAP[t].bg }}
                  onClick={() => setTheme(t)}
                  title={t}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
