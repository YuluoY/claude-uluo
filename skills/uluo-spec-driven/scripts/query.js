#!/usr/bin/env node
'use strict';
const path = require('path');
const { run } = require('./_shared/query-engine');

const META = { name: 'uluo-spec-driven', version: '0.1.0', description: 'Spec-Driven 设计稿引擎——3层设计稿+细化流程+记录层，覆盖项目全生命周期文档产出' };
const WORKFLOW = [
  { phase: 0, name: '获取作者', description: '运行 git config user.name 获取作者信息，禁止使用占位符或字面量' },
  { phase: 1, name: '识别场景', description: '冲突识别+布局模式判定+文档形态判定+流程深度决策，查场景表确定文档清单' },
  { phase: 2, name: '信息调研', description: '启动 researcher 子代理，跨Context7/GitHub/WebSearch/SO并行搜索，产出research-report.md' },
  { phase: 3, name: '产出 spec', description: '从调研报告提炼结论，产出spec.md：背景+用户故事+目标/非目标+功能需求+非功能需求+验收标准+调研依据' },
  { phase: 4, name: '源码分析', description: '加载analysis-protocol.md，四层分析+锚点模块法+调用链追踪+复用识别' },
  { phase: 5, name: '产出 plans', description: '加载plan-template.md，产出plans/README.md总入口+子plan（按需）：架构概览+关键决策+模块设计+数据模型+API契约+测试策略+回滚方案' },
  { phase: 6, name: '产出 tasks', description: '加载tasks-template.md，按phase拆分tasks/phase*.md：每任务标注产出路径+参考代码+复用模块' },
  { phase: 7, name: '执行编码', description: '按tasks逐phase实现，测试通过后追加CHANGELOG（加载changelog-template.md）' },
  { phase: 8, name: '验收', description: '可选启动reviewer子代理，加载verification-report-template.md，对照spec逐条验证，产出verification-report.md' },
  { phase: 9, name: '复盘', description: '加载retrospective-template.md，产出retrospective.md：What Went Well/Better/Lessons/Action Items' }
];
const SCENARIOS = {
  bugfix: { autoSkipPhases: [2, 4, 5], description: 'Bug修复：跳过调研和plan，spec+tasks简化执行' },
  small: { autoSkipPhases: [4], description: '小功能新增：源码分析从简，spec+plan(单文件)+tasks(2-3 phase)' },
  medium: { autoSkipPhases: [], description: '中功能新增（默认）：完整research-report+spec+plans+tasks+验收' },
  large: { autoSkipPhases: [], description: '大功能/重构：完整十阶段+复盘，researcher+reviewer双代理' },
  'design-explore': { autoSkipPhases: [3, 4, 5, 6, 7, 8, 9], description: '设计探索类产出：仅Phase 0/1+可选调研，直接产出单文件或设计目录' }
};
const REFERENCES = [
  { file: 'references/research-protocol.md', when: 'Phase 2 启动调研前必读' },
  { file: 'references/analysis-protocol.md', when: 'Phase 4 源码分析前必读' },
  { file: 'references/file-conventions.md', when: 'Phase 1 判定场景和建目录时参考' },
  { file: 'references/design-doc-protocol.md', when: '产出设计文档（L0/L1/L2）时加载' }
];
const AGENTS = [
  { file: 'agents/researcher.md', phases: [2], description: 'Phase 2, 多源信息调研——跨Context7/GitHub/WebSearch/SO并行搜索，综合为调研报告' },
  { file: 'agents/reviewer.md', phases: [8], description: 'Phase 8, 文档质量审查——对抗性审查spec/plan/tasks/report' }
];
const SCRIPTS = [
  { file: 'validate.js', usage: 'node scripts/validate.js <spec-dir> [--strict]', description: '文档规范校验主入口（5步管线：结构→章节→格式→链接→CHANGELOG）' },
  { file: 'query.js', usage: 'node scripts/query.js <spec-dir> --type <type>', description: '无状态流程数据查询' },
  { file: 'flow.js', usage: 'node scripts/flow.js <spec-dir> <command>', description: '有状态流程控制' },
  { file: 'checks/spec.js', usage: '(被 validate.js 调用)', description: 'spec.md 章节校验' },
  { file: 'checks/plan.js', usage: '(被 validate.js 调用)', description: 'plans/ 文档校验' },
  { file: 'checks/tasks.js', usage: '(被 validate.js 调用)', description: 'tasks/ 文档校验' },
  { file: 'checks/research-report.js', usage: '(被 validate.js 调用)', description: 'research-report.md 校验' },
  { file: 'checks/changelog.js', usage: '(被 validate.js 调用)', description: 'CHANGELOG 格式校验' },
  { file: 'checks/verification-report.js', usage: '(被 validate.js 调用)', description: 'verification-report.md 校验' },
  { file: 'checks/retrospective.js', usage: '(被 validate.js 调用)', description: 'retrospective.md 校验' }
];
const CONSTRAINTS = {
  HARD: { description: 'scripts/validate.js 5步管线，违反即 fail', enforcement: '违反即 fail，exit code 1' },
  SOFT: { description: 'SKILL.md + references/ + examples/ 中的流程编排、文档模型、场景跳过规则', enforcement: '由 AI 阅读后判断' }
};

run({ skillRoot: path.resolve(__dirname, '..'), META, WORKFLOW, SCENARIOS, REFERENCES, AGENTS, SCRIPTS, CONSTRAINTS }, process.argv.slice(2));
