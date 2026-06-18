'use client';
import React from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import type { ReportData, SingleCampaignAiContent, MetricConfig, DailyData } from '@/types';

// ─── Page dimensions (letter at 96 dpi) ──────────────────────────────────────
const PW = 816;   // page width
const PH = 1056;  // page height
const PX = 44;    // horizontal padding
const PT = 36;    // top padding

// ─── Brand palette (functional – same regardless of platform) ─────────────────
const METRIC_CLR = ['#22c55e','#3b82f6','#8b5cf6','#9ca3af','#f97316','#0ca5c1','#60a5fa','#64748b'];
const CHART_IMP   = '#818cf8';
const CHART_RCH   = '#a78bfa';
const CHART_RES   = '#fb923c';
const CARD_TEAL   = '#0d9488';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function htmlToText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<ul[^>]*>|<\/ul>/gi, '')
    .replace(/<li[^>]*>/gi, '- ').replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p[^>]*>|<\/p>/gi, '\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ')
    .replace(/\n{3,}/g, '\n\n').trim();
}

function fmtN(v: number|null|undefined, money=false, pct=false): string {
  if (v == null || isNaN(v as number)) return '-';
  const n = v as number;
  if (money) return '$'+n.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2});
  if (pct)   return n.toFixed(2)+'%';
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1)+'M';
  if (n >= 1_000)     return (n/1_000).toFixed(1)+'K';
  return n.toFixed(n < 10 && n !== Math.floor(n) ? 2 : 0);
}

function fmtD(iso: string, long = false): string {
  try {
    return new Date(iso).toLocaleDateString('es-ES',
      long ? {day:'numeric',month:'long',year:'numeric'} : {day:'numeric',month:'short'});
  } catch { return iso; }
}

