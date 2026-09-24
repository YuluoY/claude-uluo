import React from 'react';
import { Box, bodyStyle, headingStyle, Label, labelSize, monoStyle, Slide, splitH, TextBlock, useRevealFrames, useRevealProgress, useSlide, useTextFit, withAlpha } from '../../engine';
import type { Rect, SceneProps } from '../../engine';
import { requireText } from './common';

export type DefinitionProps = { term: string; definition: string; example?: string; alias?: string; label?: string; at?: string[] };

const Body: React.FC<{ props: DefinitionProps; frames: number[] }> = ({ props, frames }) => {
  const { frame, theme, unit } = useSlide();
  const term = requireText(props.term, 'term', 'Definition');
  const definition = requireText(props.definition, 'definition', 'Definition');
  const r = frame.content;
  const g = frame.gutter;
  const side = frame.aspect === 'landscape';
  const [left, right] = side ? splitH(r, [5, 7], g * 3) : [r, r];
  const hs = headingStyle(theme);
  const bs = bodyStyle(theme);
  const ms = monoStyle(theme);
  const label = props.label ?? '术语';
  const lH = labelSize(theme, unit) * 1.5;
  const tFit = useTextFit({ text: term, width: left.w, height: side ? left.h * 0.5 : r.h * 0.24, style: hs, max: theme.type.h1 * 1.1 * unit, min: theme.type.h3 * unit, maxLines: 3, balance: true });
  const alias = props.alias ?? '';
  const aFit = useTextFit({ text: alias, width: left.w, height: theme.type.body * unit * 3, style: ms, max: theme.type.body * unit * 0.9, min: theme.type.small * unit * 0.8, maxLines: 2 });
  const dFit = useTextFit({ text: definition, width: right.w, height: side ? right.h * 0.6 : r.h * 0.34, style: bs, max: theme.type.h3 * unit, min: theme.type.body * unit * 0.8, maxLines: 8 });
  const example = props.example ?? '';
  const exPad = 22 * unit;
  const exBar = 6 * unit;
  const exLabelH = labelSize(theme, unit) * 1.4;
  const exW = right.w - 2 * exPad - exBar;
  const eFit = useTextFit({ text: example, width: exW, height: side ? right.h * 0.28 : r.h * 0.18, style: bs, max: theme.type.body * unit, min: theme.type.small * unit * 0.85, maxLines: 5 });
  const [p0, p1, p2] = useRevealProgress([frames[0], frames[1], frames[2] ?? 0]);

  const exH = example ? 2 * exPad + exLabelH + g * 0.3 + eFit.height : 0;
  const termH = lH + g * 0.5 + tFit.height + (alias ? g * 0.4 + aFit.height : 0);
  const defH = dFit.height + (example ? g * 1.2 + exH : 0);
  let termY: number;
  let defY: number;
  if (side) {
    termY = left.y + (left.h - termH) / 2;
    defY = right.y + (right.h - defH) / 2;
  } else {
    const total = termH + g * 1.6 + defH;
    termY = r.y + (r.h - total) / 2;
    defY = termY + termH + g * 1.6;
  }
  const termRect: Rect = { x: left.x, y: termY, w: left.w, h: termH };
  const defRect: Rect = { x: right.x, y: defY, w: right.w, h: dFit.height };
  const exRect: Rect = { x: right.x, y: defY + dFit.height + g * 1.2, w: right.w, h: exH };
  return (
    <>
      {side ? <div data-vp-ignore="1" style={{ position: 'absolute', left: left.x + left.w + g * 1.5, top: r.y + r.h * 0.15, width: Math.max(1, 2 * unit), height: r.h * 0.7 * p1, backgroundColor: withAlpha(theme.colors.text, 0.16) }} /> : null}
      <Box rect={termRect} name="term" reveal={p0}>
        <Label rect={{ x: 0, y: 0, w: termRect.w, h: lH }} text={label} />
        <TextBlock fit={tFit} text={term} style={hs} rect={{ x: 0, y: lH + g * 0.5, w: termRect.w, h: tFit.height }} color={theme.colors.accent} />
        {alias ? <TextBlock fit={aFit} text={alias} style={ms} rect={{ x: 0, y: lH + g * 0.5 + tFit.height + g * 0.4, w: termRect.w, h: aFit.height }} color={theme.colors.textMuted} /> : null}
      </Box>
      <Box rect={defRect} name="definition" reveal={p1}>
        <TextBlock fit={dFit} text={definition} style={bs} rect={{ x: 0, y: 0, w: defRect.w, h: dFit.height }} color={theme.colors.text} />
      </Box>
      {example ? (
        <Box
          rect={exRect}
          name="example"
          reveal={p2}
          style={{ borderLeft: `${exBar}px solid ${theme.colors.accent2}`, backgroundColor: withAlpha(theme.colors.accent2, theme.dark ? 0.12 : 0.08), borderRadius: `0 ${theme.radius * unit}px ${theme.radius * unit}px 0`, boxSizing: 'border-box' }}
        >
          <Label rect={{ x: exPad, y: exPad, w: exW, h: exLabelH }} text="例" color={theme.colors.accent2} />
          <TextBlock fit={eFit} text={example} style={bs} rect={{ x: exPad, y: exPad + exLabelH + g * 0.3, w: exW, h: eFit.height }} color={theme.colors.textMuted} />
        </Box>
      ) : null}
    </>
  );
};

/**
 * 术语定义：术语（可带英文名 alias）→ 释义 → 例子依次出现。横屏左右分栏，方形与竖屏上下堆叠。
 * 讲解时先让观众见过现象再给术语。
 */
export const Definition: React.FC<SceneProps<DefinitionProps>> = ({ props }) => {
  const frames = useRevealFrames(props.example ? 3 : 2, props.at);
  return (
    <Slide>
      <Body props={props} frames={frames} />
    </Slide>
  );
};
