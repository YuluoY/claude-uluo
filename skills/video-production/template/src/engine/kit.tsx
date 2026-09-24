// 场景积木：多个场景共用的版面计算与小部件。位置全部由传入的矩形决定，不靠流式布局“挤”出来。
import React, { useEffect, useState } from 'react';
import { cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Rect } from './layout';
import { rectStyle } from './layout';
import { ease, withAlpha } from './motion';
import { bodyStyle, headingStyle, monoStyle, useSlide } from './slide';
import { TextBlock, type TextFit, type TextStyle, textWidth, useTextFit } from './text';
import { fontStack } from './theme';
import type { Theme } from './types';

// ---------- 时间 ----------

/** 每个出现时刻对应的入场进度 0→1（主题缓动与时长） */
export const useRevealProgress = (frames: number[], durationSec?: number): number[] => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { theme } = useSlide();
  const dur = Math.max(1, Math.round((durationSec ?? theme.motion.durationSec) * fps));
  return frames.map((f) => ease(theme, (frame - f) / dur));
};

/** 已经出现到第几项（-1 表示一项都没出现） */
export const useCurrentIndex = (frames: number[]): number => {
  const frame = useCurrentFrame();
  let idx = -1;
  frames.forEach((f, i) => {
    if (frame >= f) {
      idx = i;
    }
  });
  return idx;
};

// ---------- 矩形 ----------

/** 从矩形底部（或顶部）切出固定高度的一条，返回 [剩余, 切出的] */
export const reserve = (r: Rect, h: number, gap: number, side: 'bottom' | 'top' = 'bottom'): [Rect, Rect] => {
  const hh = Math.min(h, r.h);
  if (side === 'top') {
    return [{ x: r.x, y: r.y + hh + gap, w: r.w, h: Math.max(1, r.h - hh - gap) }, { x: r.x, y: r.y, w: r.w, h: hh }];
  }
  return [{ x: r.x, y: r.y, w: r.w, h: Math.max(1, r.h - hh - gap) }, { x: r.x, y: r.y + r.h - hh, w: r.w, h: hh }];
};

/** 在矩形里放一个 w × h 的矩形（对齐方式可选） */
export const place = (r: Rect, w: number, h: number, ax: 'start' | 'center' | 'end' = 'center', ay: 'start' | 'center' | 'end' = 'center'): Rect => {
  const ww = Math.min(w, r.w);
  const hh = Math.min(h, r.h);
  const x = ax === 'start' ? r.x : ax === 'end' ? r.x + r.w - ww : r.x + (r.w - ww) / 2;
  const y = ay === 'start' ? r.y : ay === 'end' ? r.y + r.h - hh : r.y + (r.h - hh) / 2;
  return { x, y, w: ww, h: hh };
};

/** 相对坐标：把子矩形从绝对坐标换成相对父矩形 */
export const relative = (child: Rect, parent: Rect): Rect => ({ x: child.x - parent.x, y: child.y - parent.y, w: child.w, h: child.h });

// ---------- 文字样式 ----------

export const labelStyle = (theme: Theme): TextStyle => ({ family: fontStack(theme.fonts.body), weight: 700, lineHeight: 1.25, letterSpacing: 0.08 });

export { bodyStyle, headingStyle, monoStyle };

// ---------- 小部件 ----------

/** 编号徽标：圆形（圆角主题）或方形，强调色底 */
export const NumberBadge: React.FC<{ rect: Rect; text: string; active?: boolean; muted?: boolean }> = ({ rect, text, active = true, muted }) => {
  const { theme } = useSlide();
  const size = Math.min(rect.w, rect.h);
  const st: TextStyle = { family: fontStack(theme.fonts.mono), weight: 700, lineHeight: 1 };
  const fit = useTextFit({ text, width: size * 0.72, height: size * 0.6, style: st, max: size * 0.5, min: size * 0.2, maxLines: 1 });
  const bg = muted ? withAlpha(theme.colors.text, 0.08) : active ? theme.colors.accent : withAlpha(theme.colors.accent, 0.18);
  const fg = muted ? theme.colors.textMuted : active ? theme.colors.onAccent : theme.colors.accent;
  return (
    <div
      data-vp-ignore="1"
      style={{
        ...rectStyle({ x: rect.x, y: rect.y, w: size, h: size }),
        borderRadius: theme.radius > 8 ? '50%' : theme.radius * 0.5,
        backgroundColor: bg,
      }}
    >
      <TextBlock fit={fit} text={text} style={st} rect={{ x: 0, y: 0, w: size, h: size }} align="center" valign="center" color={fg} />
    </div>
  );
};

/** 列表圆点 / 方块 */
export const Bullet: React.FC<{ x: number; y: number; size: number; color: string }> = ({ x, y, size, color }) => {
  const { theme } = useSlide();
  return <div data-vp-ignore="1" style={{ position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: theme.radius > 8 ? '50%' : 2, backgroundColor: color }} />;
};

