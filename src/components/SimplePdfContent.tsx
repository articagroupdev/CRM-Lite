import React, { forwardRef } from 'react';
import { CurrencyDollar, Users, Eye, Target, TrendUp, ChartBar, CursorClick, ArrowsClockwise } from '@phosphor-icons/react';
import type { ReportData, SingleCampaignAiContent } from '@/types';
import PdfPerformanceChart from './PdfPerformanceChart';
import { ARTICA_DESIGN_SYSTEM, getPdfDesignSystem, getPdfBrandConfig, formatCurrency, formatNumber, formatPercentage, type PdfBrand } from '@/lib/pdf-design-system';

interface SimplePdfContentProps {
  campaignData: ReportData;
  aiContent: SingleCampaignAiContent | { error: string } | null;
  index: number;
  totalCampaigns: number;
  platform?: 'meta' | 'tiktok' | 'google';
  brand?: PdfBrand;
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  description: string;
  borderColor: string;
  iconBgColor: string;
  iconColor: string;
  designSystem: typeof ARTICA_DESIGN_SYSTEM;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, label, value, description, borderColor, iconBgColor, iconColor, designSystem }) => {
  const { colors, typography, spacing, borderRadius, shadows } = designSystem;
  return (
    <div style={{
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: colors.neutral.white,
      padding: spacing.md,
      borderRadius: borderRadius.xl,
      borderLeft: `4px solid ${borderColor}`,
      boxShadow: shadows.md,
    }}>
      <div style={{ position: 'absolute', top: spacing.sm, right: spacing.sm, opacity: 0.1 }}>
        <Icon size={48} style={{ color: borderColor }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing.sm, position: 'relative', zIndex: 10 }}>
        <div style={{ width: '32px', height: '32px', borderRadius: borderRadius.md, backgroundColor: iconBgColor, marginRight: spacing.sm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color: iconColor }} weight="bold" />
        </div>
        <p style={{ fontSize: typography.fontSize.xs, color: colors.neutral.gray600, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: typography.letterSpacing.wide, margin: 0 }}>
          {label}
        </p>
      </div>
      <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.neutral.gray900, marginBottom: spacing.xs, position: 'relative', zIndex: 10 }}>
        {value}
      </p>
      <p style={{ fontSize: typography.fontSize.xs, color: colors.neutral.gray500, marginTop: spacing.sm, lineHeight: typography.lineHeight.tight, position: 'relative', zIndex: 10 }}>
        {description}
      </p>
    </div>
  );
};

const getCampaignObjective = (campaignData: ReportData): string => {
  const objective = (campaignData as any).objective || (campaignData as any).campaignObjective;
  if (objective) {
    const META_OBJECTIVES: Record<string, string> = {
      MESSAGES: 'Mensajes a Whatsapp',
      CONVERSIONS: 'Conversiones',
      LEAD_GENERATION: 'Generación de clientes potenciales',
      LINK_CLICKS: 'Clics en el enlace',
      POST_ENGAGEMENT: 'Interacción con la publicación',
      VIDEO_VIEWS: 'Reproducciones de video',
      REACH: 'Alcance',
      BRAND_AWARENESS: 'Reconocimiento de marca',
    };
    return META_OBJECTIVES[objective] || objective;
  }
  if (campaignData.conversations && campaignData.conversations > 0) return 'Mensajes a Whatsapp';
  if (campaignData.results && campaignData.results > 0) return 'Conversiones';
  return 'Interacción';
};

