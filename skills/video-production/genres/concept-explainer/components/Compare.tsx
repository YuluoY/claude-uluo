import React from 'react';
import {
  Box,
  Bullet,
  bodyStyle,
  Card,
  cardPadding,
  headingStyle,
  reserve,
  SceneTitle,
  Slide,
  splitH,
  splitV,
  TextBlock,
  useRevealFrames,
  useRevealProgress,
  useSlide,
  useTextFit,
  useTextFitGroup,
  useTitleLayout,
  withAlpha,
} from '../../engine';
import type { SceneProps } from '../../engine';

type Side = { title: string; points: string[] };
export type CompareProps = { title?: string; left: Side; right: Side; at?: string[]; verdict?: string; verdictAt?: string };

const Body: React.FC<{ props: CompareProps; frames: number[] }> = ({ props, frames }) => {
  const { frame, theme, unit } = useSlide();
  const t = useTitleLayout(props.title);
  const g = frame.gutter;
  const hs = headingStyle(theme);
  const bs = bodyStyle(theme);
  const rows = Math.max(props.left.points.length, props.right.points.length);
  // 结论条：一开始就预留位置，出现时不推挤两栏
  const verdict = props.verdict ?? '';
  const vPad = 18 * unit;
  const vBorder = Math.max(1, 2 * unit);
  const vFit = useTextFit({ text: verdict, width: t.body.w * 0.86, height: t.body.h * 0.22, style: hs, max: theme.type.h3 * unit, min: theme.type.body * unit * 0.8, maxLines: 2, balance: true });
  const [main, vRect] = verdict ? reserve(t.body, vFit.height + 2 * vPad, g) : [t.body, null];
  const side = frame.aspect !== 'portrait';
  const gap = side ? g * 2.6 : g * 2;
  const [a0, b0] = side ? splitH(main, [1, 1], gap) : splitV(main, [1, 1], gap);
  const pad = cardPadding(theme, unit);
  const topBar = 6 * unit;
  const a = a0;
  const innerW = a.w - 2 * pad;
  const innerH = a.h - 2 * pad - topBar;
  const heads = useTextFitGroup(
    [props.left.title, props.right.title].map((text) => ({ text, width: innerW, height: innerH * 0.3, maxLines: 2 })),
    { style: hs, max: theme.type.h3 * unit, min: theme.type.body * unit * 0.8 },
  );
  const headH = Math.max(heads[0].height, heads[1].height);
  const marker = Math.round(10 * unit);
  const mGap = 18 * unit;
  const pGap = g * 0.5;
  const pointsH = innerH - headH - g;
  const all = [...props.left.points, ...props.right.points];
  const fits = useTextFitGroup(
    all.map((text) => ({ text, width: innerW - marker - mGap, height: (pointsH - pGap * (rows - 1)) / Math.max(1, rows), maxLines: 3 })),
    { style: bs, max: theme.type.body * unit, min: theme.type.small * unit * 0.85 },
  );
  const leftFits = fits.slice(0, props.left.points.length);
  const rightFits = fits.slice(props.left.points.length);
  // 第 k 行两边对齐：行高取两边较高的一个
  const rowH = Array.from({ length: rows }, (_, k) => Math.max(leftFits[k]?.height ?? 0, rightFits[k]?.height ?? 0));
  // 两栏按内容收紧（同高），整组在区域里垂直居中
  const need = 2 * pad + topBar + headH + g + rowH.reduce((x, y) => x + y, 0) + pGap * Math.max(0, rows - 1);
  const cardH = Math.min(a0.h, need);
  const blockH = side ? cardH : 2 * cardH + gap;
  const top = main.y + (main.h - blockH) * 0.4;
  const L = { x: a0.x, y: top, w: a0.w, h: cardH };
  const R = side ? { x: b0.x, y: top, w: b0.w, h: cardH } : { x: b0.x, y: top + cardH + gap, w: b0.w, h: cardH };
  const progress = useRevealProgress(frames);
  const [pt, pl, pr] = useRevealProgress([0, 3, 7]);
  const lh = fits[0]?.lineHeightPx ?? 0;

  const column = (s: Side, r: typeof a, color: string, sf: typeof leftFits, name: string, head: (typeof heads)[number], reveal: number) => {
    let y = headH + g;
    return (
      <Card rect={r} name={name} padding={pad} reveal={reveal} motion={name === 'left' ? 'right' : 'left'} style={{ borderTop: `${topBar}px solid ${color}` }}>
        <TextBlock fit={head} text={s.title} style={hs} rect={{ x: 0, y: 0, w: innerW, h: head.height }} color={color} />
        {s.points.map((text, k) => {
          const top = y;
          y += rowH[k] + pGap;
          return (
            <Box key={k} rect={{ x: 0, y: top, w: innerW, h: sf[k].height }} name={`${name}-${k + 1}`} reveal={progress[k]}>
              <Bullet x={0} y={(lh - marker) / 2} size={marker} color={color} />
              <TextBlock fit={sf[k]} text={text} style={bs} rect={{ x: marker + mGap, y: 0, w: innerW - marker - mGap, h: sf[k].height }} color={theme.colors.text} />
            </Box>
          );
        })}
      </Card>
    );
  };
  const vsSize = Math.min(gap * 0.9, 72 * unit);
  const vsX = side ? L.x + L.w + (gap - vsSize) / 2 : L.x + (L.w - vsSize) / 2;
  const vsY = side ? L.y + (L.h - vsSize) / 2 : L.y + L.h + (gap - vsSize) / 2;
  return (
    <>
      <SceneTitle layout={t} text={props.title} reveal={pt} />
      {column(props.left, L, theme.colors.accent, leftFits, 'left', heads[0], pl)}
      {column(props.right, R, theme.colors.accent2, rightFits, 'right', heads[1], pr)}
      <div
        data-vp-ignore="1"
        style={{
          position: 'absolute',
          left: vsX,
          top: vsY,
          width: vsSize,
          height: vsSize,
          borderRadius: '50%',
          backgroundColor: theme.colors.text,
          color: theme.colors.bg,
          fontFamily: hs.family,
          fontWeight: 800,
          fontSize: vsSize * 0.36,
          lineHeight: `${vsSize}px`,
          textAlign: 'center',
          opacity: pr,
        }}
      >
        VS
      </div>
      {vRect ? (
        <Box
          rect={vRect}
          name="verdict"
          reveal={progress[rows] ?? 0}
          style={{ borderRadius: theme.radius * unit, backgroundColor: withAlpha(theme.colors.accent, theme.dark ? 0.18 : 0.1), border: `${vBorder}px solid ${withAlpha(theme.colors.accent, 0.5)}`, boxSizing: 'border-box' }}
        >
          <TextBlock fit={vFit} text={verdict} style={hs} rect={{ x: 0, y: 0, w: vRect.w - 2 * vBorder, h: vRect.h - 2 * vBorder }} align="center" valign="center" color={theme.colors.text} />
        </Box>
      ) : null}
    </>
  );
};

/** 对比：左右两栏（竖屏上下），第 k 行两边的要点一起在 at[k] 或第 k 句出现；verdict 是最后出现的结论条（位置预留，不推挤两栏） */
export const Compare: React.FC<SceneProps<CompareProps>> = ({ props }) => {
  if (!props.left?.points || !props.right?.points) {
    throw new Error('Compare：left / right 需要 title 与 points');
  }
  const rows = Math.max(props.left.points.length, props.right.points.length);
  const cues: Array<string | undefined> = Array.from({ length: rows }, (_, i) => props.at?.[i]);
  if (props.verdict) {
    cues.push(props.verdictAt);
  }
  const frames = useRevealFrames(cues.length, cues);
  return (
    <Slide>
      <Body props={props} frames={frames} />
    </Slide>
  );
};
