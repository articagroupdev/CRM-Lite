"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { DateRange } from "react-day-picker";
import { subDays, format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  ChartBar, CurrencyDollar, Eye, Users, Mouse, TrendUp,
  WarningCircle, CircleNotch, Megaphone, Target, Broadcast,
  CheckCircle, Clock, XCircle, Funnel,
} from "@phosphor-icons/react";
import { getMetaAdAccountsAction, getMetaCampaignsAction } from "@/app/actions/meta-ads";
import { calculateAggregatedMetrics, generateInsights } from "@/lib/meta-insights-utils";
import type { Campaign, AdAccount } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const PIE_COLORS = ["#011b6a", "#0ca5c1", "#fa922e", "#10b981", "#f43f5e", "#8b5cf6", "#f59e0b"];

function fmt(n: number, decimals = 0) { return n.toLocaleString("es-MX", { maximumFractionDigits: decimals }); }
function fmtCurrency(n: number) { return `$${fmt(n, 2)}`; }
function fmtPct(n: number) { return `${fmt(n, 2)}%`; }

function KpiCard({ label, value, icon, color = "blue", sub }: { label: string; value: string; icon: React.ReactNode; color?: string; sub?: string }) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-50 to-blue-100/50 text-blue-600 border-blue-100",
    green: "from-emerald-50 to-emerald-100/50 text-emerald-600 border-emerald-100",
    orange: "from-orange-50 to-orange-100/50 text-orange-600 border-orange-100",
    purple: "from-purple-50 to-purple-100/50 text-purple-600 border-purple-100",
    teal: "from-teal-50 to-teal-100/50 text-teal-600 border-teal-100",
    red: "from-red-50 to-red-100/50 text-red-600 border-red-100",
  };
  return (
    <Card className={cn("border bg-gradient-to-br", colorMap[color])}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-foreground/60 uppercase tracking-wide">{label}</span>
          <div className="opacity-70">{icon}</div>
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function CampaignStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "success" | "secondary" | "destructive" | "warning" | "outline" }> = {
    ACTIVE: { label: "Activa", variant: "success" },
    PAUSED: { label: "Pausada", variant: "warning" },
    DELETED: { label: "Eliminada", variant: "destructive" },
    ARCHIVED: { label: "Archivada", variant: "secondary" },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "outline" };
  return <Badge variant={variant}>{label}</Badge>;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-background border border-border rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {typeof p.value === "number" ? p.value.toLocaleString("es-MX", { maximumFractionDigits: 2 }) : p.value}</p>
      ))}
    </div>
  );
};

const PRESET_RANGES = [
  { label: "Hoy", days: 0 },
  { label: "7 días", days: 7 },
  { label: "30 días", days: 30 },
  { label: "90 días", days: 90 },
];

