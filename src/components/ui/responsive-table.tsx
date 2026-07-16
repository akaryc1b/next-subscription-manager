'use client';

import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  // 是否在移动端隐藏（仅表格模式生效）
  hideOnMobile?: boolean;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  /** 移动端卡片渲染函数 */
  renderCard: (item: T, index: number) => React.ReactNode;
  /** 桌面端表格渲染函数（可选，不传则使用 columns 自动生成） */
  renderTable?: () => React.ReactNode;
  emptyMessage?: string;
  className?: string;
}

/**
 * 响应式表格组件
 * 封装了 hydration 逻辑，避免 CLS：
 * - SSR：默认渲染桌面端视图
 * - Hydration 后：根据实际设备切换
 */
export function ResponsiveTable<T>({
  columns,
  data,
  keyField,
  renderCard,
  renderTable,
  emptyMessage = '暂无数据',
  className,
}: ResponsiveTableProps<T>) {
  const { isMobile, isHydrated } = useMediaQuery();

  // 空数据状态
  if (data.length === 0) {
    return (
      <div className={cn('text-center py-8 text-foreground-secondary', className)}>
        {emptyMessage}
      </div>
    );
  }

  // 决定显示模式：未 hydrate 时默认桌面端
  const showMobile = isHydrated ? isMobile : false;

  // 移动端卡片模式
  if (showMobile) {
    return (
      <div className={cn('space-y-3', className)}>
        {data.map((item, index) => (
          <div key={String(item[keyField])}>{renderCard(item, index)}</div>
        ))}
      </div>
    );
  }

  // 桌面端：优先使用自定义渲染
  if (renderTable) {
    return <>{renderTable()}</>;
  }

  // 桌面端表格模式（自动生成）
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {columns
              .filter((col) => !col.hideOnMobile)
              .map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-3 text-left text-sm font-medium text-foreground-secondary',
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={String(item[keyField])}
              className="border-b border-border hover:bg-background-hover transition-colors"
            >
              {columns
                .filter((col) => !col.hideOnMobile)
                .map((column) => (
                  <td
                    key={String(column.key)}
                    className={cn('px-4 py-3 text-sm', column.className)}
                  >
                    {column.render
                      ? column.render(item)
                      : String(item[column.key as keyof T] ?? '')}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
