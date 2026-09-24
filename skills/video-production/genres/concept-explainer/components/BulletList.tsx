import React from 'react';
import {
  Box,
  Bullet,
  bodyStyle,
  NumberBadge,
  SceneTitle,
  Slide,
  splitH,
  TextBlock,
  useCurrentIndex,
  useRevealFrames,
  useRevealProgress,
  useSlide,
  useTextFitGroup,
  useTitleLayout,
  withAlpha,
} from '../../engine';
import type { SceneProps } from '../../engine';
import { pad2, requireList } from './common';

export type BulletListProps = { title?: string; items: string[]; at?: string[]; numbered?: boolean; columns?: 1 | 2 };

export type ListBodyProps = {
  title?: string;
  items: string[];
  /** 每项出现的帧（相对镜头） */
  frames: number[];
  numbered: boolean;
  /** 高亮：'current' 当前（最后出现的）一项；数字为固定高亮第几项（从 0 开始）；null 不高亮 */
  highlight: 'current' | number | null;
  columns?: number;
};

/**
 * 列表版面：每项一行（序号徽标或圆点 + 文字），所有项用同一个字号，行高按内容算；
 * 位置从一开始就固定，逐项出现时不推挤其他项。项多时（横屏 ≥ 6 项）自动分两栏。
 */
export const ListBody: React.FC<ListBodyProps> = ({ title, items, frames, numbered, highlight, columns }) => {
  const { frame, theme, unit } = useSlide();
  const t = useTitleLayout(title);
  const body = t.body;
  const n = items.length;
  const g = frame.gutter;
  const gap = g * 0.45;
  const padX = 22 * unit;
  const padY = 12 * unit;
  const style = bodyStyle(theme);
  const minLine = theme.type.small * unit * 0.9 * style.lineHeight;
  // 一栏在最小字号下都放不下时分两栏（横屏 6 项以上也分两栏，行不至于太长）
  const oneColFits = n * (minLine + 2 * padY) + (n - 1) * gap <= body.h;
  const auto = (frame.aspect === 'landscape' && n >= 6) || (!oneColFits && n >= 2) ? 2 : 1;
  const cols = Math.max(1, Math.min(n, columns ?? auto));
  const perCol = Math.ceil(n / cols);
  const colRects = splitH(body, Array.from({ length: cols }, () => 1), g * 1.5);
  const rowMax0 = (body.h - gap * (perCol - 1)) / perCol;
  const marker = numbered ? Math.round(Math.min(theme.type.h3 * unit * 1.15, rowMax0 - 2 * padY)) : Math.round(12 * unit);
  const markerGap = 22 * unit;
  const textW = colRects[0].w - 2 * padX - marker - markerGap;
  const rowMax = rowMax0;
  const fits = useTextFitGroup(
    items.map((text) => ({ text, width: textW, height: rowMax - 2 * padY, maxLines: 3 })),
    { style, max: theme.type.h3 * unit, min: theme.type.small * unit * 0.9 },
  );
  const progress = useRevealProgress(frames);
  const current = useCurrentIndex(frames);
  const lh = fits[0]?.lineHeightPx ?? 0;
  // 标记与首行垂直居中对齐
  const markerY = padY + Math.max(0, (lh - marker) / 2);
  const textY = padY + Math.max(0, (marker - lh) / 2);
  const rowH = fits.map((f) => Math.max(textY + f.height, markerY + marker) + padY);
  const colH = Array.from({ length: cols }, (_, c) => {
    const hs = rowH.slice(c * perCol, (c + 1) * perCol);
    return hs.reduce((a, b) => a + b, 0) + gap * Math.max(0, hs.length - 1);
  });
  // 略高于正中（视觉中心）
  const y0 = body.y + Math.max(0, (body.h - Math.max(...colH)) * 0.4);
  const hi = highlight === 'current' ? current : highlight;
  const [pt] = useRevealProgress([0]);
  const rects = items.map((_, i) => {
    const c = Math.floor(i / perCol);
    let y = y0;
    for (let k = c * perCol; k < i; k++) {
      y += rowH[k] + gap;
    }
    return { x: colRects[c].x, y, w: colRects[c].w, h: rowH[i] };
  });
  return (
    <>
      <SceneTitle layout={t} text={title} reveal={pt} />
      {items.map((text, i) => {
        const r = rects[i];
        const on = hi === i;
        const dim = highlight === 'current' && current > i;
        return (
          <Box
            key={i}
            rect={r}
            name={`item-${i + 1}`}
            reveal={progress[i]}
            style={{
              borderRadius: theme.radius * unit,
              backgroundColor: on ? withAlpha(theme.colors.accent, theme.dark ? 0.16 : 0.1) : 'transparent',
              opacity: dim ? 0.62 : 1,
            }}
          >
            {numbered ? (
              <NumberBadge rect={{ x: padX, y: markerY, w: marker, h: marker }} text={pad2(i + 1)} active={on || hi === null} />
            ) : (
              <Bullet x={padX} y={padY + (lh - marker) / 2} size={marker} color={theme.colors.accent} />
            )}
            <TextBlock fit={fits[i]} text={text} style={style} rect={{ x: padX + marker + markerGap, y: textY, w: textW, h: fits[i].height }} color={theme.colors.text} />
          </Box>
        );
      })}
    </>
  );
};

/** 要点列表：随口播逐条出现，当前条目高亮。第 k 条在 at[k] 提示点或第 k 句开始时出现 */
export const BulletList: React.FC<SceneProps<BulletListProps>> = ({ props }) => {
  const items = requireList<string>(props.items, 'items', 'BulletList');
  const frames = useRevealFrames(items.length, props.at);
  return (
    <Slide>
      <ListBody title={props.title} items={items} frames={frames} numbered={Boolean(props.numbered)} highlight="current" columns={props.columns} />
    </Slide>
  );
};
