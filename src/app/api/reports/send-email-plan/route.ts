import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, clientName, planTitle, period, emailCount, emails, pdfBase64 } = body;

    if (!to || !pdfBase64) return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });

    const emailRows = (emails || []).map((e: any, i: number) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px 8px;font-size:13px;color:#111827;font-weight:500;">${i + 1}. ${e.subject || 'Sin asunto'}</td>
        <td style="padding:12px 8px;text-align:right;font-size:13px;color:#6b7280;">${e.sendDate || '-'}</td>
      </tr>
      ${e.notes ? `<tr><td colspan="2" style="padding:4px 8px 12px;font-size:12px;color:#6b7280;font-style:italic;">${e.notes}</td></tr>` : ''}
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:#011b6a;padding:32px 40px;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">${planTitle || 'Plan de Email Marketing'}</h1>
      <p style="color:#93c5fd;margin:8px 0 0;font-size:14px;">${clientName || 'Cliente'}${period ? ` · ${period}` : ''}</p>
    </div>
    <div style="padding:32px 40px;">
      <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">Adjunto encontraras el PDF con la planificacion de ${emailCount || 0} email${(emailCount || 0) !== 1 ? 's' : ''}.</p>
      ${emails?.length ? `
      <h2 style="font-size:14px;font-weight:600;color:#111827;margin:0 0 12px;">Resumen</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:#f9fafb;">
          <th style="padding:10px 8px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Email</th>
          <th style="padding:10px 8px;text-align:right;font-size:12px;color:#6b7280;font-weight:600;">Fecha</th>
        </tr></thead>
        <tbody>${emailRows}</tbody>
      </table>` : ''}
    </div>
    <div style="background:#f9fafb;padding:16px 40px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">CRM Lite · Plan generado el ${new Date().toLocaleDateString('es-ES')}</p>
    </div>
  </div>
</body>
</html>`;

    const result = await sendEmail({
      to,
      subject: `Plan de Email Marketing - ${clientName || 'Cliente'}`,
      html,
      attachments: pdfBase64 ? [{
        filename: `Planificacion_Email_${(clientName || 'Plan').replace(/[^a-z0-9]/gi, '_')}.pdf`,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf',
      }] : [],
    });

    if (!result.success) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
