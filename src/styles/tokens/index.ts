/**
 * Design Tokens - 统一导出
 * 现代简约设计系统，参考Linear & Vercel Dashboard
 */

import { colors } from './colors';
import { spacing } from './spacing';
import { typography } from './typography';
import { shadows } from './shadows';
import { radius } from './radius';
import { animations } from './animations';

export { colors };
export type { ColorTheme, ColorCategory } from './colors';

export { spacing };
export type { SpacingKey } from './spacing';

export { typography };
export type { FontSize, FontWeight } from './typography';

export { shadows };
export type { ShadowSize } from './shadows';

export { radius };
export type { RadiusSize } from './radius';

export { animations };
export type { AnimationDuration, AnimationEasing } from './animations';

// 完整的Design Token系统
export const tokens = {
  colors,
  spacing,
  typography,
  shadows,
  radius,
  animations,
} as const;
