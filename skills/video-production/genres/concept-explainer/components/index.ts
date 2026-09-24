// concept-explainer 类型包：通用讲解场景。所有项目都会装它（片头、要点、对比这些镜头哪类视频都用得上）。
import type { SceneComponent } from '../../engine/types';
import { BarChart } from './BarChart';
import { BigNumber } from './BigNumber';
import { BulletList } from './BulletList';
import { CodeSnippet } from './CodeSnippet';
import { Compare } from './Compare';
import { Definition } from './Definition';
import { EventLine } from './EventLine';
import { FlowSteps } from './FlowSteps';
import { ImageFocus } from './ImageFocus';
import { Quote } from './Quote';
import { Statement } from './Statement';
import { TitleCard } from './TitleCard';

export const scenes: Record<string, SceneComponent> = {
  BarChart,
  BigNumber,
  BulletList,
  CodeSnippet,
  Compare,
  Definition,
  EventLine,
  FlowSteps,
  ImageFocus,
  Quote,
  Statement,
  TitleCard,
};

export { SceneTitle, SourceNote, useRevealedIndex } from './common';
