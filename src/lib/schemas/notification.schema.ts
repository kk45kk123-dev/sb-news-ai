import { z } from "zod";

// admin.schema.ts의 notificationSchema와 모양이 같다 — 같은 notifications 테이블을 관리자
// 알림함과 일반 이용자 알림함(F-08 키워드 워치) 양쪽에서 쓰기 때문이다. 의미상 "admin"
// 전용 파일에서 site 코드가 import하는 걸 피하려고 별도 파일로 둔다.
export const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  link: z.string().nullable(),
  isRead: z.boolean(),
  createdAt: z.string(),
});
export type Notification = z.infer<typeof notificationSchema>;

export const notificationListResponseSchema = z.object({
  items: z.array(notificationSchema),
  unreadCount: z.number().int(),
});
export type NotificationListResponse = z.infer<typeof notificationListResponseSchema>;
