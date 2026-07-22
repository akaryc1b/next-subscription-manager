import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.ComponentProps<'input'> {
  showPrompt?: boolean
  promptText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, showPrompt, promptText = '›', ...props }, ref) => (
    <div className="flex w-full items-center">
      {showPrompt && (
        <span className="mr-2 shrink-0 text-sm text-foreground-muted">{promptText}</span>
      )}
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-[13px] text-foreground-primary',
          'placeholder:text-foreground-placeholder',
          'focus-visible:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'file:border-0 file:bg-transparent file:text-sm file:text-foreground-primary',
          'transition-colors duration-fast',
          className
        )}
        ref={ref}
        {...props}
      />
    </div>
  )
)
Input.displayName = 'Input'

interface TerminalInputProps extends React.ComponentProps<'input'> {
  user?: string
  host?: string
  path?: string
}

const TerminalInput = React.forwardRef<HTMLInputElement, TerminalInputProps>(
  ({ className, user = 'workspace', host = 'subscription', path = '~', ...props }, ref) => (
    <div className="flex h-9 w-full items-center rounded-lg border border-border bg-background-secondary px-3 text-[13px]">
      <span className="mr-2 hidden shrink-0 font-mono text-xs text-foreground-muted sm:inline">
        {user}@{host}:{path}
      </span>
      <input
        className={cn(
          'min-w-0 flex-1 border-none bg-transparent text-[13px] text-foreground-primary outline-none placeholder:text-foreground-placeholder',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    </div>
  )
)
TerminalInput.displayName = 'TerminalInput'

const InputUnderline = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full border-0 border-b border-border bg-transparent px-1 py-2 text-[13px] text-foreground-primary',
        'placeholder:text-foreground-placeholder',
        'focus-visible:border-accent-primary focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'transition-colors duration-fast',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
InputUnderline.displayName = 'InputUnderline'

export { Input, TerminalInput, InputUnderline }
