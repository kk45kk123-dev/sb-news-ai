import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { SplashScreen } from "@/components/layout/splash-screen";
import { env } from "@/config/env";
import { SITE_IS_PUBLIC } from "@/config/seo";

export const metadata: Metadata = {
  // 이전엔 실제 배포 도메인과 무관한 placeholder("sb-news-ai.example")였다 —
  // Open Graph 절대경로 이미지·canonical 링크 등이 전부 존재하지 않는 도메인을
  // 가리키고 있었다. 이미 필수 env로 검증되는 APP_BASE_URL을 그대로 쓴다.
  metadataBase: new URL(env.APP_BASE_URL),
  title: {
    default: "SB NEWS AI | 저축은행중앙회 AI 경제뉴스 플랫폼",
    template: "%s | SB NEWS AI",
  },
  description: "저축은행 산업 종사자를 위한 AI 기반 경제뉴스 큐레이션·해석 플랫폼",
  manifest: "/manifest.json",
  openGraph: {
    title: "SB NEWS AI",
    description: "저축은행 산업 종사자를 위한 AI 기반 경제뉴스 큐레이션·해석 플랫폼",
    type: "website",
    locale: "ko_KR",
  },
  robots: SITE_IS_PUBLIC ? { index: true, follow: true } : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link
          rel="stylesheet"
          as="style"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </head>
      <body className="font-sans antialiased">
        <SplashScreen />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
