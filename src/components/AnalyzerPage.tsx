"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo, Suspense } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { parseMetaCSV } from '@/lib/csvParser';
import { generateSingleCampaignReportContentAction } from '@/app/actions/analyzer';
import { useReportHistory } from '@/hooks/use-report-history';
import { useToast } from '@/hooks/use-toast';
import type { ReportData, SingleCampaignAiContent, MetricConfig } from '@/types';
import { reportStorage, type StoredReport } from '@/lib/report-storage';
import { cn } from '@/lib/utils';
import {
  Upload, BarChart3, Brain, Download, Mail, History, RefreshCw, X,
  AlertCircle, Loader2, TrendingUp, DollarSign, Users, Target, FileBarChart,
  Settings, LayoutGrid, List, ChevronDown, ChevronUp, CheckCircle2,
  FileUp, Eye, Copy, Share2
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnalyzerPlatform = 'meta-4101' | 'meta';

export interface AnalyzerConfig {
  platform: AnalyzerPlatform;
  title: string;
  subtitle: string;
  accentFrom: string;
  accentTo: string;
  pdfPrefix: string;
  brand: string;
}

export const ANALYZER_CONFIGS: Record<AnalyzerPlatform, AnalyzerConfig> = {
  'meta-4101': {
    platform: 'meta-4101',
    title: 'Analyzer Meta 4101',
    subtitle: 'Análisis de campañas Meta Ads · IA + PDF',
    accentFrom: 'from-[#011b6a]',
    accentTo: 'to-blue-600',
    pdfPrefix: 'Meta_4101',
    brand: '4101',
  },
  'meta': {
    platform: 'meta',
    title: 'Analyzer Meta Artica',
    subtitle: 'Análisis de campañas Meta Ads · IA + PDF',
    accentFrom: 'from-orange-600',
    accentTo: 'to-[#011b6a]',
    pdfPrefix: 'Meta_Artica',
    brand: 'Artica',
  },
};

const ALL_AVAILABLE_METRICS: MetricConfig[] = [
  { id: 'amountSpent', label: 'Importe Gastado', defaultSelectedGrid: true, defaultSelectedChart: false, isMonetary: true, description: 'Costo total de la campaña/anuncio.' },
  { id: 'reach', label: 'Alcance', defaultSelectedGrid: true, defaultSelectedChart: true, description: 'Número de personas únicas alcanzadas.' },
  { id: 'impressions', label: 'Impresiones', defaultSelectedGrid: true, defaultSelectedChart: true, description: 'Total de veces que se mostraron los anuncios.' },
  { id: 'frequency', label: 'Frecuencia', defaultSelectedGrid: true, defaultSelectedChart: false, description: 'Promedio de veces que cada persona vio el anuncio.' },
  { id: 'results', label: 'Resultados (Principal)', defaultSelectedGrid: false, defaultSelectedChart: true, description: 'Métrica principal de conversión identificada.' },
  { id: 'costPerResult', label: 'Costo por Resultado', defaultSelectedGrid: true, defaultSelectedChart: false, isMonetary: true, description: 'Costo promedio por cada resultado principal obtenido.' },
  { id: 'linkClicks', label: 'Clics en Enlace', defaultSelectedGrid: true, defaultSelectedChart: false, description: 'Total de clics en los enlaces de los anuncios.' },
  { id: 'cpc', label: 'CPC (Enlace)', defaultSelectedGrid: false, defaultSelectedChart: false, isMonetary: true, description: 'Costo promedio por cada clic en el enlace.' },
  { id: 'ctr', label: 'CTR (Enlace)', defaultSelectedGrid: false, defaultSelectedChart: false, isPercentage: true, description: 'Porcentaje de clics en el enlace.' },
  { id: 'cpm', label: 'CPM', defaultSelectedGrid: false, defaultSelectedChart: false, isMonetary: true, description: 'Costo por cada mil impresiones.' },
  { id: 'leads', label: 'Leads', defaultSelectedGrid: false, defaultSelectedChart: false, description: 'Clientes potenciales.' },
  { id: 'conversations', label: 'Conversaciones Iniciadas', defaultSelectedGrid: true, defaultSelectedChart: false, description: 'Total de conversaciones iniciadas.' },
];

type AiEntry = SingleCampaignAiContent | { error: string; summary: string; analysis: string; conclusions: string } | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMetricValue(value: number | undefined | null, metric: MetricConfig): string {
  if (value === undefined || value === null || isNaN(value)) return '—';
  if (metric.isMonetary) return `$${value.toFixed(2)}`;
  if (metric.isPercentage) return `${value.toFixed(2)}%`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(value < 10 ? 2 : 0);
}

function formatCampaignIdentifier(data: ReportData): string {
  const parts: string[] = [data.campaignName];
  if (data.adSetName) parts.push(data.adSetName);
  if (data.adName) parts.push(data.adName);
  return parts.join(' / ');
}

function formatDateDisplay(iso: string): string {
  if (!iso || iso === 'N/A') return 'N/A';
  try {
    return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AiContent({ content }: { content: string }) {
  if (!content) return null;
  const isHtml = content.trim().startsWith('<');
  if (isHtml) return <div className="text-sm text-muted-foreground leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />;
  return <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{content}</p>;
}

function ReportSection({ title, children, isLoading }: { title: string; children: React.ReactNode; isLoading?: boolean }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-primary uppercase tracking-wide">{title}</h4>
      {isLoading ? <Skeleton className="h-20 w-full" /> : <div>{children}</div>}
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-muted/30 border border-border/50 rounded-lg p-3">
      <p className="text-xs text-muted-foreground font-medium mb-0.5">{label}</p>
      <p className="text-base font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function CampaignMetrics({ campaignData, selectedMetrics }: { campaignData: ReportData; selectedMetrics: MetricConfig[] }) {
  if (!selectedMetrics.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {selectedMetrics.map(m => (
        <MetricCard
          key={m.id}
          label={m.label}
          value={formatMetricValue((campaignData as any)[m.id], m)}
        />
      ))}
    </div>
  );
}

function SummaryStatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card/70 backdrop-blur-md border border-border/60 rounded-xl p-4 flex items-center gap-3 shadow-sm">
      <div className={cn('p-2.5 rounded-lg flex-shrink-0', color)}><Icon className="h-5 w-5 text-white" /></div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

// ─── Chart Components ─────────────────────────────────────────────────────────

function CampaignSpendChart({ data }: { data: ReportData[] }) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const chartData = useMemo(() =>
    data.map((c, i) => ({
      name: c.campaignName.length > 18 ? c.campaignName.slice(0, 18) + '…' : c.campaignName,
      spend: c.amountSpent || 0,
      fill: `hsl(${(i * 45) % 360}, 65%, 48%)`,
    })), [data]);

  if (!isClient) return <div className="h-[260px] w-full animate-pulse bg-muted rounded-md" />;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-2.5">
        <p className="font-semibold text-xs text-foreground mb-1">{label}</p>
        <p className="text-xs text-primary">{`Inversión: $${payload[0].value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</p>
      </div>
    );
  };

  return (
    <div className="h-[240px] sm:h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <XAxis
            type="number"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
          />
          <YAxis
            dataKey="name"
            type="category"
            width={110}
            stroke="hsl(var(--muted-foreground))"
            fontSize={9}
            interval={0}
            tick={{ fill: 'hsl(var(--muted-foreground))', width: 110 }}
          />
          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.15 }} />
          <Bar dataKey="spend" name="Inversión" radius={[0, 4, 4, 0]} barSize={16} maxBarSize={22}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CampaignOverviewChart({ data }: { data: ReportData[] }) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const chartData = useMemo(() =>
    data.map((campaign, index) => ({
      name: campaign.campaignName.length > 18 ? campaign.campaignName.slice(0, 18) + '…' : campaign.campaignName,
      spend: campaign.amountSpent || 0,
      results: campaign.results || 0,
      fill: `hsl(${(index * 45) % 360}, 65%, 48%)`,
    })),
  [data]);

  if (!isClient) return <div className="h-[260px] sm:h-[320px] w-full animate-pulse bg-muted rounded-md" />;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    const spend = payload.find((item: any) => item.dataKey === 'spend')?.value || 0;
    const results = payload.find((item: any) => item.dataKey === 'results')?.value || 0;

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-2.5 text-xs">
        <p className="font-semibold text-foreground mb-1.5">{label}</p>
        <p className="mb-1" style={{ color: 'hsl(217, 91%, 60%)' }}>
          Inversión: <span className="font-semibold">${Number(spend).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </p>
        <p style={{ color: 'hsl(27, 96%, 58%)' }}>
          Resultados: <span className="font-semibold">{Number(results).toLocaleString('es-ES')}</span>
        </p>
      </div>
    );
  };

  return (
    <div className="h-[260px] sm:h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            interval={0}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            angle={-10}
            textAnchor="end"
            height={60}
          />
          <YAxis
            yAxisId="left"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="hsl(var(--muted-foreground))"
            fontSize={10}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${v}`}
          />
          <RechartsTooltip content={<CustomTooltip />} />
          <Legend iconSize={10} wrapperStyle={{ fontSize: 10, color: 'hsl(var(--foreground))' }} />
          <Bar
            yAxisId="left"
            dataKey="spend"
            name="Inversión"
            radius={[6, 6, 0, 0]}
            fill="hsl(217, 91%, 60%)"
            fillOpacity={0.85}
            barSize={18}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="results"
            name="Resultados"
            stroke="hsl(27, 96%, 58%)"
            strokeWidth={3}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function CampaignTimelineChart({ dailyEntries }: { dailyEntries: import('@/types').DailyData[] }) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);

  const hasReach = useMemo(() => dailyEntries.some(d => (d.reach || 0) > 0), [dailyEntries]);
  const hasResults = useMemo(() => dailyEntries.some(d => (d.results || 0) > 0), [dailyEntries]);
  const hasClicks = useMemo(() => dailyEntries.some(d => (d.linkClicks || 0) > 0), [dailyEntries]);

  const formatted = useMemo(() =>
    dailyEntries.map(d => ({
      date: (() => {
        try {
          return new Date(d.date + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
        } catch { return d.date; }
      })(),
      impressions: d.impressions || 0,
      reach: d.reach || 0,
      results: d.results || 0,
      linkClicks: d.linkClicks || 0,
    })), [dailyEntries]);

  if (!isClient || dailyEntries.length === 0) return null;

  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-2.5 text-xs">
        <p className="font-semibold text-foreground mb-1.5">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }} className="mb-0.5">
            {p.name}: <span className="font-semibold">
              {p.value >= 1000 ? `${(p.value / 1000).toFixed(1)}K` : p.value}
            </span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="h-[220px] sm:h-[270px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            dataKey="date"
            stroke="hsl(var(--muted-foreground))"
            fontSize={9}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            yAxisId="left"
            stroke="hsl(var(--muted-foreground))"
            fontSize={9}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="hsl(var(--muted-foreground))"
            fontSize={9}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <RechartsTooltip content={<ChartTooltip />} />
          <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 10, color: 'hsl(var(--foreground))' }} />
          <Line yAxisId="left" type="monotone" dataKey="impressions" stroke="hsl(210, 80%, 60%)" name="Impresiones" dot={false} strokeWidth={2} activeDot={{ r: 4 }} />
          {hasReach && (
            <Line yAxisId="left" type="monotone" dataKey="reach" stroke="hsl(270, 70%, 65%)" name="Alcance" dot={false} strokeWidth={2} activeDot={{ r: 4 }} />
          )}
          {!hasReach && hasClicks && (
            <Line yAxisId="left" type="monotone" dataKey="linkClicks" stroke="hsl(180, 70%, 50%)" name="Clics" dot={false} strokeWidth={2} activeDot={{ r: 4 }} />
          )}
          {hasResults && (
            <Line yAxisId="right" type="monotone" dataKey="results" stroke="hsl(27, 96%, 58%)" name="Resultados" dot={false} strokeWidth={2} strokeDasharray="5 5" activeDot={{ r: 4 }} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

function AnalyzerInner({ config }: { config: AnalyzerConfig }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { saveReport } = useReportHistory();
  const { toast } = useToast();

  // State
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [aiContent, setAiContent] = useState<AiEntry[]>([]);
  const [generatingIndices, setGeneratingIndices] = useState<Set<number>>(new Set());
  const [fileName, setFileName] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isSavedToHistory, setIsSavedToHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMetricsVisibility, setSelectedMetricsVisibility] = useState<Record<string, boolean>>(
    Object.fromEntries(ALL_AVAILABLE_METRICS.map(m => [m.id, m.defaultSelectedGrid ?? true]))
  );
  const [detailModal, setDetailModal] = useState<{ data: ReportData; ai: AiEntry; index: number } | null>(null);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed
  const totalSpent = useMemo(() => reportData.reduce((s, r) => s + (r.amountSpent || 0), 0), [reportData]);
  const totalResults = useMemo(() => reportData.reduce((s, r) => s + (r.results || 0), 0), [reportData]);
  const totalImpressions = useMemo(() => reportData.reduce((s, r) => s + (r.impressions || 0), 0), [reportData]);
  const totalReach = useMemo(() => reportData.reduce((s, r) => s + (r.reach || 0), 0), [reportData]);
  const totalLinkClicks = useMemo(() => reportData.reduce((s, r) => s + (r.linkClicks || 0), 0), [reportData]);
  const aiDoneCount = useMemo(() => aiContent.filter(a => a && !('error' in a)).length, [aiContent]);
  const selectedMetrics = useMemo(() => ALL_AVAILABLE_METRICS.filter(m => selectedMetricsVisibility[m.id]), [selectedMetricsVisibility]);
  const mainPageName = useMemo(() => reportData.length > 0 ? reportData[0].facebookPageName : 'N/A', [reportData]);
  const overallStart = useMemo(() => reportData.length > 0 ? reportData.reduce((e, c) => new Date(c.startDate) < new Date(e) ? c.startDate : e, reportData[0].startDate) : 'N/A', [reportData]);
  const overallEnd = useMemo(() => reportData.length > 0 ? reportData.reduce((l, c) => new Date(c.endDate) > new Date(l) ? c.endDate : l, reportData[0].endDate) : 'N/A', [reportData]);
  const primaryColor = config.platform === 'meta' ? '#c2400e' : '#011b6a';

  const aggregatedMetrics = useMemo(() => {
    if (reportData.length === 0) return null;
    const dailyDataMap = new Map<string, { date: string; impressions: number; reach: number; amountSpent: number; linkClicks: number; results: number }>();
    reportData.forEach(campaign => {
      campaign.dailyEntries?.forEach(day => {
        const existing = dailyDataMap.get(day.date);
        if (existing) {
          existing.amountSpent += day.amountSpent || 0;
          existing.impressions += day.impressions || 0;
          existing.reach += day.reach || 0;
          existing.results += day.results || 0;
          existing.linkClicks += day.linkClicks || 0;
        } else {
          dailyDataMap.set(day.date, { date: day.date, amountSpent: day.amountSpent || 0, impressions: day.impressions || 0, reach: day.reach || 0, results: day.results || 0, linkClicks: day.linkClicks || 0 });
        }
      });
    });
    const combinedDailyEntries = Array.from(dailyDataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const combinedReportData: ReportData = {
      facebookPageName: mainPageName,
      campaignName: 'Resumen General Agregado',
      startDate: overallStart,
      endDate: overallEnd,
      amountSpent: totalSpent,
      impressions: totalImpressions,
      reach: totalReach,
      results: totalResults,
      linkClicks: totalLinkClicks,
      conversations: reportData.reduce((s, r) => s + (r.conversations || 0), 0),
      frequency: totalReach > 0 ? totalImpressions / totalReach : 0,
      cpc: totalLinkClicks > 0 ? totalSpent / totalLinkClicks : 0,
      ctr: totalImpressions > 0 ? (totalLinkClicks / totalImpressions) * 100 : 0,
      cpm: totalImpressions > 0 ? (totalSpent / totalImpressions) * 1000 : 0,
      costPerResult: totalResults > 0 ? totalSpent / totalResults : 0,
      dailyEntries: combinedDailyEntries,
    };
    const investmentByCampaign = Array.from(
      reportData.reduce((acc, item) => {
        acc.set(item.campaignName, (acc.get(item.campaignName) || 0) + (item.amountSpent || 0));
        return acc;
      }, new Map<string, number>()).entries()
    ).map(([name, spend]) => ({ name, spend })).sort((a, b) => b.spend - a.spend);
    return { combinedReportData, combinedDailyEntries, investmentByCampaign };
  }, [reportData, mainPageName, overallStart, overallEnd, totalSpent, totalImpressions, totalReach, totalResults, totalLinkClicks]);

  // Load report from URL param or reportId
  useEffect(() => {
    const restoreReport = async () => {
      const reportId = searchParams.get('reportId');
      if (reportId) {
        try {
          const storedReport = await reportStorage.getById(reportId);
          if (!storedReport || !Array.isArray(storedReport.reportData) || storedReport.reportData.length === 0) {
            toast({
              title: 'Reporte no encontrado',
              description: 'No fue posible restaurar el reporte desde el historial.',
              variant: 'destructive',
            });
            return;
          }

          setReportData(storedReport.reportData);
          setAiContent(Array.isArray(storedReport.aiContent)
            ? storedReport.aiContent
            : Array(storedReport.reportData.length).fill(null));
          setFileName(storedReport.fileName || null);
          setClientName(storedReport.clientName || '');
          setIsSavedToHistory(true);
          setError(null);
          toast({
            title: 'Reporte cargado',
            description: `${storedReport.reportData.length} campañas restauradas del historial.`,
          });
          return;
        } catch {
          toast({
            title: 'Error al cargar',
            description: 'No fue posible leer el reporte guardado.',
            variant: 'destructive',
          });
          return;
        }
      }

      const param = searchParams.get('loadReport');
      if (!param) return;
      try {
        const payload = JSON.parse(decodeURIComponent(param));
        if (Array.isArray(payload.reportData) && payload.reportData.length > 0) {
          setReportData(payload.reportData);
          setAiContent(Array.isArray(payload.aiContent)
            ? payload.aiContent
            : Array(payload.reportData.length).fill(null));
          setFileName(payload.fileName || null);
          setClientName(payload.clientName || '');
          setIsSavedToHistory(true);
          setError(null);
          toast({
            title: 'Reporte cargado',
            description: `${payload.reportData.length} campañas restauradas del historial.`,
          });
        }
      } catch {
        /* ignore */
      }
    };

    restoreReport();
  }, [searchParams, toast]);

  // Handlers
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Solo se aceptan archivos CSV.');
      return;
    }
    setError(null);
    setShareableLink(null);
    setIsSavedToHistory(false);
    try {
      const text = await file.text();
      const parsed = parseMetaCSV(text, clientName || null);
      if (!parsed.length) { setError('No se encontraron datos válidos en el CSV.'); return; }
      parsed.sort((a, b) => (b.results || 0) - (a.results || 0));
      setReportData(parsed);
      setAiContent(Array(parsed.length).fill(null));
      setFileName(file.name);
      setStatusMessage(`${parsed.length} campaña${parsed.length !== 1 ? 's' : ''} cargada${parsed.length !== 1 ? 's' : ''}. Usa "Analizar con IA" para generar el análisis.`);
      toast({ title: 'CSV Procesado', description: `${parsed.length} campañas cargadas. Ahora puedes analizarlas con IA.` });
    } catch (err: any) {
      setError(err.message || 'Error al procesar el CSV.');
    }
  }, [clientName, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const generateSingle = useCallback(async (index: number) => {
    if (!reportData[index]) return;
    setGeneratingIndices(prev => new Set(prev).add(index));
    const identifier = formatCampaignIdentifier(reportData[index]);
    try {
      setStatusMessage(`🤖 Analizando "${identifier}"...`);
      const result = await generateSingleCampaignReportContentAction(reportData[index]);
      setAiContent(prev => { const n = [...prev]; n[index] = result; return n; });
    } catch {
      setAiContent(prev => {
        const n = [...prev];
        n[index] = { error: 'Error al generar análisis', summary: '', analysis: '', conclusions: '' };
        return n;
      });
    } finally {
      setGeneratingIndices(prev => { const s = new Set(prev); s.delete(index); return s; });
    }
  }, [reportData]);

  const generateAll = useCallback(async () => {
    if (!reportData.length) return;
    setIsGeneratingAll(true);
    setError(null);
    setShareableLink(null);
    let errCount = 0;
    const localAiContent: AiEntry[] = Array(reportData.length).fill(null);

    for (let i = 0; i < reportData.length; i++) {
      const pct = Math.round(((i + 1) / reportData.length) * 100);
      setStatusMessage(`🤖 Analizando ${i + 1}/${reportData.length} · ${pct}% — "${formatCampaignIdentifier(reportData[i])}"`);
      setGeneratingIndices(prev => new Set(prev).add(i));
      try {
        if (i > 0) await new Promise(r => setTimeout(r, 1500));
        const result = await generateSingleCampaignReportContentAction(reportData[i]);
        if ('error' in result && result.error) errCount++;
        localAiContent[i] = result;
        setAiContent(prev => { const n = [...prev]; n[i] = result; return n; });
      } catch {
        errCount++;
        const errEntry: AiEntry = { error: 'Error al generar análisis', summary: '', analysis: '', conclusions: '' };
        localAiContent[i] = errEntry;
        setAiContent(prev => { const n = [...prev]; n[i] = errEntry; return n; });
      } finally {
        setGeneratingIndices(prev => { const s = new Set(prev); s.delete(i); return s; });
      }
    }

    const success = reportData.length - errCount;
    const finalMsg = errCount > 0
      ? `⚠️ ${success} análisis generados, ${errCount} con errores.`
      : `✅ ${success} análisis generados exitosamente.`;
    setStatusMessage(finalMsg);
    setIsGeneratingAll(false);

    toast({
      title: errCount > 0 ? '⚠️ Análisis parcial' : '✅ Análisis completo',
      description: finalMsg,
    });

    // Auto-save to history after successful analysis
    if (success > 0) {
      try {
        await saveReport({
          fileName: fileName || 'report.csv',
          platform: config.platform,
          clientName: clientName || null,
          facebookPageName: mainPageName,
          reportData,
          aiContent: localAiContent,
          generationDate: new Date().toISOString(),
          totalSpent,
          totalResults,
          campaignCount: reportData.length,
          tags: [],
        });
        setIsSavedToHistory(true);
      } catch { /* non-critical */ }
    }
  }, [reportData, saveReport, fileName, clientName, mainPageName, totalSpent, totalResults, config.platform, toast]);

  const handleDownloadPdf = useCallback(async () => {
    if (!reportData.length) {
      toast({ title: 'Error', description: 'No hay datos para generar el PDF.', variant: 'destructive' });
      return;
    }
    setIsGeneratingPdf(true);
    toast({ title: 'PDF', description: 'Generando PDF, por favor espera...' });
    try {
      const [{ default: jsPDF }, { default: html2canvas }, { createRoot }, { createElement }] = await Promise.all([
        import('jspdf'), import('html2canvas'), import('react-dom/client'), import('react'),
      ]);
      const pdf = new jsPDF({ orientation: 'p', unit: 'px', format: 'letter', compress: true, hotfixes: ['px_scaling'] });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();

      const { PdfReportPage } = await import('@/components/PdfReportPage');
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;left:-9999px;top:0;width:816px;min-height:1056px;';
      document.body.appendChild(el);
      const root = createRoot(el);
      root.render(createElement(PdfReportPage, {
        reportData, aiContent, clientName,
        visibleMetrics: selectedMetricsVisibility,
        allMetrics: ALL_AVAILABLE_METRICS,
        fileName,
      }));
      await new Promise(r => setTimeout(r, 1500));
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 816 });
      const img = canvas.toDataURL('image/png', 0.92);
      const imgH = (canvas.height * W) / canvas.width;
      // paginate if taller than one page
      let yOffset = 0;
      let firstPage = true;
      while (yOffset < imgH) {
        if (!firstPage) pdf.addPage();
        pdf.addImage(img, 'PNG', 0, -yOffset, W, imgH);
        yOffset += H;
        firstPage = false;
      }
      root.unmount();
      document.body.removeChild(el);
      const safeName = (clientName || mainPageName || 'Reporte').replace(/[^a-z0-9]/gi, '_');
      pdf.save(`${config.pdfPrefix}_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: 'PDF Generado', description: 'El archivo PDF se descargó correctamente.' });
    } catch (err: any) {
      toast({ title: 'Error PDF', description: err.message || 'Error al generar PDF.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [reportData, aiContent, clientName, selectedMetricsVisibility, mainPageName, fileName, config.pdfPrefix, toast]);

  const handleSendEmail = useCallback(async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRecipient)) {
      toast({ title: 'Email inválido', description: 'Por favor ingresa un email válido.', variant: 'destructive' });
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch('/api/analyzer/send-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailRecipient, clientName, reportData, aiContent,
          selectedMetricsVisibility, allMetricsConfig: ALL_AVAILABLE_METRICS,
          platform: config.platform,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al enviar');
      setIsSendDialogOpen(false);
      setEmailRecipient('');
      toast({ title: 'Email enviado', description: `Reporte enviado a ${emailRecipient}` });
    } catch (err: any) {
      toast({ title: 'Error al enviar', description: err.message, variant: 'destructive' });
    } finally {
      setIsSending(false);
    }
  }, [emailRecipient, clientName, reportData, aiContent, selectedMetricsVisibility, config.platform, toast]);

  const generateShareLink = useCallback(async () => {
    if (!reportData.length) return;
    try {
      const payload = {
        reportData,
        aiContent: aiContent.filter(c => c && !('error' in c)),
        clientName,
        fileName,
        platform: config.platform,
      };
      const encoded = encodeURIComponent(JSON.stringify(payload));
      const link = `${window.location.origin}${window.location.pathname}?loadReport=${encoded}`;
      setShareableLink(link);
      await navigator.clipboard.writeText(link);
      toast({ title: 'Enlace copiado', description: 'El enlace para compartir ha sido copiado al portapapeles.' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo generar el enlace.', variant: 'destructive' });
    }
  }, [reportData, aiContent, clientName, fileName, config.platform, toast]);

  const handleMetricToggle = (metricId: string, checked: boolean) => {
    const current = Object.values(selectedMetricsVisibility).filter(Boolean).length;
    if (!checked && current <= 1) {
      toast({ title: 'Acción no permitida', description: 'Debe haber al menos una métrica seleccionada.', variant: 'destructive' });
      return;
    }
    setSelectedMetricsVisibility(prev => ({ ...prev, [metricId]: checked }));
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const isAnyGenerating = generatingIndices.size > 0 || isGeneratingAll;

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 min-h-screen">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="relative mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <span className={cn('p-1.5 rounded-lg bg-gradient-to-br', config.accentFrom, config.accentTo)}>
                <BarChart3 className="h-5 w-5 text-white" />
              </span>
              {config.title}
            </h2>
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
              {reportData.length > 0 ? (
                <>
                  {mainPageName !== 'N/A' && <p><strong>Página/Perfil:</strong> {mainPageName}</p>}
                  <p><strong>Período:</strong> {formatDateDisplay(overallStart)} – {formatDateDisplay(overallEnd)}</p>
                  <p><strong>Generado:</strong> {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </>
              ) : (
                <p>Carga un archivo CSV de Meta Ads para comenzar el análisis.</p>
              )}
            </div>
          </div>

          {/* Upload + Name */}
          <div className="w-full md:max-w-sm">
            <div className="bg-transparent border border-border/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAnyGenerating}
                  variant="default"
                  size="sm"
                  className="w-full gap-2"
                >
                  {isAnyGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                  Seleccionar CSV
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
              {fileName && (
                <p className="text-xs text-muted-foreground italic truncate">{fileName} · {reportData.length} campañas</p>
              )}
              {statusMessage && (
                <p className={cn('text-xs font-medium min-h-[1.2em]',
                  statusMessage.toLowerCase().includes('error') ? 'text-destructive' : 'text-primary'
                )}>{statusMessage}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <Alert variant="destructive" className="mb-6 rounded-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {reportData.length === 0 && !isAnyGenerating && (
        <Card className="text-center py-16 border-2 border-dashed border-border/50 rounded-xl mt-4 bg-card/70 backdrop-blur-md">
          <CardHeader>
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn('mx-auto mb-6 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-colors w-32 h-32 flex items-center justify-center',
                isDragging ? 'border-primary bg-primary/10' : 'border-border/40 hover:border-primary/40 hover:bg-muted/30'
              )}
            >
              <FileUp className={cn('h-12 w-12', isDragging ? 'text-primary' : 'text-muted-foreground/50')} />
            </div>
            <CardTitle className="text-foreground text-xl mb-3">Sube un archivo CSV para comenzar el análisis</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Arrastra y suelta un archivo CSV de Meta Ads aquí, o usa el botón "Seleccionar CSV" de arriba.
            </CardDescription>
          </CardContent>
        </Card>
      )}

      {/* ── Client name + Analyze button ────────────────────────────────────── */}
      {reportData.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="sm:col-span-2">
            <Label className="text-xs font-medium text-muted-foreground">Nombre del Cliente (opcional)</Label>
            <Input
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Ej. Empresa ABC"
              className="mt-1"
              disabled={isAnyGenerating}
            />
          </div>
          <div className="flex items-end">
            <Button
              className={cn('w-full gap-2 bg-gradient-to-r hover:opacity-90', config.accentFrom, config.accentTo)}
              onClick={generateAll}
              disabled={isAnyGenerating}
            >
              {isAnyGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {isAnyGenerating ? 'Analizando...' : `Analizar con IA (${reportData.length})`}
            </Button>
          </div>
        </div>
      )}

      {/* ── Summary stats ───────────────────────────────────────────────────── */}
      {reportData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <SummaryStatCard label="Gasto Total" value={`$${totalSpent.toFixed(2)}`} icon={DollarSign} color="bg-[#011b6a]" />
          <SummaryStatCard label="Resultados" value={totalResults.toLocaleString()} icon={Target} color="bg-orange-500" />
          <SummaryStatCard label="Impresiones" value={totalImpressions >= 1000 ? `${(totalImpressions / 1000).toFixed(1)}K` : totalImpressions.toString()} icon={TrendingUp} color="bg-blue-500" />
          <SummaryStatCard label="Alcance" value={totalReach >= 1000 ? `${(totalReach / 1000).toFixed(1)}K` : totalReach.toString()} icon={Users} color="bg-green-500" />
        </div>
      )}

      {/* ── Metrics accordion ───────────────────────────────────────────────── */}
      {reportData.length > 0 && (
        <Accordion type="single" collapsible className="w-full mb-6">
          <AccordionItem value="metrics-selector" className="bg-card/70 backdrop-blur-md border-border/60 rounded-xl shadow-sm">
            <AccordionTrigger className="text-base hover:no-underline px-5 py-4 text-foreground hover:text-primary rounded-t-xl">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-primary/80" />
                <span>Personalizar Métricas de Tarjetas</span>
                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 ml-2">
                  {Object.values(selectedMetricsVisibility).filter(Boolean).length}/{ALL_AVAILABLE_METRICS.length}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pt-3 pb-6 border-t border-border/40">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {ALL_AVAILABLE_METRICS.map(m => {
                  const isSelected = selectedMetricsVisibility[m.id] ?? false;
                  return (
                    <div key={m.id} className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer',
                      isSelected ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border/50 hover:bg-muted/50'
                    )} onClick={() => handleMetricToggle(m.id, !isSelected)}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={v => handleMetricToggle(m.id, !!v)}
                        className="mt-0.5"
                      />
                      <div>
                        <p className={cn('text-sm font-medium', isSelected ? 'text-primary' : 'text-foreground')}>{m.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {m.isMonetary ? 'Monetario' : m.isPercentage ? 'Porcentaje' : 'Numérico'}
                          {isSelected && <span className="ml-2 text-primary">✓</span>}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 pt-3 border-t border-border/30">
                <Button variant="outline" size="sm" onClick={() => setSelectedMetricsVisibility(Object.fromEntries(ALL_AVAILABLE_METRICS.map(m => [m.id, true])))}>
                  Seleccionar todas
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedMetricsVisibility(Object.fromEntries(ALL_AVAILABLE_METRICS.map(m => [m.id, m.defaultSelectedGrid ?? false])))}>
                  Restaurar por defecto
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* ── View mode + count ───────────────────────────────────────────────── */}
      {reportData.length > 0 && (
        <div className="flex items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{reportData.length} campaña{reportData.length !== 1 ? 's' : ''}</span>
            {isSavedToHistory && (
              <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Guardado en historial
              </span>
            )}
            {aiDoneCount > 0 && (
              <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                {aiDoneCount}/{reportData.length} análisis generados
              </span>
            )}
          </div>
          <Tabs value={viewMode} onValueChange={v => setViewMode(v as 'list' | 'grid')} className="w-auto">
            <TabsList className="grid grid-cols-2 rounded-lg bg-muted/80 h-8">
              <TabsTrigger value="list" className="rounded-md flex items-center gap-1.5 text-xs h-7">
                <List className="h-3.5 w-3.5" /> Lista
              </TabsTrigger>
              <TabsTrigger value="grid" className="rounded-md flex items-center gap-1.5 text-xs h-7">
                <LayoutGrid className="h-3.5 w-3.5" /> Grilla
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* ── Campaign List View ──────────────────────────────────────────────── */}
      {reportData.length > 0 && viewMode === 'list' && (
        <Accordion type="multiple" defaultValue={reportData.map((_, i) => `item-${i}`)} className="w-full space-y-4 mb-8">
          {reportData.map((campaign, index) => {
            const ai = aiContent[index];
            const isGeneratingThis = generatingIndices.has(index);
            const hasError = ai && 'error' in ai;
            const hasAi = ai && !('error' in ai);

            return (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-card/80 backdrop-blur-sm border-border/60 rounded-xl shadow-md overflow-hidden"
              >
                <AccordionTrigger className="text-base hover:no-underline px-5 py-4 text-foreground hover:text-primary rounded-t-xl">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0',
                      hasError ? 'bg-destructive' : hasAi ? 'bg-green-500' : isGeneratingThis ? 'bg-primary' : 'bg-muted-foreground'
                    )}>
                      {isGeneratingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : index + 1}
                    </div>
                    <span className="text-left">
                      {index + 1}. {formatCampaignIdentifier(campaign)}
                      {campaign.startDate !== 'N/A' && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({formatDateDisplay(campaign.startDate)} – {formatDateDisplay(campaign.endDate)})
                        </span>
                      )}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pt-3 pb-6 border-t border-border/40 space-y-4">

                  {/* AI Analysis */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" /> Análisis de Rendimiento
                        {isGeneratingThis && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                        {!isGeneratingThis && (
                          <button
                            onClick={e => { e.stopPropagation(); generateSingle(index); }}
                            className="ml-auto p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                            title="Regenerar análisis"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {isGeneratingThis ? (
                        <div className="space-y-3">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-4 w-5/6" />
                        </div>
                      ) : hasError ? (
                        <Alert variant="destructive" className="rounded-xl">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Error en Análisis IA</AlertTitle>
                          <AlertDescription>{(ai as any).error}</AlertDescription>
                        </Alert>
                      ) : hasAi ? (
                        <>
                          {(ai as SingleCampaignAiContent).summary && (
                            <ReportSection title="Resumen Ejecutivo">
                              <AiContent content={(ai as SingleCampaignAiContent).summary} />
                            </ReportSection>
                          )}
                          {(ai as SingleCampaignAiContent).analysis && (
                            <ReportSection title="Análisis del Rendimiento">
                              <AiContent content={(ai as SingleCampaignAiContent).analysis} />
                            </ReportSection>
                          )}
                          {(ai as SingleCampaignAiContent).conclusions && (
                            <ReportSection title="Conclusiones">
                              <AiContent content={(ai as SingleCampaignAiContent).conclusions} />
                            </ReportSection>
                          )}
                        </>
                      ) : (
                        <div className="py-6 text-center text-muted-foreground text-sm">
                          <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          Usa el botón "Analizar con IA" para generar el análisis de esta campaña.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Metrics */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" /> Métricas
                      </CardTitle>
                      <CardDescription>Métricas clave de rendimiento para esta campaña.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CampaignMetrics campaignData={campaign} selectedMetrics={selectedMetrics} />
                    </CardContent>
                  </Card>

                  {/* Timeline chart */}
                  {campaign.dailyEntries && campaign.dailyEntries.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="h-5 w-5 text-primary" /> Evolución Temporal
                        </CardTitle>
                        <CardDescription>
                          Impresiones, Alcance y Resultados diarios del período analizado.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <CampaignTimelineChart dailyEntries={campaign.dailyEntries} />
                      </CardContent>
                    </Card>
                  )}

                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* ── Campaign Grid View ──────────────────────────────────────────────── */}
      {reportData.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {reportData.map((campaign, index) => {
            const ai = aiContent[index];
            const isGeneratingThis = generatingIndices.has(index);
            const hasAi = ai && !('error' in ai);
            return (
              <Card
                key={index}
                onClick={() => setDetailModal({ data: campaign, ai, index })}
                className="cursor-pointer hover:shadow-lg transition-all duration-200 bg-card/80 backdrop-blur-sm border-border/60 rounded-xl flex flex-col"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5',
                      isGeneratingThis ? 'bg-primary' : hasAi ? 'bg-green-500' : 'bg-muted-foreground'
                    )}>
                      {isGeneratingThis ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : index + 1}
                    </div>
                    <CardTitle className="text-sm font-semibold leading-tight line-clamp-2 flex-1">
                      {formatCampaignIdentifier(campaign)}
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-1">
                    {formatDateDisplay(campaign.startDate)} – {formatDateDisplay(campaign.endDate)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3 pb-3">
                  {hasAi ? (
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {(ai as SingleCampaignAiContent).summary}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sin análisis generado.</p>
                  )}
                  <Separator />
                  <div className="grid grid-cols-2 gap-2">
                    {selectedMetrics.slice(0, 4).map(m => (
                      <div key={m.id} className="bg-muted/30 rounded-md p-2">
                        <p className="text-xs text-muted-foreground">{m.label}</p>
                        <p className="text-sm font-bold">{formatMetricValue((campaign as any)[m.id], m)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t bg-muted/40 py-2">
                  <p className="text-xs font-semibold w-full text-center text-primary flex items-center justify-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> Ver detalles
                  </p>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Resumen General de la Cuenta ────────────────────────────────────── */}
      {reportData.length > 0 && aggregatedMetrics && (
        <Card className="mt-6 mb-8 bg-card/70 backdrop-blur-md border-border/70 rounded-xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl text-primary flex items-center gap-3">
              <FileBarChart className="h-6 w-6" />
              Resumen General de la Cuenta
            </CardTitle>
            <CardDescription>Métricas y gráficos agregados de todas las entradas del reporte.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <Separator />

            {/* Rendimiento Agregado Diario */}
            {aggregatedMetrics.combinedDailyEntries.length > 0 && (
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-foreground">Rendimiento Agregado Diario</h4>

                {/* Aggregated metric cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {selectedMetrics.map(m => (
                    <MetricCard
                      key={m.id}
                      label={m.label}
                      value={formatMetricValue((aggregatedMetrics.combinedReportData as any)[m.id], m)}
                    />
                  ))}
                </div>

                {/* Combined timeline chart */}
                <CampaignTimelineChart dailyEntries={aggregatedMetrics.combinedDailyEntries} />
              </div>
            )}

            {/* Inversión por Campaña */}
            {aggregatedMetrics.investmentByCampaign.length > 1 && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-foreground">Inversión por Campaña</h4>
                <CampaignSpendChart data={reportData} />
              </div>
            )}

            {/* Summary table */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-foreground">Tabla Comparativa</h4>
              <div className="overflow-x-auto rounded-lg border border-border/40">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">Campaña</th>
                      {selectedMetrics.map(m => (
                        <th key={m.id} className="px-3 py-2.5 text-right font-semibold text-muted-foreground whitespace-nowrap">{m.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {reportData.map((row, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-foreground max-w-[200px] truncate">{row.campaignName}</p>
                          {row.adSetName && <p className="text-muted-foreground text-xs truncate max-w-[200px]">{row.adSetName}</p>}
                        </td>
                        {selectedMetrics.map(m => (
                          <td key={m.id} className="px-3 py-2.5 text-right text-foreground font-medium whitespace-nowrap">
                            {formatMetricValue((row as any)[m.id], m)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="bg-muted/50 font-bold border-t-2 border-border/60">
                      <td className="px-3 py-2.5 text-foreground font-semibold">TOTALES</td>
                      {selectedMetrics.map(m => {
                        const total = reportData.reduce((s, r) => s + ((r as any)[m.id] || 0), 0);
                        const avg = total / reportData.length;
                        const val = m.isPercentage || m.id === 'frequency' ? avg : total;
                        return (
                          <td key={m.id} className="px-3 py-2.5 text-right text-foreground whitespace-nowrap">
                            {formatMetricValue(val, m)}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Report Actions ──────────────────────────────────────────────────── */}
      {reportData.length > 0 && (
        <Card className="mb-8 p-4 sm:p-6 bg-card/70 backdrop-blur-md border-border/70 rounded-xl shadow-lg">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-xl">Acciones del Reporte</CardTitle>
            <CardDescription>Descarga el reporte como PDF, compártelo o envíalo por email.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
              <Button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf || isAnyGenerating}
                variant="secondary"
                size="sm"
                className="gap-2"
              >
                {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {isGeneratingPdf ? 'Generando PDF...' : 'Descargar PDF'}
              </Button>
              <Button
                onClick={() => setIsSendDialogOpen(true)}
                disabled={isAnyGenerating}
                variant="outline"
                size="sm"
                className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Mail className="h-4 w-4" /> Enviar por Email
              </Button>
              <Button
                onClick={generateShareLink}
                disabled={isAnyGenerating}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Share2 className="h-4 w-4" /> Generar Enlace
              </Button>
              <Button
                onClick={() => router.push('/analyzer/history')}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <History className="h-4 w-4" /> Ver Historial
              </Button>
            </div>
            {shareableLink && (
              <div className="mt-4 flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                <Input type="text" value={shareableLink} readOnly className="text-xs flex-grow bg-background/70 border-none h-8" />
                <Button
                  onClick={() => { navigator.clipboard.writeText(shareableLink); toast({ title: 'Copiado', description: 'Enlace copiado al portapapeles.' }); }}
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Campaign Detail Modal (grid view) ──────────────────────────────── */}
      <Dialog open={!!detailModal} onOpenChange={open => { if (!open) setDetailModal(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{detailModal ? formatCampaignIdentifier(detailModal.data) : ''}</DialogTitle>
            {detailModal && (
              <p className="text-sm text-muted-foreground">
                {formatDateDisplay(detailModal.data.startDate)} – {formatDateDisplay(detailModal.data.endDate)}
              </p>
            )}
          </DialogHeader>
          {detailModal && (
            <ScrollArea className="flex-1 pr-4">
              <div className="py-4 space-y-6">
                {detailModal.ai && !('error' in detailModal.ai) ? (
                  <>
                    {(detailModal.ai as SingleCampaignAiContent).summary && (
                      <ReportSection title="Resumen Ejecutivo">
                        <AiContent content={(detailModal.ai as SingleCampaignAiContent).summary} />
                      </ReportSection>
                    )}
                    {(detailModal.ai as SingleCampaignAiContent).analysis && (
                      <ReportSection title="Análisis del Rendimiento">
                        <AiContent content={(detailModal.ai as SingleCampaignAiContent).analysis} />
                      </ReportSection>
                    )}
                    {(detailModal.ai as SingleCampaignAiContent).conclusions && (
                      <ReportSection title="Conclusiones">
                        <AiContent content={(detailModal.ai as SingleCampaignAiContent).conclusions} />
                      </ReportSection>
                    )}
                    <Separator />
                  </>
                ) : detailModal.ai && 'error' in detailModal.ai ? (
                  <Alert variant="destructive" className="rounded-xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error en Análisis IA</AlertTitle>
                    <AlertDescription>{(detailModal.ai as any).error}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="py-4 text-center text-muted-foreground text-sm">
                    <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Sin análisis generado para esta campaña.
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">Métricas</h4>
                  <CampaignMetrics campaignData={detailModal.data} selectedMetrics={ALL_AVAILABLE_METRICS} />
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Email Dialog ────────────────────────────────────────────────────── */}
      <Dialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" /> Enviar Reporte por Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium">Email del destinatario</Label>
              <Input
                type="email"
                value={emailRecipient}
                onChange={e => setEmailRecipient(e.target.value)}
                placeholder="cliente@empresa.com"
                className="mt-1"
                disabled={isSending}
                onKeyDown={e => { if (e.key === 'Enter' && !isSending) handleSendEmail(); }}
              />
              <p className="text-xs text-muted-foreground mt-2">
                El reporte se enviará con todas las métricas y análisis generados.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setIsSendDialogOpen(false); setEmailRecipient(''); }} disabled={isSending}>
                Cancelar
              </Button>
              <Button onClick={handleSendEmail} disabled={isSending || !emailRecipient.trim()} className="gap-2 bg-blue-600 hover:bg-blue-700">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {isSending ? 'Enviando...' : 'Enviar Reporte'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ─── Exported wrapper ─────────────────────────────────────────────────────────

export function AnalyzerPage({ platform }: { platform: AnalyzerPlatform }) {
  const config = ANALYZER_CONFIGS[platform];
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="h-6 w-6 animate-spin" /> Cargando...
      </div>
    }>
      <AnalyzerInner config={config} />
    </Suspense>
  );
}
