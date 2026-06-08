"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Story } from "@/lib/data";
import { fetchStoryBySlug } from "@/lib/db";
import { parseChapterNum, chapterSlug } from "@/lib/slugify";
import { Reader } from "@/components/tvc/reader";

export default function ChapterPage() {
  const { storySlug, chapterSlug: chSlug } = useParams<{
    storySlug: string;
    chapterSlug: string;
  }>();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);

  const chapterNum = parseChapterNum(chSlug);

  useEffect(() => {
    fetchStoryBySlug(storySlug).then(setStory);
  }, [storySlug]);

  if (!story) {
    return (
      <div className="tvc-app" style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ color: "var(--fg-3)", fontSize: 15 }}>Đang tải…</div>
      </div>
    );
  }

  return (
    <div className="tvc-app">
      <Reader
        story={story}
        chapterNumber={chapterNum}
        onBack={() => router.push(`/${storySlug}`)}
        onDetail={(s) => router.push(`/${s.id}`)}
        onChapterNav={(num) => router.replace(`/${storySlug}/chuong-${num}`)}
        onChapterLoad={(num, title) =>
          router.replace(`/${storySlug}/${chapterSlug(num, title)}`)
        }
      />
    </div>
  );
}
