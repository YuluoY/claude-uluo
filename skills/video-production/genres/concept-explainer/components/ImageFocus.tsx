import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { ease, fontStack, Stage, useTheme, useUnit, withAlpha } from '../../engine';
import type { SceneProps } from '../../engine';

type Focus = { x: number; y: number; w: number; h: number; at?: string; label?: string };
export type ImageFocusProps = { file: string; fit?: 'cover' | 'contain'; focus?: Focus[] };

/**
 * 图片局部放大：依次把镜头推到 focus 区域（x/y/w/h 为 0–1 的相对坐标），可带文字标注。
 * 第 k 个区域在 focus[k].at 提示点或第 k+1 句开始时推近。
 */
export const ImageFocus: React.FC<SceneProps<ImageFocusProps>> = ({ props, shot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const unit = useUnit();
  const focus = props.focus ?? [];
  const starts = focus.map((f, k) => {
    if (f.at) {
      const c = shot.cues[f.at];
      if (c === undefined) {
        throw new Error(`ImageFocus：镜头 ${shot.id} 没有提示点 ${f.at}`);
      }
      return c;
    }
    return shot.sentences[k + 1]?.startFrame ?? Math.round((shot.durationInFrames * (k + 1)) / (focus.length + 1));
  });
  const dur = Math.round(theme.motion.durationSec * 1.6 * fps);
  const full: Focus = { x: 0, y: 0, w: 1, h: 1 };
  let cur = full;
  let prev = full;
  let p = 1;
  let label: string | undefined;
  starts.forEach((s, k) => {
    if (frame >= s) {
      prev = k === 0 ? full : focus[k - 1];
      cur = focus[k];
      p = ease(theme, (frame - s) / dur);
      label = focus[k].label;
    }
  });
  const lerp = (a: number, b: number) => a + (b - a) * p;
  const r = { x: lerp(prev.x, cur.x), y: lerp(prev.y, cur.y), w: lerp(prev.w, cur.w), h: lerp(prev.h, cur.h) };
  const scale = 1 / Math.max(r.w, r.h);
  const tx = -(r.x + r.w / 2 - 0.5) * 100;
  const ty = -(r.y + r.h / 2 - 0.5) * 100;
  return (
    <Stage padding={0} style={{ overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `scale(${scale}) translate(${tx}%, ${ty}%)`, transformOrigin: '50% 50%' }}>
        <Img src={staticFile(props.file)} style={{ width: '100%', height: '100%', objectFit: props.fit ?? 'contain' }} />
      </AbsoluteFill>
      {label ? (
        <AbsoluteFill style={{ justifyContent: 'flex-start', alignItems: 'flex-start', padding: 64 * unit }}>
          <div style={{ padding: `${14 * unit}px ${24 * unit}px`, backgroundColor: withAlpha(theme.colors.bg, 0.82), borderLeft: `${6 * unit}px solid ${theme.colors.accent}`, fontFamily: fontStack(theme.fonts.body), fontSize: theme.type.h3 * unit, color: theme.colors.text, opacity: p }}>
            {label}
          </div>
        </AbsoluteFill>
      ) : null}
    </Stage>
  );
};
