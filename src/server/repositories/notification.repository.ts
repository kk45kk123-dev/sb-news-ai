import { prisma } from "@/server/db/client";
import type { Notification } from "@prisma/client";

const LIST_LIMIT_DEFAULT = 20;

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    },
  });
}

/** 여러 수신자(예: org의 관리자 전원)에게 같은 알림을 뿌린다. */
export async function createNotificationForUsers(
  userIds: string[],
  input: Omit<CreateNotificationInput, "userId">
): Promise<void> {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({ userId, ...input })),
  });
}

export async function listNotifications(userId: string, limit = LIST_LIMIT_DEFAULT): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
