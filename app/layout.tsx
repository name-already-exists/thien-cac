import type { Metadata } from "next";
import { Be_Vietnam_Pro, Noto_Serif, Noto_Serif_SC, Ma_Shan_Zheng, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "600", "700"],
});

const notoSerifSC = Noto_Serif_SC({
  variable: "--font-noto-serif-sc",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const maShanZheng = Ma_Shan_Zheng({
  variable: "--font-ma-shan-zheng",
  subsets: ["latin"],
  weight: ["400"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Thiên Các · 天閣",
  description: "Nơi vạn quyển hội tụ — Đọc truyện tiên hiệp, kiếm hiệp, huyền ảo.",
  icons: {
    icon: "/seal.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${notoSerif.variable} ${notoSerifSC.variable} ${maShanZheng.variable} ${jetbrainsMono.variable} h-full antialiased`}
      style={{
        "--font-sans-tvc": "var(--font-be-vietnam-pro), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        "--font-serif-vn": "var(--font-noto-serif), Georgia, serif",
        "--font-serif-han": "var(--font-noto-serif-sc), var(--font-noto-serif), serif",
        "--font-display-han": "var(--font-ma-shan-zheng), cursive",
        "--font-reader": "var(--font-noto-serif), Georgia, serif",
        "--font-mono-tvc": "var(--font-jetbrains-mono), 'SF Mono', Menlo, monospace",
      } as React.CSSProperties}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
