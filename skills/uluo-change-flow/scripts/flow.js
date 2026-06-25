#!/usr/bin/env node
'use strict';
const path = require('path');
const { run } = require('./_shared/flow-engine');

const META = { name: 'uluo-change-flow', version: '0.1.0' };
const WORKFLOW = [
  { phase: 0, name: '获取作者', description: '通过 git config user.name 获取变更作者信息，禁止使用占位符', referencesToRead: [], requiredActions: ['执行 git config user.name 获取作者', '确认作者信息非占位符'], expectedOutputs: ['作者姓名'], gates: [] },
  { phase: 1, name: '识别变更', description: '定位目标特性目录 specs/<feature>/，目标不存在则提示用户先创建', referencesToRead: [], requiredActions: ['定位 specs/<feature>/ 目录', '确认目标特性存在'], expectedOutputs: ['目标特性目录路径', '已有文档清单'], gates: [] },
  { phase: 2, name: '影响调研', description: '扫描已有 spec/plan/tasks + 相关代码，启用 impact-analyzer 子代理，产出影响清单（受影响章节+模块+风险）', referencesToRead: ['references/impact-analysis-protocol.md'], requiredActions: ['读取已有 spec/plan/tasks', '扫描相关代码文件', '中变更以上启用 impact-analyzer', '产出影响清单'], expectedOutputs: ['受影响章节列表', '受影响模块列表', '风险评估'], gates: [] },
  { phase: 3, name: '产出 L1 spec', description: '加载 spec-template，撰写变更范围：变了什么/为什么/影响多大。不写具体怎么改', referencesToRead: ['examples/spec-template.md'], requiredActions: ['创建 CHG-<NNN>/ 目录', '基于 spec-template 撰写 spec.md', '包含变更背景/影响范围/决策结论'], expectedOutputs: ['spec.md（L1变更范围文档）'], gates: [{ type: 'file-exists', path: 'spec.md', description: 'spec.md 必须存在', failureSuggestion: '请完成 Phase 3：基于 spec-template 创建 spec.md' }] },
  { phase: 4, name: '产出 L2 plan', description: '加载 plan-template，设计变更方案：怎么改/delta(MODIFIED/ADDED/REMOVED)/技术选型。不写文件路径', referencesToRead: ['examples/plan-template.md'], requiredActions: ['基于 plan-template 撰写 plan.md', 'delta 区分 MODIFIED/ADDED/REMOVED', '技术选型有对比'], expectedOutputs: ['plan.md（L2变更方案文档）'], gates: [{ type: 'file-exists', path: 'plan.md', description: 'plan.md 必须存在', failureSuggestion: '请完成 Phase 4：基于 plan-template 创建 plan.md' }] },
  { phase: 5, name: '产出 L3 tasks', description: '加载 tasks-template，编写文件级执行任务：动词开头/文件路径/依赖/调研标注', referencesToRead: ['examples/tasks-template.md'], requiredActions: ['基于 tasks-template 撰写 tasks.md', '任务以动词开头', '标注文件路径和依赖', '调研任务标注方式'], expectedOutputs: ['tasks.md（L3执行任务清单）'], gates: [{ type: 'file-exists', path: 'tasks.md', description: 'tasks.md 必须存在', failureSuggestion: '请完成 Phase 5：基于 tasks-template 创建 tasks.md' }] },
  { phase: 6, name: '产出 checklist', description: '加载 checklist-template，从三层抽取 review 检查点，独立于文档正文，逐条可review', referencesToRead: ['examples/checklist-template.md'], requiredActions: ['基于 checklist-template 创建 checklist.md', '从三层抽取 review 检查点', '不重复文档正文'], expectedOutputs: ['checklist.md（独立review检查清单）'], gates: [{ type: 'file-exists', path: 'checklist.md', description: 'checklist.md 必须存在', failureSuggestion: '请完成 Phase 6：基于 checklist-template 创建 checklist.md' }] },
  { phase: 7, name: '执行变更', description: '按 L3 tasks 逐项执行：修改 spec.md/plan.md/tasks.md/代码/设计稿，参考 sync-protocol', referencesToRead: ['references/sync-protocol.md'], requiredActions: ['按 tasks.md 逐项执行', '修改原始 spec/plan/tasks', '修改代码/设计稿', '同步更新下游文档'], expectedOutputs: ['变更后的代码', '更新后的文档'], gates: [] },
  { phase: 8, name: 'Review', description: '逐条检查 checklist，运行 validate.js --strict 硬约束校验；不通过则回退到出问题层级修复→同步下游→重新review', referencesToRead: [], requiredActions: ['逐条检查 checklist', '运行 validate.js --strict', '不通过项回退修复→同步下游→重新review'], expectedOutputs: ['checklist 全部 [x] 通过', 'validate.js --strict 零失败'], gates: [{ type: 'script-exit-code', command: 'node scripts/validate.js . --strict', description: 'validate.js --strict 必须全部通过', failureSuggestion: '修复校验错误后重新 complete。如需回退，使用 rollback <phaseId>' }] },
  { phase: 9, name: '留痕归档', description: '加载 change-record-template，产出 change-record.md 记录 review 结论+回退历史，归档到 CHG-<NNN>/', referencesToRead: ['examples/change-record-template.md'], requiredActions: ['基于 change-record-template 创建 change-record.md', '记录 review 通过结论', '记录回退历史（如有）', '确认归档到 CHG-<NNN>/'], expectedOutputs: ['change-record.md（变更归档记录）'], gates: [{ type: 'file-exists', path: 'change-record.md', description: 'change-record.md 必须存在', failureSuggestion: '请完成 Phase 9：创建 change-record.md 归档' }] }
];
const SCENARIOS = {
  small: { autoSkipPhases: [4], description: '小变更（单字段/单样式）：Phase 2 可从简，L2合并到L1，产出 spec+tasks+checklist' },
  medium: { autoSkipPhases: [], description: '中变更（单模块功能调整，默认）：完整 spec+plan+tasks+checklist' },
  large: { autoSkipPhases: [], description: '大变更（跨模块/架构调整）：完整四文档+复盘，建议拆分模块分派多个并行 impact-analyzer' },
  urgent: { autoSkipPhases: [2, 3], description: '紧急修复：跳过Phase 2/3，直接tasks+checklist，事后补spec' }
};

run({ skillRoot: path.resolve(__dirname, '..'), META, WORKFLOW, SCENARIOS }, process.argv.slice(2));
