"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, isAdmin } from "./auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { createNotification } from "./notifications";

const USER_SELECT = {
  id: true,
  name: true,
  lastName: true,
  email: true,
  role: true,
  isActive: true,
  image: true,
  birthDate: true,
  deletedAt: true,
  createdAt: true,
} as const;

export async function getUsersAction() {
  try {
    await getCurrentUser();
    if (!(await isAdmin())) return { error: "Sin permisos de administrador" };

    const users = await prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { createdAt: "desc" },
    });
    return users;
  } catch {
    return { error: "Error al obtener usuarios" };
  }
}

export async function createUserAction(data: {
  name: string;
  lastName?: string;
  email: string;
  password: string;
  role: "ADMIN" | "TRAFIKER" | "USER";
  birthDate?: string;
  image?: string;
}) {
  try {
    if (!(await isAdmin())) return { error: "Sin permisos de administrador" };

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return { error: "Ya existe un usuario con ese correo" };

    const hashed = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        lastName: data.lastName || null,
        email: data.email,
        password: hashed,
        role: data.role,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        image: data.image || null,
      },
      select: USER_SELECT,
    });
    revalidatePath("/users");
    return user;
  } catch {
    return { error: "Error al crear usuario" };
  }
}

export async function updateUserAction(
  userId: string,
  data: {
    name?: string;
    lastName?: string;
    email?: string;
    password?: string;
    role?: "ADMIN" | "TRAFIKER" | "USER";
    birthDate?: string;
    image?: string;
  }
) {
  try {
    const currentUserId = await getCurrentUser();
    if (!(await isAdmin())) return { error: "Sin permisos de administrador" };

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.lastName !== undefined) updateData.lastName = data.lastName || null;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) {
      if (userId === currentUserId) return { error: "No puedes cambiar tu propio rol" };
      updateData.role = data.role;
    }
    if (data.birthDate !== undefined) {
      updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null;
    }
    if (data.image !== undefined) updateData.image = data.image || null;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: USER_SELECT,
    });
    revalidatePath("/users");
    return user;
  } catch {
    return { error: "Error al actualizar usuario" };
  }
}

export async function updateUserRoleAction(userId: string, role: "ADMIN" | "TRAFIKER" | "USER") {
  try {
    const currentUserId = await getCurrentUser();
    if (!(await isAdmin())) return { error: "Sin permisos" };
    if (userId === currentUserId) return { error: "No puedes cambiar tu propio rol" };

    const before = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, role: true } });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: USER_SELECT,
    });

    if (before) {
      const executor = await prisma.user.findUnique({ where: { id: currentUserId }, select: { name: true } });
      createNotification({
        type: "ROLE_CHANGED",
        title: "Rol de usuario cambiado",
        body: `${executor?.name || "Admin"} cambió el rol de ${before.name} (${before.email}) de ${before.role} a ${role}.`,
      }).catch(() => {});
    }

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
      select: USER_SELECT,
    });
    revalidatePath("/users");
    return updated;
  } catch {
    return { error: "Error al cambiar estado del usuario" };
  }
}

export async function moveToTrashAction(userId: string) {
  try {
    const currentUserId = await getCurrentUser();
    if (!(await isAdmin())) return { error: "Sin permisos" };
    if (userId === currentUserId) return { error: "No puedes moverte a ti mismo a la papelera" };

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, id: true } });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
      select: USER_SELECT,
    });

    if (target) {
      const executor = await prisma.user.findUnique({ where: { id: currentUserId }, select: { name: true } });
      createNotification({
        type: "USER_TRASH",
        title: "Usuario movido a papelera",
        body: `${executor?.name || "Admin"} movió a ${target.name} (${target.email}) a la papelera.`,
      }).catch(() => {});
    }

    revalidatePath("/users");
    return updated;
  } catch {
    return { error: "Error al mover a papelera" };
  }
}

export async function restoreFromTrashAction(userId: string) {
  try {
    if (!(await isAdmin())) return { error: "Sin permisos" };

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null },
      select: USER_SELECT,
    });
    revalidatePath("/users");
    return updated;
  } catch {
    return { error: "Error al restaurar usuario" };
  }
}

export async function permanentDeleteAction(userId: string) {
  try {
    const currentUserId = await getCurrentUser();
    if (!(await isAdmin())) return { error: "Sin permisos" };
    if (userId === currentUserId) return { error: "No puedes eliminarte a ti mismo" };

    const target = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, id: true } });

    await prisma.user.delete({ where: { id: userId } });

    if (target) {
      const executor = await prisma.user.findUnique({ where: { id: currentUserId }, select: { name: true } });
      createNotification({
        type: "USER_DELETED",
        title: "Usuario eliminado permanentemente",
        body: `${executor?.name || "Admin"} eliminó de forma permanente a ${target.name} (${target.email}).`,
      }).catch(() => {});
    }

    revalidatePath("/users");
    return { success: true };
  } catch {
    return { error: "Error al eliminar usuario" };
  }
}

export async function deleteUserAction(userId: string) {
  return permanentDeleteAction(userId);
}

export async function getMyProfileAction() {
  try {
    const userId = await getCurrentUser();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, lastName: true, email: true, image: true },
    });
    return user ?? null;
  } catch {
    return null;
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
