"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");
  return (session.user as any).id as string;
}

export async function getCurrentUserRole(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("No autenticado");
  return (session.user as any).role ?? "USER";
}

export async function isAdmin(): Promise<boolean> {
  try {
    const role = await getCurrentUserRole();
    return role === "ADMIN";
  } catch {
    return false;
  }
}
