# Tasks

- [x] Task 1: 创建 researcher agent md 文件
  - [x] SubTask 1.1: 创建 `agents/researcher.md`，全中文，单一职责（综合调研）
  - [x] SubTask 1.2: 内置领域识别关键词 → 推荐渠道规则
  - [x] SubTask 1.3: 定义输入（skill 需求描述）、输出（调研报告 JSON）、流程（5 步骤）

- [x] Task 2: 创建通用渠道调研脚本
  - [x] SubTask 2.1: 创建 `scripts/research.js`——本地 skill 扫描 + anthropics/skills 参考
  - [x] SubTask 2.2: 输入 skill 需求关键词，输出类似 skill 列表 JSON
  - [x] SubTask 2.3: 支持 `--json` 参数输出 JSON 格式

- [x] Task 3: 创建脚本测试
  - [x] SubTask 3.1: 创建 `scripts/__tests__/research.test.js`
  - [x] SubTask 3.2: 测试本地 skill 扫描功能
  - [x] SubTask 3.3: 测试关键词匹配逻辑

- [x] Task 4: 更新 agents-decision.md
  - [x] SubTask 4.1: 运行时 agent 示例增加 researcher（与 grader 并列）
  - [x] SubTask 4.2: 更新决策树，Phase 1 调研环节可引用 researcher

- [x] Task 5: 更新 SKILL.md
  - [x] SubTask 5.1: Phase 1 调研引用 researcher agent
  - [x] SubTask 5.2: references 引用时机表更新（Phase 1 标注 researcher agent）
  - [x] SubTask 5.3: agents 目录决策章节更新（grader + researcher 两个运行时 agent）

- [x] Task 6: 检查 agent-creation-guide.md
  - [x] SubTask 6.1: 检查是否需补充多 agent 协作说明（grader + researcher 分工）
  - [x] SubTask 6.2: 添加多 agent 协作章节（分工表 + 协作规范 + 拆分时机）

- [x] Task 7: 验证测试通过
  - [x] SubTask 7.1: 所有测试通过（37 passed, 0 failed, 2 skipped）
  - [x] SubTask 7.2: validate-skill.js 通过
  - [x] SubTask 7.3: grade-skill.js 评分保持 100/100 (A)

# Task Dependencies

- Task 1-3 可并行（独立的文件创建）
- Task 4-6 可并行（独立的文档更新）
- Task 7 依赖 Task 1-6
