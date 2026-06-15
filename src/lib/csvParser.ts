import type { ReportData, DailyData } from '@/types';

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else { inQ = !inQ; }
    } else if (ch === ',' && !inQ) {
      values.push(cur.trim()); cur = '';
    } else { cur += ch; }
  }
  values.push(cur.trim());
  return values.map(v => v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1).replace(/""/g, '"') : v.replace(/""/g, '"'));
}

export function parseMetaCSV(csvText: string, clientName?: string | null): ReportData[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV vacío o sin filas de datos.');
  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
  const dataRows = lines.slice(1);

  const idx = (opts: string[]) => {
    for (const o of opts) { const i = headers.indexOf(o.toLowerCase()); if (i !== -1) return i; }
    return -1;
  };
  const hdr = (opts: string[]) => {
    for (const o of opts) { const i = headers.indexOf(o.toLowerCase()); if (i !== -1) return parseCsvLine(lines[0])[i]; }
    return null;
  };

  const I = {
    date: idx(['día', 'date']),
    campaignName: idx(['nombre de la campaña', 'campaign name']),
    adSetName: idx(['nombre del conjunto de anuncios', 'ad set name']),
    adName: idx(['nombre del anuncio', 'ad name']),
    pageName: idx(['página', 'page', 'nombre de la página', 'page name', 'facebook page']),
    reach: idx(['alcance', 'reach']),
    impressions: idx(['impresiones', 'impressions']),
    linkClicks: idx(['clics en el enlace', 'link clicks']),
    amountSpent: idx(['importe gastado (usd)', 'amount spent (usd)', 'importe gastado', 'amount spent']),
    results: idx(['resultados', 'results']),
    leads: idx(['clientes potenciales', 'leads']),
    conversations: idx(['conversaciones con mensajes iniciadas']),
    cpc: idx(['cpc (costo por clic en el enlace)', 'cpc (costo por click en el enlace)']),
    ctr: idx(['ctr (porcentaje de clics en el enlace)']),
    cpm: idx(['cpm (costo por 1.000 impresiones)']),
    currency: idx(['divisa', 'currency']),
    costPerResult: idx(['costo por resultado']),
    costPerLead: idx(['costo por cliente potencial']),
    reportingStarts: idx(['inicio de los informes', 'reporting starts']),
    reportingEnds: idx(['fin de los informes', 'reporting ends']),
    frequency: idx(['frecuencia', 'frequency']),
    pageInteractions: idx(['interacciones con la página', 'page interactions']),
    profileVisits: idx(['visitas al perfil', 'profile visits']),
  };

  const resultsHeader = hdr(['resultados', 'clientes potenciales', 'conversaciones con mensajes iniciadas', 'visitas al perfil', 'interacciones con la página']);
  const cprHeader = hdr(['costo por resultado', 'costo por cliente potencial']);
  const hasDate = I.date !== -1;

  let pageNameFromCSV: string | null = null;
  if (dataRows.length > 0 && I.pageName !== -1) {
    pageNameFromCSV = parseCsvLine(dataRows[0])[I.pageName] || null;
  }

  const aggregated = new Map<string, ReportData>();

  dataRows.forEach(rowStr => {
    if (!rowStr.trim()) return;
    const v = parseCsvLine(rowStr);

    const campaignId = I.campaignName !== -1 ? v[I.campaignName] || '[Sin nombre]' : '[Sin nombre]';
    const adSetId = I.adSetName !== -1 ? v[I.adSetName] || null : null;
    const adId = I.adName !== -1 ? v[I.adName] || null : null;
    const key = adSetId ? `${campaignId}-${adSetId}-${adId || ''}` : `${campaignId}-${adId || ''}`;

    const num = (i: number): number => {
      if (i === -1) return 0;
      const s = v[i];
      if (!s || s === '-' || s.toLowerCase() === 'n/a') return 0;
      const n = parseFloat(s.replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };

    if (hasDate) {
      const daily: DailyData = {
        date: v[I.date],
        impressions: num(I.impressions), reach: num(I.reach),
        amountSpent: num(I.amountSpent), linkClicks: num(I.linkClicks),
        results: num(I.results) || num(I.leads) || num(I.conversations) || num(I.profileVisits) || num(I.pageInteractions),
      };
      if (aggregated.has(key)) {
        const ex = aggregated.get(key)!;
        ex.impressions += daily.impressions; ex.reach += daily.reach;
        ex.amountSpent = (ex.amountSpent || 0) + daily.amountSpent;
        ex.linkClicks = (ex.linkClicks || 0) + daily.linkClicks;
        ex.results = (ex.results || 0) + daily.results;
        ex.leads = (ex.leads || 0) + num(I.leads);
        ex.conversations = (ex.conversations || 0) + num(I.conversations);
        ex.pageInteractions = (ex.pageInteractions || 0) + num(I.pageInteractions);
        ex.dailyEntries.push(daily);
        if (new Date(daily.date) < new Date(ex.startDate)) ex.startDate = daily.date;
        if (new Date(daily.date) > new Date(ex.endDate)) ex.endDate = daily.date;
      } else {
        aggregated.set(key, {
          facebookPageName: pageNameFromCSV || clientName || '[Página]',
          campaignName: campaignId, adSetName: adSetId, adName: adId,
          startDate: daily.date, endDate: daily.date,
          impressions: daily.impressions, reach: daily.reach,
          amountSpent: daily.amountSpent, linkClicks: daily.linkClicks,
          results: daily.results, leads: num(I.leads),
          conversations: num(I.conversations), pageInteractions: num(I.pageInteractions),
          dailyEntries: [daily], resultColumnName: resultsHeader, costPerResultColumnName: cprHeader,
          currency: I.currency !== -1 ? v[I.currency] : 'USD',
          frequency: 0, cpc: 0, ctr: 0, cpm: 0, costPerResult: 0,
        });
      }
    } else {
      aggregated.set(key, {
        facebookPageName: pageNameFromCSV || clientName || '[Página]',
        campaignName: campaignId, adSetName: adSetId, adName: adId,
        startDate: v[I.reportingStarts] || new Date().toISOString().split('T')[0],
        endDate: v[I.reportingEnds] || new Date().toISOString().split('T')[0],
        impressions: num(I.impressions), reach: num(I.reach),
        amountSpent: num(I.amountSpent), linkClicks: num(I.linkClicks),
        results: num(I.results) || num(I.leads) || num(I.conversations) || num(I.profileVisits) || num(I.pageInteractions),
        leads: num(I.leads), conversations: num(I.conversations), dailyEntries: [],
        resultColumnName: resultsHeader, costPerResultColumnName: cprHeader,
        currency: I.currency !== -1 ? v[I.currency] : 'USD',
        frequency: num(I.frequency), cpc: num(I.cpc), ctr: num(I.ctr),
        cpm: num(I.cpm), costPerResult: num(I.costPerResult) || num(I.costPerLead),
        pageInteractions: num(I.pageInteractions), profileVisits: num(I.profileVisits),
      });
    }
  });

  aggregated.forEach(r => {
    if (r.dailyEntries.length > 0) r.dailyEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (!r.frequency) r.frequency = r.reach > 0 ? r.impressions / r.reach : 0;
    if (!r.cpc) r.cpc = (r.linkClicks || 0) > 0 ? (r.amountSpent || 0) / (r.linkClicks || 1) : 0;
    if (!r.ctr) r.ctr = r.impressions > 0 ? ((r.linkClicks || 0) / r.impressions) * 100 : 0;
    if (!r.cpm) r.cpm = r.impressions > 0 ? ((r.amountSpent || 0) / r.impressions) * 1000 : 0;
    if (!r.costPerResult) r.costPerResult = (r.results || 0) > 0 ? (r.amountSpent || 0) / (r.results || 1) : 0;
  });

  return Array.from(aggregated.values());
}
