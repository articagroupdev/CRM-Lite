import Groq from 'groq-sdk';
import type { ReportData } from '@/types';
import type { GeminiAnalysisResult } from './gemini';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;

// Models in order of preference — llama-3.3-70b is best quality, fallback to 8b
const MODEL_CANDIDATES = [
  'llama-3.3-70b-versatile',
  'llama3-8b-8192',
  'gemma2-9b-it',
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

function friendlyError(err: any): string {
  const msg: string = err?.message || String(err);
  if (msg.includes('429') || msg.includes('rate_limit') || msg.includes('rate limit')) {
    return 'Límite de velocidad de Groq alcanzado. Espera unos segundos y vuelve a intentarlo.';
  }
  if (msg.includes('401') || msg.includes('api_key') || msg.includes('API key')) {
    return 'Clave de API Groq inválida o no configurada.';
  }
  if (msg.includes('403')) return 'Acceso denegado a la API Groq. Verifica tu clave API.';
  if (msg.length > 200) return msg.slice(0, 200) + '…';
  return msg;
}

async function tryGenerate(prompt: string): Promise<string> {
  if (!groq) throw new Error('GROQ_API_KEY no configurada.');

  let lastErr: any;
  for (const modelName of MODEL_CANDIDATES) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: modelName,
        temperature: 0.3,
        max_tokens: 1024,
      });
      return completion.choices[0]?.message?.content || '';
    } catch (err: any) {
      lastErr = err;
      const msg: string = err?.message || '';
      if (msg.includes('429') || msg.includes('rate_limit')) {
        // Brief pause then try next model
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      // Non-rate-limit error: try next model
      continue;
    }
  }
  throw lastErr;
}

export async function generateGroqCampaignAnalysis(campaignData: ReportData): Promise<GeminiAnalysisResult> {
  if (!GROQ_API_KEY) {
    return {
      summary: 'Sin API Key',
      analysis: '<p>Configure <strong>GROQ_API_KEY</strong> en el archivo <code>.env</code> para activar el análisis de IA con Groq.</p>',
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
