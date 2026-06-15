import { META_GRAPH_BASE } from "@/config/meta";

interface BatchRequest { method: "GET" | "POST"; relative_url: string; }
interface BatchResponse { code: number; headers: Array<{ name: string; value: string }>; body: string; }

export async function executeFacebookBatch(accessToken: string, requests: BatchRequest[]): Promise<BatchResponse[]> {
  if (!requests.length) return [];
  if (requests.length > 50) {
    const all: BatchResponse[] = [];
    for (let i = 0; i < requests.length; i += 50) {
      all.push(...await executeFacebookBatch(accessToken, requests.slice(i, i + 50)));
    }
    return all;
  }
  try {
    const res = await fetch(`${META_GRAPH_BASE}/?access_token=${accessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batch: requests }),
    });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({ code: item.code || 200, headers: item.headers || [], body: typeof item.body === "string" ? item.body : JSON.stringify(item.body) }));
  } catch (e) {
    return requests.map(() => ({ code: 500, headers: [], body: JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }) }));
  }
}

export async function batchGet<T = any>(accessToken: string, relativeUrls: string[]): Promise<Array<{ success: boolean; data?: T; error?: any }>> {
  const responses = await executeFacebookBatch(accessToken, relativeUrls.map((url) => ({ method: "GET", relative_url: url })));
  return responses.map((r) => {
    if (r.code >= 200 && r.code < 300) {
      try { return { success: true, data: JSON.parse(r.body) }; } catch { return { success: false, error: { message: "Parse error" } }; }
    }
    try { return { success: false, error: JSON.parse(r.body) }; } catch { return { success: false, error: { message: r.body } }; }
  });
}

export async function batchGetCampaignInsights(accessToken: string, campaignIds: string[], dateParams = "") {
  const urls = campaignIds.map((id) => `${id}/insights?fields=impressions,reach,clicks,spend,ctr,cpc,cpm,actions,action_values,results,conversion_values&level=campaign${dateParams}`);
  const results = await batchGet(accessToken, urls);
  return campaignIds.map((id, i) => ({ campaignId: id, ...results[i] }));
}

export async function batchGetCampaignDailyInsights(accessToken: string, campaignIds: string[], dateParams = "") {
  const urls = campaignIds.map((id) => `${id}/insights?fields=impressions,reach,clicks,spend,actions,action_values,results,conversion_values&level=campaign&time_increment=day${dateParams}`);
  const results = await batchGet(accessToken, urls);
  return campaignIds.map((id, i) => ({ campaignId: id, ...results[i] }));
}
