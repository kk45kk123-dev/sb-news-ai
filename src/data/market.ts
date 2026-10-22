export interface MarketIndicator {
  id: string;
  label: string;
  value: string;
  change: number;
  changeLabel: string;
  trend: number[];
}

export const MARKET_INDICATORS: MarketIndicator[] = [
  { id: "kospi", label: "코스피", value: "2,912.54", change: 0.42, changeLabel: "+12.3", trend: [2860, 2871, 2865, 2888, 2895, 2903, 2912] },
  { id: "kosdaq", label: "코스닥", value: "845.12", change: -0.18, changeLabel: "-1.5", trend: [850, 848, 852, 846, 849, 847, 845] },
  { id: "usdkrw", label: "원/달러", value: "1,362.40", change: 0.11, changeLabel: "+1.5", trend: [1355, 1358, 1360, 1357, 1361, 1359, 1362] },
  { id: "base-rate", label: "기준금리", value: "2.75%", change: 0, changeLabel: "동결", trend: [3.0, 2.75, 2.75, 2.75, 2.75, 2.75, 2.75] },
];

// 경제 일정(ECONOMIC_CALENDAR)은 2026-10월에 DB(EconomicEvent 모델)로 옮겼다 — 날짜가
// 지난 뒤에도 화면에 고정 배열이 그대로 남아있던 문제 때문. 이제 관리자 화면
// (/admin/economic-events)에서 등록하고, daily pipeline이 2주 이상 안 갱신되면
// 알림으로 알려준다. src/server/services/economic-event.service.ts 참고.
