"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Story } from "@/lib/data";
import { fetchStoryBySlug } from "@/lib/db";
import { StoryDetail } from "@/components/tvc/story-detail";
import { Header } from "@/components/tvc/header";

export default function StoryPage() {
  const { storySlug } = useParams<{ storySlug: string }>();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchStoryBySlug(storySlug).then((s) => {
      setStory(s);
      setLoading(false);
    });
  }, [storySlug]);

  return (
    <div className="tvc-app">
      <Header
        screen="detail"
        onNav={(target) => {
          if (target.screen === "library") router.push("/?screen=library");
          else router.push("/");
        }}
        query=""
        setQuery={() => {}}
        onSearchPick={(s) => router.push(`/${s.id}`)}
      />

      <main style={{ flex: 1 }}>
        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 15 }}>
            Đang tải…
          </div>
        ) : !story ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "var(--fg-3)", fontSize: 15 }}>
            Không tìm thấy truyện.
          </div>
        ) : (
          <StoryDetail
            story={story}
            onRead={(s, num) => router.push(`/${s.id}/chuong-${num ?? 1}`)}
            onBack={() => router.push("/")}
          />
        )}
      </main>

      <footer className="tvc-footer">
        <div className="tvc-divider-orn" style={{ margin: "0 auto 16px" }}>
          <div className="line" />
          <div className="dot" />
          <div className="diamond" />
          <div className="dot" />
          <div className="line" />
        </div>
        <div
          style={{
            fontFamily: "var(--font-serif-han)",
            letterSpacing: ".5em",
            color: "var(--fg-2)",
            marginBottom: 4,
          }}
        >
          天 閣
        </div>
        <div>Thiên Các · Nơi vạn quyển hội tụ</div>
      </footer>
    </div>
  );
}
