# Tasks

- [x] Task 1: 重构 references/benchmark-workflow.md
  - [x] SubTask 1.1: 4 步流程对齐 skill-creator（Spawn runs → Draft assertions + Capture timing → Grade + aggregate + rubric + analyst → Launch viewer）
  - [x] SubTask 1.2: rubric 集成到 Step 3（Grade + aggregate 阶段），不再作为独立 Step
  - [x] SubTask 1.3: 新增"角度差异"章节，对比 skill-creator 与 uluo-skill-creator 的评估角度
  - [x] SubTask 1.4: mermaid 流程图更新为 4 步

- [x] Task 2: 更新 SKILL.md Phase 8
  - [x] SubTask 2.1: mermaid 流程图对齐 4 步
  - [x] SubTask 2.2: 描述更新——强调"流程和产出对齐 skill-creator，角度不同"

- [x] Task 3: 更新 references/skill-quality-rubric.md
  - [x] SubTask 3.1: "与 benchmark 的融合"章节去掉"独立步骤"表述
  - [x] SubTask 3.2: 强调 rubric 是 benchmark.json 的扩展字段，不破坏 viewer 兼容性

- [x] Task 4: 验证测试通过
  - [x] SubTask 4.1: 运行所有测试确认无回归（31 passed, 0 failed, 2 skipped）
  - [x] SubTask 4.2: validate-skill.js 通过
  - [x] SubTask 4.3: grade-skill.js 评分 100/100 (A)

# Task Dependencies

- Task 1、3 可并行（独立的 references 文档）
- Task 2 依赖 Task 1（流程图需与 benchmark-workflow.md 一致）
- Task 4 依赖 Task 1、2、3
