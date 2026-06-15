"use client";

import React, { useEffect, useState, useMemo } from "react";
import type { Story } from "@/lib/data";
import { fetchAllStories } from "@/lib/db";
import { StoryCover } from "./story-cover";
import { Icon } from "./icons";

// ─── Helpers ────────────────────────────────────────────────────
function readersToNum(r: string): number {
  if (!r) return 0;
  if (r.endsWith("M")) return parseFloat(r) * 1_000_000;
  if (r.endsWith("K")) return parseFloat(r) * 1_000;
  return parseFloat(r) || 0;
}

function fmtNum(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1e3) return Math.round(n / 1e3) + "K";
  return String(Math.round(n));
}

function hashNum(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}

const PERIOD_SCALE: Record<string, number> = { tuan: 0.028, thang: 0.11, quy: 0.32, all: 1 };

function scoreOf(s: Story, period: string, metric: string): number {
  const base = readersToNum(s.readers);
  const h = hashNum(s.id + period + metric);
  const jitter = 0.72 + (h % 56) / 100;
  if (metric === "rating") return s.rating * 100_000 + (h % 1000);
  if (metric === "votes")  return base * 0.55 * jitter + s.rating * 30_000;
  return base * jitter;
}

function primaryStat(s: Story, period: string, metric: string) {
  const base = readersToNum(s.readers);
  const h = hashNum(s.id + period);
  const jitter = 0.78 + (h % 44) / 100;
  if (metric === "rating") {
    return { val: s.rating.toFixed(1), unit: "điểm", sub: `${s.reviews} đánh giá` };
  }
  if (metric === "votes") {
    const v = base * 0.012 * (PERIOD_SCALE[period] ?? 1) / 0.028 * jitter;
    return { val: fmtNum(Math.max(120, v * 9)), unit: "phiếu đề cử", sub: null };
  }
  const reads = period === "all" ? base : base * (PERIOD_SCALE[period] ?? 1) * jitter;
  return { val: fmtNum(reads), unit: "lượt đọc", sub: period === "all" ? "tổng" : null };
}

function rankChange(id: string, period: string): { type: "new" | "up" | "down" | "same"; n?: number } {
  const h = hashNum(id + period + "prev");
  if (h % 9 === 0) return { type: "new" };
  const delta = (h % 7) - 3;
  if (delta === 0) return { type: "same" };
  return { type: delta > 0 ? "up" : "down", n: Math.abs(delta) };
}

// ─── Constants ──────────────────────────────────────────────────
export const GENRE_VAR: Record<string, string> = {
  "Tiên hiệp":   "var(--genre-tienhiep)",
  "Kiếm hiệp":   "var(--genre-kiemhiep)",
  "Huyền huyễn": "var(--genre-huyenao)",
  "Đô thị":      "var(--genre-dothi)",
  "Ngôn tình":   "var(--genre-ngontinh)",
};

export const STATUS_META: Record<string, { cls: string; label: string; color: string }> = {
  ongoing:   { cls: "tvc-b-ongoing",   label: "Đang ra",    color: "#4A7C59" },
  completed: { cls: "tvc-b-completed", label: "Hoàn thành", color: "#4A6FA5" },
  paused:    { cls: "tvc-b-paused",    label: "Tạm ngưng",  color: "#C9842C" },
};

const PERIODS = [
  { id: "tuan",  label: "Tuần",   han: "週" },
  { id: "thang", label: "Tháng",  han: "月" },
  { id: "quy",   label: "Quý",    han: "季" },
  { id: "all",   label: "Tất cả", han: "總" },
];

const METRICS = [
  { id: "reads",  label: "Lượt đọc" },
  { id: "votes",  label: "Đề cử"    },
  { id: "rating", label: "Đánh giá" },
];

