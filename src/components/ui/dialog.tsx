import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Liquid glass dialog component
 *
 * 设计特点:
 * - 与全局 glass-card / glass-panel 统一的圆角和毛玻璃
 * - 柔和阴影与边框高光
 * - 保留轻量终端标题装饰
 */

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-overlay backdrop-blur-sm',
      // 动画
      'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-[calc(100vw-1.5rem)] max-w-lg sm:w-full',
        'max-h-[calc(100dvh-1.5rem)] overflow-y-auto',
        'translate-x-[-50%] translate-y-[-50%]',
        // Liquid glass window style
        'rounded-3xl border border-border bg-background-tertiary/95 text-foreground-primary backdrop-blur-2xl',
        // Soft app-wide glass shadow
        'shadow-2xl shadow-black/20',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]',
        'overflow-hidden',
        // 动画
        'data-[state=open]:animate-scale-in data-[state=closed]:animate-fade-out',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        className={cn(
          'absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full',
          'border border-border bg-background-secondary/80 text-foreground-muted backdrop-blur-xl',
          'hover:bg-background-hover hover:text-accent-error hover:border-border-hover',
          'transition-all duration-fast',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-ring'
        )}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 p-5 pr-14',
      'border-b border-border bg-background-secondary/40',
      className
    )}
    {...props}
  >
    {children}
  </div>
);
DialogHeader.displayName = 'DialogHeader';

const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-4', className)} {...props} />
);
DialogBody.displayName = 'DialogBody';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 p-5 sm:flex-row sm:justify-end',
      'border-t border-border bg-background-secondary/40',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight uppercase',
      'text-foreground-primary',
      className
    )}
    {...props}
  >
    {/* ASCII 装饰 */}
    <span className="text-foreground-muted mr-2">›</span>
    {children}
  </DialogPrimitive.Title>
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

// 简洁标题（不带 ASCII 装饰）
const DialogTitleSimple = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight uppercase',
      'text-foreground-primary',
      className
    )}
    {...props}
  />
));
DialogTitleSimple.displayName = 'DialogTitleSimple';

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-foreground-secondary mt-1', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogTitleSimple,
  DialogDescription,
};
