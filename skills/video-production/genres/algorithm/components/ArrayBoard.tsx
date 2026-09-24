// 数组板：一格一格画数组，用"可能区间"的收缩来讲二分（不依赖 trace，用来讲不变量和边界）。
// 图形骨架：格子 + 区间括号 + mid 指针 + 比较结论；被排除的格子直接暗掉，不需要文字解释。
import React from 'react';
import { Slide, useCurrentFrame, useCurrentIndex, useRevealFrames, useRevealProgress, useSceneText, useSlide, useTitleLayout, useVideoConfig, withAlpha } from './deps';
import type { SceneProps } from '../../engine';
import { Num } from './board';

export type BoardFrame = { at?: string; lo: number; hi: number; mid?: number; verdict?: 'lt' | 'gt' | 'eq' };
export type ArrayBoardProps = { title?: string; values: number[]; target?: number; targetLabel?: string; frames: BoardFrame[]; stuck?: boolean; question?: boolean; answer?: number };

const Body: React.FC<{ props: ArrayBoardProps }> = ({ props }) => {
  const { frame, theme, unit } = useSlide();
  const on = useSceneText();
  const t = useTitleLayout(on ? props.title : undefined);
  const body = t.body;
  const n = props.values.length;
  const frames = props.frames;
  const revFrames = useRevealFrames(frames.length, frames.map((f) => f.at));
  const prog = useRevealProgress(revFrames);
  const rawCur = useCurrentIndex(revFrames);
  const cur = Math.max(0, Math.min(rawCur, frames.length - 1));
  const p = rawCur < 0 ? 0 : Math.min(1, Math.max(0, prog[cur]));
  const prev = frames[Math.max(0, cur - 1)];
  const now = frames[cur];
  const loNow = prev.lo + (now.lo - prev.lo) * p;
  const hiNow = prev.hi + (now.hi - prev.hi) * p;

  const cellW = Math.max(24, Math.min((body.w / n) * 0.94, body.h * 0.4));
  const cellH = cellW;
  const rowW = cellW * n;
  const rowX = body.x + (body.w - rowW) / 2;
  const rowY = body.y + body.h * 0.36;
  const bw = Math.max(1, 1.5 * unit);
  const fs = cellW * 0.42;
  const ptrFs = Math.min(theme.type.small * unit, cellW * 0.34);
  const inside = (i: number) => i >= loNow - 0.5 && i <= hiNow + 0.5;
  const a = Math.max(0, Math.min(1, prog[cur] * 1.3));
  const midAt = now.mid;
  const midOk = midAt !== undefined && a > 0.15;
  const verdict = now.verdict;
  const gap = frame.gutter;
  // 缓慢呼吸：画面不会长时间完全静止（眨眼频率，不抢戏）
  const curFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const breath = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin((curFrame / Math.max(1, fps)) * Math.PI * 1.5));
  // 一道高光缓慢扫过数组：画面不会长时间静止，同时暗示"要看的就在这一段里"
  const sweep = (curFrame / Math.max(1, fps)) * 0.45;
  const glowAt = (i: number): number => {
    const t = (sweep + i / Math.max(1, n)) % 1;
    return Math.max(0, 1 - Math.abs(t - 0.5) * 6.4) * 0.26;
  };

  return (
    <>
      {/* 目标值：数字永远显示，说明文字在 sceneText=off 时隐藏 */}
      {props.target !== undefined ? (
        <div data-vp-box="board-target" data-vp-layer="overlay" style={{ position: 'absolute', left: body.x, top: body.y, display: 'flex', alignItems: 'center', gap: gap * 0.4 }}>
          <Num theme={theme} size={ptrFs * 1.5} color={theme.colors.accent2}>{(props.targetLabel ?? 'target') + ' = ' + props.target}</Num>
        </div>
      ) : null}
      {props.question ? (
        <div data-vp-box="board-question" data-vp-layer="overlay" style={{ position: 'absolute', left: body.x + body.w / 2 - cellW, top: body.y + body.h * 0.06, width: cellW * 2, textAlign: 'center' }}>
          <Num theme={theme} size={Math.min(theme.type.h2 * unit, body.h * 0.22)} color={theme.colors.accent2} style={{ opacity: breath }}>{'?'}</Num>
        </div>
      ) : null}
      {/* 格子 */}
      {props.values.map((v, i) => {
        const inR = inside(i);
        const isMid = midOk && i === Math.round(midAt as number);
        const isFound = props.answer === i;
        const bg = isFound ? theme.colors.accent : isMid ? withAlpha(theme.colors.accent, 0.22) : theme.colors.surface;
        const fg = isFound ? theme.colors.onAccent : inR ? theme.colors.text : withAlpha(theme.colors.textMuted, 0.45);
        const edge = isFound || isMid ? theme.colors.accent : withAlpha(theme.colors.border, inR ? 1 : 0.4);
        return (
          <div
            key={i}
            data-vp-box={'cell-' + i}
            style={{
              position: 'absolute',
              left: rowX + i * cellW,
              top: rowY,
              width: cellW,
              height: cellH,
              backgroundColor: bg,
              border: bw + 'px solid ' + edge,
              boxSizing: 'border-box',
              borderRadius: theme.radius * unit * 0.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: fg,
              opacity: inR ? 1 : 0.42,
              overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, backgroundColor: theme.colors.accent, opacity: inR ? glowAt(i) : 0, borderRadius: theme.radius * unit * 0.5 }} />
            <Num theme={theme} size={fs} color={fg}>{String(v)}</Num>
          </div>
        );
      })}
      {/* 可能区间括号 */}
      <div
        data-vp-box="board-range"
        data-vp-layer="overlay"
        style={{
          position: 'absolute',
          left: rowX + Math.max(0, loNow) * cellW,
          top: rowY + cellH + 10 * unit,
          width: Math.max(cellW * 0.4, (hiNow - loNow + 1) * cellW),
          height: Math.max(2, 3 * unit),
          backgroundColor: props.stuck ? theme.colors.danger : theme.colors.accent,
          borderRadius: 2,
          opacity: breath,
        }}
      />
      {/* 区间两端数字 */}
      <div data-vp-box="board-lo" data-vp-layer="overlay" style={{ position: 'absolute', left: Math.max(body.x, rowX + Math.max(0, Math.round(loNow)) * cellW - cellW * 0.6), top: rowY + cellH + 22 * unit, width: Math.min(cellW * 1.2, rowX + Math.max(0, Math.round(loNow)) * cellW + cellW * 0.6 - body.x), textAlign: 'center' }}>
        <Num theme={theme} size={ptrFs} color={theme.colors.accent}>{'lo'}</Num>
      </div>
      <div data-vp-box="board-hi" data-vp-layer="overlay" style={{ position: 'absolute', left: Math.max(body.x, rowX + Math.min(n - 1, Math.round(hiNow)) * cellW - cellW * 0.6), top: rowY + cellH + 22 * unit, width: Math.min(cellW * 1.2, body.x + body.w - Math.max(body.x, rowX + Math.min(n - 1, Math.round(hiNow)) * cellW - cellW * 0.6)), textAlign: 'center' }}>
        <Num theme={theme} size={ptrFs} color={theme.colors.accent}>{'hi'}</Num>
      </div>
      {/* mid 指针 */}
      {midOk ? (
        <div data-vp-box="board-mid" data-vp-layer="overlay" style={{ position: 'absolute', left: rowX + (midAt as number) * cellW - cellW * 0.7, top: rowY - 34 * unit, width: cellW * 1.4, textAlign: 'center' }}>
          <Num theme={theme} size={ptrFs} color={theme.colors.accent}>{'mid'}</Num>
        </div>
      ) : null}
      {/* 比较结论：箭头指向"答案在哪一半" */}
      {midOk && verdict ? (
        <div data-vp-box="board-verdict" data-vp-layer="overlay" style={{ position: 'absolute', left: rowX + (midAt as number) * cellW - cellW * 2, top: rowY - 78 * unit, width: cellW * 4, height: 34 * unit, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Num theme={theme} size={ptrFs * 1.35} color={verdict === 'eq' ? theme.colors.accent : theme.colors.warning}>
            {verdict === 'lt' ? 'a[mid] < target → 往右' : verdict === 'gt' ? 'a[mid] > target → 往左' : 'a[mid] = target'}
          </Num>
        </div>
      ) : null}
      {/* 死循环演示：区间不再收缩 */}
      {props.stuck ? (
        <div data-vp-box="board-stuck" data-vp-layer="overlay" style={{ position: 'absolute', left: rowX + rowW + gap, top: rowY, height: cellH, display: 'flex', alignItems: 'center' }}>
          <svg width={cellW * 1.6} height={cellW * 1.6} viewBox="0 0 100 100" aria-hidden>
            <path d="M78 30 A36 36 0 1 0 84 62" fill="none" stroke={theme.colors.danger} strokeWidth={9} strokeLinecap="round" />
            <polygon points="70,14 96,30 66,44" fill={theme.colors.danger} />
          </svg>
        </div>
      ) : null}
    </>
  );
};

export const ArrayBoard: React.FC<SceneProps<ArrayBoardProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
