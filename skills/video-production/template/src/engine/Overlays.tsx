// 全片叠加层：水印、进度条（可按章节分段）。
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { settings, timeline } from './data';
import { withAlpha } from './motion';
import { useSafeInsets } from './Stage';
import { fontStack, useTheme, useUnit } from './theme';

const Watermark: React.FC = () => {
  const wm = settings.overlays.watermark;
  const inset = useSafeInsets();
  const unit = useUnit();
  const theme = useTheme();
  const margin = 36 * unit;
  const pos: React.CSSProperties = {};
  if (wm.position.startsWith('top')) {
    pos.top = inset.top + margin;
  } else {
    pos.bottom = inset.bottom + margin;
  }
  if (wm.position.endsWith('left')) {
    pos.left = inset.left + margin;
  } else {
    pos.right = inset.right + margin;
  }
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', ...pos, opacity: wm.opacity }}>
        {wm.image ? (
          <Img src={staticFile(wm.image)} style={{ height: wm.size, width: 'auto' }} />
        ) : (
          <span style={{ fontFamily: fontStack(theme.fonts.body), fontSize: wm.size, color: theme.colors.text, fontWeight: 600 }}>
            {wm.text}
          </span>
        )}
      </div>
    </AbsoluteFill>
  );
};

const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, width } = useVideoConfig();
  const pb = settings.overlays.progressBar;
  const theme = useTheme();
  const unit = useUnit();
  const inset = useSafeInsets();
  const h = pb.height * unit;
  const chapters = pb.showChapters ? timeline.chapters : [];
  const gap = chapters.length > 1 ? 4 * unit : 0;
  const segments = chapters.length > 1
    ? chapters.map((c) => ({ start: c.startFrame, end: c.endFrame, title: c.title }))
    : [{ start: 0, end: durationInFrames, title: '' }];
  const current = segments.find((s) => frame >= s.start && frame < s.end);
  const edge: React.CSSProperties = pb.position === 'top' ? { top: inset.top } : { bottom: inset.bottom };
  const labelOffset = h + 14 * unit;
  const labelEdge: React.CSSProperties =
    pb.position === 'top' ? { top: inset.top + labelOffset } : { bottom: inset.bottom + labelOffset };
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', left: inset.left, right: inset.right, height: h, display: 'flex', gap, ...edge }}>
        {segments.map((s, i) => {
          const p = Math.min(1, Math.max(0, (frame - s.start) / Math.max(1, s.end - s.start)));
          return (
            <div key={i} style={{ flex: s.end - s.start, backgroundColor: withAlpha(theme.colors.textMuted, 0.25), height: '100%' }}>
              <div style={{ width: `${p * 100}%`, height: '100%', backgroundColor: theme.colors.accent }} />
            </div>
          );
        })}
      </div>
      {current?.title ? (
        <div
          style={{
            position: 'absolute',
            left: inset.left + 24 * unit,
            ...labelEdge,
            fontFamily: fontStack(theme.fonts.body),
            fontSize: theme.type.small * unit,
            color: theme.colors.textMuted,
            maxWidth: width * 0.5,
          }}
        >
          {current.title}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const Overlays: React.FC = () => (
  <>
    {settings.overlays.progressBar.enabled ? <ProgressBar /> : null}
    {settings.overlays.watermark.enabled ? <Watermark /> : null}
  </>
);
