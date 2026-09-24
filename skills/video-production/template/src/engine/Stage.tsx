// 场景底板：铺满画面的主题背景 + 避开平台安全区的内容区。所有场景都应该包在 Stage 里，
// 这样背景永远不透明（转场时新画面盖住旧画面，不会透出黑底闪一下），内容也不会被平台界面挡住。
import React from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { settings } from './data';
import { withAlpha } from './motion';
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

/** 烧录字幕在画面底部占掉的高度（安全区之上），内容区要让开，免得被字幕挡住 */
export const useCaptionReserve = (): number => {
  const { height } = useVideoConfig();
  const c = settings.captions;
  if (!c.burn) {
    return 0;
  }
  const s = c.style;
  return (s.bottomPct / 100) * height + s.fontSize * s.lineHeight * c.maxLines + s.fontSize * 0.5;
};

/** Stage 内容区的实际像素尺寸（扣掉安全区、内边距、字幕占位），给需要算布局的组件用 */
export const useContentBox = (padding = 80): { width: number; height: number } => {
  const { width, height } = useVideoConfig();
  const unit = useUnit();
  const inset = useSafeInsets();
  const reserve = useCaptionReserve();
  const p = padding * unit;
  return {
    width: Math.max(1, width - inset.left - inset.right - 2 * p),
    height: Math.max(1, height - inset.top - inset.bottom - p - Math.max(p, reserve)),
  };
};

export const Background: React.FC = () => {
  const theme = useTheme();
  const unit = useUnit();
  const bg = theme.background;
  const [c0, c1] = [bg.colors[0] ?? theme.colors.bg, bg.colors[1] ?? theme.colors.surface];
  let image: string | undefined;
  if (bg.type === 'gradient') {
    image = `radial-gradient(ellipse at 20% 0%, ${c1} 0%, ${c0} 60%)`;
  } else if (bg.type === 'grid') {
    const s = Math.round(60 * unit);
    const line = withAlpha(c1, bg.opacity ?? 0.35);
    image = `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`;
    return <AbsoluteFill style={{ backgroundColor: c0, backgroundImage: image, backgroundSize: `${s}px ${s}px` }} />;
  } else if (bg.type === 'dots') {
    const s = Math.round(40 * unit);
    const dot = withAlpha(c1, bg.opacity ?? 0.5);
    image = `radial-gradient(${dot} ${Math.max(1, 1.6 * unit)}px, transparent ${Math.max(1, 1.6 * unit) + 0.5}px)`;
    return <AbsoluteFill style={{ backgroundColor: c0, backgroundImage: image, backgroundSize: `${s}px ${s}px` }} />;
  }
  return <AbsoluteFill style={{ backgroundColor: c0, backgroundImage: image }} />;
};

type StageProps = {
  children: React.ReactNode;
  /** 内容区内边距（在安全区之外再留的边），以短边 1080 为基准的像素 */
  padding?: number;
  /** 不画主题背景（例如全屏图片/视频之上叠加内容时） */
  transparent?: boolean;
  style?: React.CSSProperties;
};

export const Stage: React.FC<StageProps> = ({ children, padding = 80, transparent = false, style }) => {
  const theme = useTheme();
  const unit = useUnit();
  const inset = useSafeInsets();
  const reserve = useCaptionReserve();
  const p = padding * unit;
  return (
    <AbsoluteFill>
      {transparent ? null : <Background />}
      <AbsoluteFill
        style={{
          paddingTop: inset.top + p,
          paddingBottom: inset.bottom + Math.max(p, reserve),
          paddingLeft: inset.left + p,
          paddingRight: inset.right + p,
          color: theme.colors.text,
          fontFamily: fontStack(theme.fonts.body),
          fontSize: theme.type.body * unit,
          display: 'flex',
          flexDirection: 'column',
          ...style,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
