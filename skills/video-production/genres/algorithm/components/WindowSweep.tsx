// 滑动窗口为什么在有负数时会失效：两行数据同步扫，各自一条"和值仪表"。
// 上排全是正数，窗口越长和只会越大（单调）；下排有负数，和会掉下去——单调性断了，双指针就没法用。
import React from 'react';
import { Slide, splitV, useRevealFrames, useRevealProgress, useSceneText, useSlide, useTitleLayout, withAlpha } from './deps';
import type { SceneProps } from '../../engine';
import { Num } from './board';

export type SweepRow = { values: number[]; tone: 'good' | 'bad' };
export type WindowSweepProps = { title?: string; k?: number; rows: SweepRow[]; at?: string[]; progress?: number };

const Body: React.FC<{ props: WindowSweepProps }> = ({ props }) => {
  const { frame, theme, unit } = useSlide();
  const on = useSceneText();
  const t = useTitleLayout(on ? props.title : undefined);
  const body = t.body;
  const rowsRect = splitV(body, props.rows.map(() => 1 as const), frame.gutter);
  const rev = useRevealFrames(1, props.at);
  const sweep = useRevealProgress(rev);
  const sweepProg = sweep[0];
  const sw = Math.max(1, 2 * unit);
  const dim = withAlpha(theme.colors.textMuted, 0.5);

  return (
    <>
      {props.rows.map((row, ri) => {
        const rect = rowsRect[ri];
        const n = row.values.length;
        const cum: number[] = [];
        let acc = 0;
        for (const v of row.values) {
          acc += v;
          cum.push(acc);
        }
        let mono = true;
        for (let q = 1; q < n; q++) {
          if (cum[q] < cum[q - 1]) {
            mono = false;
          }
        }
        const p = Math.min(1, Math.max(0, props.progress ?? sweepProg));
        const r = Math.min(n - 1, Math.floor(p * (n - 1) + 0.001));
        const cur = cum[r];
        const maxCum = Math.max(1, ...cum);
        const tone = row.tone === 'good' ? theme.colors.accent : theme.colors.danger;
        const cellW = Math.max(26, Math.min((rect.w * 0.82) / n, rect.h * 0.3));
        const cellH = cellW * 0.9;
        const rowW = n * cellW;
        const x0 = rect.x + (rect.w - rowW) / 2;
        const cellsY = rect.y + rect.h * 0.06;
        const gaugeY = cellsY + cellH + Math.max(18, rect.h * 0.12);
        const gaugeH = Math.max(8, rect.h * 0.12);
        const fs = cellW * 0.42;
        const gaugeW = rect.w * 0.78;
        const gaugeX = rect.x + (rect.w - gaugeW) / 2;
        return (
          <React.Fragment key={ri}>
            {row.values.map((v, q) => {
              const inWin = q <= r;
              return (
                <div
                  key={'c' + q}
                  data-vp-box={'sweep-' + ri + '-' + q}
                  style={{
                    position: 'absolute',
                    left: x0 + q * cellW + 2 * unit,
                    top: cellsY,
                    width: cellW - 4 * unit,
                    height: cellH,
                    backgroundColor: q === r ? withAlpha(tone, 0.42) : inWin ? withAlpha(tone, 0.18) : theme.colors.surface,
                    border: sw * (q === r ? 1.6 : 1) + 'px solid ' + (inWin ? tone : withAlpha(theme.colors.border, 0.8)),
                    boxSizing: 'border-box',
                    borderRadius: theme.radius * unit * 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: inWin ? 1 : 0.45,
                  }}
                >
                  <Num theme={theme} size={fs} color={inWin ? theme.colors.text : theme.colors.textMuted}>{String(v)}</Num>
                </div>
              );
            })}
            {/* 和值仪表 */}
            <div data-vp-box={'sweep-gauge-' + ri} data-vp-layer="overlay" style={{ position: 'absolute', left: gaugeX, top: gaugeY, width: gaugeW, height: gaugeH, backgroundColor: withAlpha(theme.colors.textMuted, 0.14), borderRadius: gaugeH / 2 }}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: Math.max(2, (Math.max(0, cur) / maxCum) * gaugeW), backgroundColor: tone, borderRadius: gaugeH / 2, opacity: 0.85 }} />
            </div>
            <div data-vp-box={'sweep-sum-' + ri} data-vp-layer="overlay" style={{ position: 'absolute', left: Math.min(rect.x + rect.w - 150 * unit, gaugeX + gaugeW + 12 * unit), top: gaugeY - gaugeH * 0.6, width: 150 * unit, textAlign: 'right' }}>
              <Num theme={theme} size={Math.min(theme.type.body * unit, gaugeH * 2)} color={tone}>{'sum = ' + String(cur)}</Num>
            </div>
            {/* 单调性指示灯 */}
            <div data-vp-box={'sweep-mark-' + ri} data-vp-layer="overlay" style={{ position: 'absolute', left: Math.max(rect.x, gaugeX - 74 * unit), top: gaugeY - gaugeH * 0.9, width: 62 * unit, height: 62 * unit }}>
              <svg width={62 * unit} height={62 * unit} viewBox="0 0 100 100" aria-hidden>
                <circle cx={50} cy={50} r={40} fill="none" stroke={mono ? theme.colors.accent : theme.colors.danger} strokeWidth={8} />
                {mono ? (
                  <polyline points="30,52 44,68 72,34" fill="none" stroke={theme.colors.accent} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <>
                    <line x1={32} y1={32} x2={68} y2={68} stroke={theme.colors.danger} strokeWidth={10} strokeLinecap="round" />
                    <line x1={68} y1={32} x2={32} y2={68} stroke={theme.colors.danger} strokeWidth={10} strokeLinecap="round" />
                  </>
                )}
              </svg>
            </div>
            {/* 当前这一步是涨还是跌 */}
            {r > 0 ? (
              <div data-vp-box={'sweep-arrow-' + ri} data-vp-layer="overlay" style={{ position: 'absolute', left: x0 + r * cellW - 26 * unit, top: Math.max(rect.y + 2 * unit, cellsY - 44 * unit), width: 60 * unit, textAlign: 'center' }}>
                <Num theme={theme} size={fs * 1.5} color={cum[r] >= cum[r - 1] ? theme.colors.accent : theme.colors.danger}>
                  {cum[r] >= cum[r - 1] ? '↑' : '↓'}
                </Num>
              </div>
            ) : null}
            <div data-vp-box={'sweep-k-' + ri} data-vp-layer="overlay" style={{ position: 'absolute', left: gaugeX, top: gaugeY + gaugeH + 8 * unit, width: gaugeW, textAlign: 'left' }}>
              <Num theme={theme} size={Math.min(theme.type.small * unit, gaugeH * 1.4)} color={dim}>{'k = ' + String(props.k ?? 0)}</Num>
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

export const WindowSweep: React.FC<SceneProps<WindowSweepProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
