// 场景组件模板：props 来自 storyboard 的 source.props；时刻全部从镜头上下文取；位置全部从版面几何算。
//
// 写法要点（详见 references/scenes.md 与 references/design.md）：
// - 最外层用 <Slide>（背景、装饰、页眉），里面的组件用 useSlide() 取内容区 frame.content、主题与单位
// - 每块内容放进 <Box rect name> / <Card rect name>：矩形由 stackV / splitH / gridCells 等算出，不靠 margin 挤
// - 文字用 useTextFit / useTextFitGroup 算字号与断行，再用 TextBlock 画：保证放得下，放不下版面检测会报错
// - 入场动画用 Box 的 reveal（进度 0→1），元素位置一开始就固定，出现时不推挤别的内容
import React from 'react';
import { Box, bodyStyle, SceneTitle, Slide, stackV, TextBlock, useRevealFrames, useRevealProgress, useSlide, useTextFitGroup, useTitleLayout } from '../../engine';
import type { SceneProps } from '../../engine';

export type YourSceneProps = { title: string; items?: string[]; at?: string[] };

const Body: React.FC<{ props: YourSceneProps }> = ({ props }) => {
  const { frame, theme, unit } = useSlide();
  const items = props.items ?? [];
  const t = useTitleLayout(props.title);
  const frames = useRevealFrames(items.length, props.at);
  const progress = useRevealProgress(frames);
  const [pt] = useRevealProgress([0]);
  const rows = stackV(t.body, items.map(() => 'fill' as const), frame.gutter * 0.5);
  const style = bodyStyle(theme);
  const fits = useTextFitGroup(
    items.map((text, i) => ({ text, width: rows[i].w, height: rows[i].h, maxLines: 3 })),
    { style, max: theme.type.h3 * unit, min: theme.type.small * unit },
  );
  return (
    <>
      <SceneTitle layout={t} text={props.title} reveal={pt} />
      {items.map((text, i) => (
        <Box key={i} rect={rows[i]} name={`item-${i + 1}`} reveal={progress[i]}>
          <TextBlock fit={fits[i]} text={text} style={style} rect={{ x: 0, y: 0, w: rows[i].w, h: fits[i].height }} color={theme.colors.text} />
        </Box>
      ))}
    </>
  );
};

export const YourScene: React.FC<SceneProps<YourSceneProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
