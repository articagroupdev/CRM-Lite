import React, { forwardRef } from 'react';
import { InstagramLogo, Globe, LinkedinLogo } from '@phosphor-icons/react';
import { getPdfDesignSystem, getPdfBrandConfig, type PdfBrand } from '@/lib/pdf-design-system';

interface PdfFooterPageProps {
  platform?: 'meta' | 'tiktok' | 'google';
  brand?: PdfBrand;
  logoSrc?: string;
}

const PdfFooterPage = forwardRef<HTMLDivElement, PdfFooterPageProps>(
  ({ platform = 'meta', brand = 'default', logoSrc }, ref) => {
    const designSystem = getPdfDesignSystem(brand);
    const brandConfig = getPdfBrandConfig(brand);
    const { colors, typography, spacing, shadows, pdf, gradients } = designSystem;

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
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {/* Top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: gradients.primary, zIndex: 1 }} />
        {/* Right accent bar */}
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '4px', height: '100%', background: gradients.accent, zIndex: 1 }} />

        {/* Background decorative circles */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '350px', height: '350px', borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.primaryLighter} 0%, transparent 70%)`,
          opacity: 0.25, zIndex: 0,
        }} />
        <div style={{
          position: 'absolute', bottom: '-120px', left: '-120px',
          width: '450px', height: '450px', borderRadius: '50%',
          background: `radial-gradient(circle, ${colors.accentLighter} 0%, transparent 70%)`,
          opacity: 0.2, zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
          {/* Logo */}
          <div style={{ marginBottom: spacing['2xl'], filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={brandConfig.companyName}
                style={{ width: '320px', height: 'auto', maxHeight: '160px', objectFit: 'contain' }}
              />
            ) : (
              <span style={{ fontWeight: typography.fontWeight.bold, color: colors.primary, fontSize: typography.fontSize['3xl'] }}>
                {brandConfig.companyName}
              </span>
            )}
          </div>

          {/* Thank you text */}
          <p style={{
            fontSize: typography.fontSize.xl,
            fontWeight: typography.fontWeight.light,
            color: colors.neutral.gray600,
            marginBottom: spacing['4xl'],
            textAlign: 'center',
            maxWidth: '500px',
            lineHeight: typography.lineHeight.relaxed,
          }}>
            {brand === '4101'
              ? 'Gracias por confiar en 4101 Media para el análisis de tus campañas publicitarias.'
              : 'Gracias por confiar en Artica Group para el análisis de tus campañas publicitarias.'}
          </p>

          {/* Social links (only for default brand) */}
          {brand !== '4101' && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '40px', marginTop: spacing['2xl'] }}>
              {/* Instagram */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.sm, textDecoration: 'none' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #E4405F 0%, #C13584 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: shadows.lg,
                }}>
                  <InstagramLogo size={32} weight="fill" color="#ffffff" />
                </div>
                <span style={{ fontSize: typography.fontSize.sm, color: colors.neutral.gray700, fontWeight: typography.fontWeight.semibold, letterSpacing: typography.letterSpacing.wide }}>
                  @artica_group
                </span>
              </div>

              {/* Website */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.sm }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: gradients.primary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: shadows.lg,
                }}>
                  <Globe size={32} weight="fill" color="#ffffff" />
                </div>
                <span style={{ fontSize: typography.fontSize.sm, color: colors.neutral.gray700, fontWeight: typography.fontWeight.semibold, letterSpacing: typography.letterSpacing.wide }}>
                  articagroup.us
                </span>
              </div>

              {/* LinkedIn */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing.sm }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0077B5 0%, #004182 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: shadows.lg,
                }}>
                  <LinkedinLogo size={32} weight="fill" color="#ffffff" />
                </div>
                <span style={{ fontSize: typography.fontSize.sm, color: colors.neutral.gray700, fontWeight: typography.fontWeight.semibold, letterSpacing: typography.letterSpacing.wide }}>
                  LinkedIn
                </span>
              </div>
            </div>
          )}

          {/* Footer text */}
          <div style={{
            marginTop: spacing['4xl'],
            paddingTop: spacing.xl,
            borderTop: `1px solid ${colors.neutral.gray200}`,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: typography.fontSize.sm, color: colors.neutral.gray500, margin: 0, marginBottom: spacing.xs }}>
              {brandConfig.footerText}
            </p>
            <p style={{ fontSize: typography.fontSize.xs, color: colors.neutral.gray400, margin: 0 }}>
              {new Date().getFullYear()} © Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    );
  }
);

PdfFooterPage.displayName = 'PdfFooterPage';
export default PdfFooterPage;
