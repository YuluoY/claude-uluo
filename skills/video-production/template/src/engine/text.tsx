// 文字排版：先测量再排版，排出来的就是测出来的。
// - 断行：汉字之间可断；西文单词不拆；避头尾（，。）」等不在行首，（「“ 等不在行尾）；超长单词才按字符拆
// - 自动字号：在 [min, max] 里二分找能放进盒子的最大字号；最小字号也放不下时标记溢出（版面检测会报错）
// - 标题行长平衡：行数不变的前提下收窄行宽，避免最后一行只剩一两个字
// 测量依赖字体已加载：所有场景都在 FontGate 之内渲染。
import { measureText } from '@remotion/layout-utils';
import React, { useMemo } from 'react';
import type { Rect } from './layout';

export type TextStyle = {
  /** CSS font-family 串（fontStack 的结果） */
  family: string;
  weight: number;
  lineHeight: number;
  /** 字距（em） */
  letterSpacing?: number;
};

export type TextLine = { text: string; start: number; end: number; width: number };

export type TextFit = {
  fontSize: number;
  lines: TextLine[];
  /** 实际占用高度（像素） */
  height: number;
  /** 最宽一行的宽度 */
  width: number;
  overflow: boolean;
  lineHeightPx: number;
};

const BASE = 100;
const widthCache = new Map<string, number>();

const NO_START = new Set(Array.from('，。、；：！？）」』】》〉…—,.;:!?)]}%’”·～~'));
const NO_END = new Set(Array.from('（「『【《〈([{“‘'));

const isWide = (ch: string): boolean => {
  const cp = ch.codePointAt(0) ?? 0;
  return (
    (cp >= 0x2e80 && cp <= 0x9fff) ||
    (cp >= 0xac00 && cp <= 0xd7af) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff00 && cp <= 0xffef) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  );
};

type Atom = { text: string; start: number; kind: 'word' | 'space' | 'newline' };

/** 中文词的上限：更长的词允许在词内换行，避免一整块放不下 */
const MAX_WORD = 4;
const boundaryCache = new Map<string, Set<number>>();

/** 词边界（UTF-16 下标）：用浏览器内置的 ICU 分词（Intl.Segmenter），中文不在词中间断行 */
const wordBoundaries = (text: string): Set<number> | null => {
  if (typeof Intl === 'undefined' || !('Segmenter' in Intl)) {
    return null;
  }
  let b = boundaryCache.get(text);
  if (!b) {
    b = new Set<number>();
    for (const seg of new Intl.Segmenter('zh', { granularity: 'word' }).segment(text)) {
      b.add(seg.index);
    }
    boundaryCache.set(text, b);
  }
  return b;
};

