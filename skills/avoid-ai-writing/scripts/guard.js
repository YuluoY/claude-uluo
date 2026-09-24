#!/usr/bin/env node
'use strict';

const { prepare, normalize } = require('./lib/text');
const { scan } = require('./lib/scanner');
const { formatFinding } = require('./lib/format');
const { readInput, RefusedError } = require('./lib/io');
const { SCENES } = require('./lib/scenes');

const HELP = `用法：node scripts/guard.js <原文> <改稿> [选项]

改稿护栏：检查改稿有没有注入原文没有的信息、有没有改动受保护内容、还剩多少 AI 腔。

选项：
  --scene <id>      指定场景：${SCENES.map((s) => s.id).join(' / ')}（默认按原文自动判断）
  --officialese     去机关腔
  --json            输出 JSON
  -h, --help        显示帮助

退出码：0 通过；1 有注入、受保护内容被改或一级残留；2 参数错误、文件不存在或类型被拒绝`;

// ── 数字 ──

const CN_DIGIT = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
const CN_UNIT = { 十: 10, 百: 100, 千: 1000 };
const CN_BIG = { 万: 1e4, 亿: 1e8 };
const CN_NUM_UNITS =
  '%|％|个|年|月|日|号|天|周|小时|分钟|秒|倍|成|家|人|名|位|次|款|项|条|元|块|美元|万|亿|岁|届|期|轮|层|步|种|类|篇|章|页|行|米|公里|千米|克|千克|吨|度|台|部|套|份|张|批';
const CN_NUMERAL = '[零〇一二两三四五六七八九十百千万亿]+(?:点[零〇一二三四五六七八九]+)?';
const CN_PCT_RE = new RegExp(`(百分之|千分之)(${CN_NUMERAL})`, 'g');
const CN_NUM_RE = new RegExp(
  `(?<!百分之|千分之|[零〇一二两三四五六七八九十百千万亿])(${CN_NUMERAL})(?=\\s*(${CN_NUM_UNITS}))`,
  'g'
);
const AR_NUM_RE = /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(%|％|‰)?/g;

function cnIntToNumber(s) {
  let total = 0;
  let section = 0;
  let num = 0;
  for (const ch of s) {
    if (ch in CN_DIGIT) num = CN_DIGIT[ch];
    else if (ch in CN_UNIT) {
      section += (num || 1) * CN_UNIT[ch];
      num = 0;
    } else if (ch in CN_BIG) {
      section += num;
      total += section * CN_BIG[ch];
      section = 0;
      num = 0;
    }
  }
  return total + section + num;
}

function cnToNumber(s) {
  const [int, frac] = s.split('点');
  const base = cnIntToNumber(int);
  if (!frac) return base;
  return Number(`${base}.${[...frac].map((c) => CN_DIGIT[c]).join('')}`);
}

/** 抽取正文里的数字，统一成“数值+百分号”的键 */
function extractNumbers(prose) {
  const text = prose.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
  const keys = [];
  for (const m of text.matchAll(AR_NUM_RE)) {
    const value = Number(m[1].replace(/,/g, ''));
    const suffix = m[2] === '‰' ? '‰' : m[2] ? '%' : '';
    keys.push(`${value}${suffix}`);
  }
  for (const m of text.matchAll(CN_PCT_RE)) {
    keys.push(`${cnToNumber(m[2])}${m[1] === '千分之' ? '‰' : '%'}`);
  }
  for (const m of text.matchAll(CN_NUM_RE)) {
    const [, numeral, unit] = m;
    if (/^[一二两]$/.test(numeral) && !/^(?:年|倍|成|岁|%|％)$/.test(unit)) continue;
    keys.push(`${cnToNumber(numeral)}${unit === '%' || unit === '％' ? '%' : ''}`);
  }
  return keys;
}

// ── 其他注入信号 ──

