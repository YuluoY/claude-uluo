// 代价曲线：把"看一眼要花多少次"画成两条曲线（线性查找 vs 二分查找）。
// 只有曲线、刻度与跟着走的数字——去掉文字照样看得出"一条陡、一条几乎平"。
import React from 'react';
import { Slide, useRevealFrames, useRevealProgress, useSceneText, useSlide, useTitleLayout, withAlpha } from './deps';
import type { SceneProps } from '../../engine';
import { Num } from './board';

export type CurveFn = 'n' | 'logn' | 'n2';
export type CurveSpec = { fn: CurveFn; color?: 'accent' | 'accent2' };
export type GrowthCurvesProps = { title?: string; maxN: number; curves: CurveSpec[]; at?: string[] };

const val = (fn: CurveFn, n: number): number => (fn === 'n' ? n : fn === 'n2' ? (n * (n + 1)) / 2 : Math.log2(Math.max(1, n)) + 1);

const Body: React.FC<{ props: GrowthCurvesProps }> = ({ props }) => {
  const { theme, unit } = useSlide();
  const on = useSceneText();
  const t = useTitleLayout(on ? props.title : undefined);
  const body = t.body;
  const rev = useRevealFrames(1, props.at);
  const prog = useRevealProgress(rev);
  const p = Math.min(1, Math.max(0, prog[0]));

  const padL = body.w * 0.06;
  const padR = Math.max(16 * unit, body.w * 0.014); // 终点圆点要留出半径，否则顶出内容区
  const padB = body.h * 0.14;
  const padT = body.h * 0.06;
  const w = body.w - padL - padR;
  const h = body.h - padB - padT;
  const maxN = Math.max(2, props.maxN);
  const maxV = Math.max.apply(null, props.curves.map((c) => val(c.fn, maxN)).concat([1]));
  const X = (nn: number) => padL + ((nn - 1) / (maxN - 1)) * w;
  const Y = (v: number) => padT + h - (v / maxV) * h;
  const nNow = 1 + p * (maxN - 1);
  const dim = withAlpha(theme.colors.textMuted, 0.4);
  const sw = Math.max(1, 1.2 * unit);

  const line = (fn: CurveFn) => {
    const pts: string[] = [];
    const steps = 60;
    for (let k = 0; k <= steps; k++) {
      const nn = 1 + (k / steps) * (nNow - 1);
      pts.push(X(nn) + ',' + Y(val(fn, nn)));
    }
    return pts.join(' ');
  };

  return (
    <div data-vp-box="growth" style={{ position: 'absolute', left: body.x, top: body.y, width: body.w, height: body.h }}>
      <svg width={body.w} height={body.h} style={{ position: 'absolute', left: 0, top: 0, display: 'block' }} aria-hidden>
        {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
          <line key={'g' + i} x1={padL} y1={padT + h * f} x2={padL + w} y2={padT + h * f} stroke={withAlpha(theme.colors.textMuted, 0.16)} strokeWidth={sw} />
        ))}
        <line x1={padL} y1={padT} x2={padL} y2={padT + h} stroke={dim} strokeWidth={sw * 1.4} />
        <line x1={padL} y1={padT + h} x2={padL + w} y2={padT + h} stroke={dim} strokeWidth={sw * 1.4} />
        {props.curves.map((c, i) => (
          <polyline
            key={'c' + i}
            points={line(c.fn)}
            fill="none"
            stroke={c.color === 'accent2' ? theme.colors.accent2 : theme.colors.accent}
            strokeWidth={sw * 5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {props.curves.map((c, i) => (
          <circle
            key={'d' + i}
            cx={X(nNow)}
            cy={Y(val(c.fn, nNow))}
            r={Math.max(4, 9 * unit)}
            fill={c.color === 'accent2' ? theme.colors.accent2 : theme.colors.accent}
          />
        ))}
      </svg>
      {props.curves.map((c, i) => {
        // 游标靠近右边界时，数字放到点的左侧，避免被画面边缘切掉
        const lw = 150 * unit;
        const nearRight = X(nNow) > padL + w * 0.7;
        return (
          <div
            key={'n' + i}
            style={{ position: 'absolute', left: nearRight ? X(nNow) - 14 * unit - lw : X(nNow) + 14 * unit, top: Y(val(c.fn, nNow)) - 16 * unit, width: lw, textAlign: nearRight ? 'right' : 'left' }}
          >
            <Num theme={theme} size={Math.min(theme.type.h3 * unit, body.h * 0.14)} color={c.color === 'accent2' ? theme.colors.accent2 : theme.colors.accent}>
              {String(Math.round(val(c.fn, nNow)))}
            </Num>
          </div>
        );
      })}
      {p > 0.15 ? (
        <div style={{ position: 'absolute', left: padL, top: padT + h + 10 * unit, width: w, textAlign: 'right' }}>
          <Num theme={theme} size={Math.min(theme.type.small * unit, body.h * 0.09)} color={theme.colors.textMuted}>{'n = ' + String(Math.round(nNow))}</Num>
        </div>
      ) : null}
    </div>
  );
};

export const GrowthCurves: React.FC<SceneProps<GrowthCurvesProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
