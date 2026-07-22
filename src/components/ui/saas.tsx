'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-accent-primary/10 text-accent-primary ring-accent-primary/20',
  success: 'bg-accent-success/10 text-accent-success ring-accent-success/20',
  warning: 'bg-accent-warning/10 text-accent-warning ring-accent-warning/20',
  danger: 'bg-accent-error/10 text-accent-error ring-accent-error/20',
  info: 'bg-accent-info/10 text-accent-info ring-accent-info/20',
  neutral: 'bg-background-hover text-foreground-secondary ring-border',
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
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none ring-1 ring-inset',
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
  return <div className={cn('mx-auto w-full max-w-[1600px]', className)} {...props} />
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
        'relative overflow-hidden rounded-2xl border border-border bg-background-tertiary/80 px-5 py-5 shadow-sm backdrop-blur-xl sm:px-6 sm:py-6',
        className
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-x-16 -top-24 h-40 bg-accent-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-primary">
              {Icon && (
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent-primary/10">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              )}
              {eyebrow}
            </div>
          )}
          <h1 className="text-xl font-semibold tracking-[-0.025em] text-foreground-primary sm:text-2xl">
            {title}
          </h1>
          {description && (
            <div className="mt-1.5 max-w-3xl text-sm leading-6 text-foreground-muted">
              {description}
            </div>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
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
  primary: 'bg-accent-primary/10 text-accent-primary',
  success: 'bg-accent-success/10 text-accent-success',
  warning: 'bg-accent-warning/10 text-accent-warning',
  danger: 'bg-accent-error/10 text-accent-error',
  info: 'bg-accent-info/10 text-accent-info',
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className={className}
    >
      <Card className="group h-full overflow-hidden">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground-muted">{label}</p>
              <div className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-foreground-primary sm:text-3xl">
                {value}
              </div>
            </div>
            <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', toneClasses[tone])}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
          {description && <div className="mt-3 text-xs leading-5 text-foreground-muted">{description}</div>}
        </CardContent>
      </Card>
    </motion.div>
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
        'flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background-secondary/40 px-6 py-8 text-center',
        className
      )}
      {...props}
    >
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-background-hover text-foreground-muted">
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
    <section className={cn('rounded-2xl border border-border bg-background-tertiary/70 shadow-sm backdrop-blur-xl', className)} {...props}>
      {(title || description || actions) && (
        <div className="flex flex-col gap-3 border-b border-border/80 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold tracking-tight text-foreground-primary">{title}</h2>}
            {description && <div className="mt-1 text-xs leading-5 text-foreground-muted">{description}</div>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('p-4 sm:p-5', contentClassName)}>{children}</div>
    </section>
  )
}
