import React from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Box, bodyStyle, ease, fittedRect, inset, Slide, TextBlock, useImageSize, useShot, useSlide, useTextFit, withAlpha } from '../../engine';
import type { Rect, SceneProps } from '../../engine';
import { requireText } from './common';

type Focus = { x: number; y: number; w: number; h: number; at?: string; label?: string };
export type ImageFocusProps = { file: string; fit?: 'cover' | 'contain'; focus?: Focus[]; frame?: 'card' | 'bleed' };

const Body: React.FC<{ props: ImageFocusProps }> = ({ props }) => {
  const { frame: f, theme, unit } = useSlide();
  const shot = useShot();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const file = requireText(props.file, 'file', 'ImageFocus');
  const bleed = props.frame === 'bleed';
  const focus = props.focus ?? [];
  const starts = focus.map((fc, k) => {
    if (fc.at) {
      const c = shot.cues[fc.at];
      if (c === undefined) {
        throw new Error(`ImageFocus：镜头 ${shot.id} 没有提示点 ${fc.at}`);
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
  // 图片区域：card 放在内容区里（圆角卡片），bleed 铺满整个画布（标注仍放在内容区里）
  const area: Rect = bleed ? f.canvas : f.content;
  // focus 坐标相对图片本身：先算图片按 fit 放进框后的实际位置，把区域换算成框内坐标（整图 = 整个框）
  const size = useImageSize(staticFile(file));
  const fit = props.fit ?? 'contain';
  const shown = size ? fittedRect(area, size, fit) : { x: 0, y: 0, w: area.w, h: area.h };
  const toBox = (fc: Focus): Focus =>
    fc === full ? full : { x: (shown.x + fc.x * shown.w) / area.w, y: (shown.y + fc.y * shown.h) / area.h, w: (fc.w * shown.w) / area.w, h: (fc.h * shown.h) / area.h };
  const a = toBox(prev);
  const b = toBox(cur);
  const lerp = (u: number, v: number) => u + (v - u) * p;
  const r = { x: lerp(a.x, b.x), y: lerp(a.y, b.y), w: lerp(a.w, b.w), h: lerp(a.h, b.h) };
  // 按区域较长的一边放大（整个区域都留在框里），区域中心移到框中心
  const scale = 1 / Math.max(r.w, r.h);
  const tx = -(r.x + r.w / 2 - 0.5) * 100;
  const ty = -(r.y + r.h / 2 - 0.5) * 100;
  const bs = bodyStyle(theme, 600);
  const labelPad = 18 * unit;
  const maxLabelW = f.content.w * (f.aspect === 'portrait' ? 0.9 : 0.55);
  const lFit = useTextFit({ text: label ?? '', width: maxLabelW - 2 * labelPad, height: theme.type.h3 * unit * 3, style: bs, max: theme.type.h3 * unit, min: theme.type.body * unit * 0.8, maxLines: 2 });
  const inner = bleed ? f.content : inset(f.content, 24 * unit);
  const labelRect: Rect = { x: inner.x - area.x, y: inner.y - area.y, w: lFit.width + 2 * labelPad + 8 * unit, h: lFit.height + 2 * labelPad };
  return (
    <Box
      rect={area}
      name="image"
      bleed={bleed}
      style={bleed ? undefined : { borderRadius: theme.radius * unit, overflow: 'hidden', border: `${Math.max(1, 1.5 * unit)}px solid ${theme.colors.border}`, boxSizing: 'border-box', backgroundColor: theme.colors.surface }}
    >
      <div data-vp-clip="1" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale}) translate(${tx}%, ${ty}%)`, transformOrigin: '50% 50%' }}>
          <Img src={staticFile(file)} style={{ width: '100%', height: '100%', objectFit: fit }} />
        </div>
      </div>
      {label ? (
        <Box
          rect={labelRect}
          name="label"
          style={{ backgroundColor: withAlpha(theme.colors.bg, 0.86), borderLeft: `${8 * unit}px solid ${theme.colors.accent}`, borderRadius: theme.radius * unit * 0.5, boxSizing: 'border-box', opacity: p }}
        >
          <TextBlock fit={lFit} text={label} style={bs} rect={{ x: labelPad, y: labelPad, w: lFit.width + 1, h: lFit.height }} color={theme.colors.text} />
        </Box>
      ) : null}
    </Box>
  );
};

/**
 * 图片局部放大：依次把镜头推到 focus 区域（x/y/w/h 为相对图片本身的 0–1 坐标），可带文字标注。
 * 第 k 个区域在 focus[k].at 提示点或第 k+1 句开始时推近。frame=card（缺省）图片放在内容区的圆角框里；bleed 铺满画布。
 */
export const ImageFocus: React.FC<SceneProps<ImageFocusProps>> = ({ props }) => (
  <Slide chrome={props.frame !== 'bleed'} decor={props.frame !== 'bleed'}>
    <Body props={props} />
  </Slide>
);
