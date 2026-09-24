// 版面几何：所有位置都从画幅、平台安全区、页眉、字幕带算出来，场景只在算好的矩形里摆东西。
//
//   画布 ─┬─ 平台安全区（safeArea，平台界面会挡住的边）
//         ├─ 章节条 chapterBar（开启时：ruler 贴视频边、左右出血；格子样式贴安全区上沿或下沿）
//         └─ 页边距（按画幅比例）
//              ├─ 页眉带（章节名 / 页码，主题开启时）
//              ├─ 内容区 content ← 场景只能在这里摆内容
//              └─ 字幕带 captions（烧录字幕时，内容区的下边界在它上方；章节条在底部时字幕上移）
//
// 与 scripts/vp/layoutcheck.py 使用同一套公式（改这里要同步改那里）。
import type React from 'react';
import { useMemo } from 'react';
import { useVideoConfig } from 'remotion';
import { settings } from './data';
import type { Settings, Theme } from './types';

export type Rect = { x: number; y: number; w: number; h: number };
export type Aspect = 'landscape' | 'square' | 'portrait';

export type FrameLayout = {
  width: number;
  height: number;
  /** 短边 / 1080：主题里的字号、间距都乘它 */
  unit: number;
  aspect: Aspect;
  canvas: Rect;
  /** 去掉平台安全区后的区域 */
  safe: Rect;
  /** 去掉页边距后的区域（页眉 + 内容 + 字幕带都在这里面） */
  inner: Rect;
  header: Rect | null;
  /** 章节条（ruler 贴视频边、左右出血；格子样式贴安全区上沿或下沿） */
  chapterBar: Rect | null;
  /** 烧录字幕占用的横带（全宽，字幕块在其中水平居中） */
  captions: Rect | null;
  content: Rect;
  gutter: number;
  /** 栅格列数：横屏 12、方形 8、竖屏 6 */
  cols: number;
  /** 场景文字的放大系数：竖屏画面高、手机上看，文字与部件整体放大（横屏、方形为 1） */
  typeScale: number;
};

export const TYPE_SCALE: Record<Aspect, number> = { landscape: 1, square: 1, portrait: 1.2 };

export const aspectOf = (w: number, h: number): Aspect => {
  const r = w / h;
  if (r >= 1.3) {
    return 'landscape';
  }
  if (r <= 0.8) {
    return 'portrait';
  }
  return 'square';
};

/** 页边距占画幅的比例（在平台安全区之内再留） */
export const MARGINS: Record<Aspect, { x: number; y: number }> = {
  landscape: { x: 0.055, y: 0.065 },
  square: { x: 0.07, y: 0.06 },
  portrait: { x: 0.075, y: 0.045 },
};

/** 章节条的高度与离安全区边缘的距离（像素） */
export const chapterBarMetrics = (width: number, height: number, s: Settings): { h: number; gap: number } | null => {
  const cb = s.overlays.chapterBar;
  if (!cb || !cb.enabled || s.mode !== 'produce') {
    return null;
  }
  const unit = Math.min(width, height) / 1080;
  return { h: cb.height * unit, gap: 14 * unit };
};

export const captionBand = (width: number, height: number, s: Settings): Rect | null => {
  const c = s.captions;
  if (!c.burn) {
    return null;
  }
  const st = c.style;
  // 章节条在底部时，字幕整体上移让开
  const cb = chapterBarMetrics(width, height, s);
  const lift = cb && s.overlays.chapterBar.position === 'bottom' ? cb.h + cb.gap : 0;
  const bottom = ((st.bottomPct + s.video.safeArea.bottom) / 100) * height + lift;
  // 字幕块高度：行数 × 行高 + 描边与底栏的上下余量
  const pad = st.fontSize * (st.background ? 0.36 : 0.2) + st.strokeWidth;
  const h = st.fontSize * st.lineHeight * c.maxLines + pad * 2;
  return { x: 0, y: height - bottom - h, w: width, h };
};

