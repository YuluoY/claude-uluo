# Tasks

- [x] Task 1: 修改 SKILL.md
  - [x] SubTask 1.1: frontmatter 新增 version 字段（0.2.0）
  - [x] SubTask 1.2: 移除所有"**短重点**："标签，改为重点先行+展开描述风格
  - [x] SubTask 1.3: 移除 Phase 9"打包发布"，十阶段→九阶段（Phase 0-8）
  - [x] SubTask 1.4: mermaid 流程图更新（终点改为"完成"）
  - [x] SubTask 1.5: 职能边界表"Phase 0-9"→"Phase 0-8"

- [x] Task 2: 修改 references/skillmd-spec.md
  - [x] SubTask 2.1: frontmatter 必需字段表新增 version
  - [x] SubTask 2.2: 重写"短重点：描述/细节展开"章节为"重点先行写作模式"
  - [x] SubTask 2.3: 移除所有"**短重点**："标签示例（保留反例中的故意引用）

- [x] Task 3: 修改 references/skill-anatomy.md
  - [x] SubTask 3.1: 无需修改（skill-anatomy.md 不含 frontmatter 字段详述，由 skillmd-spec.md 负责）

- [x] Task 4: 修改 references/skill-quality-rubric.md
  - [x] SubTask 4.1: 移除"短重点"相关表述
  - [x] SubTask 4.2: 文档质量维度 frontmatter 评分项新增 version
  - [x] SubTask 4.3: 引用时机表"Phase 9 打包前"→"Phase 8 完成前"

- [x] Task 5: 修改 references/benchmark-workflow.md
  - [x] SubTask 5.1: mermaid 终点"进入 Phase 9 打包发布"→"完成"

- [x] Task 6: 修改 scripts/checks/skillmd.js
  - [x] SubTask 6.1: 新增 version 字段校验（非空 + semver 格式）

- [x] Task 7: 修改 scripts/grade-skill.js
  - [x] SubTask 7.1: 文档质量维度 frontmatter 评分新增 version 检查

- [x] Task 8: 更新测试
  - [x] SubTask 8.1: skillmd.test.js 新增 3 个 version 测试（正例 pre-release + 反例缺失 + 反例格式错误）
  - [x] SubTask 8.2: grade-skill.test.js fixture 加 version
  - [x] SubTask 8.3: helpers.js createValidSkill 加 version
  - [x] SubTask 8.4: 所有测试通过（34 passed, 0 failed, 2 skipped）
  - [x] SubTask 8.5: validate-skill.js 通过
  - [x] SubTask 8.6: grade-skill.js 评分 100/100 (A)

# Task Dependencies

- Task 1、2、3、4、5 可并行（独立的 references/SKILL.md 文档）
- Task 6 依赖 Task 2（校验逻辑需与 spec 一致）
- Task 7 依赖 Task 4（评分逻辑需与 rubric 一致）
- Task 8 依赖 Task 6、7
