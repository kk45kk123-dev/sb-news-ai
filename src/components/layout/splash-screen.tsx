"use client";

import { useEffect, useState } from "react";

type Stage = "visible" | "fading" | "hidden";

const HOLD_MS = 700;
const TRANSITION_MS = 450;

/**
 * 첫 진입 시 메인 화면 위로 로고를 즉시 덮어 보여주다가 페이드아웃되며 실제 화면을
 * 드러내는 스플래시 효과. 기본 상태를 "visible"로 서버 렌더링해야 하이드레이션이
 * 끝나기 전(특히 dev 모드 첫 컴파일 지연 중)에도 스켈레톤 화면이 먼저 노출되는
 * 대신 로고가 즉시 화면을 덮는다 — fade-out만 클라이언트 타이머로 트리거한다.
 */
export function SplashScreen() {
  const [stage, setStage] = useState<Stage>("visible");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage("hidden");
      return;
    }

    document.body.style.overflow = "hidden";
    const fadeTimer = setTimeout(() => setStage("fading"), HOLD_MS);
    const hideTimer = setTimeout(() => {
      setStage("hidden");
      document.body.style.overflow = "";
    }, HOLD_MS + TRANSITION_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
      document.body.style.overflow = "";
    };
  }, []);

  if (stage === "hidden") return null;

  const fading = stage === "fading";

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-background transition-opacity duration-[450ms] ease-out ${
        fading ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <img
        src="/icon-512.png"
        alt=""
        className={`h-44 w-44 rounded-3xl shadow-popover transition-transform duration-[450ms] ease-out sm:h-64 sm:w-64 ${
          fading ? "scale-110" : "scale-100"
        }`}
      />
    </div>
  );
}
