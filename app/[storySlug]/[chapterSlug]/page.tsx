"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Story } from "@/lib/data";
import { fetchStoryBySlug, fetchChapterContent } from "@/lib/db";
import { parseChapterNum, chapterSlug } from "@/lib/slugify";
import { saveReadingProgress } from "@/lib/reading-history";
import { Reader } from "@/components/tvc/reader";

type PageData = {
  story: Story;
  initialChapter: { title: string; content: string } | null;
};

export default function ChapterPage() {
  const { storySlug, chapterSlug: chSlug } = useParams<{
    storySlug: string;
    chapterSlug: string;
  }>();
  const router = useRouter();
  const [pageData, setPageData] = useState<PageData | null>(null);

  const chapterNum = parseChapterNum(chSlug);

  useEffect(() => {
    let cancelled = false;
    const initChNum = chapterNum;
    (async () => {
      const story = await fetchStoryBySlug(storySlug);
      if (!story || cancelled) return;
      const chData = await fetchChapterContent(story.dbId, initChNum);
if (cancelled) return;
      setPageData({
        story,
        initialChapter: chData ? { title: chData.title, content: chData.content } : null,
      });
    })();
    return () => { cancelled = true; };
  }, [storySlug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pageData) {
    return (
      <div className="tvc-app" style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ color: "var(--fg-3)", fontSize: 15 }}>Đang tải…</div>
      </div>
    );
  }

  return (
    <div className="tvc-app">
      <Reader
        story={pageData.story}
        chapterNumber={chapterNum}
        initialChapterData={pageData.initialChapter}
        onBack={() => router.push(`/${storySlug}`)}
        onDetail={(s) => router.push(`/${s.id}`)}
        onChapterLoad={(num, title) => {
          saveReadingProgress(pageData.story.id, num);
          window.history.replaceState(null, '', `/${storySlug}/${chapterSlug(num, title)}`);
        }}
      />
    </div>
  );
}
