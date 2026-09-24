// 按 type 分发到具体的可视化组件。
import React from 'react';
import { ArrayViz } from './ArrayViz';
import { GraphViz } from './GraphViz';
import { GridViz } from './GridViz';
import { ListViz } from './ListViz';
import { TreeViz } from './TreeViz';
import type { ArrayState, GraphState, GridState, ListState, TreeState, VizState } from './viz-types';

type Props = { state: VizState; prev: VizState | null; progress: number; width: number; height: number };

export const VizPanel: React.FC<Props> = ({ state, prev, progress, width, height }) => {
  const same = prev && prev.type === state.type ? prev : null;
  switch (state.type) {
    case 'array':
      return <ArrayViz state={state} prev={same as ArrayState | null} progress={progress} width={width} height={height} />;
    case 'grid':
      return <GridViz state={state} prev={same as GridState | null} progress={progress} width={width} height={height} />;
    case 'graph':
      return <GraphViz state={state} prev={same as GraphState | null} progress={progress} width={width} height={height} />;
    case 'tree':
      return <TreeViz state={state} prev={same as TreeState | null} progress={progress} width={width} height={height} />;
    case 'stack':
    case 'queue':
      return <ListViz state={state} prev={same as ListState | null} progress={progress} width={width} height={height} />;
    default: {
      const t = (state as { type?: string }).type;
      throw new Error(`未知的可视化类型 ${String(t)}（可用：array / grid / graph / tree / stack / queue）`);
    }
  }
};
