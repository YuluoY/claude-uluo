import React from 'react';
import {
  bodyStyle,
  Card,
  cardPadding,
  fitNumberSize,
  gridCells,
  gridLayout,
  headingStyle,
  NumberText,
  reserve,
  SceneTitle,
  Slide,
  SourceNote,
  sourceNoteHeight,
  TextBlock,
  useRevealFrames,
  useRevealProgress,
  useSlide,
  useTextFitGroup,
  useTitleLayout,
} from '../../engine';
import type { Rect, SceneProps, TextStyle } from '../../engine';
import { formatNumber, requireList, requireText } from './common';

type Stat = { value: number; decimals?: number; prefix?: string; suffix?: string; group?: boolean; label: string };
export type StatGridProps = { title?: string; stats: Stat[]; source: string; at?: string[] };

const Body: React.FC<{ props: StatGridProps; stats: Stat[]; frames: number[] }> = ({ props, stats, frames }) => {
  const { frame, theme, unit } = useSlide();
  const source = requireText(props.source, 'source（数据来源）', 'StatGrid');
  const t = useTitleLayout(props.title);
  const g = frame.gutter;
  const [area, src] = reserve(t.body, sourceNoteHeight(theme, unit) * 2, g * 0.5);
  const n = stats.length;
  const maxCols = frame.aspect === 'landscape' ? 4 : 2;
  const grid = gridCells(area, n, g, frame.aspect === 'portrait' ? 1.6 : 1.3, maxCols);
  const cell = grid.cells[0];
  const pad = cardPadding(theme, unit);
  const innerW = cell.w - 2 * pad;
  const innerH = cell.h - 2 * pad;
  const ns: TextStyle = { ...headingStyle(theme), lineHeight: 1.1 };
  const bs = bodyStyle(theme);
  const finals = stats.map((s) => formatNumber(s.value, s.decimals ?? 0, s.group ?? Math.abs(s.value) >= 10000));
  // 所有数字同一字号：取各自能放下的最大字号中最小的一个
  const sizes = stats.map((s, i) => fitNumberSize({ value: finals[i], prefix: s.prefix, suffix: s.suffix, width: innerW, height: innerH * 0.55, style: ns, max: theme.type.display * unit, min: theme.type.h3 * unit }));
  const fs = Math.min(...sizes.map((x) => x.fontSize));
  const numH = fs * ns.lineHeight;
  const labels = useTextFitGroup(
    stats.map((s) => ({ text: s.label, width: innerW, height: Math.max(1, innerH - numH - g * 0.5), maxLines: 3 })),
    { style: bs, max: theme.type.body * unit, min: theme.type.small * unit * 0.85 },
  );
  const labelH = Math.max(...labels.map((f) => f.height));
  const need = 2 * pad + numH + g * 0.5 + labelH;
  const cellH = Math.min(cell.h, need);
  const total = grid.rows * cellH + (grid.rows - 1) * g;
  const box: Rect = { x: area.x, y: area.y + (area.h - total) * 0.4, w: area.w, h: total };
  const cells = gridLayout(box, n, grid.cols, g).cells;
  const progress = useRevealProgress(frames);
  const counts = useRevealProgress(frames, theme.motion.durationSec * 2.4);
  const [pt] = useRevealProgress([0]);
  return (
    <>
      <SceneTitle layout={t} text={props.title} reveal={pt} />
      {stats.map((s, i) => (
        <Card key={i} rect={cells[i]} name={`stat-${i + 1}`} padding={pad} reveal={progress[i]} motion="pop">
          <NumberText
            rect={{ x: 0, y: 0, w: innerW, h: numH }}
            value={formatNumber(s.value * counts[i], s.decimals ?? 0, s.group ?? Math.abs(s.value) >= 10000)}
            final={finals[i]}
            prefix={s.prefix}
            suffix={s.suffix}
            fontSize={fs}
            overflow={sizes[i].overflow}
            style={ns}
            color={theme.colors.accent}
            affixColor={theme.colors.text}
            align="left"
          />
          <TextBlock fit={labels[i]} text={s.label} style={bs} rect={{ x: 0, y: numH + g * 0.5, w: innerW, h: labels[i].height }} color={theme.colors.textMuted} />
        </Card>
      ))}
      <SourceNote rect={src} text={source} />
    </>
  );
};

/** 数据卡片：2–8 个关键数字（大号数字 + 说明）依次出现并计数。source 必填，数字必须来自素材 */
export const StatGrid: React.FC<SceneProps<StatGridProps>> = ({ props }) => {
  const stats = requireList<Stat>(props.stats, 'stats', 'StatGrid');
  const frames = useRevealFrames(stats.length, props.at);
  return (
    <Slide>
      <Body props={props} stats={stats} frames={frames} />
    </Slide>
  );
};
