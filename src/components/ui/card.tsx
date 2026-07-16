import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Terminal CLI Card Component
 *
 * 设计特点:
 * - 黑色背景 + 绿色边框
 * - ASCII 风格标题栏: +--- TITLE ---+
 * - 零圆角
 * - 边框发光效果
 */

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'glass-card text-foreground-primary',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex flex-col space-y-1.5 p-5',
      className
    )}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// Terminal 风格标题 - 全大写，带装饰
const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      'text-foreground-primary',
      className
    )}
    {...props}
  >
    {children}
  </div>
));
CardTitle.displayName = 'CardTitle';

// ASCII 风格标题 - +--- TITLE ---+
const CardTitleAscii = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'text-sm font-semibold leading-none tracking-tight',
      'text-foreground-primary flex items-center gap-2',
      className
    )}
    {...props}
  >
    {children}
  </div>
));
CardTitleAscii.displayName = 'CardTitleAscii';

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-sm text-foreground-secondary', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-5', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'flex items-center p-5 border-t border-border',
      className
    )}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

// Terminal 窗口 - 带完整标题栏的变体
interface TerminalWindowProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  showControls?: boolean;
}

const TerminalWindow = React.forwardRef<HTMLDivElement, TerminalWindowProps>(
  ({ className, title, showControls = false, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'border border-border bg-background-primary text-foreground-primary',
        'shadow-[0_0_10px_rgba(51,255,0,0.1)]',
        className
      )}
      {...props}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        {showControls && (
          <div className="flex items-center gap-1.5">
            <span className="text-foreground-muted">[</span>
            <span className="text-accent-error">x</span>
            <span className="text-foreground-muted">]</span>
            <span className="text-foreground-muted">[</span>
            <span className="text-accent-warning">-</span>
            <span className="text-foreground-muted">]</span>
            <span className="text-foreground-muted">[</span>
            <span className="text-accent-success">+</span>
            <span className="text-foreground-muted">]</span>
          </div>
        )}
        {title && (
          <div className="flex items-center gap-2 text-sm uppercase tracking-widest">
            <span className="text-foreground-muted">+---</span>
            <span className="text-foreground-primary">{title}</span>
            <span className="text-foreground-muted">---+</span>
          </div>
        )}
        {!showControls && !title && <div />}
        <div className="text-foreground-muted text-xs">
          {new Date().toLocaleTimeString('en-US', { hour12: false })}
        </div>
      </div>
      {/* 内容区 */}
      <div className="p-4">{children}</div>
    </div>
  )
);
TerminalWindow.displayName = 'TerminalWindow';

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardTitleAscii,
  CardDescription,
  CardContent,
  TerminalWindow,
};
