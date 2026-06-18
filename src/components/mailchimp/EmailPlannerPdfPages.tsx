import React, { forwardRef } from 'react';
import { getPdfDesignSystem, getPdfBrandConfig, type PdfBrand } from '@/lib/pdf-design-system';
import { PencilSimpleLine, CalendarBlank, NotePencil } from '@phosphor-icons/react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlannedEmail {
  id: string;
  subject: string;
  sendDate: string;
  notes: string;
  imageDataUrl: string | null;
}

export interface EmailPlanData {
  clientName: string;
  planTitle: string;
  period: string;
  generationDate: string;
  emails: PlannedEmail[];
}

// ─── Cover Page ───────────────────────────────────────────────────────────────

interface CoverProps {
  data: EmailPlanData;
  brand?: PdfBrand;
  logoSrc?: string;
}

export const PlannerCoverPage = forwardRef<HTMLDivElement, CoverProps>(
  ({ data, brand = 'default', logoSrc }, ref) => {
    const ds = getPdfDesignSystem(brand);
    const brandConfig = getPdfBrandConfig(brand);
    const { colors, typography, spacing, pdf, gradients } = ds;

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
        {/* Accent bars */}
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: gradients.primary }} />
        <div style={{ position: 'absolute', bottom: 0, right: 0, width: '4px', height: '100%', background: gradients.accent }} />

        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: `radial-gradient(circle, ${colors.primaryLighter} 0%, transparent 70%)`, opacity: 0.3 }} />
        <div style={{ position: 'absolute', bottom: '-150px', left: '-150px', width: '500px', height: '500px', borderRadius: '50%', background: `radial-gradient(circle, ${colors.accentLighter} 0%, transparent 70%)`, opacity: 0.2 }} />

        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '72px' }}>
            {logoSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoSrc}
                alt={brandConfig.companyName}
                style={{ width: '220px', height: '66px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
              />
            ) : (
              <span style={{ fontWeight: typography.fontWeight.bold, color: colors.primary, fontSize: typography.fontSize['2xl'] }}>
                {brandConfig.companyName}
              </span>
            )}
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: typography.fontWeight.semibold, color: colors.primary, fontSize: typography.fontSize.lg, letterSpacing: typography.letterSpacing.wide, marginBottom: spacing.xs }}>
                Planificación de Email Marketing
              </p>
              <p style={{ fontSize: typography.fontSize.sm, color: colors.neutral.gray500, marginTop: spacing.xs }}>
                {data.generationDate}
              </p>
            </div>
          </div>

          {/* Main */}
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '56px', paddingBottom: '56px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: spacing.base }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: colors.secondary, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarBlank size={18} weight="bold" color="#ffffff" />
              </div>
              <p style={{ fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.light, letterSpacing: typography.letterSpacing.widest, textTransform: 'uppercase', color: colors.secondary, margin: 0 }}>
                {data.planTitle || 'Plan de Emails'}
              </p>
            </div>
            <h1 style={{ fontSize: typography.fontSize['7xl'], fontWeight: typography.fontWeight.bold, lineHeight: typography.lineHeight.tight, color: colors.primary, marginBottom: spacing.xl, letterSpacing: typography.letterSpacing.tighter }}>
              {data.clientName || 'Cliente'}
            </h1>
            <p style={{ fontSize: typography.fontSize['2xl'], fontWeight: typography.fontWeight.light, color: colors.neutral.gray600, maxWidth: '620px', lineHeight: typography.lineHeight.relaxed, marginTop: spacing.sm }}>
              Planificación detallada de {data.emails.length} email{data.emails.length !== 1 ? 's' : ''} para el periodo {data.period}, preparada por {brandConfig.companyName}.
            </p>
          </div>

          {/* Footer */}
          <div style={{ textAlign: 'left', paddingTop: '56px', borderTop: `2px solid ${colors.neutral.gray200}` }}>
            <p style={{ color: colors.neutral.gray500, fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.lg, letterSpacing: typography.letterSpacing.wide, textTransform: 'uppercase', marginBottom: spacing.base }}>
              PERIODO:
            </p>
            <p style={{ color: colors.primary, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize['2xl'], marginTop: spacing.sm, marginBottom: spacing.xl }}>
              {data.period}
            </p>
            <div style={{ display: 'flex', gap: '48px', fontSize: typography.fontSize.base, color: colors.neutral.gray600, fontWeight: typography.fontWeight.medium }}>
              <p>
                <span style={{ fontWeight: typography.fontWeight.medium }}>Emails Planificados: </span>
                <span style={{ fontWeight: typography.fontWeight.bold }}>{data.emails.length}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
PlannerCoverPage.displayName = 'PlannerCoverPage';

// ─── Email Card (inside detail pages) ────────────────────────────────────────

