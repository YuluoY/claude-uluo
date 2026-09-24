// 栈（竖排，栈顶在上）与队列（横排，队首在左）。
import React from 'react';
import { fontStack, useTheme, useUnit } from '../../engine';
import { markColor, textOn } from './colors';
import type { ListState } from './viz-types';

type Props = { state: ListState; prev: ListState | null; progress: number; width: number; height: number };

export const ListViz: React.FC<Props> = ({ state, prev, progress, width, height }) => {
  const theme = useTheme();
  const unit = useUnit();
  const labelH = theme.type.small * unit * 1.6;
  const n = Math.max(1, state.items.length);
  const isStack = state.type === 'stack';
  const gap = 8 * unit;
  const size = isStack
    ? Math.max(8, Math.min((height - labelH - gap * (n - 1)) / n, 90 * unit))
    : Math.max(8, Math.min((width - gap * (n - 1)) / n, 120 * unit, height - labelH - theme.type.small * unit * 1.5));
  const title = state.label ?? (isStack ? '栈（顶在上）' : '队列（队首在左）');
  const items = isStack ? [...state.items].map((v, i) => ({ v, i })).reverse() : state.items.map((v, i) => ({ v, i }));
  return (
    <div style={{ position: 'relative', width, height, fontFamily: fontStack(theme.fonts.mono) }}>
      <div style={{ fontSize: theme.type.small * unit, color: theme.colors.textMuted, fontFamily: fontStack(theme.fonts.body), height: labelH }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: isStack ? 'column' : 'row', gap, alignItems: isStack ? 'center' : 'flex-start' }}>
        {items.length === 0 ? <div style={{ color: theme.colors.textMuted, fontSize: theme.type.small * unit }}>（空）</div> : null}
        {items.map(({ v, i }) => {
          const mark = state.marks?.[String(i)];
          return (
            <div
              key={i}
              style={{
                width: isStack ? Math.min(width * 0.8, size * 3) : size,
                height: size,
                backgroundColor: markColor(theme, mark, prev?.marks?.[String(i)], progress),
                border: `${Math.max(1, 2 * unit)}px solid ${mark ? theme.viz.marks[mark] : theme.colors.border}`,
                borderRadius: 10 * unit,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: Math.min(size * 0.42, theme.type.body * unit),
                color: textOn(theme, mark),
              }}
            >
              {v === null ? '' : String(v)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
