// Stage：给“按流式布局写”的场景用的底板。它就是 Slide + 一个铺满内容区的槽位（flex 纵向），
// 内容区已经避开了平台安全区、页眉和字幕带；内容超出槽位时版面检测会报错。
// 新场景优先用 Slide + Box/Card + 版面几何（见 references/design.md），位置和字号都能算准。
import React from 'react';
import { useVideoConfig } from 'remotion';
import { settings } from './data';
import { captionBand, useFrameLayout } from './layout';
import { Box, Slide, withoutHeader } from './slide';
import { fontStack, useTheme, useUnit } from './theme';

export const useSafeInsets = () => {
  const { width, height } = useVideoConfig();
  const sa = settings.video.safeArea;
  return {
    top: (sa.top / 100) * height,
    bottom: (sa.bottom / 100) * height,
    left: (sa.left / 100) * width,
    right: (sa.right / 100) * width,
  };
};

/** 烧录字幕在画面底部占掉的高度（从画面底边算起） */
export const useCaptionReserve = (): number => {
  const { width, height } = useVideoConfig();
  const band = captionBand(width, height, settings);
  return band ? height - band.y : 0;
};

/** 内容区的像素尺寸（已扣掉安全区、页边距、页眉、字幕带） */
export const useContentBox = (chrome = true): { width: number; height: number } => {
  const theme = useTheme();
  const f = useFrameLayout(theme);
  const c = (chrome ? f : withoutHeader(f)).content;
  return { width: c.w, height: c.h };
};

type StageProps = {
  children: React.ReactNode;
  /** 显示页眉 */
  chrome?: boolean;
  /** 不画主题背景 */
  transparent?: boolean;
  style?: React.CSSProperties;
};

export const Stage: React.FC<StageProps> = ({ children, chrome = true, transparent = false, style }) => {
  const theme = useTheme();
  const unit = useUnit();
  const f = useFrameLayout(theme);
  const content = (chrome ? f : withoutHeader(f)).content;
  return (
    <Slide chrome={chrome} transparent={transparent}>
      <Box
        rect={content}
        name="content"
        style={{ display: 'flex', flexDirection: 'column', color: theme.colors.text, fontFamily: fontStack(theme.fonts.body), fontSize: theme.type.body * unit, ...style }}
      >
        {children}
      </Box>
    </Slide>
  );
};
