"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import type { Story } from "@/lib/data";
import { fetchAllStories } from "@/lib/db";
import { getUsername } from "@/lib/user-identity";
import { StoryCover } from "./story-cover";
import { Icon } from "./icons";

type Screen = "home" | "detail" | "reader" | "library" | "ranking" | "classify";

type Props = {
  screen: Screen;
  onNav: (target: { screen: Screen }) => void;
  query: string;
  setQuery: (q: string) => void;
  onSearchPick: (s: Story) => void;
};

type DropdownPos = { top: number; left: number; width: number };

function norm(s: string) {
  return s.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function Header({ screen, onNav, query, setQuery, onSearchPick }: Props) {
  const [menuOpen, setMenuOpen]     = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Desktop search dropdown
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchStories, setSearchStories] = useState<Story[]>([]);
  const [storiesLoaded, setStoriesLoaded] = useState(false);
  const [dropdownPos, setDropdownPos]     = useState<DropdownPos | null>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const [username, setUsername] = useState("Đạo hữu");

  useEffect(() => {
    setUsername(getUsername());
  }, []);

  const navClick = (target: { screen: Screen }) => {
    onNav(target);
    setMenuOpen(false);
  };

  const loadStories = () => {
    if (!storiesLoaded) {
      fetchAllStories().then((s) => { setSearchStories(s); setStoriesLoaded(true); });
    }
  };

  const handleSearchFocus = () => {
    setSearchFocused(true);
    if (searchWrapRef.current) {
      const r = searchWrapRef.current.getBoundingClientRect();
      setDropdownPos({ top: r.bottom + 6, left: r.left, width: r.width });
    }
    loadStories();
  };

  const handleSearchBlur = () => {
    setTimeout(() => setSearchFocused(false), 180);
  };

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const qn = norm(query);
    const hit = (s: string) => s.toLowerCase().includes(q) || norm(s).includes(qn);
    return searchStories
      .filter(
        (s) =>
          hit(s.title) ||
          hit(s.author) ||
          hit(s.genre) ||
          s.tags.some(hit)
      )
      .slice(0, 8);
  }, [searchStories, query]);

  const showDropdown = searchFocused && query.trim().length > 0;

  const pickResult = (s: Story) => {
    onSearchPick(s);
    setQuery("");
    setSearchFocused(false);
  };

  const handleMobileSearchFocus = () => { loadStories(); };

  return (
    <>
      <header className="tvc-header">
        <div className="tvc-container inner">
          {/* Mobile menu button */}
          <button
            className="tvc-icon-btn-header tvc-m-only"
            aria-label="Menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? "x" : "alignJustify"} size={20} />
          </button>

          <div className="logo" onClick={() => navClick({ screen: "home" })}>
            <Image src="/seal.svg" alt="Thiên Các" width={80} height={80} priority className="logo-seal" />
            <span className="logo-title">Thiên Các</span>
          </div>

          <nav className="nav">
            <a
              className={screen === "home" ? "active" : ""}
              onClick={() => navClick({ screen: "home" })}
            >
              <Icon name="sparkles" size={14} /> Đề cử
            </a>
            <a
              className={screen === "ranking" ? "active" : ""}
              onClick={() => navClick({ screen: "ranking" })}
            >
              <Icon name="trophy" size={14} /> Bảng Phong Vân
            </a>
            <a
              className={screen === "classify" ? "active" : ""}
              onClick={() => navClick({ screen: "classify" })}
            >
              <Icon name="book" size={14} /> Phân loại
            </a>
            <a
              className={screen === "library" ? "active" : ""}
              onClick={() => navClick({ screen: "library" })}
            >
              <Icon name="library" size={14} /> Tàng Kinh Các
            </a>
          </nav>

          {/* Desktop search */}
          <div className="search-wrap tvc-d-only" ref={searchWrapRef}>
            <Icon name="search" size={15} className="search-icon" />
            <input
              className="search"
              placeholder="Tìm truyện, tác giả, thể loại…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
            />
          </div>

          {/* Mobile search button */}
          <button
            className="tvc-icon-btn-header tvc-m-only"
            aria-label="Tìm kiếm"
            onClick={() => { setSearchOpen(!searchOpen); if (!searchOpen) loadStories(); }}
          >
            <Icon name="search" size={20} />
          </button>

          <div className="user">
            <div className="avatar">{username.charAt(0)}</div>
            <span className="username">{username}</span>
            <Icon name="chevronDown" size={14} />
          </div>
        </div>
      </header>

      {/* Desktop search dropdown */}
      {showDropdown && dropdownPos && createPortal(
        <div
          className="tvc-search-dropdown"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {results.length > 0 ? results.map((s) => (
            <div key={s.id} className="tvc-search-result" onMouseDown={() => pickResult(s)}>
              <StoryCover story={s} size="sm" />
              <div className="info">
                <div className="ti">{s.title}</div>
                <div className="meta">{s.author} · {s.genre}</div>
              </div>
            </div>
          )) : (
            <div className="tvc-search-empty">Không tìm thấy truyện phù hợp</div>
          )}
        </div>,
        document.body
      )}

      {/* Mobile search bar portal */}
      {searchOpen && createPortal(
        <>
          <div className="tvc-m-search-backdrop" onClick={() => { setSearchOpen(false); setQuery(""); }} />
          <div className="tvc-m-search-bar">
          <div className="tvc-m-search-row">
            <div className="search-wrap">
              <Icon name="search" size={15} className="search-icon" />
              <input
                className="search"
                placeholder="Tìm truyện, tác giả, thể loại…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={handleMobileSearchFocus}
                autoFocus
              />
            </div>
            <button className="tvc-icon-btn" onClick={() => { setSearchOpen(false); setQuery(""); }}>
              <Icon name="x" size={18} />
            </button>
          </div>
          {/* Mobile results */}
          {query.trim().length > 0 && (
            <div className="tvc-m-search-results">
              {results.length > 0 ? results.map((s) => (
                <div
                  key={s.id}
                  className="tvc-search-result"
                  onClick={() => { pickResult(s); setSearchOpen(false); }}
                >
                  <StoryCover story={s} size="sm" />
                  <div className="info">
                    <div className="ti">{s.title}</div>
                    <div className="meta">{s.author} · {s.genre}</div>
                  </div>
                </div>
              )) : (
                <div className="tvc-search-empty">Không tìm thấy truyện phù hợp</div>
              )}
            </div>
          )}
        </div>
        </>,
        document.body
      )}

      {/* Mobile menu backdrop + drawer */}
      {menuOpen && createPortal(
        <>
          <div className="tvc-m-menu-backdrop" onClick={() => setMenuOpen(false)} />
          <nav className="tvc-m-menu">
            <div className="m-menu-user">
              <div className="avatar" style={{ width: 44, height: 44, fontSize: 16 }}>{username.charAt(0)}</div>
              <div>
                <div style={{ fontFamily: "var(--font-serif-vn)", fontWeight: 700, fontSize: 16 }}>
                  {username}
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Đạo hữu · Trúc cơ kỳ</div>
              </div>
            </div>
            <a className={screen === "home" ? "active" : ""} onClick={() => navClick({ screen: "home" })}>
              <Icon name="sparkles" size={16} /> Đề cử
            </a>
            <a className={screen === "ranking" ? "active" : ""} onClick={() => navClick({ screen: "ranking" })}>
              <Icon name="trophy" size={16} /> Bảng Phong Vân
            </a>
            <a className={screen === "classify" ? "active" : ""} onClick={() => navClick({ screen: "classify" })}>
              <Icon name="book" size={16} /> Phân loại
            </a>
            <a className={screen === "library" ? "active" : ""} onClick={() => navClick({ screen: "library" })}>
              <Icon name="library" size={16} /> Tàng Kinh Các
            </a>
            <div className="tvc-m-menu-sep" />
            <a><Icon name="user" size={16} /> Đạo hiệu</a>
            <a><Icon name="settings" size={16} /> Tuỳ chỉnh</a>
          </nav>
        </>,
        document.body
      )}
    </>
  );
}
