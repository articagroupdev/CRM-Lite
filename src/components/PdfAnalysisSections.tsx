import React from 'react';
import { Brain, ChartBar, Target, TrendUp } from '@phosphor-icons/react';
import type { SingleCampaignAiContent } from '@/types';

interface PdfAnalysisSectionsProps {
  aiContent: SingleCampaignAiContent | { error: string } | null;
  compact?: boolean;
}

function PlainText({ content }: { content: string }) {
  if (!content) return null;
  const cleaned = content
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return (
    <p style={{ fontSize: '13px', color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
      {cleaned}
    </p>
  );
}

export default function PdfAnalysisSections({ aiContent, compact = false }: PdfAnalysisSectionsProps) {
  const hasError = aiContent && 'error' in aiContent;
  const hasAiContent = aiContent && !hasError;

  if (hasError) {
    return (
      <div style={{ backgroundColor: '#fef2f2', padding: '24px', borderRadius: '8px', border: '1px solid #fecaca' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ width: '32px', height: '32px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px' }}>
            <Brain size={16} color="#dc2626" />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#991b1b', margin: 0 }}>Error en el Análisis</h3>
        </div>
        <p style={{ color: '#b91c1c', fontSize: '13px', margin: 0 }}>{(aiContent as any).error}</p>
      </div>
    );
  }

  if (!hasAiContent) {
    return (
      <div style={{ backgroundColor: '#f9fafb', padding: '24px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
        <p style={{ color: '#6b7280', textAlign: 'center', margin: 0 }}>Análisis de rendimiento no disponible</p>
      </div>
    );
  }

  const content = aiContent as SingleCampaignAiContent;
  const sections = [
    { label: 'Resumen Ejecutivo', content: content.summary, bg: '#eff6ff', border: '#bfdbfe', labelColor: '#1e40af', icon: <ChartBar size={compact ? 12 : 16} color="#2563eb" /> },
    { label: 'Análisis del Rendimiento', content: content.analysis, bg: '#f0fdf4', border: '#bbf7d0', labelColor: '#166534', icon: <TrendUp size={compact ? 12 : 16} color="#16a34a" /> },
    { label: 'Conclusiones', content: content.conclusions, bg: '#faf5ff', border: '#e9d5ff', labelColor: '#581c87', icon: <Target size={compact ? 12 : 16} color="#9333ea" /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: compact ? '8px' : '24px' }}>
      {sections.map(({ label, content, bg, border, labelColor, icon }) => (
        <div key={label} style={{ backgroundColor: bg, padding: compact ? '10px' : '24px', borderRadius: '8px', border: `1px solid ${border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: compact ? '6px' : '16px' }}>
            <div style={{
              width: compact ? '20px' : '32px',
              height: compact ? '20px' : '32px',
              backgroundColor: border,
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginRight: compact ? '6px' : '12px',
              flexShrink: 0,
            }}>
              {icon}
            </div>
            <h4 style={{ fontSize: compact ? '10px' : '16px', fontWeight: 600, color: labelColor, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {label}
            </h4>
          </div>
          <PlainText content={content} />
        </div>
      ))}
    </div>
  );
}
