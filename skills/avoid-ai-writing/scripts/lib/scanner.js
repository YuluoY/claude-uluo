'use strict';

const {
  prepare,
  lineOf,
  blockAt,
  lineText,
  splitSentences,
  textLength,
  coefficientOfVariation,
} = require('./text');
const { loadLexicon, matchLexicon } = require('./lexicon');
const { SCENES, STRICTNESS, loadMatrix, strictnessResolver, detectScene, sceneLabel } = require('./scenes');
const { CAT, PATTERN_RULES, STRUCTURAL_RULES } = require('./rules');

const STRICT_DEFAULT = { ...STRICTNESS['严'], row: null };

function lexiconRuleMetas(sections) {
  return sections
    .filter((s) => s.mode === 'count')
    .map((s) => ({
      id: s.rule,
      level: s.level,
      category: CAT.WORD,
      label: s.label,
      mode: 'count',
      baseCluster: s.baseCluster,
      suggestion: '见 lexicon.md',
      section: s,
    }));
}

/** 全部规则的元信息（供文档同步测试和 query.js 使用） */
function ruleRegistry(options = {}) {
  const sections = loadLexicon(options.lexiconPath);
  const strip = ({ id, level, category, label }) => ({ id, level, category, label });
  return [...PATTERN_RULES, ...lexiconRuleMetas(sections), ...STRUCTURAL_RULES].map(strip);
}

function runPatterns(rule, prep, ctx) {
  const text = rule.target === 'code' ? prep.codeMasked : prep.prose;
  const hits = [];
  for (const regex of rule.patterns) {
    regex.lastIndex = 0;
    let m;
    while ((m = regex.exec(text))) {
      if (m[0] === '') {
        regex.lastIndex++;
        continue;
      }
      const [start, end] = m.indices && m.indices[1] ? m.indices[1] : [m.index, m.index + m[0].length];
      if (end <= start) continue;
      if (rule.filter && !rule.filter(ctx, start, end)) continue;
      hits.push({ start, end });
    }
  }
  return hits;
}

/** 同一规则内部重叠的命中只留最长的 */
function dedupe(hits) {
  const sorted = [...hits].sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const kept = [];
  for (const h of sorted) {
    if (!kept.some((k) => h.start < k.end && k.start < h.end)) kept.push(h);
  }
  return kept.sort((a, b) => a.start - b.start);
}

function contextFor(prep, start, end) {
  const line = lineOf(prep.lineStarts, start);
  const full = lineText(prep, start);
  if (full.length <= 80) return full.trim();
  const rel = start - prep.lineStarts[line - 1];
  const s = Math.max(0, rel - 30);
  const e = Math.min(full.length, rel + (end - start) + 30);
  return `${s > 0 ? '…' : ''}${full.slice(s, e).trim()}${e < full.length ? '…' : ''}`;
}

function clip(text, max = 60) {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}

/**
 * 扫描一段中文文本。
 * @param {string} raw 原文
 * @param {{ scene?: string, officialese?: boolean, maxLevel?: number, file?: string }} options
 */
