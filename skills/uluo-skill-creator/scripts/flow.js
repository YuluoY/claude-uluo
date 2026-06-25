#!/usr/bin/env node
'use strict';

const path = require('path');
const { run } = require('./_shared/flow-engine');

const WORKFLOW = [
  { phase: 0, name: '需求收集', description: '收集用户需求、明确 skill 目标', referencesToRead: [], requiredActions: ['与用户确认 skill 的目标、触发条件、边界'], expectedOutputs: ['明确的需求描述'], gates: [] },
  { phase: 1, name: '调研', description: '使用 researcher agent 调研现有 skill、技术方案、最佳实践', referencesToRead: ['references/remote-skill-creator.md'], requiredActions: ['调用 researcher agent 进行调研', '阅读调研结果'], expectedOutputs: ['调研报告摘要'], gates: [] },
  { phase: 2, name: '软硬约束设计', description: '列出约束分工表，区分硬约束(scripts)和软约束(md)', referencesToRead: ['references/hard-soft-constraint.md'], requiredActions: ['列出硬约束清单（脚本校验）', '列出软约束清单（md文档指导）'], expectedOutputs: ['约束分工表'], gates: [] },
  { phase: 3, name: '产出目录结构', description: '按 skill-anatomy.md 创建目录和必需文件', referencesToRead: ['references/skill-anatomy.md'], requiredActions: ['创建目录结构', '创建必需文件（SKILL.md frontmatter、.claude-plugin/plugin.json）'], expectedOutputs: ['完整目录结构', '.claude-plugin/plugin.json'], gates: [{ type: 'file-exists', path: 'SKILL.md', description: 'SKILL.md 必须存在', failureSuggestion: '请创建 SKILL.md 文件' }, { type: 'file-exists', path: '.claude-plugin/plugin.json', description: 'plugin.json 必须存在', failureSuggestion: '请创建 .claude-plugin/plugin.json' }] },
  { phase: 4, name: '编写 SKILL.md', description: '按 skillmd-spec.md 编写主指令文件', referencesToRead: ['references/skillmd-spec.md'], requiredActions: ['编写 SKILL.md 主指令', '确保 frontmatter 完整', '确保包含软硬约束分工说明'], expectedOutputs: ['完整的 SKILL.md'], gates: [] },
  { phase: 5, name: '编写 references/scripts/agents', description: '按需创建，按 agents-decision.md 决策', referencesToRead: ['references/agents-decision.md', 'references/agent-creation-guide.md'], requiredActions: ['按需创建 references/', '按需创建 scripts/', '按需创建 agents/'], expectedOutputs: ['references/ 目录（如需要）', 'scripts/ 目录（如需要）', 'agents/ 目录（如需要）'], gates: [] },
  { phase: 6, name: '编写 evals', description: '创建 evals/evals.json 测试用例', referencesToRead: [], requiredActions: ['创建 evals/ 目录', '编写 evals.json 测试用例'], expectedOutputs: ['evals/evals.json'], gates: [{ type: 'file-exists', path: 'evals/evals.json', description: 'evals.json 必须存在', failureSuggestion: '请创建 evals/evals.json 测试文件' }] },
  { phase: 7, name: '本地硬约束校验', description: '运行 validate.js，有 fail 回退 Phase 3-6', referencesToRead: [], requiredActions: ['运行 validate.js', '修复所有 FAIL 项'], expectedOutputs: ['validate.js 全部 PASS'], gates: [{ type: 'script-exit-code', command: 'node scripts/validate.js .', description: 'validate.js 必须全部通过', failureSuggestion: '修复校验错误后重新 complete' }] },
  { phase: 8, name: '测试/benchmark', description: '按 benchmark-workflow.md 执行，不满意回退 Phase 4', referencesToRead: ['references/benchmark-workflow.md', 'references/skill-quality-rubric.md'], requiredActions: ['运行 grade.js 评分', '运行 evals 测试', '必要时回退修改'], expectedOutputs: ['grade.js 评分 A', 'evals 测试通过'], gates: [] }
];

const SCENARIOS = {
  simple: { autoSkipPhases: [2, 5], description: '简单 skill，跳过约束设计和 references 编写' },
  medium: { autoSkipPhases: [], description: '中等 skill，完整目录 + 本地校验' },
  complex: { autoSkipPhases: [], description: '复杂 skill，完整目录 + 本地校验 + benchmark' },
  urgent: { autoSkipPhases: [1, 8], description: '紧急修复，跳过调研和 benchmark' }
};

run({ WORKFLOW, SCENARIOS, skillRoot: path.resolve(__dirname, '..') }, process.argv.slice(2));
