# Tasks

- [x] Task 1: 重命名并重写 agent md 文件
  - [x] SubTask 1.1: 删除 `agents/skill-quality-grader.md`
  - [x] SubTask 1.2: 创建 `agents/grader.md`，内容改写为全中文（保留专有名词英文）
  - [x] SubTask 1.3: 保持单一职责（只做 skill 质量评分，不扩展职责）

- [x] Task 2: 更新 agent-creation-guide.md 示例为中文
  - [x] SubTask 2.1: 指令式示例改写为中文（"Read the transcript" → "完整读取 transcript 文件"）
  - [x] SubTask 2.2: Guidelines 示例改写为中文（"Be objective" → "客观评分"）
  - [x] SubTask 2.3: PASS/FAIL 条件示例改写为中文（保留 PASS/FAIL 标识）
  - [x] SubTask 2.4: JSON 输出示例中的英文描述改写为中文

- [x] Task 3: 更新 agent-template.md 模板为中文
  - [x] SubTask 3.1: 模板骨架改写为中文（"You receive these parameters" → "接收以下参数"）
  - [x] SubTask 3.2: 占位符说明改写为中文
  - [x] SubTask 3.3: 使用指引改写为中文

- [x] Task 4: 更新 agents-decision.md 示例引用
  - [x] SubTask 4.1: 将 `constraint-auditor` 引用更新为 `grader`
  - [x] SubTask 4.2: 检查其他示例引用是否一致

- [x] Task 5: 检查并更新 SKILL.md 引用
  - [x] SubTask 5.1: 检查 agents 目录决策章节是否引用了旧文件名
  - [x] SubTask 5.2: 无需修改（引用的是 agents-decision.md 和 agent-creation-guide.md，不直接引用具体 agent 文件）

- [x] Task 6: 验证测试通过
  - [x] SubTask 6.1: 所有测试通过（29 passed, 0 failed, 2 skipped）
  - [x] SubTask 6.2: validate-skill.js 通过
  - [x] SubTask 6.3: grade-skill.js 评分保持 100/100 (A)

# Task Dependencies

- Task 1-5 可并行（独立的文件修改）
- Task 6 依赖 Task 1-5
