import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('glass-card text-foreground-primary', className)}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-base font-semibold leading-none tracking-[-0.015em] text-foreground-primary', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardTitleAscii = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-2 text-sm font-semibold leading-none tracking-tight text-foreground-primary', className)}
      {...props}
    />
  )
)
CardTitleAscii.displayName = 'CardTitleAscii'

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm leading-5 text-foreground-muted', className)} {...props} />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-5', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center border-t border-border/80 p-5', className)}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

interface TerminalWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  showControls?: boolean
}

const TerminalWindow = React.forwardRef<HTMLDivElement, TerminalWindowProps>(
  ({ className, title, showControls = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('overflow-hidden rounded-2xl border border-border bg-background-secondary text-foreground-primary shadow-xl', className)}
      {...props}
    >
      <div className="flex min-h-11 items-center justify-between border-b border-border/80 px-4">
        {showControls ? (
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-accent-error/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent-warning/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent-success/80" />
          </div>
        ) : (
          <div />
        )}
        {title && <div className="text-xs font-medium text-foreground-muted">{title}</div>}
        <div className="h-2.5 w-8" />
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
)
TerminalWindow.displayName = 'TerminalWindow'

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardTitleAscii,
  CardDescription,
  CardContent,
  TerminalWindow,
}
