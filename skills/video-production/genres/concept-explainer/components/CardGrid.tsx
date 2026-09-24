import React from 'react';
import {
  bodyStyle,
  Card,
  cardPadding,
  gridCells,
  gridLayout,
  headingStyle,
  Label,
  labelSize,
  NumberBadge,
  SceneTitle,
  Slide,
  TextBlock,
  useCurrentIndex,
  useRevealFrames,
  useRevealProgress,
  useSlide,
  useTextFitGroup,
  useTitleLayout,
} from '../../engine';
import type { Rect, SceneProps } from '../../engine';
import { pad2, requireList } from './common';

type CardItem = { title: string; text?: string; tag?: string };
export type CardGridProps = { title?: string; cards: CardItem[]; at?: string[]; columns?: number; numbered?: boolean };

const Body: React.FC<{ props: CardGridProps; frames: number[] }> = ({ props, frames }) => {
  const { frame, theme, unit } = useSlide();
  const cards = props.cards;
  const n = cards.length;
  const t = useTitleLayout(props.title);
  const body = t.body;
  const g = frame.gutter;
  const maxCols = props.columns ?? (frame.aspect === 'landscape' ? 4 : frame.aspect === 'square' ? 3 : 2);
  const target = frame.aspect === 'portrait' ? 1.5 : 1.15;
  const grid = gridCells(body, n, g, target, maxCols);
  const cell = grid.cells[0];
  const pad = cardPadding(theme, unit);
  const innerW = cell.w - 2 * pad;
  const innerH = cell.h - 2 * pad;
  const numbered = props.numbered ?? true;
  const hasTag = numbered || cards.some((c) => c.tag);
  const badge = Math.round(theme.type.h3 * unit * 1.05);
  const tagH = hasTag ? badge : 0;
  const gap = g * 0.6;
  const hs = headingStyle(theme);
  const bs = bodyStyle(theme);
  const heads = useTextFitGroup(
    cards.map((c) => ({ text: c.title, width: innerW, height: (innerH - tagH - gap) * 0.45, maxLines: 2 })),
    { style: hs, max: theme.type.h3 * unit, min: theme.type.body * unit * 0.8 },
  );
  const headH = Math.max(...heads.map((f) => f.height));
  const hasText = cards.some((c) => c.text);
  const texts = useTextFitGroup(
    cards.map((c) => ({ text: c.text ?? '', width: innerW, height: Math.max(1, innerH - tagH - gap - headH - gap * 0.6), maxLines: 8 })),
    { style: bs, max: theme.type.body * unit, min: theme.type.small * unit * 0.85 },
  );
  const textH = hasText ? Math.max(...texts.map((f) => f.height)) : 0;
  // 卡片高度按内容收紧（不拉满整块区域），整组在区域内居中
  const need = 2 * pad + tagH + (tagH ? gap : 0) + headH + (hasText ? gap * 0.6 + textH : 0);
  const cellH = Math.min(cell.h, Math.max(need, cell.w * 0.45));
  const gridH = grid.rows * cellH + (grid.rows - 1) * g;
  const area: Rect = { x: body.x, y: body.y + Math.max(0, (body.h - gridH) * 0.4), w: body.w, h: Math.min(body.h, gridH) };
  const cells = gridLayout(area, n, grid.cols, g).cells;
  const progress = useRevealProgress(frames);
  const current = useCurrentIndex(frames);
  const [pt] = useRevealProgress([0]);
  return (
    <>
      <SceneTitle layout={t} text={props.title} reveal={pt} />
      {cards.map((c, i) => {
        const r = cells[i];
        const on = i === current && n > 1;
        let y = 0;
        const tagRect = { x: 0, y, w: innerW, h: tagH };
        y += tagH + (tagH ? gap : 0);
        const hRect = { x: 0, y, w: innerW, h: heads[i].height };
        y += headH + gap * 0.6;
        const bRect = { x: 0, y, w: innerW, h: texts[i].height };
        return (
          <Card key={i} rect={r} name={`card-${i + 1}`} reveal={progress[i]} motion="pop" padding={pad} accent={on ? theme.colors.accent : undefined}>
            {c.tag ? (
              <Label rect={tagRect} text={c.tag} size={labelSize(theme, unit, 0.9)} />
            ) : numbered ? (
              <NumberBadge rect={{ x: 0, y: 0, w: badge, h: badge }} text={pad2(i + 1)} active={on || current < 0 || n === 1} />
            ) : null}
            <TextBlock fit={heads[i]} text={c.title} style={hs} rect={hRect} color={theme.colors.text} />
            {c.text ? <TextBlock fit={texts[i]} text={c.text} style={bs} rect={bRect} color={theme.colors.textMuted} /> : null}
          </Card>
        );
      })}
    </>
  );
};

/**
 * 卡片网格：2–8 张卡片（标题 + 说明），按画幅自动排成最合适的行列，依次弹出，当前卡片描边高亮。
 * 所有卡片同一字号；卡片高度按内容收紧后整组居中。tag 可替换左上角的序号。
 */
export const CardGrid: React.FC<SceneProps<CardGridProps>> = ({ props }) => {
  const cards = requireList<CardItem>(props.cards, 'cards', 'CardGrid');
  const frames = useRevealFrames(cards.length, props.at);
  return (
    <Slide>
      <Body props={{ ...props, cards }} frames={frames} />
    </Slide>
  );
};
