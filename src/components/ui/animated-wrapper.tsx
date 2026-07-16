/**
 * 动画包装组件
 * 使用Framer Motion提供统一的动画体验
 */

'use client';

import { motion, HTMLMotionProps } from 'framer-motion';
import { ReactNode } from 'react';
import {
  fadeVariants,
  slideFromTopVariants,
  slideFromBottomVariants,
  slideFromLeftVariants,
  slideFromRightVariants,
  scaleVariants,
  defaultTransition,
} from '@/lib/motion';

type AnimationType =
  | 'fade'
  | 'slideFromTop'
  | 'slideFromBottom'
  | 'slideFromLeft'
  | 'slideFromRight'
  | 'scale';

interface AnimatedWrapperProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: ReactNode;
  animation?: AnimationType;
  delay?: number;
}

const variantsMap = {
  fade: fadeVariants,
  slideFromTop: slideFromTopVariants,
  slideFromBottom: slideFromBottomVariants,
  slideFromLeft: slideFromLeftVariants,
  slideFromRight: slideFromRightVariants,
  scale: scaleVariants,
};

export function AnimatedWrapper({
  children,
  animation = 'fade',
  delay = 0,
  ...props
}: AnimatedWrapperProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={variantsMap[animation]}
      transition={{ ...defaultTransition, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