/** 箭头：画在给定矩形的中央，指向 dir */
export const Arrow: React.FC<{ rect: Rect; dir: 'right' | 'down'; color: string; opacity?: number }> = ({ rect, dir, color, opacity = 1 }) => {
  const { unit } = useSlide();
  const len = Math.max(8, (dir === 'right' ? rect.w : rect.h) * 0.62);
  const head = Math.min(len * 0.42, 16 * unit);
  const s = Math.max(2, 3.5 * unit);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const d =
    dir === 'right'
      ? `M ${cx - len / 2} ${cy} L ${cx + len / 2} ${cy} M ${cx + len / 2 - head} ${cy - head} L ${cx + len / 2} ${cy} L ${cx + len / 2 - head} ${cy + head}`
      : `M ${cx} ${cy - len / 2} L ${cx} ${cy + len / 2} M ${cx - head} ${cy + len / 2 - head} L ${cx} ${cy + len / 2} L ${cx + head} ${cy + len / 2 - head}`;
  return (
    <svg data-vp-ignore="1" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity }} width={1} height={1}>
      <path d={d} fill="none" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/** 强调短线 */
export const Rule: React.FC<{ x: number; y: number; w: number; h?: number; color?: string; opacity?: number }> = ({ x, y, w, h, color, opacity = 1 }) => {
  const { theme, unit } = useSlide();
  const hh = h ?? 6 * unit;
  return <div data-vp-ignore="1" style={{ position: 'absolute', left: x, top: y, width: w, height: hh, backgroundColor: color ?? theme.colors.accent, borderRadius: hh / 2, opacity }} />;
};

/** 标签文字的高度（按主题 small 字号的比例） */
export const labelSize = (theme: Theme, unit: number, k = 0.78): number => Math.round(theme.type.small * unit * k);

/** 小号大写标签（KICKER / 章节号 / “例”） */
export const Label: React.FC<{ rect: Rect; text: string; color?: string; align?: 'left' | 'center' | 'right'; size?: number; name?: string; reveal?: number }> = ({ rect, text, color, align = 'left', size, name, reveal }) => {
  const { theme, unit } = useSlide();
  const st = labelStyle(theme);
  const fs = size ?? labelSize(theme, unit);
  const fit = useTextFit({ text, width: rect.w, height: rect.h, style: st, max: fs, min: Math.min(fs, 12 * unit), maxLines: 1 });
  return <TextBlock fit={fit} text={text} style={st} rect={rect} align={align} valign="center" color={color ?? theme.colors.accent} name={name} css={reveal === undefined ? undefined : { opacity: reveal }} />;
};

/** 数据来源：用了数字就必须写来源（素材里没有的数字不许编）。rect 由场景预留在内容区底部 */
export const SourceNote: React.FC<{ rect: Rect; text: string; align?: 'left' | 'center' | 'right' }> = ({ rect, text, align = 'left' }) => {
  const { theme, unit } = useSlide();
  const st = bodyStyle(theme);
  const t = `来源：${text}`;
  const fs = theme.type.small * unit * 0.8;
  const fit = useTextFit({ text: t, width: rect.w, height: rect.h, style: st, max: fs, min: Math.min(fs, 14 * unit), maxLines: 2 });
  return (
    <div data-vp-box="source" style={rectStyle(rect)}>
      <TextBlock fit={fit} text={t} style={st} rect={{ x: 0, y: 0, w: rect.w, h: rect.h }} align={align} valign="bottom" color={theme.colors.textMuted} />
    </div>
  );
};

/** 来源注记需要预留的高度 */
export const sourceNoteHeight = (theme: Theme, unit: number): number => theme.type.small * unit * 0.8 * theme.type.lineHeight;

/** 在 rect 里画一段已经排好的文字（坐标相对父元素） */
export const Text: React.FC<{
  fit: TextFit;
  text: string;
  style: TextStyle;
  rect: Rect;
  color: string;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'center' | 'bottom';
  emphasis?: string[];
  emphasisColor?: string;
  name?: string;
  opacity?: number;
}> = ({ opacity, ...p }) => <TextBlock {...p} css={opacity === undefined ? undefined : { opacity }} />;

// ---------- 数字 ----------

const DIGITS = Array.from('0123456789');
const isWideChar = (ch: string) => /[⺀-鿿＀-￯]/.test(ch);

/** 前后缀（单位）是否缩小显示：含汉字或多于 1 个字符时缩到 0.5 */
export const affixScale = (affix: string): number => (affix && (Array.from(affix).length > 1 || isWideChar(affix)) ? 0.5 : 1);

type Glyph = { ch: string; w: number; fs: number };

/** 把数字串拆成等宽数字格（跳动时不左右晃）+ 其他字符的自然宽度；返回每个字符的宽度与字号 */
const layoutNumber = (value: string, prefix: string, suffix: string, fs: number, st: TextStyle): Glyph[] => {
  const cell = Math.max(...DIGITS.map((d) => textWidth(d, fs, st)));
  const out: Glyph[] = [];
  const ps = fs * affixScale(prefix);
  for (const ch of Array.from(prefix)) {
    out.push({ ch, w: textWidth(ch, ps, st), fs: ps });
  }
  for (const ch of Array.from(value)) {
    out.push({ ch, w: DIGITS.includes(ch) ? cell : textWidth(ch, fs, st), fs });
  }
  const ss = fs * affixScale(suffix);
  for (const ch of Array.from(suffix)) {
    out.push({ ch, w: textWidth(ch, ss, st), fs: ss });
  }
  return out;
};

