import React from 'react';
import { Box, bodyStyle, chapterSegments, headingStyle, Label, labelSize, Slide, splitH, TextBlock, useRevealProgress, useShot, useSlide, useTextFit, withAlpha } from '../../engine';
import type { SceneProps, TextStyle } from '../../engine';
import { pad2, requireText } from './common';

export type SectionProps = { title: string; subtitle?: string; number?: string; label?: string };

/** 本镜所在章节的序号（从 1 开始）；镜头没写 chapter 时为 null */
const useChapterNumber = (): string | null => {
  const shot = useShot();
  if (!shot.chapter) {
    return null;
  }
  const segs = chapterSegments();
  const i = segs.findIndex((s) => shot.from >= s.start && shot.from < s.end);
  return i >= 0 ? pad2(i + 1) : null;
};

const Body: React.FC<{ props: SectionProps; number: string | null }> = ({ props, number }) => {
  const { frame, theme, unit } = useSlide();
  const title = requireText(props.title, 'title', 'Section');
  const r = frame.content;
  const g = frame.gutter;
  const hs = headingStyle(theme);
  const bs = bodyStyle(theme);
  const ns: TextStyle = { ...hs, lineHeight: 1 };
  const text = theme.title.case === 'upper' ? title.toUpperCase() : title;
  const side = frame.aspect === 'landscape';
  const [numCol, textCol] = side ? splitH(r, [4, 8], g * 2) : [r, r];
  const nFit = useTextFit({ text: number ?? '', width: numCol.w, height: side ? r.h * 0.5 : r.h * 0.22, style: ns, max: theme.type.display * 1.9 * unit, min: theme.type.h2 * unit, maxLines: 1 });
  const tFit = useTextFit({ text, width: textCol.w, height: r.h * 0.45, style: hs, max: theme.type.h1 * 1.1 * unit, min: theme.type.h2 * 0.8 * unit, maxLines: 3, balance: true });
  const sub = props.subtitle ?? '';
  const sFit = useTextFit({ text: sub, width: textCol.w, height: r.h * 0.2, style: bs, max: theme.type.h3 * unit, min: theme.type.body * 0.8 * unit, maxLines: 3 });
  const [p0, p1, p2] = useRevealProgress([0, 5, 10]);
  const label = props.label ?? (number ? `CHAPTER ${number}` : '');
  const lH = label ? labelSize(theme, unit) * 1.5 : 0;

  const nH = number ? nFit.height : 0;
  if (side) {
    // 横屏：左栏大号序号，右栏标签 + 标题 + 副标题，两栏各自垂直居中
    const textH = lH + (lH ? g * 0.6 : 0) + tFit.height + (sub ? g + sFit.height : 0);
    let y = r.y + (r.h - textH) / 2;
    const lRect = { x: textCol.x, y, w: textCol.w, h: lH };
    y += lH + (lH ? g * 0.6 : 0);
    const tRect = { x: textCol.x, y, w: textCol.w, h: tFit.height };
    y += tFit.height + g;
    const sRect = { x: textCol.x, y, w: textCol.w, h: sFit.height };
    const nRect = { x: numCol.x, y: r.y + (r.h - nH) / 2, w: numCol.w, h: nH };
    return (
      <>
        {number ? (
          <Box rect={nRect} name="number" reveal={p0} motion="right">
            <TextBlock fit={nFit} text={number} style={ns} rect={{ x: 0, y: 0, w: nRect.w, h: nRect.h }} align="right" color={theme.colors.accent} />
          </Box>
        ) : null}
        <div data-vp-ignore="1" style={{ position: 'absolute', left: numCol.x + numCol.w + g, top: r.y + r.h * 0.2, width: Math.max(1, 2 * unit), height: r.h * 0.6 * p1, backgroundColor: withAlpha(theme.colors.text, 0.18) }} />
        {label ? <Label rect={lRect} text={label} name="label" reveal={p1} /> : null}
        <Box rect={tRect} name="title" reveal={p1} motion="left">
          <TextBlock fit={tFit} text={text} style={hs} rect={{ x: 0, y: 0, w: tRect.w, h: tRect.h }} color={theme.colors.text} />
        </Box>
        {sub ? (
          <Box rect={sRect} name="subtitle" reveal={p2}>
            <TextBlock fit={sFit} text={sub} style={bs} rect={{ x: 0, y: 0, w: sRect.w, h: sRect.h }} color={theme.colors.textMuted} />
          </Box>
        ) : null}
      </>
    );
  }
  // 方形 / 竖屏：上下堆叠
  const total = nH + (nH ? g : 0) + lH + (lH ? g * 0.6 : 0) + tFit.height + (sub ? g + sFit.height : 0);
  let y = r.y + (r.h - total) / 2;
  const nRect = { x: r.x, y, w: r.w, h: nH };
  y += nH + (nH ? g : 0);
  const lRect = { x: r.x, y, w: r.w, h: lH };
  y += lH + (lH ? g * 0.6 : 0);
  const tRect = { x: r.x, y, w: r.w, h: tFit.height };
  y += tFit.height + g;
  const sRect = { x: r.x, y, w: r.w, h: sFit.height };
  return (
    <>
      {number ? (
        <Box rect={nRect} name="number" reveal={p0}>
          <TextBlock fit={nFit} text={number} style={ns} rect={{ x: 0, y: 0, w: nRect.w, h: nRect.h }} color={theme.colors.accent} />
        </Box>
      ) : null}
      {label ? <Label rect={lRect} text={label} name="label" reveal={p1} /> : null}
      <Box rect={tRect} name="title" reveal={p1}>
        <TextBlock fit={tFit} text={text} style={hs} rect={{ x: 0, y: 0, w: tRect.w, h: tRect.h }} color={theme.colors.text} />
      </Box>
      {sub ? (
        <Box rect={sRect} name="subtitle" reveal={p2}>
          <TextBlock fit={sFit} text={sub} style={bs} rect={{ x: 0, y: 0, w: sRect.w, h: sRect.h }} color={theme.colors.textMuted} />
        </Box>
      ) : null}
    </>
  );
};

/**
 * 章节页：大号章节序号 + 标题 + 副标题，不显示页眉。
 * number 缺省按镜头的 chapter 在全片中的顺序自动编号（01、02…）；label 缺省为 “CHAPTER 01”。
 */
export const Section: React.FC<SceneProps<SectionProps>> = ({ props }) => {
  const auto = useChapterNumber();
  const number = props.number ?? auto;
  return (
    <Slide chrome={false} sectionNumber={null}>
      <Body props={props} number={number} />
    </Slide>
  );
};
