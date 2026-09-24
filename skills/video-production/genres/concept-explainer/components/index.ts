// concept-explainer 类型包：通用讲解场景。所有项目都会装它（片头、章节页、要点、对比这些镜头哪类视频都用得上）。
// 每个场景都在 <Slide> 上按版面几何算好位置与字号，版面检测会检查压盖、越界与溢出。
import type { SceneComponent } from '../../engine/types';
import { Agenda } from './Agenda';
import { BarChart } from './BarChart';
import { BigNumber } from './BigNumber';
import { BulletList } from './BulletList';
import { CardGrid } from './CardGrid';
import { CodeSnippet } from './CodeSnippet';
import { Compare } from './Compare';
import { Definition } from './Definition';
import { EventLine } from './EventLine';
import { FlowSteps } from './FlowSteps';
import { ImageFocus } from './ImageFocus';
import { ImageText } from './ImageText';
import { Quote } from './Quote';
import { Section } from './Section';
import { Statement } from './Statement';
import { StatGrid } from './StatGrid';
import { TitleCard } from './TitleCard';

export const scenes: Record<string, SceneComponent> = {
  Agenda,
  BarChart,
  BigNumber,
  BulletList,
  CardGrid,
  CodeSnippet,
  Compare,
  Definition,
  EventLine,
  FlowSteps,
  ImageFocus,
  ImageText,
  Quote,
  Section,
  Statement,
  StatGrid,
  TitleCard,
};

export { ListBody } from './BulletList';
export { byAspect, formatNumber, pad2, requireList, requireText } from './common';
