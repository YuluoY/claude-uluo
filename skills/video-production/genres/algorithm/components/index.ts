// algorithm 类型包：算法逐行讲解 + 数据结构可视化，trace 驱动。
import type { SceneComponent } from '../../engine/types';
import { AlgoScene } from './AlgoScene';
import { CodeBuild } from './CodeBuild';

/** 可以在 storyboard 里直接用的场景 */
export const scenes: Record<string, SceneComponent> = { AlgoScene, CodeBuild };

export { AlgoScene, type AlgoSceneProps } from './AlgoScene';
export { ArrayViz } from './ArrayViz';
export { CodeBuild, type CodeBuildProps } from './CodeBuild';
export { GraphViz } from './GraphViz';
export { GridViz } from './GridViz';
export { ListViz } from './ListViz';
export { TreeViz } from './TreeViz';
export { useTrace, type TraceView } from './useTrace';
export { VarsPanel } from './VarsPanel';
export { VizPanel } from './VizPanel';
export type * from './viz-types';
