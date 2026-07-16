'use client'

import { useEffect, useState } from 'react'

/**
 * 响应式媒体查询 Hook
 * 用于检测屏幕尺寸变化，支持 SSR 安全
 *
 * 返回 isHydrated 状态，用于在 hydration 完成前显示占位符，避免 CLS
 */
export function useMediaQuery() {
  const [isHydrated, setIsHydrated] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isDesktop, setIsDesktop] = useState(true) // 默认桌面端，SSR 友好

  useEffect(() => {
    // 断点定义：与 Tailwind 保持一致
    // mobile: < 768px (md)
    // tablet: >= 768px && < 1024px (lg)
    // desktop: >= 1024px (lg)
    const mobileQuery = window.matchMedia('(max-width: 767px)')
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)')
    const desktopQuery = window.matchMedia('(min-width: 1024px)')

    // 初始化状态
    setIsMobile(mobileQuery.matches)
    setIsTablet(tabletQuery.matches)
    setIsDesktop(desktopQuery.matches)
    setIsHydrated(true)

    // 事件处理器
    const handleMobileChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    const handleTabletChange = (e: MediaQueryListEvent) => setIsTablet(e.matches)
    const handleDesktopChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)

    // 添加监听器
    mobileQuery.addEventListener('change', handleMobileChange)
    tabletQuery.addEventListener('change', handleTabletChange)
    desktopQuery.addEventListener('change', handleDesktopChange)

    // 清理
    return () => {
      mobileQuery.removeEventListener('change', handleMobileChange)
      tabletQuery.removeEventListener('change', handleTabletChange)
      desktopQuery.removeEventListener('change', handleDesktopChange)
    }
  }, [])

  return {
    /** hydration 是否完成，未完成时应显示占位符避免 CLS */
    isHydrated,
    isMobile,
    isTablet,
    isDesktop,
    // 便捷属性：是否为移动端或平板（即非桌面端）
    isMobileOrTablet: isMobile || isTablet,
  }
}
