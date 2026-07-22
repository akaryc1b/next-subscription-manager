import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-lg font-medium tracking-[-0.01em]',
    'transition-colors duration-fast',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background-primary',
    'disabled:pointer-events-none disabled:opacity-45',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'border border-accent-primary bg-accent-primary text-accent-foreground',
          'hover:border-accent-primaryHover hover:bg-accent-primaryHover',
          'active:border-accent-primaryActive active:bg-accent-primaryActive',
        ].join(' '),
        secondary: [
          'border border-border bg-background-tertiary text-foreground-primary',
          'hover:border-border-hover hover:bg-background-hover',
        ].join(' '),
        outline: [
          'border border-border bg-background-secondary text-foreground-secondary',
          'hover:border-border-hover hover:bg-background-hover hover:text-foreground-primary',
        ].join(' '),
        ghost: [
          'border border-transparent bg-transparent text-foreground-muted',
          'hover:bg-background-hover hover:text-foreground-primary',
        ].join(' '),
        destructive: [
          'border border-accent-error bg-accent-error text-white',
          'hover:border-accent-errorHover hover:bg-accent-errorHover',
        ].join(' '),
        success: [
          'border border-accent-success bg-accent-success text-white',
          'hover:border-accent-successHover hover:bg-accent-successHover',
        ].join(' '),
        warning: [
          'border border-accent-warning bg-accent-warning text-white',
          'hover:border-accent-warningHover hover:bg-accent-warningHover',
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
        default: 'h-9 px-3.5 text-[13px]',
        lg: 'h-10 px-4 text-sm',
        xl: 'h-11 px-5 text-sm',
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
