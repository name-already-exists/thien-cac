"use client";

import React from "react";
import { CHAPTERS, type Story } from "@/lib/data";
import { StoryCover } from "./story-cover";
import { Icon } from "./icons";

function Comment({
  author,
  time,
  text,
}: {
  author: string;
  time: string;
  text: string;
}) {
  return (
    <div className="tvc-comment">
      <div className="avatar-lg">{author[0]}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--fg-1)" }}>
            {author}
          </span>
          <span style={{ fontSize: 12, color: "var(--fg-3)" }}>· {time}</span>
        </div>
        <div
          style={{
            fontSize: 14,
            color: "var(--fg-1)",
            marginTop: 4,
            lineHeight: 1.55,
          }}
        >
          {text}
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 8,
            color: "var(--fg-3)",
            fontSize: 12,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
            }}
          >
            <Icon name="heart" size={13} /> 24
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              cursor: "pointer",
            }}
          >
            <Icon name="messageCircle" size={13} /> Trả lời
          </span>
        </div>
      </div>
    </div>
  );
}

type Props = {
  story: Story;
  onRead: (s: Story) => void;
  onBack: () => void;
};

export function StoryDetail({ story, onRead }: Props) {
  const [c1, c2] = story.palette;

  return (
    <div>
      <section className="tvc-detail-hero">
        <div
          className="tvc-detail-hero-bg"
          style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
        />
        <div className="tvc-detail-hero-overlay" />
        <div className="tvc-container tvc-detail-hero-inner">
          <StoryCover story={story} size="lg" />
          <div className="tvc-detail-info">
            <div
              className="tvc-eyebrow"
              style={{ color: "var(--brand-primary)" }}
            >
              {story.genre}
            </div>
            <h1>{story.title}</h1>
            <div className="han-sub">{story.han.split("").join(" ")}</div>
            <div className="meta-row">
              <span>
                Tác giả ·{" "}
                <strong style={{ color: "var(--fg-1)" }}>{story.author}</strong>
              </span>
              <span style={{ color: "var(--border-3)" }}>·</span>
              <span>Chuyển ngữ · {story.translator}</span>
              <span style={{ color: "var(--border-3)" }}>·</span>
              <span
                className={`tvc-badge ${story.status === "ongoing" ? "tvc-b-ongoing" : "tvc-b-completed"}`}
              >
                <span
                  className="dot"
                  style={{
                    background:
                      story.status === "ongoing" ? "#4A7C59" : "#4A6FA5",
                  }}
                />
                {story.status === "ongoing" ? "Đang ra" : "Hoàn thành"}
              </span>
            </div>
            <div
              style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 14 }}
            >
              {story.tags.map((t) => (
                <span key={t} className="tvc-tag">
                  {t}
                </span>
              ))}
            </div>
            <div className="stats">
              <div className="stat">
                <div className="val">
                  {story.rating}
                  <span style={{ color: "var(--brand-gold)", marginLeft: 4 }}>
                    ★
                  </span>
                </div>
                <div className="lbl">Đánh giá</div>
              </div>
              <div className="stat">
                <div className="val">
                  {story.chapters.toLocaleString("vi-VN")}
                </div>
                <div className="lbl">Chương</div>
              </div>
              <div className="stat">
                <div className="val">{story.words}</div>
                <div className="lbl">Chữ</div>
              </div>
              <div className="stat">
                <div className="val">{story.readers}</div>
                <div className="lbl">Lượt đọc</div>
              </div>
              <div className="stat">
                <div className="val">{story.reviews}</div>
                <div className="lbl">Bình luận</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 22 }}>
              <button
                className="tvc-btn tvc-btn-primary tvc-btn-lg"
                onClick={() => onRead(story)}
              >
                <Icon name="bookOpen" size={16} /> Đọc từ đầu
              </button>
              <button className="tvc-btn tvc-btn-secondary tvc-btn-lg">
                <Icon name="bookmark" size={16} /> Thêm vào tủ
              </button>
              <button className="tvc-btn tvc-btn-ghost tvc-btn-lg">
                <Icon name="heart" size={16} /> 4.2K
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="tvc-container tvc-detail-body">
        <div>
          <h3
            style={{
              fontFamily: "var(--font-serif-vn)",
              fontSize: 20,
              fontWeight: 700,
              margin: "0 0 16px",
            }}
          >
            Giới thiệu{" "}
            <span
              style={{
                fontFamily: "var(--font-serif-han)",
                fontSize: 14,
                color: "var(--fg-3)",
                marginLeft: 8,
              }}
            >
              簡介
            </span>
          </h3>
          <div className="tvc-detail-desc">{story.desc}</div>

          <div style={{ marginTop: 40 }}>
            <h3
              style={{
                fontFamily: "var(--font-serif-vn)",
                fontSize: 20,
                fontWeight: 700,
                margin: "0 0 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span>Bình luận</span>
              <span
                style={{
                  fontFamily: "var(--font-serif-han)",
                  fontSize: 14,
                  color: "var(--fg-3)",
                }}
              >
                評論
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 13,
                  fontWeight: 400,
                  color: "var(--fg-3)",
                }}
              >
                {story.reviews} bình luận
              </span>
            </h3>
            <Comment
              author="Vô Danh đạo nhân"
              time="2 giờ trước"
              text="Đọc lại lần thứ 3 vẫn không chán. Vong Ngữ tả cảnh đan đỉnh thật sự không có người thứ hai. Cẩn thận, kiên nhẫn — đó chính là tu tiên đích thực."
            />
            <Comment
              author="Hàn Mộc Tử"
              time="6 giờ trước"
              text="Ai đang đọc lần đầu thì kiên nhẫn. Mạch truyện chậm, nhưng càng đi sâu càng cuốn. Chương 200 trở đi mới bắt đầu vào mạch chính."
            />
            <Comment
              author="Tiểu Thanh Niên"
              time="Hôm qua"
              text="Hàn Lập là main bá kiểu chậm rãi nhất mình từng đọc. Không drama, không thiên mệnh, chỉ có thực lực và may mắn cộng dồn."
            />
          </div>
        </div>

        <aside>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-serif-vn)",
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Danh sách chương
            </h3>
            <span
              style={{ marginLeft: "auto", fontSize: 12, color: "var(--fg-3)" }}
            >
              {story.chapters.toLocaleString("vi-VN")} chương
            </span>
          </div>
          <div className="tvc-chapter-list">
            {CHAPTERS.map((ch) => (
              <div
                className={`row ${ch.read ? "read" : ""}`}
                key={ch.num}
                onClick={() => onRead(story)}
              >
                <span className="num">{String(ch.num).padStart(3, "0")}</span>
                <span className="name">{ch.name}</span>
                <span className="date">{ch.date}</span>
              </div>
            ))}
          </div>
          <button
            className="tvc-btn tvc-btn-ghost"
            style={{ width: "100%", marginTop: 12, justifyContent: "center" }}
          >
            Xem đầy đủ <Icon name="chevronRight" size={14} />
          </button>
        </aside>
      </div>
    </div>
  );
}
