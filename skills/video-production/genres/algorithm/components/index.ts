// algorithm 类型包：算法逐行讲解 + 数据结构可视化（trace 驱动）+ 图形优先的概念场景。
import type { SceneComponent } from '../../engine/types';
import { AlgoScene } from './AlgoScene';
import { ArrayBoard } from './ArrayBoard';
import { BucketMap } from './BucketMap';
import { CodeBuild } from './CodeBuild';
import { GrowthCurves } from './GrowthCurves';
import { GuessRange } from './GuessRange';
import { Odometer } from './Odometer';
import { PrefixBridge } from './PrefixBridge';
import { RangeLadder } from './RangeLadder';
import { Roadmap } from './Roadmap';
import { WindowSweep } from './WindowSweep';

/** 可以在 storyboard 里直接用的场景 */
export const scenes: Record<string, SceneComponent> = {
  AlgoScene,
  CodeBuild,
  ArrayBoard,
  BucketMap,
  GrowthCurves,
  GuessRange,
  Odometer,
  PrefixBridge,
  RangeLadder,
  Roadmap,
  WindowSweep,
};

export { AlgoScene, type AlgoSceneProps } from './AlgoScene';
export { ArrayBoard, type ArrayBoardProps, type BoardFrame } from './ArrayBoard';
export { BucketMap, type BucketFrame, type BucketMapProps, type BucketState } from './BucketMap';
export { CodeBuild, type CodeBuildProps } from './CodeBuild';
export { GrowthCurves, type CurveFn, type CurveSpec, type GrowthCurvesProps } from './GrowthCurves';
export { GuessRange, type GuessRangeProps, type GuessStep, type GuessVerdict } from './GuessRange';
export { Odometer, type OdometerProps } from './Odometer';
export { PrefixBridge, type BridgeFrame, type PrefixBridgeProps } from './PrefixBridge';
export { RangeLadder, type LadderBar, type RangeLadderProps } from './RangeLadder';
export { Roadmap, type RoadmapProps, type RoadmapStep } from './Roadmap';
export { WindowSweep, type SweepRow, type WindowSweepProps } from './WindowSweep';
export { ArrayViz } from './ArrayViz';
export { Glyph, Num, numCss, type GlyphKind } from './board';
export { GraphViz } from './GraphViz';
export { GridViz } from './GridViz';
export { ListViz } from './ListViz';
export { TreeViz } from './TreeViz';
export { useTrace, type TraceView } from './useTrace';
export { VarsPanel } from './VarsPanel';
export { VizPanel } from './VizPanel';
export type * from './viz-types';