/** 切成不可再分的排版单元（带原文下标）：中文按词、西文按单词，并按避头尾规则合并标点 */
export const atomize = (text: string): Atom[] => {
  const raw: Atom[] = [];
  let i = 0;
  const chars = Array.from(text);
  let offset = 0;
  const bounds = wordBoundaries(text);
  let wordChars = 0;
  while (i < chars.length) {
    const ch = chars[i];
    if (ch === '\n') {
      raw.push({ text: '\n', start: offset, kind: 'newline' });
      offset += ch.length;
      i += 1;
    } else if (/\s/.test(ch)) {
      raw.push({ text: ' ', start: offset, kind: 'space' });
      offset += ch.length;
      i += 1;
    } else if (isWide(ch) && !NO_START.has(ch) && !NO_END.has(ch)) {
      // 同一个词里的汉字并成一个单元（词太长时按 MAX_WORD 切开）
      const prev = raw[raw.length - 1];
      const prevLast = prev ? Array.from(prev.text).pop() ?? '' : '';
      const sameWord = bounds !== null && !bounds.has(offset) && prev && prev.kind === 'word' && isWide(prevLast) && !NO_START.has(prevLast) && !NO_END.has(prevLast) && wordChars < MAX_WORD;
      if (sameWord) {
        prev.text += ch;
        wordChars += 1;
      } else {
        raw.push({ text: ch, start: offset, kind: 'word' });
        wordChars = 1;
      }
      offset += ch.length;
      i += 1;
    } else if (isWide(ch) || NO_START.has(ch) || NO_END.has(ch)) {
      raw.push({ text: ch, start: offset, kind: 'word' });
      offset += ch.length;
      i += 1;
    } else {
      let w = '';
      const s = offset;
      while (i < chars.length && !/\s/.test(chars[i]) && !isWide(chars[i]) && !NO_START.has(chars[i]) && !NO_END.has(chars[i])) {
        w += chars[i];
        offset += chars[i].length;
        i += 1;
      }
      raw.push({ text: w, start: s, kind: 'word' });
    }
  }
  // 避头：行首禁用的标点并入前一个单元；避尾：行尾禁用的标点并入后一个单元
  const merged: Atom[] = [];
  for (const a of raw) {
    const prev = merged[merged.length - 1];
    if (a.kind === 'word' && NO_START.has(Array.from(a.text)[0]) && prev && prev.kind === 'word') {
      prev.text += a.text;
    } else {
      merged.push({ ...a });
    }
  }
  const out: Atom[] = [];
  for (let k = 0; k < merged.length; k++) {
    const a = merged[k];
    const next = merged[k + 1];
    const last = Array.from(a.text).pop() ?? '';
    if (a.kind === 'word' && NO_END.has(last) && next && next.kind === 'word' && a.text.length === last.length) {
      next.text = a.text + next.text;
      next.start = a.start;
      continue;
    }
    out.push(a);
  }
  return out;
};

const unitWidth = (text: string, st: TextStyle): number => {
  const key = `${st.family}|${st.weight}|${st.letterSpacing ?? 0}|${text}`;
  let w = widthCache.get(key);
  if (w === undefined) {
    w = measureText({
      text,
      fontFamily: st.family,
      fontSize: BASE,
      fontWeight: st.weight,
      letterSpacing: st.letterSpacing ? `${st.letterSpacing}em` : undefined,
    }).width;
    widthCache.set(key, w);
  }
  return w;
};

/** 一段文字在给定字号下的宽度 */
export const textWidth = (text: string, fontSize: number, st: TextStyle): number => (unitWidth(text, st) * fontSize) / BASE;

/** 按宽度断行 */
export const wrapText = (text: string, maxWidth: number, fontSize: number, st: TextStyle): TextLine[] => {
  const atoms = atomize(text);
  const scale = fontSize / BASE;
  const lines: TextLine[] = [];
  let cur = '';
  let curStart = -1;
  let curEnd = 0;
  let curW = 0;
  let pendingSpace = 0;
  const push = () => {
    if (curStart >= 0) {
      lines.push({ text: cur, start: curStart, end: curEnd, width: curW });
    } else if (lines.length === 0 || cur === '') {
      lines.push({ text: '', start: curEnd, end: curEnd, width: 0 });
    }
    cur = '';
    curStart = -1;
    curW = 0;
    pendingSpace = 0;
  };
  const place = (t: string, start: number, w: number) => {
    if (curStart < 0) {
      curStart = start;
    } else if (pendingSpace > 0) {
      cur += ' ';
      curW += pendingSpace;
    }
    pendingSpace = 0;
    cur += t;
    curW += w;
    curEnd = start + t.length;
  };
  for (const a of atoms) {
    if (a.kind === 'newline') {
      push();
      continue;
    }
    if (a.kind === 'space') {
      if (curStart >= 0) {
        pendingSpace = unitWidth(' ', st) * scale;
      }
      continue;
    }
    const w = unitWidth(a.text, st) * scale;
    const need = curStart >= 0 ? curW + pendingSpace + w : w;
    if (need <= maxWidth + 0.01) {
      place(a.text, a.start, w);
      continue;
    }
    if (curStart >= 0) {
      push();
    }
    if (w <= maxWidth + 0.01) {
      place(a.text, a.start, w);
      continue;
    }
    // 单个单元比整行还宽（超长单词、网址）：按字符拆
    let offset = a.start;
    for (const ch of Array.from(a.text)) {
      const cw = unitWidth(ch, st) * scale;
      if (curStart >= 0 && curW + cw > maxWidth + 0.01) {
        push();
      }
      place(ch, offset, cw);
      offset += ch.length;
    }
  }
  if (curStart >= 0 || lines.length === 0) {
    push();
  }
  return lines;
};

