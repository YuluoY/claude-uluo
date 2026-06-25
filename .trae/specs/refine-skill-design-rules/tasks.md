# Tasks

- [x] Task 1: 修改 references/skillmd-spec.md
  - [x] SubTask 1.1: 明确规范适用于"产出的 skill"（不仅 uluo-skill-creator 自身）
  - [x] SubTask 1.2: 新增"内容结构化描述"规则（表格/列表/代码块/mermaid）
  - [x] SubTask 1.3: 放宽行数约束（< 300 正常，300-500 警告，≥ 800 fail）
  - [x] SubTask 1.4: 补充"流程编排禁止细节"规则——重点内容可放 SKILL.md 但要结构化

- [x] Task 2: 修改 references/skill-quality-rubric.md
  - [x] SubTask 2.1: 文档质量维度行数评分放宽
  - [x] SubTask 2.2: 新增"内容结构化"评分项

- [x] Task 3: 修改 scripts/grade-skill.js
  - [x] SubTask 3.1: 文档质量维度行数评分逻辑放宽
  - [x] SubTask 3.2: 新增内容结构化检查

- [x] Task 4: 修改 scripts/checks/skillmd.js
  - [x] SubTask 4.1: 行数校验阈值放宽

- [x] Task 5: 修改 SKILL.md
  - [x] SubTask 5.1: 禁止事项中的行数约束描述更新
  - [x] SubTask 5.2: 明确 references/ 规范适用于产出的 skill

- [x] Task 6: 更新测试
  - [x] SubTask 6.1: 更新 skillmd.test.js 的行数测试
  - [x] SubTask 6.2: 更新 grade-skill.test.js 的行数相关测试

# Task Dependencies

- Task 1、2 可并行（独立的 references 文档）
- Task 3 依赖 Task 2（评分脚本需要 rubric 标准）
- Task 4 独立
- Task 5 依赖 Task 1
- Task 6 依赖 Task 3、4
