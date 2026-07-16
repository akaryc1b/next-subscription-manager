/**
 * Design Token - Animations
 * Terminal CLI 风格 - 复古终端效果
 *
 * 核心动画:
 * - 光标闪烁 (blink)
 * - 打字机效果 (typing)
 * - 扫描线 (scanline)
 * - 偶尔的故障效果 (glitch)
 */

export const animations = {
  // 动画时长
  duration: {
    fast: '100ms',      // 快速 - 即时反馈
    normal: '200ms',    // 正常 - 状态切换
    slow: '400ms',      // 慢速 - 页面过渡
    slower: '600ms',    // 更慢 - 特殊效果
    cursor: '530ms',    // 光标闪烁周期
    typing: '50ms',     // 打字机每字符间隔
  },

  // 缓动函数 - 终端风格偏向线性/阶梯
  easing: {
    // 线性 - 终端默认
    linear: 'linear',

    // 阶梯 - 模拟帧率限制
    steps: 'steps(2, end)',
    stepsSmooth: 'steps(8, end)',

    // 标准缓动 (保留兼容)
    ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

    // 弹性 - 用于特殊效果
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  // 预定义过渡
  transition: {
    // 快速过渡
    fast: 'all 100ms linear',

    // 正常过渡
    normal: 'all 200ms linear',

    // 慢速过渡
    slow: 'all 400ms linear',

    // 颜色过渡
    colors: 'color 200ms linear, background-color 200ms linear, border-color 200ms linear',

    // 变换过渡
    transform: 'transform 200ms linear',

    // 透明度过渡
    opacity: 'opacity 200ms linear',
  },

  // 关键帧动画名称 (在globals.css中定义)
  keyframes: {
    blink: 'terminal-blink',          // 光标闪烁
    typing: 'terminal-typing',        // 打字机效果
    scanline: 'terminal-scanline',    // 扫描线移动
    glitch: 'terminal-glitch',        // 故障效果
    glow: 'terminal-glow-pulse',      // 发光脉冲
  },
} as const;

export type AnimationDuration = keyof typeof animations.duration;
export type AnimationEasing = keyof typeof animations.easing;
