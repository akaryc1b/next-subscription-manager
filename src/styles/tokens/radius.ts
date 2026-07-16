/**
 * Design Token - Border Radius
 * 支持 Terminal 和 Modern 两种圆角风格
 */

// Terminal 风格 - 零圆角
const terminalRadius = {
  none: '0',
  sm: '0',
  md: '0',
  lg: '0',
  xl: '0',
  '2xl': '0',
  '3xl': '0',
  full: '0',
};

// Modern 风格 - 圆润圆角
const modernRadius = {
  none: '0',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  '3xl': '24px',
  full: '9999px',
};

export const radius = {
  terminal: terminalRadius,
  modern: modernRadius,
  // 默认使用 Liquid Glass 圆角
  none: '0',
  sm: modernRadius.sm,
  md: modernRadius.md,
  lg: modernRadius.lg,
  xl: modernRadius.xl,
  '2xl': modernRadius['2xl'],
  '3xl': modernRadius['3xl'],
  full: modernRadius.full,
} as const;

export type RadiusSize = keyof typeof radius;
