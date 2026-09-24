// 树：叶子从左到右依次排开，父节点居于子节点中间；二叉树的空孩子占位但不画，左右位置不会错。
import React from 'react';
import { fontStack, mixColor, useTheme, useUnit } from '../../engine';
import { markColor, textOn } from './colors';
import type { TreeNode, TreeState } from './viz-types';

type Props = { state: TreeState; prev: TreeState | null; progress: number; width: number; height: number };

type Laid = { node: TreeNode; x: number; depth: number; parent: string | null };

const layoutTree = (root: TreeNode | null): { items: Laid[]; leaves: number; depth: number } => {
  const items: Laid[] = [];
  let leaf = 0;
  let maxDepth = 0;
  const walk = (n: TreeNode | null, depth: number, parent: string | null): number => {
    maxDepth = Math.max(maxDepth, depth);
    if (n === null) {
      const x = leaf;
      leaf += 1;
      return x;
    }
    const kids = n.children ?? [];
    let x: number;
    if (kids.length === 0 || kids.every((k) => k === null)) {
      x = leaf;
      leaf += 1;
    } else {
      const xs = kids.map((k) => walk(k, depth + 1, n.id));
      x = (Math.min(...xs) + Math.max(...xs)) / 2;
    }
    items.push({ node: n, x, depth, parent });
    return x;
  };
  walk(root, 0, null);
  return { items, leaves: Math.max(1, leaf), depth: maxDepth };
};

export const TreeViz: React.FC<Props> = ({ state, prev, progress, width, height }) => {
  const theme = useTheme();
  const unit = useUnit();
  const labelH = state.label ? theme.type.small * unit * 1.6 : 0;
  const { items, leaves, depth } = layoutTree(state.root);
  const h = height - labelH;
  const colW = width / leaves;
  const rowH = h / Math.max(1, depth + 1);
  const r = Math.max(10 * unit, Math.min(colW * 0.38, rowH * 0.32, 56 * unit));
  const px = (x: number) => colW * (x + 0.5);
  const py = (d: number) => rowH * (d + 0.5);
  const byId = new Map(items.map((it) => [it.node.id, it]));
  const fs = r * 0.8;
  return (
    <div style={{ position: 'relative', width, height }}>
      {state.label ? (
        <div style={{ position: 'absolute', left: 0, top: 0, fontSize: theme.type.small * unit, color: theme.colors.textMuted, fontFamily: fontStack(theme.fonts.body) }}>{state.label}</div>
      ) : null}
      <svg width={width} height={h} style={{ position: 'absolute', left: 0, top: labelH, overflow: 'visible' }}>
        {items.map((it) => {
          if (!it.parent) {
            return null;
          }
          const p = byId.get(it.parent);
          if (!p) {
            return null;
          }
          const mark = state.marks?.[it.node.id];
          const color = mark && mark !== 'muted' ? mixColor(theme.viz.edge, theme.viz.marks[mark], progress) : theme.viz.edge;
          return <line key={`e${it.node.id}`} x1={px(p.x)} y1={py(p.depth)} x2={px(it.x)} y2={py(it.depth)} stroke={color} strokeWidth={3 * unit} />;
        })}
        {items.map((it) => {
          const mark = state.marks?.[it.node.id];
          const fill = markColor(theme, mark, prev?.marks?.[it.node.id], progress);
          const badge = state.badges?.[it.node.id];
          return (
            <g key={it.node.id}>
              <circle cx={px(it.x)} cy={py(it.depth)} r={r} fill={fill} stroke={mark ? theme.viz.marks[mark] : theme.colors.border} strokeWidth={3 * unit} />
              <text x={px(it.x)} y={py(it.depth)} fill={textOn(theme, mark)} fontSize={fs} fontWeight={700} fontFamily={fontStack(theme.fonts.body)} textAnchor="middle" dominantBaseline="central">
                {it.node.label}
              </text>
              {badge !== undefined ? (
                <text x={px(it.x) + r * 1.15} y={py(it.depth) - r * 0.9} fill={theme.colors.accent} fontSize={fs * 0.7} fontFamily={fontStack(theme.fonts.mono)}>
                  {badge}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
