// 里程表类比：一段路的长度 = 后面读数 − 前面读数。
// 这是"前缀和相减得到子数组和"的双通道编码锚点——只有两个读数窗、一条路、一个差值。
import React from 'react';
import { Slide, useRevealFrames, useRevealProgress, useSceneText, useSlide, useTitleLayout, withAlpha } from './deps';
import type { SceneProps } from '../../engine';
import { Num } from './board';

export type OdometerProps = { title?: string; a: number; b: number; max?: number; at?: string[] };

const Body: React.FC<{ props: OdometerProps }> = ({ props }) => {
  const { theme, unit } = useSlide();
  const on = useSceneText();
  const t = useTitleLayout(on ? props.title : undefined);
  const body = t.body;
  const a = Math.min(props.a, props.b);
  const b = Math.max(props.a, props.b);
  const maxV = Math.max(props.max ?? b, 1);
  const frames = useRevealFrames(3, props.at);
  const prog = useRevealProgress(frames);
  const p1 = Math.min(1, Math.max(0, prog[0]));
  const p2 = Math.min(1, Math.max(0, prog[1]));
  const p3 = Math.min(1, Math.max(0, prog[2]));

  const axisY = body.h * 0.66;
  const roadH = Math.max(6, 16 * unit);
  const winH = Math.min(body.h * 0.24, 118 * unit);
  const winW = Math.max(120 * unit, body.w * 0.2);
  const X = (v: number) => (v / maxV) * body.w;
  const fs = Math.min(theme.type.h3 * unit, winH * 0.5);
  const sw = Math.max(1, 2 * unit);
  const dim = withAlpha(theme.colors.textMuted, 0.55);
  const ticks: number[] = [];
  const step = Math.max(1, Math.round(maxV / 7));
  for (let v = 0; v <= maxV; v += step) {
    ticks.push(v);
  }
  return (
    <div data-vp-box="odometer" style={{ position: 'absolute', left: body.x, top: body.y, width: body.w, height: body.h }}>
      {/* 读数窗 A */}
      <div style={{ position: 'absolute', left: Math.max(0, X(a) - winW / 2), top: axisY - 46 * unit - winH, width: winW, height: winH, backgroundColor: theme.colors.surfaceAlt, border: sw * 1.5 + 'px solid ' + theme.colors.accent2, borderRadius: theme.radius * unit, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15 + 0.85 * p1 }}>
        <Num theme={theme} size={fs} color={theme.colors.accent2}>{String(a)}</Num>
      </div>
      {/* 读数窗 B */}
      <div style={{ position: 'absolute', left: Math.min(body.w - winW, X(b) - winW / 2), top: axisY - 46 * unit - winH, width: winW, height: winH, backgroundColor: theme.colors.surfaceAlt, border: sw * 1.5 + 'px solid ' + theme.colors.accent, borderRadius: theme.radius * unit, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.15 + 0.85 * p2 }}>
        <Num theme={theme} size={fs} color={theme.colors.accent}>{String(b)}</Num>
      </div>
      {/* 路 + 刻度 */}
      <svg width={body.w} height={body.h} style={{ position: 'absolute', left: 0, top: 0, display: 'block' }} aria-hidden>
        {ticks.map((v, i) => (
          <line key={'t' + i} x1={X(v)} y1={axisY} x2={X(v)} y2={axisY + 10 * unit} stroke={dim} strokeWidth={sw} />
        ))}
        <line x1={0} y1={axisY} x2={body.w} y2={axisY} stroke={dim} strokeWidth={sw * 1.6} />
        <line x1={X(a)} y1={axisY - 46 * unit} x2={X(a)} y2={axisY} stroke={theme.colors.accent2} strokeWidth={sw * 2} opacity={p1} />
        <line x1={X(b)} y1={axisY - 46 * unit} x2={X(b)} y2={axisY} stroke={theme.colors.accent} strokeWidth={sw * 2} opacity={p2} />
        {/* 这段路 */}
        <rect x={X(a)} y={axisY - roadH / 2} width={Math.max(0, X(b) - X(a))} height={roadH} fill={theme.colors.accent} opacity={p3} rx={roadH / 2} />
      </svg>
      {/* 差值 = 这一段路 */}
      <div style={{ position: 'absolute', left: (X(a) + X(b)) / 2 - 70 * unit, top: axisY + 18 * unit, width: 140 * unit, textAlign: 'center', opacity: p3 }}>
        <Num theme={theme} size={fs} color={theme.colors.text}>{String(b - a)}</Num>
      </div>
      <div style={{ position: 'absolute', left: (X(a) + X(b)) / 2 - 120 * unit, top: axisY + 18 * unit + fs * 1.5, width: 240 * unit, textAlign: 'center' }}>
        <Num theme={theme} size={Math.min(theme.type.small * unit, fs * 0.7)} color={theme.colors.textMuted}>{String(a) + ' → ' + String(b) + ' = ' + String(b - a)}</Num>
      </div>
    </div>
  );
};

export const Odometer: React.FC<SceneProps<OdometerProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
