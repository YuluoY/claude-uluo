// 幻灯片底板：背景、装饰、页眉（章节名 / 页码）+ 场景内容。场景按版面几何算好的矩形摆放内容。
// 装饰只出现在边距、角落或很低的不透明度下，不影响正文对比度；版面检测会忽略装饰层（data-vp-ignore）。
import React, { createContext, useContext } from 'react';
import { AbsoluteFill } from 'remotion';
import { settings, timeline } from './data';
import { type FrameLayout, inset, type Rect, rectStyle, useFrameLayout } from './layout';
import { withAlpha } from './motion';
import { useSceneText } from './sceneText';
import { useShotOptional } from './shot';
import { useTextFit, TextBlock, type TextFit, type TextStyle } from './text';
import { fontStack, useTheme } from './theme';
import type { Theme } from './types';

// ---------- 文字样式 ----------

export const headingStyle = (theme: Theme): TextStyle => ({
  family: fontStack(theme.fonts.heading),
  weight: theme.fonts.headingWeight,
  lineHeight: theme.type.headingLineHeight,
  letterSpacing: theme.type.headingTracking,
});

export const bodyStyle = (theme: Theme, weight?: number): TextStyle => ({
  family: fontStack(theme.fonts.body),
  weight: weight ?? theme.fonts.bodyWeight,
  lineHeight: theme.type.lineHeight,
});

export const monoStyle = (theme: Theme): TextStyle => ({ family: fontStack(theme.fonts.mono), weight: 400, lineHeight: 1.5 });

// ---------- 上下文 ----------

/** unit：场景里字号、部件尺寸的单位（短边 / 1080 × 画幅的文字放大系数） */
type SlideCtx = { frame: FrameLayout; theme: Theme; unit: number };
const SlideContext = createContext<SlideCtx | null>(null);

/** 当前幻灯片的版面几何与风格。必须在 <Slide> 里使用 */
export const useSlide = (): SlideCtx => {
  const c = useContext(SlideContext);
  if (!c) {
    throw new Error('useSlide 只能在 <Slide> 里使用');
  }
  return c;
};

// ---------- 背景与装饰 ----------

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

export const Background: React.FC<{ theme?: Theme }> = ({ theme: t }) => {
  const themeCtx = useTheme();
  const theme = t ?? themeCtx;
  const frame = useFrameLayout(theme);
  const bg = theme.background;
  const c0 = bg.colors[0] ?? theme.colors.bg;
  const c1 = bg.colors[1] ?? theme.colors.surface;
  const c2 = bg.colors[2] ?? theme.colors.accent;
  const op = bg.opacity ?? 0.35;
  const u = frame.unit;
  let style: React.CSSProperties = { backgroundColor: c0 };
  if (bg.type === 'linear') {
    style = { backgroundImage: `linear-gradient(${bg.angle ?? 135}deg, ${c0} 0%, ${c1} 100%)` };
  } else if (bg.type === 'radial') {
    style = { backgroundColor: c0, backgroundImage: `radial-gradient(ellipse at 30% 20%, ${c1} 0%, ${c0} 65%)` };
  } else if (bg.type === 'mesh') {
    style = {
      backgroundColor: c0,
      backgroundImage: [
        `radial-gradient(circle at 12% 18%, ${withAlpha(c1, op)} 0%, transparent 42%)`,
        `radial-gradient(circle at 88% 12%, ${withAlpha(c2, op * 0.8)} 0%, transparent 38%)`,
        `radial-gradient(circle at 78% 92%, ${withAlpha(c1, op * 0.7)} 0%, transparent 45%)`,
      ].join(', '),
    };
  } else if (bg.type === 'split') {
    const at = (bg.split ?? 0.06) * 100;
    style = { backgroundImage: `linear-gradient(90deg, ${c1} 0%, ${c1} ${at}%, ${c0} ${at}%, ${c0} 100%)` };
  } else if (bg.type === 'grid') {
    const s = Math.round(64 * u);
    const line = withAlpha(c1, op);
    style = {
      backgroundColor: c0,
      backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
      backgroundSize: `${s}px ${s}px`,
    };
  } else if (bg.type === 'dots') {
    const s = Math.round(36 * u);
    const r = Math.max(1, 1.7 * u);
    style = {
      backgroundColor: c0,
      backgroundImage: `radial-gradient(${withAlpha(c1, op)} ${r}px, transparent ${r + 0.6}px)`,
      backgroundSize: `${s}px ${s}px`,
    };
  }
  return <AbsoluteFill data-vp-ignore="1" style={style} />;
};

