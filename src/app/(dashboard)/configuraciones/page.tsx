"use client";

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAppTheme, type AppTheme } from '@/context/ThemeContext';
import {
  saveGeminiApiKeyAction,
  getGeminiApiKeyAction,
  saveAiProviderPreference,
  getAiProviderPreference,
  type AiProvider,
} from '@/app/actions/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GearSix, Palette, Key, Eye, EyeSlash, CheckCircle, Sliders, Robot, Lightning, Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const PROVIDERS: {
  id: AiProvider;
  label: string;
  desc: string;
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}[] = [
  {
    id: 'auto',
    label: 'Automático',
    desc: 'Usa Groq si está disponible, si no usa Gemini como respaldo.',
    icon: <Robot size={18} className="text-violet-500" weight="duotone" />,
  },
  {
    id: 'groq',
    label: 'Groq',
    desc: 'Siempre usar Groq (LLaMA). Requiere GROQ_API_KEY en el servidor.',
    icon: <Lightning size={18} className="text-orange-500" weight="duotone" />,
    badge: process.env.NEXT_PUBLIC_HAS_GROQ === 'true' ? 'Activo' : 'Via .env',
    badgeColor: process.env.NEXT_PUBLIC_HAS_GROQ === 'true' ? 'text-green-700 bg-green-100' : 'text-muted-foreground bg-muted',
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    desc: 'Siempre usar Gemini. Requiere la API Key configurada abajo.',
    icon: <Sparkle size={18} className="text-blue-500" weight="duotone" />,
  },
];

const THEMES: { id: AppTheme; label: string; desc: string; preview: { sidebar: string; content: string; text: string } }[] = [
  {
    id: 'dark-blue',
    label: 'Azul Oscuro',
    desc: 'Tema por defecto con sidebar navy oscuro',
    preview: { sidebar: '#011b6a', content: '#ffffff', text: '#1f2937' },
  },
  {
    id: 'light',
    label: 'Blanco',
    desc: 'Tema claro con sidebar gris suave',
    preview: { sidebar: '#e8eaf0', content: '#f7f8fa', text: '#1a2035' },
  },
  {
    id: 'custom',
    label: 'Personalizado',
    desc: 'Elige tu propio color primario',
    preview: { sidebar: '#6366f1', content: '#ffffff', text: '#1f2937' },
  },
];

