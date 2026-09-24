// 字幕：按 captions.json 的字幕块逐帧显示。字幕块由 vp.py 按意群切好并对齐到词，这里只负责画。
// 描边用两层叠放（底层描边、上层填色），描边不会吃掉笔画内侧。
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { settings } from './data';
import { fontStack } from './theme';
import type { CaptionBlock, CaptionPiece, CaptionStyle } from './types';

export const findBlock = (blocks: CaptionBlock[], frame: number): CaptionBlock | null => {
  let lo = 0;
  let hi = blocks.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const b = blocks[mid];
    if (frame < b.startFrame) {
      hi = mid - 1;
    } else if (frame >= b.endFrame) {
      lo = mid + 1;
    } else {
      return b;
    }
  }
  return null;
};

type CaptionTextProps = {
  block: CaptionBlock;
  style: CaptionStyle;
  scale: number;
  /** 当前帧（逐词高亮用）；为 null 时不高亮 */
  frame: number | null;
};

const pieceColor = (p: CaptionPiece, style: CaptionStyle, frame: number | null): string | undefined => {
  if (!style.highlightWords || frame === null || p.startFrame === undefined || p.endFrame === undefined) {
    return undefined;
  }
  return frame >= p.startFrame && frame < p.endFrame ? style.highlightColor : undefined;
};

export const CaptionText: React.FC<CaptionTextProps> = ({ block, style, scale, frame }) => {
  const fontSize = style.fontSize * scale;
  const stroke = style.strokeWidth * scale;
  const common: React.CSSProperties = {
    gridArea: '1 / 1',
    fontFamily: fontStack(style.fontFamily),
    fontWeight: style.fontWeight,
    fontSize,
    lineHeight: style.lineHeight,
    textAlign: 'center',
    whiteSpace: 'pre',
  };
  const lines = (layer: 'stroke' | 'fill') =>
    block.lines.map((line, i) => (
      <div key={i}>
        {line.map((p, j) => (
          <span key={j} style={layer === 'fill' ? { color: pieceColor(p, style, frame) } : undefined}>
            {p.text}
          </span>
        ))}
      </div>
    ));
  return (
    <div
      style={{
        display: 'grid',
        padding: style.background ? `${fontSize * 0.18}px ${fontSize * 0.5}px` : 0,
        backgroundColor: style.background ?? undefined,
        borderRadius: style.background ? fontSize * 0.25 : 0,
      }}
    >
      {stroke > 0 ? (
        <div
          aria-hidden
          style={{
            ...common,
            color: style.strokeColor,
            WebkitTextStroke: `${stroke * 2}px ${style.strokeColor}`,
            textShadow: style.shadow ? `0 ${fontSize * 0.06}px ${fontSize * 0.2}px rgba(0,0,0,0.55)` : undefined,
          }}
        >
          {lines('stroke')}
        </div>
      ) : null}
      <div
        style={{
          ...common,
          color: style.color,
          textShadow: stroke <= 0 && style.shadow ? `0 ${fontSize * 0.06}px ${fontSize * 0.2}px rgba(0,0,0,0.55)` : undefined,
        }}
      >
        {lines('fill')}
      </div>
    </div>
  );
};

type CaptionLayerProps = {
  block: CaptionBlock | null;
  style: CaptionStyle;
  scale?: number;
  frame?: number | null;
};

/** 把一个字幕块放到画面底部（避开安全区）。scale 用于 footage 模式按源视频尺寸缩放 */
export const CaptionLayer: React.FC<CaptionLayerProps> = ({ block, style, scale = 1, frame = null }) => {
  const { height } = useVideoConfig();
  if (!block) {
    return null;
  }
  const bottom = ((style.bottomPct + settings.video.safeArea.bottom) / 100) * height;
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', pointerEvents: 'none' }}>
      <div style={{ marginBottom: bottom, maxWidth: `${style.maxWidthPct}%`, display: 'flex', justifyContent: 'center' }}>
        <CaptionText block={block} style={style} scale={scale} frame={frame} />
      </div>
    </AbsoluteFill>
  );
};

export const Captions: React.FC<{ blocks: CaptionBlock[]; style: CaptionStyle }> = ({ blocks, style }) => {
  const frame = useCurrentFrame();
  return <CaptionLayer block={findBlock(blocks, frame)} style={style} frame={frame} />;
};