const Motif: React.FC<{ theme: Theme; frame: FrameLayout }> = ({ theme, frame }) => {
  const { width: W, height: H, unit: u, inner, safe } = frame;
  const a = theme.colors.accent;
  const b = theme.colors.accent2;
  const border = theme.colors.border;
  switch (theme.decor.motif) {
    case 'orbs': {
      const orb = (x: number, y: number, r: number, c: string, o: number) => (
        <div
          style={{
            position: 'absolute',
            left: x - r,
            top: y - r,
            width: 2 * r,
            height: 2 * r,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${withAlpha(c, o)} 0%, ${withAlpha(c, 0)} 70%)`,
          }}
        />
      );
      return (
        <>
          {orb(W * 0.9, H * 0.08, H * 0.55, a, 0.28)}
          {orb(W * 0.06, H * 0.96, H * 0.6, b, 0.22)}
        </>
      );
    }
    case 'circles': {
      const cx = safe.x + safe.w - inner.x * 0.2;
      const cy = safe.y + H * 0.02;
      return (
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
          {[0.2, 0.3, 0.4].map((k, i) => (
            <circle key={i} cx={cx} cy={cy} r={H * k} fill="none" stroke={withAlpha(border, 0.9 - i * 0.25)} strokeWidth={1.5 * u} />
          ))}
          <circle cx={safe.x + W * 0.035} cy={safe.y + safe.h - H * 0.05} r={10 * u} fill={a} />
        </svg>
      );
    }
    case 'lines':
      return (
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
          <line x1={inner.x} x2={inner.x + inner.w} y1={inner.y - 18 * u} y2={inner.y - 18 * u} stroke={theme.colors.text} strokeWidth={2 * u} />
          <line x1={inner.x} x2={inner.x + inner.w} y1={inner.y - 10 * u} y2={inner.y - 10 * u} stroke={border} strokeWidth={1 * u} />
        </svg>
      );
    case 'brackets': {
      const L = 44 * u;
      const r = inset(inner, -18 * u);
      const s = 3 * u;
      const corner = (x: number, y: number, dx: number, dy: number) => <path d={`M ${x + dx * L} ${y} L ${x} ${y} L ${x} ${y + dy * L}`} fill="none" stroke={a} strokeWidth={s} />;
      return (
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
          {corner(r.x, r.y, 1, 1)}
          {corner(r.x + r.w, r.y, -1, 1)}
          {corner(r.x, r.y + r.h, 1, -1)}
          {corner(r.x + r.w, r.y + r.h, -1, -1)}
        </svg>
      );
    }
    case 'bars':
      return (
        <>
          <div style={{ position: 'absolute', left: safe.x + (inner.x - safe.x) * 0.35, top: inner.y, width: 10 * u, height: 90 * u, backgroundColor: a }} />
          <div style={{ position: 'absolute', right: W - safe.x - safe.w, bottom: H - safe.y - safe.h, width: W * 0.18, height: 8 * u, backgroundColor: a }} />
        </>
      );
    case 'halftone': {
      const size = Math.round(18 * u);
      return (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: W * 0.42,
            height: H * 0.55,
            backgroundImage: `radial-gradient(${withAlpha(a, 0.5)} ${3 * u}px, transparent ${3 * u + 0.6}px)`,
            backgroundSize: `${size}px ${size}px`,
            maskImage: 'radial-gradient(ellipse at 100% 0%, black 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at 100% 0%, black 0%, transparent 70%)',
          }}
        />
      );
    }
    case 'tabs': {
      const colors = [a, b, theme.colors.success, theme.colors.warning];
      const x = safe.x + safe.w - (inner.x - safe.x) * 0.55;
      const w = (inner.x - safe.x) * 0.4;
      const h = H * 0.12;
      return (
        <>
          {colors.map((c, i) => (
            <div key={i} style={{ position: 'absolute', left: x, top: inner.y + i * (h + 10 * u), width: w, height: h, backgroundColor: c, borderRadius: `${8 * u}px 0 0 ${8 * u}px`, opacity: 0.9 }} />
          ))}
        </>
      );
    }
    case 'glow-grid': {
      const s = Math.round(56 * u);
      const line = withAlpha(a, 0.22);
      return (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: H * 0.38,
            backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`,
            backgroundSize: `${s}px ${s}px`,
            maskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 0%, transparent 100%)',
          }}
        />
      );
    }
    case 'blocks': {
      // 放在右侧页边距里（不进页眉、内容区）：一个方块 + 一个圆点
      const mx = safe.x + safe.w - (inner.x + inner.w);
      const s = Math.min(mx * 0.42, 64 * u);
      const cx = inner.x + inner.w + mx / 2;
      const top = frame.content.y;
      return (
        <svg width={W} height={H} style={{ position: 'absolute', left: 0, top: 0 }}>
          <rect x={cx - s / 2} y={top} width={s} height={s} fill={a} />
          <circle cx={cx} cy={top + s * 1.9} r={s * 0.3} fill={theme.colors.text} />
        </svg>
      );
    }
    default:
      return null;
  }
};

