"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import type { Story } from "@/lib/data";
import { fetchAllStories } from "@/lib/db";
import { StoryCover } from "./story-cover";
import { Icon } from "./icons";

type Props = {
  onPick: (s: Story) => void;
  onRead: (s: Story, chapterNumber?: number) => void;
};

type Tab = "reading" | "saved" | "history" | "finished";

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: 12, padding: "64px 32px", textAlign: "center", boxShadow: "var(--shadow-sm)" }}>
      <Image src="/seal.svg" alt="" width={64} height={64} style={{ opacity: 0.35, marginBottom: 16 }} />
      <div style={{ fontFamily: "var(--font-serif-vn)", fontSize: 18, fontWeight: 600, color: "var(--fg-2)", marginBottom: 6 }}>
        Mục này chưa có gì
      </div>
      <div style={{ fontSize: 13, color: "var(--fg-3)" }}>{message}</div>
    </div>
  );
}

export function Library({ onPick, onRead }: Props) {
  const [tab, setTab] = useState<Tab>("reading");
  const [stories, setStories] = useState<Story[]>([]);

  useEffect(() => {
    fetchAllStories().then(setStories);
  }, []);

  const tabs: { id: Tab; label: string }[] = [
    { id: "reading",  label: "Đang đọc"     },
    { id: "saved",    label: "Đã đánh dấu"  },
    { id: "history",  label: "Lịch sử"      },
    { id: "finished", label: "Đã hoàn thành" },
  ];

  return (
    <div className="tvc-container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginBottom: 8 }}>
        <h1 style={{ fontFamily: "var(--font-serif-vn)", fontSize: 36, fontWeight: 700, margin: 0, color: "var(--fg-ink)" }}>
          Tàng Kinh Các
        </h1>
        <span style={{ fontFamily: "var(--font-serif-han)", fontSize: 16, color: "var(--fg-3)", letterSpacing: ".3em" }}>
          藏 經 閣
        </span>
      </div>
      <p style={{ color: "var(--fg-2)", fontSize: 14, margin: "0 0 28px" }}>
        Tủ truyện của đạo hữu — nơi cất giữ những quyển đáng đọc.
      </p>

      <div className="tvc-library-tabs">
        {tabs.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "reading" && (
        <EmptyState message="Đăng nhập để xem lịch sử đọc của đạo hữu." />
      )}

      {tab === "saved" && (
        <div className="tvc-cover-grid">
          {stories.map((s) => (
            <div className="tvc-cover-card" key={s.id} onClick={() => onPick(s)}>
              <StoryCover story={s} size="md" />
              <div className="ti">{s.title}</div>
              <div className="au">{s.author}</div>
            </div>
          ))}
        </div>
      )}

      {(tab === "history" || tab === "finished") && (
        <EmptyState message="Tiếp tục khám phá Bảng Phong Vân để tìm quyển hợp ý đạo hữu." />
      )}
    </div>
  );
}
