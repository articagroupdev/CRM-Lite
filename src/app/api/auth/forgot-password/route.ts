import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

function resetEmailHtml(name: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f1f5f9;margin:0;padding:40px 0;}
  .wrap{max-width:460px;margin:0 auto;}
  .card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.1);}
  .hdr{background:#011b6a;padding:28px 32px;text-align:center;}
  .hdr p{margin:0;color:#fff;font-size:18px;font-weight:800;}
  .hdr span{color:rgba(255,255,255,0.45);font-size:11px;}
  .body{padding:36px 32px;text-align:center;}
  .body h2{color:#011b6a;font-size:20px;margin:0 0 10px;}
  .body p{color:#64748b;font-size:14px;line-height:1.65;margin:0 0 24px;}
  .btn{display:inline-block;background:#011b6a;color:#fff;font-size:15px;font-weight:700;padding:14px 32px;border-radius:10px;text-decoration:none;}
  .note{color:#94a3b8;font-size:12px;margin-top:20px!important;}
  .ftr{background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;text-align:center;}
  .ftr p{color:#94a3b8;font-size:11px;margin:0;}
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="hdr">
      <p>CRM Lite</p>
      <span>by Artica Group</span>
    </div>
    <div class="body">
      <h2>Restablecer contraseña</h2>
      <p>Hola <strong>${name}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
      <a href="${resetUrl}" class="btn">Restablecer contraseña</a>
      <p class="note">Este enlace expira en <strong>30 minutos</strong>.<br/>Si no solicitaste esto, ignora este mensaje.</p>
    </div>
    <div class="ftr"><p>CRM Lite · Artica Group · No responder este correo</p></div>
  </div>
</div>
</body>
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email requerido" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, name: true, email: true, deletedAt: true },
    });

    // Always return success to avoid email enumeration
    if (!user || user.deletedAt) {
      return NextResponse.json({ success: true });
    }

    // Rate-limit: 1 request per 60s per user
    const recent = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } },
      orderBy: { createdAt: "desc" },
    });
    if (recent) {
      return NextResponse.json({ success: true }); // silent rate-limit
    }

    // Invalidate old tokens
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3001";
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    sendEmail({
      to: user.email,
      subject: "Restablecer contraseña — CRM Lite",
      html: resetEmailHtml(user.name, resetUrl),
    }).catch((err: unknown) => console.error("[ForgotPassword] Email failed:", err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[ForgotPassword]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