export type FitOptions = {
  text: string;
  width: number;
  height: number;
  style: TextStyle;
  max: number;
  min: number;
  maxLines?: number;
  /** 行长平衡（标题、大字） */
  balance?: boolean;
};

const measureFit = (o: FitOptions, fs: number): { lines: TextLine[]; ok: boolean } => {
  const lines = wrapText(o.text, o.width, fs, o.style);
  const h = lines.length * fs * o.style.lineHeight;
  const ok = h <= o.height + 0.5 && (!o.maxLines || lines.length <= o.maxLines);
  return { lines, ok };
};

const finish = (o: FitOptions, fs: number, lines0: TextLine[], overflow: boolean): TextFit => {
  let lines = lines0;
  if (o.balance && lines.length > 1) {
    // 行数不变的前提下找最窄的行宽
    let a = o.width * 0.45;
    let b = o.width;
    for (let k = 0; k < 14; k++) {
      const m = (a + b) / 2;
      const trial = wrapText(o.text, m, fs, o.style);
      if (trial.length <= lines.length) {
        b = m;
      } else {
        a = m;
      }
    }
    lines = wrapText(o.text, b, fs, o.style);
  }
  const lh = fs * o.style.lineHeight;
  return {
    fontSize: fs,
    lines,
    height: lines.length * lh,
    width: Math.max(0, ...lines.map((l) => l.width)),
    overflow,
    lineHeightPx: lh,
  };
};

const bounds = (o: { max: number; min: number }): [number, number] => {
  const max = Math.max(1, Math.floor(o.max));
  return [Math.max(1, Math.min(max, Math.floor(o.min))), max];
};

