import React from 'react';
import {
  Box,
  bodyStyle,
  monoStyle,
  reserve,
  SceneTitle,
  Slide,
  SourceNote,
  sourceNoteHeight,
  TextBlock,
  textWidth,
  useRevealFrames,
  useRevealProgress,
  useSlide,
  useTextFitGroup,
  useTitleLayout,
  withAlpha,
} from '../../engine';
import type { SceneProps } from '../../engine';
import { formatNumber, requireList, requireText } from './common';

type Datum = { label: string; value: number };
export type BarChartProps = { title?: string; data: Datum[]; unit?: string; decimals?: number; source: string; highlight?: string; at?: string[] };

const Body: React.FC<{ props: BarChartProps; data: Datum[]; frames: number[] }> = ({ props, data, frames }) => {
  const { frame, theme, unit } = useSlide();
  const source = requireText(props.source, 'source（数据来源）', 'BarChart');
  const t = useTitleLayout(props.title);
  const g = frame.gutter;
  const [chart, src] = reserve(t.body, sourceNoteHeight(theme, unit) * 2, g * 0.6);
  const n = data.length;
  const gapK = 0.45;
  // 每行的最大高度（行高 + 行距）
  const rowMax = chart.h / (n + (n - 1) * gapK);
  const bs = bodyStyle(theme);
  const ms = monoStyle(theme);
  const labelMaxW = chart.w * 0.3;
  const labels = useTextFitGroup(
    data.map((d) => ({ text: d.label, width: labelMaxW, height: rowMax, maxLines: 2 })),
    { style: bs, max: Math.min(theme.type.body * unit, rowMax / 1.2), min: theme.type.small * unit * 0.8 },
  );
  const fs = labels[0]?.fontSize ?? theme.type.body * unit;
  const values = data.map((d) => `${formatNumber(d.value, props.decimals ?? (Number.isInteger(d.value) ? 0 : 1))}${props.unit ?? ''}`);
  const labelW = Math.min(labelMaxW, Math.max(...labels.map((f) => f.width)));
  const valueW = Math.max(...values.map((v) => textWidth(v, fs, ms)));
  const colGap = 20 * unit;
  const trackW = Math.max(1, chart.w - labelW - valueW - 2 * colGap);
  const rowH = Math.min(rowMax, Math.max(fs * 2.1, Math.max(...labels.map((f) => f.height))));
  const gap = rowH * gapK;
  const total = n * rowH + (n - 1) * gap;
  const y0 = chart.y + (chart.h - total) * 0.45;
  const max = Math.max(1e-9, ...data.map((d) => Math.abs(d.value)));
  const progress = useRevealProgress(frames, theme.motion.durationSec * 1.6);
  const [pt] = useRevealProgress([0]);
  const barH = Math.min(rowH * 0.62, fs * 1.3);
  return (
    <>
      <SceneTitle layout={t} text={props.title} reveal={pt} />
      <div data-vp-ignore="1" style={{ position: 'absolute', left: chart.x + labelW + colGap - 1, top: y0 - gap / 2, width: Math.max(1, 2 * unit), height: total + gap, backgroundColor: withAlpha(theme.colors.text, 0.2) }} />
      {data.map((d, i) => {
        const y = y0 + i * (rowH + gap);
        const on = props.highlight ? props.highlight === d.label : true;
        const len = (Math.abs(d.value) / max) * trackW * progress[i];
        const color = on ? (d.value < 0 ? theme.colors.danger : theme.colors.accent) : withAlpha(theme.colors.text, 0.22);
        return (
          <Box key={i} rect={{ x: chart.x, y, w: chart.w, h: rowH }} name={`bar-${i + 1}`}>
            <TextBlock
              fit={labels[i]}
              text={d.label}
              style={bs}
              rect={{ x: 0, y: (rowH - labels[i].height) / 2, w: labelW, h: labels[i].height }}
              align="right"
              color={on ? theme.colors.text : theme.colors.textMuted}
            />
            <div style={{ position: 'absolute', left: labelW + colGap, top: (rowH - barH) / 2, width: len, height: barH, backgroundColor: color, borderRadius: `0 ${Math.min(barH / 2, theme.radius * unit)}px ${Math.min(barH / 2, theme.radius * unit)}px 0` }} />
            <div
              style={{
                position: 'absolute',
                left: labelW + colGap + len + colGap * 0.6,
                top: (rowH - fs * 1.2) / 2,
                height: fs * 1.2,
                lineHeight: `${fs * 1.2}px`,
                fontFamily: ms.family,
                fontSize: fs,
                whiteSpace: 'pre',
                color: on ? theme.colors.text : theme.colors.textMuted,
                opacity: progress[i],
              }}
            >
              {values[i]}
            </div>
          </Box>
        );
      })}
      <SourceNote rect={src} text={source} />
    </>
  );
};

/** 横向柱状图：柱子依次长出，数值跟在柱尾。highlight 指定的一项用强调色，其余变灰。source 必填，数字必须来自素材 */
export const BarChart: React.FC<SceneProps<BarChartProps>> = ({ props }) => {
  const data = requireList<Datum>(props.data, 'data', 'BarChart');
  const frames = useRevealFrames(data.length, props.at);
  return (
    <Slide>
      <Body props={props} data={data} frames={frames} />
    </Slide>
  );
};