// ─── Sub-components ──────────────────────────────────────────────
function TrendTag({ change }: { change: { type: string; n?: number } }) {
  if (change.type === "new")
    return <span className="bxh-trend new">MỚI</span>;
  if (change.type === "same")
    return <span className="bxh-trend same">—</span>;
  const up = change.type === "up";
  return (
    <span className={`bxh-trend ${up ? "up" : "down"}`}>
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
        <path d={up ? "M5 1 L9 7 L1 7 Z" : "M5 9 L1 3 L9 3 Z"} fill="currentColor" />
      </svg>
      {change.n}
    </span>
  );
}

function GenreChip({ genre }: { genre: string }) {
  return (
    <span
      className="genre-chip"
      style={{ "--gc": GENRE_VAR[genre] || "var(--fg-3)" } as React.CSSProperties}
    >
      {genre}
    </span>
  );
}

function Podium({ items, period, metric, onPick }: {
  items: Story[];
  period: string;
  metric: string;
  onPick: (s: Story) => void;
}) {
  if (items.length < 3) return null;
  const order = [items[1], items[0], items[2]]; // 2 · 1 · 3 (visual)
  const ranks = [2, 1, 3];

  return (
    <div className="bxh-podium">
      {order.map((s, i) => {
        const rank = ranks[i];
        const stat = primaryStat(s, period, metric);
        const hanLabel = rank === 1 ? "冠" : rank === 2 ? "亞" : "季";
        return (
          <div key={s.id} className={`podium-card r${rank}`} onClick={() => onPick(s)}>
            <div className={`podium-medal m${rank}`}>
              <span className="rk">{rank}</span>
              <span className="han">{hanLabel}</span>
            </div>
            <StoryCover story={s} size={rank === 1 ? "md" : "sm"} />
            <div className="podium-info">
              <div className="ti">{s.title}</div>
              <div className="han-sub">{s.han.split("").join(" ")}</div>
              <GenreChip genre={s.genre} />
              <div className="stat">
                <span className="v">{stat.val}</span>
                <span className="u">{stat.unit}</span>
              </div>
              <div className="rate">
                <span className="star">★</span> {s.rating.toFixed(1)} · {s.author}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RankRow({ s, rank, period, metric, onPick, maxScore }: {
  s: Story;
  rank: number;
  period: string;
  metric: string;
  onPick: (s: Story) => void;
  maxScore: number;
}) {
  const stat = primaryStat(s, period, metric);
  const change = rankChange(s.id, period);
  const st = STATUS_META[s.status] || STATUS_META.ongoing;
  const score = scoreOf(s, period, metric);
  const pct = Math.max(8, Math.round((score / Math.max(maxScore, 1)) * 100));

  return (
    <div className="bxh-row" onClick={() => onPick(s)}>
      <div className="bxh-rank">
        <span className="n">{rank}</span>
        <TrendTag change={change} />
      </div>
      <StoryCover story={s} size="sm" />
      <div className="bxh-main">
        <div className="top">
          <span className="ti">{s.title}</span>
          <span className="han">{s.hanShort || s.han}</span>
        </div>
        <div className="sub">
          <GenreChip genre={s.genre} />
          <span className="au">{s.author}</span>
          <span className={`tvc-badge ${st.cls}`}>
            <span className="dot" style={{ background: st.color }} />{st.label}
          </span>
        </div>
        <div className="bar">
          <div className="fill" style={{ width: pct + "%" }} />
        </div>
      </div>
      <div className="bxh-stat">
        <div className="v">{stat.val}</div>
        <div className="u">{stat.unit}</div>
        <div className="rate"><span className="star">★</span> {s.rating.toFixed(1)}</div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────
type Props = { onPick: (s: Story) => void };

export function Ranking({ onPick }: Props) {
  const [stories, setStories] = useState<Story[]>([]);
  const [period, setPeriod]   = useState("tuan");
  const [genre, setGenre]     = useState("Tất cả");
  const [metric, setMetric]   = useState("reads");

  useEffect(() => { fetchAllStories().then(setStories); }, []);

  const genres = useMemo(() => {
    const seen = new Set<string>();
    stories.forEach((s) => { if (s.genre) seen.add(s.genre); });
    return Array.from(seen);
  }, [stories]);

  const ranked = useMemo(() => {
    const list = stories.filter((s) => genre === "Tất cả" || s.genre === genre);
    return [...list].sort((a, b) => scoreOf(b, period, metric) - scoreOf(a, period, metric));
  }, [stories, period, genre, metric]);

  const top3    = ranked.slice(0, 3);
  const rest    = ranked.slice(3);
  const maxScore = ranked.length ? scoreOf(ranked[0], period, metric) : 1;
  const activePeriod = PERIODS.find((p) => p.id === period) || PERIODS[0];

  return (
    <div>
      {/* ── Hero band ── */}
      <div className="bxh-hero">
        <div className="bxh-hero-pattern" />
        <div className="tvc-container bxh-hero-inner">
          <div className="bxh-seal">風<br />雲<br />榜</div>
          <div className="bxh-hero-text">
            <div className="tvc-eyebrow" style={{ color: "var(--brand-primary)", marginBottom: 6 }}>
              Bảng xếp hạng · Cập nhật{" "}
              {activePeriod.label.toLowerCase() === "tất cả" ? "liên tục" : activePeriod.label.toLowerCase()}
            </div>
            <h1>Bảng Phong Vân</h1>
            <p>
              Những quyển được đạo hữu bốn phương đọc nhiều, đề cử cao nhất —
              gió mây hội tụ, anh hùng lộ diện.
            </p>
          </div>
          <div className="bxh-hero-meta">
            <div className="m">
              <span className="v">{stories.length}</span>
              <span className="l">quyển dự bảng</span>
            </div>
            <div className="sep" />
            <div className="m">
              <span className="v">Tuần 21</span>
              <span className="l">kỳ · 2026</span>
            </div>
          </div>
        </div>
      </div>

      <div className="tvc-container" style={{ paddingBottom: 64 }}>
        {/* ── Controls ── */}
        <div className="bxh-controls">
          <div className="bxh-periods">
            {PERIODS.map((p) => (
              <button key={p.id} className={period === p.id ? "on" : ""} onClick={() => setPeriod(p.id)}>
                {p.label}<span className="han">{p.han}</span>
              </button>
            ))}
          </div>
          {genres.length > 0 && (
            <div className="bxh-genres">
              <button className={genre === "Tất cả" ? "on" : ""} onClick={() => setGenre("Tất cả")}>Tất cả</button>
              {genres.map((g) => (
                <button key={g} className={genre === g ? "on" : ""} onClick={() => setGenre(g)}>{g}</button>
              ))}
            </div>
          )}
          <div className="bxh-metrics">
            <span className="lbl">Xếp theo</span>
            {METRICS.map((m) => (
              <button key={m.id} className={metric === m.id ? "on" : ""} onClick={() => setMetric(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Podium ── */}
        <Podium items={top3} period={period} metric={metric} onPick={onPick} />

        {/* ── List (rank 4+) ── */}
        <div className="bxh-list">
          {rest.map((s, i) => (
            <RankRow
              key={s.id}
              s={s}
              rank={i + 4}
              period={period}
              metric={metric}
              onPick={onPick}
              maxScore={maxScore}
            />
          ))}
        </div>

        <div className="tvc-divider-orn" style={{ margin: "40px auto 8px" }}>
          <div className="line" /><div className="dot" /><div className="diamond" /><div className="dot" /><div className="line" />
        </div>
        <p style={{ textAlign: "center", color: "var(--fg-3)", fontSize: 13, fontFamily: "var(--font-serif-vn)", fontStyle: "italic" }}>
          Bảng xếp hạng làm mới mỗi{" "}
          {period === "tuan" ? "thứ Hai" : period === "thang" ? "đầu tháng" : period === "quy" ? "đầu quý" : "ngày"}.
          {" "}Thứ hạng dựa trên lượt đọc, phiếu đề cử và đánh giá của đạo hữu.
        </p>
      </div>
    </div>
  );
}
