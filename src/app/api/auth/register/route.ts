import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { verificationEmailHtml } from "@/lib/notifications";

const schema = z.object({
  name: z.string().min(2, "Nombre muy corto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (!existing.emailVerified) {
        // Account exists but not verified — resend code
        return NextResponse.json(
          { error: "Este email ya está registrado pero no verificado. Inicia sesión para reenviar el código." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: "Este email ya está registrado" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        role: "TRAFIKER",
        // emailVerified remains null until verified
      },
      select: { id: true, email: true, name: true, role: true },
    });

    // Generate and store verification code (15-min expiry)
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await prisma.emailVerification.create({
      data: { userId: user.id, code, expiresAt },
    });

    // Send verification email (non-blocking, don't fail registration if email fails)
    sendEmail({
      to: email,
      subject: `Tu código de verificación — CRM Lite`,
      html: verificationEmailHtml(name, code),
    }).catch((err: unknown) => console.error("[Register] Email send failed:", err));

    return NextResponse.json(
      { requiresVerification: true, userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Register]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
