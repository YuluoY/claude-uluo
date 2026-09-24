// 场景组件模板：props 来自 storyboard 的 source.props；时刻全部从镜头上下文取。
import React from 'react';
import { fadeUp, fontStack, Stage, useProgressFrom, useRevealFrames, useTheme, useUnit } from '../../engine';
import type { SceneProps } from '../../engine';

export type YourSceneProps = { title: string; items?: string[]; at?: string[] };

export const YourScene: React.FC<SceneProps<YourSceneProps>> = ({ props }) => {
  const theme = useTheme();
  const unit = useUnit();
  const items = props.items ?? [];
  const frames = useRevealFrames(items.length, props.at);
  const titleP = useProgressFrom(0);
  return (
    <Stage>
      <div style={{ fontFamily: fontStack(theme.fonts.heading), fontSize: theme.type.h2 * unit, fontWeight: 700, ...fadeUp(titleP, 24 * unit) }}>{props.title}</div>
      {items.map((text, i) => (
        <Item key={i} text={text} start={frames[i]} />
      ))}
    </Stage>
  );
};

const Item: React.FC<{ text: string; start: number }> = ({ text, start }) => {
  const theme = useTheme();
  const unit = useUnit();
  const p = useProgressFrom(start);
  return <div style={{ marginTop: 20 * unit, fontSize: theme.type.body * unit, ...fadeUp(p, 16 * unit) }}>{text}</div>;
};
