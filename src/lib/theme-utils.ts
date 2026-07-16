/**
 * Theme Utilities
 * 主题工具函数，用于主题切换和CSS变量注入
 * 支持双层主题系统：风格(Terminal/Modern) × 模式(Light/Dark)
 */

import { colors, typography, radius } from '@/styles/tokens';

export type ThemeMode = 'light' | 'dark';
export type ThemeStyle = 'terminal' | 'modern';
export type Theme = 'light' | 'dark'; // 保持向后兼容

export interface ThemeConfig {
  mode: ThemeMode;
  style: ThemeStyle;
}

/**
 * 将Design Token转换为CSS变量（新版本 - 支持双层主题）
 */
export function generateCSSVariables(config: ThemeConfig): Record<string, string>;
export function generateCSSVariables(theme: Theme): Record<string, string>;
export function generateCSSVariables(configOrTheme: ThemeConfig | Theme) {
  const variables: Record<string, string> = {};

  // 兼容旧版本调用
  const config: ThemeConfig = typeof configOrTheme === 'string'
    ? { mode: configOrTheme, style: 'terminal' }
    : configOrTheme;

  const themeColors = colors[config.mode];

  // 背景色
  Object.entries(themeColors.background).forEach(([key, value]) => {
    variables[`--color-background-${key}`] = value;
  });

  // 前景色
  Object.entries(themeColors.foreground).forEach(([key, value]) => {
    variables[`--color-foreground-${key}`] = value;
  });

  // 边框色
  Object.entries(themeColors.border).forEach(([key, value]) => {
    variables[`--color-border-${key}`] = value;
  });

  // 强调色
  Object.entries(themeColors.accent).forEach(([key, value]) => {
    variables[`--color-accent-${key}`] = value;
  });

  // 特殊效果
  variables['--color-overlay'] = themeColors.overlay;
  variables['--color-ring'] = themeColors.ring;

  // 字体（根据风格）
  const fonts = typography.fontFamily[config.style];
  variables['--font-sans'] = fonts.sans;
  variables['--font-mono'] = fonts.mono;

  // 圆角（根据风格）
  const radiusValues = radius[config.style];
  Object.entries(radiusValues).forEach(([key, value]) => {
    variables[`--radius-${key}`] = value;
  });

  return variables;
}

/**
 * 应用CSS变量到DOM（新版本 - 支持双层主题）
 */
export function applyCSSVariables(config: ThemeConfig): void;
export function applyCSSVariables(theme: Theme): void;
export function applyCSSVariables(configOrTheme: ThemeConfig | Theme) {
  const variables = generateCSSVariables(configOrTheme as any);
  const root = document.documentElement;

  Object.entries(variables).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

/**
 * 获取系统主题偏好（仅模式）
 */
export function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * 从localStorage获取保存的主题配置
 */
export function getSavedThemeConfig(): ThemeConfig | null {
  if (typeof window === 'undefined') return null;

  const savedMode = localStorage.getItem('theme-mode');
  const savedStyle = localStorage.getItem('theme-style');

  if (!savedMode && !savedStyle) return null;

  return {
    mode: (savedMode === 'dark' || savedMode === 'light' ? savedMode : 'dark') as ThemeMode,
    style: (savedStyle === 'terminal' || savedStyle === 'modern' ? savedStyle : 'terminal') as ThemeStyle,
  };
}

/**
 * 保存主题配置到localStorage
 */
export function saveThemeConfig(config: ThemeConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('theme-mode', config.mode);
  localStorage.setItem('theme-style', config.style);
}

/**
 * 从localStorage获取保存的主题（向后兼容）
 */
export function getSavedTheme(): Theme | null {
  if (typeof window === 'undefined') return null;

  const saved = localStorage.getItem('theme') || localStorage.getItem('theme-mode');
  return saved === 'dark' || saved === 'light' ? saved : null;
}

/**
 * 保存主题到localStorage（向后兼容）
 */
export function saveTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('theme', theme);
  localStorage.setItem('theme-mode', theme);
}
