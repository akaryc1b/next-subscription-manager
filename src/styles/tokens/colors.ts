/**
 * Design Token - Colors
 * Premium SaaS palette inspired by Linear, Vercel and Stripe.
 */

export const colors = {
  light: {
    background: {
      primary: '#f7f7f8',
      secondary: 'rgba(255, 255, 255, 0.88)',
      tertiary: 'rgba(255, 255, 255, 0.96)',
      hover: '#f1f1f3',
      active: 'rgba(139, 92, 246, 0.1)',
    },
    foreground: {
      primary: '#18181b',
      secondary: '#3f3f46',
      muted: '#71717a',
      placeholder: '#a1a1aa',
    },
    border: {
      default: '#e4e4e7',
      subtle: 'rgba(228, 228, 231, 0.72)',
      strong: 'rgba(139, 92, 246, 0.58)',
      hover: 'rgba(139, 92, 246, 0.4)',
    },
    accent: {
      primary: '#7c3aed',
      foreground: '#ffffff',
      primaryHover: '#6d28d9',
      primaryActive: '#5b21b6',
      success: '#16a34a',
      successHover: '#15803d',
      warning: '#d97706',
      warningHover: '#b45309',
      error: '#dc2626',
      errorHover: '#b91c1c',
      info: '#0284c7',
      infoHover: '#0369a1',
    },
    overlay: 'rgba(9, 9, 11, 0.48)',
    ring: 'rgba(139, 92, 246, 0.22)',
  },
  dark: {
    background: {
      primary: '#09090b',
      secondary: 'rgba(15, 15, 18, 0.92)',
      tertiary: 'rgba(24, 24, 27, 0.88)',
      hover: '#202024',
      active: 'rgba(139, 92, 246, 0.16)',
    },
    foreground: {
      primary: '#fafafa',
      secondary: '#d4d4d8',
      muted: '#a1a1aa',
      placeholder: '#71717a',
    },
    border: {
      default: '#27272a',
      subtle: 'rgba(63, 63, 70, 0.58)',
      strong: 'rgba(139, 92, 246, 0.68)',
      hover: 'rgba(139, 92, 246, 0.46)',
    },
    accent: {
      primary: '#8b5cf6',
      foreground: '#ffffff',
      primaryHover: '#7c3aed',
      primaryActive: '#6d28d9',
      success: '#22c55e',
      successHover: '#16a34a',
      warning: '#f59e0b',
      warningHover: '#d97706',
      error: '#ef4444',
      errorHover: '#dc2626',
      info: '#38bdf8',
      infoHover: '#0ea5e9',
    },
    overlay: 'rgba(0, 0, 0, 0.72)',
    ring: 'rgba(139, 92, 246, 0.28)',
  },
} as const;

export type ColorTheme = keyof typeof colors;
export type ColorCategory = keyof typeof colors.dark;
