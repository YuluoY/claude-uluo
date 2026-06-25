# Tasks

- [x] Task 1: 扩展 references/skillmd-spec.md（写作规范）
  - [x] SubTask 1.1: 新增"SKILL.md 是流程编排，禁止细节"规则
  - [x] SubTask 1.2: 新增"mermaid 优先"规则（流程图、决策树、状态转换）
  - [x] SubTask 1.3: 新增"短重点：描述/细节展开"写作风格指南

- [x] Task 2: 新增 references/agents-decision.md
  - [x] SubTask 2.1: 何时需要 agents 目录的决策规则
  - [x] SubTask 2.2: 决策树（mermaid flowchart）
  - [x] SubTask 2.3: 子代理设计规范（输入/输出/并行策略）

- [x] Task 3: 新增 references/skill-quality-rubric.md
  - [x] SubTask 3.1: 5 维度评分卡（结构/流程/约束/文档/测试）
  - [x] SubTask 3.2: 评分等级标准（A/B/C/D）
  - [x] SubTask 3.3: 每个维度的评分细则和扣分规则

- [x] Task 4: 新增 references/benchmark-workflow.md
  - [x] SubTask 4.1: 测试/审计 benchmark 流程规范（对齐 skill-creator）
  - [x] SubTask 4.2: 引用 skill-creator 脚本的方式（远程/npx/本地 fallback）
  - [x] SubTask 4.3: benchmark.json 产出规范（对齐 schemas.md）
  - [x] SubTask 4.4: rubric 评分如何融入 benchmark

- [x] Task 5: 重构 SKILL.md（mermaid + 短重点 + 内部 loop + 职能边界）
  - [x] SubTask 5.1: Phase 流程图改为 mermaid flowchart（含校验回退 loop）
  - [x] SubTask 5.2: 写作风格改为"短重点：描述/细节展开"
  - [x] SubTask 5.3: 新增职能边界章节（做什么、不做什么）
  - [x] SubTask 5.4: 新增 agents 决策指针（引用 agents-decision.md）
  - [x] SubTask 5.5: Phase 8 重构为"对齐 skill-creator 的 benchmark 流程编排"
  - [x] SubTask 5.6: 精简至 < 150 行（细节抽离到 references/）

- [x] Task 6: 新增 scripts/grade-skill.js 评分脚本
  - [x] SubTask 6.1: 基于 rubric 的 5 维度评分逻辑
  - [x] SubTask 6.2: 输出评分报告（JSON + 人类可读）
  - [x] SubTask 6.3: 退出码（A/B → 0，C/D → 1）

- [x] Task 7: 新增评分脚本测试
  - [x] SubTask 7.1: `__tests__/grade-skill.test.js`——评分脚本测试（正反例）

- [x] Task 8: 完善 evals/evals.json
  - [x] SubTask 8.1: 为现有 3 个测试用例增加 assertions
  - [x] SubTask 8.2: 新增边界场景测试用例

- [x] Task 9: 评估是否需要 agents/ 目录
  - [x] SubTask 9.1: 按 agents-decision.md 决策规则评估
  - [x] SubTask 9.2: 如需要，创建 agents/grader.md 和 agents/analyzer.md（或引用 skill-creator 的）

# Task Dependencies

- Task 1、2、3、4 可并行（独立的 references 文档）
- Task 5 依赖 Task 1、2、3、4（SKILL.md 重构需要所有 references 就位）
- Task 6 依赖 Task 3（评分脚本需要 rubric 标准）
- Task 7 依赖 Task 6
- Task 8 独立
- Task 9 依赖 Task 2（需要 agents-decision.md 的决策规则）
