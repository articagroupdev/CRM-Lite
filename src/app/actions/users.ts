"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "./auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function getUsersAction() {
  try {
    await getCurrentUser();
    const admin = await isAdmin();
    if (!admin) return { error: "Sin permisos de administrador" };

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true, image: true },
      orderBy: { createdAt: "desc" },
    });
    return users;
  } catch (error) {
    return { error: "Error al obtener usuarios" };
  }
}

export async function updateUserRoleAction(userId: string, role: "ADMIN" | "USER") {
  try {
    const currentUserId = await getCurrentUser();
    if (!(await isAdmin())) return { error: "Sin permisos" };
    if (userId === currentUserId) return { error: "No puedes cambiar tu propio rol" };

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    revalidatePath("/users");
    return user;
  } catch {
    return { error: "Error al actualizar rol" };
  }
}

export async function toggleUserStatusAction(userId: string) {
  try {
    const currentUserId = await getCurrentUser();
    if (!(await isAdmin())) return { error: "Sin permisos" };
    if (userId === currentUserId) return { error: "No puedes desactivarte a ti mismo" };

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { error: "Usuario no encontrado" };

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: { id: true, isActive: true },
    });
    revalidatePath("/users");
    return updated;
  } catch {
    return { error: "Error al cambiar estado del usuario" };
  }
}

export async function deleteUserAction(userId: string) {
  try {
    const currentUserId = await getCurrentUser();
    if (!(await isAdmin())) return { error: "Sin permisos" };
    if (userId === currentUserId) return { error: "No puedes eliminarte a ti mismo" };

    await prisma.user.delete({ where: { id: userId } });
    revalidatePath("/users");
    return { success: true };
  } catch {
    return { error: "Error al eliminar usuario" };
  }
}

export async function updateProfileAction(data: { name?: string; image?: string }) {
  try {
    const userId = await getCurrentUser();
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, name: true, email: true, image: true },
    });
    return user;
  } catch {
    return { error: "Error al actualizar perfil" };
  }
}

export async function changePasswordAction(currentPassword: string, newPassword: string) {
  try {
    const userId = await getCurrentUser();
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.password) return { error: "Usuario sin contraseña" };

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return { error: "Contraseña actual incorrecta" };

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
    return { success: true };
  } catch {
    return { error: "Error al cambiar contraseña" };
  }
}
