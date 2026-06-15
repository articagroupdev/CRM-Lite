"use server";
import { generateGroqCampaignAnalysis } from '@/lib/groq';
import { generateMetaCampaignAnalysis } from '@/lib/gemini';
import type { ReportData } from '@/types';

export async function generateSingleCampaignReportContentAction(campaignData: ReportData) {
  try {
    // Use Groq if available, fall back to Gemini
    const useGroq = !!process.env.GROQ_API_KEY;
    const result = useGroq
      ? await generateGroqCampaignAnalysis(campaignData)
      : await generateMetaCampaignAnalysis(campaignData);

    if (result.error) return { error: result.error, summary: '', analysis: '', conclusions: '' };
    return { summary: result.summary, analysis: result.analysis, conclusions: result.conclusions };
  } catch (err: any) {
    return { error: err.message || 'Error desconocido', summary: '', analysis: '', conclusions: '' };
  }
}
