import React from 'react';
import { fadeUp, fontStack, Stage, useProgressFrom, useTheme, useUnit } from '../../engine';
import type { SceneProps } from '../../engine';

export type TitleCardProps = { title: string; subtitle?: string; kicker?: string; align?: 'center' | 'left' };

/** 标题卡：片头、章节开头 */
export const TitleCard: React.FC<SceneProps<TitleCardProps>> = ({ props }) => {
  const theme = useTheme();
  const unit = useUnit();
  const p0 = useProgressFrom(0);
  const p1 = useProgressFrom(6);
  const p2 = useProgressFrom(12);
  const center = (props.align ?? 'center') === 'center';
  return (
    <Stage style={{ justifyContent: 'center', alignItems: center ? 'center' : 'flex-start', textAlign: center ? 'center' : 'left' }}>
      {props.kicker ? (
        <div style={{ fontSize: theme.type.h3 * unit * 0.8, color: theme.colors.accent, letterSpacing: '0.08em', marginBottom: 20 * unit, ...fadeUp(p0, 20 * unit) }}>
          {props.kicker}
        </div>
      ) : null}
      <div style={{ fontFamily: fontStack(theme.fonts.heading), fontSize: theme.type.display * unit, fontWeight: 800, lineHeight: 1.15, ...fadeUp(p1, 30 * unit) }}>
        {props.title}
      </div>
      {props.subtitle ? (
        <div style={{ marginTop: 28 * unit, fontSize: theme.type.h3 * unit, color: theme.colors.textMuted, ...fadeUp(p2, 20 * unit) }}>{props.subtitle}</div>
      ) : null}
    </Stage>
  );
};
