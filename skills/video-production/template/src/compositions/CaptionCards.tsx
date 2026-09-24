// footage 模式：第 i 帧是第 i 个字幕块的透明图。vp.py 把这些 PNG 按字幕时间叠到源视频上，
// 所以字幕样式和 produce 模式完全一致，也不需要 ffmpeg 带 libass。
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { CaptionLayer } from '../engine/Captions';
import { captions, getTheme, settings } from '../engine/data';
import { FontGate } from '../engine/fonts';
import { ThemeProvider } from '../engine/theme';

export const CaptionCards: React.FC = () => {
  const i = useCurrentFrame();
  const block = captions.blocks[i] ?? null;
  const scale = settings.footage?.scale ?? 1;
  return (
    <ThemeProvider theme={getTheme()}>
      <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
        <FontGate>
          <CaptionLayer block={block} style={settings.captions.style} scale={scale} />
        </FontGate>
      </AbsoluteFill>
    </ThemeProvider>
  );
};
