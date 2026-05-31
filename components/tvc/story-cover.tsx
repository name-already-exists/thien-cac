import React from "react";
import type { Story } from "@/lib/data";

type Size = "sm" | "md" | "lg";

type Props = {
  story: Story;
  size?: Size;
  onClick?: () => void;
  style?: React.CSSProperties;
};

export function StoryCover({ story, size = "md", onClick, style }: Props) {
  const [c1, c2] = story.palette;
  return (
    <div
      className={`tvc-cover tvc-cover-${size}`}
      onClick={onClick}
      style={{ background: `linear-gradient(155deg, ${c1} 0%, ${c2} 100%)`, ...style }}
    >
      <div className="han-bg">{story.hanShort || story.han}</div>
      <div className="name">{story.title}</div>
      <div className="seal" style={{ background: story.sealColor }}>天</div>
    </div>
  );
}
