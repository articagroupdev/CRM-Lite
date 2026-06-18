"use server";
import { generateGroqCampaignAnalysis, generateGroqTikTokAnalysis } from '@/lib/groq';
import { generateMetaCampaignAnalysis, generateTikTokCampaignAnalysis } from '@/lib/gemini';
import { getEffectiveGeminiApiKey, getAiProviderPreference } from '@/app/actions/settings';
import type { ReportData } from '@/types';

const EMPTY_RESULT = { summary: '', analysis: '', conclusions: '' };

async function resolveProvider() {
  const preference = await getAiProviderPreference();
  const hasGroq = !!process.env.GROQ_API_KEY;
  const geminiKey = await getEffectiveGeminiApiKey();
  return { preference, hasGroq, geminiKey };
}

export async function generateSingleCampaignReportContentAction(campaignData: ReportData) {
  try {
    const { preference, hasGroq, geminiKey } = await resolveProvider();

    // Force Groq only
    if (preference === 'groq') {
      if (!hasGroq) return { ...EMPTY_RESULT, error: 'Groq no está configurado en el servidor (GROQ_API_KEY).' };
      const r = await generateGroqCampaignAnalysis(campaignData);
      if (r.error) return { ...EMPTY_RESULT, error: r.error };
      return { summary: r.summary, analysis: r.analysis, conclusions: r.conclusions };
    }

    // Force Gemini only
    if (preference === 'gemini') {
      if (!geminiKey) return { ...EMPTY_RESULT, error: 'No hay clave de API de Gemini configurada.' };
      const r = await generateMetaCampaignAnalysis(campaignData, geminiKey);
      if (r.error) return { ...EMPTY_RESULT, error: r.error };
      return { summary: r.summary, analysis: r.analysis, conclusions: r.conclusions };
    }

    // Auto: try Groq first, then Gemini
    if (hasGroq) {
      const r = await generateGroqCampaignAnalysis(campaignData);
      if (!r.error) return { summary: r.summary, analysis: r.analysis, conclusions: r.conclusions };
    }
    if (geminiKey) {
      const r = await generateMetaCampaignAnalysis(campaignData, geminiKey);
      if (r.error) return { ...EMPTY_RESULT, error: r.error };
      return { summary: r.summary, analysis: r.analysis, conclusions: r.conclusions };
    }
    return { ...EMPTY_RESULT, error: 'No hay proveedor de IA configurado. Configura una clave API en Configuraciones.' };
  } catch (err: any) {
    return { ...EMPTY_RESULT, error: err.message || 'Error desconocido' };
  }
}

export async function generateTikTokCampaignReportContentAction(campaignData: ReportData) {
  try {
    const { preference, hasGroq, geminiKey } = await resolveProvider();

    if (preference === 'groq') {
      if (!hasGroq) return { ...EMPTY_RESULT, error: 'Groq no está configurado en el servidor (GROQ_API_KEY).' };
      const r = await generateGroqTikTokAnalysis(campaignData);
      if (r.error) return { ...EMPTY_RESULT, error: r.error };
      return { summary: r.summary, analysis: r.analysis, conclusions: r.conclusions };
    }

    if (preference === 'gemini') {
      if (!geminiKey) return { ...EMPTY_RESULT, error: 'No hay clave de API de Gemini configurada.' };
      const r = await generateTikTokCampaignAnalysis(campaignData, geminiKey);
      if (r.error) return { ...EMPTY_RESULT, error: r.error };
      return { summary: r.summary, analysis: r.analysis, conclusions: r.conclusions };
    }

    // Auto
    if (hasGroq) {
      const r = await generateGroqTikTokAnalysis(campaignData);
      if (!r.error) return { summary: r.summary, analysis: r.analysis, conclusions: r.conclusions };
    }
    if (geminiKey) {
      const r = await generateTikTokCampaignAnalysis(campaignData, geminiKey);
      if (r.error) return { ...EMPTY_RESULT, error: r.error };
      return { summary: r.summary, analysis: r.analysis, conclusions: r.conclusions };
    }
    return { ...EMPTY_RESULT, error: 'No hay proveedor de IA configurado. Configura una clave API en Configuraciones.' };
  } catch (err: any) {
    return { ...EMPTY_RESULT, error: err.message || 'Error desconocido' };
  }
}
