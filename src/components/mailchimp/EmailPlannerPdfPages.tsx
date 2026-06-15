import React, { forwardRef } from 'react';

export interface PlannedEmail {
  id: string;
  subject: string;
  sendDate: string;
  audience: string;
  objective: string;
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

const PRIMARY = '#011b6a';
const ACCENT = '#fa922e';
const GRAY50 = '#f9fafb';
const GRAY200 = '#e5e7eb';
const GRAY500 = '#6b7280';
const GRAY600 = '#4b5563';
const GRAY800 = '#1f2937';

export const PlannerCoverPage = forwardRef<HTMLDivElement, { data: EmailPlanData }>(
  ({ data }, ref) => (
    <div
      ref={ref}
      style={{
        width: '816px', height: '1056px', backgroundColor: '#fff',
        padding: '72px', display: 'flex', flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif', color: GRAY800,
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: `linear-gradient(90deg, ${PRIMARY}, ${ACCENT})` }} />
      <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '320px', height: '320px', borderRadius: '50%', background: `radial-gradient(circle, #dbeafe 0%, transparent 70%)`, opacity: 0.4 }} />
      <div style={{ position: 'absolute', bottom: '-100px', left: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: `radial-gradient(circle, #fef3c7 0%, transparent 70%)`, opacity: 0.3 }} />

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '72px', zIndex: 10 }}>
        <div style={{ fontWeight: 800, fontSize: '22px', color: PRIMARY, letterSpacing: '-0.03em' }}>CRM Lite</div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ fontWeight: 600, color: PRIMARY, fontSize: '14px', letterSpacing: '0.05em', margin: 0 }}>Planificacion de Email Marketing</p>
          <p style={{ fontSize: '12px', color: GRAY500, margin: '4px 0 0' }}>{data.generationDate}</p>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', zIndex: 10 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 16px' }}>
          {data.planTitle || 'Plan de Emails'}
        </p>
        <h1 style={{ fontSize: '56px', fontWeight: 800, color: PRIMARY, margin: '0 0 24px', lineHeight: 1.1, letterSpacing: '-0.03em' }}>
          {data.clientName || 'Cliente'}
        </h1>
        <p style={{ fontSize: '20px', fontWeight: 300, color: GRAY600, maxWidth: '560px', lineHeight: 1.6, margin: 0 }}>
          Planificacion de {data.emails.length} email{data.emails.length !== 1 ? 's' : ''} para el periodo {data.period}.
        </p>
      </main>

      <footer style={{ borderTop: `2px solid ${GRAY200}`, paddingTop: '40px', zIndex: 10 }}>
        <p style={{ color: GRAY500, fontWeight: 600, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 8px' }}>PERIODO</p>
        <p style={{ color: PRIMARY, fontWeight: 700, fontSize: '20px', margin: '0 0 24px' }}>{data.period}</p>
        <p style={{ fontSize: '14px', color: GRAY600, margin: 0 }}>
          <span style={{ fontWeight: 500 }}>Emails Planificados: </span>
          <span style={{ fontWeight: 700 }}>{data.emails.length}</span>
        </p>
      </footer>
    </div>
  )
);
PlannerCoverPage.displayName = 'PlannerCoverPage';

function EmailCard({ email, index }: { email: PlannedEmail; index: number }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'row',
      backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: `1px solid ${GRAY200}`,
    }}>
      <div style={{ width: '6px', backgroundColor: PRIMARY, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', padding: '24px 28px', gap: '32px' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: PRIMARY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{index + 1}</span>
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: PRIMARY, margin: 0, lineHeight: 1.3 }}>{email.subject || 'Sin asunto'}</h3>
          </div>
          {email.sendDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: GRAY500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Fecha de envio:</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: ACCENT }}>{email.sendDate}</span>
            </div>
          )}
          {email.audience && (
            <div><span style={{ fontSize: '11px', fontWeight: 600, color: GRAY500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audiencia: </span><span style={{ fontSize: '13px', color: GRAY800 }}>{email.audience}</span></div>
          )}
          {email.objective && (
            <div><span style={{ fontSize: '11px', fontWeight: 600, color: GRAY500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Objetivo: </span><span style={{ fontSize: '13px', color: GRAY800 }}>{email.objective}</span></div>
          )}
          {email.notes && (
            <div style={{ backgroundColor: GRAY50, borderRadius: '8px', padding: '12px', marginTop: '4px' }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: GRAY500, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>Notas</p>
              <p style={{ fontSize: '12px', color: GRAY600, margin: 0, lineHeight: 1.5 }}>{email.notes}</p>
            </div>
          )}
        </div>
        {email.imageDataUrl && (
          <div style={{ width: '160px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: `1px solid ${GRAY200}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={email.imageDataUrl} alt="Email preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}
      </div>
    </div>
  );
}

export function PlannerEmailDetailPage({ emails, startIndex, pageNumber }: { emails: PlannedEmail[]; startIndex: number; total: number; pageNumber: number }) {
  return (
    <div style={{
      width: '816px', minHeight: '1056px', backgroundColor: '#fff',
      padding: '56px 64px', display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif', gap: '24px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontWeight: 800, fontSize: '18px', color: PRIMARY }}>CRM Lite</div>
        <p style={{ fontSize: '12px', color: GRAY500, margin: 0 }}>Emails Planificados · Pag. {pageNumber}</p>
      </div>
      {emails.map((email, i) => (
        <EmailCard key={email.id} email={email} index={startIndex + i} />
      ))}
      <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: `1px solid ${GRAY200}`, display: 'flex', justifyContent: 'center' }}>
        <p style={{ fontSize: '11px', color: GRAY500, margin: 0 }}>CRM Lite · Plan de Email Marketing</p>
      </div>
    </div>
  );
}
