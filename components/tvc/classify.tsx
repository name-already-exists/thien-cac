"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { Story } from "@/lib/data";
import { fetchAllStories } from "@/lib/db";
import { StoryCover } from "./story-cover";
import { Icon } from "./icons";
import { GENRE_VAR, STATUS_META } from "./ranking";

// ─── Design constants ────────────────────────────────────────────
const GENRE_HAN: Record<string, string> = {
  "Tiên hiệp":   "仙俠",
  "Kiếm hiệp":   "劍俠",
  "Huyền huyễn": "玄幻",
  "Đô thị":      "都市",
  "Ngôn tình":   "言情",
};

const GENRE_DESC: Record<string, string> = {
  "Tiên hiệp":   "Tu tiên · đan dược · pháp bảo",
  "Kiếm hiệp":   "Võ lâm · giang hồ · kiếm khách",
  "Huyền huyễn": "Ma pháp · dị giới · thượng cổ",
  "Đô thị":      "Hiện đại · đời thường · dị năng",
  "Ngôn tình":   "Tình duyên · lãng mạn · cổ đại",
};

// Hero cards: only the 3 primary genres
const HERO_GENRES = ["Tiên hiệp", "Kiếm hiệp", "Huyền huyễn"];

const STATUS_FILTERS: { id: "ongoing" | "completed"; label: string }[] = [
  { id: "ongoing",   label: "Đang ra"    },
  { id: "completed", label: "Hoàn thành" },
];

type Sort = "updated" | "reads" | "rating" | "new" | "chapters";

const SORTS: { id: Sort; label: string }[] = [
  { id: "updated",  label: "Mới cập nhật"   },
  { id: "reads",    label: "Đọc nhiều nhất" },
  { id: "rating",   label: "Đánh giá cao"   },
  { id: "new",      label: "Mới ra mắt"     },
  { id: "chapters", label: "Nhiều chương"   },
];

function hashNum(s: string): number {
  let h = 0;
  for (const c of s) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0;
  return Math.abs(h);
}
function readersToNum(r: string): number {
  if (!r) return 0;
  if (r.endsWith("M")) return parseFloat(r) * 1_000_000;
  if (r.endsWith("K")) return parseFloat(r) * 1_000;
  return parseFloat(r) || 0;
}

// ─── Sub-components ──────────────────────────────────────────────
function FilterSection({ title, han, children }: { title: string; han?: string; children: React.ReactNode }) {
  return (
    <div className="flt-section">
      <div className="flt-head">
        {title}
        {han && <span className="han">{han}</span>}
      </div>
      {children}
    </div>
  );
}

