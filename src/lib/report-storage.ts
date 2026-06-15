import type { ReportData, SingleCampaignAiContent } from '@/types';

export interface StoredReport {
  id: string;
  fileName: string;
  platform: 'meta' | 'meta-4101' | 'tiktok' | 'google';
  clientName: string | null;
  facebookPageName: string;
  reportData: ReportData[];
  aiContent: (SingleCampaignAiContent | { error: string; summary: string; analysis: string; conclusions: string } | null)[];
  createdAt: string;
  updatedAt: string;
  generationDate: string;
  totalSpent: number;
  totalResults: number;
  campaignCount: number;
  tags: string[];
  description?: string;
}

export interface ReportSearchFilters {
  platform?: string;
  dateFrom?: string;
  dateTo?: string;
  clientName?: string;
}

const KEY = 'crm_lite_reports_history';
const MAX = 100;

class ReportStorage {
  async getAll(): Promise<StoredReport[]> {
    try {
      const s = localStorage.getItem(KEY);
      if (!s) return [];
      const p = JSON.parse(s);
      return Array.isArray(p) ? p : [];
    } catch { return []; }
  }

  async save(report: Omit<StoredReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const all = await this.getAll();
    const newReport: StoredReport = { ...report, id: `r_${Date.now()}_${Math.random().toString(36).slice(2,9)}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    all.unshift(newReport);
    if (all.length > MAX) all.splice(MAX);
    localStorage.setItem(KEY, JSON.stringify(all));
    return newReport.id;
  }

  async getById(id: string): Promise<StoredReport | null> {
    const all = await this.getAll();
    return all.find(r => r.id === id) || null;
  }

  async search(filters: ReportSearchFilters = {}): Promise<StoredReport[]> {
    let all = await this.getAll();
    if (filters.platform) all = all.filter(r => r.platform === filters.platform);
    if (filters.dateFrom) all = all.filter(r => new Date(r.createdAt) >= new Date(filters.dateFrom!));
    if (filters.dateTo) all = all.filter(r => new Date(r.createdAt) <= new Date(filters.dateTo!));
    if (filters.clientName) {
      const q = filters.clientName.toLowerCase();
      all = all.filter(r => r.clientName?.toLowerCase().includes(q) || r.facebookPageName.toLowerCase().includes(q));
    }
    return all;
  }

  async delete(id: string): Promise<boolean> {
    const all = await this.getAll();
    const filtered = all.filter(r => r.id !== id);
    if (filtered.length === all.length) return false;
    localStorage.setItem(KEY, JSON.stringify(filtered));
    return true;
  }

  async clear(): Promise<void> { localStorage.removeItem(KEY); }

  async getStats() {
    const all = await this.getAll();
    return {
      totalReports: all.length,
      metaReports: all.filter(r => r.platform === 'meta' || r.platform === 'meta-4101').length,
      totalSpent: all.reduce((s, r) => s + r.totalSpent, 0),
      totalResults: all.reduce((s, r) => s + r.totalResults, 0),
      averageCampaignsPerReport: all.length > 0 ? all.reduce((s, r) => s + r.campaignCount, 0) / all.length : 0,
    };
  }
}

export const reportStorage = new ReportStorage();
