// 图形化路线图：把全片步骤画成 N 个图标块，按提示点逐个亮起。
// 先给全局地图（先行组织者），小结时用同一张图回收。文字只是标签，sceneText=off 时自动隐藏。
import React from 'react';
import { bodyStyle, rectStyle, Slide, splitH, TextBlock, useCurrentIndex, useRevealFrames, useRevealProgress, useSceneText, useSlide, useTextFitGroup, useTitleLayout, withAlpha } from './deps';
import type { SceneProps } from '../../engine';
import { Glyph, type GlyphKind } from './board';

export type RoadmapStep = { glyph: GlyphKind; label: string };
export type RoadmapProps = { title?: string; steps: RoadmapStep[]; at?: string[]; active?: number };

const Body: React.FC<{ props: RoadmapProps }> = ({ props }) => {
  const { frame, theme, unit } = useSlide();
  const on = useSceneText();
  const t = useTitleLayout(on ? props.title : undefined);
  const body = t.body;
  const g = frame.gutter;
  const steps = props.steps;
  const frames = useRevealFrames(steps.length, props.at);
  const prog = useRevealProgress(frames);
  const cur = useCurrentIndex(frames);
  const cols = splitH(body, steps.map(() => 1 as const), g * 0.9);
  const pad = Math.round(theme.space * unit * 1.15);
  const bw = Math.max(1, 1.5 * unit);
  const labelW = Math.max(20, cols[0].w - pad * 2);
  const labelH = Math.max(20, body.h * 0.26);
  const fits = useTextFitGroup(
    steps.map((s) => ({ text: s.label, width: labelW, height: labelH, maxLines: 2 })),
    { style: bodyStyle(theme, 600), max: theme.type.h3 * unit, min: theme.type.small * unit * 0.9 },
  );
  // 去掉文字时图标放大，画面不至于显得空
  const glyphSize = on ? Math.max(24, Math.min(cols[0].w * 0.44, body.h * 0.42)) : Math.max(24, Math.min(cols[0].w * 0.6, body.h * 0.6));
  return (
    <>
      {steps.map((s, i) => {
        const lit = props.active !== undefined ? i <= props.active : i <= cur;
        const now = props.active !== undefined ? i === props.active : i === cur;
        const edge = now ? theme.colors.accent : withAlpha(theme.colors.border, lit ? 1 : 0.55);
        return (
          <div
            key={i}
            data-vp-box={'step-' + (i + 1)}
            style={{
              ...rectStyle(cols[i]),
              backgroundColor: theme.colors.surface,
              border: bw + 'px solid ' + edge,
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: g * 0.7,
              padding: pad,
              opacity: 0.18 + 0.82 * prog[i],
            }}
          >
            <Glyph kind={s.glyph} size={glyphSize} theme={theme} active={lit} progress={now ? prog[i] : 1} />
            <TextBlock
              fit={fits[i]}
              text={s.label}
              style={bodyStyle(theme, now ? 700 : 500)}
              align="center"
              color={now ? theme.colors.accent : lit ? theme.colors.text : theme.colors.textMuted}
            />
          </div>
        );
      })}
    </>
  );
};

export const Roadmap: React.FC<SceneProps<RoadmapProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
