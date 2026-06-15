import React from 'react';
import type { ReportData, SingleCampaignAiContent, MetricConfig } from '@/types';

const PRIMARY = '#011b6a';
const ACCENT = '#fa922e';
const GRAY50 = '#f9fafb';
const GRAY100 = '#f3f4f6';
const GRAY200 = '#e5e7eb';
const GRAY300 = '#d1d5db';
const GRAY500 = '#6b7280';
const GRAY600 = '#4b5563';
const GRAY700 = '#374151';
const GRAY800 = '#1f2937';
const GREEN = '#059669';
const BLUE = '#2563eb';
const RED = '#e11d48';
const PURPLE = '#7c3aed';

function fmt(value: number | null | undefined, metric: MetricConfig): string {
  if (value === undefined || value === null || isNaN(value as number)) return '—';
  const v = value as number;
  if (metric.isMonetary) return `$${v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (metric.isPercentage) return `${v.toFixed(2)}%`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(v < 10 ? 2 : 0);
}

function htmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<ul[^>]*>/gi, '')
    .replace(/<\/ul>/gi, '')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface Props {
  reportData: ReportData[];
  aiContent: (SingleCampaignAiContent | { error: string; summary: string; analysis: string; conclusions: string } | null)[];
  clientName: string;
  visibleMetrics: Record<string, boolean>;
  allMetrics: MetricConfig[];
  fileName: string | null;
}

const STAT_METRICS = [
  { key: 'amountSpent', label: 'Gasto Total', color: GREEN, format: (v: number) => `$${v.toFixed(2)}` },
  { key: 'results', label: 'Resultados', color: BLUE, format: (v: number) => v.toLocaleString('es-ES') },
  { key: 'impressions', label: 'Impresiones', color: PURPLE, format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString() },
  { key: 'reach', label: 'Alcance', color: ACCENT, format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toString() },
];

const CAMPAIGN_METRICS = [
  { key: 'amountSpent', label: 'Gasto', color: GREEN, isMonetary: true },
  { key: 'results', label: 'Resultados', color: BLUE, isMonetary: false },
  { key: 'costPerResult', label: 'Costo/Result.', color: RED, isMonetary: true },
  { key: 'reach', label: 'Alcance', color: PURPLE, isMonetary: false },
  { key: 'impressions', label: 'Impresiones', color: '#4f46e5', isMonetary: false },
  { key: 'ctr', label: 'CTR', color: '#ea580c', isMonetary: false, isPercentage: true },
  { key: 'linkClicks', label: 'Clics', color: '#0891b2', isMonetary: false },
  { key: 'frequency', label: 'Frec.', color: GRAY500, isMonetary: false },
];

function fmtMetric(value: any, meta: typeof CAMPAIGN_METRICS[0]): string {
  const v = parseFloat(value);
  if (isNaN(v)) return '—';
  if (meta.isMonetary) return `$${v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (meta.isPercentage) return `${v.toFixed(2)}%`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(v < 10 ? 2 : 0);
}

export function PdfReportPage({ reportData, aiContent, clientName, visibleMetrics, allMetrics, fileName }: Props) {
  const selectedMetrics = allMetrics.filter(m => visibleMetrics[m.id]);
  const totals = STAT_METRICS.map(sm => ({
    ...sm,
    value: reportData.reduce((s, r) => s + ((r as any)[sm.key] || 0), 0),
  }));
  const reportDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const overallStart = reportData.length > 0
    ? reportData.reduce((e, c) => new Date(c.startDate) < new Date(e) ? c.startDate : e, reportData[0].startDate)
    : null;
  const overallEnd = reportData.length > 0
    ? reportData.reduce((l, c) => new Date(c.endDate) > new Date(l) ? c.endDate : l, reportData[0].endDate)
    : null;
  const periodStr = overallStart && overallEnd && overallStart !== 'N/A'
    ? `${new Date(overallStart).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – ${new Date(overallEnd).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : null;
  const pageName = reportData[0]?.facebookPageName;

  return (
    <div style={{ width: '816px', backgroundColor: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', color: GRAY800 }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <div style={{ background: `linear-gradient(135deg, ${PRIMARY} 0%, #1a3a9e 100%)`, padding: '40px 56px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: '13px', color: ACCENT, letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>CRM Lite</div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.5px' }}>Reporte Meta Ads</h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
              {clientName || pageName || 'Cliente'}{fileName ? ` · ${fileName}` : ''}
            </p>
            {periodStr && (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '4px 0 0' }}>Período: {periodStr}</p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>Generado el</p>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', margin: 0 }}>{reportDate}</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '8px 0 0' }}>{reportData.length} campaña{reportData.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* ── ACCENT LINE ─────────────────────────────────────────────────────────── */}
      <div style={{ height: '4px', background: `linear-gradient(90deg, ${ACCENT}, #f97316, ${PRIMARY})` }} />

      <div style={{ padding: '40px 56px' }}>

        {/* ── SUMMARY STATS ───────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '40px' }}>
          {totals.map(stat => (
            <div key={stat.key} style={{ backgroundColor: GRAY50, border: `1px solid ${GRAY200}`, borderRadius: '12px', padding: '20px 16px', textAlign: 'center', borderTop: `3px solid ${stat.color}` }}>
              <p style={{ margin: '0 0 6px', fontSize: '11px', color: GRAY500, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</p>
              <p style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: stat.color }}>{stat.format(stat.value)}</p>
            </div>
          ))}
        </div>

        {/* ── CAMPAIGNS TABLE ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: GRAY700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Tabla Comparativa de Campañas
          </h2>
          <div style={{ borderRadius: '10px', overflow: 'hidden', border: `1px solid ${GRAY200}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: PRIMARY }}>
                  <th style={{ padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>CAMPAÑA</th>
                  {selectedMetrics.map(m => (
                    <th key={m.id} style={{ padding: '11px 10px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>{m.label.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${GRAY200}`, backgroundColor: i % 2 === 1 ? GRAY50 : '#fff' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: '12px', color: GRAY800 }}>{row.campaignName}</div>
                      {row.adSetName && <div style={{ fontSize: '11px', color: GRAY500, marginTop: '2px' }}>{row.adSetName}</div>}
                      {row.adName && <div style={{ fontSize: '10px', color: GRAY500, marginTop: '1px' }}>{row.adName}</div>}
                    </td>
                    {selectedMetrics.map(m => (
                      <td key={m.id} style={{ padding: '11px 10px', textAlign: 'right', fontSize: '12px', color: GRAY800, fontWeight: 500 }}>
                        {fmt((row as any)[m.id] ?? 0, m)}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Totals row */}
                <tr style={{ backgroundColor: GRAY100, borderTop: `2px solid ${GRAY300}` }}>
                  <td style={{ padding: '11px 14px', fontWeight: 700, fontSize: '12px', color: PRIMARY }}>TOTALES</td>
                  {selectedMetrics.map(m => {
                    const total = reportData.reduce((s, r) => s + ((r as any)[m.id] || 0), 0);
                    const avg = total / reportData.length;
                    const val = m.isPercentage || m.id === 'frequency' ? avg : total;
                    return (
                      <td key={m.id} style={{ padding: '11px 10px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: PRIMARY }}>
                        {fmt(val, m)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── PER-CAMPAIGN DETAILS ─────────────────────────────────────────────── */}
        {aiContent.some(a => a && !('error' in a)) && (
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: GRAY700, margin: '0 0 20px' }}>
              Análisis IA por Campaña
            </h2>
            {reportData.map((campaign, i) => {
              const ai = aiContent[i];
              if (!ai || 'error' in ai) return null;
              const aiTyped = ai as SingleCampaignAiContent;
              const summaryText = aiTyped.summary ? htmlToText(aiTyped.summary) : '';
              const analysisText = aiTyped.analysis ? htmlToText(aiTyped.analysis) : '';
              const conclusionsText = aiTyped.conclusions ? htmlToText(aiTyped.conclusions) : '';

              return (
                <div key={i} style={{ marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${GRAY200}` }}>
                  {/* Campaign header */}
                  <div style={{ backgroundColor: PRIMARY, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#fff' }}>{campaign.campaignName}</p>
                      {campaign.adSetName && <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>{campaign.adSetName}</p>}
                    </div>
                  </div>

                  {/* Metrics mini-grid */}
                  <div style={{ padding: '16px 20px', backgroundColor: GRAY50, borderBottom: `1px solid ${GRAY200}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
                      {CAMPAIGN_METRICS.map(cm => (
                        <div key={cm.key} style={{ textAlign: 'center', backgroundColor: '#fff', borderRadius: '8px', padding: '8px 4px', border: `1px solid ${GRAY200}` }}>
                          <p style={{ margin: '0 0 4px', fontSize: '9px', color: cm.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{cm.label}</p>
                          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: GRAY800 }}>{fmtMetric((campaign as any)[cm.key], cm)}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* AI content */}
                  <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                    {summaryText && (
                      <div>
                        <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, color: PRIMARY, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resumen</p>
                        <p style={{ margin: 0, fontSize: '11px', color: GRAY600, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{summaryText}</p>
                      </div>
                    )}
                    {analysisText && (
                      <div>
                        <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, color: PRIMARY, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Análisis</p>
                        <p style={{ margin: 0, fontSize: '11px', color: GRAY600, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{analysisText}</p>
                      </div>
                    )}
                    {conclusionsText && (
                      <div>
                        <p style={{ margin: '0 0 6px', fontSize: '10px', fontWeight: 700, color: PRIMARY, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conclusiones</p>
                        <p style={{ margin: 0, fontSize: '11px', color: GRAY600, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{conclusionsText}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: '8px', padding: '20px 56px', borderTop: `3px solid ${ACCENT}`, background: `linear-gradient(90deg, ${GRAY50}, #fff)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: PRIMARY }}>CRM Lite</p>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: GRAY500 }}>Reporte generado automáticamente</p>
        </div>
        <p style={{ margin: 0, fontSize: '11px', color: GRAY500 }}>{reportDate}</p>
      </div>
    </div>
  );
}
