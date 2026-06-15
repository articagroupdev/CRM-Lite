import type { Campaign } from "@/types";

export interface AggregatedMetrics {
  totalSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalResults: number;
  totalClicks: number;
  totalConversions: number;
  avgCpc: number;
  avgCtr: number;
  avgCpm: number;
  avgFrequency: number;
  engagementRate: number;
  conversionRate: number;
}

export interface MaxMetrics {
  maxSpend: number;
  maxImpressions: number;
  maxReach: number;
  maxResults: number;
  maxClicks: number;
  maxConversions: number;
  maxCtr: number;
  maxCpc: number;
  maxCpm: number;
  maxFrequency: number;
  campaignWithMaxSpend?: string;
  campaignWithMaxResults?: string;
  campaignWithMaxImpressions?: string;
}

export interface InsightData {
  type: "success" | "warning" | "danger" | "info";
  title: string;
  message: string;
  metric?: string;
  value?: string | number;
  recommendation?: string;
}

export function calculateAggregatedMetrics(campaigns: Campaign[]): AggregatedMetrics {
  if (!campaigns?.length) {
    return { totalSpend: 0, totalImpressions: 0, totalReach: 0, totalResults: 0, totalClicks: 0, totalConversions: 0, avgCpc: 0, avgCtr: 0, avgCpm: 0, avgFrequency: 0, engagementRate: 0, conversionRate: 0 };
  }

  let totalSpend = 0, totalImpressions = 0, totalReach = 0, totalResults = 0, totalClicks = 0, totalConversions = 0, totalEngagement = 0;

  const safe = (v: any) => (typeof v === "number" && !isNaN(v) && isFinite(v) && v >= 0 ? v : 0);

  campaigns.forEach((c) => {
    const i = c.insights;
    if (!i) return;
    totalSpend += safe(i.spend);
    totalImpressions += safe(i.impressions);
    totalReach += safe(i.reach);
    totalResults += safe(i.results);
    totalClicks += safe(i.clicks);
    totalConversions += safe(i.conversions);
    totalEngagement += safe(i.post_engagement);
  });

  return {
    totalSpend, totalImpressions, totalReach, totalResults, totalClicks, totalConversions,
    avgCpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
    avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    avgCpm: totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0,
    avgFrequency: totalReach > 0 ? totalImpressions / totalReach : 0,
    engagementRate: totalImpressions > 0 ? (totalEngagement / totalImpressions) * 100 : 0,
    conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
  };
}

export function generateInsights(metrics: AggregatedMetrics, campaigns: Campaign[]): InsightData[] {
  const insights: InsightData[] = [];

  if (metrics.avgCtr > 0 && metrics.avgCtr < 1) {
    insights.push({ type: "warning", title: "CTR Bajo Detectado", message: `Tu CTR promedio es ${metrics.avgCtr.toFixed(2)}%, por debajo del promedio (1-2%).`, metric: "CTR", value: `${metrics.avgCtr.toFixed(2)}%`, recommendation: "Mejora creativos, textos o segmentación." });
  }
  if (metrics.avgCtr >= 3) {
    insights.push({ type: "success", title: "Excelente CTR", message: `CTR de ${metrics.avgCtr.toFixed(2)}% muy por encima del promedio.`, metric: "CTR", value: `${metrics.avgCtr.toFixed(2)}%`, recommendation: "Mantén esta estrategia y considera escalar." });
  }
  if (metrics.avgCpc > 2) {
    insights.push({ type: "warning", title: "CPC Elevado", message: `CPC promedio de $${metrics.avgCpc.toFixed(2)} es alto.`, metric: "CPC", value: `$${metrics.avgCpc.toFixed(2)}`, recommendation: "Revisa estrategia de puja y segmentación." });
  }
  if (metrics.avgFrequency > 5) {
    insights.push({ type: "danger", title: "Frecuencia Muy Alta", message: `Frecuencia de ${metrics.avgFrequency.toFixed(2)} indica saturación.`, metric: "Frecuencia", value: metrics.avgFrequency.toFixed(2), recommendation: "Amplía audiencia o rota creativos." });
  }
  if (metrics.engagementRate > 2) {
    insights.push({ type: "success", title: "Alto Engagement", message: `Engagement de ${metrics.engagementRate.toFixed(2)}% es excelente.`, metric: "Engagement", value: `${metrics.engagementRate.toFixed(2)}%`, recommendation: "Tu contenido resuena bien. Crea contenido similar." });
  }

  const noResults = campaigns.filter((c) => c.insights && c.insights.results === 0 && c.insights.spend > 0);
  if (noResults.length > 0) {
    insights.push({ type: "danger", title: "Campañas Sin Resultados", message: `${noResults.length} campaña(s) gastaron presupuesto sin resultados.`, recommendation: "Revisa y pausa estas campañas." });
  }

  return insights;
}

export function calculateMaxMetrics(campaigns: Campaign[]): MaxMetrics {
  if (!campaigns?.length) {
    return { maxSpend: 0, maxImpressions: 0, maxReach: 0, maxResults: 0, maxClicks: 0, maxConversions: 0, maxCtr: 0, maxCpc: 0, maxCpm: 0, maxFrequency: 0 };
  }
  let maxSpend = 0, maxImpressions = 0, maxReach = 0, maxResults = 0, maxClicks = 0, maxConversions = 0, maxCtr = 0, maxCpc = 0, maxCpm = 0, maxFrequency = 0;
  let campaignWithMaxSpend: string | undefined, campaignWithMaxResults: string | undefined, campaignWithMaxImpressions: string | undefined;

  const safe = (v: any) => (typeof v === "number" && !isNaN(v) && isFinite(v) && v >= 0 ? v : 0);

  campaigns.forEach((c) => {
    const i = c.insights;
    if (!i) return;
    if (safe(i.spend) > maxSpend) { maxSpend = safe(i.spend); campaignWithMaxSpend = c.name; }
    if (safe(i.impressions) > maxImpressions) { maxImpressions = safe(i.impressions); campaignWithMaxImpressions = c.name; }
    if (safe(i.reach) > maxReach) maxReach = safe(i.reach);
    if (safe(i.results) > maxResults) { maxResults = safe(i.results); campaignWithMaxResults = c.name; }
    if (safe(i.clicks) > maxClicks) maxClicks = safe(i.clicks);
    if (safe(i.conversions) > maxConversions) maxConversions = safe(i.conversions);
    if (safe(i.ctr) > maxCtr) maxCtr = safe(i.ctr);
    if (safe(i.cpc) > maxCpc) maxCpc = safe(i.cpc);
    if (safe(i.cpm) > maxCpm) maxCpm = safe(i.cpm);
    if (safe(i.frequency) > maxFrequency) maxFrequency = safe(i.frequency);
  });

  return { maxSpend, maxImpressions, maxReach, maxResults, maxClicks, maxConversions, maxCtr, maxCpc, maxCpm, maxFrequency, campaignWithMaxSpend, campaignWithMaxResults, campaignWithMaxImpressions };
}
