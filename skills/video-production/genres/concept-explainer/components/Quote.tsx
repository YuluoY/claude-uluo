import React from 'react';
import { fadeUp, fontStack, Stage, useProgressFrom, useTheme, useUnit } from '../../engine';
import type { SceneProps } from '../../engine';

export type QuoteProps = { text: string; by?: string; source?: string };

/** 引用：原话必须来自素材，by / source 写清出处 */
export const Quote: React.FC<SceneProps<QuoteProps>> = ({ props }) => {
  const theme = useTheme();
  const unit = useUnit();
  const p = useProgressFrom(0);
  const q = useProgressFrom(10);
  return (
    <Stage style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ fontFamily: fontStack(theme.fonts.heading), fontSize: theme.type.h2 * unit, lineHeight: 1.45, maxWidth: '86%', ...fadeUp(p, 24 * unit) }}>
        “{props.text}”
      </div>
      {props.by || props.source ? (
        <div style={{ marginTop: 32 * unit, fontSize: theme.type.body * unit, color: theme.colors.textMuted, ...fadeUp(q, 16 * unit) }}>
          —— {[props.by, props.source].filter(Boolean).join('，')}
        </div>
      ) : null}
    </Stage>
  );
};
