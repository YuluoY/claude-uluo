#!/usr/bin/env node
'use strict';

const path = require('path');
const { run } = require('./_shared/query-engine');

const SKILL_ROOT = path.resolve(__dirname, '..');

const META = {
  name: 'avoid-ai-writing',
  version: '1.1.0',
  description: '去 AI 腔：中文写作审查与重写，检测、编辑、重写三种模式，配扫描与改稿护栏脚本',
};

const WORKFLOW = [
  { phase: 0, name: '判定模式', description: '按用户措辞定重写、检测或编辑模式；编辑模式先确认是文章类文件' },
  { phase: 1, name: '场景与语气', description: '用户指定优先，否则用扫描报告的自动判断；语气从原文推断，读 scenes-and-voice.md' },
  { phase: 2, name: '初扫', description: 'node scripts/scan.js <文件> --scene <id>，拿到分级候选、统计和推倒重写判定' },
  { phase: 3, name: '通读判断', description: '逐条确认候选（语境、文体惯例、作者风格），补脚本抓不到的通读条目，读 patterns.md、lexicon.md' },
  { phase: 4, name: '定策略', description: 'rebuildSuggested 为真或结构本身是 AI 的，建议推倒重写；否则局部修' },
  { phase: 5, name: '改写', description: '先一级再二级，完整审计再做三级；按语气校准，读 examples.md' },
  { phase: 6, name: '护栏与复查', description: 'node scripts/guard.js <原文> <改稿>；不通过回 Phase 5，默认一轮，最多两轮' },
  { phase: 7, name: '输出', description: '按模式格式交付，报告用了几轮、guard 结论、刻意保留的候选' },
];

const SCENARIOS = {
  rewrite: {
    autoSkipPhases: [],
    description: '重写模式（默认）：标出问题、改写、二次复查，四节输出',
    documents: ['SKILL.md', 'references/patterns.md', 'references/lexicon.md', 'references/scenes-and-voice.md', 'references/examples.md'],
    agents: [],
  },
  detect: {
    autoSkipPhases: [4, 5, 6],
    description: '检测模式：只标记不修改，输出分级问题清单和评估',
    documents: ['SKILL.md', 'references/patterns.md', 'references/lexicon.md', 'references/scenes-and-voice.md'],
    agents: [],
  },
  edit: {
    autoSkipPhases: [],
    description: '编辑模式：就地最小化编辑用户点名的文章文件，引用、代码、表格只标记不改',
    documents: ['SKILL.md', 'references/patterns.md', 'references/lexicon.md', 'references/scenes-and-voice.md'],
    agents: [],
  },
  quick: {
    autoSkipPhases: [],
    description: '快速过稿：只处理一级和二级（scan.js --max-level 2），三级打磨略过',
    documents: ['SKILL.md', 'references/lexicon.md'],
    agents: [],
  },
};

const REFERENCES = [
  { file: 'references/patterns.md', when: 'Phase 3 通读判断；理解某条规则 id 时' },
  { file: 'references/lexicon.md', when: 'Phase 3、5 查替换词和放行语境；增删词表时（同时是 scan.js 的数据源）' },
  { file: 'references/scenes-and-voice.md', when: 'Phase 1 定场景与语气；Phase 5 语气校准（宽严矩阵同时是 scan.js 的数据源）' },
  { file: 'references/examples.md', when: 'Phase 5 改写前校准力度；第一次用本 skill 时' },
];

const AGENTS = [];

const SCRIPTS = [
  { file: 'scan.js', usage: 'node scripts/scan.js <文件|-> [--scene <id>] [--officialese] [--max-level <n>] [--fail-on <n>] [--json]', description: '确定性扫描：词表、句式、结构、标点、泄漏、文档内指令，按场景宽严过滤' },
  { file: 'guard.js', usage: 'node scripts/guard.js <原文> <改稿> [--scene <id>] [--json]', description: '改稿护栏：注入检查、受保护内容检查、残留与新增 AI 腔' },
  { file: 'query.js', usage: 'node scripts/query.js . --type <meta|workflow|scenario|references|scripts|constraints> [--scenario <id>]', description: '流程数据查询' },
];

const CONSTRAINTS = {
  HARD: {
    description: 'scan.js 的词表命中、句式正则、结构统计、文件类型拒绝；guard.js 的注入与受保护内容检查',
    enforcement: 'scan.js --fail-on 与 guard.js 不通过时退出码 1；文件类型被拒绝退出码 2',
  },
  SOFT: {
    description: '候选是否真是毛病、通读类条目、怎么改、改成谁的语气',
    enforcement: '由 AI 按 SKILL.md 与 references/ 判断执行',
  },
};

run({ skillRoot: SKILL_ROOT, META, WORKFLOW, SCENARIOS, REFERENCES, AGENTS, SCRIPTS, CONSTRAINTS }, process.argv.slice(2));
