import { GoogleGenerativeAI } from '@google/generative-ai';
import type { ReportData } from '@/types';

const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export interface GeminiAnalysisResult {
  summary: string;
  analysis: string;
  conclusions: string;
  error?: string;
}

// Model fallback chain — no pre-testing, just try in order on actual call
const MODEL_CANDIDATES = [
  'gemini-1.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
];

function buildPrompt(campaignData: ReportData): string {
  const { campaignName, adName, facebookPageName, startDate, endDate,
    amountSpent, impressions, reach, results, linkClicks } = campaignData;
  const ctrCalc = impressions ? (((linkClicks || 0) / impressions) * 100).toFixed(2) : '0.00';
  const cpcCalc = linkClicks ? ((amountSpent || 0) / linkClicks).toFixed(2) : '0.00';
  const cprCalc = results ? ((amountSpent || 0) / results).toFixed(2) : '0.00';
  const freq = reach ? ((impressions || 0) / reach).toFixed(2) : '0.00';

  return `Eres un experto en Meta Ads. Analiza estos datos y responde en JSON con claves "summary", "analysis" (lista HTML <ul><li>...</li></ul>), "conclusions".
Página: ${facebookPageName} | Campaña: ${campaignName}${adName ? ` / ${adName}` : ''}
Período: ${startDate} – ${endDate}
Gasto: $${(amountSpent||0).toFixed(2)} | Alcance: ${reach||0} | Impresiones: ${impressions||0} | Frecuencia: ${freq}x
Resultados: ${results||0} | Costo/Resultado: $${cprCalc}
Clics: ${linkClicks||0} | CTR: ${ctrCalc}% | CPC: $${cpcCalc}
CRÍTICO: Responde SOLO con JSON válido, sin markdown ni texto extra.`;
}

function parseResponse(text: string): GeminiAnalysisResult {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        summary: parsed.summary || '',
        analysis: parsed.analysis || '',
        conclusions: parsed.conclusions || '',
      };
    }
  } catch { /* fallthrough */ }
  return { summary: '', analysis: `<p>${text}</p>`, conclusions: '' };
}

function extractRetryDelay(errMsg: string): number | null {
  const match = errMsg.match(/retryDelay['":\s]+['"]([\d.]+)s['"]/);
  if (match) return Math.ceil(parseFloat(match[1]));
  const match2 = errMsg.match(/retry in ([\d.]+)s/i);
  if (match2) return Math.ceil(parseFloat(match2[1]));
  return null;
}

function friendlyError(err: any): string {
  const msg: string = err?.message || String(err);
  if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
    const delay = extractRetryDelay(msg);
    return delay
      ? `Límite de la API Gemini excedido. Reintenta en ${delay} segundos.`
      : 'Límite de la API Gemini excedido (free tier). Espera un momento y vuelve a intentarlo.';
  }
  if (msg.includes('API key')) return 'Clave de API Gemini inválida o no configurada.';
  if (msg.includes('403')) return 'Acceso denegado a la API Gemini. Verifica tu clave API.';
  if (msg.includes('GOOGLE_API_KEY')) return 'Configure GOOGLE_API_KEY en el archivo .env';
  // Truncate very long messages
  if (msg.length > 200) return msg.slice(0, 200) + '…';
  return msg;
}

async function tryGenerate(prompt: string): Promise<string> {
  if (!genAI) throw new Error('GOOGLE_API_KEY no configurada.');

  let lastErr: any;
  for (const modelName of MODEL_CANDIDATES) {
    try {
      const m = genAI.getGenerativeModel({ model: modelName });
      const result = await m.generateContent(prompt);
      return result.response.text();
    } catch (err: any) {
      lastErr = err;
      const msg: string = err?.message || '';
      // If rate-limited, wait before trying next model
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        const delay = extractRetryDelay(msg);
        if (delay && delay < 120) {
          await new Promise(r => setTimeout(r, (delay + 2) * 1000));
        } else {
          // Too long to wait, fail fast
          throw err;
        }
      } else {
        // Non-rate-limit error: try next model
        continue;
      }
    }
  }
  throw lastErr;
}

export async function generateMetaCampaignAnalysis(campaignData: ReportData): Promise<GeminiAnalysisResult> {
  if (!GEMINI_API_KEY) {
    return {
      summary: 'Sin API Key',
      analysis: '<p>Configure <strong>GOOGLE_API_KEY</strong> en el archivo <code>.env</code> para activar el análisis de IA.</p>',
      conclusions: '',
      error: 'No API key',
    };
  }
  try {
    const text = await tryGenerate(buildPrompt(campaignData));
    return parseResponse(text);
  } catch (err: any) {
    const friendly = friendlyError(err);
    return {
      summary: '',
      analysis: `<p class="text-destructive">${friendly}</p>`,
      conclusions: '',
      error: friendly,
    };
  }
}
