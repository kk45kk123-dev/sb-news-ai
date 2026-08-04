import type { Media } from "@/lib/schemas/news.schema";

export const MEDIA_OUTLETS: Media[] = [
  { id: "m1", name: "한국경제", initial: "한경" },
  { id: "m2", name: "매일경제", initial: "매경" },
  { id: "m3", name: "연합인포맥스", initial: "연합" },
  { id: "m4", name: "이데일리", initial: "이데" },
  { id: "m5", name: "머니투데이", initial: "머투" },
  { id: "m6", name: "서울경제", initial: "서경" },
  { id: "m7", name: "파이낸셜뉴스", initial: "파뉴" },
  { id: "m8", name: "헤럴드경제", initial: "헤경" },
  { id: "m-external", name: "외부 링크", initial: "외부" },
  { id: "m-direct", name: "직접 등록", initial: "등록" },
];

export function getMediaById(id: string): Media | undefined {
  return MEDIA_OUTLETS.find((m) => m.id === id);
}
