import React from 'react';
import { fontStack, Stage, useContentBox, useProgressFrom, useRevealFrames, useTheme, useUnit } from '../../engine';
import type { SceneProps } from '../../engine';
import { requireText, SceneTitle, SourceNote } from './common';

export type BarChartProps = { title?: string; data: Array<{ label: string; value: number }>; unit?: string; source: string; highlight?: string; at?: string[] };

const Bar: React.FC<{ label: string; value: number; max: number; start: number; highlight: boolean; w: number; unitText: string }> = ({ label, value, max, start, highlight, w, unitText }) => {
  const theme = useTheme();
  const unit = useUnit();
  const p = useProgressFrom(start, theme.motion.durationSec * 1.5);
  const len = (Math.abs(value) / max) * w * p;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 * unit }}>
      <div style={{ width: w * 0.28, textAlign: 'right', fontSize: theme.type.body * unit, color: highlight ? theme.colors.text : theme.colors.textMuted }}>{label}</div>
      <div style={{ height: theme.type.body * unit * 1.2, width: len, backgroundColor: highlight ? theme.colors.accent : theme.colors.border, borderRadius: 6 * unit }} />
      <div style={{ fontFamily: fontStack(theme.fonts.mono), fontSize: theme.type.body * unit, opacity: p }}>
        {value}
        {unitText}
      </div>
    </div>
  );
};

/** 横向柱状图：柱子依次长出。source 必填，数字必须来自素材 */
export const BarChart: React.FC<SceneProps<BarChartProps>> = ({ props }) => {
  const source = requireText(props.source, 'source（数据来源）', 'BarChart');
  const frames = useRevealFrames(props.data.length, props.at);
  const box = useContentBox();
  const unit = useUnit();
  const max = Math.max(1e-9, ...props.data.map((d) => Math.abs(d.value)));
  return (
    <Stage>
      <SceneTitle text={props.title} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 * unit, flex: 1, justifyContent: 'center' }}>
        {props.data.map((d, i) => (
          <Bar key={d.label} label={d.label} value={d.value} max={max} start={frames[i]} highlight={props.highlight === d.label} w={box.width * 0.62} unitText={props.unit ?? ''} />
        ))}
      </div>
      <SourceNote text={source} />
    </Stage>
  );
};
