// 区间阶梯：每一步"还要看的格子数"画成一根横条，长度逐级减半。
// 不用文字也能看懂"砍一半"这件事——这是二分 O(log n) 的直觉来源。
import React from 'react';
import { bodyStyle, rectStyle, Slide, stackV, TextBlock, useRevealFrames, useRevealProgress, useSceneText, useSlide, useTextFitGroup, useTitleLayout, withAlpha } from './deps';
import type { SceneProps } from '../../engine';
import { Num } from './board';

export type LadderBar = { n: number; label?: string; at?: string };
export type RangeLadderProps = { title?: string; bars: LadderBar[]; stepLabel?: string };

const Body: React.FC<{ props: RangeLadderProps }> = ({ props }) => {
  const { frame, theme, unit } = useSlide();
  const on = useSceneText();
  const t = useTitleLayout(on ? props.title : undefined);
  const body = t.body;
  const g = frame.gutter;
  const bars = props.bars;
  const frames = useRevealFrames(bars.length, bars.map((b) => b.at));
  const prog = useRevealProgress(frames);
  const rows = stackV(body, bars.map(() => 'fill' as const), g * 0.55);
  const maxN = Math.max.apply(null, bars.map((b) => b.n).concat([1]));
  const fs = Math.min(theme.type.body * unit, rows[0].h * 0.5);
  // 去掉文字时横条占满整行
  const labelW = on ? body.w * 0.3 : 0;
  const fits = useTextFitGroup(
    bars.map((b) => ({ text: b.label ?? '', width: labelW, height: rows[0].h, maxLines: 1 })),
    { style: bodyStyle(theme, 500), max: theme.type.small * unit, min: theme.type.small * unit * 0.8 },
  );
  const trackW = body.w - labelW - g * 0.6;
  return (
    <>
      {bars.map((b, i) => {
        const w = Math.max(6, (b.n / maxN) * trackW * prog[i]);
        return (
          <div key={i} data-vp-box={'bar-' + (i + 1)} style={{ ...rectStyle(rows[i]), display: 'flex', alignItems: 'center', gap: g * 0.6, opacity: 0.15 + 0.85 * prog[i] }}>
            {on ? (
              <div style={{ width: labelW, display: 'flex', justifyContent: 'flex-end' }}>
                <TextBlock fit={fits[i]} text={b.label ?? ''} style={bodyStyle(theme, 500)} align="right" color={theme.colors.textMuted} />
              </div>
            ) : null}
            <div style={{ position: 'relative', width: trackW, height: Math.min(rows[i].h, fs * 1.9) }}>
              <div style={{ position: 'absolute', inset: 0, backgroundColor: withAlpha(theme.colors.textMuted, 0.16), borderRadius: theme.radius * unit * 0.6 }} />
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: w, backgroundColor: i === bars.length - 1 ? theme.colors.accent2 : theme.colors.accent, borderRadius: theme.radius * unit * 0.6, opacity: 0.85 }} />
              <div style={{ position: 'absolute', right: 8 * unit, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
                <Num theme={theme} size={fs} color={theme.colors.text}>{String(b.n)}</Num>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};

export const RangeLadder: React.FC<SceneProps<RangeLadderProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
