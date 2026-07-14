"use client";

import React, { useEffect, useState } from "react";
import type { Chapter, Story } from "@/lib/data";
import { fetchChapterContent, fetchChapters } from "@/lib/db";
import { Icon, ScrollToTop } from "./icons";
import {
  getReaderSettings,
  saveReaderSettings,
  type FontFamily,
  type LineHeight,
  type ReaderSettings,
  type Theme,
} from "@/lib/reader-settings";

type Props = {
  story: Story;
  chapterNumber: number;
  initialChapterData?: { title: string; content: string } | null;
  onBack: () => void;
  onDetail: (s: Story) => void;
  onChapterLoad?: (num: number, title: string) => void;
};

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
    <div className="tvc-divider-orn" style={{ color: c }}>
      <div className="line" style={{ background: c, opacity: 0.5 }} />
      <div className="dot" style={{ background: c }} />
      <div className="diamond" style={{ background: c }} />
      <div className="dot" style={{ background: c }} />
      <div className="line" style={{ background: c, opacity: 0.5 }} />
    </div>
  );
}

const TOC_PER_PAGE = 50;

function TocModal({
  story,
  currentChapter,
  onSelect,
  onClose,
  onViewDetail,
}: {
  story: Story;
  currentChapter: number;
  onSelect: (num: number) => void;
  onClose: () => void;
  onViewDetail: () => void;
}) {
  const [{ chapters, loading }, setChapterState] = useState<{ chapters: Chapter[]; loading: boolean }>({
    chapters: [],
    loading: true,
  });
  const [currentPage, setCurrentPage] = useState(() => Math.floor((currentChapter - 1) / TOC_PER_PAGE) + 1);
  const [pageInput, setPageInput] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchChapters(story.dbId).then((data) => {
      if (cancelled) return;
      setChapterState({ chapters: [...data].sort((a, b) => a.num - b.num), loading: false });
    });
    return () => { cancelled = true; };
  }, [story.dbId]);

  const totalPages = Math.max(1, Math.ceil(chapters.length / TOC_PER_PAGE));
  const pageChapters = chapters.slice((currentPage - 1) * TOC_PER_PAGE, currentPage * TOC_PER_PAGE);

  function goToPage(p: number) {
    setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  }

  function handlePageSearch() {
    const p = parseInt(pageInput);
    if (!isNaN(p)) goToPage(p);
  }

  function buildPageNumbers(): (number | "...")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 4) pages.push("...");
    for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 3) pages.push("...");
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="tvc-toc-backdrop" onClick={onClose}>
      <div className="tvc-toc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tvc-toc-head">
          <div>
            <h3>Mục Lục</h3>
            <div className="sub">
              目錄 · {(chapters.length || story.chapters).toLocaleString("vi-VN")} chương
            </div>
          </div>
          <div className="actions">
            <button className="tvc-icon-btn" onClick={onViewDetail} title="Xem trang truyện đầy đủ">
              <Icon name="library" size={15} />
            </button>
            <button className="tvc-icon-btn" onClick={onClose} title="Đóng">
              <Icon name="x" size={15} />
            </button>
          </div>
        </div>

        <div className="tvc-toc-body">
          {loading ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
              Đang tải…
            </div>
          ) : pageChapters.length === 0 ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
              Chưa có chương nào.
            </div>
          ) : (
            pageChapters.map((ch) => {
              const isCurrent = ch.num === currentChapter;
              return (
                <div
                  key={ch.num}
                  ref={isCurrent ? (el) => el?.scrollIntoView({ block: "center" }) : undefined}
                  className={`tvc-toc-row ${isCurrent ? "current" : ""}`}
                  onClick={() => onSelect(ch.num)}
                >
                  <span className="num">Chương {ch.num}</span>
                  <span className="name">{ch.name || "—"}</span>
                  {isCurrent ? (
                    <span className="current-tag">Đang đọc</span>
                  ) : (
                    <span className="date">{ch.date}</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="tvc-toc-foot">
            <div className="tvc-pagination">
              <button className="tvc-page-btn tvc-page-nav" onClick={() => goToPage(1)} disabled={currentPage === 1} title="Trang đầu">«</button>
              <button className="tvc-page-btn tvc-page-nav" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} title="Trang trước">‹</button>
              {buildPageNumbers().map((p, i) =>
                p === "..." ? (
                  <span key={`e${i}`} className="tvc-page-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`tvc-page-btn${p === currentPage ? " active" : ""}`}
                    onClick={() => goToPage(p as number)}
                  >
                    {p}
                  </button>
                )
              )}
              <button className="tvc-page-btn tvc-page-nav" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} title="Trang sau">›</button>
              <button className="tvc-page-btn tvc-page-nav" onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} title="Trang cuối">»</button>
            </div>
            <div className="tvc-toc-jump">
              <input
                type="number"
                min={1}
                max={totalPages}
                placeholder="Trang"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePageSearch()}
              />
              <button className="tvc-btn tvc-btn-primary" onClick={handlePageSearch}>Đến</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Reader({ story, chapterNumber, initialChapterData, onBack, onDetail, onChapterLoad }: Props) {
  const [currentChapter, setCurrentChapter] = useState(chapterNumber);

  // Cache keyed by chapter number so StrictMode's double-invoke sees existing data and skips re-fetch
  const [chapterCache, setChapterCache] = useState<{
    num: number;
    title: string;
    content: string;
  } | null>(initialChapterData ? { num: chapterNumber, ...initialChapterData } : null);

  const chapterData = chapterCache?.num === currentChapter ? chapterCache : null;
  const loading = chapterCache?.num !== currentChapter;

  const [chromeOpen, setChromeOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  // Reader only ever mounts after client-side data fetch resolves, so reading
  // localStorage synchronously here carries no hydration-mismatch risk.
  const [settings, setSettings] = useState<ReaderSettings>(getReaderSettings);
  const { fontSize, fontFamily, theme, lineHeight } = settings;
  const setFontSize    = (v: number)     => setSettings((s) => ({ ...s, fontSize: v }));
  const setFontFamily  = (v: FontFamily) => setSettings((s) => ({ ...s, fontFamily: v }));
  const setTheme        = (v: Theme)      => setSettings((s) => ({ ...s, theme: v }));
  const setLineHeight   = (v: LineHeight) => setSettings((s) => ({ ...s, lineHeight: v }));

  // Persist reading preferences whenever they change
  useEffect(() => {
    saveReaderSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (chapterCache?.num === currentChapter) {
      if (chapterCache) onChapterLoad?.(currentChapter, chapterCache.title);
      return;
    }
    let cancelled = false;
    fetchChapterContent(story.dbId, currentChapter).then((data) => {
      if (cancelled) return;
      setChapterCache({
        num: currentChapter,
        title: data?.title ?? '',
        content: data?.content ?? '',
      });
      if (data) onChapterLoad?.(currentChapter, data.title);
    });
    return () => { cancelled = true; };
  }, [story.dbId, currentChapter, chapterCache?.num]); // eslint-disable-line react-hooks/exhaustive-deps

  const { bg, fg } = THEME_MAP[theme];
  const readerTopBg = theme === "night" ? "rgba(26,26,26,0.92)" : "rgba(245,239,227,0.92)";

  const hasPrev = currentChapter > 1;
  const hasNext = currentChapter < story.chapters;

  return (
    <div className="tvc-reader-page" style={{ background: bg, color: fg }}>
      {/* Header bar */}
      <div className="tvc-reader-top" style={{ background: readerTopBg }}>
        <div className="tvc-container inner">
          <button className="tvc-icon-btn" onClick={onBack} title="Quay lại">
            <Icon name="arrowLeft" size={18} />
          </button>
          <div className="ti">
            {story.title} <span className="author">· {story.author}</span>
          </div>
          <button className="tvc-icon-btn" title="Đánh dấu">
            <Icon name="bookmark" size={18} />
          </button>
          <button className="tvc-icon-btn" onClick={() => setChromeOpen(!chromeOpen)} title="Tuỳ chỉnh">
            <Icon name="settings" size={18} />
          </button>
        </div>
      </div>

      {/* Chapter content */}
      <div className="tvc-container-narrow tvc-reader-content">
        <div className="chapter-num">Chương {currentChapter}</div>
        <h2 className="chapter-title">
          {loading ? "Đang tải…" : (chapterData?.title ?? "—")}
        </h2>

        <div className="tvc-reader-nav">
          <button
            className="tvc-btn tvc-btn-secondary"
            disabled={!hasPrev}
            onClick={() => setCurrentChapter(currentChapter - 1)}
          >
            <Icon name="chevronLeft" size={16} /> Chương trước
          </button>
          <button className="tvc-btn tvc-btn-ghost" onClick={() => setTocOpen(true)}>
            <Icon name="library" size={16} /> Mục lục
          </button>
          <button
            className="tvc-btn tvc-btn-primary"
            disabled={!hasNext}
            onClick={() => setCurrentChapter(currentChapter + 1)}
          >
            Chương sau <Icon name="chevronRight" size={16} />
          </button>
        </div>
        <OrnDivider />

        <div
          className="text"
          style={{
            fontSize,
            lineHeight: LH_MAP[lineHeight],
            fontFamily: fontFamily === "serif" ? "var(--font-serif-vn)" : "var(--font-sans-tvc)",
            color: fg,
          }}
        >
          {loading ? (
            <p style={{ color: "var(--fg-3)", textAlign: "center" }}>Đang tải nội dung…</p>
          ) : chapterData?.content ? (
            chapterData.content.split("\n\n").map((para, i) => (
              <p key={i}>
                {para.split("\n").map((line, j, arr) => (
                  <React.Fragment key={j}>
                    {line}
                    {j < arr.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            ))
          ) : (
            <p style={{ color: "var(--fg-3)", textAlign: "center" }}>
              Nội dung chương này chưa có.
            </p>
          )}
        </div>

        <OrnDivider />

        <div className="tvc-reader-nav">
          <button
            className="tvc-btn tvc-btn-secondary"
            disabled={!hasPrev}
            onClick={() => setCurrentChapter(currentChapter - 1)}
          >
            <Icon name="chevronLeft" size={16} /> Chương trước
          </button>
          <button className="tvc-btn tvc-btn-ghost" onClick={() => setTocOpen(true)}>
            <Icon name="library" size={16} /> Mục lục
          </button>
          <button
            className="tvc-btn tvc-btn-primary"
            disabled={!hasNext}
            onClick={() => setCurrentChapter(currentChapter + 1)}
          >
            Chương sau <Icon name="chevronRight" size={16} />
          </button>
        </div>
      </div>

      <ScrollToTop />

      {/* Reader settings panel */}
      {chromeOpen && (
        <div className="tvc-reader-chrome">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <strong style={{ fontFamily: "var(--font-serif-vn)", fontSize: 14 }}>Tuỳ chỉnh đọc</strong>
            <button className="tvc-icon-btn" onClick={() => setChromeOpen(false)} style={{ width: 24, height: 24 }}>
              <Icon name="x" size={14} />
            </button>
          </div>

          <div className="field">
            <span className="lbl">Cỡ chữ</span>
            <div className="stepper">
              <button onClick={() => setFontSize(Math.max(14, fontSize - 1))}>−</button>
              <span className="val">{fontSize}</span>
              <button onClick={() => setFontSize(Math.min(24, fontSize + 1))}>+</button>
            </div>
          </div>

          <div className="field">
            <span className="lbl">Font</span>
            <div className="seg">
              <button className={`seg-item ${fontFamily === "serif" ? "on" : ""}`} onClick={() => setFontFamily("serif")}>Serif</button>
              <button className={`seg-item ${fontFamily === "sans"  ? "on" : ""}`} onClick={() => setFontFamily("sans")}>Sans</button>
            </div>
          </div>

          <div className="field">
            <span className="lbl">Giãn dòng</span>
            <div className="seg">
              <button className={`seg-item ${lineHeight === "compact" ? "on" : ""}`} onClick={() => setLineHeight("compact")}>Hẹp</button>
              <button className={`seg-item ${lineHeight === "normal"  ? "on" : ""}`} onClick={() => setLineHeight("normal")}>Vừa</button>
              <button className={`seg-item ${lineHeight === "loose"   ? "on" : ""}`} onClick={() => setLineHeight("loose")}>Rộng</button>
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

      {/* Table-of-contents popup */}
      {tocOpen && (
        <TocModal
          story={story}
          currentChapter={currentChapter}
          onSelect={(num) => {
            setCurrentChapter(num);
            setTocOpen(false);
          }}
          onClose={() => setTocOpen(false)}
          onViewDetail={() => {
            setTocOpen(false);
            onDetail(story);
          }}
        />
      )}
    </div>
  );
}
