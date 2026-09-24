import React from 'react';
import { Box, bodyStyle, headingStyle, Rule, Slide, TextBlock, useRevealProgress, useSlide, useTextFit, withAlpha } from '../../engine';
import type { SceneProps } from '../../engine';
import { byAspect, requireText } from './common';

export type QuoteProps = { text: string; by?: string; source?: string };

const Body: React.FC<{ props: QuoteProps }> = ({ props }) => {
  const { frame, theme, unit } = useSlide();
  const text = requireText(props.text, 'text', 'Quote');
  const r = frame.content;
  const g = frame.gutter;
  const w = r.w * byAspect(frame.aspect, { landscape: 0.78, square: 0.9, portrait: 1 });
  const hs = headingStyle(theme);
  const bs = bodyStyle(theme);
  const by = [props.by, props.source].filter(Boolean).join('，');
  const aFit = useTextFit({ text: by ? `—— ${by}` : '', width: w, height: theme.type.body * unit * 3.2, style: bs, max: theme.type.body * unit, min: theme.type.small * unit * 0.85, maxLines: 2, balance: true });
  const markH = theme.type.h1 * unit * 0.9;
  const qFit = useTextFit({ text, width: w, height: r.h - markH - (by ? aFit.height + 2 * g + 6 * unit : 0) - g, style: hs, max: theme.type.h2 * 1.1 * unit, min: theme.type.body * unit, maxLines: 7, balance: true });
  const [p0, p1] = useRevealProgress([0, 10]);
  const total = markH + g * 0.4 + qFit.height + (by ? 2 * g + 6 * unit + aFit.height : 0);
  const x = r.x + (r.w - w) / 2;
  let y = r.y + (r.h - total) * 0.45;
  const markY = y;
  y += markH + g * 0.4;
  const qRect = { x, y, w, h: qFit.height };
  y += qFit.height + g;
  const ruleY = y;
  y += 6 * unit + g;
  const aRect = { x, y, w, h: aFit.height };
  return (
    <>
      {/* 大引号：装饰层 */}
      <div
        data-vp-ignore="1"
        style={{
          position: 'absolute',
          left: x,
          top: markY,
          width: w,
          height: markH,
          textAlign: 'center',
          fontFamily: hs.family,
          fontWeight: 900,
          fontSize: markH * 1.9,
          lineHeight: `${markH * 1.5}px`,
          color: withAlpha(theme.colors.accent, 0.9),
          opacity: p0,
          overflow: 'hidden',
        }}
      >
        “
      </div>
      <Box rect={qRect} name="quote" reveal={p0}>
        <TextBlock fit={qFit} text={text} style={hs} rect={{ x: 0, y: 0, w: qRect.w, h: qRect.h }} align="center" color={theme.colors.text} />
      </Box>
      {by ? (
        <>
          <Rule x={x + w / 2 - 36 * unit} y={ruleY} w={72 * unit} opacity={p1} />
          <Box rect={aRect} name="attribution" reveal={p1}>
            <TextBlock fit={aFit} text={`—— ${by}`} style={bs} rect={{ x: 0, y: 0, w: aRect.w, h: aRect.h }} align="center" color={theme.colors.textMuted} />
          </Box>
        </>
      ) : null}
    </>
  );
};

/** 引用：原话必须来自素材，by / source 写清出处 */
export const Quote: React.FC<SceneProps<QuoteProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
