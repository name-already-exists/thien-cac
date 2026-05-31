"use client";

import { useState } from "react";
import { STORIES, type Story } from "@/lib/data";
import { Header } from "@/components/tvc/header";
import { Home } from "@/components/tvc/home";
import { StoryDetail } from "@/components/tvc/story-detail";
import { Reader } from "@/components/tvc/reader";
import { Library } from "@/components/tvc/library";

type Screen = "home" | "detail" | "reader" | "library";

type AppState = {
  screen: Screen;
  storyId: string | null;
};

export default function Page() {
  const [state, setState] = useState<AppState>({ screen: "home", storyId: null });
  const [query, setQuery] = useState("");

  const story = state.storyId
    ? (STORIES.find((s) => s.id === state.storyId) ?? STORIES[0])
    : STORIES[0];

  const nav = (target: { screen: Screen; storyId?: string | null }) => {
    setState((prev) => ({ ...prev, ...target }));
  };

  const goDetail = (s: Story) => nav({ screen: "detail", storyId: s.id });
  const goRead = (s: Story) => nav({ screen: "reader", storyId: s.id });

  if (state.screen === "reader") {
    return (
      <div className="tvc-app">
        <Reader
          story={story}
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
        {state.screen === "detail" && (
          <StoryDetail
            story={story}
            onRead={goRead}
            onBack={() => nav({ screen: "home" })}
          />
        )}
        {state.screen === "library" && (
          <Library onPick={goDetail} onRead={goRead} />
        )}
      </main>

      <footer className="tvc-footer">
        <div
          className="tvc-divider-orn"
          style={{ margin: "0 auto 16px" }}
        >
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
