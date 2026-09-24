// 图形场景的公共零件：等宽数字、矢量图标。数值属于"必须精确"的内容，sceneText=off 时依然保留。
import React from 'react';
import { fontStack, withAlpha } from './deps';
import type { Theme } from './deps';

export type GlyphKind = 'scan' | 'halve' | 'check' | 'target' | 'hash' | 'sort' | 'search' | 'done';

/** 等宽数字样式：数字不左右晃，去掉文字也能看 */
export const numCss = (theme: Theme, size: number, color?: string): React.CSSProperties => ({
  fontFamily: fontStack(theme.fonts.mono),
  fontSize: size,
  fontWeight: 600,
  lineHeight: 1,
  letterSpacing: '0.02em',
  color: color ?? theme.colors.text,
  whiteSpace: 'pre',
});

export const Num: React.FC<{ theme: Theme; size: number; color?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ theme, size, color, style, children }) => (
  <div style={{ ...numCss(theme, size, color), ...style }}>{children}</div>
);

const bar = (x: number, y: number, w: number, h: number, fill: string, key: string, r = 2): React.ReactNode => (
  <rect key={key} x={x} y={y} width={w} height={h} rx={r} fill={fill} />
);

/** 矢量图标：纯几何，不依赖字体，去掉文字也看得懂 */
export const Glyph: React.FC<{ kind: GlyphKind; size: number; theme: Theme; active?: boolean; progress?: number }> = ({ kind, size, theme, active = true, progress = 1 }) => {
  const c = active ? theme.colors.accent : withAlpha(theme.colors.textMuted, 0.55);
  const soft = withAlpha(theme.colors.textMuted, 0.3);
  const ink = active ? theme.colors.text : withAlpha(theme.colors.textMuted, 0.5);
  const p = Math.min(1, Math.max(0, progress));
  let body: React.ReactNode = null;
  if (kind === 'scan') {
    body = (
      <>
        {[0, 1, 2, 3, 4].map((i) => bar(8 + i * 17, 46, 13, 13, i === 0 ? c : soft, 's' + i))}
        <line x1={14} y1={28} x2={14 + 74 * p} y2={28} stroke={ink} strokeWidth={5} />
        <polygon points={(14 + 74 * p) + ',22 ' + (14 + 74 * p + 11) + ',28 ' + (14 + 74 * p) + ',34'} fill={ink} />
      </>
    );
  } else if (kind === 'halve') {
    const cut = 26 + 48 * p;
    body = (
      <>
        {bar(8, 44, 84, 15, soft, 'a', 3)}
        {bar(8, 44, Math.max(2, cut - 8), 15, c, 'b', 3)}
        <line x1={cut} y1={26} x2={cut} y2={78} stroke={ink} strokeWidth={5} />
      </>
    );
  } else if (kind === 'check') {
    body = <polyline points="20,54 40,74 80,28" fill="none" stroke={c} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />;
  } else if (kind === 'target') {
    body = (
      <>
        <circle cx={50} cy={50} r={38} fill="none" stroke={soft} strokeWidth={7} />
        <circle cx={50} cy={50} r={19} fill="none" stroke={c} strokeWidth={7} />
        <circle cx={50} cy={50} r={6} fill={ink} />
      </>
    );
  } else if (kind === 'search') {
    body = (
      <>
        <circle cx={44} cy={44} r={26} fill="none" stroke={c} strokeWidth={8} />
        <line x1={63} y1={63} x2={88} y2={88} stroke={ink} strokeWidth={9} strokeLinecap="round" />
      </>
    );
  } else if (kind === 'hash') {
    body = (
      <>
        {[0, 1].map((r0) => [0, 1, 2].map((cc) => bar(10 + cc * 28, 22 + r0 * 30, 24, 24, (r0 + cc) % 2 === 0 ? c : soft, 'h' + r0 + cc, 4)))}
      </>
    );
  } else if (kind === 'sort') {
    body = (
      <>
        {[0, 1, 2, 3].map((i) => bar(12 + i * 21, 78 - (i + 1) * 17, 15, (i + 1) * 17, i === 3 ? c : soft, 'b' + i, 3))}
      </>
    );
  } else {
    body = (
      <>
        <circle cx={50} cy={50} r={38} fill="none" stroke={c} strokeWidth={7} />
        <polyline points="32,52 45,66 70,36" fill="none" stroke={c} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      </>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }} aria-hidden>
      {body}
    </svg>
  );
};
