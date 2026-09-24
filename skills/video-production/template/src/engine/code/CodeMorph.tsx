// 代码变形：代码从一个版本过渡到下一个版本时，没变的 token 平移到新位置，删掉的淡出，新增的淡入。
// token 的对应关系来自 @shikijs/magic-move/core；位置按等宽列（ch）和行高直接计算，逐帧确定，不依赖 DOM 测量。
import { codeToKeyedTokens, syncTokenKeys, type KeyedTokensInfo } from '@shikijs/magic-move/core';
import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { ease } from '../motion';
import { fontStack, useTheme, useUnit } from '../theme';
import { fitCodeFontSize } from './CodePanel';
import { columns, highlighter, langOrText } from './highlighter';

type Placed = { key: string; content: string; color?: string; fontStyle?: number; line: number; col: number };
type Layout = { tokens: Placed[]; lines: number };

const layout = (info: KeyedTokensInfo): Layout => {
  const out: Placed[] = [];
  let line = 0;
  let col = 0;
  for (const t of info.tokens) {
    const parts = t.content.split('\n');
    parts.forEach((part, i) => {
      if (i > 0) {
        line += 1;
        col = 0;
      }
      if (part.length > 0) {
        out.push({ key: i === 0 ? t.key : `${t.key}#${i}`, content: part, color: t.color, fontStyle: t.fontStyle, line, col });
        col += columns(part);
      }
    });
  }
  const trimmed = info.code.replace(/\n+$/, '');
  return { tokens: out, lines: trimmed.split('\n').length };
};

export type CodeMorphProps = {
  /** 依次出现的代码版本 */
  versions: string[];
  lang: string;
  /** 第 k 个版本（k ≥ 1）开始出现的帧，长度为 versions.length - 1，非递减 */
  switchFrames: number[];
  /** 每次过渡的时长（秒），缺省为主题动效时长的 1.4 倍 */
  durationSec?: number;
  /** 最大字号（短边 1080 基准） */
  fontSize?: number;
  /** 面板宽高（像素）：给了就按所有版本里最宽最长的那一版自动算字号 */
  width?: number;
  height?: number;
  title?: string;
  style?: React.CSSProperties;
};

const LINE_HEIGHT = 1.6;
const TITLE = 1.9;

export const CodeMorph: React.FC<CodeMorphProps> = ({ versions, lang, switchFrames, durationSec, fontSize, width, height, title, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const unit = useUnit();
  if (versions.length === 0) {
    throw new Error('CodeMorph 至少需要一个代码版本');
  }
  if (switchFrames.length !== versions.length - 1) {
    throw new Error(`CodeMorph：${versions.length} 个版本需要 ${versions.length - 1} 个切换时刻，实际给了 ${switchFrames.length} 个`);
  }
  const themeName = theme.code.theme;
  const pairs = useMemo(() => {
    const opts = { lang: langOrText(lang), theme: themeName };
    // 类型上 magic-move 期望带内置语言表的高亮器；运行时只用到 codeToTokens，同步核心高亮器即可
    const h = highlighter as unknown as Parameters<typeof codeToKeyedTokens>[0];
    const keyed = versions.map((v) => codeToKeyedTokens(h, v, opts as Parameters<typeof codeToKeyedTokens>[2]));
    const out: Array<{ from: Layout; to: Layout }> = [];
    for (let k = 1; k < keyed.length; k++) {
      const { from, to } = syncTokenKeys(keyed[k - 1], keyed[k]);
      out.push({ from: layout(from), to: layout(to) });
    }
    return { first: layout(keyed[0]), pairs: out, fg: keyed[0].fg ?? theme.colors.text };
  }, [versions, lang, themeName, theme.colors.text]);

  const fs =
    width !== undefined
      ? Math.min(
          ...versions.map((v) =>
            fitCodeFontSize({ code: v, lang, theme, unit, width, height: height !== undefined ? height : undefined, max: fontSize, lineNumbers: false, title: Boolean(title) }),
          ),
        )
      : (fontSize ?? theme.type.code) * unit;
  const lh = fs * LINE_HEIGHT;
  const dur = Math.max(1, Math.round((durationSec ?? theme.motion.durationSec * 1.4) * fps));

  let k = 0;
  for (let i = 0; i < switchFrames.length; i++) {
    if (frame >= switchFrames[i]) {
      k = i + 1;
    }
  }
  const inTransition = k >= 1 && frame < switchFrames[k - 1] + dur;
  const t = inTransition ? (frame - switchFrames[k - 1]) / dur : 1;
  const e = ease(theme, t);

  let rendered: React.ReactNode;
  let lines: number;
  if (!inTransition) {
    const lay = k === 0 ? pairs.first : pairs.pairs[k - 1].to;
    lines = lay.lines;
    rendered = lay.tokens.map((tk) => <Token key={tk.key} tk={tk} line={tk.line} col={tk.col} lh={lh} opacity={1} fg={pairs.fg} />);
  } else {
    const { from, to } = pairs.pairs[k - 1];
    lines = from.lines + (to.lines - from.lines) * e;
    const toByKey = new Map(to.tokens.map((x) => [x.key, x]));
    const fromKeys = new Set(from.tokens.map((x) => x.key));
    const nodes: React.ReactNode[] = [];
    for (const a of from.tokens) {
      const b = toByKey.get(a.key);
      if (b) {
        nodes.push(<Token key={a.key} tk={b} line={a.line + (b.line - a.line) * e} col={a.col + (b.col - a.col) * e} lh={lh} opacity={1} fg={pairs.fg} />);
      } else {
        nodes.push(<Token key={`-${a.key}`} tk={a} line={a.line} col={a.col} lh={lh} opacity={1 - Math.min(1, t / 0.4)} fg={pairs.fg} />);
      }
    }
    for (const b of to.tokens) {
      if (!fromKeys.has(b.key)) {
        nodes.push(<Token key={`+${b.key}`} tk={b} line={b.line} col={b.col} lh={lh} opacity={Math.min(1, Math.max(0, (t - 0.6) / 0.4))} fg={pairs.fg} />);
      }
    }
    rendered = nodes;
  }

  const pad = fs * 0.9;
  return (
    <div
      style={{
        backgroundColor: theme.code.background,
        borderRadius: theme.radius * unit,
        border: `${Math.max(1, unit)}px solid ${theme.colors.border}`,
        overflow: 'hidden',
        width,
        height,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {title ? (
        <div
          style={{
            height: fs * TITLE,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: pad,
            boxSizing: 'border-box',
            fontFamily: fontStack(theme.fonts.mono),
            fontSize: fs * 0.8,
            color: theme.colors.textMuted,
            borderBottom: `${Math.max(1, unit)}px solid ${theme.colors.border}`,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {title}
        </div>
      ) : null}
      <div style={{ position: 'relative', margin: pad, height: lines * lh, fontFamily: fontStack(theme.fonts.mono), fontSize: fs }}>
        {rendered}
      </div>
    </div>
  );
};

const Token: React.FC<{ tk: Placed; line: number; col: number; lh: number; opacity: number; fg: string }> = ({ tk, line, col, lh, opacity, fg }) => (
  <span
    style={{
      position: 'absolute',
      left: `${col}ch`,
      top: line * lh,
      lineHeight: `${lh}px`,
      whiteSpace: 'pre',
      color: tk.color ?? fg,
      opacity,
      fontStyle: tk.fontStyle !== undefined && tk.fontStyle & 1 ? 'italic' : undefined,
      fontWeight: tk.fontStyle !== undefined && tk.fontStyle & 2 ? 700 : undefined,
    }}
  >
    {tk.content}
  </span>
);