export const numberWidth = (value: string, prefix: string, suffix: string, fs: number, st: TextStyle): number =>
  layoutNumber(value, prefix, suffix, fs, st).reduce((a, g) => a + g.w, 0);

/** 让“前缀 + 数字 + 后缀”放进 w × h 的最大字号 */
export const fitNumberSize = (o: { value: string; prefix?: string; suffix?: string; width: number; height: number; style: TextStyle; max: number; min: number }): { fontSize: number; overflow: boolean } => {
  const w100 = numberWidth(o.value, o.prefix ?? '', o.suffix ?? '', 100, o.style);
  const byW = (o.width * 0.99) / (w100 / 100);
  const byH = o.height / o.style.lineHeight;
  const fs = Math.floor(Math.min(o.max, byW, byH));
  return fs >= Math.floor(o.min) ? { fontSize: fs, overflow: false } : { fontSize: Math.floor(o.min), overflow: true };
};

/**
 * 画数字：数字位等宽；final 是最终显示的串（决定占位宽度），value 是当前帧显示的串（计数动画里会变短），
 * 两者右对齐，数字从右往左“长”出来。
 */
export const NumberText: React.FC<{
  rect: Rect;
  value: string;
  final: string;
  prefix?: string;
  suffix?: string;
  fontSize: number;
  style: TextStyle;
  color: string;
  affixColor?: string;
  align?: 'left' | 'center' | 'right';
  overflow?: boolean;
  name?: string;
}> = ({ rect, value, final, prefix = '', suffix = '', fontSize, style, color, affixColor, align = 'center', overflow, name }) => {
  const fullW = numberWidth(final, prefix, suffix, fontSize, style);
  const glyphs = layoutNumber(value, prefix, suffix, fontSize, style);
  const curW = glyphs.reduce((a, g) => a + g.w, 0);
  const x0 = align === 'left' ? 0 : align === 'right' ? rect.w - fullW : (rect.w - fullW) / 2;
  const lh = fontSize * style.lineHeight;
  const pn = Array.from(prefix).length;
  const vn = Array.from(value).length;
  return (
    <div data-vp-box={name} data-vp-text="1" data-vp-overflow={overflow ? '1' : undefined} style={rectStyle(rect)}>
      {/* 容器的字体与字号和数字一致，行框（strut）才不会被撑高 */}
      <div
        style={{
          position: 'absolute',
          left: x0 + fullW - curW,
          top: (rect.h - lh) / 2,
          width: curW,
          height: lh,
          whiteSpace: 'pre',
          lineHeight: `${lh}px`,
          fontFamily: style.family,
          fontWeight: style.weight,
          fontSize,
        }}
      >
        {glyphs.map((g, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: g.w,
              textAlign: 'center',
              fontFamily: style.family,
              fontWeight: style.weight,
              fontSize: g.fs,
              lineHeight: `${g.fs * style.lineHeight}px`,
              letterSpacing: style.letterSpacing ? `${style.letterSpacing}em` : undefined,
              color: i < pn || i >= pn + vn ? affixColor ?? color : color,
            }}
          >
            {g.ch}
          </span>
        ))}
      </div>
    </div>
  );
};

// ---------- 图片 ----------

const sizeCache = new Map<string, { w: number; h: number }>();

/** 图片的原始尺寸（加载完才渲染这一帧）：用来算 contain / cover 之后图片在框里的实际位置 */
export const useImageSize = (src: string): { w: number; h: number } | null => {
  const [size, setSize] = useState(() => sizeCache.get(src) ?? null);
  const [handle] = useState(() => (sizeCache.has(src) ? null : delayRender(`读取图片尺寸 ${src}`)));
  useEffect(() => {
    if (size) {
      return;
    }
    const img = new Image();
    img.onload = () => {
      const s = { w: img.naturalWidth, h: img.naturalHeight };
      sizeCache.set(src, s);
      setSize(s);
    };
    img.onerror = () => cancelRender(new Error(`图片加载失败：${src}`));
    img.src = src;
  }, [src, size]);
  useEffect(() => {
    if (size && handle !== null) {
      continueRender(handle);
    }
  }, [size, handle]);
  return size;
};

/** 图片按 fit 放进 box 后的显示矩形（相对 box） */
export const fittedRect = (box: { w: number; h: number }, img: { w: number; h: number }, fit: 'contain' | 'cover'): Rect => {
  const k = fit === 'contain' ? Math.min(box.w / img.w, box.h / img.h) : Math.max(box.w / img.w, box.h / img.h);
  const w = img.w * k;
  const h = img.h * k;
  return { x: (box.w - w) / 2, y: (box.h - h) / 2, w, h };
};
