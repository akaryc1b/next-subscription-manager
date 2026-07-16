/**
 * Framer Motion 动画配置
 * 预定义的动画变体，用于统一的动画体验
 */

import type { Transition, Variants } from 'framer-motion';
import { animations } from '@/styles/tokens';

// 淡入淡出
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

// 从上滑入
export const slideFromTopVariants: Variants = {
  hidden: { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// 从下滑入
export const slideFromBottomVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
};

// 从左滑入
export const slideFromLeftVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -10 },
};

// 从右滑入
export const slideFromRightVariants: Variants = {
  hidden: { opacity: 0, x: 10 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
};

// 缩放进入
export const scaleVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// 对话框动画
export const dialogVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};

// 列表项交错动画
export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// 默认过渡配置
export const defaultTransition: Transition = {
  duration: parseFloat(animations.duration.normal) / 1000,
  ease: [0.4, 0, 0.2, 1],
};

// 快速过渡
export const fastTransition: Transition = {
  duration: parseFloat(animations.duration.fast) / 1000,
  ease: [0.4, 0, 0.2, 1],
};

// 慢速过渡
export const slowTransition: Transition = {
  duration: parseFloat(animations.duration.slow) / 1000,
  ease: [0.4, 0, 0.2, 1],
};

// 弹性过渡
export const springTransition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
};
