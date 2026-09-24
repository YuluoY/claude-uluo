'use strict';

const fs = require('fs');
const path = require('path');
const { countCjk, countEmoji } = require('./text');

const DEFAULT_PATH = path.resolve(__dirname, '..', '..', 'references', 'scenes-and-voice.md');

const SCENES = [
  { id: 'social', label: '社交短帖' },
  { id: 'article', label: '通稿·公众号' },
  { id: 'tech', label: '技术文档' },
  { id: 'email', label: '邮件·汇报' },
  { id: 'official', label: '公文·通知' },
  { id: 'chat', label: '日常聊天' },
];

/** 矩阵行名 → 受控规则 id */
const ROW_RULES = {
  破折号: ['dash-density'],
  表情符号: ['emoji-heading', 'emoji-bullet'],
  列表: ['list-addiction'],
  粗体: ['bold-overuse'],
  引号: ['ascii-quotes', 'scare-quotes'],
  第一档词汇: ['lexicon-tier1'],
  营销腔: ['lexicon-marketing'],
  意义拔高: ['ending-elevation'],
  设问开场: ['rhetorical-opening'],
  段落等长: ['uniform-paragraphs'],
  句长整齐: ['uniform-sentences'],
  公文套话: ['lexicon-officialese'],
  空洞收尾: ['ending-outlook', 'ending-courtesy'],
};

const STRICTNESS = {
  严: { label: '严', offset: 0, factor: 1 },
  中: { label: '中', offset: 1, factor: 1.5 },
  宽: { label: '宽', offset: 2, factor: 2 },
  跳过: null,
};

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

/**
 * 解析宽严矩阵：表头首格为“规则”、其余格全是场景名的那张表。
 * @returns {{ scenes: string[], rows: Object<string, Object<string, string>> }}
 */
function parseMatrix(md) {
  const lines = md.split('\n');
  const labelToId = Object.fromEntries(SCENES.map((s) => [s.label, s.id]));
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\|/.test(lines[i])) continue;
    const header = splitRow(lines[i]);
    if (header[0] !== '规则' || header.length < 2) continue;
    const sceneCells = header.slice(1);
    if (!sceneCells.every((c) => labelToId[c])) continue;

    const scenes = sceneCells.map((c) => labelToId[c]);
    const rows = {};
    for (let j = i + 2; j < lines.length && /^\s*\|/.test(lines[j]); j++) {
      const cells = splitRow(lines[j]);
      const rowName = cells[0];
      if (!ROW_RULES[rowName]) throw new Error(`场景矩阵出现未知规则行：${rowName}`);
      rows[rowName] = {};
      scenes.forEach((sceneId, k) => {
        const value = cells[k + 1];
        if (!(value in STRICTNESS)) {
          throw new Error(`场景矩阵“${rowName}”行的“${sceneCells[k]}”列取值非法：${value}`);
        }
        rows[rowName][sceneId] = value;
      });
    }
    return { scenes, rows };
  }
  throw new Error('scenes-and-voice.md 中找不到宽严矩阵（表头首格应为“规则”，其余为场景名）');
}

const cache = new Map();

function loadMatrix(file = DEFAULT_PATH) {
  if (!cache.has(file)) cache.set(file, parseMatrix(fs.readFileSync(file, 'utf8')));
  return cache.get(file);
}

/**
 * 返回“规则 id → 宽严档”的查询函数；表里没有的规则按严。
 * @returns {(ruleId: string) => ({label, offset, factor, row} | null)}
 */
function strictnessResolver(matrix, sceneId, { officialese = false } = {}) {
  const byRule = {};
  for (const [rowName, values] of Object.entries(matrix.rows)) {
    for (const ruleId of ROW_RULES[rowName]) byRule[ruleId] = { row: rowName, value: values[sceneId] };
  }
  return (ruleId) => {
    if (officialese && ruleId === 'lexicon-officialese') return { ...STRICTNESS['严'], row: '公文套话' };
    const hit = byRule[ruleId];
    if (!hit) return { ...STRICTNESS['严'], row: null };
    const s = STRICTNESS[hit.value];
    return s ? { ...s, row: hit.row } : null;
  };
}

const OFFICIAL_RE = /特此(?:通知|公告|函告)|现将有关事项通知如下|各有关(?:单位|部门)|各(?:部门|单位|处室|科室)[：:]|〔\d{4}〕\s*\d+\s*号/;
const GREETING_RE = /^(?:各位[\u4e00-\u9fff]{0,4}|尊敬的|亲爱的|Hi\b|Hello\b|Dear\b|[\u4e00-\u9fff]{1,3}(?:总|老师|经理|主任|总监|同学|同事们?))[，,：:！!\s]/;
const SIGNOFF_RE = /此致|敬礼|顺祝|祝好|谢谢|感谢|Best|Regards|Thanks/i;
const HASHTAG_RE = /#[^#\s]{1,20}#|(?:^|\s)#[\u4e00-\u9fffA-Za-z0-9_]{1,20}(?=\s|$)/gmu;

/** 按 scenes-and-voice.md“场景识别”表的顺序自动判断场景 */
function detectScene(prep) {
  const t = prep.text;
  if (OFFICIAL_RE.test(t)) return { id: 'official', reason: '出现公文用语或文号' };

  const nonEmpty = t
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const first = nonEmpty[0] || '';
  const tail = nonEmpty.slice(-3).join('\n');
  if (GREETING_RE.test(first) && SIGNOFF_RE.test(tail)) return { id: 'email', reason: '开头有称呼、结尾有落款' };

  if (prep.fences >= 2 || prep.inlineCode >= 5) {
    return { id: 'tech', reason: `代码块 ${prep.fences} 个、行内代码 ${prep.inlineCode} 处` };
  }

  const cjk = countCjk(t);
  const hashtags = (t.match(HASHTAG_RE) || []).length;
  const emojis = countEmoji(t);
  if (cjk <= 800 && (hashtags >= 1 || emojis >= 3)) {
    return { id: 'social', reason: `${cjk} 字，话题标签 ${hashtags} 个、表情 ${emojis} 个` };
  }
  return { id: 'article', reason: '默认' };
}

function sceneLabel(id) {
  const s = SCENES.find((x) => x.id === id);
  return s ? s.label : id;
}

module.exports = {
  SCENES,
  ROW_RULES,
  STRICTNESS,
  DEFAULT_PATH,
  parseMatrix,
  loadMatrix,
  strictnessResolver,
  detectScene,
  sceneLabel,
};
