/** "2시간 전" 형태의 상대 시간 표시 (뉴스 목록 카드용). */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffSeconds < 60) return "방금 전";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(diffSeconds / 3600);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(diffSeconds / 86400);
  return `${days}일 전`;
}
