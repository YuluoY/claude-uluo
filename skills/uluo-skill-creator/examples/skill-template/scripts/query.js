#!/usr/bin/env node
'use strict';

const path = require('path');
const { run } = require('./_shared/query-engine');

const SKILL_ROOT = path.resolve(__dirname, '..');

const META = {
  name: '<skill-name>',
  version: '0.1.0',
  description: '<skill 描述>'
};

const WORKFLOW = [
  { phase: 0, name: '需求收集', description: '收集用户需求、明确任务目标和边界条件' },
  { phase: 1, name: '信息准备', description: '读取必要的参考文档、加载相关上下文' },
  { phase: 2, name: '核心执行', description: '执行 skill 的主要任务逻辑' },
  { phase: 3, name: '质量检查', description: '验证执行结果是否符合约束和规范' },
  { phase: 4, name: '输出交付', description: '整理结果、生成最终输出' }
];

const SCENARIOS = {
  simple: {
    autoSkipPhases: [1],
    description: '简单任务：跳过信息准备，快速执行',
    documents: ['SKILL.md'],
    agents: []
  },
  medium: {
    autoSkipPhases: [],
    description: '标准任务：完整流程，默认场景',
    documents: ['SKILL.md', 'references/'],
    agents: []
  },
  complex: {
    autoSkipPhases: [],
    description: '复杂任务：完整流程 + 多 agent 协作 + 全面验证',
    documents: ['SKILL.md', 'references/', 'scripts/', 'agents/'],
    agents: []
  },
  urgent: {
    autoSkipPhases: [1, 3],
    description: '紧急任务：跳过准备和检查，快速交付',
    documents: ['SKILL.md'],
    agents: []
  }
};

const REFERENCES = [];

const AGENTS = [];

const SCRIPTS = [
  { file: 'validate.js', usage: 'node scripts/validate.js <skill-path>', description: '本地硬约束校验主入口' }
];

const CONSTRAINTS = {
  HARD: {
    description: 'scripts/ 目录下的校验脚本（validate.js 及其子检查）',
    enforcement: '违反即 fail，exit code 1'
  },
  SOFT: {
    description: 'SKILL.md + references/ 中的 AI 行为指导、决策逻辑、流程编排',
    enforcement: '由 AI 阅读后判断执行'
  }
};

run({
  skillRoot: SKILL_ROOT,
  META,
  WORKFLOW,
  SCENARIOS,
  REFERENCES,
  AGENTS,
  SCRIPTS,
  CONSTRAINTS
}, process.argv.slice(2));
