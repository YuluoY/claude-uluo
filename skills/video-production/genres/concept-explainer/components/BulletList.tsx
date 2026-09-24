import React from 'react';
import { fadeUp, Stage, useProgressFrom, useRevealFrames, useTheme, useUnit, withAlpha } from '../../engine';
import type { SceneProps } from '../../engine';
import { SceneTitle, useRevealedIndex } from './common';

export type BulletListProps = { title?: string; items: string[]; at?: string[]; numbered?: boolean };

const Item: React.FC<{ text: string; index: number; start: number; current: boolean; numbered: boolean }> = ({ text, index, start, current, numbered }) => {
  const theme = useTheme();
  const unit = useUnit();
  const p = useProgressFrom(start);
  return (
    <div
      style={{
        display: 'flex',
        gap: 24 * unit,
        alignItems: 'baseline',
        padding: `${18 * unit}px ${24 * unit}px`,
        borderRadius: theme.radius * unit,
        backgroundColor: current ? withAlpha(theme.colors.accent, 0.12) : 'transparent',
        opacity: p * (current ? 1 : 0.72),
        transform: fadeUp(p, 24 * unit).transform,
      }}
    >
      <span style={{ color: theme.colors.accent, fontWeight: 700, minWidth: 40 * unit }}>{numbered ? `${index + 1}.` : '●'}</span>
      <span style={{ fontSize: theme.type.h3 * unit, lineHeight: 1.35 }}>{text}</span>
    </div>
  );
};

/** 要点列表：随口播逐条出现，当前条目高亮。第 k 条在 at[k] 提示点或第 k 句开始时出现 */
export const BulletList: React.FC<SceneProps<BulletListProps>> = ({ props }) => {
  const frames = useRevealFrames(props.items.length, props.at);
  const current = useRevealedIndex(frames);
  const unit = useUnit();
  return (
    <Stage>
      <SceneTitle text={props.title} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 * unit }}>
        {props.items.map((text, i) => (
          <Item key={i} text={text} index={i} start={frames[i]} current={i === current} numbered={Boolean(props.numbered)} />
        ))}
      </div>
    </Stage>
  );
};
