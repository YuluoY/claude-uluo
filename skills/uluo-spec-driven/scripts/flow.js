#!/usr/bin/env node
'use strict';

const path = require('path');
const { run } = require('./_shared/flow-engine');

const skillRoot = path.resolve(__dirname, '..');

const META = { name: 'uluo-spec-driven', version: '0.1.0', description: 'Spec-Driven 设计稿引擎——3层设计稿+细化流程+记录层，覆盖项目全生命周期文档产出' };

const P = (phase, name, description, refs, actions, outputs, gates) =>
  ({ phase, name, description, referencesToRead: refs || [], requiredActions: actions, expectedOutputs: outputs, gates: gates || [] });

const G = (type, p, desc, suggestion) => ({ type, path: p, description: desc, failureSuggestion: suggestion });

const WORKFLOW = [
  P(0, '获取作者', '运行 git config user.name 获取作者信息，禁止使用占位符或字面量', [],
    ['执行 git config user.name 获取作者', '确认作者信息非占位符'], ['作者姓名']),
  P(1, '识别场景', '冲突识别+布局模式判定+文档形态判定+流程深度决策，查场景表确定文档清单',
    ['references/file-conventions.md'],
    ['执行 specs/ 冲突识别', '判定布局模式（单层/领域分层）', '判定文档形态与流程深度', '查场景表确定文档清单'],
    ['场景判定结果', '文档清单', '目录结构方案']),
  P(2, '信息调研', '启动 researcher 子代理，跨Context7/GitHub/WebSearch/SO并行搜索，产出research-report.md',
    ['references/research-protocol.md'],
    ['列出知识缺口清单', '中功能以上启动 researcher 子代理', '跨多源并行搜索', '综合为 research-report.md（简化场景可跳过产出）'],
    ['research-report.md（标准场景）']),
  P(3, '产出 spec', '从调研报告提炼结论，产出spec.md：背景+用户故事+目标/非目标+功能需求+非功能需求+验收标准+调研依据',
    ['examples/spec-template.md'],
    ['基于 spec-template 创建 spec.md', '提炼调研报告结论（如无调研则直接撰写）', '包含背景/用户故事/目标/非目标/功能需求/非功能需求/验收标准/调研依据'],
    ['spec.md'],
    [G('file-exists', 'spec.md', 'spec.md 必须存在', '请完成 Phase 3：基于 spec-template 创建 spec.md')]),
  P(4, '源码分析', '加载analysis-protocol.md，四层分析+锚点模块法+调用链追踪+复用识别',
    ['references/analysis-protocol.md'],
    ['四层分析（架构/模块/文件/代码）', '锚点模块法定位关键代码', '调用链追踪', '复用模块识别'],
    ['源码分析结论（写入 plans/）']),
  P(5, '产出 plans', '加载plan-template.md，产出plans/README.md总入口+子plan（按需）：架构概览+关键决策+模块设计+数据模型+API契约+测试策略+回滚方案',
    ['examples/plan-template.md'],
    ['基于 plan-template 创建 plans/README.md', '包含架构概览+关键决策+模块设计+数据模型+API契约+测试策略+回滚方案', '多 slice 时拆分子 plan'],
    ['plans/README.md', '子 plan（按需）'],
    [G('file-exists', 'plans/README.md', 'plans/README.md 必须存在', '请完成 Phase 5：基于 plan-template 创建 plans/README.md')]),
  P(6, '产出 tasks', '加载tasks-template.md，按phase拆分tasks/phase*.md：每任务标注产出路径+参考代码+复用模块',
    ['examples/tasks-template.md'],
    ['创建 tasks/ 目录', '基于 tasks-template 按 phase 拆分 tasks/phase*.md', '每任务标注产出路径+参考代码+复用模块', '至少拆分为2个 phase'],
    ['tasks/phase1.md', 'tasks/phase2.md', '...'],
    [G('dir-exists', 'tasks', 'tasks/ 目录必须存在', '请完成 Phase 6：创建 tasks/ 目录并拆分 phase*.md'),
     G('file-exists', 'tasks/phase1.md', '至少有 phase1.md', 'tasks/ 必须至少包含 phase1.md')]),
  P(7, '执行编码', '按tasks逐phase实现，测试通过后追加CHANGELOG（加载changelog-template.md）',
    ['examples/changelog-template.md'],
    ['按 tasks 逐 phase 实现代码', '每完成一个任务立即勾选 tasks/phase*.md 对应任务（[ ]→[x]）——任务清单即进度看板', '每个 phase 测试通过', '测试通过后追加 CHANGELOG', '同步更新文档'],
    ['实现后的代码', '更新后的文档', 'tasks/phase*.md 任务状态全部勾选', 'CHANGELOG 追加条目'],
    [{ type: 'script-exit-code', command: 'node scripts/validate.js . --strict', description: 'validate.js --strict 必须通过', failureSuggestion: '修复文档校验错误后重试' }]),
  P(8, '验收', '可选启动reviewer子代理，加载verification-report-template.md，对照spec逐条验证，产出verification-report.md',
    ['examples/verification-report-template.md'],
    ['对照 spec 逐条验证验收标准', '中功能以上可选启动 reviewer 子代理', '基于 verification-report-template 创建 verification-report.md', '记录偏差说明'],
    ['verification-report.md'],
    [G('file-exists', 'verification-report.md', 'verification-report.md 必须存在', '请完成 Phase 8：创建 verification-report.md 验收报告')]),
  P(9, '复盘', '加载retrospective-template.md，产出retrospective.md：What Went Well/Better/Lessons/Action Items',
    ['examples/retrospective-template.md'],
    ['基于 retrospective-template 创建 retrospective.md', 'What Went Well / Better / Lessons / Action Items'],
    ['retrospective.md'],
    [G('file-exists', 'retrospective.md', 'retrospective.md 必须存在', '请完成 Phase 9：创建 retrospective.md 复盘文档')])
];

const SCENARIOS = {
  bugfix: { autoSkipPhases: [2, 4, 5], description: 'Bug修复：跳过调研和plan，spec+tasks简化执行' },
  small: { autoSkipPhases: [4], description: '小功能新增：源码分析从简，spec+plan(单文件)+tasks(2-3 phase)' },
  medium: { autoSkipPhases: [], description: '中功能新增（默认）：完整research-report+spec+plans+tasks+验收' },
  large: { autoSkipPhases: [], description: '大功能/重构：完整十阶段+复盘，researcher+reviewer双代理' },
  'design-explore': { autoSkipPhases: [3, 4, 5, 6, 7, 8, 9], description: '设计探索类产出：仅Phase 0/1+可选调研，直接产出单文件或设计目录' }
};

run({ META, WORKFLOW, SCENARIOS, skillRoot }, process.argv.slice(2));
