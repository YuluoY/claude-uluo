import React from 'react';
import { useVideoConfig } from 'remotion';
import { chapterSegments, Slide, useSlide } from '../../engine';
import type { SceneProps } from '../../engine';
import { ListBody } from './BulletList';

export type AgendaProps = { title?: string; items?: string[]; highlight?: number; columns?: 1 | 2 };

const Body: React.FC<{ props: AgendaProps }> = ({ props }) => {
  const { fps } = useVideoConfig();
  const { theme } = useSlide();
  const items = props.items && props.items.length ? props.items : chapterSegments().map((s) => s.title).filter(Boolean);
  if (items.length === 0) {
    throw new Error('Agenda：没有 items，storyboard 里也没有给镜头写 chapter');
  }
  const stagger = Math.round(theme.motion.staggerSec * fps);
  const frames = items.map((_, i) => 4 + i * stagger);
  const hi = props.highlight !== undefined ? props.highlight - 1 : null;
  return <ListBody title={props.title ?? '目录'} items={items} frames={frames} numbered highlight={hi} columns={props.columns} />;
};

/** 目录：缺省列出全片的章节（storyboard 里镜头的 chapter），依次出现；highlight 从 1 开始，标出接下来要讲的一章 */
export const Agenda: React.FC<SceneProps<AgendaProps>> = ({ props }) => (
  <Slide>
    <Body props={props} />
  </Slide>
);
