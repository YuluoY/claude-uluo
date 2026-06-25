# Tasks

- [x] Task 1: 修改 scripts/checks/structure.js
  - [x] SubTask 1.1: 删除 plugin.json 必需文件校验代码
  - [x] SubTask 1.2: 删除 plugin.json 字段完整性校验代码
  - [x] SubTask 1.3: 必需文件仅保留 SKILL.md

- [x] Task 2: 修改 references/skill-anatomy.md
  - [x] SubTask 2.1: 删除"plugin.json 字段要求"章节
  - [x] SubTask 2.2: 必需文件清单表格中删除 plugin.json 行
  - [x] SubTask 2.3: 标准目录结构图中删除 .claude-plugin/plugin.json
  - [x] SubTask 2.4: 目录创建顺序中删除 plugin.json 步骤
  - [x] SubTask 2.5: 现有 skill 目录结构示例中删除 .claude-plugin/plugin.json

- [x] Task 3: 修改项目 CLAUDE.md
  - [x] SubTask 3.1: 新增"workspace 打包规范"章节
  - [x] SubTask 3.2: 包含 plugin.json 字段规范

- [x] Task 4: 更新测试
  - [x] SubTask 4.1: structure.test.js 删除 plugin.json 相关测试用例
  - [x] SubTask 4.2: helpers.js createValidSkill 不再创建 plugin.json
  - [x] SubTask 4.3: integration.test.js 调整
  - [x] SubTask 4.4: grade-skill.test.js fixture 调整
  - [x] SubTask 4.5: grade-skill.js 删除 plugin.json 评分逻辑，重新分配分值（8/6/6）
  - [x] SubTask 4.6: 所有测试通过（29 passed, 0 failed, 2 skipped）

- [x] Task 5: 检查其他文件
  - [x] SubTask 5.1: SKILL.md 检查（无 plugin.json 提及）
  - [x] SubTask 5.2: hard-soft-constraint.md 示例删除 plugin.json 引用
  - [x] SubTask 5.3: examples/ 模板删除 plugin.json 文件
  - [x] SubTask 5.4: benchmark-workflow.md 删除 plugin.json 引用
  - [x] SubTask 5.5: skill-quality-rubric.md 删除 plugin.json 评分项
  - [x] SubTask 5.6: evals/evals.json 删除 plugin.json 相关 assertion

# Task Dependencies

- Task 1、2、3、5 可并行
- Task 4 依赖 Task 1
