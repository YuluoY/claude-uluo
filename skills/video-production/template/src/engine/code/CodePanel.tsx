// 代码面板：语法着色 + 当前行高亮（高亮框从上一步的位置平滑移到当前行）+ 行尾注释。
// 字号自动计算：保证最长一行（含行尾注释）放得下；放得下全部行就不滚动，放不下就滚动让当前行居中。
import React from 'react';
import { monoStyleOf } from './mono';
import { textWidth } from '../text';
import { fontStack, useTheme, useUnit } from '../theme';
import type { Theme } from '../types';
import { tokenize } from './highlighter';

export type CodePanelProps = {
  code: string;
  lang: string;
  /** 面板宽度（像素）：给了就按它自动算字号 */
  width?: number;
  /** 面板高度（像素）：给了就固定高度，放不下时滚动 */
  height?: number;
  /** 当前高亮的行（从 1 开始） */
  activeLines?: number[];
  /** 上一步高亮的行，用于高亮框移动动画 */
  prevActiveLines?: number[] | null;
  /** 从上一步到当前步的过渡进度 0→1 */
  progress?: number;
  /** 最大字号（短边 1080 基准），缺省用主题 type.code */
  fontSize?: number;
  lineNumbers?: boolean;
  /** 压暗非当前行 */
  dimInactive?: boolean;
  /** 行尾注释：行号 → 文字（例如变量当前值） */
  annotations?: Record<number, string>;
  /** 面板顶部的文件名标签 */
  title?: string;
  style?: React.CSSProperties;
};

const LINE_HEIGHT = 1.6;
const PAD = 0.9;
const TITLE = 1.9;

export const commentPrefix = (lang: string): string => {
  if (['python', 'ruby', 'bash', 'sh', 'shell'].includes(lang)) {
    return '# ';
  }
  if (lang === 'sql') {
    return '-- ';
  }
  return '// ';
};

const span = (lines: number[] | null | undefined): [number, number] | null => {
  if (!lines || lines.length === 0) {
    return null;
  }
  return [Math.min(...lines), Math.max(...lines)];
};

const detab = (s: string) => s.replace(/\t/g, '    ');

/** 让代码放进 width × height 的最大字号（像素）。宽度一定放得下；高度放不下时退到最小字号并滚动 */
export const fitCodeFontSize = (o: {
  code: string;
  lang: string;
  theme: Theme;
  unit: number;
  width: number;
  height?: number;
  max?: number;
  lineNumbers?: boolean;
  title?: boolean;
  annotations?: Record<number, string>;
}): number => {
  const st = monoStyleOf(o.theme);
  const lines = detab(o.code).split('\n');
  const prefix = commentPrefix(o.lang);
  let widest = 0;
  lines.forEach((ln, i) => {
    const ann = o.annotations?.[i + 1];
    const text = ann ? `${ln}  ${prefix}${ann}` : ln;
    widest = Math.max(widest, textWidth(text, 100, st));
  });
  const gutterChars = o.lineNumbers === false ? 0 : String(lines.length).length + 2;
  const gutterW = textWidth('0'.repeat(gutterChars), 100, st);
  const maxFs = (o.max ?? o.theme.type.code) * o.unit;
  const minFs = o.theme.type.code * o.unit * 0.55;
  const bw = 2 * Math.max(1, o.unit);
  // 留 1% 余量：浏览器按亚像素排版，避免最长一行恰好贴边
  const widthFs = ((o.width - bw) * 0.99) / ((widest + gutterW) / 100 + 2 * PAD);
  let fs = Math.min(maxFs, widthFs);
  if (o.height !== undefined) {
    const heightFs = (o.height - bw) / (lines.length * LINE_HEIGHT + 2 * PAD + (o.title ? TITLE : 0));
    fs = Math.min(fs, Math.max(heightFs, minFs));
  }
  return Math.max(1, Math.floor(fs * 10) / 10);
};

/** 按字号算面板刚好放下全部代码的高度（像素） */
export const codePanelHeight = (o: { code: string; fontSize: number; unit: number; title?: boolean }): number => {
  const n = o.code.split('\n').length;
  return n * o.fontSize * LINE_HEIGHT + 2 * o.fontSize * PAD + (o.title ? o.fontSize * TITLE : 0) + 2 * Math.max(1, o.unit);
};

