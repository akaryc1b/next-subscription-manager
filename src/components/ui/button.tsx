import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * Terminal CLI Button Component
 *
 * 设计特点:
 * - 使用方括号包裹文字: [ BUTTON ]
 * - Hover 时反色 (inverted video)
 * - 零圆角
 * - 文字发光效果
 */

const buttonVariants = cva(
  // 基础样式
  [
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap font-mono uppercase tracking-wider',
    'transition-all duration-fast',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    // 文字发光
    'text-shadow-[0_0_5px_var(--color-foreground-primary)]',
  ].join(' '),
  {
    variants: {
      variant: {
        // 主要按钮 - 反色效果
        primary: [
          'bg-foreground-primary text-background-primary',
          'hover:bg-accent-primaryHover',
          'active:bg-accent-primaryActive',
          'border border-foreground-primary',
        ].join(' '),

        // 次要按钮 - 轮廓
        secondary: [
          'bg-transparent text-foreground-primary',
          'border border-border',
          'hover:bg-foreground-primary hover:text-background-primary',
          'active:bg-accent-primaryActive active:text-background-primary',
        ].join(' '),

        // 轮廓按钮
        outline: [
          'bg-transparent text-foreground-primary',
          'border border-foreground-primary',
          'hover:bg-foreground-primary hover:text-background-primary',
          'active:bg-accent-primaryActive',
        ].join(' '),

        // 幽灵按钮
        ghost: [
          'bg-transparent text-foreground-primary',
          'border border-transparent',
          'hover:border-border hover:bg-background-hover',
          'active:bg-background-active',
        ].join(' '),

        // 危险按钮
        destructive: [
          'bg-accent-error text-background-primary',
          'border border-accent-error',
          'hover:bg-accent-errorHover',
          'text-shadow-[0_0_5px_var(--color-accent-error)]',
        ].join(' '),

        // 成功按钮
        success: [
          'bg-accent-success text-background-primary',
          'border border-accent-success',
          'hover:bg-accent-successHover',
        ].join(' '),

        // 警告按钮
        warning: [
          'bg-accent-warning text-background-primary',
          'border border-accent-warning',
          'hover:bg-accent-warningHover',
          'text-shadow-[0_0_5px_var(--color-accent-warning)]',
        ].join(' '),

        // 链接样式
        link: [
          'text-foreground-primary underline-offset-4',
          'hover:underline hover:text-accent-primaryHover',
          'border-none bg-transparent',
        ].join(' '),

        // Terminal 特殊样式 - 括号按钮
        terminal: [
          'bg-transparent text-foreground-primary',
          'border-none',
          'hover:text-accent-primaryHover',
          'before:content-["[_"] after:content-["_]"]',
          'before:text-foreground-muted after:text-foreground-muted',
          'hover:before:text-foreground-primary hover:after:text-foreground-primary',
        ].join(' '),
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-9 px-4 text-sm',
        lg: 'h-10 px-6 text-base',
        xl: 'h-12 px-8 text-lg',
        icon: 'h-9 w-9',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
