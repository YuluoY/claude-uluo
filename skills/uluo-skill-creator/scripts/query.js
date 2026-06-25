#!/usr/bin/env node
'use strict';
const { run } = require('./_shared/query-engine');

const META = { name: 'uluo-skill-creator', version: '0.3.0', description: '规范化+流程化的 skill 创建器' };
const WORKFLOW = [
  { phase: 0, name: '需求收集', description: '收集用户需求、明确 skill 目标' },
  { phase: 1, name: '调研', description: '使用 researcher agent 调研现有 skill、技术方案、最佳实践' },
  { phase: 2, name: '软硬约束设计', description: '列出约束分工表，区分硬约束(scripts)和软约束(md)' },
  { phase: 3, name: '产出目录结构', description: '按 skill-anatomy.md 创建目录和必需文件' },
  { phase: 4, name: '编写 SKILL.md', description: '按 skillmd-spec.md 编写主指令文件' },
  { phase: 5, name: '编写 references/scripts/agents', description: '按需创建，按 agents-decision.md 决策' },
  { phase: 6, name: '编写 evals', description: '创建 evals/evals.json 测试用例' },
  { phase: 7, name: '本地硬约束校验', description: '运行 validate.js，有 fail 回退 Phase 3-6' },
  { phase: 8, name: '测试/benchmark', description: '按 benchmark-workflow.md 执行，不满意回退 Phase 4' },
];
const SCENARIOS = {
  simple: { autoSkipPhases: [2, 5], description: '简单 skill，跳过约束设计和 references 编写', documents: ['SKILL.md'], agents: [] },
  medium: { autoSkipPhases: [], description: '中等 skill，完整目录 + 本地校验', documents: ['SKILL.md', 'references/'], agents: [] },
  complex: { autoSkipPhases: [], description: '复杂 skill，完整目录 + 本地校验 + benchmark', documents: ['SKILL.md', 'references/', 'scripts/', 'evals/'], agents: ['researcher', 'grader'] },
  urgent: { autoSkipPhases: [1, 8], description: '紧急修复，跳过调研和 benchmark', documents: ['SKILL.md'], agents: [] },
};
const REFERENCES = [
  { file: 'skill-anatomy.md', when: '需要了解 skill 目录结构规范时' },
  { file: 'skillmd-spec.md', when: '编写 SKILL.md frontmatter 时' },
  { file: 'hard-soft-constraint.md', when: '设计软硬约束分工时' },
  { file: 'agents-decision.md', when: '决定是否需要 agents/ 时' },
  { file: 'agent-creation-guide.md', when: '创建 agent 文件时' },
  { file: 'benchmark-workflow.md', when: '执行 benchmark 测试时' },
  { file: 'skill-quality-rubric.md', when: '进行质量评分时' },
  { file: 'remote-skill-creator.md', when: '调研远程 skill 时' },
];
const AGENTS = [
  { file: 'researcher.md', phases: [1], description: '调研 agent，搜索和分析现有 skill' },
  { file: 'grader.md', phases: [8], description: '评分 agent，运行质量评分' },
];
const SCRIPTS = [
  { file: 'scripts/validate.js', usage: 'node scripts/validate.js <skill-path>', description: '硬约束校验工具' },
  { file: 'scripts/grade.js', usage: 'node scripts/grade.js <skill-path>', description: '质量评分工具' },
  { file: 'scripts/query.js', usage: 'node scripts/query.js --type <type> [--pretty]', description: '流程数据查询工具' },
  { file: 'scripts/flow.js', usage: 'node scripts/flow.js <command>', description: '有状态工作流控制器' },
];
const CONSTRAINTS = {
  HARD: { description: '必须通过的自动化校验（scripts 硬约束）', enforcement: 'node scripts/validate.js <path> 退出码为 0' },
  SOFT: { description: '质量建议（grade.js 评分）', enforcement: '评分 ≥70 分（B 级及以上）' },
};

run({ META, WORKFLOW, SCENARIOS, REFERENCES, AGENTS, SCRIPTS, CONSTRAINTS }, process.argv.slice(2));
