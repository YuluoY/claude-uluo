import React from 'react';
import { fadeUp, fontStack, Stage, useProgressFrom, useRevealFrames, useTheme, useUnit, withAlpha } from '../../engine';
import type { SceneProps } from '../../engine';

export type DefinitionProps = { term: string; definition: string; example?: string; at?: string[] };

/** 术语定义：术语 → 释义 → 例子依次出现。讲解时先让观众见过现象再给术语 */
export const Definition: React.FC<SceneProps<DefinitionProps>> = ({ props }) => {
  const theme = useTheme();
  const unit = useUnit();
  const frames = useRevealFrames(props.example ? 3 : 2, props.at);
  const p0 = useProgressFrom(frames[0]);
  const p1 = useProgressFrom(frames[1]);
  const p2 = useProgressFrom(frames[2] ?? 0);
  return (
    <Stage style={{ justifyContent: 'center' }}>
      <div style={{ fontFamily: fontStack(theme.fonts.heading), fontSize: theme.type.h1 * unit, fontWeight: 800, color: theme.colors.accent, ...fadeUp(p0, 24 * unit) }}>{props.term}</div>
      <div style={{ marginTop: 28 * unit, fontSize: theme.type.h3 * unit, lineHeight: 1.5, maxWidth: '90%', ...fadeUp(p1, 20 * unit) }}>{props.definition}</div>
      {props.example ? (
        <div
          style={{
            marginTop: 36 * unit,
            padding: `${20 * unit}px ${28 * unit}px`,
            borderLeft: `${6 * unit}px solid ${theme.colors.accent2}`,
            backgroundColor: withAlpha(theme.colors.accent2, 0.08),
            fontSize: theme.type.body * unit,
            color: theme.colors.textMuted,
            ...fadeUp(p2, 20 * unit),
          }}
        >
          例：{props.example}
        </div>
      ) : null}
    </Stage>
  );
};
