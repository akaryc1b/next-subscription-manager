/**
 * Design Token - Colors
 * iOS 26 Liquid Glass + macOS admin palette.
 */

export const colors = {
  light: {
    background: {
      primary: '#f6f8ff',
      secondary: 'rgba(255, 255, 255, 0.68)',
      tertiary: 'rgba(255, 255, 255, 0.82)',
      hover: 'rgba(255, 255, 255, 0.92)',
      active: 'rgba(226, 232, 255, 0.88)',
    },
    foreground: {
      primary: '#101828',
      secondary: '#475467',
      muted: '#667085',
      placeholder: '#98a2b3',
    },
    border: {
      default: 'rgba(148, 163, 184, 0.28)',
      subtle: 'rgba(255, 255, 255, 0.52)',
      strong: 'rgba(99, 102, 241, 0.5)',
      hover: 'rgba(99, 102, 241, 0.42)',
    },
    accent: {
      primary: '#0a84ff',
      foreground: '#ffffff',
      primaryHover: '#006edb',
      primaryActive: '#0057b8',
      success: '#34c759',
      successHover: '#28a745',
      warning: '#ff9f0a',
      warningHover: '#d88300',
      error: '#ff3b30',
      errorHover: '#d92d20',
      info: '#5e5ce6',
      infoHover: '#4f46e5',
    },
    overlay: 'rgba(15, 23, 42, 0.34)',
    ring: 'rgba(10, 132, 255, 0.28)',
  },
  dark: {
    background: {
      primary: '#0b1020',
      secondary: 'rgba(20, 28, 48, 0.68)',
      tertiary: 'rgba(30, 41, 59, 0.78)',
      hover: 'rgba(51, 65, 85, 0.72)',
      active: 'rgba(59, 130, 246, 0.22)',
    },
    foreground: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      muted: '#94a3b8',
      placeholder: '#64748b',
    },
    border: {
      default: 'rgba(226, 232, 240, 0.16)',
      subtle: 'rgba(255, 255, 255, 0.1)',
      strong: 'rgba(125, 211, 252, 0.48)',
      hover: 'rgba(125, 211, 252, 0.34)',
    },
    accent: {
      primary: '#64d2ff',
      foreground: '#06101c',
      primaryHover: '#40c8ff',
      primaryActive: '#0a84ff',
      success: '#30d158',
      successHover: '#34c759',
      warning: '#ffd60a',
      warningHover: '#ffb340',
      error: '#ff453a',
      errorHover: '#ff6961',
      info: '#bf5af2',
      infoHover: '#a855f7',
    },
    overlay: 'rgba(2, 6, 23, 0.62)',
    ring: 'rgba(100, 210, 255, 0.32)',
  },
} as const;

export type ColorTheme = keyof typeof colors;
export type ColorCategory = keyof typeof colors.dark;
