// 猜数字类比：一条 1..100 的刻度轴，每猜一次就把不可能的一半划掉（双通道编码的那个"画面"）。
// 图形骨架：刻度轴 + 不断收缩的区间括号 + 每次猜测的落点与方向箭头；文字只有数字。
import React from 'react';
import { Slide, useCurrentIndex, useRevealFrames, useRevealProgress, useSceneText, useSlide, useTitleLayout, withAlpha } from './deps';
import type { SceneProps } from '../../engine';
import { Num } from './board';

export type GuessVerdict = 'low' | 'high' | 'eq';
export type GuessStep = { value: number; verdict: GuessVerdict; at?: string };
export type GuessRangeProps = { title?: string; min: number; max: number; steps: GuessStep[] };

const Body: React.FC<{ props: GuessRangeProps }> = ({ props }) => {
  const { theme, unit } = useSlide();
  const on = useSceneText();
  const t = useTitleLayout(on ? props.title : undefined);
  const body = t.body;
  const steps = props.steps;
  const frames = useRevealFrames(steps.length, steps.map((s) => s.at));
  const prog = useRevealProgress(frames);
  const rawCur = useCurrentIndex(frames);
  const cur = Math.max(0, Math.min(rawCur, steps.length - 1));

  const after: Array<{ lo: number; hi: number }> = [];
  let lo = props.min;
  let hi = props.max;
  for (const s of steps) {
    if (s.verdict === 'high') {
      hi = s.value - 1;
    } else if (s.verdict === 'low') {
      lo = s.value + 1;
    } else {
      lo = s.value;
      hi = s.value;
    }
    after.push({ lo, hi });
  }
  const before = [{ lo: props.min, hi: props.max }].concat(after.slice(0, -1));
  const p = rawCur < 0 ? 0 : Math.min(1, Math.max(0, prog[cur]));
  const loNow = before[cur].lo + (after[cur].lo - before[cur].lo) * p;
  const hiNow = before[cur].hi + (after[cur].hi - before[cur].hi) * p;

  const span = Math.max(1, props.max - props.min);
  const px = (v: number) => ((v - props.min) / span) * body.w;
  const axisY = body.h * 0.68;
  const bracketY = body.h * 0.36;
  const probeTop = axisY - 118 * unit;
  const dotY = axisY - 76 * unit;
  const remain = Math.max(0, Math.round(hiNow) - Math.round(loNow) + 1);
  const sw = Math.max(1, 2 * unit);
  const tickN = 10;
  const ticks: number[] = [];
  for (let v = props.min; v <= props.max; v += tickN) {
    ticks.push(v);
  }
  const fs = Math.min(theme.type.body * unit, body.h * 0.16);
  const dotR = Math.max(3, 6 * unit);
  const dim = withAlpha(theme.colors.textMuted, 0.68);
  return (
    <div style={{ position: 'absolute', left: body.x, top: body.y, width: body.w, height: body.h }}>
      <svg width={body.w} height={body.h} style={{ position: 'absolute', left: 0, top: 0, display: 'block' }} aria-hidden>
        {ticks.map((v, i) => (
          <line key={'t' + i} x1={px(v)} y1={axisY} x2={px(v)} y2={axisY + (v % 50 === 0 ? 16 * unit : 9 * unit)} stroke={dim} strokeWidth={sw} />
        ))}
        <line x1={0} y1={axisY} x2={body.w} y2={axisY} stroke={dim} strokeWidth={sw} />
        {/* 已经排除的两段 */}
        <line x1={0} y1={bracketY} x2={Math.max(0, px(loNow))} y2={bracketY} stroke={withAlpha(theme.colors.textMuted, 0.25)} strokeWidth={sw * 2} />
        <line x1={Math.min(body.w, px(hiNow))} y1={bracketY} x2={body.w} y2={bracketY} stroke={withAlpha(theme.colors.textMuted, 0.25)} strokeWidth={sw * 2} />
        {/* 可能的区间 */}
        <line x1={px(loNow)} y1={bracketY} x2={px(hiNow)} y2={bracketY} stroke={theme.colors.accent} strokeWidth={sw * 4} strokeLinecap="round" />
        <line x1={px(loNow)} y1={bracketY - 12 * unit} x2={px(loNow)} y2={bracketY + 12 * unit} stroke={theme.colors.accent} strokeWidth={sw * 3} />
        <line x1={px(hiNow)} y1={bracketY - 12 * unit} x2={px(hiNow)} y2={bracketY + 12 * unit} stroke={theme.colors.accent} strokeWidth={sw * 3} />
        {/* 每次猜测 */}
        {steps.map((s, k) => {
          if (prog[k] <= 0) {
            return null;
          }
          const x = px(s.value);
          const now = k === cur;
          const col = now ? theme.colors.accent : dim;
          const dir = s.verdict === 'high' ? -1 : s.verdict === 'low' ? 1 : 0;
          return (
            <g key={'g' + k} opacity={Math.min(1, prog[k] * 1.4)}>
              <line x1={x} y1={axisY} x2={x} y2={probeTop} stroke={col} strokeWidth={sw * (now ? 2.2 : 1.2)} strokeDasharray={now ? undefined : (9 * unit) + ' ' + (8 * unit)} />
              <circle cx={x} cy={dotY} r={dotR * (now ? 1.5 : 1)} fill={col} />
              {dir !== 0 ? (
                <polygon
                  points={(x + dir * 52 * unit) + ',' + dotY + ' ' + (x + dir * 26 * unit) + ',' + (dotY - 20 * unit) + ' ' + (x + dir * 26 * unit) + ',' + (dotY + 20 * unit)}
                  fill={col}
                />
              ) : (
                <polyline
                  points={(x - 20 * unit) + ',' + dotY + ' ' + (x - 5 * unit) + ',' + (dotY + 18 * unit) + ' ' + (x + 24 * unit) + ',' + (dotY - 26 * unit)}
                  fill="none"
                  stroke={theme.colors.accent}
                  strokeWidth={sw * 3.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </g>
          );
        })}
      </svg>
      {/* 猜测的数字 */}
      {steps.map((s, k) =>
        prog[k] <= 0 ? null : (
          <div key={'v' + k} style={{ position: 'absolute', left: px(s.value) - 40 * unit, top: axisY + 20 * unit, width: 80 * unit, textAlign: 'center' }}>
            <Num theme={theme} size={fs} color={k === cur ? theme.colors.accent : theme.colors.textMuted}>{String(s.value)}</Num>
          </div>
        ),
      )}
      {/* 当前区间的两端 */}
      <div style={{ position: 'absolute', left: Math.max(0, px(loNow) - 44 * unit), top: bracketY - 62 * unit, width: 88 * unit, textAlign: 'center' }}>
        <Num theme={theme} size={fs * 0.85} color={theme.colors.accent}>{String(Math.round(loNow))}</Num>
      </div>
      <div style={{ position: 'absolute', left: Math.min(body.w - 88 * unit, px(hiNow) - 44 * unit), top: bracketY - 62 * unit, width: 88 * unit, textAlign: 'center' }}>
        <Num theme={theme} size={fs * 0.85} color={theme.colors.accent}>{String(Math.round(hiNow))}</Num>
      </div>
      {/* 范围里还剩几个数：这是"每猜一次少一半"的量化证据 */}
      <div style={{ position: 'absolute', left: Math.max(0, px((loNow + hiNow) / 2) - 90 * unit), top: bracketY - 132 * unit, width: 180 * unit, textAlign: 'center' }}>
        <Num theme={theme} size={fs * 1.25} color={theme.colors.text}>{String(remain)}</Num>
      </div>
    </div>
  );
};

export const GuessRange: React.FC<SceneProps<GuessRangeProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
