"use server";

import { processCampaignInsights, processDailyInsight } from "@/lib/meta-insights-processor";
import { META_GRAPH_BASE, buildMetaDateParams } from "@/config/meta";
import { batchGetCampaignInsights, batchGetCampaignDailyInsights, batchGet } from "@/lib/facebook-batch";
import { getCurrentUser } from "./auth";

function getToken(): string | null {
  return process.env.META_ACCESS_TOKEN ?? null;
}

export async function getMetaAdAccountsAction(): Promise<any[] | { error: string }> {
  try {
    await getCurrentUser();
    const token = getToken();
    if (!token) return { error: "META_ACCESS_TOKEN no configurado en .env" };

    const res = await fetch(`${META_GRAPH_BASE}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`);
    if (!res.ok) { const e = await res.json(); return { error: e.error?.message ?? "Error al obtener cuentas" }; }
    const data = await res.json();
    return data.data ?? [];
  } catch (e: any) { return { error: e.message ?? "Error desconocido" }; }
}

export async function getMetaCampaignsAction({ adAccountId, dateRange }: { adAccountId?: string; dateRange?: { from: Date; to: Date } }): Promise<any[] | { error: string }> {
  try {
    await getCurrentUser();
    const token = getToken();
    if (!token) return { error: "META_ACCESS_TOKEN no configurado" };
    if (!adAccountId) return { error: "Ad account ID requerido" };

    const dateParams = buildMetaDateParams(dateRange);
    const res = await fetch(`${META_GRAPH_BASE}/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,updated_time&access_token=${token}${dateParams}`);
    if (!res.ok) { const e = await res.json(); return { error: e.error?.message ?? "Error al obtener campañas" }; }

    const { data: campaignsList = [] } = await res.json();
    if (!campaignsList.length) return [];

    const ids = campaignsList.map((c: any) => c.id);
    const [insightsBatch, dailyBatch] = await Promise.all([
      batchGetCampaignInsights(token, ids, dateParams),
      dateRange ? batchGetCampaignDailyInsights(token, ids, dateParams) : Promise.resolve([]),
    ]);

    const insightsMap = new Map(insightsBatch.map((r, i) => [ids[i], r.success && r.data?.data?.[0] ? r.data.data[0] : null]));
    const dailyMap = new Map(dailyBatch.map((r, i) => [ids[i], r.success && r.data?.data?.length ? r.data.data : []]));

    return campaignsList.map((campaign: any) => {
      const raw = insightsMap.get(campaign.id);
      const normalized = raw ? processCampaignInsights(raw) : null;
      const daily = (dailyMap.get(campaign.id) ?? []).map(processDailyInsight);
      return {
        ...campaign,
        insights: normalized ? { ...normalized, daily_insights: daily } : { spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, cpc: 0, cpm: 0, results: 0, frequency: 0, daily_insights: [] },
      };
    });
  } catch (e: any) { return { error: e.message ?? "Error al obtener campañas" }; }
}

export async function getMetaPromotePagesAction(adAccountId: string): Promise<any[] | { error: string }> {
  try {
    await getCurrentUser();
    const token = getToken();
    if (!token) return { error: "META_ACCESS_TOKEN no configurado" };

    const res = await fetch(`${META_GRAPH_BASE}/${adAccountId}/promote_pages?fields=id,name,picture&access_token=${token}`);
    if (!res.ok) { const e = await res.json(); return { error: e.error?.message ?? "Error" }; }
    const data = await res.json();
    return data.data ?? [];
  } catch (e: any) { return { error: e.message ?? "Error" }; }
}

export async function getMetaUserPagesAction(): Promise<any[] | { error: string }> {
  try {
    await getCurrentUser();
    const token = getToken();
    if (!token) return { error: "META_ACCESS_TOKEN no configurado" };

    const res = await fetch(`${META_GRAPH_BASE}/me/accounts?fields=id,name,picture,access_token&access_token=${token}`);
    if (!res.ok) { const e = await res.json(); return { error: e.error?.message ?? "Error" }; }
    const data = await res.json();
    return data.data ?? [];
  } catch (e: any) { return { error: e.message ?? "Error" }; }
}

export async function getMetaPagePublishedPostsAction(pageId: string, pageAccessToken?: string): Promise<any[] | { error: string }> {
  try {
    await getCurrentUser();
    const token = pageAccessToken ?? getToken();
    if (!token) return { error: "Token requerido" };

    const res = await fetch(`${META_GRAPH_BASE}/${pageId}/posts?fields=id,message,story,created_time,full_picture,permalink_url&access_token=${token}&limit=20`);
    if (!res.ok) { const e = await res.json(); return { error: e.error?.message ?? "Error" }; }
    const data = await res.json();
    return data.data ?? [];
  } catch (e: any) { return { error: e.message ?? "Error" }; }
}

export async function getMetaPageInstagramAccountAction(pageId: string, pageAccessToken?: string): Promise<any | { error: string }> {
  try {
    await getCurrentUser();
    const token = pageAccessToken ?? getToken();
    if (!token) return { error: "Token requerido" };

    const res = await fetch(`${META_GRAPH_BASE}/${pageId}?fields=instagram_business_account&access_token=${token}`);
    if (!res.ok) { const e = await res.json(); return { error: e.error?.message ?? "Error" }; }
    const data = await res.json();
    return data.instagram_business_account ?? null;
  } catch (e: any) { return { error: e.message ?? "Error" }; }
}

export async function getInstagramMediaAction(igAccountId: string): Promise<any[] | { error: string }> {
  try {
    await getCurrentUser();
    const token = getToken();
    if (!token) return { error: "META_ACCESS_TOKEN no configurado" };

    const res = await fetch(`${META_GRAPH_BASE}/${igAccountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&access_token=${token}&limit=24`);
    if (!res.ok) { const e = await res.json(); return { error: e.error?.message ?? "Error" }; }
    const data = await res.json();
    return data.data ?? [];
  } catch (e: any) { return { error: e.message ?? "Error" }; }
}

export type { };
export type MetaPromotePage = { id: string; name: string; picture?: { data?: { url?: string } } };
export type MetaPagePost = { id: string; message?: string; story?: string; created_time: string; full_picture?: string; permalink_url?: string };
export type InstagramMediaItem = { id: string; caption?: string; media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM"; media_url?: string; thumbnail_url?: string; permalink?: string; timestamp: string; like_count?: number; comments_count?: number };
