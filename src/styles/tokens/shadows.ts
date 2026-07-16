/**
 * Design Token - Shadows & Glow Effects
 * Terminal CLI 风格 - 无阴影，使用发光效果
 *
 * 核心原则:
 * - 不使用传统的box-shadow投射阴影
 * - 使用发光效果模拟CRT荧光管的辉光
 */

export const shadows = {
  // 无阴影 - Terminal 不使用传统阴影
  sm: 'none',
  md: 'none',
  lg: 'none',
  xl: 'none',
  '2xl': 'none',
  inner: 'none',
  none: 'none',

  // Terminal 专用发光效果 (通过CSS变量在运行时注入颜色)
  // 使用时搭配 text-shadow 或 filter: drop-shadow
  glow: {
    // 文字发光 - 模拟荧光管效果
    text: {
      sm: '0 0 3px var(--glow-color, #33ff00)',
      md: '0 0 5px var(--glow-color, #33ff00)',
      lg: '0 0 10px var(--glow-color, #33ff00), 0 0 20px var(--glow-color, #33ff00)',
    },
    // 边框发光
    border: {
      sm: '0 0 2px var(--glow-color, #33ff00)',
      md: '0 0 5px var(--glow-color, #33ff00)',
      lg: '0 0 10px var(--glow-color, #33ff00)',
    },
  },
} as const;

export type ShadowSize = keyof typeof shadows;