export default function MetaInsightsPage() {
  const { user } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange>({ from: subDays(new Date(), 29), to: new Date() });
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [chartMetric, setChartMetric] = useState<"spend" | "impressions" | "reach" | "clicks">("spend");

  const { data: adAccounts = [], isLoading: loadingAccounts, error: accountsError } = useQuery<AdAccount[]>({
    queryKey: ["adAccounts"],
    queryFn: async () => {
      const r = await getMetaAdAccountsAction();
      if ("error" in r) throw new Error(r.error);
      return r as AdAccount[];
    },
  });

  useEffect(() => {
    if (adAccounts.length && !selectedAccount) setSelectedAccount(adAccounts[0].id);
  }, [adAccounts]);

  const { data: campaigns = [], isLoading: loadingCampaigns, error: campaignsError } = useQuery<Campaign[]>({
    queryKey: ["campaigns", selectedAccount, dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      if (!selectedAccount || !dateRange?.from || !dateRange?.to) return [];
      const r = await getMetaCampaignsAction({ adAccountId: selectedAccount, dateRange: { from: dateRange.from!, to: dateRange.to! } });
      if ("error" in r) throw new Error(r.error);
      return r as Campaign[];
    },
    enabled: !!selectedAccount && !!dateRange?.from && !!dateRange?.to,
  });

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return campaigns;
    return campaigns.filter((c) => c.status === statusFilter);
  }, [campaigns, statusFilter]);

  const metrics = useMemo(() => calculateAggregatedMetrics(filtered), [filtered]);
  const insights = useMemo(() => generateInsights(metrics, filtered), [metrics, filtered]);

  const dailyChartData = useMemo(() => {
    const map = new Map<string, Record<string, number>>();
    for (const c of filtered) {
      for (const d of c.insights?.daily_insights ?? []) {
        const key = d.date ?? "";
        if (!map.has(key)) map.set(key, { spend: 0, impressions: 0, reach: 0, clicks: 0 });
        const entry = map.get(key)!;
        entry.spend += d.spend ?? 0;
        entry.impressions += d.impressions ?? 0;
        entry.reach += d.reach ?? 0;
        entry.clicks += d.clicks ?? 0;
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date: format(new Date(date + "T00:00:00"), "dd MMM", { locale: es }), ...vals }));
  }, [filtered]);

  const objectivePieData = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filtered) {
      const obj = c.objective ?? "UNKNOWN";
      map.set(obj, (map.get(obj) ?? 0) + (c.insights?.spend ?? 0));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).filter(d => d.value > 0);
  }, [filtered]);

  const isLoading = loadingAccounts || loadingCampaigns;
  const error = accountsError || campaignsError;

  const metricLabels = { spend: "Gasto ($)", impressions: "Impresiones", reach: "Alcance", clicks: "Clics" };
  const metricColors = { spend: "#011b6a", impressions: "#0ca5c1", reach: "#fa922e", clicks: "#10b981" };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl text-primary"><ChartBar size={24} weight="duotone" /></div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Insights y Campañas</h1>
            <p className="text-muted-foreground text-sm">{filtered.length} campaña{filtered.length !== 1 ? "s" : ""} en el período seleccionado</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset range buttons */}
          {PRESET_RANGES.map((p) => (
            <Button key={p.label} size="sm" variant="outline" className="h-8 text-xs"
              onClick={() => setDateRange({ from: p.days === 0 ? new Date() : subDays(new Date(), p.days), to: new Date() })}>
              {p.label}
            </Button>
          ))}
          <DateRangePicker value={dateRange} onChange={(r) => r && setDateRange(r)} />
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="w-48"><SelectValue placeholder={loadingAccounts ? "Cargando..." : "Cuenta"} /></SelectTrigger>
            <SelectContent>
              {adAccounts.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <WarningCircle size={16} />
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Gasto" value={isLoading ? "—" : fmtCurrency(metrics.totalSpend)} icon={<CurrencyDollar size={16} />} color="blue" sub="USD total" />
        <KpiCard label="Impresiones" value={isLoading ? "—" : fmt(metrics.totalImpressions)} icon={<Eye size={16} />} color="teal" />
        <KpiCard label="Alcance" value={isLoading ? "—" : fmt(metrics.totalReach)} icon={<Users size={16} />} color="purple" />
        <KpiCard label="Clics" value={isLoading ? "—" : fmt(metrics.totalClicks)} icon={<Mouse size={16} />} color="green" />
        <KpiCard label="CTR" value={isLoading ? "—" : fmtPct(metrics.avgCtr)} icon={<TrendUp size={16} />} color="orange" />
        <KpiCard label="CPC" value={isLoading ? "—" : fmtCurrency(metrics.avgCpc)} icon={<Target size={16} />} color="red" />
      </div>

      {/* Charts */}
      {dailyChartData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">Evolución Diaria</CardTitle>
              <div className="flex gap-1">
                {(["spend", "impressions", "reach", "clicks"] as const).map((m) => (
                  <Button key={m} size="sm" variant={chartMetric === m ? "default" : "outline"} className="h-7 text-xs" onClick={() => setChartMetric(m)}>
                    {metricLabels[m]}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyChartData}>
                <defs>
                  <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metricColors[chartMetric]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={metricColors[chartMetric]} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey={chartMetric} name={metricLabels[chartMetric]} stroke={metricColors[chartMetric]} fill="url(#metricGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaigns Table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base">Campañas</CardTitle>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todos</SelectItem>
                    <SelectItem value="ACTIVE">Activas</SelectItem>
                    <SelectItem value="PAUSED">Pausadas</SelectItem>
                    <SelectItem value="ARCHIVED">Archivadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <Megaphone size={36} />
                  <p className="text-sm">No hay campañas para el período seleccionado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 text-xs text-muted-foreground font-medium">Campaña</th>
                        <th className="text-left p-3 text-xs text-muted-foreground font-medium hidden sm:table-cell">Estado</th>
                        <th className="text-right p-3 text-xs text-muted-foreground font-medium">Gasto</th>
                        <th className="text-right p-3 text-xs text-muted-foreground font-medium hidden md:table-cell">Impresiones</th>
                        <th className="text-right p-3 text-xs text-muted-foreground font-medium hidden lg:table-cell">CTR</th>
                        <th className="text-right p-3 text-xs text-muted-foreground font-medium hidden lg:table-cell">CPC</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filtered.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <p className="font-medium text-xs truncate max-w-[180px]">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground">{c.objective?.replace(/_/g, " ")}</p>
                          </td>
                          <td className="p-3 hidden sm:table-cell"><CampaignStatusBadge status={c.status} /></td>
                          <td className="p-3 text-right font-mono text-xs">${fmt(c.insights?.spend ?? 0, 2)}</td>
                          <td className="p-3 text-right text-xs hidden md:table-cell">{fmt(c.insights?.impressions ?? 0)}</td>
                          <td className="p-3 text-right text-xs hidden lg:table-cell">{fmtPct(c.insights?.ctr ?? 0)}</td>
                          <td className="p-3 text-right text-xs hidden lg:table-cell">${fmt(c.insights?.cpc ?? 0, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Objective Pie + Insights */}
        <div className="space-y-5">
          {objectivePieData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Gasto por Objetivo</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={objectivePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} strokeWidth={1}>
                      {objectivePieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [`$${fmt(v, 2)}`, "Gasto"]} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {insights.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Recomendaciones</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {insights.slice(0, 4).map((insight, i) => (
                  <div key={i} className={cn(
                    "flex items-start gap-2 p-2.5 rounded-lg text-xs",
                    insight.type === "success" ? "bg-emerald-50 text-emerald-700" :
                    insight.type === "warning" ? "bg-amber-50 text-amber-700" :
                    insight.type === "danger" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                  )}>
                    <span className="mt-0.5 flex-shrink-0">
                      {insight.type === "success" ? <CheckCircle size={13} /> : insight.type === "warning" ? <Clock size={13} /> : <WarningCircle size={13} />}
                    </span>
                    <p className="leading-relaxed">{insight.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
