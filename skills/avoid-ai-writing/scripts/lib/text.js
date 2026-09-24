'use strict';

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;
const LATIN_WORD_RE = /[A-Za-z0-9]+(?:[.'_-][A-Za-z0-9]+)*/g;
const EMOJI_G = /\p{Extended_Pictographic}/gu;
const URL_RE = /https?:\/\/[^\s<>()（）[\]【】"'，。；]+/g;

const HR_RE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const HEADING_RE = /^\s{0,3}#{1,6}\s+\S/;
const CN_HEADING_RE = /^\s*(?:[一二三四五六七八九十]+、|（[一二三四五六七八九十]+）|第[一二三四五六七八九十\d]+[章节部分])\s*[^，。！？；]{1,24}$/;
const LIST_RE = /^\s*(?:[-*+•·]\s+|\d{1,3}[.)]\s+|\d{1,3}、|[（(]\d{1,3}[)）]\s*)/;
const EMOJI_BULLET_RE = /^\s*(?:[-*+]\s+)?\p{Extended_Pictographic}/u;
const TABLE_RE = /^\s*\|/;
const QUOTE_RE = /^\s*>/;
const SENTENCE_END_RE = /[。！？!?…”’」』）)：:；;]\s*$/;

function normalize(raw) {
  return String(raw).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function blank(segment) {
  return segment.replace(/[^\n]/g, ' ');
}

function countCjk(text) {
  const m = text.match(CJK_RE);
  return m ? m.length : 0;
}

/** 中文字数 + 拉丁词数，用于句长、段长统计 */
function textLength(text) {
  const latin = text.match(LATIN_WORD_RE);
  return countCjk(text) + (latin ? latin.length : 0);
}

function countEmoji(text) {
  const m = text.match(EMOJI_G);
  return m ? m.length : 0;
}

function findFrontmatterEnd(lines) {
  if (lines[0] !== '---') return -1;
  for (let i = 1; i < Math.min(lines.length, 80); i++) {
    if (lines[i] === '---' || lines[i] === '...') return i;
  }
  return -1;
}

/**
 * 把 frontmatter、代码块、行内代码替换成等长空白，偏移和行号保持不变。
 */
function maskCode(text) {
  const lines = text.split('\n');
  const fmEnd = findFrontmatterEnd(lines);
  const out = [];
  let fence = null;
  let fences = 0;
  let inlineCode = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i <= fmEnd) {
      out.push(blank(line));
      continue;
    }
    if (fence) {
      out.push(blank(line));
      const close = line.match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null;
      continue;
    }
    const open = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (open) {
      fence = open[1];
      fences++;
      out.push(blank(line));
      continue;
    }
    out.push(
      line.replace(/``[^\n]+?``|`[^`\n]+`/g, (m) => {
        inlineCode++;
        return blank(m);
      })
    );
  }
  return { masked: out.join('\n'), fences, inlineCode };
}

function computeLineStarts(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

/** 偏移 → 1 起算的行号 */
function lineOf(lineStarts, offset) {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

function classifyLine(line) {
  if (line.trim() === '') return 'blank';
  if (HR_RE.test(line)) return 'rule';
  if (HEADING_RE.test(line) || CN_HEADING_RE.test(line)) return 'heading';
  if (TABLE_RE.test(line)) return 'table';
  if (QUOTE_RE.test(line)) return 'quote';
  if (LIST_RE.test(line)) return 'list';
  if (EMOJI_BULLET_RE.test(line)) return 'emoji-list';
  return 'prose';
}

/** 表情开头的行只有和列表相邻时才算列表项，单独一行是普通开头 */
function classifyLines(lines) {
  const kinds = lines.map(classifyLine);
  const listy = (k) => k === 'list' || k === 'emoji-list';
  return kinds.map((k, i) => {
    if (k !== 'emoji-list') return k;
    return listy(kinds[i - 1]) || listy(kinds[i + 1]) ? 'list' : 'prose';
  });
}

/**
 * 按行切块：段落、列表、引用、表格、标题。
 * 中文很少硬换行，所以上一行以句末标点结尾时，下一行另起一段。
 */
function buildBlocks(prose) {
  const lines = prose.split('\n');
  const kinds = classifyLines(lines);
  const blocks = [];
  let cur = null;
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const start = offset;
    const end = start + line.length;
    offset = end + 1;
    let kind = kinds[i];
    const lineNo = i + 1;

    if (kind === 'prose' && cur && cur.kind === 'list' && /^\s{2,}\S/.test(line)) {
      kind = 'list-continuation';
    }
    if (kind === 'blank' || kind === 'rule') {
      cur = null;
      continue;
    }
    if (kind === 'heading') {
      blocks.push({ kind, startLine: lineNo, endLine: lineNo, start, end, lines: [{ lineNo, start, end }] });
      cur = null;
      continue;
    }
    if (kind === 'list-continuation') {
      cur.endLine = lineNo;
      cur.end = end;
      const last = cur.lines[cur.lines.length - 1];
      last.end = end;
      continue;
    }
    const prevLine = cur ? prose.slice(cur.lines[cur.lines.length - 1].start, cur.lines[cur.lines.length - 1].end) : '';
    const extend =
      cur &&
      cur.kind === kind &&
      (kind !== 'prose' || !SENTENCE_END_RE.test(prevLine));
    if (extend) {
      cur.endLine = lineNo;
      cur.end = end;
      cur.lines.push({ lineNo, start, end });
    } else {
      cur = { kind, startLine: lineNo, endLine: lineNo, start, end, lines: [{ lineNo, start, end }] };
      blocks.push(cur);
    }
  }
  blocks.forEach((b, idx) => {
    b.index = idx;
    b.text = prose.slice(b.start, b.end);
  });
  return blocks;
}

/** 切句：以句末标点为界，带上紧随的右引号、右括号 */
function splitSentences(text, baseOffset) {
  const out = [];
  const re = /[^。！？!?\n]+(?:[。！？!?]+[”’」』）)]*)?/g;
  let m;
  while ((m = re.exec(text))) {
    const raw = m[0];
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const lead = raw.length - raw.trimStart().length;
    const start = baseOffset + m.index + lead;
    out.push({
      text: trimmed,
      start,
      end: start + trimmed.length,
      question: /[？?][”’」』）)]*$/.test(trimmed),
    });
  }
  return out;
}

/** 切分句：逗号、顿号、分号、冒号、括号、引号都算边界 */
function splitClauses(text, baseOffset) {
  const out = [];
  const re = /[^，。！？；：,;:!?、\n（）()“”「」]+/g;
  let m;
  while ((m = re.exec(text))) {
    if (!m[0].trim()) continue;
    out.push({ text: m[0], start: baseOffset + m.index, end: baseOffset + m.index + m[0].length });
  }
  return out;
}

function prepare(raw) {
  const text = normalize(raw);
  const { masked: codeMasked, fences, inlineCode } = maskCode(text);
  const prose = codeMasked.replace(/<!--[\s\S]*?-->/g, blank).replace(URL_RE, blank);
  const lineStarts = computeLineStarts(text);
  const blocks = buildBlocks(prose);
  const lineBlock = new Array(lineStarts.length + 2).fill(-1);
  for (const b of blocks) {
    for (let l = b.startLine; l <= b.endLine; l++) lineBlock[l] = b.index;
  }
  return { text, codeMasked, prose, lineStarts, blocks, lineBlock, fences, inlineCode, cjk: countCjk(prose) };
}

function blockAt(prep, offset) {
  const idx = prep.lineBlock[lineOf(prep.lineStarts, offset)];
  return idx >= 0 ? prep.blocks[idx] : null;
}

/** 原文中包含该偏移的整行 */
function lineText(prep, offset) {
  const line = lineOf(prep.lineStarts, offset);
  const start = prep.lineStarts[line - 1];
  const next = prep.lineStarts[line];
  return prep.text.slice(start, next === undefined ? prep.text.length : next - 1);
}

/** 原文中包含该区间的整句 */
function sentenceAround(text, start, end) {
  let s = start;
  while (s > 0 && !/[。！？!?\n]/.test(text[s - 1])) s--;
  let e = end;
  while (e < text.length && !/[。！？!?\n]/.test(text[e])) e++;
  return text.slice(s, Math.min(text.length, e + 1));
}

function mean(nums) {
  return nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
}

/** 变异系数：标准差 / 均值 */
function coefficientOfVariation(nums) {
  const m = mean(nums);
  if (!m) return 0;
  const variance = mean(nums.map((n) => (n - m) ** 2));
  return Math.sqrt(variance) / m;
}

module.exports = {
  EMOJI_G,
  normalize,
  prepare,
  countCjk,
  countEmoji,
  textLength,
  lineOf,
  blockAt,
  lineText,
  sentenceAround,
  splitSentences,
  splitClauses,
  coefficientOfVariation,
  mean,
};
