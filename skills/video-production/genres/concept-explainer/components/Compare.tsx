import React from 'react';
import { useVideoConfig } from 'remotion';
import { fadeUp, fontStack, Stage, useProgressFrom, useRevealFrames, useTheme, useUnit } from '../../engine';
import type { SceneProps } from '../../engine';
import { SceneTitle } from './common';

type Side = { title: string; points: string[] };
export type CompareProps = { title?: string; left: Side; right: Side; at?: string[]; verdict?: string; verdictAt?: string };

const Point: React.FC<{ text: string; start: number; color: string }> = ({ text, start, color }) => {
  const theme = useTheme();
  const unit = useUnit();
  const p = useProgressFrom(start);
  return (
    <div style={{ display: 'flex', gap: 16 * unit, fontSize: theme.type.body * unit, lineHeight: 1.4, ...fadeUp(p, 18 * unit) }}>
      <span style={{ color }}>▸</span>
      <span>{text}</span>
    </div>
  );
};

/** 对比：左右两栏（竖屏上下），第 k 行两边的要点一起在 at[k] 或第 k 句出现；最后可给一句结论 */
export const Compare: React.FC<SceneProps<CompareProps>> = ({ props }) => {
  const theme = useTheme();
  const unit = useUnit();
  const { width, height } = useVideoConfig();
  const rows = Math.max(props.left.points.length, props.right.points.length);
  const cues: Array<string | undefined> = Array.from({ length: rows }, (_, i) => props.at?.[i]);
  if (props.verdict) {
    cues.push(props.verdictAt);
  }
  const frames = useRevealFrames(cues.length, cues);
  const verdictP = useProgressFrom(props.verdict ? frames[rows] : 0);
  const col = (side: Side, color: string) => (
    <div style={{ flex: 1, padding: 32 * unit, borderRadius: theme.radius * unit, backgroundColor: theme.colors.surface, border: `${3 * unit}px solid ${color}`, display: 'flex', flexDirection: 'column', gap: 18 * unit }}>
      <div style={{ fontFamily: fontStack(theme.fonts.heading), fontSize: theme.type.h3 * unit, fontWeight: 700, color }}>{side.title}</div>
      {side.points.map((t, i) => (
        <Point key={i} text={t} start={frames[i]} color={color} />
      ))}
    </div>
  );
  return (
    <Stage>
      <SceneTitle text={props.title} />
      <div style={{ display: 'flex', flexDirection: width >= height ? 'row' : 'column', gap: 32 * unit, flex: 1, minHeight: 0 }}>
        {col(props.left, theme.colors.accent)}
        {col(props.right, theme.colors.accent2)}
      </div>
      {props.verdict ? (
        <div style={{ marginTop: 28 * unit, fontSize: theme.type.h3 * unit, fontWeight: 700, textAlign: 'center', ...fadeUp(verdictP, 20 * unit) }}>{props.verdict}</div>
      ) : null}
    </Stage>
  );
};
