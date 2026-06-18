import React, { forwardRef } from 'react';
import { getPdfDesignSystem, getPdfBrandConfig, type PdfBrand } from '@/lib/pdf-design-system';

interface PdfCoverPageProps {
  clientName: string;
  generationDate: string;
  analysisPeriod: string;
  campaignsAnalyzed: number;
  adsAnalyzed: number;
  platform?: 'meta' | 'tiktok';
  brand?: PdfBrand;
  logoSrc?: string;
}

const PdfCoverPage = forwardRef<HTMLDivElement, PdfCoverPageProps>(
  ({ clientName, generationDate, analysisPeriod, campaignsAnalyzed, adsAnalyzed, platform = 'meta', brand = 'default', logoSrc }, ref) => {
    const designSystem = getPdfDesignSystem(brand);
    const brandConfig = getPdfBrandConfig(brand);
    const { colors, typography, spacing, pdf, gradients } = designSystem;

    return (
      <div
        ref={ref}
        style={{
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          width: `${pdf.pageWidth}px`,
          height: `${pdf.pageHeight}px`,
          backgroundColor: colors.neutral.white,
          padding: '80px 72px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: typography.fontFamily.sans,
          color: colors.neutral.gray800,
        }}
      >
        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: gradients.primary }} />
        {/* Right accent bar */}
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '4px', height: '100%', background: gradients.accent }} />

        {/* Background decorative circles */}
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.primaryLighter} 0%, transparent 70%)`,
          opacity: 0.3,
        }} />
        <div style={{
          position: 'absolute', bottom: '-150px', left: '-150px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.accentLighter} 0%, transparent 70%)`,
          opacity: 0.2,
        }} />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '72px' }}>
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={brandConfig.companyName}
                style={{ width: '240px', height: 'auto', maxHeight: '120px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
              />
            ) : (
              <div style={{ width: '220px', height: '66px', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontWeight: typography.fontWeight.bold, color: colors.primary, fontSize: typography.fontSize['2xl'] }}>
                  {brandConfig.companyName}
                </span>
              </div>
            )}
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontFamily: typography.fontFamily.heading,
                fontWeight: typography.fontWeight.semibold,
                color: colors.primary,
                fontSize: typography.fontSize.lg,
                letterSpacing: typography.letterSpacing.wide,
                marginBottom: spacing.xs,
              }}>
                Reporte de Rendimiento
              </p>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.neutral.gray500, marginTop: spacing.xs }}>
                {generationDate}
              </p>
            </div>
          </div>

          {/* Main content */}
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'left', paddingTop: '56px', paddingBottom: '56px' }}>
            <p style={{
              fontSize: typography.fontSize.xl,
              fontWeight: typography.fontWeight.light,
              letterSpacing: typography.letterSpacing.widest,
              textTransform: 'uppercase',
              color: colors.accent,
              marginBottom: spacing.base,
            }}>
              Análisis de Campañas de {platform === 'meta' ? 'Meta Ads' : 'TikTok Ads'}
              {brand === '4101' ? ' (4101 Media)' : ''}
            </p>
            <h1 style={{
              fontSize: typography.fontSize['7xl'],
              fontWeight: typography.fontWeight.bold,
              lineHeight: typography.lineHeight.tight,
              color: colors.primary,
              marginBottom: spacing.xl,
              letterSpacing: typography.letterSpacing.tighter,
              textShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}>
              {clientName || 'Cliente'}
            </h1>
            <p style={{
              fontSize: typography.fontSize['2xl'],
              fontWeight: typography.fontWeight.light,
              color: colors.neutral.gray600,
              maxWidth: '620px',
              lineHeight: typography.lineHeight.relaxed,
              marginTop: spacing.sm,
            }}>
              Un análisis detallado del rendimiento de las campañas, preparado por {brandConfig.companyName}.
            </p>
          </div>

          {/* Footer */}
          <div style={{
            textAlign: 'left',
            paddingTop: '56px',
            zIndex: 10,
            borderTop: `2px solid ${colors.neutral.gray200}`,
          }}>
            <p style={{
              color: colors.neutral.gray500,
              fontWeight: typography.fontWeight.semibold,
              fontSize: typography.fontSize.lg,
              letterSpacing: typography.letterSpacing.wide,
              textTransform: 'uppercase',
              marginBottom: spacing.base,
            }}>
              PERIODO ANALIZADO:
            </p>
            <p style={{
              color: colors.primary,
              fontWeight: typography.fontWeight.bold,
              fontSize: typography.fontSize['2xl'],
              marginTop: spacing.sm,
              marginBottom: spacing.xl,
            }}>
              {analysisPeriod}
            </p>
            <div style={{
              display: 'flex',
              gap: '48px',
              marginTop: spacing.xl,
              fontSize: typography.fontSize.base,
              color: colors.neutral.gray600,
              fontWeight: typography.fontWeight.medium,
            }}>
              {campaignsAnalyzed > 0 && (
                <p>
                  <span style={{ fontWeight: typography.fontWeight.medium }}>Campañas Analizadas:</span>{' '}
                  <span style={{ fontWeight: typography.fontWeight.bold }}>{campaignsAnalyzed}</span>
                </p>
              )}
              {adsAnalyzed > 0 && (
                <p>
                  <span style={{ fontWeight: typography.fontWeight.medium }}>Anuncios Analizados:</span>{' '}
                  <span style={{ fontWeight: typography.fontWeight.bold }}>{adsAnalyzed}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PdfCoverPage.displayName = 'PdfCoverPage';
export default PdfCoverPage;