export const Decor: React.FC<{ theme: Theme; frame: FrameLayout; sectionNumber?: string | null }> = ({ theme, frame, sectionNumber }) => {
  const d = theme.decor;
  const u = frame.unit;
  const { safe, inner } = frame;
  return (
    <AbsoluteFill data-vp-ignore="1" style={{ pointerEvents: 'none' }}>
      <Motif theme={theme} frame={frame} />
      {d.accentBar === 'left' ? <div style={{ position: 'absolute', left: safe.x, top: safe.y, width: 12 * u, height: safe.h, backgroundColor: theme.colors.accent }} /> : null}
      {d.accentBar === 'top' ? <div style={{ position: 'absolute', left: safe.x, top: safe.y, width: safe.w, height: 10 * u, backgroundColor: theme.colors.accent }} /> : null}
      {d.frame ? (
        <div style={{ position: 'absolute', ...rectStyle(inset(inner, -22 * u)), border: `${Math.max(1, 1.5 * u)}px solid ${theme.colors.border}`, borderRadius: theme.radius * u * 0.5 }} />
      ) : null}
      {d.sectionNumber && sectionNumber ? (
        <div
          style={{
            position: 'absolute',
            right: frame.width - (safe.x + safe.w) + (inner.x - safe.x) * 0.5,
            top: inner.y + inner.h * 0.18,
            fontFamily: fontStack(theme.fonts.heading),
            fontWeight: 900,
            fontSize: frame.height * 0.42,
            lineHeight: 1,
            color: withAlpha(theme.colors.text, theme.dark ? 0.035 : 0.04),
            letterSpacing: '-0.04em',
          }}
        >
          {sectionNumber}
        </div>
      ) : null}
      {d.grain > 0 ? <AbsoluteFill style={{ backgroundImage: GRAIN, opacity: d.grain, mixBlendMode: theme.dark ? 'screen' : 'multiply' }} /> : null}
    </AbsoluteFill>
  );
};

// ---------- 页眉 ----------

const pad2 = (n: number) => String(n).padStart(2, '0');

