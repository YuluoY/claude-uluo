# Tasks

- [x] Task 1: 修正现有 eval 3
  - [x] SubTask 1.1: expected_output 中"完整十阶段流程"→"完整九阶段流程（Phase 0-8）"
  - [x] SubTask 1.2: 移除"Phase 9"引用，流程终点改为"完成"
  - [x] SubTask 1.3: assertions 中"aggregate_benchmark.py 聚合产出 benchmark.json"→"Phase 8 引用 skill-creator 的 aggregate_benchmark.py 聚合结果"

- [x] Task 2: 新增 eval 6（researcher agent 测试）
  - [x] SubTask 2.1: 编写 prompt（涉及调研的场景）
  - [x] SubTask 2.2: 编写 expected_output（Phase 1 触发 researcher agent）
  - [x] SubTask 2.3: 编写 assertions（验证调研报告 JSON 产出）

- [x] Task 3: 新增 eval 7（grader agent 测试）
  - [x] SubTask 3.1: 编写 prompt（Phase 8 评分场景）
  - [x] SubTask 3.2: 编写 expected_output（Phase 8 触发 grader agent）
  - [x] SubTask 3.3: 编写 assertions（验证评分报告 JSON 产出）

- [x] Task 4: 新增 eval 8（version 字段测试）
  - [x] SubTask 4.1: 编写 prompt（创建 skill 时要求 version）
  - [x] SubTask 4.2: 编写 expected_output（frontmatter 包含 version）
  - [x] SubTask 4.3: 编写 assertions（验证 version 字段符合 semver）

- [x] Task 5: 新增 eval 9（指令式写作测试）
  - [x] SubTask 5.1: 编写 prompt（创建 skill 时要求指令式写作）
  - [x] SubTask 5.2: 编写 expected_output（SKILL.md 以指令为主）
  - [x] SubTask 5.3: 编写 assertions（验证指令式写作 + 边界约束保留）

- [x] Task 6: 新增 eval 10（plugin.json 移除测试）
  - [x] SubTask 6.1: 编写 prompt（创建 skill 时不创建 plugin.json）
  - [x] SubTask 6.2: 编写 expected_output（无 .claude-plugin/plugin.json）
  - [x] SubTask 6.3: 编写 assertions（验证无 plugin.json）

- [x] Task 7: 创建 benchmark-example.json
  - [x] SubTask 7.1: 创建 `evals/benchmark-example.json`
  - [x] SubTask 7.2: 对齐 benchmark-workflow.md 的 benchmark.json 产出规范
  - [x] SubTask 7.3: 包含 metadata/configurations/runs/run_summary/rubric_score/notes 字段

- [x] Task 8: 验证测试通过
  - [x] SubTask 8.1: 所有测试通过（37 passed, 2 skipped, 0 failed）
  - [x] SubTask 8.2: validate-skill.js 通过
  - [x] SubTask 8.3: grade-skill.js 评分保持 100/100 (A)

# Task Dependencies

- Task 1-7 可并行（独立的文件修改/创建）
- Task 8 依赖 Task 1-7
