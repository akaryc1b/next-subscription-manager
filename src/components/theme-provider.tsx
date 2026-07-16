'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  type Theme,
  type ThemeConfig,
  type ThemeMode,
  type ThemeStyle,
  applyCSSVariables,
  getSavedTheme,
  getSavedThemeConfig,
  getSystemTheme,
  saveTheme,
  saveThemeConfig,
} from '@/lib/theme-utils';

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  style: ThemeStyle;
  setTheme: (theme: Theme) => void;
  setMode: (mode: ThemeMode) => void;
  setStyle: (style: ThemeStyle) => void;
  toggleTheme: () => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>({ mode: 'dark', style: 'modern' });
  const [mounted, setMounted] = useState(false);

  // 初始化主题
  useEffect(() => {
    const savedConfig = getSavedThemeConfig();
    const savedTheme = getSavedTheme();

    const initialConfig: ThemeConfig = savedConfig || {
      mode: savedTheme || getSystemTheme(),
      style: 'modern',
    };

    setConfig(initialConfig);
    applyCSSVariables(initialConfig);
    document.documentElement.classList.toggle('dark', initialConfig.mode === 'dark');
    document.documentElement.setAttribute('data-theme-style', initialConfig.style);
    setMounted(true);
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const savedConfig = getSavedThemeConfig();
      if (!savedConfig) {
        const newMode: ThemeMode = e.matches ? 'dark' : 'light';
        const newConfig = { ...config, mode: newMode };
        setConfig(newConfig);
        applyCSSVariables(newConfig);
        document.documentElement.classList.toggle('dark', newMode === 'dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted, config]);

  const setTheme = (newTheme: Theme) => {
    const newConfig = { ...config, mode: newTheme };
    setConfig(newConfig);
    saveTheme(newTheme);
    saveThemeConfig(newConfig);
    applyCSSVariables(newConfig);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  const setMode = (newMode: ThemeMode) => {
    const newConfig = { ...config, mode: newMode };
    setConfig(newConfig);
    saveThemeConfig(newConfig);
    applyCSSVariables(newConfig);
    document.documentElement.classList.toggle('dark', newMode === 'dark');
  };

  const setStyle = (newStyle: ThemeStyle) => {
    const newConfig = { ...config, style: newStyle };
    setConfig(newConfig);
    saveThemeConfig(newConfig);
    applyCSSVariables(newConfig);
    document.documentElement.setAttribute('data-theme-style', newStyle);
  };

  const toggleTheme = () => {
    const newMode = config.mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: config.mode,
        mode: config.mode,
        style: config.style,
        setTheme,
        setMode,
        setStyle,
        toggleTheme,
        mounted,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
