import React from 'react';
import {
  Arrow,
  bodyStyle,
  Card,
  cardPadding,
  gridLayout,
  headingStyle,
  NumberBadge,
  SceneTitle,
  Slide,
  TextBlock,
  useCurrentIndex,
  useRevealFrames,
  useRevealProgress,
  useSlide,
  useTextFitGroup,
  useTitleLayout,
} from '../../engine';
import type { Rect, SceneProps } from '../../engine';
import { pad2, requireList } from './common';

type Step = { label: string; detail?: string };
export type FlowStepsProps = { title?: string; steps: Step[]; at?: string[]; direction?: 'auto' | 'row' | 'column' | 'grid' };

const Body: React.FC<{ props: FlowStepsProps; frames: number[] }> = ({ props, frames }) => {
  const { frame, theme, unit } = useSlide();
  const steps = props.steps;
  const n = steps.length;
  const t = useTitleLayout(props.title);
  const body = t.body;
  const g = frame.gutter;
  const pad = cardPadding(theme, unit);
  const badge = Math.round(theme.type.h3 * unit * 1.05);
  const arrowRow = 64 * unit;
  const arrowCol = 48 * unit;
  const rowBoxW = (body.w - (n - 1) * arrowRow) / n;
  const colBoxH = (body.h - (n - 1) * arrowCol) / n;
  const hasDetail0 = steps.some((s) => s.detail);
  // 竖排每个框至少要放下：一行最小字号的标签（+ 一行最小字号的说明）
  const minLabel = theme.type.body * unit * 0.75 * theme.type.headingLineHeight;
  const minDetail = theme.type.small * unit * 0.8 * theme.type.lineHeight;
  const colNeed = 2 * pad + Math.max(badge, minLabel + (hasDetail0 ? g * 0.5 + minDetail : 0));
  let dir = props.direction && props.direction !== 'auto' ? props.direction : null;
  if (!dir) {
    if (frame.aspect !== 'portrait' && rowBoxW >= 250 * unit && n <= 5) {
      dir = 'row';
    } else if (colBoxH >= colNeed) {
      dir = 'column';
    } else {
      dir = 'grid';
    }
  }
  const cols = dir === 'grid' ? Math.min(n, frame.aspect === 'landscape' ? 4 : 2) : 1;
  const grid = dir === 'grid' ? gridLayout(body, n, cols, g).cells : [];
  // 文字区宽高：行排时文字在序号下方；列排时文字在序号右侧
  const textW = dir === 'row' ? rowBoxW - 2 * pad : dir === 'column' ? body.w - 2 * pad - badge - g : (grid[0]?.w ?? 0) - 2 * pad;
  const textH = dir === 'row' ? body.h - 2 * pad - badge - g : dir === 'column' ? colBoxH - 2 * pad : (grid[0]?.h ?? 0) - 2 * pad - badge - g;
  const hasDetail = steps.some((s) => s.detail);
  const hs = headingStyle(theme);
  const bs = bodyStyle(theme);
  const labels = useTextFitGroup(
    steps.map((s) => ({ text: s.label, width: textW, height: hasDetail ? textH * 0.4 : textH, maxLines: dir === 'column' ? 2 : 3 })),
    { style: hs, max: theme.type.h3 * unit, min: theme.type.body * unit * 0.75 },
  );
  const labelH = Math.max(...labels.map((f) => f.height));
  const details = useTextFitGroup(
    steps.map((s) => ({ text: s.detail ?? '', width: textW, height: Math.max(1, textH - labelH - g * 0.5), maxLines: 6 })),
    { style: bs, max: theme.type.body * unit * 0.95, min: theme.type.small * unit * 0.8 },
  );
  const detailH = hasDetail ? Math.max(...details.map((f) => f.height)) : 0;
  const stackH = labelH + (hasDetail ? g * 0.5 + detailH : 0);
  // 竖排：序号与标签首行垂直居中对齐
  const lh = labels[0]?.lineHeightPx ?? 0;
  const sideBadgeY = Math.max(0, (lh - badge) / 2);
  const sideTextY = Math.max(0, (badge - lh) / 2);
  const sideInner = Math.max(sideBadgeY + badge, sideTextY + stackH);
  const progress = useRevealProgress(frames);
  const current = useCurrentIndex(frames);
  const [pt] = useRevealProgress([0]);

  // 每个步骤框的矩形（按内容收紧后在区域内居中）
  let rects: Rect[];
  let arrows: Array<{ rect: Rect; dir: 'right' | 'down' }> = [];
  if (dir === 'row') {
    const h = Math.min(body.h, 2 * pad + badge + g + stackH);
    const y = body.y + (body.h - h) * 0.4;
    rects = steps.map((_, i) => ({ x: body.x + i * (rowBoxW + arrowRow), y, w: rowBoxW, h }));
    arrows = rects.slice(1).map((r) => ({ rect: { x: r.x - arrowRow, y: r.y, w: arrowRow, h: r.h }, dir: 'right' as const }));
  } else if (dir === 'column') {
    const h = Math.min(colBoxH, 2 * pad + sideInner);
    const total = n * h + (n - 1) * arrowCol;
    const y0 = body.y + (body.h - total) * 0.4;
    rects = steps.map((_, i) => ({ x: body.x, y: y0 + i * (h + arrowCol), w: body.w, h }));
    arrows = rects.slice(1).map((r) => ({ rect: { x: r.x + pad, y: r.y - arrowCol, w: badge, h: arrowCol }, dir: 'down' as const }));
  } else {
    const cell = grid[0];
    const h = Math.min(cell.h, 2 * pad + badge + g + stackH);
    const rows = Math.ceil(n / cols);
    const total = rows * h + (rows - 1) * g;
    rects = gridLayout({ x: body.x, y: body.y + (body.h - total) * 0.4, w: body.w, h: total }, n, cols, g).cells;
  }
  return (
    <>
      <SceneTitle layout={t} text={props.title} reveal={pt} />
      {arrows.map((a, i) => (
        // 箭头和它指向的步骤一起出现
        <Arrow key={i} rect={a.rect} dir={a.dir} color={theme.colors.accent} opacity={progress[i + 1]} />
      ))}
      {steps.map((s, i) => {
        const r = rects[i];
        const on = i === current;
        const side = dir === 'column';
        const tx = side ? badge + g : 0;
        const ty = side ? sideTextY : badge + g;
        return (
          <Card key={i} rect={r} name={`step-${i + 1}`} reveal={progress[i]} motion="pop" padding={pad} accent={on ? theme.colors.accent : undefined}>
            <NumberBadge rect={{ x: 0, y: side ? sideBadgeY : 0, w: badge, h: badge }} text={pad2(i + 1)} active={on || current < 0} muted={!on && current > i} />
            <TextBlock fit={labels[i]} text={s.label} style={hs} rect={{ x: tx, y: ty, w: textW, h: labels[i].height }} color={theme.colors.text} />
            {s.detail ? (
              <TextBlock fit={details[i]} text={s.detail} style={bs} rect={{ x: tx, y: ty + labelH + g * 0.5, w: textW, h: details[i].height }} color={theme.colors.textMuted} />
            ) : null}
          </Card>
        );
      })}
    </>
  );
};

/**
 * 流程：步骤框依次弹出并用箭头相连，当前步骤描边高亮。
 * direction 缺省 auto：横屏步骤不多时横排，竖屏或步骤多时竖排，竖排也放不下时排成带序号的网格。
 */
export const FlowSteps: React.FC<SceneProps<FlowStepsProps>> = ({ props }) => {
  const steps = requireList<Step>(props.steps, 'steps', 'FlowSteps');
  const frames = useRevealFrames(steps.length, props.at);
  return (
    <Slide>
      <Body props={{ ...props, steps }} frames={frames} />
    </Slide>
  );
};
