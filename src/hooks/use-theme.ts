/**
 * useTheme Hook
 * 主题管理Hook，提供主题切换和状态管理
 */

'use client';

import { useEffect, useState } from 'react';
import {
  type Theme,
  applyCSSVariables,
  getSavedTheme,
  getSystemTheme,
  saveTheme,
} from '@/lib/theme-utils';

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // 初始化主题
  useEffect(() => {
    const savedTheme = getSavedTheme();
    const initialTheme = savedTheme || getSystemTheme();
    setThemeState(initialTheme);
    applyCSSVariables(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    setMounted(true);
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = getSavedTheme();
      if (!savedTheme) {
        const newTheme = e.matches ? 'dark' : 'light';
        setThemeState(newTheme);
        applyCSSVariables(newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted]);

  // 切换主题
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    saveTheme(newTheme);
    applyCSSVariables(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  // 切换主题（light <-> dark）
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  return {
    theme,
    setTheme,
    toggleTheme,
    mounted,
  };
}
