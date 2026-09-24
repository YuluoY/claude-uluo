// 算法 trace 记录器。src/algo/<id>/trace.ts 这样写：
//
//   import { defineTrace } from '../../genres/algorithm/tracer';
//   export default defineTrace((t) => {
//     const a = [5, 2, 4];
//     t.step(1, { viz: { arr: t.array(a) }, vars: { n: a.length }, note: '初始数组' });
//     ...
//   });
//
// 规则
// - 行号从 1 开始，指向同目录 code.<扩展名>（展示给观众的代码）；一步可以高亮多行：t.step([3, 4], …)
// - viz 按键合并：只传变化了的结构，其余沿用上一步；vars 传了就整体替换，不传就沿用
// - 每一步都会深拷贝，之后再改原数组不影响已记录的步骤
// - Infinity / -Infinity / NaN 会记成 "∞" / "-∞" / "NaN"，方便显示
import type { MarkName } from '../../engine/types';
import type { ArrayState, Cell, GraphEdge, GraphNode, GraphState, GridState, ListState, TreeNode, TreeState, VizState } from './viz-types';

export type StepInput = {
  vars?: Record<string, unknown>;
  viz?: Record<string, VizState>;
  note?: string;
};

export type RecordedStep = {
  lines: number[];
  vars?: Record<string, unknown>;
  viz?: Record<string, VizState>;
  note?: string;
};

const sanitize = (v: unknown): unknown => {
  if (typeof v === 'number') {
    if (Number.isNaN(v)) {
      return 'NaN';
    }
    if (v === Infinity) {
      return '∞';
    }
    if (v === -Infinity) {
      return '-∞';
    }
    return v;
  }
  if (Array.isArray(v)) {
    return v.map(sanitize);
  }
  if (v instanceof Map) {
    return Object.fromEntries([...v.entries()].map(([k, x]) => [String(k), sanitize(x)]));
  }
  if (v instanceof Set) {
    return [...v].map(sanitize);
  }
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (x !== undefined && typeof x !== 'function') {
        out[k] = sanitize(x);
      }
    }
    return out;
  }
  if (v === undefined || typeof v === 'function' || typeof v === 'symbol') {
    return null;
  }
  return v;
};

export class Tracer {
  readonly steps: RecordedStep[] = [];
  private viz: Record<string, VizState> = {};
  private vars: Record<string, unknown> | undefined;

  step(lines: number | number[], input: StepInput = {}): void {
    const ls = (Array.isArray(lines) ? lines : [lines]).map((x) => {
      if (!Number.isInteger(x) || x < 1) {
        throw new Error(`t.step 的行号必须是从 1 开始的整数，收到 ${String(x)}`);
      }
      return x;
    });
    if (input.viz) {
      this.viz = { ...this.viz, ...(sanitize(input.viz) as Record<string, VizState>) };
    }
    if (input.vars) {
      this.vars = sanitize(input.vars) as Record<string, unknown>;
    }
    this.steps.push({
      lines: ls,
      vars: this.vars ? { ...this.vars } : undefined,
      viz: Object.keys(this.viz).length ? JSON.parse(JSON.stringify(this.viz)) : undefined,
      note: input.note,
    });
  }

  array(values: readonly unknown[], opts: Omit<ArrayState, 'type' | 'values'> = {}): ArrayState {
    return { type: 'array', values: values.map((x) => sanitize(x) as Cell), ...opts };
  }

  grid(rows: readonly (readonly unknown[])[], opts: Omit<GridState, 'type' | 'rows'> = {}): GridState {
    return { type: 'grid', rows: rows.map((r) => r.map((x) => sanitize(x) as Cell)), ...opts };
  }

  graph(nodes: GraphNode[], edges: GraphEdge[], opts: Omit<GraphState, 'type' | 'nodes' | 'edges'> = {}): GraphState {
    return { type: 'graph', nodes, edges, ...opts };
  }

  tree(root: TreeNode | null, opts: Omit<TreeState, 'type' | 'root'> = {}): TreeState {
    return { type: 'tree', root, ...opts };
  }

  /** 从任意二叉树对象构造 TreeState：id / label / left / right 由取值函数给出 */
  binaryTree<N>(
    root: N | null | undefined,
    get: { id: (n: N) => string | number; label: (n: N) => string | number; left: (n: N) => N | null | undefined; right: (n: N) => N | null | undefined },
    opts: Omit<TreeState, 'type' | 'root'> = {},
  ): TreeState {
    const conv = (n: N | null | undefined): TreeNode | null => {
      if (n === null || n === undefined) {
        return null;
      }
      const l = conv(get.left(n));
      const r = conv(get.right(n));
      return { id: String(get.id(n)), label: String(get.label(n)), children: l || r ? [l, r] : [] };
    };
    return { type: 'tree', root: conv(root), ...opts };
  }

  stack(items: readonly unknown[], opts: Omit<ListState, 'type' | 'items'> = {}): ListState {
    return { type: 'stack', items: items.map((x) => sanitize(x) as Cell), ...opts };
  }

  queue(items: readonly unknown[], opts: Omit<ListState, 'type' | 'items'> = {}): ListState {
    return { type: 'queue', items: items.map((x) => sanitize(x) as Cell), ...opts };
  }

  /** 生成 { 下标: 标记 }，便于写 marks */
  marks(entries: Array<[number | string, MarkName]>): Record<string, MarkName> {
    return Object.fromEntries(entries.map(([k, m]) => [String(k), m]));
  }
}

export type TraceDefinition = { run: () => RecordedStep[] };

export const defineTrace = (fn: (t: Tracer) => void): TraceDefinition => ({
  run: () => {
    const t = new Tracer();
    fn(t);
    return t.steps;
  },
});
