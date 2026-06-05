"use client";

import { useState } from "react";
import type { Story } from "@/lib/data";
import { Header } from "@/components/tvc/header";
import { Home } from "@/components/tvc/home";
import { StoryDetail } from "@/components/tvc/story-detail";
import { Reader } from "@/components/tvc/reader";
import { Library } from "@/components/tvc/library";

type Screen = "home" | "detail" | "reader" | "library";

type AppState = {
  screen: Screen;
  story: Story | null;
  chapterNumber: number;
};

export default function Page() {
  const [state, setState] = useState<AppState>({
    screen: "home",
    story: null,
    chapterNumber: 1,
  });
  const [query, setQuery] = useState("");

  const nav = (patch: Partial<AppState>) =>
    setState((prev) => ({ ...prev, ...patch }));

  const goDetail = (s: Story) => nav({ screen: "detail", story: s });
  const goRead   = (s: Story, chapterNumber = 1) =>
    nav({ screen: "reader", story: s, chapterNumber });

  if (state.screen === "reader" && state.story) {
    return (
      <div className="tvc-app">
        <Reader
          story={state.story}
          chapterNumber={state.chapterNumber}
          onBack={() => nav({ screen: "detail" })}
          onDetail={goDetail}
        />
      </div>
    );
  }

  return (
    <div className="tvc-app">
      <Header
        screen={state.screen}
        onNav={(target) => nav({ screen: target.screen })}
        query={query}
        setQuery={setQuery}
      />

      <main style={{ flex: 1 }}>
        {state.screen === "home" && (
          <Home onPick={goDetail} onRead={goRead} />
        )}
        {state.screen === "detail" && state.story && (
          <StoryDetail
            story={state.story}
            onRead={goRead}
            onBack={() => nav({ screen: "home" })}
          />
        )}
        {state.screen === "library" && (
          <Library onPick={goDetail} onRead={goRead} />
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