interface EmailCardProps {
  email: PlannedEmail;
  index: number;
  total: number;
  brand?: PdfBrand;
}

function EmailCard({ email, index, brand = 'default' }: EmailCardProps) {
  const ds = getPdfDesignSystem(brand);
  const { colors, typography } = ds;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'row',
      backgroundColor: colors.neutral.white,
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      border: `1px solid ${colors.neutral.gray200}`,
    }}>
      {/* Left accent bar */}
      <div style={{ width: '8px', backgroundColor: colors.primary, flexShrink: 0 }} />

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', padding: '28px 32px', gap: '40px' }}>
        {/* Left – Info */}
        <div style={{ width: email.imageDataUrl ? '280px' : '100%', display: 'flex', flexDirection: 'column', flexShrink: 0, justifyContent: 'center', gap: '20px' }}>
          {/* Subject */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <PencilSimpleLine size={18} weight="regular" color={colors.primary} style={{ flexShrink: 0, marginTop: '3px' }} />
            <div>
              <p style={{ fontSize: '12px', color: colors.primary, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.03em', margin: '0 0 6px 0' }}>
                ASUNTO:
              </p>
              <p style={{ fontSize: '15px', color: colors.neutral.gray800, fontWeight: typography.fontWeight.semibold, margin: 0, lineHeight: 1.45 }}>
                {email.subject || 'Sin asunto'}
              </p>
            </div>
          </div>

          {/* Send date */}
          {email.sendDate && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <CalendarBlank size={18} weight="regular" color={colors.primary} style={{ flexShrink: 0, marginTop: '3px' }} />
              <div>
                <p style={{ fontSize: '12px', color: colors.primary, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.03em', margin: '0 0 6px 0' }}>
                  FECHA DE ENVÍO:
                </p>
                <p style={{ fontSize: '15px', color: colors.neutral.gray800, fontWeight: typography.fontWeight.medium, margin: 0 }}>
                  {email.sendDate}
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {email.notes && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <NotePencil size={18} weight="regular" color={colors.primary} style={{ flexShrink: 0, marginTop: '3px' }} />
              <div>
                <p style={{ fontSize: '12px', color: colors.primary, fontWeight: typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: '0.03em', margin: '0 0 6px 0' }}>
                  NOTA:
                </p>
                <p style={{ fontSize: '13px', color: colors.neutral.gray700, lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {email.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right – Image */}
        {email.imageDataUrl && (
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', minWidth: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={email.imageDataUrl}
              alt={email.subject}
              style={{ maxWidth: '100%', width: 'auto', height: 'auto', display: 'block', maxHeight: '400px', objectFit: 'contain', borderRadius: '10px', boxShadow: '0 6px 24px rgba(0,0,0,0.12)' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Detail Page (2 emails per page) ─────────────────────────────────────────

interface DetailPageProps {
  emails: PlannedEmail[];
  startIndex: number;
  total: number;
  pageNumber: number;
  brand?: PdfBrand;
}

export function PlannerEmailDetailPage({ emails, startIndex, total, pageNumber, brand = 'default' }: DetailPageProps) {
  const ds = getPdfDesignSystem(brand);
  const { colors, typography } = ds;

  return (
    <div style={{
      boxSizing: 'border-box',
      width: `${ds.pdf.pageWidth}px`,
      height: `${ds.pdf.pageHeight}px`,
      backgroundColor: '#f0f4f8',
      fontFamily: typography.fontFamily.sans,
      color: colors.neutral.gray800,
      padding: '32px 40px',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '5px', background: `linear-gradient(90deg, ${colors.primary} 0%, ${colors.secondary} 100%)` }} />

      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', marginBottom: '20px', borderBottom: `2px solid ${colors.neutral.gray200}`, flexShrink: 0 }}>
        <p style={{ fontSize: '14px', color: colors.primary, fontWeight: typography.fontWeight.bold, margin: 0, letterSpacing: '0.02em' }}>
          Planificación de Email Marketing
        </p>
        <p style={{ fontSize: '12px', color: colors.neutral.gray500, margin: 0, fontWeight: typography.fontWeight.medium }}>
          Página {pageNumber}
        </p>
      </div>

      {/* Email cards */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 0 }}>
        {emails.map((email, idx) => (
          <EmailCard key={email.id} email={email} index={startIndex + idx} total={total} brand={brand} />
        ))}
      </div>

      {/* Page footer */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px', marginTop: '20px', borderTop: `2px solid ${colors.neutral.gray200}`, flexShrink: 0 }}>
        <p style={{ fontSize: '11px', color: colors.neutral.gray400, margin: 0, letterSpacing: '0.03em' }}>
          Artica Group — Planificación de Email Marketing
        </p>
      </div>
    </div>
  );
}
