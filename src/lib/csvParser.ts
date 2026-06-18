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

export function parseTikTokCSV(csvText: string, clientName?: string | null): ReportData[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) throw new Error('CSV de TikTok vacío o sin filas de datos.');

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim().replace(/\s+/g, ' '));

  const getIndex = (opts: string[]) => {
    for (const o of opts) {
      const n = o.toLowerCase().trim().replace(/\s+/g, ' ');
      const i = headers.indexOf(n);
      if (i !== -1) return i;
      const pi = headers.findIndex(h => h.includes(n) || n.includes(h));
      if (pi !== -1) return pi;
    }
    return -1;
  };

  const I = {
    date: getIndex(['día', 'fecha', 'por día', 'date', 'day', 'by day', 'time', 'periodo', 'period', 'fecha de inicio', 'start date']),
    reportingStarts: getIndex(['inicio del informe', 'reporting starts', 'fecha inicio', 'start date']),
    reportingEnds: getIndex(['fin del informe', 'reporting ends', 'fecha fin', 'end date']),
    campaignName: getIndex(['nombre de la campaña', 'campaign name', 'campaña', 'campaign', 'nombre campaña', 'nombre de campaña', 'campaign_name']),
    adGroupName: getIndex(['nombre del grupo de anuncios', 'ad group name', 'adgroup name', 'grupo de anuncios', 'ad group', 'adgroup_name', 'ad_group_name', 'ad set name', 'nombre del conjunto de anuncios']),
    adName: getIndex(['nombre del anuncio', 'ad name', 'anuncio', 'ad', 'nombre anuncio', 'creative name', 'nombre creativo', 'ad_name', 'creative', 'creativo']),
    pageName: getIndex(['página', 'page', 'tiktok page', 'cuenta', 'account', 'nombre de la cuenta', 'account name', 'advertiser name', 'nombre del anunciante', 'advertiser', 'brand', 'marca', 'perfil', 'profile', 'identity name']),
    impressions: getIndex(['impresiones', 'impressions', 'impression', 'total impresiones', 'total impressions']),
    reach: getIndex(['alcance', 'reach', 'usuarios alcanzados', 'unique reach', 'alcance único', 'personas alcanzadas']),
    frequency: getIndex(['frecuencia', 'frequency', 'avg. frequency', 'frecuencia promedio']),
    clicks: getIndex(['clics (destino)', 'clicks (destination)', 'clics', 'clicks', 'clicks (all)', 'total de clics', 'total clicks', 'clics en el enlace', 'link clicks']),
    ctr: getIndex(['ctr (destino)', 'ctr (destination)', 'ctr', 'ctr (all)', 'ctr (%)', 'click-through rate', 'tasa de clics']),
    spend: getIndex(['coste', 'costo', 'cost', 'spend', 'gasto', 'importe gastado', 'amount spent', 'total spend', 'coste total', 'total cost', 'inversión']),
    cpc: getIndex(['cpc (destino)', 'cpc (destination)', 'cpc', 'costo por clic', 'cost per click', 'coste por clic']),
    cpm: getIndex(['cpm', 'cpm (costo por 1.000 impresiones)', 'cost per mille', 'costo por mil', 'cpm (costo por 1000 impresiones)']),
    conversions: getIndex(['conversiones', 'conversions', 'conversion', 'total conversiones', 'total conversions']),
    results: getIndex(['resultados', 'results', 'result', 'total de resultados', 'total results']),
    cpa: getIndex(['coste por conversión', 'costo por conversión', 'cpa', 'cost per conversion', 'cost per action', 'coste por resultado', 'cost per result', 'costo por resultado']),
    resultRate: getIndex(['tasa de resultados', 'tasa de resultado', 'result rate', 'tasa de conversión', 'conversion rate', 'cvr']),
    videoViews: getIndex(['visualizaciones de vídeo', 'visualizaciones de video', 'video views', 'vistas de video', 'reproducciones de video', 'video plays', 'views']),
    optimizationGoal: getIndex(['objetivo de optimización', 'optimization goal', 'objetivo', 'goal', 'objetivo de la campaña', 'campaign objective']),
    currency: getIndex(['divisa', 'currency', 'moneda']),
    campaignBudget: getIndex(['presupuesto de la campaña', 'campaign budget', 'budget']),
    adGroupBudget: getIndex(['presupuesto del grupo de anuncios', 'ad group budget']),
  };

  const defaultDate = new Date().toISOString().split('T')[0];
  const hasDateCol = I.date !== -1;
  const hasReportDates = I.reportingStarts !== -1 || I.reportingEnds !== -1;

  const safe = (i: number, vals: string[], fb = ''): string => {
    if (i === -1 || i >= vals.length) return fb;
    const v = vals[i]?.trim();
    return (v && v !== '-' && v !== '--' && v.toLowerCase() !== 'n/a') ? v : fb;
  };

  const parseNum = (i: number, vals: string[]): number => {
    if (i === -1) return 0;
    let s = vals[i];
    if (!s || s === '-' || s === '--' || s.toLowerCase() === 'n/a' || s === '') return 0;
    s = s.replace(/[$€£¥₱]/g, '').replace(/%/g, '').trim();
    if (/,\d{2}$/.test(s) && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.includes(',')) s = s.replace(/,/g, '');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  const parseDate = (d: string): string => {
    if (!d || d === '-' || d === '--') return defaultDate;
    if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.split('T')[0];
    const p = new Date(d);
    if (!isNaN(p.getTime())) return p.toISOString().split('T')[0];
    return d;
  };

  const totalPatterns = ['total', 'totales', 'suma', 'resumen', 'summary', 'grand total', 'total general', 'all campaigns', 'todas las campañas', 'agregado', 'consolidated', 'consolidado'];
  const isTotalRow = (vals: string[]): boolean => {
    for (let i = 0; i < Math.min(vals.length, 5); i++) {
      const v = vals[i]?.toLowerCase().trim();
      if (v && totalPatterns.some(p => v === p || v.startsWith(p + ' ') || v.endsWith(' ' + p))) return true;
    }
    return false;
  };

  const aggregated = new Map<string, ReportData>();
  let pageNameFromCSV: string | null = null;
  if (lines.length > 1 && I.pageName !== -1) {
    const first = parseCsvLine(lines[1]);
    pageNameFromCSV = first[I.pageName] || null;
  }

  lines.slice(1).forEach((rowStr, rowIndex) => {
    if (!rowStr.trim()) return;
    const vals = parseCsvLine(rowStr);
    if (isTotalRow(vals)) return;

    let campaignName = safe(I.campaignName, vals);
    let adGroupName = safe(I.adGroupName, vals);
    let adName = safe(I.adName, vals);

    if (!campaignName && !adGroupName && !adName) {
      if (parseNum(I.impressions, vals) > 0 || parseNum(I.spend, vals) > 0) {
        if (aggregated.size > 0) return;
      }
      for (let i = 0; i < Math.min(vals.length, 5); i++) {
        const v = vals[i]?.trim();
        if (v && v.length > 2 && !/^\d+([.,]\d+)?$/.test(v) && !/^\d{4}-\d{2}-\d{2}/.test(v)) {
          campaignName = v;
          break;
        }
      }
    }

    const identifier = adName || adGroupName || campaignName || `Campaña_${rowIndex + 1}`;
    const key = `${campaignName || 'default'}-${identifier}`;

    let rowDate: string;
    if (hasDateCol) rowDate = parseDate(vals[I.date]);
    else if (hasReportDates) rowDate = parseDate(vals[I.reportingStarts] || vals[I.reportingEnds] || defaultDate);
    else rowDate = defaultDate;

    const dailyEntry: DailyData = {
      date: rowDate,
      impressions: parseNum(I.impressions, vals),
      reach: parseNum(I.reach, vals),
      amountSpent: parseNum(I.spend, vals),
      linkClicks: parseNum(I.clicks, vals),
      results: parseNum(I.results, vals) || parseNum(I.conversions, vals),
    };

    let existing = aggregated.get(key);
    if (!existing) {
      const entityName = pageNameFromCSV || clientName || campaignName || 'TikTok Ads';
      const endDate = hasReportDates && I.reportingEnds !== -1 ? parseDate(safe(I.reportingEnds, vals, rowDate)) : rowDate;
      const goal = safe(I.optimizationGoal, vals);
      let resultColumnName = 'Conversiones';
      let costPerResultColumnName = 'Costo por Conversión';
      if (goal) {
        const g = goal.toLowerCase();
        if (g.includes('lead') || g.includes('cliente potencial')) { resultColumnName = 'Leads'; costPerResultColumnName = 'Costo por Lead'; }
        else if (g.includes('install') || g.includes('instalación')) { resultColumnName = 'Instalaciones'; costPerResultColumnName = 'Costo por Instalación'; }
        else if (g.includes('purchase') || g.includes('compra')) { resultColumnName = 'Compras'; costPerResultColumnName = 'Costo por Compra'; }
        else if (g.includes('registration') || g.includes('registro')) { resultColumnName = 'Registros'; costPerResultColumnName = 'Costo por Registro'; }
      }
      existing = {
        facebookPageName: entityName,
        campaignName: campaignName || `Campaña ${aggregated.size + 1}`,
        adName: adName || adGroupName || undefined,
        startDate: rowDate,
        endDate,
        impressions: 0, reach: 0, amountSpent: 0, linkClicks: 0, results: 0,
        conversations: 0, videoPlays: 0,
        resultRate: parseNum(I.resultRate, vals),
        dailyEntries: [],
        resultColumnName, costPerResultColumnName,
        currency: safe(I.currency, vals, 'USD'),
        frequency: parseNum(I.frequency, vals),
        cpc: parseNum(I.cpc, vals),
        ctr: parseNum(I.ctr, vals),
        cpm: parseNum(I.cpm, vals),
        costPerResult: parseNum(I.cpa, vals),
        optimizationGoal: goal || undefined,
      };
      aggregated.set(key, existing);
    }

    existing.impressions += dailyEntry.impressions;
    existing.reach += dailyEntry.reach;
    existing.amountSpent = (existing.amountSpent || 0) + dailyEntry.amountSpent;
    existing.linkClicks = (existing.linkClicks || 0) + dailyEntry.linkClicks;
    existing.results = (existing.results || 0) + dailyEntry.results;
    existing.videoPlays = (existing.videoPlays || 0) + parseNum(I.videoViews, vals);
    if (hasDateCol || hasReportDates) existing.dailyEntries.push(dailyEntry);

    const d = new Date(rowDate);
    if (d < new Date(existing.startDate)) existing.startDate = rowDate;
    if (d > new Date(existing.endDate)) existing.endDate = rowDate;
  });

  const results = Array.from(aggregated.values());

  results.forEach(r => {
    if (r.dailyEntries.length > 0) r.dailyEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (!r.ctr || r.ctr === 0) r.ctr = r.impressions > 0 ? ((r.linkClicks || 0) / r.impressions) * 100 : 0;
    if (!r.cpc || r.cpc === 0) r.cpc = (r.linkClicks || 0) > 0 ? (r.amountSpent || 0) / (r.linkClicks || 1) : 0;
    if (!r.cpm || r.cpm === 0) r.cpm = r.impressions > 0 ? ((r.amountSpent || 0) / r.impressions) * 1000 : 0;
    if (!r.costPerResult || r.costPerResult === 0) r.costPerResult = (r.results || 0) > 0 ? (r.amountSpent || 0) / (r.results || 1) : 0;
    if (!r.resultRate || r.resultRate === 0) r.resultRate = (r.linkClicks || 0) > 0 ? ((r.results || 0) / (r.linkClicks || 1)) * 100 : 0;
    if (!r.frequency || r.frequency === 0) r.frequency = r.reach > 0 ? r.impressions / r.reach : 0;
    r.conversations = r.results || 0;
  });

  if (results.length === 0) throw new Error('No se pudieron extraer datos válidos del CSV de TikTok. Verifica el formato del archivo.');
  return results;
}
