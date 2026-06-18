import React, { forwardRef } from 'react';
import { Brain } from '@phosphor-icons/react';
import type { ReportData, SingleCampaignAiContent } from '@/types';
import PdfAnalysisSections from './PdfAnalysisSections';
import { getPdfDesignSystem, getPdfBrandConfig, formatDate, type PdfBrand } from '@/lib/pdf-design-system';

interface PdfAnalysisPageProps {
  campaignData: ReportData;
  aiContent: SingleCampaignAiContent | { error: string } | null;
  index: number;
  totalCampaigns: number;
  platform?: 'meta' | 'tiktok' | 'google';
  brand?: PdfBrand;
}

const PdfAnalysisPage = forwardRef<HTMLDivElement, PdfAnalysisPageProps>(
  ({ campaignData, aiContent, index, totalCampaigns, platform = 'meta', brand = 'default' }, ref) => {
    const { colors, typography, spacing, borderRadius, pdf } = getPdfDesignSystem(brand);
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
          padding: '40px 48px',
        }}
      >
        {/* Header */}
        <header style={{ marginBottom: spacing.xl, paddingBottom: spacing.md, borderBottom: `1px solid ${colors.neutral.gray200}` }}>
          <h1 style={{
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.neutral.gray900,
            marginBottom: spacing.sm,
            fontFamily: typography.fontFamily.heading,
          }}>
            Análisis de Rendimiento
          </h1>
          <h2 style={{ fontSize: typography.fontSize.xl, color: colors.neutral.gray600, marginBottom: spacing.md }}>
            {campaignData.adName ? campaignData.adName : campaignData.campaignName}
          </h2>
          <div style={{ fontSize: typography.fontSize.sm, color: colors.neutral.gray500 }}>
            <p style={{ margin: 0 }}>Período: {formatDate(campaignData.startDate)} - {formatDate(campaignData.endDate)}</p>
            <p style={{ margin: 0 }}>Página/Cuenta: {campaignData.facebookPageName}</p>
          </div>
        </header>

        {/* AI Analysis */}
        <section style={{ marginBottom: spacing.xl }}>
          <h3 style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.bold,
            color: colors.neutral.gray900,
            marginBottom: spacing.md,
          }}>
            <Brain size={20} style={{ color: '#8b5cf6', marginRight: spacing.sm }} />
            Análisis de Rendimiento
          </h3>
          <PdfAnalysisSections aiContent={aiContent} />
        </section>

        {/* Footer */}
        <footer style={{ marginTop: 'auto', paddingTop: spacing.lg, borderTop: `1px solid ${colors.neutral.gray200}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: typography.fontSize.sm, color: colors.neutral.gray500 }}>
            <p style={{ margin: 0 }}>{brandConfig.companyName} - Análisis de Rendimiento</p>
            <p style={{ margin: 0 }}>Página {index + 1} de {totalCampaigns}</p>
          </div>
        </footer>
      </div>
    );
  }
);

PdfAnalysisPage.displayName = 'PdfAnalysisPage';
export default PdfAnalysisPage;
