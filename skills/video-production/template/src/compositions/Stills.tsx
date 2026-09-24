// 抽帧合成：第 i 帧显示整片第 frames[i] 帧，一次打包渲出每个镜头的静帧。
// 合成时长与整片相同（Freeze 的目标帧不能超出合成时长），vp.py 只渲染前 frames.length 帧。
// 给了 ids 时同时做版面检测：每帧的结果写到 out/Stills/layout/<ids[i]>.json。
import React from 'react';
import { AbsoluteFill, Freeze, useCurrentFrame } from 'remotion';
import { LayoutProbe } from '../engine/audit';
import { getTheme } from '../engine/data';
import { FontGate } from '../engine/fonts';
import { ThemeProvider } from '../engine/theme';
import { MainContent } from './Main';

export type StillsProps = { frames: number[]; style?: string; ids?: string[] };

export const Stills: React.FC<StillsProps> = ({ frames, style, ids }) => {
  const i = useCurrentFrame();
  const k = Math.min(i, frames.length - 1);
  const target = frames[k] ?? 0;
  const theme = getTheme(style);
  const body = (
    <Freeze frame={target}>
      <MainContent muted />
    </Freeze>
  );
  return (
    <ThemeProvider theme={theme}>
      <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
        <FontGate>
          {ids && ids[k] ? (
            <LayoutProbe key={`${k}-${target}`} id={ids[k]} frameNo={target}>
              {body}
            </LayoutProbe>
          ) : (
            body
          )}
        </FontGate>
      </AbsoluteFill>
    </ThemeProvider>
  );
};
