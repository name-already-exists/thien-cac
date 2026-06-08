"use client";

import React, { useEffect, useState } from "react";
import type { Story, Chapter } from "@/lib/data";
import { fetchChapters } from "@/lib/db";
import { StoryCover } from "./story-cover";
import { Icon } from "./icons";

const CHAPTERS_PER_PAGE = 100;

function ChapterListFull({
  chapters,
  loading,
  story,
  onRead,
}: {
  chapters: Chapter[];
  loading: boolean;
  story: Story;
  onRead: (s: Story, chapterNumber?: number) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [chapterInput, setChapterInput] = useState("");
  const [pageInput, setPageInput] = useState("");

  const sorted = React.useMemo(
    () => [...chapters].sort((a, b) => a.num - b.num),
    [chapters]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / CHAPTERS_PER_PAGE));
  const pageChapters = sorted.slice(
    (currentPage - 1) * CHAPTERS_PER_PAGE,
    currentPage * CHAPTERS_PER_PAGE
  );

  function goToPage(p: number) {
    setCurrentPage(Math.max(1, Math.min(p, totalPages)));
  }

  function handleChapterSearch() {
    const num = parseInt(chapterInput);
    if (isNaN(num)) return;
    const idx = sorted.findIndex((ch) => ch.num === num);
    if (idx < 0) return;
    goToPage(Math.floor(idx / CHAPTERS_PER_PAGE) + 1);
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

  const inputStyle: React.CSSProperties = {
    padding: "7px 10px",
    border: "1px solid var(--border-1)",
    borderRadius: 6,
    background: "var(--bg-inset)",
    color: "var(--fg-1)",
    fontSize: 13,
    outline: "none",
  };

  return (
    <div style={{ marginTop: 40 }}>
      <h3
        style={{
          fontFamily: "var(--font-serif-vn)",
          fontSize: 20,
          fontWeight: 700,
          margin: "0 0 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span>Danh sách chương</span>
        <span style={{ fontFamily: "var(--font-serif-han)", fontSize: 14, color: "var(--fg-3)" }}>目錄</span>
        <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 400, color: "var(--fg-3)" }}>
          {sorted.length.toLocaleString("vi-VN")} chương
        </span>
      </h3>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="number"
            min={1}
            placeholder="Số chương"
            value={chapterInput}
            onChange={(e) => setChapterInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleChapterSearch()}
            style={{ ...inputStyle, width: 110 }}
          />
          <button
            className="tvc-btn tvc-btn-ghost"
            style={{ padding: "7px 12px", fontSize: 12 }}
            onClick={handleChapterSearch}
          >
            Đến chương
          </button>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="number"
            min={1}
            max={totalPages}
            placeholder="Số trang"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePageSearch()}
            style={{ ...inputStyle, width: 90 }}
          />
          <button
            className="tvc-btn tvc-btn-ghost"
            style={{ padding: "7px 12px", fontSize: 12 }}
            onClick={handlePageSearch}
          >
            Đến trang
          </button>
        </div>
      </div>

      <div className="tvc-chapter-list" style={{ maxHeight: "none" }}>
        {loading ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
            Đang tải…
          </div>
        ) : pageChapters.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
            Chưa có chương nào.
          </div>
        ) : (
          pageChapters.map((ch) => (
            <div
              className={`row ${ch.read ? "read" : ""}`}
              key={ch.num}
              onClick={() => onRead(story, ch.num)}
            >
              <span className="num">{String(ch.num).padStart(3, "0")}</span>
              <span className="name">{ch.name}</span>
              <span className="date">{ch.date}</span>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 12, flexWrap: "wrap" }}>
          <button
            className="tvc-btn tvc-btn-ghost"
            style={{ padding: "6px 10px", fontSize: 13 }}
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ‹
          </button>
          {buildPageNumbers().map((p, i) =>
            p === "..." ? (
              <span key={`e${i}`} style={{ padding: "0 2px", color: "var(--fg-3)", fontSize: 13 }}>…</span>
            ) : (
              <button
                key={p}
                className="tvc-btn tvc-btn-ghost"
                style={{
                  padding: "6px 10px",
                  fontSize: 12,
                  minWidth: 34,
                  ...(p === currentPage
                    ? { background: "var(--bg-inset)", color: "var(--brand-primary)", fontWeight: 700 }
                    : {}),
                }}
                onClick={() => goToPage(p as number)}
              >
                {p}
              </button>
            )
          )}
          <button
            className="tvc-btn tvc-btn-ghost"
            style={{ padding: "6px 10px", fontSize: 13 }}
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            ›
          </button>
          <span style={{ marginLeft: 8, fontSize: 12, color: "var(--fg-3)" }}>
            Trang {currentPage}/{totalPages}
          </span>
        </div>
      )}
    </div>
  );
}

