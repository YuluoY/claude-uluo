import React from 'react';
import { fadeUp, fontStack, Stage, useCueFrame, useProgressFrom, useTheme, useUnit } from '../../engine';
import type { SceneProps } from '../../engine';
import { requireText, SourceNote } from './common';

export type BigNumberProps = { value: number; decimals?: number; prefix?: string; suffix?: string; label: string; source: string; at?: string };

/** 大数字：从 0 数到 value。source 必填——数字必须来自素材，写明出处 */
export const BigNumber: React.FC<SceneProps<BigNumberProps>> = ({ props }) => {
  const theme = useTheme();
  const unit = useUnit();
  const source = requireText(props.source, 'source（数据来源）', 'BigNumber');
  const start = useCueFrame(props.at ?? '', 0);
  const p = useProgressFrom(start, theme.motion.durationSec * 2.2);
  const shown = (props.value * p).toFixed(props.decimals ?? 0);
  return (
    <Stage style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontFamily: fontStack(theme.fonts.heading), fontSize: theme.type.display * unit * 1.5, fontWeight: 800, color: theme.colors.accent, fontVariantNumeric: 'tabular-nums' }}>
        {props.prefix ?? ''}
        {shown}
        {props.suffix ?? ''}
      </div>
      <div style={{ marginTop: 24 * unit, fontSize: theme.type.h3 * unit, ...fadeUp(p, 16 * unit) }}>{props.label}</div>
      <SourceNote text={source} />
    </Stage>
  );
};
