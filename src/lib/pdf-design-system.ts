export type PdfBrand = 'default' | '4101';

export interface PdfBrandConfig {
  logoPath: string;
  footerText: string;
  companyName: string;
}

export const PDF_BRAND_CONFIG: Record<PdfBrand, PdfBrandConfig> = {
  default: {
    logoPath: '/img/logo-artica-1.png',
    footerText: 'Artica Group - Creative Studio',
    companyName: 'Artica Group',
  },
  '4101': {
    logoPath: '/img/logo-4101.png',
    footerText: 'Generado por 4101 Media',
    companyName: '4101 Media',
  },
};

const PDF_DESIGN_SYSTEM_4101 = {
  colors: {
    primary: '#0f0f0f',
    primaryDark: '#000000',
    primaryLight: '#1a1a1a',
    primaryLighter: '#f5f5f5',
    primaryLightest: '#fafafa',
    secondary: '#ea580c',
    secondaryDark: '#c2410c',
    secondaryLight: '#f97316',
    secondaryLighter: '#fff7ed',
    secondaryLightest: '#fffaf5',
    accent: '#f97316',
    accentDark: '#ea580c',
    accentLight: '#fb923c',
    accentLighter: '#ffedd5',
    accentLightest: '#fff7ed',
    neutral: {
      white: '#ffffff',
      gray50: '#f9fafb',
      gray100: '#f3f4f6',
      gray200: '#e5e7eb',
      gray300: '#d1d5db',
      gray400: '#9ca3af',
      gray500: '#6b7280',
      gray600: '#4b5563',
      gray700: '#374151',
      gray800: '#1a1a1a',
      gray900: '#0f0f0f',
    },
    semantic: {
      success: '#ea580c',
      successLight: '#ffedd5',
      warning: '#f59e0b',
      warningLight: '#fef3c7',
      error: '#ef4444',
      errorLight: '#fee2e2',
      info: '#f97316',
      infoLight: '#ffedd5',
    }
  },
  gradients: {
    primary: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 100%)',
    primaryLight: 'linear-gradient(135deg, #1a1a1a 0%, #262626 100%)',
    secondary: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
    secondaryLight: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
    accent: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    accentLight: 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)',
    overlay: 'linear-gradient(180deg, rgba(15, 15, 15, 0.08) 0%, rgba(15, 15, 15, 0.02) 100%)',
  },
};

export const ARTICA_DESIGN_SYSTEM = {
  colors: {
    primary: '#011b6a',
    primaryDark: '#000d3a',
    primaryLight: '#02308a',
    primaryLighter: '#e8ebf5',
    primaryLightest: '#f5f7fb',
    secondary: '#0ca5c1',
    secondaryDark: '#0a8499',
    secondaryLight: '#0d8ba8',
    secondaryLighter: '#e6f7fa',
    secondaryLightest: '#f0fafc',
    accent: '#fa922e',
    accentDark: '#e67e22',
    accentLight: '#fbad5c',
    accentLighter: '#fff3e8',
    accentLightest: '#fffaf5',
    neutral: {
      white: '#ffffff',
      gray50: '#f9fafb',
      gray100: '#f3f4f6',
      gray200: '#e5e7eb',
      gray300: '#d1d5db',
      gray400: '#9ca3af',
      gray500: '#6b7280',
      gray600: '#4b5563',
      gray700: '#374151',
      gray800: '#1f2937',
      gray900: '#111827',
    },
    semantic: {
      success: '#10b981',
      successLight: '#d1fae5',
      warning: '#f59e0b',
      warningLight: '#fef3c7',
      error: '#ef4444',
      errorLight: '#fee2e2',
      info: '#3b82f6',
      infoLight: '#dbeafe',
    }
  },
  typography: {
    fontFamily: {
      sans: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      heading: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
    },
    fontSize: {
      xs: '10px',
      sm: '12px',
      base: '14px',
      lg: '16px',
      xl: '18px',
      '2xl': '20px',
      '3xl': '24px',
      '4xl': '28px',
      '5xl': '32px',
      '6xl': '36px',
      '7xl': '48px',
      '8xl': '64px',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
      loose: 2,
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.025em',
      wider: '0.05em',
      widest: '0.1em',
    }
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    base: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '96px',
  },
  borderRadius: {
    none: '0',
    sm: '4px',
    base: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
  },
  gradients: {
    primary: 'linear-gradient(135deg, #011b6a 0%, #02308a 100%)',
    primaryLight: 'linear-gradient(135deg, #02308a 0%, #0344aa 100%)',
    secondary: 'linear-gradient(135deg, #0ca5c1 0%, #0d8ba8 100%)',
    secondaryLight: 'linear-gradient(135deg, #0d8ba8 0%, #0ea5c1 100%)',
    accent: 'linear-gradient(135deg, #fa922e 0%, #e67e22 100%)',
    accentLight: 'linear-gradient(135deg, #fbad5c 0%, #fa922e 100%)',
    overlay: 'linear-gradient(180deg, rgba(1, 27, 106, 0.1) 0%, rgba(1, 27, 106, 0.05) 100%)',
  },
  pdf: {
    pageWidth: 816,
    pageHeight: 1056,
    margin: {
      sm: 16,
      md: 24,
      lg: 32,
      xl: 48,
    },
    contentMaxWidth: 768,
    headerHeight: 80,
    footerHeight: 60,
  }
};

