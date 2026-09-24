// 前缀和之桥：上面是 nums，下面是 prefix（prefix[t] 对齐在 nums[t-1] 与 nums[t] 的缝上）。
// 两根落线从 prefix[i]、prefix[j] 垂到括号，括号上的差值就是 nums[i..j-1] 这一段的子数组和——整个算法的核心关系。
import React from 'react';
import { Slide, useCurrentIndex, useRevealFrames, useRevealProgress, useSceneText, useSlide, useTitleLayout, withAlpha } from './deps';
import type { SceneProps } from '../../engine';
import { Num } from './board';

export type BridgeFrame = { at?: string; i: number; j: number; mode?: 'build' | 'diff' };
export type PrefixBridgeProps = { title?: string; values: number[]; k?: number; frames: BridgeFrame[] };

const Body: React.FC<{ props: PrefixBridgeProps }> = ({ props }) => {
  const { theme, unit } = useSlide();
  const on = useSceneText();
  const t = useTitleLayout(on ? props.title : undefined);
  const body = t.body;
  const values = props.values;
  const n = values.length;
  const pre: number[] = [0];
  for (const v of values) {
    pre.push(pre[pre.length - 1] + v);
  }
  const frames = props.frames;
  const revFrames = useRevealFrames(frames.length, frames.map((f) => f.at));
  const prog = useRevealProgress(revFrames);
  const rawCur = useCurrentIndex(revFrames);
  const cur = Math.max(0, Math.min(rawCur, frames.length - 1));
  const p = rawCur < 0 ? 0 : Math.min(1, Math.max(0, prog[cur]));
  const f = frames[cur];
  const mode = f.mode ?? 'diff';
  const i = Math.max(0, Math.min(f.i, n));
  const j = Math.max(i, Math.min(f.j, n));

  const cellW = Math.max(30, Math.min(body.w / (n + 1.5), body.h * 0.3));
  const cellH = cellW * 0.92;
  const originX = body.x + (body.w - n * cellW) / 2;
  const numsY = body.y + body.h * 0.14;
  const prefixY = numsY + cellH + Math.max(20, body.h * 0.06);
  const bracketY = prefixY + cellH + Math.max(24, body.h * 0.075);
  const cx = (t2: number) => originX + t2 * cellW;
  const bw = Math.max(1, 1.5 * unit);
  const fs = cellW * 0.4;
  const sw = Math.max(1, 2 * unit);
  const sum = pre[j] - pre[i];
  const hit = props.k !== undefined && sum === props.k;
  const accent = theme.colors.accent;
  const windowOn = mode === 'diff';
  const shown = mode === 'build' ? j : n;
  const head = cx(j);
  return (
    <>
      {/* 子数组窗口 */}
      {windowOn && j > i ? (
        <div
          data-vp-box="bridge-window"
          data-vp-layer="overlay"
          style={{
            position: 'absolute',
            left: cx(i) - cellW / 2 + 2 * unit,
            top: numsY - 6 * unit,
            width: (j - i) * cellW - 4 * unit,
            height: cellH + 12 * unit,
            border: bw * 2 + 'px solid ' + accent,
            borderRadius: theme.radius * unit,
            backgroundColor: withAlpha(accent, 0.14),
            opacity: p,
          }}
        />
      ) : null}
      {/* nums 行 */}
      {values.map((v, t2) => {
        const inWin = windowOn && t2 >= i && t2 < j;
        return (
          <div
            key={'n' + t2}
            data-vp-box={'num-' + t2}
            style={{
              position: 'absolute',
              left: cx(t2) - cellW / 2 + 2 * unit,
              top: numsY,
              width: cellW - 4 * unit,
              height: cellH,
              backgroundColor: inWin ? withAlpha(accent, 0.3) : theme.colors.surface,
              border: bw + 'px solid ' + (inWin ? accent : withAlpha(theme.colors.border, 0.9)),
              boxSizing: 'border-box',
              borderRadius: theme.radius * unit * 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: windowOn && !inWin ? 0.5 : 1,
            }}
          >
            <Num theme={theme} size={fs} color={inWin ? theme.colors.text : theme.colors.textMuted}>{String(v)}</Num>
          </div>
        );
      })}
      {/* 下标 */}
      {values.map((_, t2) => (
        <div key={'ni' + t2} style={{ position: 'absolute', left: cx(t2) - cellW / 2, top: numsY - 26 * unit, width: cellW, textAlign: 'center' }}>
          <Num theme={theme} size={fs * 0.62} color={withAlpha(theme.colors.textMuted, 0.8)}>{String(t2)}</Num>
        </div>
      ))}
      {/* prefix 行：prefix[t] 对齐在 nums 的缝上 */}
      {pre.map((v, t2) => {
        const ready = t2 <= shown;
        const isI = windowOn && t2 === i;
        const isJ = windowOn && t2 === j;
        const on2 = isI || isJ;
        return (
          <div
            key={'p' + t2}
            data-vp-box={'pre-' + t2}
            style={{
              position: 'absolute',
              left: cx(t2) - cellW * 0.44,
              top: prefixY,
              width: cellW * 0.88,
              height: cellH,
              backgroundColor: on2 ? withAlpha(accent, 0.28) : ready ? theme.colors.surfaceAlt : 'transparent',
              border: bw * (on2 ? 2 : 1) + 'px ' + (ready ? 'solid' : 'dashed') + ' ' + (on2 ? accent : withAlpha(theme.colors.border, ready ? 0.95 : 0.5)),
              boxSizing: 'border-box',
              borderRadius: theme.radius * unit * 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: ready ? 0.2 + 0.8 * (t2 === shown ? p : 1) : 0.35,
            }}
          >
            <Num theme={theme} size={fs} color={on2 ? accent : ready ? theme.colors.textMuted : withAlpha(theme.colors.textMuted, 0.5)}>{ready ? String(v) : '·'}</Num>
          </div>
        );
      })}
      {/* 落线 + 括号 */}
      {windowOn ? (
        <svg data-vp-box="bridge-lines" data-vp-layer="overlay" width={body.w} height={body.h} style={{ position: 'absolute', left: body.x, top: body.y, display: 'block' }} aria-hidden>
          <line x1={cx(i) - body.x} y1={prefixY + cellH - body.y} x2={cx(i) - body.x} y2={bracketY - body.y} stroke={accent} strokeWidth={sw * 1.6} opacity={p} />
          <line x1={cx(j) - body.x} y1={prefixY + cellH - body.y} x2={cx(j) - body.x} y2={bracketY - body.y} stroke={accent} strokeWidth={sw * 1.6} opacity={p} />
          <path
            d={'M ' + (cx(i) - body.x) + ' ' + (bracketY - body.y - 14 * unit) + ' L ' + (cx(i) - body.x) + ' ' + (bracketY - body.y) + ' L ' + (cx(j) - body.x) + ' ' + (bracketY - body.y) + ' L ' + (cx(j) - body.x) + ' ' + (bracketY - body.y - 14 * unit)}
            fill="none"
            stroke={hit ? accent : theme.colors.warning}
            strokeWidth={sw * 2.4}
            opacity={p}
          />
        </svg>
      ) : null}
      {/* 差值 = 子数组和 */}
      {windowOn ? (
        <div data-vp-box="bridge-diff" data-vp-layer="overlay" style={{ position: 'absolute', left: (cx(i) + cx(j)) / 2 - 170 * unit, top: bracketY + 12 * unit, width: 340 * unit, textAlign: 'center', opacity: p }}>
          <Num theme={theme} size={Math.min(theme.type.h3 * unit, cellH * 0.8)} color={hit ? accent : theme.colors.text}>
            {String(pre[j]) + ' - ' + String(pre[i]) + ' = ' + String(sum)}
          </Num>
        </div>
      ) : null}
      {/* 当前前缀和（build 模式） */}
      {mode === 'build' ? (
        <div data-vp-box="bridge-current" data-vp-layer="overlay" style={{ position: 'absolute', left: Math.min(body.x + body.w - 260 * unit, head - 130 * unit), top: prefixY - Math.max(50, body.h * 0.1) * unit, width: 260 * unit, textAlign: 'center', opacity: p }}>
          <Num theme={theme} size={Math.min(theme.type.body * unit, cellH * 0.55)} color={accent}>{'prefix[' + String(j) + '] = ' + String(pre[j])}</Num>
        </div>
      ) : null}
    </>
  );
};

export const PrefixBridge: React.FC<SceneProps<PrefixBridgeProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
