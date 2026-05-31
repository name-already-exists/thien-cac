"use client";

import React, { useState } from "react";
import { STORIES, type Story } from "@/lib/data";
import { StoryCover } from "./story-cover";
import { Icon } from "./icons";

type Props = {
  onPick: (s: Story) => void;
  onRead: (s: Story) => void;
};

function OrnDivider() {
  return (
    <div className="tvc-divider-orn">
      <div className="line" />
      <div className="dot" />
      <div className="diamond" />
      <div className="dot" />
      <div className="line" />
    </div>
  );
}

function SectionHead({
  title,
  han,
  onMore,
}: {
  title: string;
  han?: string;
  onMore?: () => void;
}) {
  return (
    <div className="tvc-section-head">
      <h2>
        {title} {han && <span className="han">{han}</span>}
      </h2>
      {onMore && (
        <a className="more" onClick={onMore}>
          Xem tất cả <Icon name="chevronRight" size={14} />
        </a>
      )}
    </div>
  );
}

function StoryListSection({
  title,
  han,
  stories,
  onPick,
}: {
  title: string;
  han?: string;
  stories: Story[];
  onPick: (s: Story) => void;
}) {
  return (
    <section className="tvc-section">
      <SectionHead title={title} han={han} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {stories.map((s) => (
          <div className="tvc-story-row" key={s.id} onClick={() => onPick(s)}>
            <StoryCover story={s} size="sm" />
            <div className="info">
              <div className="title">{s.title}</div>
              <div className="author">
                {s.author} ·{" "}
                <span style={{ color: "var(--brand-primary)" }}>{s.genre}</span>
              </div>
              <div className="meta">
                <span
                  className={`tvc-badge ${s.status === "ongoing" ? "tvc-b-ongoing" : "tvc-b-completed"}`}
                >
                  <span
                    className="dot"
                    style={{
                      background:
                        s.status === "ongoing" ? "#4A7C59" : "#4A6FA5",
                    }}
                  />
                  {s.status === "ongoing" ? "Đang ra" : "Hoàn thành"}
                </span>
                <span>Chương {s.chapters.toLocaleString("vi-VN")}</span>
                <span>· {s.rating}★</span>
              </div>
              <div className="desc">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StoryGridSection({
  title,
  han,
  stories,
  onPick,
}: {
  title: string;
  han?: string;
  stories: Story[];
  onPick: (s: Story) => void;
}) {
  return (
    <section className="tvc-section">
      <SectionHead title={title} han={han} onMore={() => {}} />
      <div className="tvc-cover-grid">
        {stories.map((s) => (
          <div className="tvc-cover-card" key={s.id} onClick={() => onPick(s)}>
            <StoryCover story={s} size="md" />
            <div className="ti">{s.title}</div>
            <div className="au">{s.author}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function RankingSidebar({ stories, onPick }: { stories: Story[]; onPick: (s: Story) => void }) {
  const [tab, setTab] = useState<"week" | "month" | "new" | "done">("week");

  const tabs = [
    { id: "week" as const, label: "Tuần", list: stories },
    {
      id: "month" as const,
      label: "Tháng",
      list: [stories[2], stories[0], stories[5], stories[1], stories[3]],
    },
    {
      id: "new" as const,
      label: "Mới ra",
      list: [stories[5], stories[3], stories[1], stories[4], stories[0]],
    },
    {
      id: "done" as const,
      label: "Hoàn tất",
      list: [stories[0], stories[2], stories[4], stories[1], stories[5]],
    },
  ];

  const active = tabs.find((t) => t.id === tab)!;

  return (
    <aside style={{ position: "sticky", top: 80, alignSelf: "flex-start" }}>
      <div className="tvc-rank-list">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "4px 6px 12px",
          }}
        >
          <Icon name="trophy" size={18} />
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-serif-vn)",
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            Bảng Phong Vân
          </h3>
          <span
            className="tvc-eyebrow"
            style={{ marginLeft: "auto", color: "var(--fg-3)" }}
          >
            風雲榜
          </span>
        </div>
        <div className="tvc-rank-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "on" : ""}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ marginTop: 10 }}>
          {active.list.filter(Boolean).map((s, i) => {
            const numClass =
              i === 0 ? "top" : i === 1 ? "top2" : i === 2 ? "top3" : "rest";
            return (
              <div
                className="tvc-rank-row"
                key={s.id + tab}
                onClick={() => onPick(s)}
              >
                <div className={`num ${numClass}`}>{i + 1}</div>
                <div className="info">
                  <div className="ti">{s.title}</div>
                  <div className="meta">
                    {tab === "week" && `${s.readers} lượt đọc · +12% tuần`}
                    {tab === "month" && `${s.readers} lượt đọc · ${s.rating}★`}
                    {tab === "new" && `Ra mắt 2 tuần · ${s.genre}`}
                    {tab === "done" &&
                      `${s.chapters.toLocaleString("vi-VN")} chương · Hoàn`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: 20,
          background: "var(--bg-card)",
          borderRadius: 12,
          padding: 18,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <Icon name="flame" size={18} />
          <h3
            style={{
              margin: 0,
              fontFamily: "var(--font-serif-vn)",
              fontSize: 17,
              fontWeight: 700,
            }}
          >
            Đang hot
          </h3>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[
            "Tu tiên",
            "Trùng sinh",
            "Xuyên không",
            "Hệ thống",
            "Đan dược",
            "Kiếm khách",
            "Ma đạo",
            "Yêu thú",
            "Đại đạo",
            "Hậu cung",
          ].map((t) => (
            <span
              key={t}
              className="tvc-tag tvc-tag-outline"
              style={{ cursor: "pointer" }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

function FeaturedGrid({ onPick, onRead }: Props) {
  const [main, ...rest] = STORIES;
  const [c1, c2] = main.palette;

  const quotes = [
    "“Văn phong tuyệt mỹ — phải đọc.”",
    "“Cốt truyện sâu, chậm rãi mà cuốn.”",
    "“Tác phẩm hiếm có của năm.”",
    "“Hệ thống tu luyện độc đáo.”",
  ];

  return (
    <section className="tvc-featured">
      <div
        className="tvc-featured-bg"
        style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
      />
      <div className="tvc-featured-overlay" />
      <div className="tvc-container tvc-featured-inner">
        <div className="tvc-featured-head">
          <div
            className="tvc-eyebrow"
            style={{ color: "var(--brand-primary)" }}
          >
            Biên tập đề cử{" "}
            <span
              style={{
                fontFamily: "var(--font-serif-han)",
                marginLeft: 8,
                letterSpacing: ".3em",
              }}
            >
              編輯精選
            </span>
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 6,
              alignItems: "center",
              color: "var(--fg-3)",
              fontSize: 13,
            }}
          >
            <Icon name="sparkles" size={14} /> Tuần 21 · 2026
          </div>
        </div>

        <div className="tvc-featured-grid">
          {/* Main feature */}
          <div
            className="tvc-featured-main"
            onClick={() => onPick(main)}
          >
            <StoryCover story={main} size="lg" />
            <div className="featured-main-info">
              <div
                className="tvc-eyebrow"
                style={{ color: "var(--brand-primary)" }}
              >
                Đề cử của tuần · {main.genre}
              </div>
              <h2 className="feature-title">{main.title}</h2>
              <div className="han-sub">{main.han.split("").join(" ")}</div>
              <div className="meta">
                <span>
                  Tác giả ·{" "}
                  <strong style={{ color: "var(--fg-1)" }}>{main.author}</strong>
                </span>
                <span className="dot" />
                <span>{main.chapters.toLocaleString("vi-VN")} chương</span>
                <span className="dot" />
                <span>
                  <Icon name="star" size={12} /> {main.rating} · {main.readers}{" "}
                  đọc
                </span>
              </div>
              <p className="feature-desc">{main.desc}</p>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 12,
                }}
              >
                {main.tags.slice(0, 3).map((t) => (
                  <span key={t} className="tvc-tag">
                    {t}
                  </span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button
                  className="tvc-btn tvc-btn-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRead(main);
                  }}
                >
                  <Icon name="bookOpen" size={15} /> Đọc ngay
                </button>
                <button
                  className="tvc-btn tvc-btn-secondary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Icon name="bookmark" size={15} /> Thêm vào tủ
                </button>
              </div>
            </div>
          </div>

          {/* Side features */}
          <div className="tvc-featured-side">
            {rest.slice(0, 4).map((s, i) => (
              <div
                className="tvc-feature-mini"
                key={s.id}
                onClick={() => onPick(s)}
              >
                <StoryCover story={s} size="sm" />
                <div className="info">
                  <div className="ti">{s.title}</div>
                  <div className="han">{s.han.split("").join(" ")}</div>
                  <div className="meta">
                    {s.genre} · {s.author}
                  </div>
                  <div className="quote">{quotes[i]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Home({ onPick, onRead }: Props) {
  return (
    <div>
      <FeaturedGrid onPick={onPick} onRead={onRead} />
      <div className="tvc-container">
        <div className="tvc-home-grid">
          <div>
            <StoryListSection
              title="Đang đọc dở"
              han="續讀"
              stories={STORIES.slice(1, 4)}
              onPick={onPick}
            />
            <OrnDivider />
            <StoryGridSection
              title="Vừa cập nhật"
              han="新章"
              stories={STORIES}
              onPick={onPick}
            />
          </div>
          <RankingSidebar stories={STORIES} onPick={onPick} />
        </div>
      </div>
    </div>
  );
}
