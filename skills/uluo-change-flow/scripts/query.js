#!/usr/bin/env node
'use strict';
const path = require('path');
const { run } = require('./_shared/query-engine');

const META = { name: 'uluo-change-flow', version: '0.1.0', description: '需求变更管理工作流——三级递进变更文档（spec/plan/tasks）+ 独立 checklist review 机制' };
const WORKFLOW = [
  { phase: 0, name: '获取作者', description: '通过 git config user.name 获取变更作者信息，禁止使用占位符' },
  { phase: 1, name: '识别变更', description: '定位目标特性目录 specs/<feature>/，目标不存在则提示用户先创建' },
  { phase: 2, name: '影响调研', description: '扫描已有 spec/plan/tasks + 相关代码，启用 impact-analyzer 子代理，产出影响清单（受影响章节+模块+风险）' },
  { phase: 3, name: '产出 L1 spec', description: '加载 spec-template，撰写变更范围：变了什么/为什么/影响多大。不写具体怎么改' },
  { phase: 4, name: '产出 L2 plan', description: '加载 plan-template，设计变更方案：怎么改/delta(MODIFIED/ADDED/REMOVED)/技术选型。不写文件路径' },
  { phase: 5, name: '产出 L3 tasks', description: '加载 tasks-template，编写文件级执行任务：动词开头/文件路径/依赖/调研标注' },
  { phase: 6, name: '产出 checklist', description: '加载 checklist-template，从三层抽取 review 检查点，独立于文档正文，逐条可review' },
  { phase: 7, name: '执行变更', description: '按 L3 tasks 逐项执行：修改 spec.md/plan.md/tasks.md/代码/设计稿，参考 sync-protocol' },
  { phase: 8, name: 'Review', description: '逐条检查 checklist，运行 validate.js --strict 硬约束校验；不通过则回退到出问题层级修复→同步下游→重新review' },
  { phase: 9, name: '留痕归档', description: '加载 change-record-template，产出 change-record.md 记录 review 结论+回退历史，归档到 CHG-<NNN>/' }
];
const SCENARIOS = {
  small: { autoSkipPhases: [4], description: '小变更（单字段/单样式）：Phase 2 可从简，L2合并到L1，产出 spec+tasks+checklist' },
  medium: { autoSkipPhases: [], description: '中变更（单模块功能调整，默认）：完整 spec+plan+tasks+checklist' },
  large: { autoSkipPhases: [], description: '大变更（跨模块/架构调整）：完整四文档+复盘，建议拆分模块分派多个并行 impact-analyzer' },
  urgent: { autoSkipPhases: [2, 3], description: '紧急修复：跳过Phase 2/3，直接tasks+checklist，事后补spec' }
};
const REFERENCES = [
  { file: 'references/impact-analysis-protocol.md', when: 'Phase 2 影响调研时' },
  { file: 'references/sync-protocol.md', when: 'Phase 7 执行变更同步文档时' },
  { file: 'examples/spec-template.md', when: 'Phase 3 产出 L1 spec 时' },
  { file: 'examples/plan-template.md', when: 'Phase 4 产出 L2 plan 时' },
  { file: 'examples/tasks-template.md', when: 'Phase 5 产出 L3 tasks 时' },
  { file: 'examples/checklist-template.md', when: 'Phase 6 产出 checklist 时' },
  { file: 'examples/change-record-template.md', when: 'Phase 9 留痕归档时' }
];
const AGENTS = [
  { file: 'agents/impact-analyzer.md', phases: [2], description: 'Phase 2, 影响调研——扫描已有spec/plan/tasks+相关代码，产出受影响章节、模块、风险清单' }
];
const SCRIPTS = [
  { file: 'validate.js', usage: 'node scripts/validate.js <chg-dir> [--strict]', description: '变更文档硬约束校验主入口（七步管线）' },
  { file: 'query.js', usage: 'node scripts/query.js <chg-dir> --type <type>', description: '无状态流程数据查询' },
  { file: 'flow.js', usage: 'node scripts/flow.js <chg-dir> <command>', description: '有状态流程控制' },
  { file: 'checks/change-spec.js', usage: '(被 validate.js 调用)', description: 'L1 spec 校验' },
  { file: 'checks/change-plan.js', usage: '(被 validate.js 调用)', description: 'L2 plan 校验' },
  { file: 'checks/change-tasks.js', usage: '(被 validate.js 调用)', description: 'L3 tasks 校验' },
  { file: 'checks/change-checklist.js', usage: '(被 validate.js 调用)', description: 'checklist 校验' },
  { file: 'checks/sync-consistency.js', usage: '(被 validate.js 调用)', description: '同步一致性校验' },
  { file: 'checks/change-record.js', usage: '(被 validate.js 调用)', description: 'change-record 校验' }
];
const CONSTRAINTS = {
  HARD: { description: 'scripts/validate.js 七步管线，违反即 fail', enforcement: '违反即 fail，exit code 1' },
  SOFT: { description: 'SKILL.md + references/ + examples/ 中的流程编排、职责边界、场景跳过规则', enforcement: '由 AI 阅读后判断' }
};

run({ skillRoot: path.resolve(__dirname, '..'), META, WORKFLOW, SCENARIOS, REFERENCES, AGENTS, SCRIPTS, CONSTRAINTS }, process.argv.slice(2));
