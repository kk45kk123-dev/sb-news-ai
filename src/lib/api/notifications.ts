import { apiFetch } from "@/lib/api/http";
import { notificationListResponseSchema, type NotificationListResponse } from "@/lib/schemas/notification.schema";

/** 로그인한 일반 이용자용 알림함 — /api/v1/admin/notifications(관리자 전용)와는 별개 경로. */
export async function getNotifications(): Promise<NotificationListResponse> {
  const data = await apiFetch<unknown>("/api/v1/notifications");
  return notificationListResponseSchema.parse(data);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch("/api/v1/notifications", { method: "POST" });
}
