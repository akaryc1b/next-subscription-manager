import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Terminal CLI Input Component
 *
 * 设计特点:
 * - 无边框盒子，只有底部边框或完全透明
 * - 命令行提示符风格: user@host:~$
 * - 闪烁光标效果
 * - 等宽字体
 */

export interface InputProps extends React.ComponentProps<'input'> {
  /**
   * 显示命令行提示符
   */
  showPrompt?: boolean;
  /**
   * 自定义提示符文本
   */
  promptText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, showPrompt, promptText = '>', ...props }, ref) => {
    return (
      <div className="flex items-center w-full">
        {showPrompt && (
          <span className="text-foreground-secondary text-sm font-mono mr-2 shrink-0">
            {promptText}
          </span>
        )}
        <input
          type={type}
          className={cn(
            // 基础样式
            'flex h-10 w-full rounded-2xl bg-background-secondary px-4 py-2 backdrop-blur-xl',
            'text-sm text-foreground-primary',
            'border border-border',
            // 占位符
            'placeholder:text-foreground-placeholder',
            // 焦点状态 - 边框变亮
            'focus-visible:outline-none focus-visible:border-border-strong focus-visible:ring-4 focus-visible:ring-ring',
            // 禁用状态
            'disabled:cursor-not-allowed disabled:opacity-50',
            // 文件输入
            'file:border-0 file:bg-transparent file:text-sm file:text-foreground-primary',
            // 过渡
            'transition-all duration-fast',
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = 'Input';

// Terminal 命令行输入 - 带完整提示符
interface TerminalInputProps extends React.ComponentProps<'input'> {
  user?: string;
  host?: string;
  path?: string;
}

const TerminalInput = React.forwardRef<HTMLInputElement, TerminalInputProps>(
  ({ className, user = 'user', host = 'okcomputer', path = '~', ...props }, ref) => {
    return (
      <div className="flex items-center w-full font-mono text-sm">
        <span className="text-accent-success shrink-0">{user}</span>
        <span className="text-foreground-muted shrink-0">@</span>
        <span className="text-accent-info shrink-0">{host}</span>
        <span className="text-foreground-muted shrink-0">:</span>
        <span className="text-accent-primary shrink-0">{path}</span>
        <span className="text-foreground-muted shrink-0 mr-2">$</span>
        <input
          className={cn(
            'flex-1 bg-transparent',
            'font-mono text-sm text-foreground-primary',
            'border-none outline-none',
            'placeholder:text-foreground-placeholder',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
          ref={ref}
          {...props}
        />
        {/* 闪烁光标 */}
        <span className="terminal-cursor ml-0.5" />
      </div>
    );
  }
);
TerminalInput.displayName = 'TerminalInput';

// 带底部边框的简洁输入框
const InputUnderline = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full bg-transparent px-1 py-2',
          'font-mono text-sm text-foreground-primary',
          // 只有底部边框
          'border-0 border-b border-border',
          'placeholder:text-foreground-placeholder',
          // 焦点状态
          'focus-visible:outline-none focus-visible:border-foreground-primary',
          // 禁用状态
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-all duration-fast',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
InputUnderline.displayName = 'InputUnderline';

export { Input, TerminalInput, InputUnderline };
