// 整片：镜头堆叠 + 叠加层 + 字幕 + 音轨。
import React from 'react';
import { AbsoluteFill, Html5Audio, staticFile } from 'remotion';
import { Captions } from '../engine/Captions';
import { captions, getTheme, settings, timeline } from '../engine/data';
import { Overlays } from '../engine/Overlays';
import { ShotStack } from '../engine/ShotStack';
import { ThemeProvider } from '../engine/theme';

export type MainProps = {
  /** 用别的风格渲染（风格对比静帧用）；缺省用 video.config.json 的 style */
  style?: string;
  muted?: boolean;
};

export const Main: React.FC<MainProps> = ({ style, muted }) => {
  const theme = getTheme(style);
  return (
    <ThemeProvider theme={theme}>
      <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
        <ShotStack shots={timeline.shots} />
        <Overlays />
        {settings.captions.burn ? <Captions blocks={captions.blocks} style={settings.captions.style} /> : null}
        {timeline.audio && !muted ? <Html5Audio src={staticFile(timeline.audio)} /> : null}
      </AbsoluteFill>
    </ThemeProvider>
  );
};