export const Chrome: React.FC<{ theme: Theme; frame: FrameLayout }> = ({ theme, frame }) => {
  const on2 = useSceneText();
  const shot = useShotOptional();
  if (!frame.header || !shot) {
    return null;
  }
  const u = frame.unit;
  const h = frame.header;
  const fs = theme.type.small * u * 0.8;
  const total = timeline.shots.length;
  const showPage = on2 && theme.chrome.pageNumber && settings.overlays.pageNumber !== false;
  // 开了章节条时页眉不再重复章节名，只留页码
  const chapter = theme.chrome.chapter && !frame.chapterBar ? shot.chapter : null;
  return (
    <div data-vp-box="header" data-vp-region="header" style={{ ...rectStyle(h), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 * u, fontFamily: fontStack(theme.fonts.body), fontSize: fs, color: theme.colors.textMuted, letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: h.w * 0.7 }}>
        {chapter ? (
          <>
            <span style={{ width: 10 * u, height: 10 * u, backgroundColor: theme.colors.accent, borderRadius: theme.radius > 8 ? '50%' : 0, flex: 'none' }} />
            <span>{theme.title.case === 'upper' ? chapter.toUpperCase() : chapter}</span>
          </>
        ) : null}
      </div>
      {showPage ? (
        <div style={{ fontFamily: fontStack(theme.fonts.mono), fontSize: fs, color: theme.colors.textMuted, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
          <span style={{ color: theme.colors.text }}>{pad2(shot.index + 1)}</span> / {pad2(total)}
        </div>
      ) : null}
    </div>
  );
};

// ---------- 幻灯片 ----------

export type SlideProps = {
  children?: React.ReactNode;
  /** 显示页眉（章节名、页码）；封面、章节页可以关掉 */
  chrome?: boolean;
  /** 显示装饰 */
  decor?: boolean;
  /** 背景里淡淡的大号页码（主题 decor.sectionNumber 开启时）：缺省为镜头序号，null 不显示 */
  sectionNumber?: string | null;
  /** 不画背景（全屏素材之上叠内容时） */
  transparent?: boolean;
};

export const Slide: React.FC<SlideProps> = ({ children, chrome = true, decor = true, sectionNumber, transparent = false }) => {
  const theme = useTheme();
  const shot = useShotOptional();
  const frame0 = useFrameLayout(theme);
  const frame = chrome ? frame0 : withoutHeader(frame0);
  const pageNo = sectionNumber === undefined ? (settings.overlays.sectionNumber !== false && shot ? pad2(shot.index + 1) : null) : sectionNumber;
  return (
    <SlideContext.Provider value={{ frame, theme, unit: frame.unit * frame.typeScale }}>
      {/* data-vp-content：本页实际的内容区（关掉页眉时更高），版面检测按它判断越界 */}
      <AbsoluteFill
        data-vp-root="1"
        data-vp-content={`${frame.content.x},${frame.content.y},${frame.content.w},${frame.content.h}`}
        style={{ color: theme.colors.text, fontFamily: fontStack(theme.fonts.body) }}
      >
        {transparent ? null : <Background theme={theme} />}
        {decor && !transparent ? <Decor theme={theme} frame={frame} sectionNumber={pageNo} /> : null}
        {chrome ? <Chrome theme={theme} frame={frame} /> : null}
        {children}
      </AbsoluteFill>
    </SlideContext.Provider>
  );
};

/** 不要页眉时，内容区向上扩展到页眉的位置 */
export const withoutHeader = (f: FrameLayout): FrameLayout => {
  if (!f.header) {
    return f;
  }
  const top = f.inner.y;
  const bottom = f.content.y + f.content.h;
  return { ...f, header: null, content: { ...f.content, y: top, h: bottom - top } };
};

// ---------- 槽位 ----------

/** 入场方式：up 上移淡入、down 下移淡入、left/right 横移淡入、pop 放大淡入、fade 只淡入 */
export type Motion = 'up' | 'down' | 'left' | 'right' | 'pop' | 'fade';

export const motionStyle = (p: number, motion: Motion, unit: number): React.CSSProperties => {
  const d = (1 - p) * 28 * unit;
  switch (motion) {
    case 'up':
      return { opacity: p, transform: `translateY(${d}px)` };
    case 'down':
      return { opacity: p, transform: `translateY(${-d}px)` };
    case 'left':
      return { opacity: p, transform: `translateX(${d}px)` };
    case 'right':
      return { opacity: p, transform: `translateX(${-d}px)` };
    case 'pop':
      return { opacity: p, transform: `scale(${0.92 + 0.08 * p})` };
    default:
      return { opacity: p };
  }
};

export type BoxProps = {
  rect: Rect;
  name: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  /** 允许超出内容区（全出血图片等） */
  bleed?: boolean;
  /** 入场进度 0→1：给了就按 motion 做入场动画。位置始终是 rect，动画只是视觉位移，版面检测按最终位置测量 */
  reveal?: number;
  motion?: Motion;
  /** 有意叠在同层其他槽位之上（图片上的标注等），不参与同层压盖检测 */
  overlay?: boolean;
};

/** 版面槽位：绝对定位、尺寸固定，版面检测会检查它和它的内容 */
export const Box: React.FC<BoxProps> = ({ rect, name, children, style, bleed, reveal, motion = 'up', overlay }) => {
  const unit = useSlideUnit();
  const anim = reveal === undefined ? null : motionStyle(Math.min(1, Math.max(0, reveal)), motion, unit);
  const opacity = anim ? (anim.opacity as number) * ((style?.opacity as number | undefined) ?? 1) : style?.opacity;
  return (
    <div
      data-vp-box={name}
      data-vp-region={bleed ? 'canvas' : undefined}
      data-vp-anim={anim ? '1' : undefined}
      data-vp-layer={overlay ? 'overlay' : undefined}
      style={{ ...rectStyle(rect), ...style, ...(anim ?? {}), opacity }}
    >
      {children}
    </div>
  );
};

const useSlideUnit = (): number => {
  const c = useContext(SlideContext);
  const theme = useTheme();
  const f = useFrameLayout(theme);
  return c?.unit ?? f.unit;
};

export const cardStyle = (theme: Theme, unit: number, accent?: string): React.CSSProperties => {
  const r = theme.radius * unit;
  const bw = Math.max(1, 1.5 * unit);
  const edge = accent ?? theme.colors.border;
  switch (theme.card.style) {
    case 'outline':
      return { borderRadius: r, border: `${bw * 1.4}px solid ${edge}`, backgroundColor: 'transparent' };
    case 'elevated':
      return { borderRadius: r, backgroundColor: theme.colors.surface, boxShadow: theme.card.shadow, border: accent ? `${bw}px solid ${accent}` : undefined };
    case 'glass':
      return {
        borderRadius: r,
        backgroundColor: withAlpha(theme.colors.surface, 0.55),
        border: `${bw}px solid ${accent ?? withAlpha(theme.dark ? '#FFFFFF' : '#000000', 0.1)}`,
        boxShadow: theme.card.shadow,
      };
    case 'filled':
      return { borderRadius: r, backgroundColor: theme.colors.surfaceAlt, border: accent ? `${bw}px solid ${accent}` : undefined };
    default:
      return { borderRadius: r, backgroundColor: theme.colors.surface, border: accent ? `${bw}px solid ${accent}` : undefined };
  }
};

/** 卡片：带风格外观的槽位；children 的坐标相对卡片内边距后的区域 */
export const Card: React.FC<BoxProps & { accent?: string; padding?: number }> = ({ children, style, accent, padding, ...box }) => {
  const { theme, unit } = useSlide();
  return (
    <Box {...box} style={{ ...cardStyle(theme, unit, accent), boxSizing: 'border-box', ...style }}>
      <div style={{ position: 'absolute', inset: padding ?? 0 }}>{children}</div>
    </Box>
  );
};

/** 卡片内边距（像素） */
export const cardPadding = (theme: Theme, unit: number): number => Math.round(theme.space * unit * 1.1);

// ---------- 标题 ----------

export type TitleLayout = { fit: TextFit | null; titleRect: Rect | null; body: Rect; style: TextStyle };

/** 在内容区顶部放标题：自动字号（最多两行），返回标题矩形与剩下的正文区域 */
export const useTitleLayout = (text: string | undefined, area?: Rect, opts?: { max?: number; min?: number; maxLines?: number }): TitleLayout => {
  const { frame, theme, unit } = useSlide();
  const r = area ?? frame.content;
  const style = headingStyle(theme);
  const deco = theme.title.style === 'bar' ? 22 * unit : 0;
  const max = (opts?.max ?? theme.type.h2) * unit;
  const fit = useTextFit({
    text: text ? (theme.title.case === 'upper' ? text.toUpperCase() : text) : '',
    width: r.w - deco,
    height: r.h * 0.34,
    style,
    max,
    min: Math.min(max, (opts?.min ?? theme.type.h3 * 0.8) * unit),
    maxLines: opts?.maxLines ?? 2,
    balance: true,
  });
  if (!text) {
    return { fit: null, titleRect: null, body: r, style };
  }
  const extra = theme.title.style === 'underline' || theme.title.style === 'kicker' ? 22 * unit : 0;
  const titleRect: Rect = { x: r.x, y: r.y, w: r.w, h: fit.height + extra };
  const gap = frame.gutter * 1.2;
  const body: Rect = { x: r.x, y: r.y + titleRect.h + gap, w: r.w, h: Math.max(1, r.h - titleRect.h - gap) };
  return { fit, titleRect, body, style };
};

export const SceneTitle: React.FC<{ layout: TitleLayout; text?: string; style?: React.CSSProperties; reveal?: number }> = ({ layout, text, style, reveal }) => {
  const on = useSceneText();
  const { theme, unit } = useSlide();
  if (!on) {
    return null;
  }
  if (!layout.fit || !layout.titleRect || !text) {
    return null;
  }
  const t = theme.title.case === 'upper' ? text.toUpperCase() : text;
  const r = layout.titleRect;
  const deco = theme.title.style === 'bar' ? 22 * unit : 0;
  return (
    <Box rect={r} name="title" style={style} reveal={reveal}>
      {theme.title.style === 'bar' ? (
        <div style={{ position: 'absolute', left: 0, top: layout.fit.lineHeightPx * 0.14, width: 8 * unit, height: layout.fit.height - layout.fit.lineHeightPx * 0.28, backgroundColor: theme.colors.accent }} />
      ) : null}
      {theme.title.style === 'kicker' ? <div style={{ position: 'absolute', left: 0, top: 0, width: 56 * unit, height: 6 * unit, backgroundColor: theme.colors.accent }} /> : null}
      <TextBlock
        fit={layout.fit}
        text={t}
        style={layout.style}
        rect={{ x: deco, y: theme.title.style === 'kicker' ? 22 * unit : 0, w: r.w - deco, h: layout.fit.height }}
        color={theme.colors.text}
      />
      {theme.title.style === 'underline' ? (
        <div style={{ position: 'absolute', left: 0, top: layout.fit.height + 8 * unit, width: 96 * unit, height: 6 * unit, backgroundColor: theme.colors.accent, borderRadius: 3 * unit }} />
      ) : null}
    </Box>
  );
};
