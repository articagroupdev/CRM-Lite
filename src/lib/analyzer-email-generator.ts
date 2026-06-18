import type { ReportData, SingleCampaignAiContent, MetricConfig } from '@/types';

interface EmailTheme {
  bgBase: string;
  bgDark: string;
  primary: string;
  secondary: string;
  accent: string;
  cardBg: string;
  border: string;
  success: string;
  logoPath: string;
  footerHtml: (reportDate: string) => string;
  chartBarColor: string;
}

export interface GenerateAnalyzerReportEmailParams {
  clientName: string;
  reportDate?: string;
  period?: string;
  reportData: ReportData[];
  aiContent: (SingleCampaignAiContent | { error: string; summary: string; analysis: string; conclusions: string } | null)[];
  selectedMetricsVisibility: Record<string, boolean>;
  allMetricsConfig: MetricConfig[];
  platform?: 'meta' | 'tiktok' | 'google';
  brand?: 'default' | '4101';
}

const resolveBaseUrl = () =>
  process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';

const BASE_URL = resolveBaseUrl();

const DEFAULT_ARTICA_LOGO_URL =
  process.env.ANALYZER_META_LOGO_URL || `${BASE_URL}/img/logo-artica-1.png`;

const DEFAULT_4101_LOGO_URL =
  process.env.ANALYZER_META_LOGO_URL_4101 || `${BASE_URL}/logo-4101.png`;

const EMAIL_THEMES: Record<'default' | '4101', EmailTheme> = {
  default: {
    bgBase: '#252c5e',
    bgDark: '#1a1f42',
    primary: '#1e293b',
    secondary: '#64748b',
    accent: '#2563eb',
    cardBg: '#ffffff',
    border: '#e2e8f0',
    success: '#10b981',
    logoPath: DEFAULT_ARTICA_LOGO_URL,
    footerHtml: (reportDate) => `Generado el ${reportDate} por <strong>Artica CRM</strong>`,
    chartBarColor: 'rgba(37, 99, 235, 0.7)',
  },
  '4101': {
    bgBase: '#0f0f0f',
    bgDark: '#1a1a1a',
    primary: '#1a1a1a',
    secondary: '#64748b',
    accent: '#f97316',
    cardBg: '#ffffff',
    border: '#e2e8f0',
    success: '#ea580c',
    logoPath: DEFAULT_4101_LOGO_URL,
    footerHtml: () => 'Generado por <strong>4101 Media</strong>',
    chartBarColor: 'rgba(249, 115, 22, 0.8)',
  },
};

