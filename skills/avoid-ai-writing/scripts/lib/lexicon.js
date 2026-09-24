'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_PATH = path.resolve(__dirname, '..', '..', 'references', 'lexicon.md');

const SECTIONS = [
  { prefix: '第一档', rule: 'lexicon-tier1', label: '第一档词汇', level: 2, mode: 'count', baseCluster: 1 },
  { prefix: '第二档', rule: 'lexicon-tier2', label: '第二档词汇扎堆', level: 3, mode: 'count', baseCluster: 2 },
  { prefix: '第三档', rule: 'lexicon-tier3', label: '第三档词汇密度', level: 3, mode: 'density' },
  { prefix: '营销腔', rule: 'lexicon-marketing', label: '营销腔', level: 2, mode: 'count', baseCluster: 1 },
  { prefix: '公文腔', rule: 'lexicon-officialese', label: '公文套话', level: 3, mode: 'count', baseCluster: 1 },
];

const GAP = '[^，。！？；：,.!?;:\\n]{0,12}?';

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function termToSource(term) {
  return term.split('……').map(escapeRe).join(GAP);
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/**
 * 解析 lexicon.md：每个分区一张“原词 | 改为 | 放行语境”表。
 * @returns {Array<{rule, label, level, mode, baseCluster, title, entries}>}
 */
function parseLexicon(md) {
  const sections = [];
  let current = null;
  let headerSeen = false;

  for (const line of md.split('\n')) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      const title = heading[1];
      const def = SECTIONS.find((s) => title.startsWith(s.prefix));
      current = def ? { ...def, title, entries: [] } : null;
      if (current) sections.push(current);
      headerSeen = false;
      continue;
    }
    if (!current || !/^\s*\|/.test(line)) continue;
    const cells = splitRow(line);
    if (!headerSeen) {
      headerSeen = true;
      continue;
    }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;

    const [termCell = '', replacement = '', contextCell = ''] = cells;
    const bare = termCell.replace(/[（(][^）)]*[）)]/g, '').trim();
    if (!bare) continue;
    const qualifier = (termCell.match(/[（(]([^）)]*)[）)]/) || [])[1] || '';
    const variants = bare
      .split(/[／/]/)
      .map((v) => v.trim())
      .filter(Boolean);
    const exempt = [...contextCell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const note = [qualifier, contextCell.replace(/`/g, '')].filter(Boolean).join('；');

    current.entries.push({
      term: bare,
      variants,
      replacement,
      note,
      exempt,
      regex: new RegExp(variants.map(termToSource).join('|'), 'g'),
    });
  }
  return sections;
}

const cache = new Map();

function loadLexicon(file = DEFAULT_PATH) {
  if (!cache.has(file)) cache.set(file, parseLexicon(fs.readFileSync(file, 'utf8')));
  return cache.get(file);
}

function isExempt(entry, text, start, end) {
  for (const token of entry.exempt) {
    let idx = text.indexOf(token, Math.max(0, end - token.length));
    while (idx !== -1 && idx <= start) {
      if (idx + token.length >= end) return true;
      idx = text.indexOf(token, idx + 1);
    }
  }
  return false;
}

/**
 * 在文本中匹配全部词表；落在放行搭配里的不报；重叠时保留较长的命中。
 */
function matchLexicon(sections, text) {
  const hits = [];
  for (const section of sections) {
    for (const entry of section.entries) {
      entry.regex.lastIndex = 0;
      let m;
      while ((m = entry.regex.exec(text))) {
        if (!m[0]) {
          entry.regex.lastIndex++;
          continue;
        }
        const start = m.index;
        const end = start + m[0].length;
        if (isExempt(entry, text, start, end)) continue;
        hits.push({ section, entry, start, end, match: m[0] });
      }
    }
  }
  hits.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const kept = [];
  for (const h of hits) {
    if (!kept.some((k) => h.start < k.end && k.start < h.end)) kept.push(h);
  }
  return kept.sort((a, b) => a.start - b.start);
}

module.exports = { SECTIONS, DEFAULT_PATH, parseLexicon, loadLexicon, matchLexicon };