export default function ConfiguracionesPage() {
  const { toast } = useToast();
  const { theme, customColor, setTheme, setCustomColor } = useAppTheme();

  const [geminiKey, setGeminiKey] = useState('');
  const [geminiKeyMasked, setGeminiKeyMasked] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [keySaved, setKeySaved] = useState(false);
  const [localCustomColor, setLocalCustomColor] = useState(customColor);
  const [aiProvider, setAiProvider] = useState<AiProvider>('auto');
  const [savingProvider, setSavingProvider] = useState(false);
  const [providerSaved, setProviderSaved] = useState(false);

  useEffect(() => {
    getGeminiApiKeyAction().then(key => {
      if (key) setGeminiKeyMasked('••••••••••••••••••••' + key.slice(-4));
    });
    getAiProviderPreference().then(p => setAiProvider(p));
    setLocalCustomColor(customColor);
  }, [customColor]);

  const handleSaveProvider = async () => {
    setSavingProvider(true);
    try {
      const result = await saveAiProviderPreference(aiProvider);
      if (result.success) {
        setProviderSaved(true);
        toast({ title: 'Proveedor guardado', description: `El analizador usará ${aiProvider === 'auto' ? 'modo automático' : aiProvider === 'groq' ? 'Groq' : 'Google Gemini'}.` });
        setTimeout(() => setProviderSaved(false), 3000);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setSavingProvider(false);
    }
  };

  const handleSaveGeminiKey = async () => {
    setSavingKey(true);
    try {
      const result = await saveGeminiApiKeyAction(geminiKey);
      if (result.success) {
        setKeySaved(true);
        setGeminiKeyMasked(geminiKey ? '••••••••••••••••••••' + geminiKey.slice(-4) : '');
        setGeminiKey('');
        setShowKey(false);
        toast({ title: 'API Key guardada', description: 'La clave de Gemini se actualizó correctamente.' });
        setTimeout(() => setKeySaved(false), 3000);
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } finally {
      setSavingKey(false);
    }
  };

  const handleApplyCustomColor = () => {
    setCustomColor(localCustomColor);
    if (theme !== 'custom') setTheme('custom');
    toast({ title: 'Color aplicado', description: 'El tema personalizado se aplicó.' });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-secondary shadow-lg">
            <GearSix size={28} weight="bold" className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Configuraciones</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Personaliza la apariencia y las integraciones del sistema</p>
          </div>
        </div>

        {/* ── Tema ── */}
        <Card className="mb-6 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-secondary" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette size={18} className="text-primary" /> Apariencia
            </CardTitle>
            <CardDescription>Selecciona el tema visual del dashboard</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    'relative rounded-xl border-2 p-4 text-left transition-all focus:outline-none',
                    theme === t.id
                      ? 'border-primary ring-2 ring-primary/20 shadow-md'
                      : 'border-border hover:border-primary/40 hover:shadow-sm'
                  )}
                >
                  {theme === t.id && (
                    <CheckCircle size={18} weight="fill" className="absolute top-2.5 right-2.5 text-primary" />
                  )}
                  {/* Mini preview */}
                  <div className="rounded-lg overflow-hidden mb-3 h-14 flex border border-border/50">
                    <div className="w-8 flex-shrink-0" style={{ backgroundColor: t.id === 'custom' ? localCustomColor : t.preview.sidebar }} />
                    <div className="flex-1 flex items-center px-2 gap-1" style={{ backgroundColor: t.preview.content }}>
                      <div className="flex flex-col gap-1 w-full">
                        <div className="h-1.5 rounded-full w-3/4" style={{ backgroundColor: t.id === 'custom' ? localCustomColor : t.preview.sidebar, opacity: 0.3 }} />
                        <div className="h-1.5 rounded-full w-1/2" style={{ backgroundColor: t.preview.text, opacity: 0.2 }} />
                        <div className="h-1.5 rounded-full w-2/3" style={{ backgroundColor: t.preview.text, opacity: 0.15 }} />
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>

            {/* Custom color picker */}
            {theme === 'custom' && (
              <div className="bg-muted/40 rounded-xl p-4 border border-border">
                <Label className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Sliders size={14} className="text-primary" /> Color primario personalizado
                </Label>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <input
                    type="color"
                    value={localCustomColor}
                    onChange={e => setLocalCustomColor(e.target.value)}
                    className="h-10 w-12 rounded-lg cursor-pointer border border-border p-0.5 bg-white flex-shrink-0"
                  />
                  <Input
                    value={localCustomColor}
                    onChange={e => setLocalCustomColor(e.target.value)}
                    placeholder="#011b6a"
                    className="w-28 font-mono text-sm flex-shrink-0"
                    maxLength={7}
                  />
                  <Button onClick={handleApplyCustomColor} size="sm" className="bg-primary hover:bg-primary/90">
                    Aplicar color
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  El color seleccionado se aplica al sidebar y a los elementos primarios del dashboard.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── API Keys ── */}
        <Card className="overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary to-secondary" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Key size={18} className="text-primary" /> Integraciones de IA
            </CardTitle>
            <CardDescription>
              Configura las claves API para el análisis con inteligencia artificial. La clave se guarda de forma segura y reemplaza la variable de entorno.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2 space-y-5">

            {/* ── Proveedor activo ── */}
            <div className="bg-muted/40 rounded-xl p-4 border border-border">
              <p className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <Robot size={16} className="text-primary" weight="duotone" />
                Proveedor activo para el Analizador
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Elige qué modelo de IA se usará al generar análisis de campañas.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setAiProvider(p.id)}
                    className={cn(
                      'relative flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-all focus:outline-none',
                      aiProvider === p.id
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                        : 'border-border hover:border-primary/40 bg-background'
                    )}
                  >
                    {aiProvider === p.id && (
                      <CheckCircle size={14} weight="fill" className="absolute top-2.5 right-2.5 text-primary" />
                    )}
                    <div className="flex items-center gap-2">
                      {p.icon}
                      <span className="text-sm font-semibold text-foreground">{p.label}</span>
                      {p.badge && (
                        <span className={cn('ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium', p.badgeColor)}>
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{p.desc}</p>
                  </button>
                ))}
              </div>
              <Button
                onClick={handleSaveProvider}
                disabled={savingProvider}
                size="sm"
                className={cn(providerSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90')}
              >
                {providerSaved
                  ? <><CheckCircle size={14} className="mr-1.5" /> Guardado</>
                  : savingProvider ? 'Guardando…' : 'Guardar preferencia'}
              </Button>
            </div>

            {/* Gemini API Key */}
            <div className="bg-muted/40 rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-xs">G</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Google Gemini API Key</p>
                  <p className="text-xs text-muted-foreground">API Key de Google — requerida si seleccionas Gemini</p>
                </div>
              </div>

              {geminiKeyMasked && (
                <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground bg-background rounded-lg px-3 py-2 border border-border">
                  <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                  <span>Clave activa: <span className="font-mono">{geminiKeyMasked}</span></span>
                </div>
              )}

              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                {geminiKeyMasked ? 'Reemplazar clave' : 'Nueva clave API'}
              </Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={e => setGeminiKey(e.target.value)}
                    placeholder="AIza..."
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <Button
                  onClick={handleSaveGeminiKey}
                  disabled={savingKey || !geminiKey.trim()}
                  className={cn('sm:min-w-[90px] w-full sm:w-auto', keySaved ? 'bg-green-600 hover:bg-green-700' : 'bg-primary hover:bg-primary/90')}
                >
                  {keySaved ? <><CheckCircle size={14} className="mr-1.5" /> Guardado</> : savingKey ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Obtén tu clave en <span className="font-medium text-foreground">aistudio.google.com</span>. Se guarda de forma segura y no se comparte.
              </p>
            </div>

            {/* Groq info */}
            <div className="bg-muted/40 rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-xs">Q</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Groq API Key</p>
                  <p className="text-xs text-muted-foreground">LLaMA 3 — configurado via variable de entorno</p>
                </div>
                <div className="ml-auto">
                  {process.env.NEXT_PUBLIC_HAS_GROQ === 'true' ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Activo</span>
                  ) : (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">Via .env</span>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                La clave de Groq se configura únicamente en las variables de entorno del servidor (<span className="font-mono text-foreground">GROQ_API_KEY</span>).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
