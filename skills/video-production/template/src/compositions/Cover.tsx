// 封面：生图模型给的无字背景图 + 标题文字（中文标题交给排版，不交给生图模型）。
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { getTheme } from '../engine/data';
import { withAlpha } from '../engine/motion';
import { fontStack, ThemeProvider, useUnit } from '../engine/theme';

export type CoverProps = { background: string; title: string; subtitle: string };

const CoverBody: React.FC<CoverProps> = ({ background, title, subtitle }) => {
  const theme = getTheme();
  const unit = useUnit();
  return (
    <AbsoluteFill style={{ backgroundColor: theme.colors.bg }}>
      {background ? <Img src={staticFile(background)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
      <AbsoluteFill
        style={{ background: `linear-gradient(180deg, ${withAlpha(theme.colors.bg, 0)} 35%, ${withAlpha(theme.colors.bg, 0.88)} 100%)` }}
      />
      <AbsoluteFill style={{ justifyContent: 'flex-end', padding: 96 * unit }}>
        <div
          style={{
            fontFamily: fontStack(theme.fonts.heading),
            fontSize: theme.type.display * unit,
            fontWeight: 800,
            lineHeight: 1.15,
            color: theme.colors.text,
            textShadow: `0 ${4 * unit}px ${24 * unit}px ${withAlpha('#000000', 0.45)}`,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div style={{ marginTop: 24 * unit, fontFamily: fontStack(theme.fonts.body), fontSize: theme.type.h3 * unit, color: theme.colors.accent }}>
            {subtitle}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Cover: React.FC<CoverProps> = (props) => (
  <ThemeProvider theme={getTheme()}>
    <CoverBody {...props} />
  </ThemeProvider>
);
