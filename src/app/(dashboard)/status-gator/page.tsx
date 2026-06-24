"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import { getServiceIncidentsAction, resolveIncidentAction } from "@/app/actions/status-gator";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

// ── Types ──────────────────────────────────────────────────────────────────────

type ServiceStatus = "up" | "possible_outage" | "likely_outage" | "unknown";

interface Issue {
  label: string;
  votes: number;
}

interface RecentOutage {
  description: string;
  duration: string;
  detectedAt: string;
}

interface ChartPoint {
  t: string;
  v: number;
  s: 0 | 1 | 2;
}

interface ServiceData {
  service: "instagram" | "whatsapp" | "meta";
  name: string;
  status: ServiceStatus;
  statusLabel: string;
  issues: Issue[];
  reportsLast24h: number | null;
  recentOutages: RecentOutage[];
  chartData: ChartPoint[];
  scrapedAt: string;
  error?: string;
}

interface StatusResponse {
  services: ServiceData[];
  fetchedAt: string;
}

interface Incident {
  id: string;
  service: string;
  status: string;
  issues: Issue[];
  resolvedAt: string | null;
  createdAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ServiceStatus, { label: string; color: string; dot: string; bg: string }> = {
  up: {
    label: "Operativo",
    color: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
    bg: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
  },
  possible_outage: {
    label: "Posible interrupción",
    color: "text-yellow-700 dark:text-yellow-400",
    dot: "bg-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800",
  },
  likely_outage: {
    label: "Interrupción probable",
    color: "text-red-700 dark:text-red-400",
    dot: "bg-red-500 animate-pulse",
    bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
  },
  unknown: {
    label: "Desconocido",
    color: "text-gray-500 dark:text-gray-400",
    dot: "bg-gray-400",
    bg: "bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700",
  },
};

const CHART_COLORS: Record<0 | 1 | 2, string> = {
  0: "#21bf73",
  1: "#ffa133",
  2: "#fd5e53",
};

const SERVICE_ICONS: Record<string, string> = {
  instagram: "https://favicons.statusgator.com/instagram.png",
  whatsapp: "https://www.whatsapp.com/favicon.ico",
  meta: "https://about.meta.com/favicon.ico",
};

const SERVICE_GRADIENTS: Record<string, string> = {
  instagram: "from-purple-500 to-pink-500",
  whatsapp: "from-green-500 to-green-600",
  meta: "from-blue-500 to-indigo-600",
};

const INCIDENT_LABELS: Record<string, string> = {
  possible_outage: "Posible interrupción",
  likely_outage: "Interrupción probable",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ServiceStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ChartTooltipContent({ active, payload }: { active?: boolean; payload?: { payload: ChartPoint }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const statusLabel = d.s === 2 ? "Interrupción probable" : d.s === 1 ? "Posible interrupción" : "Operativo";
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-gray-700 dark:text-gray-200">{v(d.v)} reportes</p>
      <p className="text-gray-500 dark:text-gray-400">{statusLabel}</p>
      <p className="text-gray-400 dark:text-gray-500 mt-0.5">
        {format(parseISO(d.t), "HH:mm · dd MMM", { locale: es })}
      </p>
    </div>
  );
}

function v(n: number) {
  return n.toLocaleString("es");
}

function ServiceHealthChart({ data }: { data: ChartPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-[160px] text-xs text-gray-400">
        Sin datos disponibles
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barGap={0} barCategoryGap="1%">
        <XAxis dataKey="t" hide />
        <YAxis hide />
        <Tooltip content={<ChartTooltipContent />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Bar dataKey="v" maxBarSize={8} radius={[2, 2, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={CHART_COLORS[entry.s]} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function ServiceCard({ data, loading }: { data?: ServiceData; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-pulse shadow-sm">
        <div className="h-[72px] bg-gray-200 dark:bg-gray-700" />
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-gray-800">
          <div className="p-6 space-y-4">
            <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-[160px] bg-gray-100 dark:bg-gray-800 rounded-xl" />
            <div className="flex gap-3">
              {[1,2,3].map(i => <div key={i} className="h-3 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />)}
            </div>
            <div className="space-y-3 pt-2">
              {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
            </div>
          </div>
          <div className="p-6 space-y-3">
            <div className="h-3 w-28 bg-gray-200 dark:bg-gray-700 rounded-full" />
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  const gradient = SERVICE_GRADIENTS[data.service] ?? "from-gray-400 to-gray-500";
  const isDown = data.status === "likely_outage";
  const isPossible = data.status === "possible_outage";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">

      {/* ── Header ── */}
      <div className={`bg-gradient-to-r ${gradient} relative overflow-hidden`}>
        {/* subtle noise overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}
        />
        <div className="relative px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SERVICE_ICONS[data.service]}
              alt={data.name}
              className="w-10 h-10 rounded-xl bg-white/95 p-1.5 object-contain shadow-sm flex-shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <div>
              <h3 className="text-white font-bold text-lg leading-tight tracking-tight">{data.name}</h3>
              <p className="text-white/55 text-xs mt-0.5">statusgator.com/services/{data.service}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <StatusBadge status={data.status} />
            {data.reportsLast24h !== null && (
              <div className="bg-black/20 backdrop-blur-sm rounded-xl px-4 py-2 text-right border border-white/10">
                <p className="text-white font-bold text-xl leading-none">{v(data.reportsLast24h)}</p>
                <p className="text-white/60 text-[10px] mt-0.5 uppercase tracking-wide">reportes 24h</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-100 dark:divide-gray-800">

        {/* Left — chart + outages */}
        <div className="p-6 space-y-5">

          {/* Chart section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Salud del servicio · 24h
              </p>
              <a
                href={`https://statusgator.com/services/${data.service}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400 hover:text-blue-500 hover:underline transition-colors"
              >
                Ver en StatusGator ↗
              </a>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
              <ServiceHealthChart data={data.chartData} />
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 mt-3 px-1">
              {([0, 1, 2] as const).map((s) => (
                <span key={s} className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="w-3 h-3 rounded" style={{ background: CHART_COLORS[s] }} />
                  {s === 0 ? "Operativo" : s === 1 ? "Posible fallo" : "Interrupción"}
                </span>
              ))}
            </div>
          </div>

          {/* Recent outages */}
          {data.recentOutages.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                Interrupciones recientes
              </p>
              <ul className="space-y-2">
                {data.recentOutages.slice(0, 3).map((o, i) => (
                  <li key={i} className="flex items-start gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl px-3 py-2.5">
                    <span className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 ring-4 ring-red-100 dark:ring-red-900/40" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-1">{o.description}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{o.detectedAt}</p>
                    </div>
                    <span className="flex-shrink-0 text-[11px] font-semibold text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full border border-red-100 dark:border-red-800">
                      {o.duration}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right — top issues */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Top problemas reportados
            </p>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {formatDistanceToNow(new Date(data.scrapedAt), { addSuffix: true, locale: es })}
            </span>
          </div>

          {data.issues.length > 0 ? (
            <ul className="space-y-2.5">
              {data.issues.map((issue, i) => {
                const maxVotes = data.issues[0]?.votes || 1;
                const pct = Math.round((issue.votes / maxVotes) * 100);
                const barColor = i === 0 ? "#fd5e53" : i === 1 ? "#ffa133" : i === 2 ? "#facc15" : "#94a3b8";
                return (
                  <li key={i} className="group rounded-xl bg-gray-50 dark:bg-gray-800/50 px-3.5 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-md text-[10px] font-bold flex items-center justify-center"
                        style={{ background: barColor + "22", color: barColor }}>
                        {i + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex-1">{issue.label}</span>
                      <span className="flex-shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                        {v(issue.votes)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: barColor }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <span className="text-3xl">✅</span>
              <p className="text-sm text-gray-400 dark:text-gray-500">Sin problemas reportados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function StatusGatorPage() {
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const forceRefreshRef = useRef(false);

  const { data, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<StatusResponse>({
    queryKey: ["status-gator"],
    queryFn: () => {
      const url = forceRefreshRef.current ? "/api/status-gator?refresh=1" : "/api/status-gator";
      forceRefreshRef.current = false;
      return fetch(url).then((r) => r.json());
    },
    refetchInterval: 30 * 60 * 1000,
    staleTime: 29 * 60 * 1000,
  });

  useEffect(() => {
    getServiceIncidentsAction().then(({ incidents }) => setIncidents(incidents as unknown as Incident[]));
  }, []);

  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolveIncidentAction(id),
    onSuccess: () => {
      toast({ title: "Incidente marcado como resuelto" });
      getServiceIncidentsAction().then(({ incidents }) => setIncidents(incidents as unknown as Incident[]));
    },
  });

  function handleRefresh() {
    forceRefreshRef.current = true;
    refetch();
    getServiceIncidentsAction().then(({ incidents }) => setIncidents(incidents as unknown as Incident[]));
  }

  const services = data?.services ?? [];
  const filteredIncidents = activeFilter === "all"
    ? incidents
    : incidents.filter((i) => i.service === activeFilter);

  const overallStatus: ServiceStatus =
    services.length === 0 ? "unknown"
    : services.some((s) => s.status === "likely_outage") ? "likely_outage"
    : services.some((s) => s.status === "possible_outage") ? "possible_outage"
    : "up";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Estado de Servicios Meta</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Datos en tiempo real de{" "}
              <a href="https://statusgator.com" target="_blank" rel="noopener noreferrer" className="font-medium text-gray-700 dark:text-gray-300 hover:underline">
                statusgator.com
              </a>
              {dataUpdatedAt > 0 && (
                <> · {formatDistanceToNow(dataUpdatedAt, { addSuffix: true, locale: es })}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isLoading && <StatusBadge status={overallStatus} />}
            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors disabled:opacity-50"
            >
              <svg className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isFetching ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Auto-refresh cada 30 minutos · Cache compartido entre usuarios
        </div>

        {/* Service cards */}
        <div className="space-y-5">
          <ServiceCard data={services.find((s) => s.service === "instagram")} loading={isLoading} />
          <ServiceCard data={services.find((s) => s.service === "whatsapp")} loading={isLoading} />
          <ServiceCard data={services.find((s) => s.service === "meta")} loading={isLoading} />
        </div>

        {/* Incident history */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Historial de Incidentes</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Interrupciones detectadas y guardadas automáticamente</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {["all", "instagram", "whatsapp", "meta"].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize ${
                    activeFilter === f
                      ? "bg-sidebar-primary text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  {f === "all" ? "Todos" : f}
                </button>
              ))}
            </div>
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Sin incidentes registrados{activeFilter !== "all" ? ` para ${activeFilter}` : ""}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800">
                    {["Servicio", "Tipo", "Detectado", "Estado"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredIncidents.map((incident) => (
                    <tr key={incident.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{incident.service}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                          incident.status === "likely_outage"
                            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400"
                        }`}>
                          {INCIDENT_LABELS[incident.status] ?? incident.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(incident.createdAt), "dd/MM/yyyy HH:mm")}
                      </td>
                      <td className="px-4 py-3">
                        {incident.resolvedAt ? (
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                            ✓ Resuelto {format(new Date(incident.resolvedAt), "dd/MM HH:mm")}
                          </span>
                        ) : (
                          <button
                            onClick={() => resolveMutation.mutate(incident.id)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                          >
                            Marcar resuelto
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
