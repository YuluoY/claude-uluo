// 二维表：动态规划表、矩阵、棋盘。
import React from 'react';
import { fontStack, useTheme, useUnit } from '../../engine';
import { markColor, textOn } from './colors';
import type { GridState } from './viz-types';

type Props = { state: GridState; prev: GridState | null; progress: number; width: number; height: number };

export const GridViz: React.FC<Props> = ({ state, prev, progress, width, height }) => {
  const theme = useTheme();
  const unit = useUnit();
  const rows = state.rows.length;
  const cols = Math.max(1, ...state.rows.map((r) => r.length));
  const labelH = state.label ? theme.type.small * unit * 1.6 : 0;
  const colLabelH = state.colLabels ? theme.type.small * unit * 1.5 : 0;
  const rowLabelW = state.rowLabels ? theme.type.small * unit * 3 : 0;
  const cell = Math.max(8, Math.min((width - rowLabelW) / cols, (height - labelH - colLabelH) / Math.max(1, rows), 120 * unit));
  const gridW = rowLabelW + cols * cell;
  const left0 = (width - gridW) / 2;
  const top0 = labelH + colLabelH;
  const fs = Math.min(cell * 0.4, theme.type.body * unit);
  return (
    <div style={{ position: 'relative', width, height, fontFamily: fontStack(theme.fonts.mono) }}>
      {state.label ? (
        <div style={{ position: 'absolute', left: 0, top: 0, fontSize: theme.type.small * unit, color: theme.colors.textMuted, fontFamily: fontStack(theme.fonts.body) }}>{state.label}</div>
      ) : null}
      {state.colLabels?.map((c, j) => (
        <div key={`c${j}`} style={{ position: 'absolute', left: left0 + rowLabelW + j * cell, top: labelH, width: cell, textAlign: 'center', fontSize: theme.type.small * unit * 0.85, color: theme.colors.textMuted }}>
          {c}
        </div>
      ))}
      {state.rowLabels?.map((r, i) => (
        <div key={`r${i}`} style={{ position: 'absolute', left: left0, top: top0 + i * cell, width: rowLabelW - 8 * unit, height: cell, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontSize: theme.type.small * unit * 0.85, color: theme.colors.textMuted }}>
          {r}
        </div>
      ))}
      {state.rows.map((row, i) =>
        row.map((v, j) => {
          const key = `${i},${j}`;
          const mark = state.marks?.[key];
          const bg = markColor(theme, mark, prev?.marks?.[key], progress);
          return (
            <div
              key={key}
              style={{
                position: 'absolute',
                left: left0 + rowLabelW + j * cell,
                top: top0 + i * cell,
                width: cell,
                height: cell,
                backgroundColor: bg,
                border: `${Math.max(1, unit)}px solid ${theme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: fs,
                color: textOn(theme, mark),
              }}
            >
              {v === null ? '' : String(v)}
            </div>
          );
        }),
      )}
    </div>
  );
};
