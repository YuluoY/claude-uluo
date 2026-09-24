// 动效工具：全部由帧号计算，不用 CSS transition/animation（逐帧渲染时它们不会按时间走）。
import type React from 'react';
import { Easing, interpolate } from 'remotion';
import type { Theme } from './types';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** 用主题的缓动曲线把线性进度映射到 0→1 */
export const ease = (theme: Theme, t: number): number => {
  const [a, b, c, d] = theme.motion.easing;
  return Easing.bezier(a, b, c, d)(clamp01(t));
};

/** 线性插值并夹住两端 */
export const lerp = (frame: number, input: [number, number], output: [number, number]): number =>
  interpolate(frame, input, output, { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** 淡入并上移：p 为 0→1 的进度 */
export const fadeUp = (p: number, distance: number): React.CSSProperties => ({
  opacity: p,
  transform: `translateY(${(1 - p) * distance}px)`,
});

/** 淡入并放大 */
export const popIn = (p: number, from = 0.92): React.CSSProperties => ({
  opacity: p,
  transform: `scale(${from + (1 - from) * p})`,
});

/** 两个颜色之间按进度混合（仅支持 #RRGGBB） */
export const mixColor = (a: string, b: string, p: number): string => {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) {
    return p < 0.5 ? a : b;
  }
  const q = clamp01(p);
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * q));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

const parseHex = (s: string): [number, number, number] | null => {
  const m = /^#([0-9a-fA-F]{6})$/.exec(s.trim());
  if (!m) {
    return null;
  }
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** 带透明度的颜色（#RRGGBB + alpha），其他格式原样返回 */
export const withAlpha = (hex: string, alpha: number): string => {
  const p = parseHex(hex);
  if (!p) {
    return hex;
  }
  return `rgba(${p[0]}, ${p[1]}, ${p[2]}, ${clamp01(alpha)})`;
};