export const computeFrameLayout = (width: number, height: number, s: Settings, theme: Theme): FrameLayout => {
  const unit = Math.min(width, height) / 1080;
  const aspect = aspectOf(width, height);
  const sa = s.video.safeArea;
  const safe: Rect = {
    x: (sa.left / 100) * width,
    y: (sa.top / 100) * height,
    w: width * (1 - (sa.left + sa.right) / 100),
    h: height * (1 - (sa.top + sa.bottom) / 100),
  };
  const m = MARGINS[aspect];
  const mx = m.x * width;
  const my = m.y * height;
  // 章节条贴着安全区上沿或下沿；它那一侧的页边距减半（章节条本身已经把内容和边缘隔开）
  const cbm = chapterBarMetrics(width, height, s);
  let chapterBar: Rect | null = null;
  let innerTop = safe.y + my;
  let innerBottom = safe.y + safe.h - my;
  if (cbm) {
    // ruler 刻度尺贴视频边、全出血：左右到边，线压在上/下边缘
    const ruler = s.overlays.chapterBar.style === 'ruler';
    if (s.overlays.chapterBar.position === 'top') {
      chapterBar = ruler ? { x: 0, y: 0, w: width, h: cbm.h } : { x: safe.x + mx, y: safe.y + cbm.gap, w: safe.w - 2 * mx, h: cbm.h };
      innerTop = chapterBar.y + chapterBar.h + my * 0.5;
    } else {
      chapterBar = ruler ? { x: 0, y: height - cbm.h, w: width, h: cbm.h } : { x: safe.x + mx, y: safe.y + safe.h - cbm.gap - cbm.h, w: safe.w - 2 * mx, h: cbm.h };
      innerBottom = chapterBar.y - my * 0.5;
    }
  }
  const inner: Rect = { x: safe.x + mx, y: innerTop, w: safe.w - 2 * mx, h: Math.max(1, innerBottom - innerTop) };
  const gutter = Math.round(theme.space * unit);

  let top = inner.y;
  let header: Rect | null = null;
  // 页码关掉后页眉会剩一条空白带：overlays.header=false 直接不预留
  if (theme.chrome.header && s.overlays.header !== false) {
    const hh = theme.type.small * unit * 1.5;
    header = { x: inner.x, y: inner.y, w: inner.w, h: hh };
    top = inner.y + hh + gutter;
  }
  const captions = captionBand(width, height, s);
  let bottom = inner.y + inner.h;
  if (captions) {
    bottom = Math.min(bottom, captions.y - gutter * 0.75);
  }
  const content: Rect = { x: inner.x, y: top, w: inner.w, h: Math.max(1, bottom - top) };
  const cols = aspect === 'landscape' ? 12 : aspect === 'square' ? 8 : 6;
  return { width, height, unit, aspect, canvas: { x: 0, y: 0, w: width, h: height }, safe, inner, header, chapterBar, captions, content, gutter, cols, typeScale: TYPE_SCALE[aspect] };
};

export const useFrameLayout = (theme: Theme): FrameLayout => {
  const { width, height } = useVideoConfig();
  return useMemo(() => computeFrameLayout(width, height, settings, theme), [width, height, theme]);
};

// ---------- 矩形运算 ----------

export const inset = (r: Rect, d: number | { x?: number; y?: number; top?: number; bottom?: number; left?: number; right?: number }): Rect => {
  if (typeof d === 'number') {
    return { x: r.x + d, y: r.y + d, w: Math.max(0, r.w - 2 * d), h: Math.max(0, r.h - 2 * d) };
  }
  const left = d.left ?? d.x ?? 0;
  const right = d.right ?? d.x ?? 0;
  const top = d.top ?? d.y ?? 0;
  const bottom = d.bottom ?? d.y ?? 0;
  return { x: r.x + left, y: r.y + top, w: Math.max(0, r.w - left - right), h: Math.max(0, r.h - top - bottom) };
};

