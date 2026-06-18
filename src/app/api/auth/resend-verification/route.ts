import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { verificationEmailHtml } from "@/lib/notifications";

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId: string | undefined = body.userId;
    const email: string | undefined = body.email;

    let user: { id: string; name: string; email: string; emailVerified: Date | null } | null = null;

    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, emailVerified: true },
      });
    } else if (email) {
      user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, email: true, emailVerified: true },
      });
    }

    if (!user) {
      // Return success even if user not found to avoid email enumeration
      return NextResponse.json({ success: true, userId: null });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Esta cuenta ya está verificada" }, { status: 400 });
    }

    // Rate-limit: 1 resend per 60 seconds per user
    const recent = await prisma.emailVerification.findFirst({
      where: {
        userId: user.id,
        createdAt: { gt: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    });

    if (recent) {
      const waitSeconds = Math.ceil(
        (recent.createdAt.getTime() + 60 * 1000 - Date.now()) / 1000
      );
      return NextResponse.json(
        { error: `Espera ${waitSeconds}s antes de solicitar un nuevo código` },
        { status: 429 }
      );
    }

    // Invalidate all previous unused codes for this user
    await prisma.emailVerification.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Create new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.emailVerification.create({
      data: { userId: user.id, code, expiresAt },
    });

    // Send email (non-blocking)
    sendEmail({
      to: user.email,
      subject: `Tu código de verificación — CRM Lite`,
      html: verificationEmailHtml(user.name, code),
    }).catch((err: unknown) => console.error("[ResendVerification] Email failed:", err));

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error("[ResendVerification]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
