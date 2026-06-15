import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@crmlite.com";
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id },
      include: { list: { include: { contacts: { where: { status: "SUBSCRIBED" } } } } },
    });

    if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 });
    if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
      return NextResponse.json({ error: "Solo se pueden enviar campañas en borrador o programadas" }, { status: 400 });
    }

    const contacts = campaign.list.contacts;
    if (!contacts.length) return NextResponse.json({ error: "No hay suscriptores activos en esta lista" }, { status: 400 });

    await prisma.emailCampaign.update({ where: { id }, data: { status: "SENDING" } });

    let sent = 0;
    for (const contact of contacts) {
      try {
        await resend.emails.send({
          from: FROM,
          to: contact.email,
          subject: campaign.subject,
          html: campaign.htmlContent,
        });
        await prisma.emailSent.create({ data: { campaignId: id, email: contact.email, status: "SENT", sentAt: new Date() } });
        sent++;
      } catch (err) {
        await prisma.emailSent.create({ data: { campaignId: id, email: contact.email, status: "FAILED" } });
      }
    }

    await prisma.emailCampaign.update({ where: { id }, data: { status: "SENT", sentAt: new Date() } });
    return NextResponse.json({ sent, total: contacts.length });
  } catch (error) {
    console.error("[SendCampaign]", error);
    await prisma.emailCampaign.update({ where: { id }, data: { status: "DRAFT" } }).catch(() => {});
    return NextResponse.json({ error: "Error al enviar campaña" }, { status: 500 });
  }
}
