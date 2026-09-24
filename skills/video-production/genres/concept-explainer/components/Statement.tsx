import React from 'react';
import { Box, headingStyle, Label, labelSize, mixColor, Slide, TextBlock, useCueFrame, useProgressFrom, useRevealProgress, useSlide, useTextFit } from '../../engine';
import type { SceneProps } from '../../engine';
import { byAspect, requireText } from './common';

export type StatementProps = { text: string; emphasis?: string[]; at?: string; align?: 'center' | 'left'; kicker?: string };

const Body: React.FC<{ props: StatementProps }> = ({ props }) => {
  const { frame, theme, unit } = useSlide();
  const text = requireText(props.text, 'text', 'Statement');
  const r = frame.content;
  const g = frame.gutter;
  const center = (props.align ?? 'center') === 'center';
  const bar = center ? 0 : 10 * unit;
  const barGap = center ? 0 : 36 * unit;
  const w = r.w * byAspect(frame.aspect, { landscape: 0.84, square: 0.94, portrait: 1 }) - bar - barGap;
  const kH = props.kicker ? labelSize(theme, unit) * 1.5 : 0;
  const hs = headingStyle(theme);
  const fit = useTextFit({ text, width: w, height: (r.h - kH - (kH ? g : 0)) * 0.9, style: hs, max: theme.type.h1 * 1.1 * unit, min: theme.type.h3 * 0.8 * unit, maxLines: 6, balance: true });
  const at = useCueFrame(props.at ?? '', 10);
  const q = useProgressFrom(at);
  const [p0, p1] = useRevealProgress([0, 3]);
  const total = kH + (kH ? g : 0) + fit.height;
  const blockW = w + bar + barGap;
  const x = center ? r.x + (r.w - blockW) / 2 : r.x;
  const y = r.y + (r.h - total) / 2;
  const tRect = { x: x + bar + barGap, y: y + kH + (kH ? g : 0), w, h: fit.height };
  return (
    <>
      {props.kicker ? <Label rect={{ x: tRect.x, y, w, h: kH }} text={props.kicker} align={center ? 'center' : 'left'} name="kicker" reveal={p0} /> : null}
      {center ? null : (
        <div data-vp-ignore="1" style={{ position: 'absolute', left: x, top: tRect.y + fit.lineHeightPx * 0.12, width: bar, height: (fit.height - fit.lineHeightPx * 0.24) * p1, backgroundColor: theme.colors.accent }} />
      )}
      <Box rect={tRect} name="statement" reveal={p1}>
        <TextBlock
          fit={fit}
          text={text}
          style={hs}
          rect={{ x: 0, y: 0, w: tRect.w, h: tRect.h }}
          align={center ? 'center' : 'left'}
          color={theme.colors.text}
          emphasis={props.emphasis}
          emphasisColor={mixColor(theme.colors.text, theme.colors.accent, q)}
        />
      </Box>
    </>
  );
};

/** 一句关键结论，大字；字号自动取能放下的最大值。emphasis 里的词在 at 提示点（缺省镜头开头稍后）变成强调色 */
export const Statement: React.FC<SceneProps<StatementProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
