import React from 'react';
import { useVideoConfig } from 'remotion';
import { popIn, Stage, useProgressFrom, useRevealFrames, useTheme, useUnit, withAlpha } from '../../engine';
import type { SceneProps } from '../../engine';
import { SceneTitle, useRevealedIndex } from './common';

export type FlowStepsProps = { title?: string; steps: Array<{ label: string; detail?: string }>; at?: string[]; direction?: 'auto' | 'row' | 'column' };

const Box: React.FC<{ label: string; detail?: string; start: number; active: boolean }> = ({ label, detail, start, active }) => {
  const theme = useTheme();
  const unit = useUnit();
  const p = useProgressFrom(start);
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: 28 * unit,
        borderRadius: theme.radius * unit,
        backgroundColor: active ? withAlpha(theme.colors.accent, 0.16) : theme.colors.surface,
        border: `${3 * unit}px solid ${active ? theme.colors.accent : theme.colors.border}`,
        ...popIn(p),
      }}
    >
      <div style={{ fontSize: theme.type.h3 * unit, fontWeight: 700 }}>{label}</div>
      {detail ? <div style={{ marginTop: 10 * unit, fontSize: theme.type.small * unit, color: theme.colors.textMuted, lineHeight: 1.4 }}>{detail}</div> : null}
    </div>
  );
};

/** 流程：步骤框依次出现并用箭头相连，当前步骤高亮。竖屏自动改成上下排列 */
export const FlowSteps: React.FC<SceneProps<FlowStepsProps>> = ({ props }) => {
  const theme = useTheme();
  const unit = useUnit();
  const { width, height } = useVideoConfig();
  const frames = useRevealFrames(props.steps.length, props.at);
  const current = useRevealedIndex(frames);
  const dir = props.direction && props.direction !== 'auto' ? props.direction : width >= height ? 'row' : 'column';
  const arrow = dir === 'row' ? '→' : '↓';
  return (
    <Stage style={{ justifyContent: 'center' }}>
      <SceneTitle text={props.title} />
      <div style={{ display: 'flex', flexDirection: dir, alignItems: 'stretch', gap: 16 * unit }}>
        {props.steps.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 ? (
              // 箭头和它指向的步骤框一起出现，未出现的步骤不提前露出箭头
              <div style={{ alignSelf: 'center', fontSize: theme.type.h2 * unit, color: theme.colors.accent, opacity: current >= i ? 1 : 0 }}>{arrow}</div>
            ) : null}
            <Box label={s.label} detail={s.detail} start={frames[i]} active={i === current} />
          </React.Fragment>
        ))}
      </div>
    </Stage>
  );
};
