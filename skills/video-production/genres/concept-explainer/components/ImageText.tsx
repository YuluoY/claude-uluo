import React from 'react';
import { Img, staticFile } from 'remotion';
import {
  Box,
  Bullet,
  bodyStyle,
  headingStyle,
  Label,
  labelSize,
  Slide,
  splitH,
  splitV,
  TextBlock,
  useCurrentIndex,
  useRevealFrames,
  useRevealProgress,
  useSlide,
  useTextFit,
  useTextFitGroup,
} from '../../engine';
import type { Rect, SceneProps } from '../../engine';
import { requireText } from './common';

export type ImageTextProps = {
  file: string;
  title?: string;
  kicker?: string;
  text?: string;
  points?: string[];
  /** 图片在哪一侧（竖屏时 left = 上方） */
  side?: 'left' | 'right';
  fit?: 'cover' | 'contain';
  caption?: string;
  at?: string[];
};

const Body: React.FC<{ props: ImageTextProps; frames: number[] }> = ({ props, frames }) => {
  const { frame, theme, unit } = useSlide();
  const file = requireText(props.file, 'file', 'ImageText');
  const r = frame.content;
  const g = frame.gutter;
  const imgFirst = (props.side ?? 'left') === 'left';
  const horizontal = frame.aspect !== 'portrait';
  const parts = horizontal ? splitH(r, imgFirst ? [11, 9] : [9, 11], g * 2) : splitV(r, imgFirst ? [9, 11] : [11, 9], g * 1.5);
  const imgRect = imgFirst ? parts[0] : parts[1];
  const txt = imgFirst ? parts[1] : parts[0];
  const hs = headingStyle(theme);
  const bs = bodyStyle(theme);
  const kH = props.kicker ? labelSize(theme, unit) * 1.5 : 0;
  const title = props.title ?? '';
  const tFit = useTextFit({ text: theme.title.case === 'upper' ? title.toUpperCase() : title, width: txt.w, height: txt.h * 0.36, style: hs, max: theme.type.h2 * unit, min: theme.type.h3 * unit * 0.8, maxLines: 3, balance: true });
  const tH = title ? tFit.height : 0;
  const restH = txt.h - kH - (kH ? g * 0.5 : 0) - tH - (tH ? g : 0);
  const para = props.text ?? '';
  const pFit = useTextFit({ text: para, width: txt.w, height: Math.max(1, restH), style: bs, max: theme.type.body * unit * 1.05, min: theme.type.small * unit * 0.85, maxLines: 12 });
  const points = props.points ?? [];
  const marker = Math.round(10 * unit);
  const mGap = 18 * unit;
  const pg = g * 0.5;
  const ptFits = useTextFitGroup(
    points.map((text) => ({ text, width: txt.w - marker - mGap, height: Math.max(1, (restH - (para ? pFit.height + g : 0) - pg * (points.length - 1)) / Math.max(1, points.length)), maxLines: 3 })),
    { style: bs, max: theme.type.body * unit, min: theme.type.small * unit * 0.85 },
  );
  const pointsH = ptFits.reduce((a, f) => a + f.height, 0) + pg * Math.max(0, points.length - 1);
  const total = kH + (kH ? g * 0.5 : 0) + tH + (tH ? g : 0) + (para ? pFit.height : 0) + (para && points.length ? g : 0) + pointsH;
  let y = txt.y + (txt.h - total) / 2;
  const kRect: Rect = { x: txt.x, y, w: txt.w, h: kH };
  y += kH + (kH ? g * 0.5 : 0);
  const tRect: Rect = { x: txt.x, y, w: txt.w, h: tH };
  y += tH + (tH ? g : 0);
  const pRect: Rect = { x: txt.x, y, w: txt.w, h: para ? pFit.height : 0 };
  y += para ? pFit.height + (points.length ? g : 0) : 0;
  const ptRects = ptFits.map((f) => {
    const rr = { x: txt.x, y, w: txt.w, h: f.height };
    y += f.height + pg;
    return rr;
  });
  const [p0, p1, p2] = useRevealProgress([0, 4, 8]);
  const progress = useRevealProgress(frames);
  const current = useCurrentIndex(frames);
  const cap = props.caption ?? '';
  const capPad = 14 * unit;
  const cFit = useTextFit({ text: cap, width: imgRect.w - 2 * capPad, height: theme.type.small * unit * 3, style: bs, max: theme.type.small * unit, min: theme.type.small * unit * 0.7, maxLines: 2 });
  const lh = ptFits[0]?.lineHeightPx ?? 0;
  return (
    <>
      <Box
        rect={imgRect}
        name="image"
        reveal={p0}
        motion={horizontal ? (imgFirst ? 'right' : 'left') : 'up'}
        style={{ borderRadius: theme.radius * unit, overflow: 'hidden', backgroundColor: theme.colors.surface, border: `${Math.max(1, 1.5 * unit)}px solid ${theme.colors.border}`, boxSizing: 'border-box' }}
      >
        <div data-vp-clip="1" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <Img src={staticFile(file)} style={{ width: '100%', height: '100%', objectFit: props.fit ?? 'cover' }} />
        </div>
        {cap ? (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: cFit.height + 2 * capPad, background: `linear-gradient(to top, rgba(0,0,0,0.72), rgba(0,0,0,0))` }}>
            <TextBlock fit={cFit} text={cap} style={bs} rect={{ x: capPad, y: capPad, w: imgRect.w - 2 * capPad, h: cFit.height }} color="#FFFFFF" />
          </div>
        ) : null}
      </Box>
      {props.kicker ? <Label rect={kRect} text={props.kicker} name="kicker" reveal={p1} /> : null}
      {title ? (
        <Box rect={tRect} name="title" reveal={p1}>
          <TextBlock fit={tFit} text={theme.title.case === 'upper' ? title.toUpperCase() : title} style={hs} rect={{ x: 0, y: 0, w: tRect.w, h: tRect.h }} color={theme.colors.text} />
        </Box>
      ) : null}
      {para ? (
        <Box rect={pRect} name="text" reveal={p2}>
          <TextBlock fit={pFit} text={para} style={bs} rect={{ x: 0, y: 0, w: pRect.w, h: pRect.h }} color={theme.colors.textMuted} />
        </Box>
      ) : null}
      {points.map((text, i) => (
        <Box key={i} rect={ptRects[i]} name={`point-${i + 1}`} reveal={progress[i]} style={{ opacity: current > i ? 0.7 : 1 }}>
          <Bullet x={0} y={(lh - marker) / 2} size={marker} color={theme.colors.accent} />
          <TextBlock fit={ptFits[i]} text={text} style={bs} rect={{ x: marker + mGap, y: 0, w: txt.w - marker - mGap, h: ptFits[i].height }} color={theme.colors.text} />
        </Box>
      ))}
    </>
  );
};

/**
 * 图文：一侧图片（圆角框，可带图注），另一侧标题 + 段落 / 要点。横屏左右分栏，竖屏上下分栏。
 * 要点随口播逐条出现（at[k] 提示点或第 k 句）。
 */
export const ImageText: React.FC<SceneProps<ImageTextProps>> = ({ props }) => {
  const frames = useRevealFrames((props.points ?? []).length, props.at);
  return (
    <Slide>
      <Body props={props} frames={frames} />
    </Slide>
  );
};