/** 纵向切分：sizes 里的数字是固定高度，'fill' 平分剩余高度 */
export const stackV = (r: Rect, sizes: Array<number | 'fill'>, gap: number): Rect[] => {
  const fixed = sizes.reduce<number>((a, s) => a + (s === 'fill' ? 0 : s), 0);
  const fills = sizes.filter((s) => s === 'fill').length;
  const free = Math.max(0, r.h - fixed - gap * (sizes.length - 1));
  const each = fills ? free / fills : 0;
  const out: Rect[] = [];
  let y = r.y;
  for (const s of sizes) {
    const h = s === 'fill' ? each : s;
    out.push({ x: r.x, y, w: r.w, h });
    y += h + gap;
  }
  return out;
};

/** 横向切分：ratios 为各段宽度比例 */
export const splitH = (r: Rect, ratios: number[], gap: number): Rect[] => {
  const total = ratios.reduce((a, b) => a + b, 0);
  const free = Math.max(0, r.w - gap * (ratios.length - 1));
  const out: Rect[] = [];
  let x = r.x;
  for (const k of ratios) {
    const w = (free * k) / total;
    out.push({ x, y: r.y, w, h: r.h });
    x += w + gap;
  }
  return out;
};

/** 纵向按比例切分 */
export const splitV = (r: Rect, ratios: number[], gap: number): Rect[] => {
  const total = ratios.reduce((a, b) => a + b, 0);
  const free = Math.max(0, r.h - gap * (ratios.length - 1));
  const out: Rect[] = [];
  let y = r.y;
  for (const k of ratios) {
    const h = (free * k) / total;
    out.push({ x: r.x, y, w: r.w, h });
    y += h + gap;
  }
  return out;
};

/**
 * 把 n 个格子排进矩形：在所有行列组合里选让格子最接近 targetAspect（宽/高）且面积最大的一种。
 * 返回按行优先排列的格子；最后一行不满时整行居中。
 */
export const gridCells = (r: Rect, n: number, gap: number, targetAspect = 1.4, maxCols = 6): { cols: number; rows: number; cells: Rect[] } => {
  if (n <= 0) {
    return { cols: 0, rows: 0, cells: [] };
  }
  let best: { cols: number; rows: number; score: number } | null = null;
  for (let cols = 1; cols <= Math.min(n, maxCols); cols++) {
    const rows = Math.ceil(n / cols);
    const w = (r.w - gap * (cols - 1)) / cols;
    const h = (r.h - gap * (rows - 1)) / rows;
    if (w <= 0 || h <= 0) {
      continue;
    }
    const aspect = w / h;
    const shapePenalty = Math.abs(Math.log(aspect / targetAspect));
    const emptyPenalty = (rows * cols - n) / (rows * cols);
    const score = Math.min(w, h * targetAspect) * (1 - 0.35 * shapePenalty) * (1 - 0.5 * emptyPenalty);
    if (!best || score > best.score) {
      best = { cols, rows, score };
    }
  }
  const { cols } = best ?? { cols: 1 };
  return gridLayout(r, n, cols, gap);
};

/** 固定列数排 n 个格子（行优先，最后一行不满时居中） */
export const gridLayout = (r: Rect, n: number, cols: number, gap: number): { cols: number; rows: number; cells: Rect[] } => {
  const c = Math.max(1, Math.min(cols, n));
  const rows = Math.max(1, Math.ceil(n / c));
  const w = (r.w - gap * (c - 1)) / c;
  const h = (r.h - gap * (rows - 1)) / rows;
  const cells: Rect[] = [];
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / c);
    const inRow = row === rows - 1 ? n - row * c : c;
    const offset = ((c - inRow) * (w + gap)) / 2;
    const col = i % c;
    cells.push({ x: r.x + offset + col * (w + gap), y: r.y + row * (h + gap), w, h });
  }
  return { cols: c, rows, cells };
};

/** 按栅格取列：start 从 0 开始 */
export const cols = (frame: FrameLayout, r: Rect, start: number, span: number): Rect => {
  const colW = (r.w - frame.gutter * (frame.cols - 1)) / frame.cols;
  return { x: r.x + start * (colW + frame.gutter), y: r.y, w: span * colW + (span - 1) * frame.gutter, h: r.h };
};

export const rectStyle = (r: Rect): React.CSSProperties => ({ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h });

export const intersects = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
