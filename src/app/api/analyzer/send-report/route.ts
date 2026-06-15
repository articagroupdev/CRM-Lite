import { NextRequest, NextResponse } from 'next/server';
import { generateAnalyzerReportEmailTemplate } from '@/lib/analyzer-email-generator';
import { sendEmail } from '@/lib/email';
import type { ReportData, SingleCampaignAiContent } from '@/types';

function computePeriod(reportData: ReportData[]): string {
  if (!reportData.length) return '';
  const starts = reportData.map(c => c.startDate).filter(d => d && d !== 'N/A').map(d => new Date(d));
  const ends = reportData.map(c => c.endDate).filter(d => d && d !== 'N/A').map(d => new Date(d));
  if (!starts.length || !ends.length) return '';
  const minStart = new Date(Math.min(...starts.map(d => d.getTime())));
  const maxEnd = new Date(Math.max(...ends.map(d => d.getTime())));
  const start = minStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  const end = maxEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${start} – ${end}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      to,
      clientName,
      reportData,
      aiContent,
      selectedMetricsVisibility,
      allMetricsConfig,
      platform,
    } = body as {
      to: string;
      clientName?: string;
      reportData: ReportData[];
      aiContent: (SingleCampaignAiContent | null)[];
      selectedMetricsVisibility: Record<string, boolean>;
      allMetricsConfig: any[];
      platform?: string;
    };

    if (!to || !reportData?.length) {
      return NextResponse.json({ error: 'Faltan datos requeridos (destinatario y datos del reporte)' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    const reportDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const period = computePeriod(reportData);
    const brand = platform === 'meta-4101' ? '4101' : 'default';

    const html = generateAnalyzerReportEmailTemplate({
      clientName: clientName || 'Cliente',
      reportDate,
      period,
      reportData,
      aiContent: aiContent || [],
      selectedMetricsVisibility: selectedMetricsVisibility || {},
      allMetricsConfig: allMetricsConfig || [],
      platform: 'meta',
      brand,
    });

    const subject = `Reporte Meta Ads${clientName ? ` – ${clientName}` : ''} · ${reportDate}`;
    const result = await sendEmail({ to, subject, html });

    if (!result.success) {
      const isNoKey = result.error?.includes('RESEND_API_KEY');
      return NextResponse.json(
        {
          error: isNoKey
            ? 'Servicio de email no configurado. Configura RESEND_API_KEY en el archivo .env del CRM Lite.'
            : result.error || 'Error al enviar el email',
          service: result.service,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, service: result.service });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
