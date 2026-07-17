/**
 * Design Token - Typography
 * 支持 Terminal 和 Modern 两种字体风格
 */

// Terminal 风格 - 全等宽字体
const terminalFonts = {
  sans: [
    'JetBrains Mono',
    'Fira Code',
    'VT323',
    'Consolas',
    'Monaco',
    'Courier New',
    'monospace',
  ].join(', '),
  mono: [
    'JetBrains Mono',
    'Fira Code',
    'VT323',
    'Consolas',
    'Monaco',
    'Courier New',
    'monospace',
  ].join(', '),
};

// Modern 风格 - 非等宽字体
const modernFonts = {
  sans: [
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    'SF Pro Display',
    'Segoe UI',
    'Roboto',
    'sans-serif',
  ].join(', '),
  mono: [
    'JetBrains Mono',
    'Fira Code',
    'Consolas',
    'Monaco',
    'monospace',
  ].join(', '),
};

export const typography = {
  // 字体家族
  fontFamily: {
    terminal: terminalFonts,
    modern: modernFonts,
    // 默认使用 Modern / Apple system fonts
    sans: modernFonts.sans,
    mono: modernFonts.mono,
  },

  // 字体大小 - 严格的模块化缩放
  fontSize: {
    xs: '0.75rem',      // 12px - 辅助文字
    sm: '0.875rem',     // 14px - 正文小
    base: '1rem',       // 16px - 正文
    lg: '1.125rem',     // 18px - 强调
    xl: '1.25rem',      // 20px - 小标题
    '2xl': '1.5rem',    // 24px - 标题
    '3xl': '1.875rem',  // 30px - 大标题
    '4xl': '2.25rem',   // 36px - 页面标题
    '5xl': '3rem',      // 48px - Hero标题
  },

  // 字重 - 终端字体通常只有regular
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // 行高 - 终端风格偏紧凑
  lineHeight: {
    none: '1',
    tight: '1.2',       // 标题
    snug: '1.35',
    normal: '1.5',      // 正文
    relaxed: '1.625',
    loose: '2',         // 代码块
  },

  // 字间距 - 终端风格微微加宽
  letterSpacing: {
    tighter: '-0.02em',
    tight: '0',
    normal: '0',        // natural tracking
    wide: '0.05em',
    wider: '0.1em',     // 标题使用
    widest: '0.15em',   // 强调效果
  },
} as const;

export type FontSize = keyof typeof typography.fontSize;
export type FontWeight = keyof typeof typography.fontWeight;
