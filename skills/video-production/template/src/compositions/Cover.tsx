// 封面：生图模型给的无字背景图 + 标题文字（中文标题交给排版，不交给生图模型）。
// 没有背景图时用风格的背景与装饰。标题自动字号，放进画面下方 45% 的区域。
import React from 'react';
import { AbsoluteFill, Img, staticFile, useVideoConfig } from 'remotion';
import { getTheme } from '../engine/data';
import { FontGate } from '../engine/fonts';
import { aspectOf, MARGINS, type Rect } from '../engine/layout';
import { withAlpha } from '../engine/motion';
import { Background, bodyStyle, headingStyle } from '../engine/slide';
import { TextBlock, useTextFit } from '../engine/text';
import { ThemeProvider } from '../engine/theme';
import type { Theme } from '../engine/types';

export type CoverProps = { background: string; title: string; subtitle: string };

const CoverBody: React.FC<CoverProps & { theme: Theme }> = ({ background, title, subtitle, theme }) => {
  const { width, height } = useVideoConfig();
  const unit = Math.min(width, height) / 1080;
  const m = MARGINS[aspectOf(width, height)];
  const area: Rect = { x: m.x * width, y: height * 0.5, w: width * (1 - 2 * m.x), h: height * (0.5 - m.y) };
  const titleFit = useTextFit({
    text: title,
    width: area.w,
    height: area.h * (subtitle ? 0.72 : 1),
    style: headingStyle(theme),
    max: theme.type.display * unit * 1.2,
    min: theme.type.h2 * unit,
    maxLines: 3,
    balance: true,
  });
  const subFit = useTextFit({ text: subtitle, width: area.w, height: area.h * 0.25, style: bodyStyle(theme, 500), max: theme.type.h3 * unit, min: theme.type.body * unit * 0.8, maxLines: 2 });
  const gap = 24 * unit;
  const total = titleFit.height + (subtitle ? gap + subFit.height : 0);
  const top = area.y + area.h - total;
  return (
    <AbsoluteFill>
      {background ? <Img src={staticFile(background)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Background theme={theme} />}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${withAlpha(theme.colors.bg, 0)} 30%, ${withAlpha(theme.colors.bg, 0.9)} 100%)` }} />
      <div style={{ position: 'absolute', left: area.x, top: top - 26 * unit, width: 96 * unit, height: 10 * unit, backgroundColor: theme.colors.accent }} />
      <TextBlock fit={titleFit} text={title} style={headingStyle(theme)} rect={{ x: area.x, y: top, w: area.w, h: titleFit.height }} color={theme.colors.text} name="cover-title" />
      {subtitle ? (
        <TextBlock fit={subFit} text={subtitle} style={bodyStyle(theme, 500)} rect={{ x: area.x, y: top + titleFit.height + gap, w: area.w, h: subFit.height }} color={theme.colors.accent} name="cover-subtitle" />
      ) : null}
    </AbsoluteFill>
  );
};

export const Cover: React.FC<CoverProps> = (props) => {
  const theme = getTheme();
  return (
    <ThemeProvider theme={theme}>
      <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
        <FontGate>
          <CoverBody {...props} theme={theme} />
        </FontGate>
      </AbsoluteFill>
    </ThemeProvider>
  );
};
