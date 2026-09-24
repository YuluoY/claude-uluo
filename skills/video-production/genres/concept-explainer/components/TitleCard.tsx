import React from 'react';
import { Box, bodyStyle, headingStyle, Label, labelSize, Rule, Slide, TextBlock, useRevealProgress, useSlide, useTextFit } from '../../engine';
import type { SceneProps } from '../../engine';
import { byAspect, requireText } from './common';

export type TitleCardProps = { title: string; subtitle?: string; kicker?: string; align?: 'center' | 'left' };

const Body: React.FC<{ props: TitleCardProps }> = ({ props }) => {
  const { frame, theme, unit } = useSlide();
  const title = requireText(props.title, 'title', 'TitleCard');
  const r = frame.content;
  const center = (props.align ?? 'center') === 'center';
  const w = r.w * byAspect(frame.aspect, { landscape: 0.84, square: 0.94, portrait: 1 });
  const g = frame.gutter;
  const hs = headingStyle(theme);
  const text = theme.title.case === 'upper' ? title.toUpperCase() : title;
  const bs = bodyStyle(theme);
  const sub = props.subtitle ?? '';
  const sFit = useTextFit({ text: sub, width: w * 0.9, height: r.h * 0.2, style: bs, max: theme.type.h3 * unit, min: theme.type.body * 0.8 * unit, maxLines: 2, balance: true });
  const kSize = labelSize(theme, unit, 1.2);
  const kH = props.kicker ? kSize * 1.5 : 0;
  const ruleH = 6 * unit;
  // 标题只能用标签、副标题、间距之外剩下的高度
  const rest = r.h - kH - (kH ? g * 0.6 : 0) - (sub ? g * 2.4 + ruleH + sFit.height : 0);
  const tFit = useTextFit({ text, width: w, height: Math.min(r.h * 0.6, rest), style: hs, max: theme.type.display * unit, min: theme.type.h2 * 0.8 * unit, maxLines: 3, balance: true });
  const [p0, p1, p2] = useRevealProgress([0, 5, 11]);

  const parts = [kH, kH ? g * 0.6 : 0, tFit.height, sub ? g * 1.2 : 0, sub ? ruleH : 0, sub ? g * 1.2 : 0, sub ? sFit.height : 0];
  const total = parts.reduce((a, b) => a + b, 0);
  let y = r.y + (r.h - total) / 2;
  const x = center ? r.x + (r.w - w) / 2 : r.x;
  const kRect = { x, y, w, h: kH };
  y += kH + (kH ? g * 0.6 : 0);
  const tRect = { x, y, w, h: tFit.height };
  y += tFit.height + (sub ? g * 1.2 : 0);
  const ruleY = y;
  y += sub ? ruleH + g * 1.2 : 0;
  const sRect = { x: center ? x + (w - w * 0.9) / 2 : x, y, w: w * 0.9, h: sFit.height };
  const ruleW = 96 * unit;
  return (
    <>
      {props.kicker ? <Label rect={kRect} text={props.kicker} align={center ? 'center' : 'left'} size={kSize} name="kicker" reveal={p0} /> : null}
      <Box rect={tRect} name="title" reveal={p1}>
        <TextBlock fit={tFit} text={text} style={hs} rect={{ x: 0, y: 0, w: tRect.w, h: tRect.h }} align={center ? 'center' : 'left'} color={theme.colors.text} />
      </Box>
      {sub ? (
        <>
          <Rule x={center ? x + (w - ruleW) / 2 : x} y={ruleY} w={ruleW * p2} h={ruleH} />
          <Box rect={sRect} name="subtitle" reveal={p2}>
            <TextBlock fit={sFit} text={sub} style={bs} rect={{ x: 0, y: 0, w: sRect.w, h: sRect.h }} align={center ? 'center' : 'left'} color={theme.colors.textMuted} />
          </Box>
        </>
      ) : null}
    </>
  );
};

/** 标题卡：片头、结尾。不显示页眉；标题自动选字号（最多三行、行长平衡） */
export const TitleCard: React.FC<SceneProps<TitleCardProps>> = ({ props }) => (
  <Slide chrome={false} sectionNumber={null}>
    <Body props={props} />
  </Slide>
);
