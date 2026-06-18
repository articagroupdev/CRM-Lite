import React, { forwardRef } from 'react';
import { CurrencyDollar, Users, Eye, Target, TrendUp, ChartBar, CursorClick, ArrowsClockwise, Calendar, Building } from '@phosphor-icons/react';
import type { ReportData } from '@/types';
import PdfPerformanceChart from './PdfPerformanceChart';
import { getPdfDesignSystem, getPdfBrandConfig, formatCurrency, formatNumber, formatPercentage, formatDate, type PdfBrand } from '@/lib/pdf-design-system';

interface PdfAccountSummaryPageProps {
  reportData: ReportData[];
  overallStartDate: string;
  overallEndDate: string;
  mainFacebookPageName: string;
  platform?: 'meta' | 'tiktok' | 'google';
  brand?: PdfBrand;
}

const PdfAccountSummaryPage = forwardRef<HTMLDivElement, PdfAccountSummaryPageProps>(
  ({ reportData, overallStartDate, overallEndDate, mainFacebookPageName, platform = 'meta', brand = 'default' }, ref) => {
    const totalAmountSpent = reportData.reduce((s, c) => s + (c.amountSpent || 0), 0);
    const totalReach = reportData.reduce((s, c) => s + (c.reach || 0), 0);
    const totalImpressions = reportData.reduce((s, c) => s + (c.impressions || 0), 0);
    const totalResults = reportData.reduce((s, c) => s + (c.results || 0), 0);
    const totalLinkClicks = reportData.reduce((s, c) => s + (c.linkClicks || 0), 0);
    const totalConversations = reportData.reduce((s, c) => s + (c.conversations || 0), 0);
    const averageFrequency = reportData.length > 0 ? reportData.reduce((s, c) => s + (c.frequency || 0), 0) / reportData.length : 0;
    const averageCTR = reportData.length > 0 ? reportData.reduce((s, c) => s + (c.ctr || 0), 0) / reportData.length : 0;
    const averageCostPerResult = totalResults > 0 ? totalAmountSpent / totalResults : 0;
    const uniqueCampaigns = new Set(reportData.map(c => c.campaignName)).size;
    const totalAds = reportData.length;

    const dailyDataMap = new Map<string, { date: string; impressions: number; reach: number; results: number; amountSpent: number; linkClicks: number }>();
    reportData.forEach(campaign => {
      campaign.dailyEntries?.forEach(day => {
        const existing = dailyDataMap.get(day.date);
        if (existing) {
          existing.impressions += day.impressions || 0;
          existing.reach += day.reach || 0;
          existing.results += day.results || 0;
          existing.amountSpent += day.amountSpent || 0;
          existing.linkClicks += day.linkClicks || 0;
        } else {
          dailyDataMap.set(day.date, { date: day.date, impressions: day.impressions || 0, reach: day.reach || 0, results: day.results || 0, amountSpent: day.amountSpent || 0, linkClicks: day.linkClicks || 0 });
        }
      });
    });
    const combinedDailyEntries = Array.from(dailyDataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const combinedReportData: ReportData = {
      facebookPageName: mainFacebookPageName,
      campaignName: 'Resumen General',
      startDate: overallStartDate,
      endDate: overallEndDate,
      reach: totalReach,
      impressions: totalImpressions,
      results: totalResults,
      amountSpent: totalAmountSpent,
      linkClicks: totalLinkClicks,
      conversations: totalConversations,
      frequency: averageFrequency,
      ctr: averageCTR,
      costPerResult: averageCostPerResult,
      dailyEntries: combinedDailyEntries,
    };

    const { colors, typography, spacing, borderRadius, shadows, pdf } = getPdfDesignSystem(brand);
    const brandConfig = getPdfBrandConfig(brand);

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
        {/* Header */}
        <header style={{ marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottom: `2px solid ${colors.secondary}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: borderRadius.lg, backgroundColor: colors.primary, marginRight: spacing.sm, boxShadow: shadows.md, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building size={20} style={{ color: colors.neutral.white }} weight="bold" />
              </div>
              <div>
                <h1 style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.neutral.gray900, fontFamily: typography.fontFamily.heading, margin: 0 }}>
                  Resumen General de la Cuenta
                </h1>
                <p style={{ fontSize: typography.fontSize.xs, color: colors.neutral.gray600, margin: 0, marginTop: '2px' }}>{mainFacebookPageName}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: typography.fontSize.xs, color: colors.neutral.gray600 }}>
              <Calendar size={14} style={{ color: colors.secondary, marginRight: spacing.xs }} />
              <span>{formatDate(overallStartDate, 'short')} - {formatDate(overallEndDate, 'short')}</span>
            </div>
          </div>
        </header>

        {/* Summary cards */}
        <section style={{ marginBottom: spacing.md }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: spacing.sm, marginBottom: spacing.sm }}>
            {[
              { icon: ChartBar, label: 'Campañas', value: uniqueCampaigns, borderColor: colors.primary, bg: colors.primaryLighter, iconColor: colors.primary },
              { icon: Target, label: 'Anuncios', value: totalAds, borderColor: colors.secondary, bg: colors.secondaryLighter, iconColor: colors.secondary },
              { icon: CurrencyDollar, label: 'Inversión Total', value: formatCurrency(totalAmountSpent), borderColor: colors.accent, bg: colors.accentLighter, iconColor: colors.accent },
            ].map(({ icon: Icon, label, value, borderColor, bg, iconColor }) => (
              <div key={label} style={{ padding: spacing.sm, borderRadius: borderRadius.lg, borderLeft: `3px solid ${borderColor}`, backgroundColor: bg, boxShadow: shadows.sm }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing.xs }}>
                  <Icon size={16} style={{ color: iconColor }} weight="bold" />
                  <p style={{ fontSize: typography.fontSize.xs, fontWeight: typography.fontWeight.semibold, color: colors.neutral.gray700, textTransform: 'uppercase', marginLeft: spacing.xs, margin: '0 0 0 8px' }}>{label}</p>
                </div>
                <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.neutral.gray900, margin: 0, marginTop: spacing.xs }}>{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Main metrics */}
        <section style={{ marginBottom: spacing.md }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.neutral.gray900, marginBottom: spacing.sm, margin: '0 0 8px 0' }}>Métricas Principales</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing.sm, marginBottom: spacing.sm }}>
            {[
              { icon: CurrencyDollar, label: 'Importe Gastado', value: formatCurrency(totalAmountSpent), border: '#10b981', bg: '#d1fae5', iconColor: '#10b981' },
              { icon: Users, label: 'Alcance Total', value: formatNumber(totalReach), border: '#3b82f6', bg: '#dbeafe', iconColor: '#3b82f6' },
              { icon: Eye, label: 'Impresiones', value: formatNumber(totalImpressions), border: '#8b5cf6', bg: '#ede9fe', iconColor: '#8b5cf6' },
              { icon: Target, label: 'Resultados', value: formatNumber(totalResults), border: '#ef4444', bg: '#fee2e2', iconColor: '#ef4444' },
            ].map(({ icon: Icon, label, value, border, bg, iconColor }) => (
              <div key={label} style={{ padding: spacing.sm, borderRadius: borderRadius.lg, borderLeft: `3px solid ${border}`, backgroundColor: colors.neutral.white, boxShadow: shadows.sm }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing.xs }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: borderRadius.md, backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: spacing.xs }}>
                    <Icon size={12} style={{ color: iconColor }} weight="bold" />
                  </div>
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.neutral.gray600, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', margin: 0 }}>{label}</p>
                </div>
                <p style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.neutral.gray900, margin: 0, marginTop: spacing.xs }}>{value}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: spacing.sm }}>
            {[
              { icon: CursorClick, label: 'Clics en Enlace', value: formatNumber(totalLinkClicks), border: '#06b6d4', bg: '#cffafe', iconColor: '#06b6d4' },
              { icon: ArrowsClockwise, label: 'Frecuencia Promedio', value: averageFrequency.toFixed(2), border: '#f59e0b', bg: '#fef3c7', iconColor: '#f59e0b' },
              { icon: TrendUp, label: 'Costo por Resultado', value: formatCurrency(averageCostPerResult), border: '#ec4899', bg: '#fce7f3', iconColor: '#ec4899' },
              { icon: ChartBar, label: 'CTR Promedio', value: formatPercentage(averageCTR), border: '#fa922e', bg: '#fff3e8', iconColor: '#fa922e' },
            ].map(({ icon: Icon, label, value, border, bg, iconColor }) => (
              <div key={label} style={{ padding: spacing.sm, borderRadius: borderRadius.lg, borderLeft: `3px solid ${border}`, backgroundColor: colors.neutral.white, boxShadow: shadows.sm }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: spacing.xs }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: borderRadius.md, backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: spacing.xs }}>
                    <Icon size={12} style={{ color: iconColor }} weight="bold" />
                  </div>
                  <p style={{ fontSize: typography.fontSize.xs, color: colors.neutral.gray600, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', margin: 0 }}>{label}</p>
                </div>
                <p style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.neutral.gray900, margin: 0, marginTop: spacing.xs }}>{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Combined chart */}
        <section style={{ marginBottom: spacing.sm, flex: 1 }}>
          <h2 style={{ fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.bold, color: colors.neutral.gray900, marginBottom: spacing.sm, margin: '0 0 8px 0' }}>Rendimiento General</h2>
          <div style={{ backgroundColor: colors.neutral.white, padding: spacing.sm, borderRadius: borderRadius.lg, border: `1px solid ${colors.neutral.gray200}`, boxShadow: shadows.sm }}>
            <PdfPerformanceChart campaignData={combinedReportData} dailyData={combinedDailyEntries} fullWidth={true} />
          </div>
        </section>

        {/* Footer */}
        <footer style={{ marginTop: 'auto', paddingTop: spacing.sm, borderTop: `1px solid ${colors.neutral.gray200}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: typography.fontSize.xs, color: colors.neutral.gray500 }}>
            <p style={{ margin: 0 }}>{brandConfig.companyName} - Resumen General de la Cuenta</p>
            <p style={{ margin: 0 }}>{new Date().toLocaleDateString('es-ES')}</p>
          </div>
        </footer>
      </div>
    );
  }
);

PdfAccountSummaryPage.displayName = 'PdfAccountSummaryPage';
export default PdfAccountSummaryPage;