export function generateAnalyzerReportEmailTemplate(params: GenerateAnalyzerReportEmailParams): string {
  const {
    clientName,
    reportDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }),
    period = '',
    reportData,
    aiContent,
    platform = 'meta',
    brand = 'default',
  } = params;

  const theme = EMAIL_THEMES[brand];
  const colors = {
    bgBase: theme.bgBase,
    bgDark: theme.bgDark,
    primary: theme.primary,
    secondary: theme.secondary,
    accent: theme.accent,
    cardBg: theme.cardBg,
    border: theme.border,
    success: theme.success,
  };

  const isValidValue = (value: string | null | undefined): boolean => {
    if (!value) return false;
    const trimmed = value.trim();
    const invalid = ['-', '--', 'N/A', 'n/a', 'null', 'undefined', '', '[Campaña no especificada]', '[Página no especificada]'];
    return !invalid.includes(trimmed) && trimmed.length > 0;
  };

  const hasAdNames = reportData.some((c) => isValidValue(c.adName));
  const hasAdSetNames = reportData.some((c) => isValidValue(c.adSetName));

  const getCampaignDisplayName = (campaign: ReportData, index: number): string => {
    if (platform === 'meta') {
      if (hasAdNames && isValidValue(campaign.adName)) return campaign.adName!.trim();
      if (!hasAdNames && hasAdSetNames && isValidValue(campaign.adSetName)) return campaign.adSetName!.trim();
      if (isValidValue(campaign.campaignName)) return campaign.campaignName!.trim();
      if (isValidValue(campaign.adSetName)) return campaign.adSetName!.trim();
      if (isValidValue(campaign.adName)) return campaign.adName!.trim();
    } else {
      if (isValidValue(campaign.campaignName)) return campaign.campaignName!.trim();
      if (isValidValue(campaign.adName)) return campaign.adName!.trim();
      if (isValidValue(campaign.adSetName)) return campaign.adSetName!.trim();
    }
    if (campaign.startDate && campaign.endDate) {
      const start = new Date(campaign.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      const end = new Date(campaign.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      if (start !== end) return `Campaña ${start} - ${end}`;
    }
    return `Campaña ${index + 1}`;
  };

  const getCampaignSubtitle = (campaign: ReportData): string => {
    if (campaign.startDate && campaign.endDate) {
      try {
        const start = new Date(campaign.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        const end = new Date(campaign.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        if (platform === 'meta' && hasAdSetNames && !hasAdNames && isValidValue(campaign.campaignName)) {
          return `${start} - ${end} · Campaña: ${campaign.campaignName!.trim()}`;
        }
        return `${start} - ${end}`;
      } catch { /* ignore */ }
    }
    if (platform === 'tiktok' || platform === 'google') {
      if (isValidValue(campaign.adName) && campaign.adName !== campaign.campaignName) return campaign.adName!.trim();
      if (isValidValue(campaign.adSetName) && campaign.adSetName !== campaign.campaignName) return campaign.adSetName!.trim();
    }
    if (isValidValue(campaign.adSetName)) return campaign.adSetName!.trim();
    return 'General';
  };

  const getClientDisplayName = (): string => {
    const name = clientName?.trim();
    if (!name || name === '0' || name === 'N/A' || name === 'undefined' || name === 'null') {
      if (reportData.length > 0) {
        const pageName = reportData[0].facebookPageName?.trim();
        if (pageName && pageName !== '0' && pageName !== 'N/A' && pageName !== '[Página no especificada]') return pageName;
        const campaignName = reportData[0].campaignName?.trim();
        if (campaignName && campaignName !== '-' && campaignName !== '[Campaña no especificada]') return campaignName;
      }
      return platform === 'tiktok' ? 'Reporte TikTok Ads' : platform === 'google' ? 'Reporte Google Ads' : 'Reporte Meta Ads';
    }
    return name;
  };

  const formatCurrency = (value: number | null | undefined): string => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    return `$${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value: number | null | undefined): string => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    return `${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  };

  const formatNumber = (value: number | null | undefined, isFrequency = false): string => {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    if (isFrequency) return value.toFixed(2);
    return value.toLocaleString('es-ES');
  };

  const markdownToHtml = (text: string): string => {
    if (!text) return '';
    let html = text.replace(/\n/g, '<br>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#1e293b;">$1</strong>');
    html = html.replace(/^\- (.*)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul style="margin:5px 0;padding-left:18px;color:#475569;">$1</ul>');
    return html;
  };

  const generateChartUrl = (data: ReportData[], barColor: string): string => {
    const top = [...data].sort((a, b) => (b.amountSpent || 0) - (a.amountSpent || 0)).slice(0, 6);
    const labels = top.map(d => {
      const n = d.campaignName || 'Campaña';
      return n.length > 12 ? n.substring(0, 12) + '…' : n;
    });
    const spendingData = top.map(d => parseFloat((d.amountSpent || 0).toFixed(2)));
    const chartConfig = {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Inversión ($)', backgroundColor: barColor, data: spendingData }],
      },
      options: {
        legend: { display: false },
        title: { display: true, text: 'Inversión por Campaña', fontColor: colors.primary, fontFamily: 'sans-serif' },
        scales: {
          xAxes: [{ ticks: { fontSize: 9 } }],
          yAxes: [{ ticks: { beginAtZero: true } }],
        },
      },
    };
    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=520&h=260&bkg=white`;
  };

  const getMetricValueDirect = (metricId: string, campaignData: ReportData): { value: string; label: string } | null => {
    try {
      if (metricId === 'resultsPrimary') {
        const label = campaignData.resultColumnName || (platform === 'google' ? 'Conversiones' : 'Resultados');
        const primaryValue = campaignData.results ?? campaignData.leads ?? campaignData.conversations ?? 0;
        return { value: formatNumber(primaryValue), label };
      } else if (metricId === 'costPerResultPrimary') {
        const label = campaignData.costPerResultColumnName || (platform === 'google' ? 'Costo por Conversión' : 'Costo por Resultado');
        return { value: formatCurrency(campaignData.costPerResult), label };
      } else if (metricId === 'amountSpent') {
        return { value: formatCurrency(campaignData.amountSpent), label: 'Inversión' };
      } else if (metricId === 'reach') {
        return { value: formatNumber(campaignData.reach), label: 'Alcance' };
      } else if (metricId === 'impressions') {
        return { value: formatNumber(campaignData.impressions), label: 'Impresiones' };
      } else if (metricId === 'frequency') {
        return { value: formatNumber(campaignData.frequency, true), label: 'Frecuencia' };
      } else if (metricId === 'linkClicks') {
        return { value: formatNumber(campaignData.linkClicks), label: 'Clics' };
      } else if (metricId === 'ctr') {
        return { value: formatPercentage(campaignData.ctr), label: 'CTR' };
      } else if (metricId === 'cpc') {
        return { value: formatCurrency(campaignData.cpc), label: 'CPC Promedio' };
      } else if (metricId === 'resultRate') {
        return { value: formatPercentage(campaignData.resultRate), label: 'Tasa de Conversión' };
      }
      return null;
    } catch { return null; }
  };

  const METRIC_STYLES: Record<string, { bg: string; border: string; text: string }> = {
    amountSpent: { bg: '#ecfdf5', border: '#d1fae5', text: '#059669' },
    resultsPrimary: { bg: '#eff6ff', border: '#dbeafe', text: '#2563eb' },
    costPerResultPrimary: { bg: '#fff1f2', border: '#ffe4e6', text: '#e11d48' },
    reach: { bg: '#f5f3ff', border: '#ede9fe', text: '#7c3aed' },
    impressions: { bg: '#eef2ff', border: '#e0e7ff', text: '#4f46e5' },
    ctr: { bg: '#fff7ed', border: '#ffedd5', text: '#ea580c' },
    linkClicks: { bg: '#ecfeff', border: '#cffafe', text: '#0891b2' },
    frequency: { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b' },
    cpc: { bg: '#fef3c7', border: '#fde68a', text: '#d97706' },
    resultRate: { bg: '#fce7f3', border: '#fbcfe8', text: '#db2777' },
  };

  const generateCampaignMetricsGrid = (campaign: ReportData): string => {
    const metricIds = platform === 'google'
      ? ['amountSpent', 'resultsPrimary', 'costPerResultPrimary', 'cpc', 'impressions', 'ctr', 'linkClicks', 'resultRate']
      : ['amountSpent', 'resultsPrimary', 'costPerResultPrimary', 'reach', 'impressions', 'ctr', 'linkClicks', 'frequency'];
    const cells: string[] = [];
    metricIds.forEach(id => {
      const res = getMetricValueDirect(id, campaign);
      if (!res) return;
      const s = METRIC_STYLES[id] || METRIC_STYLES.frequency;
      cells.push(`
        <td width="25%" class="col-metric" style="padding:6px;vertical-align:top;">
          <div style="background-color:${s.bg};border:1px solid ${s.border};border-radius:8px;padding:12px 4px;text-align:center;height:100%;box-sizing:border-box;">
            <p style="font-size:8px;color:${s.text};text-transform:uppercase;margin:0 0 6px 0;letter-spacing:0.3px;font-weight:700;opacity:0.9;line-height:1.2;">${res.label}</p>
            <p style="font-size:14px;font-weight:700;color:${colors.bgBase};margin:0;letter-spacing:-0.3px;">${res.value}</p>
          </div>
        </td>
      `);
    });
    const rows: string[] = [];
    for (let i = 0; i < cells.length; i += 4) {
      rows.push(`<tr>${cells.slice(i, i + 4).join('')}</tr>`);
    }
    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;table-layout:fixed;">${rows.join('')}</table>`;
  };

  const generateAiAnalysisHTML = (index: number): string => {
    const content = aiContent[index];
    if (!content || 'error' in content) return '';
    const summary = content.summary ? markdownToHtml(content.summary) : '';
    const analysis = content.analysis ? markdownToHtml(content.analysis) : '';
    const conclusions = content.conclusions ? markdownToHtml(content.conclusions) : '';
    if (!summary && !analysis && !conclusions) return '';
    const sectionStyle = `margin-bottom:16px;padding-bottom:16px;border-bottom:1px dashed ${colors.border};`;
    const titleStyle = `font-size:12px;font-weight:700;color:${colors.bgBase};text-transform:uppercase;margin:0 0 6px 0;`;
    const textStyle = `font-size:13px;color:${colors.secondary};line-height:1.6;margin:0;`;
    return `
      <div style="margin-top:20px;background-color:#fbfbfc;border:1px solid ${colors.border};border-radius:8px;padding:20px;">
        ${summary ? `<div style="${sectionStyle}"><h5 style="${titleStyle}">Resumen Ejecutivo</h5><div style="${textStyle}">${summary}</div></div>` : ''}
        ${analysis ? `<div style="${sectionStyle}"><h5 style="${titleStyle}">Insights Clave</h5><div style="${textStyle}">${analysis}</div></div>` : ''}
        ${conclusions ? `<div><h5 style="${titleStyle}">Conclusiones</h5><div style="${textStyle}">${conclusions}</div></div>` : ''}
      </div>
    `;
  };

  const totalSpent = reportData.reduce((s, c) => s + (c.amountSpent || 0), 0);
  const totalResults = reportData.reduce((s, c) => s + (c.results || 0), 0);
  const totalImpressions = reportData.reduce((s, c) => s + (c.impressions || 0), 0);
  const totalLinkClicks = reportData.reduce((s, c) => s + (c.linkClicks || 0), 0);
  const averageCTR = totalImpressions > 0 ? (totalLinkClicks / totalImpressions) * 100 : 0;
  const averageCPR = totalResults > 0 ? totalSpent / totalResults : 0;

  const generateSummaryCards = () => {
    const cards = [
      { label: 'Inversión Total', value: formatCurrency(totalSpent) },
      { label: 'Resultados', value: formatNumber(totalResults), sub: totalResults > 0 ? `${formatCurrency(averageCPR)} c/u` : '' },
      { label: 'Impresiones', value: formatNumber(totalImpressions) },
      { label: 'Clics', value: formatNumber(totalLinkClicks), sub: `${formatPercentage(averageCTR)} CTR` },
    ];
    const cells = cards.map(card => `
      <td width="25%" class="col-metric" style="padding:0 6px;">
        <div style="text-align:center;padding:10px 0;background-color:#fff;border-radius:8px;">
          <div style="font-size:10px;color:${colors.secondary};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${card.label}</div>
          <div style="font-size:18px;font-weight:700;color:${colors.bgBase};letter-spacing:-0.5px;">${card.value}</div>
          ${card.sub ? `<div style="font-size:10px;color:${colors.success};font-weight:600;">${card.sub}</div>` : ''}
        </div>
      </td>
    `).join('');
    return `
      <div style="margin:15px 0 5px 0;">
        <p style="font-size:11px;font-weight:700;color:${colors.bgBase};text-transform:uppercase;margin:0 0 6px 0;letter-spacing:0.8px;">Resumen General de la Cuenta</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${colors.border};border-bottom:1px solid ${colors.border};padding:10px 0;table-layout:fixed;">
          <tr>${cells}</tr>
        </table>
      </div>
    `;
  };

  const chartUrl = generateChartUrl(reportData, theme.chartBarColor);
  const displayPeriod = period || reportData.reduce((acc, c) => {
    if (c.startDate && c.startDate !== 'N/A') {
      const start = new Date(c.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
      const end = new Date(c.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${start} – ${end}`;
    }
    return acc;
  }, '');

  return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Reporte ${getClientDisplayName()}</title>
  <style type="text/css">
    body { margin:0;padding:0;min-width:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
    .content { width:100%;max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.15); }
    @media only screen and (max-width:600px) {
      .content { width:100%!important;border-radius:0!important;margin:0!important; }
      .content-padding { padding:20px!important; }
      .col-metric { display:inline-block!important;width:50%!important;box-sizing:border-box!important;padding:5px!important; }
      img { max-width:100%!important;height:auto!important; }
    }
  </style>
</head>
<body style="background-color:${colors.bgBase};background-image:linear-gradient(180deg,${colors.bgBase} 0%,${colors.bgDark} 100%);padding:40px 0;">

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:25px;">
    <tr><td align="center">
      <img src="${theme.logoPath}" width="160" style="display:block;border:0;max-width:100%;height:auto;" alt="Logo" />
    </td></tr>
  </table>

  <div class="content">

    <div class="content-padding" style="padding:30px 30px 20px 30px;text-align:center;">
      <p style="font-size:11px;font-weight:700;color:${colors.accent};text-transform:uppercase;margin:0 0 8px 0;letter-spacing:1px;">Reporte de Rendimiento ${platform === 'tiktok' ? 'TikTok Ads' : platform === 'google' ? 'Google Ads' : 'Meta Ads'}</p>
      <h1 style="font-size:22px;font-weight:800;color:${colors.primary};margin:0 0 6px 0;letter-spacing:-0.5px;">${getClientDisplayName()}</h1>
      ${displayPeriod ? `<p style="font-size:13px;color:${colors.secondary};margin:0;">Periodo: ${displayPeriod}</p>` : ''}
    </div>

    <div class="content-padding" style="padding:0 30px 10px 30px;">
      ${generateSummaryCards()}
    </div>

    <div class="content-padding" style="padding:10px 30px 20px 30px;">
      ${reportData.map((campaign, index) => {
        const displayName = getCampaignDisplayName(campaign, index);
        const subtitle = getCampaignSubtitle(campaign);
        return `
          <div style="margin-top:30px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px;">
              <tr><td valign="middle">
                <span style="background-color:${colors.bgBase};color:#fff;font-size:10px;font-weight:700;width:20px;height:20px;border-radius:50%;display:inline-block;text-align:center;line-height:20px;margin-right:8px;">${index + 1}</span>
                <span style="font-size:15px;font-weight:700;color:${colors.primary};">${displayName}</span>
                <div style="font-size:12px;color:${colors.secondary};margin-left:28px;margin-top:2px;">${subtitle}</div>
              </td></tr>
            </table>
            ${generateCampaignMetricsGrid(campaign)}
            ${generateAiAnalysisHTML(index)}
          </div>
          ${index < reportData.length - 1 ? `<div style="height:1px;background-color:${colors.border};margin:30px 0;"></div>` : ''}
        `;
      }).join('')}
    </div>

    <div class="content-padding" style="padding:0 30px 40px 30px;text-align:center;">
      <p style="font-size:11px;font-weight:700;color:${colors.secondary};text-transform:uppercase;margin:0 0 12px 0;letter-spacing:0.8px;">Distribución de Inversión por Campaña</p>
      <img src="${chartUrl}" width="100%" style="max-width:520px;height:auto;border-radius:8px;border:1px solid #f1f5f9;" alt="Gráfico de Inversión" />
    </div>

    <div class="content-padding" style="background-color:#f8fafc;padding:20px;text-align:center;border-top:1px solid ${colors.border};">
      <p style="font-size:11px;color:${colors.secondary};margin:0;">
        ${theme.footerHtml(reportDate)}
      </p>
    </div>

  </div>

  <div style="height:40px;"></div>
</body>
</html>
  `;
}
