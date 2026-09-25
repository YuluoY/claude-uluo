// 章节条：ruler 刻度尺 / filled / outline / underline 格子。
// ruler：线贴视频边（全出血）、一条长方形色块随进度推进、大刻度只在章节边界、章节名居中且距线 labelGap。
// 颜色、长度、线宽、朝向、间距、轨尺、标签全部在 overlays.chapterBar 的 tick* / rail* / progress* / label* 里调。
import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { settings, timeline } from './data';
import { type Rect, useFrameLayout } from './layout';
import { withAlpha } from './motion';
import { bodyStyle } from './slide';
import { textWidth } from './text';
import { useTheme } from './theme';
import type { Settings, Theme } from './types';

type Segment = { title: string; start: number; end: number };
type Cfg = Settings['overlays']['chapterBar'];

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

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** 色块右沿落在当前章节格子里，和这一章的播放进度一致（不按整条尺匀速铺）。 */
const playedWidth = (cells: Array<Rect & Segment>, frame: number, barW: number): number => {
  let w = 0;
  for (const c of cells) {
    const span = Math.max(1, c.end - c.start);
    if (frame >= c.end) {
      w += c.w;
    } else if (frame >= c.start) {
      w += c.w * clamp01((frame - c.start) / Math.max(1, span - 1));
      break;
    } else {
      break;
    }
  }
  return Math.max(0, Math.min(w, barW));
};

/** 刻度尺：贴边线 + 长方形进度色块 + 大刻度 + 距线 labelGap 的居中章节名 */
const RulerBar: React.FC<{ bar: Rect; cells: Array<Rect & Segment>; u: number; theme: Theme; frame: number; cfg: Cfg }> = ({ bar, cells, u, theme, frame, cfg }) => {
  const h = bar.h;
  const topSide = cfg.tickPosition !== 'bottom';
  const dir = topSide ? 1 : -1;
  const railT = Math.max(1, cfg.railThickness * u);
  const progT = Math.max(0, cfg.progressThickness * u);
  const tickLen = Math.max(2, cfg.tickLength * u);
  const tickW = Math.max(1, cfg.tickWidth * u);
  const railInner = topSide ? railT : h - railT;
  const blockTop = topSide ? railT : h - railT - progT;
  const railColor = cfg.railColor === 'auto' ? withAlpha(theme.colors.textMuted, 0.75) : cfg.railColor;
  const trackColor = cfg.trackColor === 'auto' ? withAlpha(theme.colors.textMuted, 0.3) : cfg.trackColor;
  const progColor = cfg.progressColor === 'auto' ? theme.colors.accent : cfg.progressColor;
  const tickPlayed = cfg.tickColor === 'auto' ? theme.colors.accent : cfg.tickColor;
  const tickIdle = cfg.tickColorIdle === 'auto' ? withAlpha(theme.colors.textMuted, 0.55) : cfg.tickColorIdle;
  const playedW = cfg.showProgress ? playedWidth(cells, frame, bar.w) : 0;
  const lo = tickW / 2;
  const hi = bar.w - tickW / 2;
  const xs: number[] = [lo, hi];
  for (const c of cells) {
    xs.push(Math.max(lo, Math.min(c.x - bar.x, hi)));
  }
  if (cfg.tickEvery > 0) {
    const step = Math.max(6 * u, cfg.tickEvery * u);
    for (let x = step; x < bar.w - step * 0.4; x += step) {
      if (!xs.some((v) => Math.abs(v - x) < step * 0.4)) {
        xs.push(Math.max(lo, Math.min(x, hi)));
      }
    }
  }
  xs.sort((a, b) => a - b);
  // 文字：距线 labelGap
  const labelTop = topSide ? railInner + cfg.labelGap * u : 0;
  const labelH = Math.max(0, topSide ? h - labelTop : railInner - cfg.labelGap * u);
  const st = bodyStyle(theme, 600);
  const fs = cfg.labelSize > 0 ? cfg.labelSize * u : Math.min(Math.max(11, labelH * 0.55), theme.type.small * u);
  return (
    <>
      {/* 大刻度：先画，轨尺与色块盖住根部，刻度从尺下探出 */}
      <svg width={bar.w} height={h} style={{ position: 'absolute', left: 0, top: 0, display: 'block' }} aria-hidden>
        {xs.map((x, i) => (
          <line key={'t' + i} x1={x} y1={railInner} x2={x} y2={railInner + dir * tickLen} stroke={cfg.showProgress && x <= playedW ? tickPlayed : tickIdle} strokeWidth={tickW} />
        ))}
      </svg>
      {/* 轨道 + 随进度推进的长方形色块 */}
      {progT > 0 ? (
        <>
          <div style={{ position: 'absolute', left: 0, top: blockTop, width: bar.w, height: progT, backgroundColor: trackColor }} />
          <div style={{ position: 'absolute', left: 0, top: blockTop, width: playedW, height: progT, backgroundColor: progColor }} />
        </>
      ) : null}
      {/* 贴着视频边的那条线 */}
      {cfg.rail ? (
        <div style={{ position: 'absolute', left: 0, top: topSide ? 0 : h - railT, width: bar.w, height: railT, backgroundColor: railColor }} />
      ) : null}
      {/* 章节名：居中在区间里，距线 labelGap */}
      {(cfg.showLabels ? cells : []).map((c, i) => {
        const on = frame >= c.start && frame < c.end;
        const done = frame >= c.end;
        const color = on ? theme.colors.accent : done ? theme.colors.text : theme.colors.textMuted;
        const label = ellipsize(c.title, c.w - 12 * u, fs, st.family, st.weight);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: c.x - bar.x,
              top: labelTop,
              width: c.w,
              height: labelH,
              display: 'flex',
              alignItems: topSide ? 'flex-start' : 'flex-end',
              justifyContent: cfg.labelAlign === 'start' ? 'flex-start' : 'center',
              paddingLeft: cfg.labelAlign === 'start' ? 8 * u : 0,
              boxSizing: 'border-box',
              fontFamily: st.family,
              fontWeight: on ? 700 : 500,
              fontSize: fs,
              lineHeight: 1,
              color,
              whiteSpace: 'pre',
            }}
          >
            {label}
          </div>
        );
      })}
    </>
  );
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
  const ruler = cfg.style === 'ruler';
  const gap = ruler ? 0 : Math.round(8 * u);
  const total = segments.reduce((a, s) => a + (s.end - s.start), 0);
  const free = bar.w - gap * (segments.length - 1);
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
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div data-vp-box="chapter-bar" data-vp-region="canvas" data-vp-avoid="1" style={{ position: 'absolute', left: bar.x, top: bar.y, width: bar.w, height: bar.h }}>
        {ruler ? <RulerBar bar={bar} cells={cells} u={u} theme={theme} frame={frame} cfg={cfg} /> : <BoxesBar bar={bar} cells={cells} u={u} theme={theme} frame={frame} cfg={cfg} />}
      </div>
    </AbsoluteFill>
  );
};

