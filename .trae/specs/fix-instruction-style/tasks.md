# Tasks

- [x] Task 1: 精简 SKILL.md
  - [x] SubTask 1.1: 移除纯解释段落（保留边界约束条件依据）
  - [x] SubTask 1.2: 移除"远程引用 skill-creator"独立章节——Phase 8 直接说明"使用 skill-creator 脚本"
  - [x] SubTask 1.3: 重点先行加粗规则（**关键词**：展开描述）

- [x] Task 2: 精简 references/skillmd-spec.md
  - [x] SubTask 2.1: 移除纯解释（如"Claude 仅根据 name + description 决定是否调用"），保留边界约束
  - [x] SubTask 2.2: 加粗规则应用

- [x] Task 3: 精简 references/hard-soft-constraint.md
  - [x] SubTask 3.1: 移除纯解释（如"降低 token 是核心目标"），保留约束条件
  - [x] SubTask 3.2: 精简为指令式，加粗规则应用

- [x] Task 4: 精简 references/skill-quality-rubric.md
  - [x] SubTask 4.1: 移除纯解释（如"assertions 回答...rubric 回答..."），保留评分标准

- [x] Task 5: 精简 references/benchmark-workflow.md
  - [x] SubTask 5.1: 移除纯解释
  - [x] SubTask 5.2: skill-creator 作为环节直接引用（不描述"引用方式"）

- [x] Task 6: 处理 references/remote-skill-creator.md
  - [x] SubTask 6.1: 精简为必需环节说明（skill-creator 是 Phase 8 环节，本地有则用，无则 GitHub raw 获取）

- [x] Task 7: 检查 references/skill-anatomy.md
  - [x] SubTask 7.1: 检查并应用加粗规则（无纯解释需删除）

- [x] Task 8: 验证测试通过
  - [x] SubTask 8.1: 所有测试通过（34 passed, 0 failed, 2 skipped）
  - [x] SubTask 8.2: validate-skill.js 通过
  - [x] SubTask 8.3: grade-skill.js 评分 100/100 (A)

- [x] Task 9: 确保 references/ 规范适用于产出 skill
  - [x] SubTask 9.1: skillmd-spec.md 明确"本规范适用于用户创建的所有 skill"
  - [x] SubTask 9.2: hard-soft-constraint.md 明确"本规范适用于用户创建的所有 skill"
  - [x] SubTask 9.3: Phase 7 校验说明中包含"检查产出 skill 是否符合写作规范"

# Task Dependencies

- Task 1-7 可并行（独立的 references/SKILL.md 文档）
- Task 8 依赖 Task 1-7
- Task 9 可与 Task 1-7 并行（规范适用范围说明）
