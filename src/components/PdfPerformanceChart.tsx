import React from 'react';
import type { ReportData, DailyData } from '@/types';

interface PdfPerformanceChartProps {
  campaignData: ReportData;
  dailyData?: DailyData[];
  fullWidth?: boolean;
}

export default function PdfPerformanceChart({ campaignData, dailyData, fullWidth = false }: PdfPerformanceChartProps) {
  const sanitizeNumber = (value: number | undefined | null): number => {
    if (value === undefined || value === null || !isFinite(value) || isNaN(value)) return 0;
    return Math.max(0, value);
  };

  const getChartData = () => {
    if (campaignData.dailyEntries && campaignData.dailyEntries.length > 0) {
      return campaignData.dailyEntries.map(entry => ({
        date: entry.date,
        impressions: sanitizeNumber(entry.impressions),
        reach: sanitizeNumber(entry.reach),
        results: sanitizeNumber(entry.results),
        linkClicks: sanitizeNumber(entry.linkClicks),
      }));
    }

    if (dailyData && dailyData.length > 0) {
      return dailyData.map(d => ({
        date: d.date,
        impressions: sanitizeNumber(d.impressions),
        reach: sanitizeNumber(d.reach),
        results: sanitizeNumber(d.results),
        linkClicks: sanitizeNumber(d.linkClicks),
      }));
    }

    const days = 28;
    const startDate = new Date(campaignData.startDate);
    const simulatedData = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const baseResults = sanitizeNumber(campaignData.results) / days;
      const baseImpressions = sanitizeNumber(campaignData.impressions) / days;
      const baseReach = sanitizeNumber(campaignData.reach) / days;
      const baseLinkClicks = sanitizeNumber(campaignData.linkClicks) / days;
      const variation = 0.3;
      const r = () => 1 + (Math.random() - 0.5) * variation;
      simulatedData.push({
        date: date.toISOString().split('T')[0],
        impressions: Math.max(0, baseImpressions * r()),
        reach: Math.max(0, baseReach * r()),
        results: Math.max(0, baseResults * r()),
        linkClicks: Math.max(0, baseLinkClicks * r()),
      });
    }
    return simulatedData;
  };

  const chartData = getChartData();

  if (chartData.length === 0) {
    return (
      <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <p style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>No hay datos diarios para mostrar el gráfico.</p>
      </div>
    );
  }

  const maxImpressions = Math.max(...chartData.map(d => sanitizeNumber(d.impressions)), 1);
  const maxReach = Math.max(...chartData.map(d => sanitizeNumber(d.reach)), 1);
  const maxResults = Math.max(...chartData.map(d => sanitizeNumber(d.results)), 1);

  const hasReachData = chartData.some(d => sanitizeNumber(d.reach) > 0);
  const hasLinkClicksData = chartData.some(d => sanitizeNumber(d.linkClicks) > 0);
  const maxLeftAxis = hasReachData
    ? Math.max(maxImpressions, maxReach, 1)
    : Math.max(maxImpressions, hasLinkClicksData ? Math.max(...chartData.map(d => sanitizeNumber(d.linkClicks))) : 1, 1);
  const maxRightAxis = Math.max(maxResults, 1);

  const chartWidth = fullWidth ? 700 : 300;
  const chartLeft = fullWidth ? 80 : 60;
  const chartRight = chartLeft + chartWidth;
  const chartHeight = fullWidth ? 200 : 160;
  const chartTop = fullWidth ? 30 : 40;
  const chartBottom = chartTop + chartHeight;

  const generateLinePath = (values: number[], maxValue: number) => {
    if (values.length === 0) return '';
    const safeMax = Math.max(sanitizeNumber(maxValue), 1);
    return values.map((value, index) => {
      const x = chartLeft + (index / Math.max(values.length - 1, 1)) * chartWidth;
      let y = chartTop + chartHeight - (sanitizeNumber(value) / safeMax) * chartHeight;
      if (!isFinite(y) || isNaN(y)) y = chartBottom;
      return index === 0 ? `M ${x},${y}` : `L ${x},${y}`;
    }).join(' ');
  };

  const generateAreaPath = (values: number[], maxValue: number) => {
    if (values.length === 0) return '';
    const safeMax = Math.max(sanitizeNumber(maxValue), 1);
    const points = values.map((value, index) => {
      const x = chartLeft + (index / Math.max(values.length - 1, 1)) * chartWidth;
      let y = chartTop + chartHeight - (sanitizeNumber(value) / safeMax) * chartHeight;
      if (!isFinite(y) || isNaN(y)) y = chartBottom;
      return `${x},${y}`;
    });
    return `M ${chartLeft},${chartBottom} L ${points.join(' L ')} L ${chartRight},${chartBottom} Z`;
  };

  const impressionsPath = generateLinePath(chartData.map(d => sanitizeNumber(d.impressions)), maxLeftAxis);
  const secondaryPath = hasReachData
    ? generateLinePath(chartData.map(d => sanitizeNumber(d.reach)), maxLeftAxis)
    : generateLinePath(chartData.map(d => sanitizeNumber(d.linkClicks)), maxLeftAxis);
  const resultsPath = generateLinePath(chartData.map(d => sanitizeNumber(d.results)), maxRightAxis);
  const impressionsAreaPath = generateAreaPath(chartData.map(d => sanitizeNumber(d.impressions)), maxLeftAxis);
  const secondaryAreaPath = hasReachData
    ? generateAreaPath(chartData.map(d => sanitizeNumber(d.reach)), maxLeftAxis)
    : generateAreaPath(chartData.map(d => sanitizeNumber(d.linkClicks)), maxLeftAxis);
  const secondaryLabel = hasReachData ? 'Alcance' : 'Clics';

  const formatAxisValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const leftAxisLabels = [];
  for (let i = 0; i <= 5; i++) {
    leftAxisLabels.push({ value: formatAxisValue((maxLeftAxis / 5) * (5 - i)), y: chartTop + (i / 5) * chartHeight });
  }
  const rightAxisLabels = [];
  for (let i = 0; i <= 5; i++) {
    rightAxisLabels.push({ value: formatAxisValue((maxRightAxis / 5) * (5 - i)), y: chartTop + (i / 5) * chartHeight });
  }

  const xSteps = fullWidth ? Math.min(8, chartData.length) : Math.min(6, chartData.length);
  const xAxisDates = [];
  for (let i = 0; i < xSteps; i++) {
    const idx = Math.floor((i / (xSteps - 1)) * (chartData.length - 1));
    const d = new Date(chartData[idx].date);
    xAxisDates.push({ date: `${d.getDate()} ${d.toLocaleDateString('es-ES', { month: 'short' })}`, x: chartLeft + (i / (xSteps - 1)) * chartWidth });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: fullWidth ? '100%' : undefined }}>
      <div style={{ backgroundColor: '#fff', padding: fullWidth ? '16px' : '20px', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: fullWidth ? '16px' : '24px', marginBottom: fullWidth ? '8px' : '16px' }}>
          {[
            { color: 'hsl(210, 80%, 60%)', label: 'Impresiones' },
            { color: 'hsl(270, 70%, 65%)', label: secondaryLabel },
            { color: 'hsl(27, 96%, 58%)', label: 'Resultados' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: fullWidth ? '10px' : '12px', height: fullWidth ? '10px' : '12px', borderRadius: '50%', backgroundColor: color }} />
              <span style={{ fontSize: fullWidth ? '11px' : '13px', fontWeight: 600, color: '#374151' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* SVG Chart */}
        <div style={{ position: 'relative', height: fullWidth ? '320px' : '256px', backgroundColor: '#f9fafb', borderRadius: '8px', padding: '16px', border: '1px solid #f3f4f6' }}>
          <svg style={{ width: '100%', height: '100%' }} viewBox={`0 0 ${fullWidth ? 860 : 420} ${fullWidth ? 260 : 280}`} preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="impGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(210, 80%, 60%)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="hsl(210, 80%, 60%)" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="reachGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="hsl(270, 70%, 65%)" stopOpacity="0.5" />
                <stop offset="100%" stopColor="hsl(270, 70%, 65%)" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke="#9CA3AF" strokeWidth="1.5" />
            <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke="#9CA3AF" strokeWidth="1.5" />
            <line x1={chartRight} y1={chartTop} x2={chartRight} y2={chartBottom} stroke="#9CA3AF" strokeWidth="1.5" strokeDasharray="3,3" />

            {leftAxisLabels.map((l, i) => (
              <text key={i} x={chartLeft - 5} y={l.y + 4} fontSize={fullWidth ? "11" : "10"} fill="#6B7280" fontWeight="500" textAnchor="end">{l.value}</text>
            ))}
            {rightAxisLabels.map((l, i) => (
              <text key={i} x={chartRight + 5} y={l.y + 4} fontSize={fullWidth ? "11" : "10"} fill="#6B7280" fontWeight="500" textAnchor="start">{l.value}</text>
            ))}

            <path d={impressionsAreaPath} fill="url(#impGrad)" />
            <path d={secondaryAreaPath} fill="url(#reachGrad)" />
            <path d={impressionsPath} fill="none" stroke="hsl(210, 80%, 60%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={secondaryPath} fill="none" stroke="hsl(270, 70%, 65%)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d={resultsPath} fill="none" stroke="hsl(27, 96%, 58%)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {chartData.map((d, i) => {
              const x = chartLeft + (i / Math.max(chartData.length - 1, 1)) * chartWidth;
              const y = chartTop + chartHeight - (sanitizeNumber(d.results) / maxRightAxis) * chartHeight;
              return <circle key={i} cx={x} cy={y} r={fullWidth ? "5" : "4"} fill="hsl(27, 96%, 58%)" stroke="white" strokeWidth="2" />;
            })}

            {xAxisDates.map((item, i) => (
              <text key={i} x={item.x} y={chartBottom + 20} fontSize={fullWidth ? "11" : "10"} fill="#6B7280" fontWeight="500" textAnchor="middle">{item.date}</text>
            ))}

            <text x={chartLeft / 2} y={chartTop + chartHeight / 2} fontSize={fullWidth ? "12" : "11"} fill="#6B7280" fontWeight="600" textAnchor="middle" transform={`rotate(-90 ${chartLeft / 2} ${chartTop + chartHeight / 2})`}>
              {secondaryLabel} / Impresiones
            </text>
            <text x={chartRight + 30} y={chartTop + chartHeight / 2} fontSize={fullWidth ? "12" : "11"} fill="#6B7280" fontWeight="600" textAnchor="middle" transform={`rotate(90 ${chartRight + 30} ${chartTop + chartHeight / 2})`}>
              Resultados
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
