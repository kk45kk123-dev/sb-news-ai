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

export interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  importance: "high" | "medium" | "low";
}

// 2026-08-11 기준 확인된 실제 일정으로 채운 값이다 — 외부에 무료 실시간 캘린더 API가
// 없어(유료 서비스만 존재) 시장 지표처럼 자동 갱신은 못 하고, 주기적으로 직접 갱신해야
// 최신 상태가 유지된다(지난 일정은 지우고 새로 다가오는 일정을 채운다). 각 항목의 근거:
// - 8월 금통위: 한국은행이 확정 발표한 2026년 정기회의 일정(8/27)
// - 저축은행 반기 경영공시: 저축은행법 감독규정상 결산일로부터 2개월 이내 공시 의무 (6월
//   결산 → 8/30 마감)
// - 미국 8월 고용지표(비농업고용지표): BLS 발표 일정(9/4 08:30 ET)
// - 미국 8월 CPI: BLS 발표 일정(9/11 08:30 ET)
// - FOMC 9월 회의: 연준이 확정한 2026년 회의 일정(9/15~16, 결과는 현지 9/16 14:00 ET
//   발표 — 한국시간으로는 다음날 새벽)
export const ECONOMIC_CALENDAR: EconomicEvent[] = [
  { id: "e1", date: "08.27", time: "09:00", title: "한국은행 금융통화위원회 통화정책방향 결정회의", importance: "high" },
  { id: "e2", date: "08.30", time: "-", title: "저축은행 2026년 반기 경영공시 마감", importance: "medium" },
  { id: "e3", date: "09.04", time: "21:30", title: "미국 8월 비농업고용지표 발표", importance: "high" },
  { id: "e4", date: "09.11", time: "21:30", title: "미국 8월 소비자물가지수(CPI) 발표", importance: "high" },
  { id: "e5", date: "09.17", time: "03:00", title: "FOMC 9월 회의 결과 발표 (현지 9/16)", importance: "high" },
];
