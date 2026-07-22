/**
 * Design Token - Colors
 *
 * UI/UX V3 follows the project DESIGN.md: flat Linear-inspired surfaces,
 * Vercel-like hairlines, and a single lavender brand accent.
 */

export const colors = {
  light: {
    background: {
      primary: '#f6f7f8',
      secondary: '#ffffff',
      tertiary: '#ffffff',
      hover: '#f1f2f4',
      active: 'rgba(94, 106, 210, 0.10)',
    },
    foreground: {
      primary: '#17181b',
      secondary: '#3d4047',
      muted: '#70747d',
      placeholder: '#9b9ea6',
    },
    border: {
      default: '#dedfe3',
      subtle: '#e8e9ec',
      strong: '#b9bcc4',
      hover: '#c8cad0',
    },
    accent: {
      primary: '#5e6ad2',
      foreground: '#ffffff',
      primaryHover: '#5260c4',
      primaryActive: '#4855b4',
      success: '#218739',
      successHover: '#196f2e',
      warning: '#a96900',
      warningHover: '#895600',
      error: '#d12f35',
      errorHover: '#b6242a',
      info: '#1f6feb',
      infoHover: '#1759bd',
    },
    overlay: 'rgba(23, 24, 27, 0.52)',
    ring: 'rgba(94, 106, 210, 0.24)',
  },
  dark: {
    background: {
      primary: '#0b0b0d',
      secondary: '#111214',
      tertiary: '#17181b',
      hover: '#1d1e22',
      active: 'rgba(94, 106, 210, 0.14)',
    },
    foreground: {
      primary: '#f5f6f7',
      secondary: '#c8cad0',
      muted: '#8b8f98',
      placeholder: '#60636b',
    },
    border: {
      default: '#27282d',
      subtle: '#202126',
      strong: '#3a3c43',
      hover: '#454750',
    },
    accent: {
      primary: '#5e6ad2',
      foreground: '#ffffff',
      primaryHover: '#6f7be0',
      primaryActive: '#515cbf',
      success: '#3fb950',
      successHover: '#46c75a',
      warning: '#d29922',
      warningHover: '#e0a82e',
      error: '#f85149',
      errorHover: '#ff625a',
      info: '#58a6ff',
      infoHover: '#79b8ff',
    },
    overlay: 'rgba(0, 0, 0, 0.72)',
    ring: 'rgba(94, 106, 210, 0.32)',
  },
} as const

export type ColorTheme = keyof typeof colors
export type ColorCategory = keyof typeof colors.dark
