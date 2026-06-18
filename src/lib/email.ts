import { Resend } from 'resend';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
}

export async function sendEmail(opts: EmailOptions): Promise<{ success: boolean; error?: string; service: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@crmlite.com';

  if (!key) return { success: false, error: 'RESEND_API_KEY no configurada', service: 'None' };

  try {
    const resend = new Resend(key);
    await resend.emails.send({
      from: `Artica Group <${from}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      attachments: opts.attachments?.map(a => ({
        filename: a.filename,
        content: Buffer.isBuffer(a.content) ? a.content : Buffer.from(a.content as string, 'base64'),
      })),
    });
    return { success: true, service: 'Resend' };
  } catch (err: any) {
    return { success: false, error: err.message, service: 'Resend' };
  }
}
