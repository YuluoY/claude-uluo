import React from 'react';
import {
  Box,
  bodyStyle,
  fitNumberSize,
  headingStyle,
  NumberText,
  reserve,
  Rule,
  Slide,
  SourceNote,
  sourceNoteHeight,
  TextBlock,
  useCueFrame,
  useProgressFrom,
  useSlide,
  useTextFit,
} from '../../engine';
import type { SceneProps, TextStyle } from '../../engine';
import { formatNumber, requireText } from './common';

export type BigNumberProps = { value: number; decimals?: number; prefix?: string; suffix?: string; group?: boolean; label: string; source: string; at?: string };

const Body: React.FC<{ props: BigNumberProps }> = ({ props }) => {
  const { frame, theme, unit } = useSlide();
  const label = requireText(props.label, 'label', 'BigNumber');
  const source = requireText(props.source, 'source（数据来源）', 'BigNumber');
  if (typeof props.value !== 'number' || !Number.isFinite(props.value)) {
    throw new Error('BigNumber：value 必须是数字');
  }
  const g = frame.gutter;
  const [main, src] = reserve(frame.content, sourceNoteHeight(theme, unit) * 2, g * 0.5);
  const decimals = props.decimals ?? 0;
  const group = props.group ?? Math.abs(props.value) >= 10000;
  const final = formatNumber(props.value, decimals, group);
  const prefix = props.prefix ?? '';
  const suffix = props.suffix ?? '';
  const ns: TextStyle = { ...headingStyle(theme), lineHeight: 1.1 };
  const bs = bodyStyle(theme);
  const lFit = useTextFit({ text: label, width: main.w * 0.8, height: main.h * 0.25, style: bs, max: theme.type.h3 * unit, min: theme.type.body * unit * 0.8, maxLines: 2, balance: true });
  const ruleH = 6 * unit;
  const numMaxH = main.h - lFit.height - 2 * g - ruleH;
  const nf = fitNumberSize({ value: final, prefix, suffix, width: main.w * 0.92, height: Math.min(numMaxH, main.h * 0.6), style: ns, max: theme.type.display * 1.8 * unit, min: theme.type.h2 * unit });
  const numH = nf.fontSize * ns.lineHeight;
  const start = useCueFrame(props.at ?? '', 0);
  const p = useProgressFrom(start, theme.motion.durationSec * 2.4);
  const q = useProgressFrom(start + 6);
  const total = numH + g + ruleH + g + lFit.height;
  const y = main.y + (main.h - total) * 0.45;
  const numRect = { x: main.x, y, w: main.w, h: numH };
  const lRect = { x: main.x + (main.w - main.w * 0.8) / 2, y: y + numH + 2 * g + ruleH, w: main.w * 0.8, h: lFit.height };
  return (
    <>
      <NumberText
        rect={numRect}
        name="number"
        value={formatNumber(props.value * p, decimals, group)}
        final={final}
        prefix={prefix}
        suffix={suffix}
        fontSize={nf.fontSize}
        overflow={nf.overflow}
        style={ns}
        color={theme.colors.accent}
        affixColor={theme.colors.text}
      />
      <Rule x={main.x + main.w / 2 - 48 * unit} y={y + numH + g} w={96 * unit} h={ruleH} opacity={q} />
      <Box rect={lRect} name="label" reveal={q}>
        <TextBlock fit={lFit} text={label} style={bs} rect={{ x: 0, y: 0, w: lRect.w, h: lRect.h }} align="center" color={theme.colors.text} />
      </Box>
      <SourceNote rect={src} text={source} align="center" />
    </>
  );
};

/** 大数字：从 0 数到 value（数字位等宽，跳动时不晃）。source 必填——数字必须来自素材，写明出处 */
export const BigNumber: React.FC<SceneProps<BigNumberProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
