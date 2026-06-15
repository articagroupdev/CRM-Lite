export interface ProcessedInsight {
  impressions: number; reach: number; clicks: number; spend: number;
  ctr: number; cpc: number; cpm: number; frequency: number;
  results: number; resultsActionType?: string; conversions: number;
  costPerResult: number; conversionRate: number; conversionValues: number;
  conversations: number; post_engagement: number; video_views: number;
  website_purchase_roas: number; actions: unknown[];
}

export interface ProcessedDailyInsight {
  date: string; impressions: number; reach: number; clicks: number;
  spend: number; results: number; conversions: number; conversations?: number; costPerResult: number;
}

export function processCampaignInsights(insight: Record<string, unknown>): ProcessedInsight {
  const safeInt = (v: unknown, d = 0) => { if (typeof v === "number") return isNaN(v) ? d : v; if (typeof v === "string") { const p = parseInt(v); return isNaN(p) ? d : p; } return d; };
  const safeFloat = (v: unknown, d = 0) => { if (typeof v === "number") return isNaN(v) ? d : v; if (typeof v === "string") { const p = parseFloat(v); return isNaN(p) ? d : p; } return d; };

  const actions = Array.isArray(insight.actions) ? (insight.actions as Record<string, unknown>[]) : [];
  const actionValues = Array.isArray(insight.action_values) ? (insight.action_values as Record<string, unknown>[]) : [];

  let totalConversions = 0, resultsActionType: string | undefined;
  if (insight.results != null) {
    if (typeof insight.results === "number") totalConversions = insight.results;
    else if (typeof insight.results === "string") totalConversions = parseInt(insight.results) || 0;
    else if (Array.isArray(insight.results) && (insight.results as unknown[]).length > 0) {
      const first = (insight.results as Record<string, unknown>[])[0];
      totalConversions = safeInt(first?.value);
      resultsActionType = typeof first?.action_type === "string" ? (first.action_type as string) : undefined;
    }
  }

  if (totalConversions === 0 && actions.length > 0) {
    const PRIORITY = ["lead", "onsite_conversion.total_messaging_connection", "messaging_conversation_started", "offsite_conversion.fb_pixel_lead", "purchase"];
    for (const type of PRIORITY) {
      const match = actions.find((a) => a.action_type === type);
      if (match) { totalConversions = safeInt(match.value); resultsActionType = type; break; }
    }
  }

  const clicks = safeInt(insight.clicks);
  const spend = safeFloat(insight.spend);
  let costPerResult = 0;
  if (insight.cost_per_result != null) {
    if (typeof insight.cost_per_result === "number") costPerResult = insight.cost_per_result;
    else if (typeof insight.cost_per_result === "string") costPerResult = parseFloat(insight.cost_per_result) || 0;
    else if (Array.isArray(insight.cost_per_result) && (insight.cost_per_result as unknown[]).length > 0) {
      costPerResult = safeFloat((insight.cost_per_result as Record<string, unknown>[])[0]?.value);
    }
  }
  if (costPerResult === 0 && totalConversions > 0) costPerResult = spend / totalConversions;

  const postEngagement = actions.find((a) => a.action_type === "post_engagement");
  const videoView = actions.find((a) => a.action_type === "video_view");
  const purchaseValue = actionValues.find((a) => typeof a.action_type === "string" && (a.action_type as string).includes("purchase"));
  const totalMsg = actions.find((a) => typeof a.action_type === "string" && (a.action_type as string) === "onsite_conversion.total_messaging_connection");
  const convMsg = actions.find((a) => typeof a.action_type === "string" && (a.action_type as string).includes("messaging_conversation_started"));

  return {
    impressions: safeInt(insight.impressions), reach: safeInt(insight.reach), clicks, spend,
    ctr: safeFloat(insight.ctr), cpc: safeFloat(insight.cpc), cpm: safeFloat(insight.cpm),
    frequency: safeFloat(insight.frequency), results: totalConversions, resultsActionType,
    conversions: totalConversions, costPerResult, conversionRate: clicks > 0 ? (totalConversions / clicks) * 100 : 0,
    conversionValues: actionValues.reduce((s, a) => s + safeFloat(a.value), 0),
    conversations: totalMsg ? safeInt(totalMsg.value) : convMsg ? safeInt(convMsg.value) : 0,
    post_engagement: postEngagement ? safeInt(postEngagement.value) : safeInt(insight.post_engagement),
    video_views: videoView ? safeInt(videoView.value) : safeInt(insight.video_views),
    website_purchase_roas: purchaseValue && spend > 0 ? safeFloat(purchaseValue.value) / spend : safeFloat(insight.website_purchase_roas),
    actions,
  };
}

export function processDailyInsight(d: Record<string, unknown>): ProcessedDailyInsight {
  let results = 0;
  if (d.results != null) {
    if (typeof d.results === "number") results = isNaN(d.results) ? 0 : d.results;
    else if (typeof d.results === "string") results = parseInt(d.results) || 0;
    else if (Array.isArray(d.results) && (d.results as unknown[]).length > 0) {
      results = parseInt(String((d.results as Record<string, unknown>[])[0]?.value || "0")) || 0;
    }
  }
  const spend = parseFloat(String(d.spend || "0"));
  return {
    date: String(d.date_start ?? ""),
    impressions: parseInt(String(d.impressions || "0")),
    reach: parseInt(String(d.reach || "0")),
    clicks: parseInt(String(d.clicks || "0")),
    spend, results, conversions: results,
    costPerResult: results > 0 ? spend / results : 0,
  };
}
