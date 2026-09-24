import React from 'react';
import { fadeUp, fontStack, mixColor, Stage, useCueFrame, useProgressFrom, useTheme, useUnit } from '../../engine';
import type { SceneProps } from '../../engine';

export type StatementProps = { text: string; emphasis?: string[]; at?: string; align?: 'center' | 'left' };

/** 一句关键结论，大字居中；emphasis 里的词在 at 提示点（缺省镜头开头稍后）变成强调色 */
export const Statement: React.FC<SceneProps<StatementProps>> = ({ props }) => {
  const theme = useTheme();
  const unit = useUnit();
  const p = useProgressFrom(0);
  const at = useCueFrame(props.at ?? '', 8);
  const q = useProgressFrom(at);
  const parts: Array<{ t: string; em: boolean }> = [];
  const words = (props.emphasis ?? []).filter(Boolean);
  let rest = props.text;
  while (rest.length > 0) {
    let best: { i: number; w: string } | null = null;
    for (const w of words) {
      const i = rest.indexOf(w);
      if (i >= 0 && (best === null || i < best.i)) {
        best = { i, w };
      }
    }
    if (!best) {
      parts.push({ t: rest, em: false });
      break;
    }
    if (best.i > 0) {
      parts.push({ t: rest.slice(0, best.i), em: false });
    }
    parts.push({ t: best.w, em: true });
    rest = rest.slice(best.i + best.w.length);
  }
  const center = (props.align ?? 'center') === 'center';
  return (
    <Stage style={{ justifyContent: 'center', alignItems: center ? 'center' : 'flex-start', textAlign: center ? 'center' : 'left' }}>
      <div style={{ fontFamily: fontStack(theme.fonts.heading), fontSize: theme.type.h1 * unit, fontWeight: 800, lineHeight: 1.35, maxWidth: '90%', ...fadeUp(p, 26 * unit) }}>
        {parts.map((x, i) => (
          <span key={i} style={x.em ? { color: mixColor(theme.colors.text, theme.colors.accent, q) } : undefined}>
            {x.t}
          </span>
        ))}
      </div>
    </Stage>
  );
};
