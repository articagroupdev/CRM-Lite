export type UserRole = "ADMIN" | "USER";

export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdAccount {
  id: string;
  name: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
}

export interface CampaignInsights {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  results?: number;
  conversions?: number;
  costPerResult?: number;
  conversionRate?: number;
  conversionValues?: number;
  conversations?: number;
  post_engagement?: number;
  video_views?: number;
  website_purchase_roas?: number;
  daily_insights?: DailyInsight[];
  actions?: unknown[];
}

export interface DailyInsight {
  date: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  results: number;
  conversions: number;
  conversations?: number;
  costPerResult: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  daily_budget?: number;
  lifetime_budget?: number;
  created_time?: string;
  updated_time?: string;
  insights?: CampaignInsights;
}

export interface MetaPromotePage {
  id: string;
  name: string;
  picture?: { data?: { url?: string } };
}

export interface MetaPagePost {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  full_picture?: string;
  permalink_url?: string;
  insights?: { data?: Array<{ name: string; values: Array<{ value: number }> }> };
}

export interface InstagramMediaItem {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

// ── Analyzer / Report Types ───────────────────────────────────────────────────

export interface DailyData {
  date: string;
  impressions: number;
  reach: number;
  amountSpent: number;
  linkClicks: number;
  results: number;
}

export interface ReportData {
  facebookPageName: string;
  campaignName: string;
  adSetName?: string | null;
  adName?: string | null;
  reach: number;
  impressions: number;
  conversations?: number;
  startDate: string;
  endDate: string;
  frequency: number;
  amountSpent?: number;
  results?: number;
  leads?: number;
  costPerResult?: number;
  cpc?: number;
  ctr?: number;
  cpm?: number;
  linkClicks?: number;
  videoPlays?: number;
  pageInteractions?: number;
  profileVisits?: number;
  resultRate?: number;
  optimizationGoal?: string;
  budget?: number;
  currency?: string;
  resultColumnName?: string | null;
  costPerResultColumnName?: string | null;
  dailyEntries: DailyData[];
  videoUrl?: string | null;
  videoThumbnailUrl?: string | null;
  dataAiHintThumbnail?: string | null;
}

export interface SingleCampaignAiContent {
  summary: string;
  analysis: string;
  conclusions: string;
}

export interface MetricConfig {
  id: string;
  label: string;
  isMonetary?: boolean;
  isPercentage?: boolean;
  defaultSelectedGrid: boolean;
  defaultSelectedChart: boolean;
  yAxisID?: 'yPrimary' | 'ySecondary';
  chartType?: 'bar' | 'line';
  color?: string;
  description?: string;
  dataKey?: string;
}

export interface ShareableReportPayload {
  reportData: ReportData[];
  aiContent: (SingleCampaignAiContent | null)[];
  selectedReportType: string;
  mainFacebookPageName: string;
  overallStartDate: string;
  overallEndDate: string;
  isMultiCampaign: boolean;
  hasAdNames: boolean;
  totalEntries: number;
  generationDate: string;
  currentYear: number;
  fileName: string | null;
  errorMessages: string[];
  selectedMetricsVisibility: Record<string, boolean>;
  allMetricsConfig: MetricConfig[];
}

export const META_CAMPAIGN_OBJECTIVES = [
  { value: "OUTCOME_AWARENESS", label: "Reconocimiento" },
  { value: "OUTCOME_TRAFFIC", label: "Tráfico" },
  { value: "OUTCOME_ENGAGEMENT", label: "Interacción" },
  { value: "OUTCOME_LEADS", label: "Clientes potenciales" },
  { value: "OUTCOME_APP_PROMOTION", label: "Promoción de app" },
  { value: "OUTCOME_SALES", label: "Ventas" },
  { value: "MESSAGES", label: "Mensajes" },
  { value: "CONVERSIONS", label: "Conversiones" },
  { value: "VIDEO_VIEWS", label: "Vistas de video" },
  { value: "REACH", label: "Alcance" },
] as const;
