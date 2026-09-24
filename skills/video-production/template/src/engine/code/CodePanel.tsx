// 代码面板：语法着色 + 当前行高亮（高亮框从上一步的位置平滑移到当前行）+ 长代码自动滚动让当前行居中。
import React from 'react';
import { fontStack, useTheme, useUnit } from '../theme';
import { tokenize } from './highlighter';

export type CodePanelProps = {
  code: string;
  lang: string;
  /** 当前高亮的行（从 1 开始） */
  activeLines?: number[];
  /** 上一步高亮的行，用于高亮框移动动画 */
  prevActiveLines?: number[] | null;
  /** 从上一步到当前步的过渡进度 0→1 */
  progress?: number;
  /** 字号（短边 1080 基准的像素），缺省用主题 type.code */
  fontSize?: number;
  lineNumbers?: boolean;
  /** 压暗非当前行 */
  dimInactive?: boolean;
  /** 面板可视高度（像素）。给了才会滚动；不给就整段显示 */
  height?: number;
  /** 行尾注释：行号 → 文字（例如变量当前值） */
  annotations?: Record<number, string>;
  /** 面板顶部的文件名标签 */
  title?: string;
  style?: React.CSSProperties;
};

const LINE_HEIGHT = 1.6;

const commentPrefix = (lang: string): string => {
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

export const CodePanel: React.FC<CodePanelProps> = ({
  code,
  lang,
  activeLines = [],
  prevActiveLines = null,
  progress = 1,
  fontSize,
  lineNumbers = true,
  dimInactive = false,
  height,
  annotations,
  title,
  style,
}) => {
  const theme = useTheme();
  const unit = useUnit();
  const fs = (fontSize ?? theme.type.code) * unit;
  const lh = fs * LINE_HEIGHT;
  const { lines, fg } = tokenize(code, lang, theme.code.theme);
  const gutter = lineNumbers ? String(lines.length).length + 1 : 0;
  const pad = fs * 0.9;
  const titleH = title ? fs * 1.9 : 0;

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

  return (
    <div
      style={{
        backgroundColor: theme.code.background,
        borderRadius: theme.radius * unit,
        border: `${Math.max(1, unit)}px solid ${theme.colors.border}`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height,
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
            borderBottom: `${Math.max(1, unit)}px solid ${theme.colors.border}`,
          }}
        >
          {title}
        </div>
      ) : null}
      <div style={{ position: 'relative', overflow: 'hidden', height: viewH, margin: pad }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: -scroll }}>
          {cur ? (
            <div
              style={{
                position: 'absolute',
                left: -pad,
                right: -pad,
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
                }}
              >
                {lineNumbers ? (
                  <span style={{ width: `${gutter}ch`, flex: 'none', color: theme.code.lineNumber, textAlign: 'right', paddingRight: '1ch' }}>
                    {n}
                  </span>
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
                      {t.content}
                    </span>
                  ))}
                  {annotations?.[n] ? (
                    <span style={{ color: theme.colors.accent, marginLeft: '2ch', fontStyle: 'italic' }}>{`${commentPrefix(lang)}${annotations[n]}`}</span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