export function getPdfDesignSystem(brand: PdfBrand = 'default') {
  if (brand === '4101') {
    return {
      ...ARTICA_DESIGN_SYSTEM,
      colors: PDF_DESIGN_SYSTEM_4101.colors,
      gradients: PDF_DESIGN_SYSTEM_4101.gradients,
    };
  }
  return ARTICA_DESIGN_SYSTEM;
}

export function getPdfBrandConfig(brand: PdfBrand = 'default'): PdfBrandConfig {
  return PDF_BRAND_CONFIG[brand];
}

export const formatCurrency = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A';
  return `$${value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatNumber = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A';
  return value.toLocaleString('es-ES');
};

export const formatPercentage = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || isNaN(value)) return 'N/A';
  return `${value.toFixed(2)}%`;
};

export const formatDate = (date: string | Date, format: 'short' | 'long' | 'numeric' = 'short'): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return 'N/A';
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: format === 'long' ? 'long' : 'short',
    year: 'numeric',
  };
  return dateObj.toLocaleDateString('es-ES', options);
};

export const pdfStyles = {
  container: {
    width: `${ARTICA_DESIGN_SYSTEM.pdf.pageWidth}px`,
    minHeight: `${ARTICA_DESIGN_SYSTEM.pdf.pageHeight}px`,
    backgroundColor: ARTICA_DESIGN_SYSTEM.colors.neutral.white,
    fontFamily: ARTICA_DESIGN_SYSTEM.typography.fontFamily.sans,
    color: ARTICA_DESIGN_SYSTEM.colors.neutral.gray800,
    lineHeight: ARTICA_DESIGN_SYSTEM.typography.lineHeight.normal,
    fontSize: ARTICA_DESIGN_SYSTEM.typography.fontSize.base,
    padding: `${ARTICA_DESIGN_SYSTEM.pdf.margin.md}px`,
  },
  heading: {
    fontFamily: ARTICA_DESIGN_SYSTEM.typography.fontFamily.heading,
    fontWeight: ARTICA_DESIGN_SYSTEM.typography.fontWeight.bold,
    color: ARTICA_DESIGN_SYSTEM.colors.primary,
    lineHeight: ARTICA_DESIGN_SYSTEM.typography.lineHeight.tight,
  },
  card: {
    backgroundColor: ARTICA_DESIGN_SYSTEM.colors.neutral.white,
    borderRadius: ARTICA_DESIGN_SYSTEM.borderRadius.lg,
    padding: ARTICA_DESIGN_SYSTEM.spacing.lg,
    boxShadow: ARTICA_DESIGN_SYSTEM.shadows.md,
  },
};
