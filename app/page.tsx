"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Story } from "@/lib/data";
import { Header } from "@/components/tvc/header";
import { Home } from "@/components/tvc/home";
import { Library } from "@/components/tvc/library";

type Screen = "home" | "library";

export default function Page() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("home");
  const [query, setQuery] = useState("");

  const goDetail = (s: Story) => router.push(`/${s.id}`);
  const goRead = (s: Story, num = 1) => router.push(`/${s.id}/chuong-${num}`);

  return (
    <div className="tvc-app">
      <Header
        screen={screen}
        onNav={(target) => {
          if (target.screen === "home") setScreen("home");
          else if (target.screen === "library") setScreen("library");
        }}
        query={query}
        setQuery={setQuery}
      />

      <main style={{ flex: 1 }}>
        {screen === "home" && <Home onPick={goDetail} onRead={goRead} />}
        {screen === "library" && <Library onPick={goDetail} onRead={goRead} />}
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
