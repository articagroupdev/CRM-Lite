"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import type { ReportData, SingleCampaignAiContent } from '@/types';

interface ReportState {
  reportData: ReportData[];
  aiContentInternal: (SingleCampaignAiContent | { error: string; summary: string; analysis: string; conclusions: string } | null)[];
  fileName: string | null;
  generationDate: string;
  selectedClientId: string | null;
  platform: string;
  lastSaved: number;
}

const KEY = 'crm_lite_analyzer_state';
const VERSION = '1.0';
const MAX_AGE = 24 * 60 * 60 * 1000;

export function useReportPersistence(platform: string) {
  const [reportState, setReportState] = useState<ReportState>({
    reportData: [], aiContentInternal: [], fileName: null,
    generationDate: '', selectedClientId: null, platform, lastSaved: 0
  });
  const [hasPersistedData, setHasPersistedData] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed.version === VERSION && parsed.platform === platform && (Date.now() - (parsed.lastSaved || 0)) < MAX_AGE) {
        setReportState({ ...parsed, lastSaved: parsed.lastSaved || Date.now() });
        setHasPersistedData(true);
      } else {
        localStorage.removeItem(KEY);
      }
    } catch { localStorage.removeItem(KEY); }
  }, [platform]);

  const saveReportState = useCallback((newState: Partial<ReportState>) => {
    const updated = { ...reportState, ...newState, lastSaved: Date.now() };
    setReportState(updated);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify({ version: VERSION, ...updated })); setHasPersistedData(true); } catch { /* quota */ }
    }, 1500);
  }, [reportState]);

  const clearReportState = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    localStorage.removeItem(KEY);
    setReportState({ reportData: [], aiContentInternal: [], fileName: null, generationDate: '', selectedClientId: null, platform, lastSaved: 0 });
    setHasPersistedData(false);
  }, [platform]);

  const restoreReportState = useCallback(() => {
    try {
      const stored = localStorage.getItem(KEY);
      if (!stored) return false;
      const parsed = JSON.parse(stored);
      if (parsed.version === VERSION && parsed.platform === platform) {
        setReportState({ ...parsed }); setHasPersistedData(true); return true;
      }
    } catch { /* ignore */ }
    return false;
  }, [platform]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { reportState, saveReportState, clearReportState, hasPersistedData, restoreReportState, isAutoSaving: false };
}
