"use client";

import React, { useState } from "react";
import Image from "next/image";
import { STORIES, type Story } from "@/lib/data";
import { StoryCover } from "./story-cover";
import { Icon } from "./icons";

type Props = {
  onPick: (s: Story) => void;
  onRead: (s: Story) => void;
};

type Tab = "reading" | "saved" | "history" | "finished";

function ReadingCard({
  story,
  progress,
  chapter,
  onPick,
  onRead,
}: {
  story: Story;
  progress: number;
  chapter: string;
  onPick: () => void;
  onRead: () => void;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        borderRadius: 12,
        padding: 16,
        display: "flex",
        gap: 14,
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <StoryCover story={story} size="sm" onClick={onPick} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontFamily: "var(--font-serif-vn)",
            fontSize: 16,
            fontWeight: 700,
            color: "var(--fg-1)",
            cursor: "pointer",
          }}
          onClick={onPick}
        >
          {story.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
          {story.author}
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 8 }}>
          Đang đọc:{" "}
          <strong style={{ color: "var(--fg-1)" }}>{chapter}</strong>
        </div>
        <div
          style={{
            marginTop: 8,
            height: 4,
            background: "var(--bg-inset)",
            borderRadius: 999,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "var(--brand-primary)",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 6,
          }}
        >
          <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
            {progress}% hoàn thành
          </span>
          <button
            className="tvc-btn tvc-btn-primary tvc-btn-sm"
            onClick={onRead}
          >
            Đọc tiếp
          </button>
        </div>
      </div>
    </div>
  );
}

export function Library({ onPick, onRead }: Props) {
  const [tab, setTab] = useState<Tab>("reading");

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "reading", label: "Đang đọc", count: 5 },
    { id: "saved", label: "Đã đánh dấu", count: 23 },
    { id: "history", label: "Lịch sử", count: 142 },
    { id: "finished", label: "Đã hoàn thành", count: 8 },
  ];

  const readingData = [
    { progress: 78, chapter: "Chương 1912" },
    { progress: 42, chapter: "Chương 508" },
    { progress: 15, chapter: "Chương 805" },
    { progress: 91, chapter: "Chương 254" },
  ];

  return (
    <div
      className="tvc-container"
      style={{ paddingTop: 32, paddingBottom: 64 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 18,
          marginBottom: 8,
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-serif-vn)",
            fontSize: 36,
            fontWeight: 700,
            margin: 0,
            color: "var(--fg-ink)",
          }}
        >
          Tàng Kinh Các
        </h1>
        <span
          style={{
            fontFamily: "var(--font-serif-han)",
            fontSize: 16,
            color: "var(--fg-3)",
            letterSpacing: ".3em",
          }}
        >
          藏 經 閣
        </span>
      </div>
      <p
        style={{ color: "var(--fg-2)", fontSize: 14, margin: "0 0 28px" }}
      >
        Tủ truyện của đạo hữu — nơi cất giữ những quyển đáng đọc.
      </p>

      <div className="tvc-library-tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "on" : ""}
            onClick={() => setTab(t.id)}
          >
            {t.label}{" "}
            <span style={{ color: "var(--fg-4)", marginLeft: 4 }}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "reading" && (
        <div className="tvc-library-grid">
          {STORIES.slice(0, 4).map((s, i) => (
            <ReadingCard
              key={s.id}
              story={s}
              progress={readingData[i].progress}
              chapter={readingData[i].chapter}
              onPick={() => onPick(s)}
              onRead={() => onRead(s)}
            />
          ))}
        </div>
      )}

      {tab === "saved" && (
        <div className="tvc-cover-grid">
          {STORIES.map((s) => (
            <div
              className="tvc-cover-card"
              key={s.id}
              onClick={() => onPick(s)}
            >
              <StoryCover story={s} size="md" />
              <div className="ti">{s.title}</div>
              <div className="au">{s.author}</div>
            </div>
          ))}
        </div>
      )}

      {(tab === "history" || tab === "finished") && (
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: 12,
            padding: "64px 32px",
            textAlign: "center",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <Image
            src="/seal.svg"
            alt=""
            width={64}
            height={64}
            style={{ opacity: 0.35, marginBottom: 16 }}
          />
          <div
            style={{
              fontFamily: "var(--font-serif-vn)",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--fg-2)",
              marginBottom: 6,
            }}
          >
            Mục này chưa có gì
          </div>
          <div style={{ fontSize: 13, color: "var(--fg-3)" }}>
            Tiếp tục khám phá Bảng Phong Vân để tìm quyển hợp ý đạo hữu.
          </div>
        </div>
      )}
    </div>
  );
}
