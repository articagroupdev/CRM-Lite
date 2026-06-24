"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getServiceIncidentsAction(service?: string, limit = 50) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { incidents: [] };

  const incidents = await prisma.serviceIncident.findMany({
    where: service ? { service } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return { incidents };
}

export async function resolveIncidentAction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "No autorizado" };

  await prisma.serviceIncident.update({
    where: { id },
    data: { resolvedAt: new Date() },
  });

  return { success: true };
}