const SimplePdfContent = forwardRef<HTMLDivElement, SimplePdfContentProps>(
  ({ campaignData, aiContent, index, totalCampaigns, platform = 'meta', brand = 'default' }, ref) => {
    const designSystem = getPdfDesignSystem(brand);
    const brandConfig = getPdfBrandConfig(brand);
    const { colors, typography, spacing, borderRadius, shadows, pdf, gradients } = designSystem;
    const campaignObjective = getCampaignObjective(campaignData);

    return (
      <div
        ref={ref}
        style={{
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          width: `${pdf.pageWidth}px`,
          minHeight: `${pdf.pageHeight}px`,
          backgroundColor: colors.neutral.white,
          fontFamily: typography.fontFamily.sans,
          color: colors.neutral.gray800,
          lineHeight: typography.lineHeight.normal,
          fontSize: typography.fontSize.base,
          padding: '40px 48px',
        }}
      >
        {/* Campaign identification cards */}
        <section style={{ marginBottom: spacing.lg }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: campaignData.adSetName ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
            gap: spacing.base,
          }}>
            {/* Campaign name */}
            <div style={{
              color: 'white',
              display: 'flex',
              alignItems: 'flex-start',
              position: 'relative',
              overflow: 'hidden',
              background: gradients.primary,
              borderRadius: borderRadius.xl,
              padding: spacing.base,
              boxShadow: shadows.lg,
              border: `2px solid ${colors.primary}`,
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '128px', height: '128px', opacity: 0.1, background: 'radial-gradient(circle, white 2px, transparent 2px)', backgroundSize: '20px 20px' }} />
              <div style={{ width: '56px', height: '56px', backgroundColor: colors.neutral.white, color: colors.primary, borderRadius: borderRadius.xl, marginRight: spacing.md, fontSize: typography.fontSize.lg, boxShadow: shadows.md, border: '3px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: typography.fontWeight.bold, flexShrink: 0, position: 'relative', zIndex: 10 }}>01</div>
              <div style={{ flex: 1, position: 'relative', zIndex: 10 }}>
                <p style={{ fontSize: typography.fontSize.xs, opacity: 0.95, textTransform: 'uppercase', letterSpacing: typography.letterSpacing.wide, marginBottom: spacing.sm, fontWeight: typography.fontWeight.semibold, margin: '0 0 8px 0' }}>Nombre de la campaña:</p>
                <p style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.tight, textShadow: '0 1px 2px rgba(0,0,0,0.1)', margin: 0 }}>{campaignData.campaignName}</p>
              </div>
            </div>

            {/* Ad set name */}
            {campaignData.adSetName && (
              <div style={{
                color: 'white',
                display: 'flex',
                alignItems: 'flex-start',
                position: 'relative',
                overflow: 'hidden',
                background: gradients.accent,
                borderRadius: borderRadius.xl,
                padding: spacing.base,
                boxShadow: shadows.lg,
                border: `2px solid ${colors.accent}`,
              }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: '128px', height: '128px', opacity: 0.1, background: 'radial-gradient(circle, white 2px, transparent 2px)', backgroundSize: '20px 20px' }} />
                <div style={{ width: '56px', height: '56px', backgroundColor: colors.neutral.white, color: colors.accent, borderRadius: borderRadius.xl, marginRight: spacing.md, fontSize: typography.fontSize.lg, boxShadow: shadows.md, border: '3px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: typography.fontWeight.bold, flexShrink: 0, position: 'relative', zIndex: 10 }}>02</div>
                <div style={{ flex: 1, position: 'relative', zIndex: 10 }}>
                  <p style={{ fontSize: typography.fontSize.xs, opacity: 0.95, textTransform: 'uppercase', letterSpacing: typography.letterSpacing.wide, marginBottom: spacing.sm, fontWeight: typography.fontWeight.semibold, margin: '0 0 8px 0' }}>Conjunto de anuncios:</p>
                  <p style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.tight, textShadow: '0 1px 2px rgba(0,0,0,0.1)', margin: 0 }}>{campaignData.adSetName}</p>
                </div>
              </div>
            )}

            {/* Objective */}
            <div style={{
              color: 'white',
              display: 'flex',
              alignItems: 'flex-start',
              position: 'relative',
              overflow: 'hidden',
              background: gradients.secondary,
              borderRadius: borderRadius.xl,
              padding: spacing.base,
              boxShadow: shadows.lg,
              border: `2px solid ${colors.secondary}`,
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '128px', height: '128px', opacity: 0.1, background: 'radial-gradient(circle, white 2px, transparent 2px)', backgroundSize: '20px 20px' }} />
              <div style={{ width: '56px', height: '56px', backgroundColor: colors.neutral.white, color: colors.secondary, borderRadius: borderRadius.xl, marginRight: spacing.md, fontSize: typography.fontSize.lg, boxShadow: shadows.md, border: '3px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: typography.fontWeight.bold, flexShrink: 0, position: 'relative', zIndex: 10 }}>{campaignData.adSetName ? '03' : '02'}</div>
              <div style={{ flex: 1, position: 'relative', zIndex: 10 }}>
                <p style={{ fontSize: typography.fontSize.xs, opacity: 0.95, textTransform: 'uppercase', letterSpacing: typography.letterSpacing.wide, marginBottom: spacing.sm, fontWeight: typography.fontWeight.semibold, margin: '0 0 8px 0' }}>Objetivo de campaña:</p>
                <p style={{ fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.base, lineHeight: typography.lineHeight.tight, textShadow: '0 1px 2px rgba(0,0,0,0.1)', margin: 0 }}>{campaignObjective}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics and chart section */}
        <section style={{ marginBottom: spacing.lg }}>
          <div style={{ marginBottom: spacing.md }}>
            <h2 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.neutral.gray900, marginBottom: spacing.xs, fontFamily: typography.fontFamily.heading, margin: '0 0 4px 0' }}>
              Métricas y Gráficos
            </h2>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.neutral.gray600, margin: 0 }}>
              Métricas clave y visualización del rendimiento a lo largo del tiempo.
            </p>
          </div>

          {/* 8 KPI cards in 4x2 grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing.md, marginBottom: spacing.md }}>
            {/* Importe Gastado */}
            <div style={{ position: 'relative', overflow: 'hidden', backgroundColor: colors.neutral.white, padding: spacing.md, borderRadius: borderRadius.xl, borderLeft: `4px solid ${colors.semantic.success}`, boxShadow: shadows.md }}>
              <div style={{ position: 'absolute', top: spacing.sm, right: spacing.sm, opacity: 0.1 }}><CurrencyDollar size={48} style={{ color: colors.semantic.success }} /></div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing.sm, position: 'relative', zIndex: 10 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: borderRadius.md, backgroundColor: colors.semantic.successLight, marginRight: spacing.sm, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CurrencyDollar size={16} style={{ color: colors.semantic.success }} weight="bold" />
                </div>
                <p style={{ fontSize: typography.fontSize.xs, color: colors.neutral.gray600, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: typography.letterSpacing.wide, margin: 0 }}>Importe Gastado</p>
              </div>
              <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.neutral.gray900, margin: '0 0 4px 0', position: 'relative', zIndex: 10 }}>{formatCurrency(campaignData.amountSpent)}</p>
              <p style={{ fontSize: typography.fontSize.xs, color: colors.neutral.gray500, marginTop: spacing.sm, lineHeight: typography.lineHeight.tight, position: 'relative', zIndex: 10, margin: 0 }}>Costo total de la campaña/anuncio.</p>
            </div>

            <MetricCard icon={Users} label="Alcance" value={formatNumber(campaignData.reach)} description="Número de personas únicas alcanzadas." borderColor={colors.semantic.info} iconBgColor={colors.semantic.infoLight} iconColor={colors.semantic.info} designSystem={designSystem} />
            <MetricCard icon={Eye} label="Impresiones" value={formatNumber(campaignData.impressions)} description="Total de veces que se mostraron los anuncios." borderColor="#8b5cf6" iconBgColor="#ede9fe" iconColor="#8b5cf6" designSystem={designSystem} />
            <MetricCard icon={ArrowsClockwise} label="Frecuencia" value={(campaignData.frequency || 0).toFixed(2)} description="Promedio de veces que cada persona vio el anuncio." borderColor={colors.semantic.warning} iconBgColor={colors.semantic.warningLight} iconColor={colors.semantic.warning} designSystem={designSystem} />
            <MetricCard icon={Target} label="Resultados" value={formatNumber(campaignData.results)} description="Total de resultados obtenidos." borderColor={colors.semantic.error} iconBgColor={colors.semantic.errorLight} iconColor={colors.semantic.error} designSystem={designSystem} />
            <MetricCard icon={TrendUp} label="Costo por resultado" value={formatCurrency(campaignData.costPerResult)} description="Costo promedio por cada resultado." borderColor="#ec4899" iconBgColor="#fce7f3" iconColor="#ec4899" designSystem={designSystem} />
            <MetricCard icon={CursorClick} label="Clics en Enlace" value={formatNumber(campaignData.linkClicks)} description="Total de clics en los enlaces de los anuncios." borderColor="#06b6d4" iconBgColor="#cffafe" iconColor="#06b6d4" designSystem={designSystem} />
            <MetricCard icon={ChartBar} label="CTR (Enlace)" value={formatPercentage(campaignData.ctr)} description="Porcentaje de clics en el enlace (Clics/Impresiones)." borderColor={colors.accent} iconBgColor={colors.accentLighter} iconColor={colors.accent} designSystem={designSystem} />
          </div>

          {/* Chart */}
          <div style={{ backgroundColor: colors.neutral.white, padding: spacing.md, borderRadius: borderRadius.lg, border: `1px solid ${colors.neutral.gray200}`, boxShadow: shadows.sm }}>
            <PdfPerformanceChart campaignData={campaignData} dailyData={campaignData.dailyEntries} fullWidth={true} />
          </div>
        </section>

        {/* Footer */}
        <footer style={{ marginTop: 'auto', paddingTop: spacing.md, borderTop: `1px solid ${colors.neutral.gray200}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: typography.fontSize.xs, color: colors.neutral.gray500 }}>
            <p style={{ margin: 0 }}>{brandConfig.companyName} - Análisis de Rendimiento</p>
            <p style={{ margin: 0 }}>Página {index + 1} de {totalCampaigns}</p>
          </div>
        </footer>
      </div>
    );
  }
);

SimplePdfContent.displayName = 'SimplePdfContent';
export default SimplePdfContent;
