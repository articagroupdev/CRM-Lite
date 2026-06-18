"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';

export type AppTheme = 'dark-blue' | 'light' | 'custom';

interface ThemeContextValue {
  theme: AppTheme;
  customColor: string;
  setTheme: (theme: AppTheme) => void;
  setCustomColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark-blue',
  customColor: '#011b6a',
  setTheme: () => {},
  setCustomColor: () => {},
});

function isLightHex(hex: string): boolean {
  if (hex.length < 7) return false;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35;
}

function hexToHsl(hex: string): [number, number, number] {
  let r = 0, g = 0, b = 0;
  if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16) / 255;
    g = parseInt(hex.slice(3, 5), 16) / 255;
    b = parseInt(hex.slice(5, 7), 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function applyTheme(theme: AppTheme, customColor: string) {
  const html = document.documentElement;
  html.setAttribute('data-theme', theme);

  if (theme === 'custom') {
    const [h, s, l] = hexToHsl(customColor);
    const light = isLightHex(customColor);
    const lBg = Math.max(l - 8, 5);
    const sCap = Math.min(s, 55);

    html.style.setProperty('--primary', `${h} ${s}% ${l}%`);
    html.style.setProperty('--ring', `${h} ${s}% ${l}%`);
    html.style.setProperty('--sidebar-background', `${h} ${s}% ${lBg}%`);
    html.style.setProperty('--sidebar-border', `${h} ${sCap}% ${light ? Math.max(lBg - 15, 5) : Math.min(lBg + 8, 90)}%`);

    if (light) {
      // Light custom color → dark text, dark hover bg, white text on hover
      html.style.setProperty('--sidebar-foreground', `${h} ${sCap}% 10%`);
      html.style.setProperty('--sidebar-accent', `${h} ${sCap}% 15%`);
      html.style.setProperty('--sidebar-accent-foreground', `0 0% 100%`);
      html.style.setProperty('--sidebar-primary', `${h} ${sCap}% 12%`);
      html.style.setProperty('--sidebar-primary-foreground', `0 0% 100%`);
    } else {
      // Dark custom color → light text, slightly lighter hover
      html.style.setProperty('--sidebar-foreground', `0 0% 88%`);
      html.style.setProperty('--sidebar-accent', `${h} ${Math.max(s - 20, 10)}% ${Math.min(lBg + 12, 88)}%`);
      html.style.setProperty('--sidebar-accent-foreground', `0 0% 100%`);
      html.style.setProperty('--sidebar-primary', `${h} 90% ${Math.min(lBg + 18, 85)}%`);
      html.style.setProperty('--sidebar-primary-foreground', `0 0% 100%`);
    }
  } else {
    // Reset inline overrides when switching back
    const props = [
      '--primary', '--ring',
      '--sidebar-background', '--sidebar-foreground',
      '--sidebar-primary', '--sidebar-primary-foreground',
      '--sidebar-accent', '--sidebar-accent-foreground',
      '--sidebar-border', '--foreground',
    ];
    props.forEach(p => html.style.removeProperty(p));
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('dark-blue');
  const [customColor, setCustomColorState] = useState('#011b6a');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = localStorage.getItem('crm-theme') as AppTheme | null;
    const storedColor = localStorage.getItem('crm-custom-color') || '#011b6a';
    const t = storedTheme || 'dark-blue';
    setThemeState(t);
    setCustomColorState(storedColor);
    applyTheme(t, storedColor);
    setMounted(true);
  }, []);

  const setTheme = (t: AppTheme) => {
    setThemeState(t);
    localStorage.setItem('crm-theme', t);
    applyTheme(t, customColor);
  };

  const setCustomColor = (color: string) => {
    setCustomColorState(color);
    localStorage.setItem('crm-custom-color', color);
    if (theme === 'custom') applyTheme('custom', color);
  };

  return (
    <ThemeContext.Provider value={{ theme, customColor, setTheme, setCustomColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);
