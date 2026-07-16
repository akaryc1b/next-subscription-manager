/**
 * Design Token - Colors
 * Terminal CLI 风格配色 - 复古终端荧光效果
 *
 * 深色主题: 黑底 + 霓虹绿 (经典终端)
 * 浅色主题: 浅色适配 (保持终端感)
 */

export const colors = {
  // 深色主题 - 经典终端风格
  dark: {
    // 背景色 - 深黑 CRT 显示器效果
    background: {
      primary: '#0a0a0a',       // 主背景 - 深黑 (非纯黑，留给扫描线效果)
      secondary: '#0d0d0d',     // 次级背景 - 稍亮
      tertiary: '#111111',      // 三级背景 - 面板/卡片
      hover: '#141414',         // hover状态
      active: '#1a1a1a',        // active状态
    },

    // 前景色 - 荧光绿文字
    foreground: {
      primary: '#33ff00',       // 主文字 - 霓虹绿
      secondary: '#22aa00',     // 次级文字 - 暗绿
      muted: '#1f521f',         // 弱化文字 - 很暗的绿
      placeholder: '#1a4a1a',   // 占位符 - 最暗的绿
    },

    // 边框色 - 绿色调
    border: {
      default: '#1f521f',       // 默认边框 - 暗绿
      subtle: '#143314',        // 微妙边框 - 更暗
      strong: '#33ff00',        // 强调边框 - 亮绿
      hover: '#22aa00',         // hover边框 - 中绿
    },

    // 强调色 - Terminal 风格
    accent: {
      primary: '#33ff00',       // 主色 - 霓虹绿
      primaryHover: '#44ff22',  // 主色hover - 更亮
      primaryActive: '#22cc00', // 主色active - 稍暗

      success: '#33ff00',       // 成功 - 绿色 (与主色相同)
      successHover: '#44ff22',

      warning: '#ffb000',       // 警告 - 琥珀色/橙色
      warningHover: '#ffcc33',

      error: '#ff3333',         // 错误 - 亮红
      errorHover: '#ff5555',

      info: '#00ccff',          // 信息 - 青色
      infoHover: '#33ddff',
    },

    // 特殊效果
    overlay: 'rgba(0, 0, 0, 0.85)',    // 遮罩层 - 深黑
    ring: 'rgba(51, 255, 0, 0.4)',      // focus ring - 绿色发光
  },

  // 浅色主题 - 反转终端 (绿底黑字不太实用，改用浅色适配)
  light: {
    // 背景色 - 浅绿调
    background: {
      primary: '#f0fff0',       // 主背景 - 蜜瓜绿白
      secondary: '#e8f8e8',     // 次级背景
      tertiary: '#e0f0e0',      // 三级背景
      hover: '#d8f0d8',         // hover状态
      active: '#d0e8d0',        // active状态
    },

    // 前景色 - 深绿文字
    foreground: {
      primary: '#0a2a0a',       // 主文字 - 深绿黑
      secondary: '#1a4a1a',     // 次级文字
      muted: '#3a6a3a',         // 弱化文字
      placeholder: '#5a8a5a',   // 占位符
    },

    // 边框色
    border: {
      default: '#33aa33',       // 默认边框 - 中绿
      subtle: '#88cc88',        // 微妙边框 - 浅绿
      strong: '#228822',        // 强调边框 - 深绿
      hover: '#44bb44',         // hover边框
    },

    // 强调色
    accent: {
      primary: '#228822',       // 主色 - 深绿
      primaryHover: '#1a7a1a',
      primaryActive: '#126612',

      success: '#228822',
      successHover: '#1a7a1a',

      warning: '#cc8800',       // 警告 - 琥珀
      warningHover: '#b07700',

      error: '#cc2222',         // 错误 - 红
      errorHover: '#aa1111',

      info: '#0088cc',          // 信息 - 青
      infoHover: '#0077bb',
    },

    // 特殊效果
    overlay: 'rgba(0, 0, 0, 0.5)',
    ring: 'rgba(34, 136, 34, 0.4)',
  },
} as const;

export type ColorTheme = keyof typeof colors;
export type ColorCategory = keyof typeof colors.dark;
