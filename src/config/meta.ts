export const META_GRAPH_API_VERSION = "v23.0";
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`;

export function buildMetaDateParams(dateRange?: { from: Date; to: Date }, datePreset?: string): string {
  if (datePreset) return `&date_preset=${datePreset}`;
  if (!dateRange?.from || !dateRange?.to) return "";
  const from = dateRange.from.toISOString().split("T")[0];
  const to = dateRange.to.toISOString().split("T")[0];
  return `&time_range={"since":"${from}","until":"${to}"}`;
}
