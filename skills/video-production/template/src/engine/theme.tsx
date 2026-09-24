import React, { createContext, useContext } from 'react';
import { useVideoConfig } from 'remotion';
import { getTheme } from './data';
import type { Theme } from './types';

const ThemeContext = createContext<Theme | null>(null);

export const ThemeProvider: React.FC<{ theme: Theme; children: React.ReactNode }> = ({ theme, children }) => (
  <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
);

/** 当前风格；不在 ThemeProvider 内时用 video.config.json 的 style */
export const useTheme = (): Theme => useContext(ThemeContext) ?? getTheme();

/** 尺寸单位：主题里的字号、间距以短边 1080 像素为基准，乘以它得到当前画幅下的像素 */
export const useUnit = (): number => {
  const { width, height } = useVideoConfig();
  return Math.min(width, height) / 1080;
};

export const fontStack = (families: string[]): string =>
  families.map((f) => (/^[a-z-]+$/.test(f) ? f : `"${f}"`)).join(', ');
