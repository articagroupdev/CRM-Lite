import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/app/actions/notifications";

export async function POST(req: NextRequest) {
  try {
    const { userId, code } = await req.json();

    if (!userId || !code) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // If already verified, treat as success (handles double-submit / retry)
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, emailVerified: true },
    });
    if (existingUser?.emailVerified) {
      return NextResponse.json({ success: true });
    }

    const verification = await prisma.emailVerification.findFirst({
      where: {
        userId,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: { select: { id: true, name: true, email: true, emailVerified: true } } },
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Código incorrecto o expirado. Solicita un nuevo código." },
        { status: 400 }
      );
    }

    // Invalidate code and verify user in a transaction
    await prisma.$transaction([
      prisma.emailVerification.update({
        where: { id: verification.id },
        data: { used: true },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { emailVerified: new Date() },
      }),
    ]);

    createNotification({
      type: "USER_REGISTERED",
      title: "Nuevo usuario registrado",
      body: `${verification.user.name} (${verification.user.email}) verificó su cuenta y se unió a la plataforma.`,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VerifyEmail]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
