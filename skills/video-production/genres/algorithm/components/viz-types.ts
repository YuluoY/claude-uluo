// 可视化状态：trace 每一步记录的数据结构快照。组件按 type 选择画法。
import type { MarkName } from '../../engine/types';

export type Cell = number | string | null;

export type ArrayState = {
  type: 'array';
  values: Cell[];
  /** 下标 → 标记 */
  marks?: Record<string, MarkName>;
  /** 指针名 → 下标（画在格子上方的箭头，如 i、j、lo、hi） */
  pointers?: Record<string, number>;
  /** 每个元素的身份；给了就能在交换/移动时做位移动画 */
  ids?: Array<string | number>;
  /** 用柱高表示数值（排序类） */
  bars?: boolean;
  label?: string;
};

export type GridState = {
  type: 'grid';
  rows: Cell[][];
  /** "行,列" → 标记 */
  marks?: Record<string, MarkName>;
  rowLabels?: string[];
  colLabels?: string[];
  label?: string;
};

export type GraphNode = { id: string; label?: string; x?: number; y?: number };
export type GraphEdge = { from: string; to: string; weight?: number | string };

export type GraphState = {
  type: 'graph';
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed?: boolean;
  marks?: { nodes?: Record<string, MarkName>; edges?: Record<string, MarkName> };
  /** 节点旁的小标签（如当前最短距离） */
  badges?: Record<string, string>;
  label?: string;
};

export type TreeNode = { id: string; label: string; children?: Array<TreeNode | null> };

export type TreeState = {
  type: 'tree';
  root: TreeNode | null;
  marks?: Record<string, MarkName>;
  badges?: Record<string, string>;
  label?: string;
};

export type ListState = {
  type: 'stack' | 'queue';
  items: Cell[];
  marks?: Record<string, MarkName>;
  label?: string;
};

export type VizState = ArrayState | GridState | GraphState | TreeState | ListState;

/** 边的标记键：有向图 "a->b"，无向图 "a-b"（两个方向都会查） */
export const edgeKey = (from: string, to: string, directed: boolean): string => (directed ? `${from}->${to}` : `${from}-${to}`);
