import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Terminal CLI Dialog Component
 *
 * 设计特点:
 * - 终端窗口风格
 * - ASCII 边框装饰
 * - 零圆角
 * - 发光效果
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
      'fixed inset-0 z-50 bg-overlay',
      // 扫描线效果
      'before:content-[""] before:fixed before:inset-0 before:pointer-events-none',
      'before:bg-[repeating-linear-gradient(0deg,rgba(0,0,0,0.15)_0px,rgba(0,0,0,0.15)_1px,transparent_1px,transparent_2px)]',
      'before:opacity-30',
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
        // Terminal 窗口样式
        'border border-border bg-background-primary',
        // 发光效果
        'shadow-[0_0_20px_rgba(51,255,0,0.2)]',
        // 动画
        'data-[state=open]:animate-scale-in data-[state=closed]:animate-fade-out',
        className
      )}
      {...props}
    >
      {children}
      {/* 关闭按钮 - Terminal 风格 [x] */}
      <DialogPrimitive.Close
        className={cn(
          'absolute right-2 top-2 p-1',
          'text-foreground-muted hover:text-accent-error',
          'transition-colors duration-fast',
          'focus:outline-none focus:text-accent-error'
        )}
      >
        <span className="text-foreground-muted">[</span>
        <X className="h-4 w-4 inline" />
        <span className="text-foreground-muted">]</span>
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
      'flex flex-col space-y-1.5 p-4',
      'border-b border-border',
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
      'flex flex-col-reverse gap-2 p-4 sm:flex-row sm:justify-end',
      'border-t border-border',
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
      'text-lg font-medium leading-none tracking-wider uppercase',
      'text-foreground-primary',
      className
    )}
    {...props}
  >
    {/* ASCII 装饰 */}
    <span className="text-foreground-muted mr-2">+---</span>
    {children}
    <span className="text-foreground-muted ml-2">---+</span>
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
      'text-lg font-medium leading-none tracking-wider uppercase',
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
