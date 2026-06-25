# Checklist

## references/skillmd-spec.md 扩展
- [x] 新增"SKILL.md 是流程编排，禁止细节"规则
- [x] 新增"mermaid 优先"规则
- [x] 新增"短重点：描述/细节展开"写作风格指南

## references/agents-decision.md
- [x] 何时需要 agents 目录的决策规则
- [x] 决策树（mermaid flowchart）
- [x] 子代理设计规范（输入/输出/并行策略）

## references/skill-quality-rubric.md
- [x] 5 维度评分卡（结构/流程/约束/文档/测试）
- [x] 评分等级标准（A/B/C/D）
- [x] 每个维度的评分细则和扣分规则

## references/benchmark-workflow.md
- [x] 测试/审计 benchmark 流程规范（对齐 skill-creator）
- [x] 引用 skill-creator 脚本的方式（远程/npx/本地 fallback）
- [x] benchmark.json 产出规范（对齐 schemas.md）
- [x] rubric 评分如何融入 benchmark

## SKILL.md 重构
- [x] Phase 流程图改为 mermaid flowchart（含校验回退 loop）
- [x] 写作风格改为"短重点：描述/细节展开"
- [x] 新增职能边界章节（做什么、不做什么）
- [x] 新增 agents 决策指针（引用 agents-decision.md）
- [x] Phase 8 重构为"对齐 skill-creator 的 benchmark 流程编排"
- [x] SKILL.md 行数 < 150（实际 140 行）
- [x] 细节已抽离到 references/

## scripts/grade-skill.js
- [x] 基于 rubric 的 5 维度评分逻辑
- [x] 输出评分报告（JSON + 人类可读）
- [x] 退出码（A/B → 0，C/D → 1）
- [x] 脚本可独立执行（node scripts/grade-skill.js <path>）

## 评分脚本测试
- [x] `__tests__/grade-skill.test.js`——评分脚本测试（正反例）
- [x] 所有测试通过

## evals 完善
- [x] 现有 3 个测试用例增加 assertions
- [x] 新增边界场景测试用例

## agents/ 目录评估
- [x] 按 agents-decision.md 决策规则评估
- [x] 如需要，创建 agents/grader.md 和 agents/analyzer.md（或引用 skill-creator 的）

## 职能边界验证
- [x] 明确了"做什么"和"不做什么"
- [x] 不重写 skill-creator 的工具（引用 run_eval.py / aggregate_benchmark.py / generate_review.py）
- [x] 避免过度设计（简单 skill 仍可简单创建）

## benchmark 数据能力验证
- [x] 测试/审计流程对齐 skill-creator（evals → grader → aggregate → viewer）
- [x] 产出对齐（benchmark.json + benchmark.md + viewer）
- [x] rubric 评分作为额外 benchmark 维度
- [x] uluo-skill-creator 自身可作为 benchmark 数据存在
