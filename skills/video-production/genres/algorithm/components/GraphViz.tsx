// 图：节点给了 x/y（0–1 归一化坐标）就按给定位置，否则按顺序排成一圈。边可带权重，有向图画箭头。
import React from 'react';
import { fontStack, mixColor, useTheme, useUnit } from '../../engine';
import { markColor, textOn } from './colors';
import { edgeKey, type GraphState } from './viz-types';

type Props = { state: GraphState; prev: GraphState | null; progress: number; width: number; height: number };

const positions = (state: GraphState, w: number, h: number, margin: number): Map<string, [number, number]> => {
  const out = new Map<string, [number, number]>();
  const all = state.nodes.every((n) => typeof n.x === 'number' && typeof n.y === 'number');
  const iw = Math.max(1, w - 2 * margin);
  const ih = Math.max(1, h - 2 * margin);
  if (all) {
    state.nodes.forEach((n) => out.set(n.id, [margin + (n.x as number) * iw, margin + (n.y as number) * ih]));
    return out;
  }
  const n = state.nodes.length;
  const r = Math.min(iw, ih) / 2;
  state.nodes.forEach((node, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(1, n);
    out.set(node.id, [w / 2 + r * Math.cos(a), h / 2 + r * Math.sin(a)]);
  });
  return out;
};

export const GraphViz: React.FC<Props> = ({ state, prev, progress, width, height }) => {
  const theme = useTheme();
  const unit = useUnit();
  const labelH = state.label ? theme.type.small * unit * 1.6 : 0;
  const h = height - labelH;
  const nodeR = Math.max(12 * unit, Math.min(width, h) * 0.065);
  const pos = positions(state, width, h, nodeR * 1.8);
  const directed = Boolean(state.directed);
  const edgeMark = (s: GraphState | null, from: string, to: string) => {
    const m = s?.marks?.edges;
    if (!m) {
      return undefined;
    }
    return m[edgeKey(from, to, directed)] ?? (directed ? undefined : m[edgeKey(to, from, false)]);
  };
  const fs = nodeR * 0.8;
  const arrow = 16 * unit;
  return (
    <div style={{ position: 'relative', width, height }}>
      {state.label ? (
        <div style={{ position: 'absolute', left: 0, top: 0, fontSize: theme.type.small * unit, color: theme.colors.textMuted, fontFamily: fontStack(theme.fonts.body) }}>{state.label}</div>
      ) : null}
      <svg width={width} height={h} style={{ position: 'absolute', top: labelH, left: 0, overflow: 'visible' }}>
        {state.edges.map((e, i) => {
          const a = pos.get(e.from);
          const b = pos.get(e.to);
          if (!a || !b) {
            return null;
          }
          const dx = b[0] - a[0];
          const dy = b[1] - a[1];
          const len = Math.max(1, Math.hypot(dx, dy));
          const ux = dx / len;
          const uy = dy / len;
          const x1 = a[0] + ux * nodeR;
          const y1 = a[1] + uy * nodeR;
          // 有向边：线段停在箭头底部，箭头尖端贴着目标节点边缘
          const tipX = b[0] - ux * nodeR;
          const tipY = b[1] - uy * nodeR;
          const x2 = directed ? tipX - ux * arrow : tipX;
          const y2 = directed ? tipY - uy * arrow : tipY;
          const mark = edgeMark(state, e.from, e.to);
          const prevMark = edgeMark(prev, e.from, e.to);
          const color = mixColor(prevMark ? theme.viz.marks[prevMark] : theme.viz.edge, mark ? theme.viz.marks[mark] : theme.viz.edge, progress);
          const strong = mark && mark !== 'muted' && mark !== 'visited';
          const mx = (x1 + x2) / 2 - uy * fs * 0.9;
          const my = (y1 + y2) / 2 + ux * fs * 0.9;
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={(strong ? 5 : 3) * unit} />
              {directed ? (
                <polygon
                  points={`${tipX},${tipY} ${x2 - uy * arrow * 0.5},${y2 + ux * arrow * 0.5} ${x2 + uy * arrow * 0.5},${y2 - ux * arrow * 0.5}`}
                  fill={color}
                />
              ) : null}
              {e.weight !== undefined ? (
                <text x={mx} y={my} fill={strong ? color : theme.colors.textMuted} fontSize={fs * 0.8} fontFamily={fontStack(theme.fonts.mono)} textAnchor="middle" dominantBaseline="middle">
                  {String(e.weight)}
                </text>
              ) : null}
            </g>
          );
        })}
        {state.nodes.map((n) => {
          const p = pos.get(n.id);
          if (!p) {
            return null;
          }
          const mark = state.marks?.nodes?.[n.id];
          const prevMark = prev?.marks?.nodes?.[n.id];
          const fill = markColor(theme, mark, prevMark, progress);
          const badge = state.badges?.[n.id];
          return (
            <g key={n.id}>
              <circle cx={p[0]} cy={p[1]} r={nodeR} fill={fill} stroke={mark ? theme.viz.marks[mark] : theme.colors.border} strokeWidth={3 * unit} />
              <text x={p[0]} y={p[1]} fill={textOn(theme, mark)} fontSize={fs} fontWeight={700} fontFamily={fontStack(theme.fonts.body)} textAnchor="middle" dominantBaseline="central">
                {n.label ?? n.id}
              </text>
              {badge !== undefined ? (
                <text x={p[0]} y={p[1] + nodeR + fs * 0.9} fill={theme.colors.accent} fontSize={fs * 0.75} fontFamily={fontStack(theme.fonts.mono)} textAnchor="middle" dominantBaseline="central">
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