function Comment({ author, time, text }: { author: string; time: string; text: string }) {
  return (
    <div className="tvc-comment">
      <div className="avatar-lg">{author[0]}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--fg-1)" }}>{author}</span>
          <span style={{ fontSize: 12, color: "var(--fg-3)" }}>· {time}</span>
        </div>
        <div style={{ fontSize: 14, color: "var(--fg-1)", marginTop: 4, lineHeight: 1.55 }}>{text}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 8, color: "var(--fg-3)", fontSize: 12 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <Icon name="heart" size={13} /> 24
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <Icon name="messageCircle" size={13} /> Trả lời
          </span>
        </div>
      </div>
    </div>
  );
}

type Props = {
  story: Story;
  onRead: (s: Story, chapterNumber?: number) => void;
  onBack: () => void;
};

export function StoryDetail({ story, onRead }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);

  useEffect(() => {
    setLoadingChapters(true);
    fetchChapters(story.dbId).then((data) => {
      setChapters(data);
      setLoadingChapters(false);
    });
  }, [story.dbId]);

  const [c1, c2] = story.palette;

  return (
    <div>
      <section className="tvc-detail-hero">
        <div className="tvc-detail-hero-bg" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }} />
        <div className="tvc-detail-hero-overlay" />
        <div className="tvc-container tvc-detail-hero-inner">
          <StoryCover story={story} size="lg" />
          <div className="tvc-detail-info">
            <div className="tvc-eyebrow" style={{ color: "var(--brand-primary)" }}>{story.genre}</div>
            <h1>{story.title}</h1>
            <div className="han-sub">{story.han.split("").join(" ")}</div>
            <div className="meta-row">
              <span>Tác giả · <strong style={{ color: "var(--fg-1)" }}>{story.author}</strong></span>
              <span style={{ color: "var(--border-3)" }}>·</span>
              <span>Chuyển ngữ · {story.translator}</span>
              <span style={{ color: "var(--border-3)" }}>·</span>
              <span className={`tvc-badge ${story.status === "ongoing" ? "tvc-b-ongoing" : "tvc-b-completed"}`}>
                <span className="dot" style={{ background: story.status === "ongoing" ? "#4A7C59" : "#4A6FA5" }} />
                {story.status === "ongoing" ? "Đang ra" : "Hoàn thành"}
              </span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}>
              {story.tags.map((t) => <span key={t} className="tvc-tag">{t}</span>)}
            </div>
            <div className="stats">
              <div className="stat">
                <div className="val">{story.rating}<span style={{ color: "var(--brand-gold)", marginLeft: 4 }}>★</span></div>
                <div className="lbl">Đánh giá</div>
              </div>
              <div className="stat">
                <div className="val">{story.chapters.toLocaleString("vi-VN")}</div>
                <div className="lbl">Chương</div>
              </div>
              <div className="stat">
                <div className="val">{story.words}</div>
                <div className="lbl">Chữ</div>
              </div>
              <div className="stat">
                <div className="val">{story.readers}</div>
                <div className="lbl">Lượt đọc</div>
              </div>
              <div className="stat">
                <div className="val">{story.reviews}</div>
                <div className="lbl">Bình luận</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
              <button className="tvc-btn tvc-btn-primary tvc-btn-lg" onClick={() => onRead(story, 1)}>
                <Icon name="bookOpen" size={16} /> Đọc từ đầu
              </button>
              <button className="tvc-btn tvc-btn-secondary tvc-btn-lg">
                <Icon name="bookmark" size={16} /> Thêm vào tủ
              </button>
              <button className="tvc-btn tvc-btn-ghost tvc-btn-lg">
                <Icon name="heart" size={16} /> 4.2K
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="tvc-container tvc-detail-body">
        <div>
          <h3 style={{ fontFamily: "var(--font-serif-vn)", fontSize: 20, fontWeight: 700, margin: "0 0 16px" }}>
            Giới thiệu{" "}
            <span style={{ fontFamily: "var(--font-serif-han)", fontSize: 14, color: "var(--fg-3)", marginLeft: 8 }}>
              簡介
            </span>
          </h3>
          <div className="tvc-detail-desc">{story.desc}</div>

          <ChapterListFull
            chapters={chapters}
            loading={loadingChapters}
            story={story}
            onRead={onRead}
          />

          <div style={{ marginTop: 40 }}>
            <h3 style={{ fontFamily: "var(--font-serif-vn)", fontSize: 20, fontWeight: 700, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <span>Bình luận</span>
              <span style={{ fontFamily: "var(--font-serif-han)", fontSize: 14, color: "var(--fg-3)" }}>評論</span>
              <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 400, color: "var(--fg-3)" }}>
                {story.reviews} bình luận
              </span>
            </h3>
            <Comment author="Vô Danh đạo nhân" time="2 giờ trước" text="Đọc lại lần thứ 3 vẫn không chán. Vong Ngữ tả cảnh đan đỉnh thật sự không có người thứ hai. Cẩn thận, kiên nhẫn — đó chính là tu tiên đích thực." />
            <Comment author="Hàn Mộc Tử" time="6 giờ trước" text="Ai đang đọc lần đầu thì kiên nhẫn. Mạch truyện chậm, nhưng càng đi sâu càng cuốn. Chương 200 trở đi mới bắt đầu vào mạch chính." />
            <Comment author="Tiểu Thanh Niên" time="Hôm qua" text="Hàn Lập là main bá kiểu chậm rãi nhất mình từng đọc. Không drama, không thiên mệnh, chỉ có thực lực và may mắn cộng dồn." />
          </div>
        </div>

        <aside>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14 }}>
            <h3 style={{ fontFamily: "var(--font-serif-vn)", fontSize: 18, fontWeight: 700, margin: 0 }}>
              Danh sách chương
            </h3>
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--fg-3)" }}>
              {story.chapters.toLocaleString("vi-VN")} chương
            </span>
          </div>
          <div className="tvc-chapter-list">
            {loadingChapters ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
                Đang tải…
              </div>
            ) : chapters.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 13 }}>
                Chưa có chương nào.
              </div>
            ) : (
              chapters.map((ch) => (
                <div
                  className={`row ${ch.read ? "read" : ""}`}
                  key={ch.num}
                  onClick={() => onRead(story, ch.num)}
                >
                  <span className="num">{String(ch.num).padStart(3, "0")}</span>
                  <span className="name">{ch.name}</span>
                  <span className="date">{ch.date}</span>
                </div>
              ))
            )}
          </div>
          <button className="tvc-btn tvc-btn-ghost" style={{ width: "100%", marginTop: 12, justifyContent: "center" }}>
            Xem đầy đủ <Icon name="chevronRight" size={14} />
          </button>
        </aside>
      </div>
    </div>
  );
}
