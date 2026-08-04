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
  { id: "base-rate", label: "기준금리", value: "3.25%", change: 0, changeLabel: "동결", trend: [3.5, 3.5, 3.25, 3.25, 3.25, 3.25, 3.25] },
];

export interface EconomicEvent {
  id: string;
  date: string;
  time: string;
  title: string;
  importance: "high" | "medium" | "low";
}

export const ECONOMIC_CALENDAR: EconomicEvent[] = [
  { id: "e1", date: "08.05", time: "09:00", title: "한국 8월 소비자물가 발표", importance: "high" },
  { id: "e2", date: "08.06", time: "22:30", title: "미국 8월 고용지표 발표", importance: "high" },
  { id: "e3", date: "08.08", time: "10:00", title: "금융통화위원회 의사록 공개", importance: "medium" },
  { id: "e4", date: "08.11", time: "08:00", title: "저축은행 2분기 경영실적 잠정 공시", importance: "medium" },
  { id: "e5", date: "08.13", time: "21:30", title: "미국 8월 소비자물가지수(CPI) 발표", importance: "high" },
];
