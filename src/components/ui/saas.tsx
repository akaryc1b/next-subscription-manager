'use client'

import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'border-accent-primary/20 bg-accent-primary/10 text-accent-primary',
  success: 'border-accent-success/20 bg-accent-success/10 text-accent-success',
  warning: 'border-accent-warning/20 bg-accent-warning/10 text-accent-warning',
  danger: 'border-accent-error/20 bg-accent-error/10 text-accent-error',
  info: 'border-accent-info/20 bg-accent-info/10 text-accent-info',
  neutral: 'border-border bg-background-hover text-foreground-secondary',
}

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-5 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none',
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function Container({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mx-auto w-full max-w-[1440px]', className)} {...props} />
}

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: string
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  icon?: LucideIcon
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  icon: Icon,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b border-border-subtle pb-5 sm:flex-row sm:items-end sm:justify-between lg:pb-6',
        className
      )}
      {...props}
    >
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground-muted">
            {Icon && <Icon className="h-3.5 w-3.5 text-accent-primary" />}
            {eyebrow}
          </div>
        )}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.035em] text-foreground-primary sm:text-[30px]">
          {title}
        </h1>
        {description && (
          <div className="mt-1.5 max-w-3xl text-[13px] leading-5 text-foreground-muted sm:text-sm">
            {description}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

interface StatCardProps {
  label: string
  value: React.ReactNode
  description?: React.ReactNode
  icon: LucideIcon
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

const toneClasses = {
  primary: 'text-accent-primary',
  success: 'text-accent-success',
  warning: 'text-accent-warning',
  danger: 'text-accent-error',
  info: 'text-accent-info',
}

export function StatCard({
  label,
  value,
  description,
  icon: Icon,
  tone = 'primary',
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'group h-full min-h-[112px] bg-background-secondary p-4 transition-colors hover:bg-background-hover sm:p-5',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="truncate text-[11px] font-medium text-foreground-muted">{label}</p>
        <Icon className={cn('h-4 w-4 shrink-0', toneClasses[tone])} />
      </div>
      <div className="mt-3 tabular-nums text-2xl font-semibold leading-none tracking-[-0.035em] text-foreground-primary sm:text-[28px]">
        {value}
      </div>
      {description && <div className="mt-2 text-[11px] leading-4 text-foreground-muted">{description}</div>}
    </div>
  )
}

interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  icon: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-40 flex-col items-center justify-center px-6 py-10 text-center',
        className
      )}
      {...props}
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background-tertiary text-foreground-muted">
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-sm font-medium text-foreground-primary">{title}</div>
      {description && <div className="mt-1 max-w-md text-xs leading-5 text-foreground-muted">{description}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

interface SectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  title?: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  contentClassName?: string
}

export function Section({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn('overflow-hidden rounded-xl border border-border bg-background-secondary', className)}
      {...props}
    >
      {(title || description || actions) && (
        <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-foreground-primary">{title}</h2>}
            {description && <div className="mt-0.5 text-xs leading-5 text-foreground-muted">{description}</div>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('p-4 sm:p-5', contentClassName)}>{children}</div>
    </section>
  )
}
