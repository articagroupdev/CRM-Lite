"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 40;

const noteSelect = {
  id: true, title: true, content: true, color: true,
  pinned: true, folderId: true, attachments: true, createdAt: true, updatedAt: true,
  user: { select: { name: true, image: true } },
};

const trashNoteSelect = {
  ...noteSelect,
  deletedAt: true,
};

// ── Notes ──────────────────────────────────────────────────────────────────

export async function getNotesAction(opts?: {
  folderId?: string | null;
  page?: number;
  search?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { notes: [], total: 0 };

  const page = Math.max(1, opts?.page ?? 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where = {
    deletedAt: null as null,
    ...(opts?.folderId !== undefined ? { folderId: opts.folderId } : {}),
    ...(opts?.search
      ? { OR: [
          { title:   { contains: opts.search, mode: "insensitive" as const } },
          { content: { contains: opts.search, mode: "insensitive" as const } },
        ] }
      : {}),
  };

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
      select: noteSelect,
      skip,
      take: PAGE_SIZE,
    }),
    prisma.note.count({ where }),
  ]);

  return { notes, total };
}

export async function getTrashNotesAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];
  return prisma.note.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    select: trashNoteSelect,
  });
}

export async function createNoteAction(folderId?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.note.create({
    data: {
      userId: session.user.id,
      title: "",
      content: "",
      ...(folderId ? { folderId } : {}),
    },
    select: noteSelect,
  });
}

export async function updateNoteAction(
  id: string,
  data: { title?: string; content?: string; pinned?: boolean; color?: string | null; folderId?: string | null; attachments?: object[] }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.note.update({
    where: { id },
    data: { ...data, updatedAt: new Date() },
    select: noteSelect,
  });
}

export async function trashNoteAction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.note.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function restoreNoteAction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.note.update({
    where: { id },
    data: { deletedAt: null },
  });
}

export async function permanentDeleteNoteAction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.note.delete({ where: { id } });
}

export async function emptyTrashAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.note.deleteMany({ where: { deletedAt: { not: null } } });
}

// ── Folders ────────────────────────────────────────────────────────────────

const makeFolderSelect = (userId: string) => ({
  id: true, name: true, color: true,
  _count: {
    select: {
      notes: { where: { deletedAt: null as null, userId } },
    },
  },
});

export async function getNoteFoldersAction() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return [];
  return prisma.noteFolder.findMany({
    where: { createdById: session.user.id },
    orderBy: { name: "asc" },
    select: makeFolderSelect(session.user.id),
  });
}

export async function createNoteFolderAction(data: { name: string; color?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.noteFolder.create({
    data: { ...data, createdById: session.user.id },
    select: makeFolderSelect(session.user.id),
  });
}

export async function updateNoteFolderAction(id: string, data: { name?: string; color?: string }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.noteFolder.update({ where: { id }, data, select: makeFolderSelect(session.user.id) });
}

export async function deleteNoteFolderAction(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.noteFolder.delete({ where: { id } });
}
