"use client";
import { useState, useEffect, useCallback } from 'react';
import { reportStorage, type StoredReport, type ReportSearchFilters } from '@/lib/report-storage';

export function useReportHistory() {
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (filters?: ReportSearchFilters) => {
    setLoading(true);
    const all = filters ? await reportStorage.search(filters) : await reportStorage.getAll();
    setReports(all);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const deleteReport = useCallback(async (id: string) => {
    await reportStorage.delete(id);
    setReports(prev => prev.filter(r => r.id !== id));
  }, []);

  const clearAll = useCallback(async () => {
    await reportStorage.clear();
    setReports([]);
  }, []);

  const saveReport = useCallback(async (report: Omit<StoredReport, 'id' | 'createdAt' | 'updatedAt'>) => {
    const id = await reportStorage.save(report);
    await refresh();
    return id;
  }, [refresh]);

  return { reports, loading, refresh, deleteReport, clearAll, saveReport };
}
