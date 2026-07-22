import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-xl border border-border bg-background-secondary text-foreground-primary', className)}
      {...props}
    />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-4 sm:p-5', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('text-[15px] font-semibold leading-none tracking-[-0.015em] text-foreground-primary', className)}
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
    <div ref={ref} className={cn('text-[13px] leading-5 text-foreground-muted', className)} {...props} />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-4 sm:p-5', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center border-t border-border-subtle p-4 sm:p-5', className)}
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
      className={cn('overflow-hidden rounded-xl border border-border bg-background-secondary text-foreground-primary', className)}
      {...props}
    >
      <div className="flex min-h-10 items-center justify-between border-b border-border-subtle px-4">
        {showControls ? (
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-accent-error/80" />
            <span className="h-2 w-2 rounded-full bg-accent-warning/80" />
            <span className="h-2 w-2 rounded-full bg-accent-success/80" />
          </div>
        ) : (
          <div />
        )}
        {title && <div className="font-mono text-[11px] font-medium text-foreground-muted">{title}</div>}
        <div className="h-2 w-8" />
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