/** 格子形态：filled / outline / underline */
const BoxesBar: React.FC<{ bar: Rect; cells: Array<Rect & Segment>; u: number; theme: Theme; frame: number; cfg: Cfg }> = ({ bar, cells, u, theme, frame, cfg }) => {
  const st = bodyStyle(theme, 600);
  const fs = Math.min(bar.h * 0.42, theme.type.small * u);
  const radius = Math.min(bar.h / 2, theme.radius * u * 0.6);
  const track = cfg.style === 'underline' ? Math.max(3, 4 * u) : 0;
  return (
    <>
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
          border = String(Math.max(1, 1.5 * u)) + 'px solid ' + (active ? theme.colors.accent : withAlpha(theme.colors.textMuted, 0.5));
        }
        return (
          <div key={i} style={{ position: 'absolute', left: c.x - bar.x, top: 0, width: c.w, height: c.h, borderRadius: cfg.style === 'underline' ? 0 : radius, backgroundColor: bg, border, boxSizing: 'border-box', overflow: 'hidden' }}>
            {cfg.showProgress && cfg.style !== 'underline' && p > 0 ? (
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: (p * 100) + '%', backgroundColor: cfg.style === 'filled' ? withAlpha(active ? theme.colors.onAccent : theme.colors.accent, active ? 0.22 : 0.35) : withAlpha(theme.colors.accent, 0.28) }} />
            ) : null}
            {cfg.style === 'underline' ? (
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: track, backgroundColor: withAlpha(theme.colors.textMuted, 0.3) }}>
                <div style={{ width: ((cfg.showProgress ? p : active || done ? 1 : 0) * 100) + '%', height: '100%', backgroundColor: theme.colors.accent }} />
              </div>
            ) : null}
            <div style={{ position: 'absolute', inset: 0, bottom: track, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: st.family, fontWeight: active ? 700 : 500, fontSize: fs, color: fg, whiteSpace: 'pre' }}>{cfg.showLabels ? label : null}</div>
          </div>
        );
      })}
    </>
  );
};
