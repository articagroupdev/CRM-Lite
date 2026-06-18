"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReportHistory } from '@/hooks/use-report-history';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { StoredReport } from '@/lib/report-storage';
import {
  History, Search, Trash2, Upload, RefreshCw, BarChart3, DollarSign, Target,
  AlertCircle, ArrowLeft, CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function ReportHistoryPage() {
  const router = useRouter();
  const { reports, loading, deleteReport, clearAll, refresh } = useReportHistory();
  const [search, setSearch] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = reports.filter(r =>
    !search ||
    r.clientName?.toLowerCase().includes(search.toLowerCase()) ||
    r.facebookPageName?.toLowerCase().includes(search.toLowerCase()) ||
    r.fileName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleLoad = (report: StoredReport) => {
    const params = new URLSearchParams({ reportId: report.id });
    const basePath = report.platform === 'meta' ? '/analyzer/artica' : report.platform === 'tiktok' ? '/analyzer/tiktok' : '/analyzer';
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/analyzer')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#011b6a] to-blue-600 shadow-md">
            <History className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Historial de Reportes</h1>
            <p className="text-sm text-gray-500">{reports.length} reporte{reports.length !== 1 ? 's' : ''} guardados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()} className="gap-1.5">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
          {reports.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setConfirmClear(true)} className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="h-4 w-4" /> Limpiar todo
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente, página o archivo..."
          className="pl-9 bg-white"
        />
      </div>

      {/* Stats summary */}
      {reports.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total Reportes', value: reports.length.toString(), icon: BarChart3, color: 'bg-[#011b6a]' },
            { label: 'Gasto Total', value: `$${reports.reduce((s, r) => s + r.totalSpent, 0).toFixed(0)}`, icon: DollarSign, color: 'bg-orange-500' },
            { label: 'Resultados', value: reports.reduce((s, r) => s + r.totalResults, 0).toLocaleString(), icon: Target, color: 'bg-green-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
              <div className={cn('p-2 rounded-lg flex-shrink-0', color)}><Icon className="h-4 w-4 text-white" /></div>
              <div><p className="text-xs text-gray-500">{label}</p><p className="font-bold text-gray-900">{value}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" /> Cargando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
          <History className="h-12 w-12 opacity-30" />
          <p className="text-sm">{search ? 'Sin resultados para tu búsqueda' : 'No hay reportes guardados aún'}</p>
          {!search && <Button size="sm" variant="outline" onClick={() => router.push('/analyzer')} className="gap-1.5 mt-1"><Upload className="h-4 w-4" /> Ir al Analyzer</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(report => (
            <div key={report.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-[#011b6a]/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {report.clientName || report.facebookPageName || 'Sin nombre'}
                    </h3>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">Meta Ads</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{report.fileName}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                    <span className="text-xs text-gray-600"><DollarSign className="inline h-3 w-3 mr-0.5" />${report.totalSpent.toFixed(2)}</span>
                    <span className="text-xs text-gray-600"><Target className="inline h-3 w-3 mr-0.5" />{report.totalResults} resultados</span>
                    <span className="text-xs text-gray-600"><BarChart3 className="inline h-3 w-3 mr-0.5" />{report.campaignCount} campañas</span>
                    <span className="text-xs text-gray-400"><CalendarDays className="inline h-3 w-3 mr-0.5" />{formatDate(report.createdAt)}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleLoad(report)} className="gap-1.5 text-xs h-8">
                    <Upload className="h-3.5 w-3.5" /> Cargar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => deleteReport(report.id)} className="h-8 w-8 p-0 text-red-500 hover:bg-red-50 hover:border-red-200">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm clear dialog */}
      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" /> Limpiar historial
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">¿Estás seguro de que quieres eliminar los {reports.length} reportes del historial? Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={async () => { await clearAll(); setConfirmClear(false); }}>Eliminar todo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