export const fitText = (o: FitOptions): TextFit => {
  const [min, max] = bounds(o);
  let lo = min;
  let hi = max;
  let best: { fs: number; lines: TextLine[] } | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const r = measureFit(o, mid);
    if (r.ok) {
      best = { fs: mid, lines: r.lines };
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (!best) {
    return finish(o, min, wrapText(o.text, o.width, min, o.style), true);
  }
  return finish(o, best.fs, best.lines, false);
};

export type GroupItem = { text: string; width: number; height: number; maxLines?: number };

/**
 * 一组文字用同一个字号：找出让每一项都放进自己盒子的最大字号（同级的要点、卡片正文字号一致才整齐）。
 * 最小字号也放不下的项标记 overflow。
 */
export const fitTextGroup = (items: GroupItem[], o: { style: TextStyle; max: number; min: number; balance?: boolean }): TextFit[] => {
  const [min, max] = bounds(o);
  const opts = items.map((it): FitOptions => ({ ...it, style: o.style, max, min, balance: o.balance }));
  let lo = min;
  let hi = max;
  let fs = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (opts.every((it) => measureFit(it, mid).ok)) {
      fs = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const size = fs > 0 ? fs : min;
  return opts.map((it) => {
    const r = measureFit(it, size);
    return finish(it, size, r.lines, !r.ok);
  });
};

export const useTextFitGroup = (items: GroupItem[], o: { style: TextStyle; max: number; min: number; balance?: boolean }): TextFit[] => {
  const key = JSON.stringify([items, o]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => fitTextGroup(items, o), [key]);
};

export const useTextFit = (o: FitOptions): TextFit =>
  useMemo(
    () => fitText(o),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [o.text, o.width, o.height, o.style.family, o.style.weight, o.style.lineHeight, o.style.letterSpacing, o.max, o.min, o.maxLines, o.balance],
  );

/** 在全文中找出强调词的字符区间 */
const emphasisRanges = (text: string, words: string[] | undefined): Array<[number, number]> => {
  const out: Array<[number, number]> = [];
  for (const w of words ?? []) {
    if (!w) {
      continue;
    }
    let pos = text.indexOf(w);
    while (pos >= 0) {
      out.push([pos, pos + w.length]);
      pos = text.indexOf(w, pos + w.length);
    }
  }
  return out;
};

export type TextBlockProps = {
  fit: TextFit;
  text: string;
  style: TextStyle;
  /** 绝对定位的矩形；不给就按 width/height 占位 */
  rect?: Rect;
  width?: number;
  height?: number;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'center' | 'bottom';
  color: string;
  /** 强调词与强调色（只改颜色，不改字重，保证测量准确） */
  emphasis?: string[];
  emphasisColor?: string;
  /** 版面检测里的名字 */
  name?: string;
  css?: React.CSSProperties;
};

/** 按 fit 的结果逐行画出文字 */
export const TextBlock: React.FC<TextBlockProps> = ({ fit, text, style, rect, width, height, align = 'left', valign = 'top', color, emphasis, emphasisColor, name, css }) => {
  const w = rect?.w ?? width ?? fit.width;
  const h = rect?.h ?? height ?? fit.height;
  const top = valign === 'top' ? 0 : valign === 'center' ? (h - fit.height) / 2 : h - fit.height;
  const ranges = emphasisRanges(text, emphasis);
  const isEm = (i: number) => ranges.some(([a, b]) => i >= a && i < b);
  const pos: React.CSSProperties = rect ? { position: 'absolute', left: rect.x, top: rect.y } : { position: 'relative' };
  return (
    <div
      data-vp-box={name}
      data-vp-text="1"
      data-vp-overflow={fit.overflow ? '1' : undefined}
      style={{ ...pos, width: w, height: h, ...css }}
    >
      {fit.lines.map((ln, k) => {
        const parts: Array<{ t: string; em: boolean }> = [];
        if (ranges.length) {
          let i = ln.start;
          for (const ch of Array.from(ln.text)) {
            const em = ch !== ' ' && isEm(i);
            const last = parts[parts.length - 1];
            if (last && last.em === em) {
              last.t += ch;
            } else {
              parts.push({ t: ch, em });
            }
            i += ch.length;
          }
        } else {
          parts.push({ t: ln.text, em: false });
        }
        return (
          <div
            key={k}
            style={{
              position: 'absolute',
              left: 0,
              top: top + k * fit.lineHeightPx,
              width: w,
              height: fit.lineHeightPx,
              lineHeight: `${fit.lineHeightPx}px`,
              fontFamily: style.family,
              fontWeight: style.weight,
              fontSize: fit.fontSize,
              letterSpacing: style.letterSpacing ? `${style.letterSpacing}em` : undefined,
              whiteSpace: 'pre',
              textAlign: align,
              color,
            }}
          >
            {parts.map((p, j) => (
              <span key={j} style={p.em ? { color: emphasisColor } : undefined}>
                {p.t}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export type FitTextProps = Omit<FitOptions, 'width' | 'height'> &
  Omit<TextBlockProps, 'fit' | 'width' | 'height'> & { rect: Rect };

/** 放进 rect 的自适应字号文字 */
export const FitText: React.FC<FitTextProps> = (p) => {
  const fit = useTextFit({ text: p.text, width: p.rect.w, height: p.rect.h, style: p.style, max: p.max, min: p.min, maxLines: p.maxLines, balance: p.balance });
  return <TextBlock {...p} fit={fit} />;
};