const FIRST_PERSON_SINGULAR_RE = /笔者|本人|我(?![国军方校院司省市县区党们])/g;
const FIRST_PERSON_PLURAL_RE = /(?<!让)我们|咱们/g;
const HOOK_RE = /重点来了|划重点|敲黑板|注意了|干货满满|干货|建议收藏|先说结论|一图看懂|速看|必看/g;
const SLANG_RE = /绝绝子|yyds|永远滴神|拿捏|破防|家人们|宝子|泰裤辣|格局打开|栓[Qq]|芭比[Qq]|遥遥领先|狠狠(?:地)?(?:爱|期待|心动)/gi;
const BOOK_RE = /《[^》\n]{1,40}》/g;
const QUOTE_ATTR_RE = /(?:说|表示|称|指出|坦言|直言|写道)[:：]?\s*[“「"]/g;
const URL_RE = /https?:\/\/[^\s<>()（）[\]【】"'，。；]+/g;
const TRACKING_PARAM_RE = /^(?:utm_[a-z]+|ref|source|spm|from)$/i;

function all(re, text) {
  return text.match(re) || [];
}

function normalizeUrl(url) {
  try {
    const u = new URL(url.replace(/[.,;:!?）)]+$/, ''));
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAM_RE.test(key)) u.searchParams.delete(key);
    }
    return u.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

function countMap(items) {
  const m = new Map();
  for (const i of items) m.set(i, (m.get(i) || 0) + 1);
  return m;
}

/** after 里有、before 里完全没有的 */
function added(before, after) {
  const b = countMap(before);
  return [...new Set(after)].filter((x) => !b.has(x));
}

/** before 里有、after 里完全没有的 */
function removed(before, after) {
  return added(after, before);
}

function fencedBlocks(text) {
  const blocks = [];
  const lines = text.split('\n');
  let fence = null;
  let buf = [];
  for (const line of lines) {
    if (fence) {
      const close = line.match(/^\s{0,3}(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) {
        blocks.push(buf.join('\n'));
        fence = null;
        buf = [];
      } else buf.push(line);
      continue;
    }
    const open = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (open) fence = open[1];
  }
  return blocks;
}

function protectedLines(text, re) {
  return text
    .split('\n')
    .filter((l) => re.test(l))
    .map((l) => l.trim());
}

function levelCounts(report) {
  return { level1: report.summary.level1, level2: report.summary.level2, level3: report.summary.level3 };
}

function findingKey(f) {
  return `${f.rule}|${f.match}`;
}

function isExpectedPlaceholder(f) {
  return f.rule === 'placeholder' && /待补充/.test(f.match);
}

/**
 * 对比原文与改稿。
 * @returns {{ status, scene, errors, warnings, residual, newFindings }}
 */
function guard(originalRaw, rewrittenRaw, options = {}) {
  const original = normalize(originalRaw);
  const rewritten = normalize(rewrittenRaw);
  const before = prepare(original);
  const after = prepare(rewritten);
  const errors = [];
  const warnings = [];
  const push = (list, rule, message, items) => {
    if (items.length) list.push({ rule, message, items });
  };

  const numsBefore = extractNumbers(before.prose);
  const numsAfter = extractNumbers(after.prose);
  push(errors, 'injected-number', '改稿出现原文没有的数字', added(numsBefore, numsAfter));
  push(warnings, 'dropped-number', '原文的数字在改稿里找不到，确认是否误删', removed(numsBefore, numsAfter));

  for (const [re, kind] of [
    [FIRST_PERSON_SINGULAR_RE, '单数'],
    [FIRST_PERSON_PLURAL_RE, '复数'],
  ]) {
    const fpBefore = all(re, before.prose);
    const fpAfter = all(re, after.prose);
    if (!fpBefore.length && fpAfter.length) {
      push(errors, 'injected-first-person', `原文没有${kind}第一人称，改稿出现了`, [...new Set(fpAfter)]);
    } else if (fpAfter.length > fpBefore.length + 1) {
      push(warnings, 'more-first-person', `${kind}第一人称从 ${fpBefore.length} 处增加到 ${fpAfter.length} 处`, [...new Set(fpAfter)]);
    }
  }

  push(errors, 'injected-hook', '改稿制造了原文没有的钩子', added(all(HOOK_RE, before.prose), all(HOOK_RE, after.prose)));
  push(errors, 'injected-slang', '改稿蹭了原文没有的热词', added(all(SLANG_RE, before.prose), all(SLANG_RE, after.prose)));
  push(errors, 'injected-citation', '改稿出现原文没有的书名或出处', added(all(BOOK_RE, before.prose), all(BOOK_RE, after.prose)));

  const qBefore = all(QUOTE_ATTR_RE, before.prose).length;
  const qAfter = all(QUOTE_ATTR_RE, after.prose).length;
  if (qAfter > qBefore) push(errors, 'injected-quote', `署名引语从 ${qBefore} 处增加到 ${qAfter} 处`, [`+${qAfter - qBefore}`]);

  const urlsBefore = all(URL_RE, before.codeMasked).map(normalizeUrl);
  const urlsAfter = all(URL_RE, after.codeMasked).map(normalizeUrl);
  push(errors, 'injected-url', '改稿出现原文没有的链接', added(urlsBefore, urlsAfter));
  push(warnings, 'dropped-url', '原文的链接在改稿里找不到', removed(urlsBefore, urlsAfter));

  const codeAfter = new Set(fencedBlocks(rewritten));
  push(
    errors,
    'modified-code',
    '原文代码块被改动或删除（代码块只标记不改写）',
    fencedBlocks(original)
      .filter((b) => !codeAfter.has(b))
      .map((b) => b.split('\n')[0] || '(空代码块)')
  );
  push(warnings, 'dropped-inline-code', '原文的行内代码在改稿里找不到', removed(all(/`[^`\n]+`/g, before.text), all(/`[^`\n]+`/g, after.text)));
  push(warnings, 'modified-quote', '引用原话被改动（只标记不改写）', removed(protectedLines(original, /^\s*>/), protectedLines(rewritten, /^\s*>/)));
  push(warnings, 'modified-table', '表格行被改动（只标记不改写）', removed(protectedLines(original, /^\s*\|/), protectedLines(rewritten, /^\s*\|/)));

  const scanOptions = { officialese: options.officialese };
  const beforeReport = scan(original, { ...scanOptions, scene: options.scene });
  const afterReport = scan(rewritten, { ...scanOptions, scene: beforeReport.scene.id });
  const residualLevel1 = afterReport.findings.filter(
    (f) => f.level === 1 && !f.protected && f.rule !== 'embedded-instruction' && !isExpectedPlaceholder(f)
  );
  const beforeKeys = new Set(beforeReport.findings.map(findingKey));
  const newFindings = afterReport.findings.filter((f) => !beforeKeys.has(findingKey(f)) && !isExpectedPlaceholder(f));

  const status = errors.length || residualLevel1.length ? 'fail' : 'pass';
  return {
    status,
    scene: beforeReport.scene,
    errors,
    warnings,
    residual: {
      before: levelCounts(beforeReport),
      after: levelCounts(afterReport),
      level1: residualLevel1,
      pendingPlaceholders: afterReport.findings.filter(isExpectedPlaceholder).length,
    },
    newFindings,
  };
}

function formatGuard(report, files) {
  const out = [];
  const { residual: r } = report;
  if (files) out.push(`护栏：原文 ${files[0]} → 改稿 ${files[1]}（场景：${report.scene.label}）`);
  const reasons = [];
  if (report.errors.length) reasons.push(`注入或改动受保护内容 ${report.errors.length} 类`);
  if (r.level1.length) reasons.push(`一级残留 ${r.level1.length} 处`);
  out.push(`结论：${report.status === 'pass' ? '通过' : `不通过（${reasons.join('，')}）`}`);
  out.push(
    `残留：一级 ${r.before.level1}→${r.after.level1}，二级 ${r.before.level2}→${r.after.level2}，三级 ${r.before.level3}→${r.after.level3}`
  );
  if (r.pendingPlaceholders) out.push(`其中待补充标记 ${r.pendingPlaceholders} 处（计入一级，不挡闸门）：发布前补齐`);

  if (report.errors.length) {
    out.push('', '── 必须处理：回原文找依据，找不到就删；受保护内容恢复原样 ──');
    for (const e of report.errors) out.push(`[${e.rule}] ${e.message}：${e.items.join('、')}`);
  }
  if (report.warnings.length) {
    out.push('', '── 请确认 ──');
    for (const w of report.warnings) out.push(`[${w.rule}] ${w.message}：${w.items.join('、')}`);
  }
  if (r.level1.length) {
    out.push('', '── 一级残留 ──');
    for (const f of r.level1) out.push(formatFinding(f));
  }
  if (report.newFindings.length) {
    out.push('', '── 改稿新增的 AI 腔 ──');
    for (const f of report.newFindings) out.push(formatFinding(f));
  }
  return out.join('\n');
}

function parseArgs(argv) {
  const args = { inputs: [], scene: null, officialese: false, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') args.help = true;
    else if (a === '--json') args.json = true;
    else if (a === '--officialese') args.officialese = true;
    else if (a === '--scene') args.scene = argv[++i];
    else if (!a.startsWith('--')) args.inputs.push(a);
    else throw new Error(`未知参数：${a}`);
  }
  if (!args.help && args.inputs.length !== 2) throw new Error('需要两个文件：原文和改稿');
  return args;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`错误：${e.message}\n\n${HELP}`);
    process.exit(2);
  }
  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }
  let report;
  try {
    const [a, b] = args.inputs.map(readInput);
    report = guard(a.text, b.text, { scene: args.scene, officialese: args.officialese });
  } catch (e) {
    const status = e instanceof RefusedError ? 'refused' : 'error';
    if (args.json) console.log(JSON.stringify({ status, message: e.message }, null, 2));
    else console.error(`${status === 'refused' ? '拒绝' : '错误'}：${e.message}`);
    process.exit(2);
  }
  console.log(args.json ? JSON.stringify(report, null, 2) : formatGuard(report, args.inputs));
  process.exit(report.status === 'pass' ? 0 : 1);
}

if (require.main === module) main();

module.exports = { guard, extractNumbers, cnToNumber, formatGuard };