export const CodePanel: React.FC<CodePanelProps> = ({
  code,
  lang,
  width,
  height,
  activeLines = [],
  prevActiveLines = null,
  progress = 1,
  fontSize,
  lineNumbers = true,
  dimInactive = false,
  annotations,
  title,
  style,
}) => {
  const theme = useTheme();
  const unit = useUnit();
  const fs =
    width !== undefined
      ? fitCodeFontSize({ code, lang, theme, unit, width, height, max: fontSize, lineNumbers, title: Boolean(title), annotations })
      : (fontSize ?? theme.type.code) * unit;
  const lh = fs * LINE_HEIGHT;
  const { lines, fg } = tokenize(code, lang, theme.code.theme);
  const gutter = lineNumbers ? String(lines.length).length + 1 : 0;
  const pad = fs * PAD;
  const titleH = title ? fs * TITLE : 0;

  const cur = span(activeLines);
  const prev = span(prevActiveLines) ?? cur;
  const p = Math.min(1, Math.max(0, progress));
  const boxTop = cur && prev ? ((prev[0] - 1) * (1 - p) + (cur[0] - 1) * p) * lh : 0;
  const boxH = cur && prev ? ((prev[1] - prev[0] + 1) * (1 - p) + (cur[1] - cur[0] + 1) * p) * lh : 0;

  const contentH = lines.length * lh;
  const viewH = height !== undefined ? Math.max(lh, height - titleH - pad * 2) : contentH;
  const scrollFor = (r: [number, number] | null) => {
    if (!r || contentH <= viewH) {
      return 0;
    }
    const center = ((r[0] - 1 + r[1]) / 2) * lh;
    return Math.min(Math.max(0, center - viewH / 2), contentH - viewH);
  };
  const scroll = scrollFor(prev) * (1 - p) + scrollFor(cur) * p;
  const activeSet = new Set(activeLines);
  const prefix = commentPrefix(lang);
  const bw = Math.max(1, unit);

  return (
    <div
      style={{
        backgroundColor: theme.code.background,
        borderRadius: theme.radius * unit,
        border: `${bw}px solid ${theme.colors.border}`,
        overflow: 'hidden',
        position: 'relative',
        width,
        height: height ?? contentH + pad * 2 + titleH + 2 * bw,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {title ? (
        <div
          style={{
            height: titleH,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: pad,
            fontFamily: fontStack(theme.fonts.mono),
            fontSize: fs * 0.8,
            color: theme.colors.textMuted,
            borderBottom: `${bw}px solid ${theme.colors.border}`,
            boxSizing: 'border-box',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {title}
        </div>
      ) : null}
      {/* 视口从左内边距的 35% 处开始：高亮框的左边条落在内边距里，不压行号 */}
      <div data-vp-clip="1" style={{ position: 'absolute', left: pad * 0.35, right: pad, top: titleH + pad, height: viewH, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: -scroll }}>
          {cur ? (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: boxTop,
                height: boxH,
                backgroundColor: theme.code.lineHighlight,
                borderLeft: `${4 * unit}px solid ${theme.colors.accent}`,
              }}
            />
          ) : null}
          {lines.map((line, i) => {
            const n = i + 1;
            const dim = dimInactive && activeLines.length > 0 && !activeSet.has(n);
            return (
              <div
                key={i}
                style={{
                  position: 'relative',
                  height: lh,
                  lineHeight: `${lh}px`,
                  whiteSpace: 'pre',
                  fontFamily: fontStack(theme.fonts.mono),
                  fontSize: fs,
                  color: fg,
                  opacity: dim ? 0.38 : 1,
                  display: 'flex',
                  paddingLeft: pad * 0.65,
                }}
              >
                {lineNumbers ? (
                  <span style={{ width: `${gutter}ch`, flex: 'none', color: theme.code.lineNumber, textAlign: 'right', paddingRight: '1ch' }}>{n}</span>
                ) : null}
                <span>
                  {line.map((t, j) => (
                    <span
                      key={j}
                      style={{
                        color: t.color,
                        fontStyle: t.fontStyle !== undefined && t.fontStyle & 1 ? 'italic' : undefined,
                        fontWeight: t.fontStyle !== undefined && t.fontStyle & 2 ? 700 : undefined,
                      }}
                    >
                      {detab(t.content)}
                    </span>
                  ))}
                  {annotations?.[n] ? <span style={{ color: theme.colors.accent, fontStyle: 'italic' }}>{`  ${prefix}${annotations[n]}`}</span> : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
