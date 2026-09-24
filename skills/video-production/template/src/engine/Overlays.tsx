// 全片叠加层：水印、进度条。位置由版面几何算出，不碰页眉、内容区和字幕带：
// - 顶部水印放在上边距条里（安全区上沿到页眉之间），底部水印放在字幕带下方的窄条里
// - 进度条贴着安全区的上沿或下沿，按章节分段（章节名由页眉显示）
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ChapterBar } from './ChapterBar';
import { settings, timeline } from './data';
import { type FrameLayout, useFrameLayout } from './layout';
import { withAlpha } from './motion';
import { fontStack, useTheme } from './theme';

// 水印放在内容区之外的空条里：上方为“安全区上沿（或顶部章节条）→ 页眉”，下方为“字幕带 → 安全区下沿（或底部章节条）”
const watermarkBox = (f: FrameLayout, size: number, position: string): { top: number; height: number } => {
  const cbTop = f.chapterBar && f.chapterBar.y < f.inner.y ? f.chapterBar : null;
  const cbBottom = f.chapterBar && f.chapterBar.y >= f.inner.y ? f.chapterBar : null;
  if (position.startsWith('top')) {
    const from = cbTop ? cbTop.y + cbTop.h : f.safe.y;
    const strip = f.inner.y - from;
    return { top: from + Math.max(0, (strip - size) / 2), height: Math.max(0, Math.min(size, strip)) };
  }
  const stripTop = f.captions ? f.captions.y + f.captions.h : f.inner.y + f.inner.h;
  const to = cbBottom ? cbBottom.y : f.safe.y + f.safe.h;
  const strip = to - stripTop;
  return { top: stripTop + Math.max(0, (strip - size) / 2), height: Math.max(0, Math.min(size, strip)) };
};

const Watermark: React.FC = () => {
  const wm = settings.overlays.watermark;
  const theme = useTheme();
  const f = useFrameLayout(theme);
  const size = wm.size;
  const { top, height } = watermarkBox(f, size, wm.position);
  const horizontal: React.CSSProperties = wm.position.endsWith('left') ? { left: f.inner.x } : { right: f.width - (f.inner.x + f.inner.w) };
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div data-vp-box="watermark" data-vp-region="canvas" data-vp-avoid="1" style={{ position: 'absolute', top, height, ...horizontal, opacity: wm.opacity, display: 'flex', alignItems: 'center' }}>
        {wm.image ? (
          <Img src={staticFile(wm.image)} style={{ height, width: 'auto' }} />
        ) : (
          <span style={{ fontFamily: fontStack(theme.fonts.body), fontSize: height * 0.9, lineHeight: 1, color: theme.colors.text, fontWeight: 600, whiteSpace: 'nowrap' }}>{wm.text}</span>
        )}
      </div>
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const pb = settings.overlays.progressBar;
  const theme = useTheme();
  const f = useFrameLayout(theme);
  const h = pb.height * f.unit;
  const chapters = pb.showChapters ? timeline.chapters : [];
  const gap = chapters.length > 1 ? 4 * f.unit : 0;
  const segments =
    chapters.length > 1 ? chapters.map((c) => ({ start: c.startFrame, end: c.endFrame })) : [{ start: 0, end: durationInFrames }];
  const top = pb.position === 'top' ? f.safe.y : f.safe.y + f.safe.h - h;
  return (
    <AbsoluteFill data-vp-ignore="1" style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: f.safe.x, width: f.safe.w, top, height: h, display: 'flex', gap }}>
        {segments.map((s, i) => {
          const p = Math.min(1, Math.max(0, (frame - s.start) / Math.max(1, s.end - s.start)));
          return (
            <div key={i} style={{ flex: s.end - s.start, backgroundColor: withAlpha(theme.colors.textMuted, 0.25), height: '100%' }}>
              <div style={{ width: `${p * 100}%`, height: '100%', backgroundColor: theme.colors.accent }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Overlays: React.FC = () => (
  <>
    {settings.overlays.progressBar.enabled ? <ProgressBar /> : null}
    {settings.overlays.chapterBar?.enabled && settings.mode === 'produce' ? <ChapterBar /> : null}
    {settings.overlays.watermark.enabled ? <Watermark /> : null}
  </>
);
