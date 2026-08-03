const DIRECTION_META: Record<string, { label: string; icon: string; className: string }> = {
  positive: { label: "긍정적", icon: "▲", className: "text-success" },
  negative: { label: "부정적", icon: "▼", className: "text-danger" },
  neutral: { label: "중립", icon: "●", className: "text-neutral" },
  mixed: { label: "복합적", icon: "◆", className: "text-warning" },
};

// Tailwind는 클래스명을 정적으로 스캔하므로 `bg-impact-${score}` 같은 동적 조합은 인식하지
// 못한다. 가능한 값을 전부 리터럴로 나열한다.
const DOT_FILL_CLASS: Record<number, string> = {
  1: "bg-impact-1",
  2: "bg-impact-2",
  3: "bg-impact-3",
  4: "bg-impact-4",
  5: "bg-impact-5",
};

export interface ImpactMeterProps {
  score: number; // 1-5
  direction: string;
  size?: "sm" | "md";
}

/**
 * 색상만으로 정보를 전달하지 않는다 (§11.2, §12.4 접근성 요구사항) — 점 개수/숫자/방향
 * 텍스트+아이콘을 항상 함께 표시한다.
 */
export function ImpactMeter({ score, direction, size = "md" }: ImpactMeterProps) {
  const meta = DIRECTION_META[direction] ?? DIRECTION_META.neutral!;
  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const fillClass = DOT_FILL_CLASS[score] ?? DOT_FILL_CLASS[1];

  return (
    <div
      className={`flex items-center gap-1.5 ${textSize}`}
      role="img"
      aria-label={`저축은행 영향도 ${score}점, ${meta.label}`}
    >
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`${dotSize} rounded-full ${n <= score ? fillClass : "bg-border"}`}
          />
        ))}
      </div>
      <span className="font-medium text-text">{score}/5</span>
      <span className={`flex items-center gap-0.5 ${meta.className}`}>
        <span aria-hidden>{meta.icon}</span>
        {meta.label}
      </span>
    </div>
  );
}
