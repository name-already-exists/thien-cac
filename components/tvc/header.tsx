"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Icon } from "./icons";

type Screen = "home" | "detail" | "reader" | "library";

type Props = {
  screen: Screen;
  onNav: (target: { screen: Screen }) => void;
  query: string;
  setQuery: (q: string) => void;
};

export function Header({ screen, onNav, query, setQuery }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const navClick = (target: { screen: Screen }) => {
    onNav(target);
    setMenuOpen(false);
  };

  return (
    <header className="tvc-header">
      <div className="tvc-container inner">
        {/* Mobile menu button */}
        <button
          className="tvc-icon-btn-header"
          aria-label="Menu"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ display: "none" }}
          data-mobile="true"
        >
          <Icon name={menuOpen ? "x" : "alignJustify"} size={20} />
        </button>

        <div className="logo" onClick={() => navClick({ screen: "home" })}>
          <Image src="/logo.svg" alt="Thiên Các" width={120} height={38} priority />
        </div>

        <nav className="nav" style={{ display: "flex" }}>
          <a
            className={screen === "home" ? "active" : ""}
            onClick={() => navClick({ screen: "home" })}
          >
            <Icon name="sparkles" size={14} /> Đề cử
          </a>
          <a><Icon name="trophy" size={14} /> Bảng Phong Vân</a>
          <a><Icon name="book" size={14} /> Phân loại</a>
          <a
            className={screen === "library" ? "active" : ""}
            onClick={() => navClick({ screen: "library" })}
          >
            <Icon name="library" size={14} /> Tàng Kinh Các
          </a>
        </nav>

        <div className="search-wrap" style={{ width: 320, position: "relative" }}>
          <Icon name="search" size={15} className="search-icon" />
          <input
            className="search"
            placeholder="Tìm truyện, tác giả, thể loại…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Mobile search button */}
        <button
          className="tvc-icon-btn-header"
          aria-label="Tìm kiếm"
          onClick={() => setSearchOpen(!searchOpen)}
          style={{ display: "none" }}
          data-mobile="true"
        >
          <Icon name="search" size={20} />
        </button>

        <div className="user">
          <div className="avatar">L</div>
          <span className="username">Lưu Bồng</span>
          <Icon name="chevronDown" size={14} />
        </div>
      </div>

      {/* Mobile search bar */}
      {searchOpen && (
        <div className="tvc-m-search-bar" style={{ display: "flex" }}>
          <div className="search-wrap" style={{ width: "100%", position: "relative" }}>
            <Icon name="search" size={15} className="search-icon" />
            <input
              className="search"
              placeholder="Tìm truyện, tác giả, thể loại…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div
            className="tvc-m-menu-backdrop"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="tvc-m-menu">
            <div className="m-menu-user">
              <div
                className="avatar"
                style={{ width: 44, height: 44, fontSize: 16 }}
              >
                L
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-serif-vn)",
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  Lưu Bồng
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-3)" }}>
                  Đạo hữu · Trúc cơ kỳ
                </div>
              </div>
            </div>
            <a
              className={screen === "home" ? "active" : ""}
              onClick={() => navClick({ screen: "home" })}
            >
              <Icon name="sparkles" size={16} /> Đề cử
            </a>
            <a>
              <Icon name="trophy" size={16} /> Bảng Phong Vân
            </a>
            <a>
              <Icon name="book" size={16} /> Phân loại
            </a>
            <a
              className={screen === "library" ? "active" : ""}
              onClick={() => navClick({ screen: "library" })}
            >
              <Icon name="library" size={16} /> Tàng Kinh Các
            </a>
            <div className="tvc-m-menu-sep" />
            <a>
              <Icon name="user" size={16} /> Đạo hiệu
            </a>
            <a>
              <Icon name="settings" size={16} /> Tuỳ chỉnh
            </a>
          </nav>
        </>
      )}
    </header>
  );
}
