import type { Config } from 'tailwindcss';
import { spacing } from './src/styles/tokens/spacing';
import { typography } from './src/styles/tokens/typography';
import { shadows } from './src/styles/tokens/shadows';
import { radius } from './src/styles/tokens/radius';
import { animations } from './src/styles/tokens/animations';

const boxShadow = {
  sm: shadows.sm,
  md: shadows.md,
  lg: shadows.lg,
  xl: shadows.xl,
  '2xl': shadows['2xl'],
  inner: shadows.inner,
  none: shadows.none,
} as const;

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // 颜色系统 - 使用CSS变量以支持主题切换
      colors: {
        background: {
          primary: 'var(--color-background-primary)',
          secondary: 'var(--color-background-secondary)',
          tertiary: 'var(--color-background-tertiary)',
          hover: 'var(--color-background-hover)',
          active: 'var(--color-background-active)',
        },
        foreground: {
          primary: 'var(--color-foreground-primary)',
          secondary: 'var(--color-foreground-secondary)',
          muted: 'var(--color-foreground-muted)',
          placeholder: 'var(--color-foreground-placeholder)',
        },
        border: {
          DEFAULT: 'var(--color-border-default)',
          subtle: 'var(--color-border-subtle)',
          strong: 'var(--color-border-strong)',
          hover: 'var(--color-border-hover)',
        },
        accent: {
          primary: 'var(--color-accent-primary)',
          foreground: 'var(--color-accent-foreground)',
          primaryHover: 'var(--color-accent-primaryHover)',
          primaryActive: 'var(--color-accent-primaryActive)',
          success: 'var(--color-accent-success)',
          successHover: 'var(--color-accent-successHover)',
          warning: 'var(--color-accent-warning)',
          warningHover: 'var(--color-accent-warningHover)',
          error: 'var(--color-accent-error)',
          errorHover: 'var(--color-accent-errorHover)',
          info: 'var(--color-accent-info)',
          infoHover: 'var(--color-accent-infoHover)',
        },
        overlay: 'var(--color-overlay)',
        ring: 'var(--color-ring)',
        // Terminal 专用颜色别名
        terminal: {
          green: 'var(--color-foreground-primary)',
          amber: 'var(--color-accent-warning)',
          red: 'var(--color-accent-error)',
          cyan: 'var(--color-accent-info)',
        },
      },

      // 间距系统 - 8px基准网格
      spacing,

      // 字体系统 - 使用CSS变量支持主题切换
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      lineHeight: typography.lineHeight,
      letterSpacing: typography.letterSpacing,

      // 阴影系统
      boxShadow,

      // 圆角系统 - 使用CSS变量支持主题切换
      borderRadius: {
        none: 'var(--radius-none)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        full: 'var(--radius-full)',
      },

      // 动画系统
      transitionDuration: animations.duration,
      transitionTimingFunction: animations.easing,

      // Terminal 关键帧动画
      keyframes: {
        // 光标闪烁
        'terminal-blink': {
          '0%, 50%': { opacity: '1' },
          '51%, 100%': { opacity: '0' },
        },
        // 打字机效果
        'terminal-typing': {
          'from': { width: '0' },
          'to': { width: '100%' },
        },
        // 扫描线
        'terminal-scanline': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        // 故障效果
        'terminal-glitch': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%': { transform: 'translateX(-2px)' },
          '20%': { transform: 'translateX(2px)' },
          '30%': { transform: 'translateX(-1px)' },
          '40%': { transform: 'translateX(1px)' },
          '50%': { transform: 'translateX(0)' },
        },
        // 发光脉冲
        'terminal-glow-pulse': {
          '0%, 100%': {
            textShadow: '0 0 5px var(--color-foreground-primary)',
            opacity: '1',
          },
          '50%': {
            textShadow: '0 0 15px var(--color-foreground-primary), 0 0 25px var(--color-foreground-primary)',
            opacity: '0.9',
          },
        },
        // 淡入
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // 淡出
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        // 从顶部滑入
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // 从底部滑入
        'slide-in-from-bottom': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        // 缩放入场
        'scale-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        // Terminal 专用动画
        'cursor-blink': 'terminal-blink 1.06s steps(2, start) infinite',
        'typing': 'terminal-typing 2s steps(40, end)',
        'scanline': 'terminal-scanline 8s linear infinite',
        'glitch': 'terminal-glitch 0.3s ease-in-out',
        'glow-pulse': 'terminal-glow-pulse 2s ease-in-out infinite',
        // 通用动画
        'fade-in': 'fade-in 200ms linear',
        'fade-out': 'fade-out 200ms linear',
        'slide-in-from-top': 'slide-in-from-top 200ms linear',
        'slide-in-from-bottom': 'slide-in-from-bottom 200ms linear',
        'scale-in': 'scale-in 200ms linear',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
