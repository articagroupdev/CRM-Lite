"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "./auth";

export type NotificationType =
  | "USER_REGISTERED"
  | "USER_DELETED"
  | "USER_TRASH"
  | "ROLE_CHANGED"
  | "API_KEY_CHANGED";

export async function createNotification(data: {
  type: NotificationType;
  title: string;
  body: string;
}) {
  try {
    await prisma.notification.create({ data });
  } catch (err) {
    console.error("[Notification] failed to create:", err);
  }
}

export async function getNotificationsAction() {
  try {
    await getCurrentUser();
    if (!(await isAdmin())) return { error: "Sin permisos" };

    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return notifications;
  } catch {
    return { error: "Error al obtener notificaciones" };
  }
}

export async function getUnreadCountAction() {
  try {
    await getCurrentUser();
    if (!(await isAdmin())) return 0;
    return await prisma.notification.count({ where: { read: false } });
  } catch {
    return 0;
  }
}

export async function markAllReadAction() {
  try {
    await getCurrentUser();
    if (!(await isAdmin())) return { error: "Sin permisos" };
    await prisma.notification.updateMany({ where: { read: false }, data: { read: true } });
    return { success: true };
  } catch {
    return { error: "Error al marcar como leídas" };
  }
}

export async function markOneReadAction(id: string) {
  try {
    await getCurrentUser();
    if (!(await isAdmin())) return { error: "Sin permisos" };
    await prisma.notification.update({ where: { id }, data: { read: true } });
    return { success: true };
  } catch {
    return { error: "Error" };
  }
}

export async function deleteNotificationAction(id: string) {
  try {
    await getCurrentUser();
    if (!(await isAdmin())) return { error: "Sin permisos" };
    await prisma.notification.delete({ where: { id } });
    return { success: true };
  } catch {
    return { error: "Error" };
  }
}

export async function clearAllNotificationsAction() {
  try {
    await getCurrentUser();
    if (!(await isAdmin())) return { error: "Sin permisos" };
    await prisma.notification.deleteMany({});
    return { success: true };
  } catch {
    return { error: "Error" };
  }
}
