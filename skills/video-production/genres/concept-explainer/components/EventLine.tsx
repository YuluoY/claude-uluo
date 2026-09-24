import React from 'react';
import {
  Box,
  bodyStyle,
  monoStyle,
  SceneTitle,
  Slide,
  TextBlock,
  useCurrentIndex,
  useRevealFrames,
  useRevealProgress,
  useSlide,
  useTextFitGroup,
  useTitleLayout,
  withAlpha,
} from '../../engine';
import type { SceneProps, TextStyle } from '../../engine';
import { requireList } from './common';

type Event = { date: string; label: string };
export type EventLineProps = { title?: string; events: Event[]; at?: string[]; direction?: 'auto' | 'row' | 'column' };

const Body: React.FC<{ props: EventLineProps; events: Event[]; frames: number[] }> = ({ props, events, frames }) => {
  const { frame, theme, unit } = useSlide();
  const t = useTitleLayout(props.title);
  const body = t.body;
  const g = frame.gutter;
  const n = events.length;
  const colW = body.w / n;
  const auto = frame.aspect !== 'portrait' && colW >= 210 * unit ? 'row' : 'column';
  const dir = props.direction && props.direction !== 'auto' ? props.direction : auto;
  const dot = Math.round(22 * unit);
  const ds: TextStyle = { ...monoStyle(theme), weight: 700 };
  const bs = bodyStyle(theme);
  const indent = dot + g;
  const textW = dir === 'row' ? colW - g : body.w - indent;
  const rowMax = dir === 'row' ? body.h * 0.6 : (body.h - g * 0.8 * (n - 1)) / n;
  const dates = useTextFitGroup(
    events.map((e) => ({ text: e.date, width: textW, height: theme.type.h3 * unit * 1.6, maxLines: 1 })),
    { style: ds, max: theme.type.body * unit, min: theme.type.small * unit * 0.8 },
  );
  const dateH = Math.max(...dates.map((f) => f.height));
  const labels = useTextFitGroup(
    events.map((e) => ({ text: e.label, width: textW, height: Math.max(1, dir === 'row' ? rowMax - dateH - dot - 2 * g : rowMax - dateH - g * 0.3), maxLines: dir === 'row' ? 5 : 3 })),
    { style: bs, max: theme.type.body * unit, min: theme.type.small * unit * 0.8 },
  );
  const progress = useRevealProgress(frames);
  const current = useCurrentIndex(frames);
  const [pt] = useRevealProgress([0]);
  const dotColor = (i: number) => (i === current ? theme.colors.accent : withAlpha(theme.colors.accent, 0.45));

  if (dir === 'row') {
    // 横排：日期在轴上方，圆点在轴上，事件在轴下方；每个事件居中对齐自己的一栏
    const labelH = Math.max(...labels.map((f) => f.height));
    const blockH = dateH + g * 0.6 + dot + g * 0.6 + labelH;
    const y0 = body.y + (body.h - blockH) * 0.42;
    const axisY = y0 + dateH + g * 0.6 + dot / 2;
    const cx = (i: number) => body.x + colW * (i + 0.5);
    const shown = Math.max(0, current);
    return (
      <>
        <SceneTitle layout={t} text={props.title} reveal={pt} />
        <div data-vp-ignore="1" style={{ position: 'absolute', left: cx(0), top: axisY - unit, width: cx(n - 1) - cx(0), height: Math.max(1, 2 * unit), backgroundColor: withAlpha(theme.colors.text, 0.18) }} />
        <div
          data-vp-ignore="1"
          style={{ position: 'absolute', left: cx(0), top: axisY - 1.5 * unit, width: (cx(shown) - cx(0)) * (current >= 0 ? 1 : 0), height: Math.max(2, 3 * unit), backgroundColor: theme.colors.accent }}
        />
        {events.map((e, i) => {
          const r = { x: cx(i) - textW / 2, y: y0, w: textW, h: blockH };
          return (
            <Box key={i} rect={r} name={`event-${i + 1}`} reveal={progress[i]}>
              <TextBlock fit={dates[i]} text={e.date} style={ds} rect={{ x: 0, y: dateH - dates[i].height, w: textW, h: dates[i].height }} align="center" color={theme.colors.accent} />
              <div style={{ position: 'absolute', left: (textW - dot) / 2, top: dateH + g * 0.6, width: dot, height: dot, borderRadius: '50%', backgroundColor: dotColor(i), boxShadow: i === current ? `0 0 0 ${6 * unit}px ${withAlpha(theme.colors.accent, 0.2)}` : undefined }} />
              <TextBlock fit={labels[i]} text={e.label} style={bs} rect={{ x: 0, y: dateH + g * 1.2 + dot, w: textW, h: labels[i].height }} align="center" color={theme.colors.text} />
            </Box>
          );
        })}
      </>
    );
  }
  // 竖排：轴在左侧，每个事件一行（日期 + 说明）
  const rowH = events.map((_, i) => dateH + g * 0.3 + labels[i].height);
  const gap = g * 0.8;
  const total = rowH.reduce((a, b) => a + b, 0) + gap * (n - 1);
  const y0 = body.y + Math.max(0, (body.h - total) * 0.42);
  const tops: number[] = [];
  let y = y0;
  rowH.forEach((h) => {
    tops.push(y);
    y += h + gap;
  });
  const axisX = body.x + dot / 2;
  const dotY = (i: number) => tops[i] + (dates[i].lineHeightPx - dot) / 2;
  return (
    <>
      <SceneTitle layout={t} text={props.title} reveal={pt} />
      <div data-vp-ignore="1" style={{ position: 'absolute', left: axisX - unit, top: dotY(0) + dot / 2, width: Math.max(1, 2 * unit), height: dotY(n - 1) - dotY(0), backgroundColor: withAlpha(theme.colors.text, 0.18) }} />
      {events.map((e, i) => (
        <React.Fragment key={i}>
          <div data-vp-ignore="1" style={{ position: 'absolute', left: body.x, top: dotY(i), width: dot, height: dot, borderRadius: '50%', backgroundColor: dotColor(i), opacity: progress[i] }} />
          <Box rect={{ x: body.x + indent, y: tops[i], w: textW, h: rowH[i] }} name={`event-${i + 1}`} reveal={progress[i]} motion="left">
            <TextBlock fit={dates[i]} text={e.date} style={ds} rect={{ x: 0, y: 0, w: textW, h: dates[i].height }} color={theme.colors.accent} />
            <TextBlock fit={labels[i]} text={e.label} style={bs} rect={{ x: 0, y: dateH + g * 0.3, w: textW, h: labels[i].height }} color={theme.colors.text} />
          </Box>
        </React.Fragment>
      ))}
    </>
  );
};

/** 时间线：事件依次出现（横屏横排、竖屏竖排），当前事件的圆点高亮，进度线跟着推进 */
export const EventLine: React.FC<SceneProps<EventLineProps>> = ({ props }) => {
  const events = requireList<Event>(props.events, 'events', 'EventLine');
  const frames = useRevealFrames(events.length, props.at);
  return (
    <Slide>
      <Body props={props} events={events} frames={frames} />
    </Slide>
  );
};
