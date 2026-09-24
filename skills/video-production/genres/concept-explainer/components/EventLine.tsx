import React from 'react';
import { useVideoConfig } from 'remotion';
import { fadeUp, fontStack, Stage, useProgressFrom, useRevealFrames, useTheme, useUnit } from '../../engine';
import type { SceneProps } from '../../engine';
import { SceneTitle, useRevealedIndex } from './common';

export type EventLineProps = { title?: string; events: Array<{ date: string; label: string }>; at?: string[] };

const Event: React.FC<{ date: string; label: string; start: number; active: boolean; vertical: boolean }> = ({ date, label, start, active, vertical }) => {
  const theme = useTheme();
  const unit = useUnit();
  const p = useProgressFrom(start);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: vertical ? 'row' : 'column', alignItems: vertical ? 'center' : 'flex-start', gap: 16 * unit, ...fadeUp(p, 20 * unit) }}>
      <div style={{ width: 22 * unit, height: 22 * unit, borderRadius: '50%', backgroundColor: active ? theme.colors.accent : theme.colors.border, flex: 'none' }} />
      <div>
        <div style={{ fontFamily: fontStack(theme.fonts.mono), fontSize: theme.type.small * unit, color: theme.colors.accent }}>{date}</div>
        <div style={{ fontSize: theme.type.body * unit, lineHeight: 1.35 }}>{label}</div>
      </div>
    </div>
  );
};

/** 时间线：事件依次出现（横屏横排，竖屏竖排），当前事件高亮 */
export const EventLine: React.FC<SceneProps<EventLineProps>> = ({ props }) => {
  const theme = useTheme();
  const unit = useUnit();
  const { width, height } = useVideoConfig();
  const vertical = width < height;
  const frames = useRevealFrames(props.events.length, props.at);
  const current = useRevealedIndex(frames);
  return (
    <Stage style={{ justifyContent: 'center' }}>
      <SceneTitle text={props.title} />
      <div style={{ position: 'relative', display: 'flex', flexDirection: vertical ? 'column' : 'row', gap: 24 * unit }}>
        <div
          style={{
            position: 'absolute',
            backgroundColor: theme.colors.border,
            ...(vertical ? { left: 10 * unit, top: 0, bottom: 0, width: 2 * unit } : { top: 10 * unit, left: 0, right: 0, height: 2 * unit }),
          }}
        />
        {props.events.map((e, i) => (
          <Event key={i} date={e.date} label={e.label} start={frames[i]} active={i === current} vertical={vertical} />
        ))}
      </div>
    </Stage>
  );
};