// ─── Recharts area+line chart ─────────────────────────────────────────────────
function PdfChart({ entries }: { entries: DailyData[] }) {
  if (!entries?.length || entries.length < 2) return (
    <div style={{height:190,display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af',fontSize:11}}>
      Sin datos de tendencia
    </div>
  );

  const step = Math.max(1, Math.ceil(entries.length / 7));
  const data = entries.map(d => ({
    d: fmtD(d.date),
    imp: d.impressions,
    rch: d.reach,
    res: d.results,
  }));

  return (
    <ComposedChart width={PW - PX*2 - 2} height={190} data={data}
      margin={{top:8, right:36, left:0, bottom:0}}>
      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
      <XAxis dataKey="d" tick={{fontSize:8,fill:'#9ca3af'}} interval={step-1}
        axisLine={{stroke:'#e5e7eb'}} tickLine={false} />
      <YAxis yAxisId="l" tick={{fontSize:8,fill:'#9ca3af'}} axisLine={false}
        tickLine={false} width={38}
        tickFormatter={(v:number) => v>=1000?`${(v/1000).toFixed(0)}K`:`${v}`} />
      <YAxis yAxisId="r" orientation="right" tick={{fontSize:8,fill:'#9ca3af'}}
        axisLine={false} tickLine={false} width={28} />
      <Area yAxisId="l" type="monotone" dataKey="imp" name="Impresiones"
        fill={CHART_IMP} fillOpacity={0.15} stroke={CHART_IMP} strokeWidth={1.5} dot={false} />
      <Area yAxisId="l" type="monotone" dataKey="rch" name="Alcance"
        fill={CHART_RCH} fillOpacity={0.15} stroke={CHART_RCH} strokeWidth={1.5} dot={false} />
      <Line yAxisId="r" type="monotone" dataKey="res" name="Resultados"
        stroke={CHART_RES} strokeWidth={1.5} dot={{r:3,fill:CHART_RES,strokeWidth:0}} />
    </ComposedChart>
  );
}

// ─── 8 metric keys ────────────────────────────────────────────────────────────
const M8 = [
  {k:'amountSpent',   lbl:'Importe Gastado',    m:true,  p:false, desc:'Costo total de la campana.'},
  {k:'reach',         lbl:'Alcance',             m:false, p:false, desc:'Personas unicas alcanzadas.'},
  {k:'impressions',   lbl:'Impresiones',         m:false, p:false, desc:'Veces mostrado el anuncio.'},
  {k:'frequency',     lbl:'Frecuencia',          m:false, p:false, desc:'Promedio de vistas por persona.'},
  {k:'results',       lbl:'Resultados',          m:false, p:false, desc:'Total de resultados obtenidos.'},
  {k:'costPerResult', lbl:'Costo/Resultado',     m:true,  p:false, desc:'Costo promedio por resultado.'},
  {k:'linkClicks',    lbl:'Clics en Enlace',     m:false, p:false, desc:'Total de clics en enlaces.'},
  {k:'ctr',           lbl:'CTR (Enlace)',        m:false, p:true,  desc:'Porcentaje de clics (Clics/Imp).'},
];

// ─── Shared sub-components ────────────────────────────────────────────────────
function AccentBar({color}:{color:string}) {
  return <div style={{height:4,backgroundColor:color,borderRadius:2,marginBottom:26}} />;
}

function PageFooter({left,right}:{left:string;right:string}) {
  return (
    <div style={{borderTop:'1px solid #e5e7eb',marginTop:'auto',paddingTop:8,display:'flex',justifyContent:'space-between'}}>
      <span style={{fontSize:9,color:'#9ca3af'}}>{left}</span>
      <span style={{fontSize:9,color:'#9ca3af'}}>{right}</span>
    </div>
  );
}

function CampaignCards({c,primary,accent}:{c:ReportData;primary:string;accent:string}) {
  const cards = [
    {n:'01', lbl:'NOMBRE DE LA CAMPANA', val:c.campaignName,              bg:primary},
    {n:'02', lbl:'CONJUNTO DE ANUNCIOS', val:c.adSetName||c.adName||'-',  bg:accent},
    {n:'03', lbl:'OBJETIVO',             val:c.resultColumnName||c.optimizationGoal||'-', bg:CARD_TEAL},
  ];
  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:18}}>
      {cards.map(card=>(
        <div key={card.n} style={{backgroundColor:card.bg,borderRadius:8,padding:'12px 14px',display:'flex',gap:10,alignItems:'flex-start'}}>
          <div style={{width:26,height:26,borderRadius:6,backgroundColor:'rgba(255,255,255,0.25)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'#fff'}}>
            {card.n}
          </div>
          <div>
            <div style={{fontSize:7,fontWeight:700,color:'rgba(255,255,255,0.7)',letterSpacing:'0.5px',marginBottom:2}}>{card.lbl}</div>
            <div style={{fontSize:13,fontWeight:800,color:'#fff',lineHeight:1.2}}>{card.val}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MetricGrid({c}:{c:ReportData}) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7,marginBottom:16}}>
      {M8.map((m,i)=>(
        <div key={m.k} style={{backgroundColor:'#fff',border:'1px solid #e5e7eb',borderRadius:7,padding:'10px 11px',borderLeft:`3px solid ${METRIC_CLR[i]}`}}>
          <div style={{fontSize:7,fontWeight:700,color:'#9ca3af',letterSpacing:'0.8px',textTransform:'uppercase',marginBottom:4}}>{m.lbl}</div>
          <div style={{fontSize:18,fontWeight:900,color:'#111827',lineHeight:1,marginBottom:3}}>
            {fmtN((c as any)[m.k],m.m,m.p)}
          </div>
          <div style={{fontSize:8,color:'#b0b7c3',lineHeight:1.2}}>{m.desc}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE 1 — Cover
// ═══════════════════════════════════════════════════════════════════════════════
function CoverPage({clientName,fileName,periodStr,count,primary,accent,logoSrc}:{
  clientName:string; fileName:string|null; periodStr:string|null; count:number;
  primary:string; accent:string; logoSrc:string;
}) {
  return (
    <div style={{width:PW,height:PH,backgroundColor:'#fff',boxSizing:'border-box',overflow:'hidden',display:'flex',flexDirection:'column',fontFamily:'system-ui,Arial,sans-serif'}}>
      {/* top accent */}
      <div style={{height:5,backgroundColor:accent,flexShrink:0}} />

      {/* header */}
      <div style={{padding:`28px ${PX}px 0`,display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexShrink:0}}>
        {logoSrc
          ? <img src={logoSrc} alt="Logo" style={{height:46,width:'auto',objectFit:'contain'}} />
          : <div style={{fontSize:18,fontWeight:900,color:primary}}>ARTICA</div>
        }
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:12,fontWeight:700,color:accent}}>Reporte de Rendimiento</div>
          <div style={{fontSize:11,color:'#6b7280',marginTop:3}}>
            {new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long',year:'numeric'})}
          </div>
        </div>
      </div>

      {/* flex spacer */}
      <div style={{flex:1}} />

      {/* main title */}
      <div style={{padding:`0 ${PX}px`}}>
        <div style={{fontSize:11,fontWeight:700,color:accent,letterSpacing:'3px',textTransform:'uppercase',marginBottom:12}}>
          Analisis de Campanas de Meta Ads
        </div>
        <div style={{fontSize:46,fontWeight:900,color:primary,lineHeight:1.05,marginBottom:14,letterSpacing:'-0.5px'}}>
          {clientName||'Cliente'}
        </div>
        <div style={{fontSize:13,color:'#6b7280',lineHeight:1.7,maxWidth:420}}>
          Un analisis detallado del rendimiento de las campanas, preparado por Artica Group.
        </div>
      </div>

      {/* flex spacer */}
      <div style={{flex:1}} />

      {/* bottom info */}
      <div style={{padding:`0 ${PX}px 0`}}>
        <div style={{borderTop:'1px solid #e5e7eb',paddingTop:20}}>
          <div style={{fontSize:9,fontWeight:700,color:'#374151',letterSpacing:'1px',textTransform:'uppercase',marginBottom:7}}>Periodo Analizado:</div>
          <div style={{fontSize:14,fontWeight:800,color:primary,marginBottom:8}}>{periodStr??'Periodo completo'}</div>
          {fileName && <div style={{fontSize:11,color:'#6b7280',marginBottom:5}}>Archivo: {fileName}</div>}
          <div style={{fontSize:11,fontWeight:600,color:'#374151'}}>Campanas Analizadas: {count}</div>
        </div>
      </div>

      {/* bottom accent */}
      <div style={{height:5,backgroundColor:primary,flexShrink:0,marginTop:28}} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE — Campaign Metrics
// ═══════════════════════════════════════════════════════════════════════════════
function CampaignMetricsPage({c,pg,total,primary,accent}:{
  c:ReportData; pg:number; total:number; primary:string; accent:string;
}) {
  return (
    <div style={{width:PW,height:PH,backgroundColor:'#fff',boxSizing:'border-box',overflow:'hidden',padding:`${PT}px ${PX}px 24px`,display:'flex',flexDirection:'column',fontFamily:'system-ui,Arial,sans-serif'}}>
      <AccentBar color={accent} />
      <CampaignCards c={c} primary={primary} accent={accent} />

      <div style={{fontSize:14,fontWeight:800,color:'#111827',marginBottom:3}}>Metricas y Graficos</div>
      <div style={{fontSize:10,color:'#6b7280',marginBottom:14}}>
        Metricas clave y visualizacion del rendimiento a lo largo del tiempo.
      </div>

      <MetricGrid c={c} />

      {/* chart card */}
      <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:'12px',flex:1,minHeight:0,overflow:'hidden'}}>
        {/* legend */}
        <div style={{display:'flex',gap:18,marginBottom:8}}>
          {[{lbl:'Impresiones',c:CHART_IMP},{lbl:'Alcance',c:CHART_RCH},{lbl:'Resultados',c:CHART_RES}].map(s=>(
            <div key={s.lbl} style={{display:'flex',alignItems:'center',gap:5}}>
              <div style={{width:8,height:8,borderRadius:4,backgroundColor:s.c}} />
              <span style={{fontSize:9,color:'#374151',fontWeight:500}}>{s.lbl}</span>
            </div>
          ))}
        </div>
        <PdfChart entries={c.dailyEntries} />
      </div>

      <PageFooter left="Artica Group - Analisis de Rendimiento" right={`Pagina ${pg} de ${total}`} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE — Campaign Analysis (AI)
// ═══════════════════════════════════════════════════════════════════════════════
function CampaignAnalysisPage({c,ai,pg,total,primary,accent}:{
  c:ReportData; ai:SingleCampaignAiContent; pg:number; total:number; primary:string; accent:string;
}) {
  const period = c.startDate!=='N/A' ? `${fmtD(c.startDate)} - ${fmtD(c.endDate)}` : null;
  const sections = [
    {title:'Resumen Ejecutivo',        text:htmlToText(ai.summary),     bg:'#eff6ff',col:'#1d4ed8'},
    {title:'Analisis del Rendimiento', text:htmlToText(ai.analysis),    bg:'#f0fdf4',col:'#15803d'},
    {title:'Conclusiones',             text:htmlToText(ai.conclusions), bg:'#faf5ff',col:'#7c3aed'},
  ];
  return (
    <div style={{width:PW,height:PH,backgroundColor:'#fff',boxSizing:'border-box',overflow:'hidden',padding:`${PT}px ${PX}px 24px`,display:'flex',flexDirection:'column',fontFamily:'system-ui,Arial,sans-serif'}}>
      <AccentBar color={primary} />

      <div style={{fontSize:22,fontWeight:900,color:'#111827',marginBottom:4}}>Analisis de Rendimiento</div>
      <div style={{fontSize:12,fontWeight:800,color:primary,textTransform:'uppercase',letterSpacing:'1px',marginBottom:6}}>{c.campaignName}</div>
      {period && <div style={{fontSize:10,color:'#6b7280',marginBottom:2}}>Periodo: {period}</div>}
      <div style={{fontSize:10,color:'#6b7280',marginBottom:18}}>Pagina/Cuenta: {c.facebookPageName}</div>
      <div style={{borderBottom:'1px solid #e5e7eb',marginBottom:18}} />

      {/* sections — each one is flex:1 so they share remaining space equally */}
      <div style={{display:'flex',flexDirection:'column',gap:10,flex:1,minHeight:0}}>
        {sections.map(s=>(
          <div key={s.title} style={{backgroundColor:s.bg,borderRadius:8,padding:'14px 16px',flex:1,overflow:'hidden'}}>
            <div style={{fontSize:12,fontWeight:800,color:s.col,marginBottom:7}}>{s.title}</div>
            <div style={{fontSize:10,color:s.col,lineHeight:1.6,whiteSpace:'pre-wrap',overflow:'hidden'}}>{s.text}</div>
          </div>
        ))}
      </div>

      <PageFooter left="Artica Group - Analisis de Rendimiento" right={`Pagina ${pg} de ${total}`} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE — Summary
// ═══════════════════════════════════════════════════════════════════════════════
function SummaryPage({data,primary,accent}:{data:ReportData[];primary:string;accent:string}) {
  const sum = (k:string) => data.reduce((s,r)=>s+((r as any)[k]||0),0);
  const avg = (k:string) => data.length ? sum(k)/data.length : 0;

  const kpis = [
    {lbl:'Campanas',        val:data.length.toString(),              bg:'#eff6ff'},
    {lbl:'Anuncios',        val:data.filter(r=>r.adName).length.toString()||data.length.toString(), bg:'#f0fdf4'},
    {lbl:'Inversion Total', val:'$'+sum('amountSpent').toFixed(2),   bg:'#fff7ed'},
  ];
  const mains = [
    {lbl:'Importe Gastado',  v:fmtN(sum('amountSpent'),true),   clr:METRIC_CLR[0]},
    {lbl:'Alcance Total',    v:fmtN(sum('reach')),              clr:METRIC_CLR[1]},
    {lbl:'Impresiones',      v:fmtN(sum('impressions')),        clr:METRIC_CLR[2]},
    {lbl:'Resultados',       v:fmtN(sum('results')),            clr:METRIC_CLR[4]},
    {lbl:'Clics en Enlace',  v:fmtN(sum('linkClicks')),         clr:METRIC_CLR[6]},
    {lbl:'Frecuencia Prom.', v:fmtN(avg('frequency')),          clr:METRIC_CLR[3]},
    {lbl:'Costo/Resultado',  v:fmtN(avg('costPerResult'),true), clr:METRIC_CLR[5]},
    {lbl:'CTR Promedio',     v:fmtN(avg('ctr'),false,true),     clr:METRIC_CLR[7]},
  ];

  // aggregate daily entries
  const allDates = [...new Set(data.flatMap(r=>r.dailyEntries.map(d=>d.date)))].sort();
  const aggEntries: DailyData[] = allDates.map(date=>{
    const ds = data.flatMap(r=>r.dailyEntries.filter(d=>d.date===date));
    return {date, impressions:ds.reduce((s,d)=>s+d.impressions,0), reach:ds.reduce((s,d)=>s+d.reach,0),
      amountSpent:ds.reduce((s,d)=>s+d.amountSpent,0), linkClicks:ds.reduce((s,d)=>s+d.linkClicks,0),
      results:ds.reduce((s,d)=>s+d.results,0)};
  });
  const today = new Date().toLocaleDateString('es-ES',{day:'numeric',month:'numeric',year:'numeric'});

  return (
    <div style={{width:PW,height:PH,backgroundColor:'#fff',boxSizing:'border-box',overflow:'hidden',padding:`${PT}px ${PX}px 24px`,display:'flex',flexDirection:'column',fontFamily:'system-ui,Arial,sans-serif'}}>
      <AccentBar color={accent} />

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:'#111827'}}>Resumen General de la Cuenta</div>
          <div style={{fontSize:11,color:'#6b7280',marginTop:2}}>{data[0]?.facebookPageName}</div>
        </div>
        <div style={{backgroundColor:'#f3f4f6',borderRadius:6,padding:'5px 12px',fontSize:10,color:'#374151',fontWeight:600}}>
          {allDates[0]?fmtD(allDates[0]):''} – {allDates.at(-1)?fmtD(allDates.at(-1)!):'' }
        </div>
      </div>
      <div style={{borderBottom:`2px solid ${primary}`,marginBottom:16}} />

      {/* KPI row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:18}}>
        {kpis.map(k=>(
          <div key={k.lbl} style={{backgroundColor:k.bg,border:'1px solid #e5e7eb',borderRadius:7,padding:'12px 14px'}}>
            <div style={{fontSize:7,fontWeight:700,color:'#6b7280',letterSpacing:'1px',textTransform:'uppercase',marginBottom:4}}>{k.lbl}</div>
            <div style={{fontSize:20,fontWeight:900,color:'#111827'}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* main metrics */}
      <div style={{fontSize:13,fontWeight:800,color:'#111827',marginBottom:10}}>Metricas Principales</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:7,marginBottom:18}}>
        {mains.map(m=>(
          <div key={m.lbl} style={{backgroundColor:'#fff',border:'1px solid #e5e7eb',borderRadius:7,padding:'9px 11px',borderLeft:`3px solid ${m.clr}`}}>
            <div style={{fontSize:7,fontWeight:700,color:'#9ca3af',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:3}}>{m.lbl}</div>
            <div style={{fontSize:17,fontWeight:900,color:'#111827'}}>{m.v}</div>
          </div>
        ))}
      </div>

      {/* aggregated chart */}
      <div style={{fontSize:13,fontWeight:800,color:'#111827',marginBottom:10}}>Rendimiento General</div>
      <div style={{border:'1px solid #e5e7eb',borderRadius:8,padding:'12px',flex:1,minHeight:0,overflow:'hidden'}}>
        <div style={{display:'flex',gap:16,marginBottom:8}}>
          {[{lbl:'Impresiones',c:CHART_IMP},{lbl:'Alcance',c:CHART_RCH},{lbl:'Resultados',c:CHART_RES}].map(s=>(
            <div key={s.lbl} style={{display:'flex',alignItems:'center',gap:4}}>
              <div style={{width:8,height:8,borderRadius:4,backgroundColor:s.c}} />
              <span style={{fontSize:9,color:'#374151',fontWeight:500}}>{s.lbl}</span>
            </div>
          ))}
        </div>
        <PdfChart entries={aggEntries} />
      </div>

      <PageFooter left="Artica Group - Resumen General de la Cuenta" right={today} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE — Closing
// ═══════════════════════════════════════════════════════════════════════════════
function ClosingPage({primary,accent,logoSrc}:{primary:string;accent:string;logoSrc:string}) {
  return (
    <div style={{width:PW,height:PH,backgroundColor:'#fff',boxSizing:'border-box',overflow:'hidden',display:'flex',flexDirection:'column',alignItems:'center',fontFamily:'system-ui,Arial,sans-serif'}}>
      <div style={{height:5,backgroundColor:accent,width:'100%',flexShrink:0}} />
      <div style={{flex:1}} />
      <div style={{textAlign:'center',padding:`0 ${PX*2}px`}}>
        {logoSrc
          ? <img src={logoSrc} alt="Logo" style={{height:60,width:'auto',objectFit:'contain',marginBottom:24,display:'block',marginLeft:'auto',marginRight:'auto'}} />
          : <div style={{fontSize:22,fontWeight:900,color:primary,marginBottom:24}}>ARTICA</div>
        }
        <div style={{fontSize:14,color:'#6b7280',lineHeight:1.7,marginBottom:36}}>
          Gracias por confiar en Artica Group para el analisis de tus campanas publicitarias.
        </div>
        <div style={{display:'flex',gap:36,justifyContent:'center',marginBottom:36}}>
          {[{lbl:'@artica_group',bg:'#e1306c'},{lbl:'articagroup.us',bg:primary},{lbl:'LinkedIn',bg:'#0a66c2'}].map(s=>(
            <div key={s.lbl} style={{textAlign:'center'}}>
              <div style={{width:48,height:48,borderRadius:24,backgroundColor:s.bg,margin:'0 auto 8px'}} />
              <div style={{fontSize:11,color:'#374151',fontWeight:600}}>{s.lbl}</div>
            </div>
          ))}
        </div>
        <div style={{borderTop:'1px solid #e5e7eb',paddingTop:16}}>
          <div style={{fontSize:11,color:'#6b7280',marginBottom:3}}>Artica Group - Creative Studio</div>
          <div style={{fontSize:10,color:'#9ca3af'}}>{new Date().getFullYear()} - Todos los derechos reservados</div>
        </div>
      </div>
      <div style={{flex:1}} />
      <div style={{height:5,backgroundColor:primary,width:'100%',flexShrink:0}} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main export
// ═══════════════════════════════════════════════════════════════════════════════
interface Props {
  reportData: ReportData[];
  aiContent: (SingleCampaignAiContent | {error:string;summary:string;analysis:string;conclusions:string} | null)[];
  clientName: string;
  visibleMetrics: Record<string,boolean>;
  allMetrics: MetricConfig[];
  fileName: string|null;
  platform?: 'meta-4101'|'meta';
  primaryHex?: string;
  accentHex?: string;
  logoSrc?: string;
  coverLogoSrc?: string;
}

export function PdfReportPage({reportData,aiContent,clientName,fileName,platform,primaryHex,accentHex,logoSrc,coverLogoSrc}:Props) {
  const is4101  = platform === 'meta-4101';
  const primary = primaryHex ?? (is4101 ? '#1a1a1a' : '#011b6a');
  const accent  = accentHex  ?? (is4101 ? '#E85A1A' : '#0ca5c1');
  const coverLogo   = coverLogoSrc || logoSrc || '';
  const closingLogo = logoSrc || coverLogoSrc || '';

  const overallStart = reportData.length
    ? reportData.reduce((e,c)=>new Date(c.startDate)<new Date(e)?c.startDate:e, reportData[0].startDate)
    : null;
  const overallEnd = reportData.length
    ? reportData.reduce((l,c)=>new Date(c.endDate)>new Date(l)?c.endDate:l, reportData[0].endDate)
    : null;
  const periodStr = overallStart && overallEnd && overallStart !== 'N/A'
    ? `${fmtD(overallStart,true)} al ${fmtD(overallEnd,true)}` : null;

  return (
    <div style={{width:`${PW}px`,fontFamily:'system-ui,Arial,sans-serif'}}>
      <CoverPage
        clientName={clientName||reportData[0]?.facebookPageName||'Cliente'}
        fileName={fileName} periodStr={periodStr} count={reportData.length}
        primary={primary} accent={accent} logoSrc={coverLogo}
      />
      {reportData.map((c,i)=>{
        const ai = aiContent[i];
        const hasAi = ai && !('error' in ai);
        return (
          <React.Fragment key={i}>
            <CampaignMetricsPage c={c} pg={i+1} total={reportData.length} primary={primary} accent={accent} />
            {hasAi && (
              <CampaignAnalysisPage c={c} ai={ai as SingleCampaignAiContent} pg={i+1} total={reportData.length} primary={primary} accent={accent} />
            )}
          </React.Fragment>
        );
      })}
      {reportData.length > 1 && <SummaryPage data={reportData} primary={primary} accent={accent} />}
      <ClosingPage primary={primary} accent={accent} logoSrc={closingLogo} />
    </div>
  );
}
