"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";

export async function updateProfileFullAction(data: {
  name?: string;
  lastName?: string;
  email?: string;
  image?: string;
}) {
  try {
    const userId = await getCurrentUser();

    // If email is changing, check it's not taken by another user
    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: { email: data.email.trim().toLowerCase(), NOT: { id: userId } },
      });
      if (existing) return { error: "Ese correo ya está en uso por otra cuenta" };
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.lastName !== undefined && { lastName: data.lastName || null }),
        ...(data.email !== undefined && { email: data.email.trim().toLowerCase() }),
        ...(data.image !== undefined && { image: data.image }),
      },
      select: { id: true, name: true, lastName: true, email: true, image: true },
    });

    return updated;
  } catch {
    return { error: "Error al actualizar el perfil" };
  }
}
