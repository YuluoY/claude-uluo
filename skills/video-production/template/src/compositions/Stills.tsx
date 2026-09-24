// 抽帧合成：第 i 帧显示整片第 frames[i] 帧。一次打包就能渲出每个镜头的静帧，用于确认风格和画面。
// 合成时长与整片相同（Freeze 的目标帧不能超出合成时长），渲染时只取前 frames.length 帧。
import React from 'react';
import { Freeze, useCurrentFrame } from 'remotion';
import { Main } from './Main';

export type StillsProps = { frames: number[]; style?: string };

export const Stills: React.FC<StillsProps> = ({ frames, style }) => {
  const i = useCurrentFrame();
  const target = frames[Math.min(i, frames.length - 1)] ?? 0;
  return (
    <Freeze frame={target}>
      <Main style={style} muted />
    </Freeze>
  );
};
