// 章节条：一排格子，每格一个章节（storyboard 里镜头的 chapter）。当前章节高亮并显示本章播放进度，
// 播完的章节标记为完成——类似 B 站分段进度条、抖音视频顶部的分段标签。
// 位置由版面几何给出（贴安全区上沿或下沿），内容区和字幕带会自动让开。
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { settings, timeline } from './data';
import { type Rect, useFrameLayout } from './layout';
import { withAlpha } from './motion';
import { bodyStyle } from './slide';
import { textWidth } from './text';
import { useTheme } from './theme';

type Segment = { title: string; start: number; end: number };

/** 按镜头的 chapter 分段：没写 chapter 的镜头归到前一章（开头的归到第一个有名字的章） */
export const chapterSegments = (): Segment[] => {
  const shots = timeline.shots;
  const first = shots.find((s) => s.chapter)?.chapter ?? '';
  const out: Segment[] = [];
  let cur = first;
  for (const sh of shots) {
    cur = sh.chapter ?? cur;
    const last = out[out.length - 1];
    if (last && last.title === cur && last.end === sh.from) {
      last.end = sh.from + sh.durationInFrames;
    } else {
      out.push({ title: cur, start: sh.from, end: sh.from + sh.durationInFrames });
    }
  }
  if (out.length) {
    out[out.length - 1].end = Math.max(out[out.length - 1].end, timeline.durationInFrames);
  }
  return out;
};

/** 放不下就截断并加省略号 */
const ellipsize = (text: string, maxW: number, fs: number, family: string, weight: number): string => {
  const st = { family, weight, lineHeight: 1 };
  if (textWidth(text, fs, st) <= maxW) {
    return text;
  }
  const chars = Array.from(text);
  for (let n = chars.length - 1; n > 0; n--) {
    const t = chars.slice(0, n).join('') + '…';
    if (textWidth(t, fs, st) <= maxW) {
      return t;
    }
  }
  return '';
};

export const ChapterBar: React.FC = () => {
  const frame = useCurrentFrame();
  const theme = useTheme();
  const f = useFrameLayout(theme);
  const cfg = settings.overlays.chapterBar;
  const segments = useMemo(chapterSegments, []);
  if (!f.chapterBar || segments.length === 0) {
    return null;
  }
  const bar = f.chapterBar;
  const u = f.unit;
  const gap = Math.round(8 * u);
  const total = segments.reduce((a, s) => a + (s.end - s.start), 0);
  const free = bar.w - gap * (segments.length - 1);
  // 按时长分宽度时，每格至少占平均宽度的 45%，保证能写下章节名
  const minW = (free / segments.length) * 0.45;
  const raw = segments.map((s) => (cfg.widths === 'duration' ? Math.max(minW, (free * (s.end - s.start)) / total) : free / segments.length));
  const scale = free / raw.reduce((a, b) => a + b, 0);
  let x = bar.x;
  const cells: Array<Rect & Segment> = segments.map((s, i) => {
    const w = raw[i] * scale;
    const c = { ...s, x, y: bar.y, w, h: bar.h };
    x += w + gap;
    return c;
  });
  const st = bodyStyle(theme, 600);
  const fs = Math.min(bar.h * 0.42, theme.type.small * u);
  const radius = Math.min(bar.h / 2, theme.radius * u * 0.6);
  const track = cfg.style === 'underline' ? Math.max(3, 4 * u) : 0;
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div data-vp-box="chapter-bar" data-vp-region="canvas" data-vp-avoid="1" style={{ position: 'absolute', left: bar.x, top: bar.y, width: bar.w, height: bar.h }}>
        {cells.map((c, i) => {
          const active = frame >= c.start && frame < c.end;
          const done = frame >= c.end;
          const p = active ? (frame - c.start) / Math.max(1, c.end - c.start) : done ? 1 : 0;
          const label = ellipsize(c.title, c.w - fs * 1.2, fs, st.family, st.weight);
          const fg = active && cfg.style === 'filled' ? theme.colors.onAccent : active ? theme.colors.text : done ? theme.colors.text : theme.colors.textMuted;
          let bg = 'transparent';
          let border: string | undefined;
          if (cfg.style === 'filled') {
            bg = active ? theme.colors.accent : withAlpha(theme.dark ? '#FFFFFF' : '#000000', done ? 0.14 : 0.08);
          } else if (cfg.style === 'outline') {
            bg = withAlpha(theme.colors.bg, 0.72);
            border = `${Math.max(1, 1.5 * u)}px solid ${active ? theme.colors.accent : withAlpha(theme.colors.textMuted, 0.5)}`;
          }
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: c.x - bar.x,
                top: 0,
                width: c.w,
                height: c.h,
                borderRadius: cfg.style === 'underline' ? 0 : radius,
                backgroundColor: bg,
                border,
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              {cfg.showProgress && cfg.style !== 'underline' && p > 0 ? (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${p * 100}%`,
                    backgroundColor: cfg.style === 'filled' ? withAlpha(active ? theme.colors.onAccent : theme.colors.accent, active ? 0.22 : 0.35) : withAlpha(theme.colors.accent, 0.28),
                  }}
                />
              ) : null}
              {cfg.style === 'underline' ? (
                <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: track, backgroundColor: withAlpha(theme.colors.textMuted, 0.3) }}>
                  <div style={{ width: `${(cfg.showProgress ? p : active || done ? 1 : 0) * 100}%`, height: '100%', backgroundColor: theme.colors.accent }} />
                </div>
              ) : null}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  bottom: track,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: st.family,
                  fontWeight: active ? 700 : 500,
                  fontSize: fs,
                  color: fg,
                  whiteSpace: 'pre',
                }}
              >
                {label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
