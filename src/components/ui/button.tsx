import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-xl font-medium tracking-tight',
    'transition-all duration-fast active:scale-[0.985]',
    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'border border-accent-primary bg-accent-primary text-accent-foreground',
          'shadow-[0_8px_24px_rgba(139,92,246,0.2)] hover:-translate-y-px hover:bg-accent-primaryHover hover:shadow-[0_12px_30px_rgba(139,92,246,0.28)]',
        ].join(' '),
        secondary: [
          'border border-border bg-background-tertiary text-foreground-primary shadow-sm backdrop-blur-xl',
          'hover:border-border-hover hover:bg-background-hover',
        ].join(' '),
        outline: [
          'border border-border bg-transparent text-foreground-secondary',
          'hover:border-border-hover hover:bg-background-hover hover:text-foreground-primary',
        ].join(' '),
        ghost: [
          'border border-transparent bg-transparent text-foreground-muted',
          'hover:bg-background-hover hover:text-foreground-primary',
        ].join(' '),
        destructive: [
          'border border-accent-error bg-accent-error text-white shadow-sm',
          'hover:bg-accent-errorHover',
        ].join(' '),
        success: [
          'border border-accent-success bg-accent-success text-white shadow-sm',
          'hover:bg-accent-successHover',
        ].join(' '),
        warning: [
          'border border-accent-warning bg-accent-warning text-white shadow-sm',
          'hover:bg-accent-warningHover',
        ].join(' '),
        link: [
          'h-auto rounded-none border-none bg-transparent p-0 text-accent-primary underline-offset-4',
          'hover:text-accent-primaryHover hover:underline',
        ].join(' '),
        terminal: [
          'border border-border bg-background-secondary text-foreground-primary',
          'hover:border-border-hover hover:bg-background-hover',
        ].join(' '),
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        default: 'h-9 px-4 text-sm',
        lg: 'h-10 px-5 text-sm',
        xl: 'h-12 px-6 text-base',
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
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
