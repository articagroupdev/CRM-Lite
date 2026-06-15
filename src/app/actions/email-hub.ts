"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./auth";
import { revalidatePath } from "next/cache";

// ── Lists ─────────────────────────────────────────────────────────────────────

export async function getEmailListsForClientAction(clientId: string) {
  try {
    await getCurrentUser();
    return await prisma.emailList.findMany({
      where: { clientId },
      include: { _count: { select: { contacts: true, campaigns: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch { return { error: "Error al obtener listas" }; }
}

export async function createEmailListAction(data: { name: string; description?: string; clientId: string }) {
  try {
    await getCurrentUser();
    const list = await prisma.emailList.create({ data });
    revalidatePath("/email-hub");
    return list;
  } catch { return { error: "Error al crear lista" }; }
}

export async function deleteEmailListAction(listId: string) {
  try {
    await getCurrentUser();
    await prisma.emailList.delete({ where: { id: listId } });
    revalidatePath("/email-hub");
    return { success: true };
  } catch { return { error: "Error al eliminar lista" }; }
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function getContactsForClientAction(clientId: string) {
  try {
    await getCurrentUser();
    return await prisma.emailContact.findMany({
      where: { list: { clientId } },
      include: { list: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch { return { error: "Error al obtener contactos" }; }
}

export async function addContactAction(data: { email: string; firstName?: string; lastName?: string; phone?: string; company?: string; listId: string }) {
  try {
    await getCurrentUser();
    const contact = await prisma.emailContact.create({ data });
    revalidatePath("/email-hub");
    return contact;
  } catch (error: any) {
    if (error?.code === "P2002") return { error: "Este email ya existe en la lista" };
    return { error: "Error al agregar contacto" };
  }
}

export async function importContactsAction(listId: string, contacts: Array<{ email: string; firstName?: string; lastName?: string; phone?: string; company?: string }>) {
  try {
    await getCurrentUser();
    let imported = 0, duplicates = 0, invalid = 0;
    for (const c of contacts) {
      if (!c.email?.includes("@")) { invalid++; continue; }
      try {
        await prisma.emailContact.create({ data: { email: c.email.toLowerCase().trim(), firstName: c.firstName, lastName: c.lastName, phone: c.phone, company: c.company, listId } });
        imported++;
      } catch (err: any) {
        if (err?.code === "P2002") duplicates++;
        else invalid++;
      }
    }
    revalidatePath("/email-hub");
    return { imported, duplicates, invalid, total: contacts.length };
  } catch { return { error: "Error al importar contactos" }; }
}

export async function deleteContactAction(contactId: string) {
  try {
    await getCurrentUser();
    await prisma.emailContact.delete({ where: { id: contactId } });
    revalidatePath("/email-hub");
    return { success: true };
  } catch { return { error: "Error al eliminar contacto" }; }
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export async function getCampaignsForClientAction(clientId: string) {
  try {
    await getCurrentUser();
    return await prisma.emailCampaign.findMany({
      where: { list: { clientId } },
      include: { list: { select: { id: true, name: true } }, template: { select: { id: true, name: true } }, _count: { select: { sentEmails: true } } },
      orderBy: { createdAt: "desc" },
    });
  } catch { return { error: "Error al obtener campañas" }; }
}

export async function createEmailCampaignAction(data: { name: string; subject: string; htmlContent: string; listId: string; templateId?: string; scheduledAt?: string }) {
  try {
    const userId = await getCurrentUser();
    const campaign = await prisma.emailCampaign.create({
      data: {
        name: data.name, subject: data.subject, htmlContent: data.htmlContent,
        listId: data.listId, templateId: data.templateId ?? null,
        createdById: userId,
        status: data.scheduledAt ? "SCHEDULED" : "DRAFT",
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    });
    revalidatePath("/email-hub");
    return campaign;
  } catch { return { error: "Error al crear campaña" }; }
}

export async function scheduleCampaignAction(data: { campaignId: string; scheduledAt: string }) {
  try {
    await getCurrentUser();
    const campaign = await prisma.emailCampaign.update({
      where: { id: data.campaignId },
      data: { scheduledAt: new Date(data.scheduledAt), status: "SCHEDULED" },
    });
    revalidatePath("/email-hub");
    return campaign;
  } catch { return { error: "Error al programar campaña" }; }
}

export async function deleteEmailCampaignAction(campaignId: string) {
  try {
    await getCurrentUser();
    await prisma.emailCampaign.delete({ where: { id: campaignId } });
    revalidatePath("/email-hub");
    return { success: true };
  } catch { return { error: "Error al eliminar campaña" }; }
}

// ── Templates ─────────────────────────────────────────────────────────────────

export async function getAllTemplatesAction() {
  try {
    await getCurrentUser();
    return await prisma.emailTemplate.findMany({ orderBy: { createdAt: "desc" } });
  } catch { return { error: "Error al obtener plantillas" }; }
}

export async function createTemplateAction(data: { name: string; subject: string; htmlContent: string }) {
  try {
    await getCurrentUser();
    const template = await prisma.emailTemplate.create({ data });
    revalidatePath("/email-hub");
    return template;
  } catch { return { error: "Error al crear plantilla" }; }
}

export async function deleteTemplateAction(templateId: string) {
  try {
    await getCurrentUser();
    await prisma.emailTemplate.delete({ where: { id: templateId } });
    revalidatePath("/email-hub");
    return { success: true };
  } catch { return { error: "Error al eliminar plantilla" }; }
}

// ── Metrics & Clients ─────────────────────────────────────────────────────────

export async function getClientsWithEmailMetricsAction() {
  try {
    await getCurrentUser();
    const clients = await prisma.client.findMany({
      select: {
        id: true, name: true, email: true, company: true, status: true, avatar: true,
        emailLists: { select: { id: true, name: true, _count: { select: { contacts: true, campaigns: true } } } },
      },
      orderBy: { name: "asc" },
    });

    const clientsWithMetrics = await Promise.all(clients.map(async (client) => {
      const listIds = client.emailLists.map((l) => l.id);
      if (!listIds.length) return { ...client, metrics: { totalSubscribers: 0, totalCampaigns: 0, totalSent: 0, openRate: 0, clickRate: 0 } };

      const [totalSent, openedCount, clickedCount, totalCampaigns] = await Promise.all([
        prisma.emailSent.count({ where: { campaign: { listId: { in: listIds } } } }),
        prisma.emailSent.count({ where: { campaign: { listId: { in: listIds } }, openedAt: { not: null } } }),
        prisma.emailSent.count({ where: { campaign: { listId: { in: listIds } }, clickedAt: { not: null } } }),
        prisma.emailCampaign.count({ where: { listId: { in: listIds } } }),
      ]);

      const totalSubscribers = client.emailLists.reduce((s, l) => s + l._count.contacts, 0);
      return {
        ...client,
        metrics: {
          totalSubscribers, totalCampaigns, totalSent,
          openRate: totalSent > 0 ? Math.round((openedCount / totalSent) * 10000) / 100 : 0,
          clickRate: totalSent > 0 ? Math.round((clickedCount / totalSent) * 10000) / 100 : 0,
        },
      };
    }));

    return clientsWithMetrics;
  } catch { return { error: "Error al obtener clientes con métricas" }; }
}

export async function getScheduledCampaignsAction() {
  try {
    await getCurrentUser();
    return await prisma.emailCampaign.findMany({
      where: { status: "SCHEDULED", scheduledAt: { not: null } },
      include: { list: { select: { name: true, client: { select: { id: true, name: true } }, _count: { select: { contacts: true } } } } },
      orderBy: { scheduledAt: "asc" },
    });
  } catch { return { error: "Error al obtener campañas programadas" }; }
}
