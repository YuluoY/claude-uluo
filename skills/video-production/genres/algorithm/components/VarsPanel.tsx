// 变量面板：当前步骤的变量值；和上一步相比变了的，用强调色标出并随过渡淡回。
// 变量按“名 = 值”排成若干行（放不下就换行，单个太长就截断加省略号）；面板高度取整个 trace 里最多的行数，切步骤时不跳。
import React from 'react';
import { mixColor, monoStyle, textWidth, type TextStyle, type Theme } from '../../engine';
import type { Rect } from '../../engine';

const show = (v: unknown): string => (typeof v === 'string' ? v : JSON.stringify(v));

type Chip = { key: string; text: string; x: number; y: number; w: number };

const ellipsize = (text: string, maxW: number, fs: number, st: TextStyle): string => {
  if (textWidth(text, fs, st) <= maxW) {
    return text;
  }
  const chars = Array.from(text);
  for (let n = chars.length - 1; n > 0; n--) {
    const t = chars.slice(0, n).join('') + '…';
    if (textWidth(t, fs, st) <= maxW) {
      return t;
    }
  }
  return '…';
};

const flow = (vars: Record<string, unknown>, keys: string[], width: number, fs: number, st: TextStyle, gapX: number, rowH: number): { chips: Chip[]; rows: number } => {
  const chips: Chip[] = [];
  let x = 0;
  let row = 0;
  for (const k of keys) {
    if (!(k in vars)) {
      continue;
    }
    const text = ellipsize(`${k} = ${show(vars[k])}`, width, fs, st);
    const w = textWidth(text, fs, st);
    if (x > 0 && x + w > width) {
      row += 1;
      x = 0;
    }
    chips.push({ key: k, text, x, y: row * rowH, w });
    x += w + gapX;
  }
  return { chips, rows: chips.length ? row + 1 : 0 };
};

export type VarsMetrics = { fontSize: number; rowH: number; padX: number; padY: number; height: number };

/** 按整个 trace 里变量最多的一步算面板高度与字号 */
export const varsMetrics = (all: Array<Record<string, unknown> | undefined>, only: string[] | undefined, width: number, theme: Theme, unit: number): VarsMetrics => {
  const st = monoStyle(theme);
  const padX = 20 * unit;
  const padY = 12 * unit;
  let fs = theme.type.small * unit;
  for (let attempt = 0; attempt < 4; attempt++) {
    const rowH = fs * 1.5;
    let rows = 0;
    for (const v of all) {
      if (v) {
        rows = Math.max(rows, flow(v, only ?? Object.keys(v), width - 2 * padX, fs, st, 28 * unit, rowH).rows);
      }
    }
    if (rows <= 3 || attempt === 3) {
      return { fontSize: fs, rowH, padX, padY, height: rows ? rows * rowH + 2 * padY : 0 };
    }
    fs *= 0.86;
  }
  return { fontSize: fs, rowH: fs * 1.5, padX, padY, height: 0 };
};

type Props = {
  rect: Rect;
  metrics: VarsMetrics;
  vars: Record<string, unknown> | undefined;
  prevVars: Record<string, unknown> | undefined;
  progress: number;
  only?: string[];
  theme: Theme;
  unit: number;
};

export const VarsPanel: React.FC<Props> = ({ rect, metrics, vars, prevVars, progress, only, theme, unit }) => {
  const st = monoStyle(theme);
  const m = metrics;
  const { chips } = vars ? flow(vars, only ?? Object.keys(vars), rect.w - 2 * m.padX, m.fontSize, st, 28 * unit, m.rowH) : { chips: [] };
  return (
    <div
      data-vp-box="vars"
      style={{
        position: 'absolute',
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        boxSizing: 'border-box',
        backgroundColor: theme.colors.surface,
        border: `${Math.max(1, unit)}px solid ${theme.colors.border}`,
        borderRadius: theme.radius * unit,
      }}
    >
      {chips.map((c) => {
        const changed = prevVars !== undefined && vars !== undefined && show(prevVars[c.key]) !== show(vars[c.key]);
        const color = changed ? mixColor(theme.colors.warning, theme.colors.text, progress * 0.6) : theme.colors.text;
        const eq = c.text.indexOf(' = ');
        return (
          <div
            key={c.key}
            style={{
              position: 'absolute',
              left: m.padX + c.x,
              top: m.padY + c.y,
              width: c.w + 1,
              height: m.rowH,
              lineHeight: `${m.rowH}px`,
              whiteSpace: 'pre',
              fontFamily: st.family,
              fontWeight: st.weight,
              fontSize: m.fontSize,
            }}
          >
            <span style={{ color: theme.colors.textMuted }}>{c.text.slice(0, eq + 3)}</span>
            <span style={{ color }}>{c.text.slice(eq + 3)}</span>
          </div>
        );
      })}
    </div>
  );
};
