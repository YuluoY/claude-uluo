// 哈希桶：一排桶，桶顶是前缀和、桶里是"这个前缀和出现过几次"。
// need 命中哪个桶，就从里面拿走它的次数——一眼看懂"为什么一个数就能加好几个答案"。
import React from 'react';
import { Slide, useCurrentIndex, useRevealFrames, useRevealProgress, useSceneText, useSlide, useTitleLayout, withAlpha } from './deps';
import type { SceneProps } from '../../engine';
import { Num } from './board';

export type BucketState = { key: number; count: number };
export type BucketFrame = { at?: string; buckets: BucketState[]; need?: number; hit?: boolean; gained?: number };
export type BucketMapProps = { title?: string; frames: BucketFrame[] };

const Body: React.FC<{ props: BucketMapProps }> = ({ props }) => {
  const { theme, unit } = useSlide();
  const on = useSceneText();
  const t = useTitleLayout(on ? props.title : undefined);
  const body = t.body;
  const frames = props.frames;
  const revFrames = useRevealFrames(frames.length, frames.map((f) => f.at));
  const prog = useRevealProgress(revFrames);
  const rawCur = useCurrentIndex(revFrames);
  const cur = Math.max(0, Math.min(rawCur, frames.length - 1));
  const p = rawCur < 0 ? 0 : Math.min(1, Math.max(0, prog[cur]));
  const f = frames[cur];

  const keys: number[] = [];
  for (const fr of frames) {
    for (const b of fr.buckets) {
      if (keys.indexOf(b.key) < 0) {
        keys.push(b.key);
      }
    }
  }
  const m = Math.max(1, keys.length);
  const gap = Math.max(10, body.w * 0.02);
  const bW = Math.max(56, Math.min((body.w - gap * (m - 1)) / m, body.h * 0.62));
  const bH = Math.min(body.h * 0.6, bW * 1.2);
  const rowW = m * bW + (m - 1) * gap;
  const x0 = body.x + (body.w - rowW) / 2;
  const bY = body.y + Math.max(body.h * 0.14, bH * 0.26 + 10 * unit);
  const bw = Math.max(1, 1.5 * unit);
  const fs = bW * 0.34;
  const sw = Math.max(1, 2 * unit);
  const dot = Math.max(4, bW * 0.1);
  const need = f.need;
  const hitKey = need !== undefined ? keys.indexOf(need) : -1;

  return (
    <>
      {/* 桶 */}
      {keys.map((key, idx) => {
        const b = f.buckets.find((x) => x.key === key);
        const here = !!b;
        const isHit = hitKey === idx && here && f.hit !== false;
        const bx = x0 + idx * (bW + gap);
        return (
          <div key={key} data-vp-box={'bucket-' + idx} style={{ position: 'absolute', left: bx, top: bY - bH * 0.26, width: bW, height: bH * 1.26 }}>
            {/* 桶顶：前缀和 */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: bW,
                height: bH * 0.26,
                backgroundColor: isHit ? theme.colors.accent : here ? theme.colors.surfaceAlt : 'transparent',
                border: bw + 'px solid ' + (isHit ? theme.colors.accent : withAlpha(theme.colors.border, here ? 0.95 : 0.45)),
                borderBottom: 'none',
                boxSizing: 'border-box',
                borderTopLeftRadius: theme.radius * unit,
                borderTopRightRadius: theme.radius * unit,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Num theme={theme} size={fs * 0.62} color={isHit ? theme.colors.onAccent : here ? theme.colors.text : withAlpha(theme.colors.textMuted, 0.5)} style={{ lineHeight: 1 }}>
                {here ? String(key) : '·'}
              </Num>
            </div>
            {/* 桶身：次数 */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: bH * 0.26,
                width: bW,
                height: bH,
                backgroundColor: here ? withAlpha(isHit ? theme.colors.accent : theme.colors.surface, isHit ? 0.22 : 1) : 'transparent',
                border: bw + 'px solid ' + (isHit ? theme.colors.accent : withAlpha(theme.colors.border, here ? 0.95 : 0.45)),
                boxSizing: 'border-box',
                borderBottomLeftRadius: theme.radius * unit,
                borderBottomRightRadius: theme.radius * unit,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: bH * 0.05,
              }}
            >
              {here ? (
                <>
                  <div style={{ display: 'flex', gap: dot * 0.5, flexWrap: 'wrap', justifyContent: 'center', maxWidth: bW * 0.8 }}>
                    {Array.from({ length: Math.min(6, b!.count) }).map((_, q) => (
                      <div key={q} style={{ width: dot * 1.5, height: dot * 1.5, backgroundColor: isHit ? theme.colors.accent : theme.colors.accent2, borderRadius: 2 }} />
                    ))}
                  </div>
                  <Num theme={theme} size={fs * 0.58} color={isHit ? theme.colors.accent : theme.colors.textMuted} style={{ lineHeight: 1 }}>{String(b!.count)}</Num>
                </>
              ) : (
                <Num theme={theme} size={fs * 0.58} color={withAlpha(theme.colors.textMuted, 0.45)} style={{ lineHeight: 1 }}>{'空'}</Num>
              )}
            </div>
          </div>
        );
      })}
      {/* need 飞进命中的桶 */}
      {hitKey >= 0 ? (
        <svg data-vp-box="bucket-arrow" data-vp-layer="overlay" width={body.w} height={body.h} style={{ position: 'absolute', left: body.x, top: body.y, display: 'block' }} aria-hidden>
          <path
            d={'M ' + (body.w - 20 * unit) + ' ' + (bY + bH * 0.5 - body.y) + ' Q ' + (body.w * 0.5) + ' ' + Math.max(18 * unit, bY - bH * 0.6 - body.y) + ' ' + (x0 + hitKey * (bW + gap) + bW * 0.5 - body.x) + ' ' + Math.max(body.h * 0.05, bY - bH * 0.3 - body.y)}
            fill="none"
            stroke={theme.colors.warning}
            strokeWidth={sw * 2}
            strokeDasharray={(10 * unit) + ' ' + (8 * unit)}
            opacity={Math.min(1, p * 1.8)}
          />
        </svg>
      ) : null}
      {hitKey >= 0 ? (
        <div data-vp-box="bucket-need" data-vp-layer="overlay" style={{ position: 'absolute', left: body.x + body.w - 320 * unit, top: bY + bH * 0.5 - fs * 0.4, width: 320 * unit, textAlign: 'right' }}>
          <Num theme={theme} size={Math.min(bW * 0.3, body.h * 0.11)} color={theme.colors.warning}>{'need = ' + String(need)}</Num>
        </div>
      ) : null}
      {/* 这次拿到的答案个数 */}
      {f.gained !== undefined && f.gained > 0 ? (
        <div data-vp-box="bucket-gain" data-vp-layer="overlay" style={{ position: 'absolute', left: x0 + hitKey * (bW + gap) + bW * 0.5 - 90 * unit, top: bY + bH + 12 * unit, width: 180 * unit, textAlign: 'center', opacity: Math.min(1, p * 1.5) }}>
          <Num theme={theme} size={Math.min(theme.type.h3 * unit, bH * 0.3)} color={theme.colors.accent}>{'+' + String(f.gained)}</Num>
        </div>
      ) : null}
    </>
  );
};

export const BucketMap: React.FC<SceneProps<BucketMapProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
