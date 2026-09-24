// 数组：格子或柱状，标记着色，指针箭头；给了 ids 时交换/移动会做位移动画。
import React from 'react';
import { fontStack, useSceneText, useTheme, useUnit } from '../../engine';
import { markColor, textOn } from './colors';
import type { ArrayState } from './viz-types';

type Props = { state: ArrayState; prev: ArrayState | null; progress: number; width: number; height: number };

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export const ArrayViz: React.FC<Props> = ({ state, prev, progress, width, height }) => {
  const theme = useTheme();
  const unit = useUnit();
  const on = useSceneText();
  const n = Math.max(1, state.values.length);
  // 槽位不够高时（一行可视化只有一百多像素）三条带和字号一起收，保证不越界
  const avail = Math.max(24, height - 4 * unit);
  const ifs = Math.min(theme.type.small * unit * 0.8, avail * 0.09);
  const pfs = Math.min(theme.type.small * unit, avail * 0.12);
  const labelH = state.label && on ? Math.min(theme.type.small * unit * 1.6, avail * 0.17) : 0;
  const pointerH = state.pointers && Object.keys(state.pointers).length ? pfs * 2.2 : 0;
  const indexH = ifs * 1.6 + 4 * unit;
  const gap = 10 * unit;
  const cell = Math.max(8, Math.min((width - gap * (n - 1)) / n, state.bars ? width : avail - labelH - pointerH - indexH, 150 * unit));
  const rowW = n * cell + (n - 1) * gap;
  const left0 = (width - rowW) / 2;
  const xOf = (i: number) => left0 + i * (cell + gap);

  const prevPos = new Map<string, number>();
  if (state.ids && prev?.ids) {
    prev.ids.forEach((id, i) => prevPos.set(String(id), i));
  }
  const maxAbs = Math.max(1, ...state.values.map((v) => Math.abs(num(v) ?? 0)));
  const barArea = Math.max(8, avail - labelH - pointerH - indexH);
  const top = labelH + pointerH;

  return (
    <div style={{ position: 'relative', width, height, fontFamily: fontStack(theme.fonts.mono) }}>
      {state.label && on ? (
        <div style={{ position: 'absolute', left: 0, top: 0, fontSize: theme.type.small * unit, color: theme.colors.textMuted, fontFamily: fontStack(theme.fonts.body) }}>
          {state.label}
        </div>
      ) : null}
      {state.values.map((v, i) => {
        const id = state.ids ? String(state.ids[i]) : null;
        const fromIdx = id !== null && prevPos.has(id) ? (prevPos.get(id) as number) : i;
        const x = xOf(fromIdx) + (xOf(i) - xOf(fromIdx)) * progress;
        const mark = state.marks?.[String(i)];
        const prevMark = prev ? prev.marks?.[String(fromIdx)] : undefined;
        const bg = markColor(theme, mark, prevMark, progress);
        const text = v === null ? '' : String(v);
        const fs = Math.min(cell * 0.42, theme.type.body * unit) * (text.length > 3 ? 3 / text.length : 1);
        if (state.bars) {
          const h = Math.max(4 * unit, ((Math.abs(num(v) ?? 0)) / maxAbs) * (barArea - fs * 1.6));
          return (
            <div key={id ?? i} style={{ position: 'absolute', left: x, width: cell, top, height: barArea }}>
              <div style={{ position: 'absolute', bottom: 0, width: '100%', height: h, backgroundColor: bg, borderRadius: 6 * unit, border: `${Math.max(1, unit)}px solid ${theme.colors.border}` }} />
              <div style={{ position: 'absolute', bottom: h + 6 * unit, width: '100%', textAlign: 'center', fontSize: fs, color: theme.colors.text }}>{text}</div>
            </div>
          );
        }
        return (
          <div
            key={id ?? i}
            style={{
              position: 'absolute',
              left: x,
              top,
              width: cell,
              height: cell,
              backgroundColor: bg,
              border: `${Math.max(1, 2 * unit)}px solid ${mark ? theme.viz.marks[mark] : theme.colors.border}`,
              borderRadius: 10 * unit,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: fs,
              color: textOn(theme, mark),
              fontWeight: 600,
            }}
          >
            {text}
          </div>
        );
      })}
      {state.values.map((_, i) => (
        <div
          key={`i${i}`}
          style={{ position: 'absolute', left: xOf(i), width: cell, top: top + (state.bars ? barArea : cell) + 4 * unit, textAlign: 'center', fontSize: ifs, color: theme.colors.textMuted }}
        >
          {i}
        </div>
      ))}
      {Object.entries(state.pointers ?? {}).map(([name, idx], k, all) => {
        const from = prev?.pointers?.[name] ?? idx;
        const x = xOf(from) + (xOf(idx) - xOf(from)) * progress + cell / 2;
        // 多个指针指向同一格时错开
        const same = all.filter(([, j]) => j === idx).map(([nm]) => nm);
        const offset = same.length > 1 ? (same.indexOf(name) - (same.length - 1) / 2) * theme.type.small * unit * 1.4 : 0;
        return (
          <div
            key={name}
            style={{
              position: 'absolute',
              left: x + offset,
              top: labelH,
              transform: 'translateX(-50%)',
              textAlign: 'center',
              fontSize: pfs,
              color: theme.colors.accent,
              lineHeight: 1.1,
            }}
          >
            <div>{name}</div>
            <div>▼</div>
          </div>
        );
      })}
    </div>
  );
};