function BrowseCard({ s, onPick }: { s: Story; onPick: (s: Story) => void }) {
  const st = STATUS_META[s.status] || STATUS_META.ongoing;
  return (
    <div className="browse-card" onClick={() => onPick(s)}>
      <StoryCover story={s} size="md" />
      <div className="bc-info">
        <div className="bc-top">
          <div className="bc-ti">{s.title}</div>
          <div className="bc-han">{s.han.split("").join(" ")}</div>
        </div>
        <div className="bc-au">{s.author}</div>
        <div className="bc-tags">
          <span
            className="genre-chip"
            style={{ "--gc": GENRE_VAR[s.genre] || "var(--fg-3)" } as React.CSSProperties}
          >
            {s.genre}
          </span>
          <span className={`tvc-badge ${st.cls}`}>
            <span className="dot" style={{ background: st.color }} />{st.label}
          </span>
        </div>
        <div className="bc-desc">{s.desc}</div>
        <div className="bc-meta">
          <span><span className="star">★</span> {s.rating.toFixed(1)}</span>
          <span className="d" />
          <span>{s.chapters.toLocaleString("vi-VN")} chương</span>
          <span className="d" />
          <span>{s.readers} đọc</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────
type Props = { onPick: (s: Story) => void };

export function Classify({ onPick }: Props) {
  const [stories, setStories]   = useState<Story[]>([]);
  const [genre, setGenre]       = useState("Tất cả");
  const [statuses, setStatuses] = useState<("ongoing" | "completed")[]>([]);
  const [tags, setTags]         = useState<string[]>([]);
  const [sort, setSort]         = useState<Sort>("updated");
  const [sheet, setSheet]       = useState(false);

  useEffect(() => { fetchAllStories().then(setStories); }, []);

  // Derive genre counts and available genres from data
  const genreCounts = useMemo(() => {
    const m: Record<string, number> = {};
    stories.forEach((s) => { m[s.genre] = (m[s.genre] || 0) + 1; });
    return m;
  }, [stories]);

  const allGenres = useMemo(() => {
    const seen = new Set<string>();
    stories.forEach((s) => { if (s.genre) seen.add(s.genre); });
    return Array.from(seen);
  }, [stories]);

  const popularTags = useMemo(() => {
    const counts: Record<string, number> = {};
    stories.forEach((s) => s.tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([t]) => t);
  }, [stories]);

  const toggle = <T,>(arr: T[], set: (v: T[]) => void, v: T) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  const filtered = useMemo(() => {
    let list = stories.filter((s) => {
      if (genre !== "Tất cả" && s.genre !== genre) return false;
      if (statuses.length && !statuses.includes(s.status as "ongoing" | "completed")) return false;
      if (tags.length && !tags.some((t) => s.tags.includes(t))) return false;
      return true;
    });
    const sorters: Record<Sort, (a: Story, b: Story) => number> = {
      updated:  (a, b) => hashNum(b.id + "upd") - hashNum(a.id + "upd"),
      new:      (a, b) => hashNum(b.id + "new") - hashNum(a.id + "new"),
      reads:    (a, b) => readersToNum(b.readers) - readersToNum(a.readers),
      rating:   (a, b) => b.rating - a.rating,
      chapters: (a, b) => b.chapters - a.chapters,
    };
    return [...list].sort(sorters[sort]);
  }, [stories, genre, statuses, tags, sort]);

  const activeCount = (genre !== "Tất cả" ? 1 : 0) + statuses.length + tags.length;
  const clearAll = () => { setGenre("Tất cả"); setStatuses([]); setTags([]); };

  // Rail is a function so it produces separate instances for aside & sheet
  const buildRail = () => (
    <div className="browse-rail">
      <div className="flt-railhead">
        <span>Bộ lọc</span>
        {activeCount > 0 && <button className="flt-clear" onClick={clearAll}>Xoá tất cả</button>}
      </div>

      <FilterSection title="Thể loại" han="類別">
        <div className="flt-list">
          <button
            className={`flt-item${genre === "Tất cả" ? " on" : ""}`}
            onClick={() => setGenre("Tất cả")}
          >
            <span>Tất cả</span><span className="ct">{stories.length}</span>
          </button>
          {allGenres.map((g) => (
            <button
              key={g}
              className={`flt-item${genre === g ? " on" : ""}`}
              onClick={() => setGenre(g)}
              disabled={!genreCounts[g]}
            >
              <span>{g}</span><span className="ct">{genreCounts[g] || 0}</span>
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Trạng thái" han="狀態">
        <div className="flt-checks">
          {STATUS_FILTERS.map((s) => (
            <label key={s.id} className="flt-check">
              <input
                type="checkbox"
                checked={statuses.includes(s.id)}
                onChange={() => toggle(statuses, setStatuses, s.id)}
              />
              <span className="box" />
              <span>{s.label}</span>
            </label>
          ))}
        </div>
      </FilterSection>

      {popularTags.length > 0 && (
        <FilterSection title="Tag nổi bật" han="標籤">
          <div className="flt-tags">
            {popularTags.map((t) => (
              <button
                key={t}
                className={`flt-tag${tags.includes(t) ? " on" : ""}`}
                onClick={() => toggle(tags, setTags, t)}
              >
                {t}
              </button>
            ))}
          </div>
        </FilterSection>
      )}
    </div>
  );

  return (
    <div>
      {/* ── Hero ── */}
      <div className="browse-hero">
        <div className="tvc-container">
          <div className="tvc-eyebrow" style={{ color: "var(--brand-primary)" }}>
            Khám phá kho truyện · 探索書海
          </div>
          <div className="browse-hero-row">
            <h1>Phân loại <span className="han">分類</span></h1>
            <p>Lọc theo thể loại, trạng thái và tag để tìm đúng quyển hợp ý đạo hữu.</p>
          </div>
          <div className="genre-cards">
            {HERO_GENRES.filter((g) => (genreCounts[g] || 0) > 0 || stories.length === 0).map((g) => (
              <div
                key={g}
                className={`genre-card${genre === g ? " on" : ""}`}
                style={{ "--gc": GENRE_VAR[g] } as React.CSSProperties}
                onClick={() => setGenre(genre === g ? "Tất cả" : g)}
              >
                <div className="gc-han">{GENRE_HAN[g]}</div>
                <div className="gc-body">
                  <div className="gc-name">{g}</div>
                  <div className="gc-desc">{GENRE_DESC[g]}</div>
                  <div className="gc-count">{genreCounts[g] || 0} quyển</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Layout ── */}
      <div className="tvc-container browse-layout">
        {/* Desktop filter rail */}
        <aside className="browse-aside">{buildRail()}</aside>

        {/* Results */}
        <div className="browse-main">
          {/* Toolbar */}
          <div className="browse-toolbar">
            <button className="flt-trigger tvc-m-only" onClick={() => setSheet(true)}>
              <Icon name="settings" size={15} /> Bộ lọc
              {activeCount > 0 && <span className="cnt">{activeCount}</span>}
            </button>
            <div className="result-count">
              <strong>{filtered.length}</strong> quyển
              {genre !== "Tất cả" && (
                <> · <span style={{ color: GENRE_VAR[genre] || "inherit" }}>{genre}</span></>
              )}
            </div>
            <div className="sort-wrap">
              <span className="sort-lbl tvc-d-only">Sắp xếp</span>
              <div className="sort-pills">
                {SORTS.map((o) => (
                  <button
                    key={o.id}
                    className={sort === o.id ? "on" : ""}
                    onClick={() => setSort(o.id)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {activeCount > 0 && (
            <div className="active-chips">
              {genre !== "Tất cả" && (
                <button className="achip" onClick={() => setGenre("Tất cả")}>
                  {genre} <Icon name="x" size={12} />
                </button>
              )}
              {statuses.map((id) => (
                <button key={id} className="achip" onClick={() => toggle(statuses, setStatuses, id)}>
                  {STATUS_META[id]?.label} <Icon name="x" size={12} />
                </button>
              ))}
              {tags.map((t) => (
                <button key={t} className="achip" onClick={() => toggle(tags, setTags, t)}>
                  {t} <Icon name="x" size={12} />
                </button>
              ))}
            </div>
          )}

          {/* Grid */}
          {filtered.length === 0 ? (
            <div className="browse-empty">
              <Image src="/seal.svg" alt="" width={56} height={56} style={{ opacity: 0.35, marginBottom: 14 }} />
              <div className="ti">Không có quyển nào khớp bộ lọc</div>
              <div className="sub">Đạo hữu thử nới lỏng điều kiện tìm kiếm xem sao.</div>
              <button className="tvc-btn tvc-btn-secondary tvc-btn-sm" style={{ marginTop: 16 }} onClick={clearAll}>
                Xoá bộ lọc
              </button>
            </div>
          ) : (
            <div className="browse-grid">
              {filtered.map((s) => <BrowseCard key={s.id} s={s} onPick={onPick} />)}
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      {sheet && createPortal(
        <>
          <div className="flt-sheet-backdrop" onClick={() => setSheet(false)} />
          <div className="flt-sheet">
            <div className="flt-sheet-head">
              <span>Bộ lọc</span>
              <button className="tvc-icon-btn" onClick={() => setSheet(false)}>
                <Icon name="x" size={20} />
              </button>
            </div>
            <div className="flt-sheet-body">{buildRail()}</div>
            <div className="flt-sheet-foot">
              <button className="tvc-btn tvc-btn-ghost tvc-btn-sm" onClick={clearAll}>Xoá tất cả</button>
              <button className="tvc-btn tvc-btn-primary" onClick={() => setSheet(false)}>
                Xem {filtered.length} kết quả
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
