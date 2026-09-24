// 变量面板：当前步骤的变量值；和上一步相比变了的，用强调色标出并随过渡淡回。
import React from 'react';
import { fontStack, mixColor, useTheme, useUnit } from '../../engine';

type Props = {
  vars: Record<string, unknown> | undefined;
  prevVars: Record<string, unknown> | undefined;
  progress: number;
  only?: string[];
  style?: React.CSSProperties;
};

const show = (v: unknown): string => {
  if (typeof v === 'string') {
    return v;
  }
  return JSON.stringify(v);
};

export const VarsPanel: React.FC<Props> = ({ vars, prevVars, progress, only, style }) => {
  const theme = useTheme();
  const unit = useUnit();
  if (!vars) {
    return null;
  }
  const keys = (only ?? Object.keys(vars)).filter((k) => k in vars);
  if (keys.length === 0) {
    return null;
  }
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${10 * unit}px ${28 * unit}px`,
        fontFamily: fontStack(theme.fonts.mono),
        fontSize: theme.type.small * unit,
        padding: `${14 * unit}px ${20 * unit}px`,
        backgroundColor: theme.colors.surface,
        border: `${Math.max(1, unit)}px solid ${theme.colors.border}`,
        borderRadius: theme.radius * unit,
        ...style,
      }}
    >
      {keys.map((k) => {
        const changed = prevVars !== undefined && show(prevVars[k]) !== show(vars[k]);
        const color = changed ? mixColor(theme.colors.warning, theme.colors.text, progress * 0.6) : theme.colors.text;
        return (
          <span key={k}>
            <span style={{ color: theme.colors.textMuted }}>{k} = </span>
            <span style={{ color, fontWeight: changed ? 700 : 400 }}>{show(vars[k])}</span>
          </span>
        );
      })}
    </div>
  );
};
