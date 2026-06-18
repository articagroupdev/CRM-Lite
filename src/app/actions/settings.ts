"use server";

import { cookies } from 'next/headers';
import { getCurrentUser } from './auth';
import { prisma } from '@/lib/prisma';
import { createNotification } from './notifications';

export type AiProvider = "auto" | "groq" | "gemini";

export async function saveAiProviderPreference(provider: AiProvider) {
  try {
    const cookieStore = await cookies();
    cookieStore.set('ai_provider', provider, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    });
    return { success: true };
  } catch {
    return { success: false, error: 'Error al guardar la preferencia' };
  }
}

export async function getAiProviderPreference(): Promise<AiProvider> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get('ai_provider')?.value;
    if (value === 'groq' || value === 'gemini') return value;
    return 'auto';
  } catch {
    return 'auto';
  }
}

export async function saveGeminiApiKeyAction(apiKey: string) {
  try {
    const cookieStore = await cookies();
    if (apiKey.trim()) {
      cookieStore.set('gemini_api_key', apiKey.trim(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365,
        path: '/',
        sameSite: 'lax',
      });
    } else {
      cookieStore.delete('gemini_api_key');
    }

    try {
      const userId = await getCurrentUser();
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      createNotification({
        type: "API_KEY_CHANGED",
        title: "API Key actualizada",
        body: `${user?.name || "Un usuario"} actualizó la Google Gemini API Key.`,
      }).catch(() => {});
    } catch { /* ignore if not authenticated */ }

    return { success: true };
  } catch {
    return { success: false, error: 'Error al guardar la API key' };
  }
}

export async function getGeminiApiKeyAction(): Promise<string> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('gemini_api_key')?.value || '';
  } catch {
    return '';
  }
}

export async function getEffectiveGeminiApiKey(): Promise<string> {
  const cookieStore = await cookies();
  const cookieKey = cookieStore.get('gemini_api_key')?.value;
  return cookieKey || process.env.GEMINI_API_KEY || '';
}