function scan(raw, options = {}) {
  const prep = prepare(raw);
  const sections = loadLexicon(options.lexiconPath);
  const matrix = loadMatrix(options.scenesPath);
  const detected = detectScene(prep);
  const sceneId = options.scene || detected.id;
  if (!SCENES.some((s) => s.id === sceneId)) {
    throw new Error(`未知场景：${sceneId}（可选：${SCENES.map((s) => s.id).join('/')}）`);
  }
  const strictOf = strictnessResolver(matrix, sceneId, { officialese: Boolean(options.officialese) });
  const maxLevel = options.maxLevel || 3;

  const proseBlocks = prep.blocks.filter((b) => b.kind === 'prose');
  const sentences = new Map(proseBlocks.map((b) => [b.index, splitSentences(b.text, b.start)]));
  const paragraphLengths = proseBlocks.map((b) => textLength(b.text)).filter((n) => n >= 15);
  const sentenceLengths = [...sentences.values()]
    .flat()
    .map((s) => textLength(s.text))
    .filter((n) => n >= 4);
  const stats = {
    cjk: prep.cjk,
    paragraphs: proseBlocks.length,
    sentences: sentenceLengths.length,
    paragraphLengths,
    sentenceLengths,
    paragraphCV: Number(coefficientOfVariation(paragraphLengths).toFixed(3)),
    sentenceCV: Number(coefficientOfVariation(sentenceLengths).toFixed(3)),
  };
  const lexHits = matchLexicon(sections, prep.prose);
  const ctx = {
    prep,
    proseBlocks,
    sentences,
    stats,
    lexHits,
    cjk: prep.cjk,
    lineOf: (offset) => lineOf(prep.lineStarts, offset),
    strict: STRICT_DEFAULT,
  };

  const collected = [];
  for (const rule of PATTERN_RULES) {
    const hits = rule.run ? rule.run(ctx) : runPatterns(rule, prep, ctx);
    collected.push({ rule: { mode: 'count', baseCluster: 1, ...rule }, hits });
  }
  for (const meta of lexiconRuleMetas(sections)) {
    const hits = lexHits
      .filter((h) => h.section.rule === meta.id)
      .map((h) => ({ start: h.start, end: h.end, match: h.match, suggestion: h.entry.replacement, note: h.entry.note }));
    collected.push({ rule: meta, hits });
  }
  for (const rule of STRUCTURAL_RULES) {
    const strict = strictOf(rule.id) || STRICT_DEFAULT;
    collected.push({ rule: { baseCluster: 1, ...rule }, hits: rule.run({ ...ctx, strict }) });
  }

  const findings = [];
  const suppressed = {};
  let omittedByLevel = 0;
  const addSuppressed = (id, n) => {
    if (n > 0) suppressed[id] = (suppressed[id] || 0) + n;
  };

  for (const { rule, hits: rawHits } of collected) {
    const hits = dedupe(rawHits);
    if (!hits.length) continue;
    const strict = strictOf(rule.id);
    if (!strict) {
      addSuppressed(rule.id, hits.length);
      continue;
    }
    let kept = hits;
    if (rule.mode === 'count') {
      const need = (rule.baseCluster || 1) + strict.offset;
      const groups = new Map();
      for (const h of hits) {
        const block = blockAt(prep, h.start);
        const key = block ? block.index : -1;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(h);
      }
      kept = [];
      for (const group of groups.values()) {
        if (group.length >= need) kept.push(...group);
        else addSuppressed(rule.id, group.length);
      }
    }
    if (rule.level > maxLevel) {
      omittedByLevel += kept.length;
      continue;
    }
    for (const h of kept) {
      const block = blockAt(prep, h.start);
      findings.push({
        rule: rule.id,
        level: rule.level,
        category: rule.category,
        label: rule.label,
        line: lineOf(prep.lineStarts, h.start),
        match: clip(h.match || prep.text.slice(h.start, h.end)),
        context: contextFor(prep, h.start, h.end),
        suggestion: h.suggestion || rule.suggestion,
        ...(h.note ? { note: h.note } : {}),
        ...(h.message ? { message: h.message } : {}),
        ...(h.occurrences ? { occurrences: h.occurrences } : {}),
        protected: Boolean(block && (block.kind === 'quote' || block.kind === 'table')),
        strictness: strict.label,
      });
    }
  }

  findings.sort((a, b) => a.level - b.level || a.line - b.line);

  const levelCount = (n) => findings.filter((f) => f.level === n).length;
  const authored = findings.filter((f) => !f.protected && f.rule !== 'embedded-instruction');
  const l12 = authored.filter((f) => f.level <= 2).length;
  const categories = [...new Set(authored.map((f) => f.category))];
  const uniform = authored.some((f) => f.rule === 'uniform-paragraphs' || f.rule === 'uniform-sentences');
  const rebuildSuggested = categories.length >= 3 && (l12 >= 8 || (l12 >= 5 && uniform));
  const rebuildReasons = rebuildSuggested
    ? [`一二级 ${l12} 处`, `触发 ${categories.length} 类`, ...(uniform ? ['段长或句长均匀'] : [])]
    : [];

  return {
    file: options.file || null,
    scene: {
      id: sceneId,
      label: sceneLabel(sceneId),
      source: options.scene ? 'arg' : 'auto',
      reason: options.scene ? '用户指定' : detected.reason,
      detected: detected.id,
    },
    options: { officialese: Boolean(options.officialese), maxLevel },
    stats: {
      cjk: stats.cjk,
      paragraphs: stats.paragraphs,
      sentences: stats.sentences,
      paragraphCV: stats.paragraphCV,
      sentenceCV: stats.sentenceCV,
    },
    summary: {
      level1: levelCount(1),
      level2: levelCount(2),
      level3: levelCount(3),
      categories,
      rebuildSuggested,
      rebuildReasons,
      omittedByLevel,
    },
    findings,
    suppressed,
  };
}

module.exports = { scan, ruleRegistry };
