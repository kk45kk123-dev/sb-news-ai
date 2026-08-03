import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SB News AI",
  description: "저축은행 업계 관점 뉴스 해석 엔진",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
