# Tasks

- [x] Task 1: 创建 skill 目录结构和 plugin 包装
  - [x] SubTask 1.1: 创建 `skills/uluo-change-flow/` 目录
  - [x] SubTask 1.2: 创建 `.claude-plugin/plugin.json`（最小 plugin 包装）
  - [x] SubTask 1.3: 在 `marketplace.json` 中注册 `uluo-change-flow`

- [x] Task 2: 编写 SKILL.md 编排器
  - [x] SubTask 2.1: 定义三级递进 + 独立验收模型（L1 spec / L2 plan / L3 tasks + 独立 checklist）
  - [x] SubTask 2.2: 定义三层职责边界（spec 范围 / plan 方案 / tasks 执行 / checklist 验收）
  - [x] SubTask 2.3: 定义执行协议（Phase 0-9）
  - [x] SubTask 2.4: 定义场景跳过规则（小/中/大/紧急）
  - [x] SubTask 2.5: 定义文件存放约定（changes/CHG-NNN/ 结构）
  - [x] SubTask 2.6: 说明与 uluo-doc-standards 的命名统一关系

- [x] Task 3: 编写 references/ 方法论
  - [x] SubTask 3.1: `impact-analysis-protocol.md`——影响分析协议（扫描已有文档/代码/设计稿三维度，风险等级评估标准）
  - [x] SubTask 3.2: `sync-protocol.md`——同步协议（spec ↔ plan ↔ tasks ↔ checklist 四者一致性校验方法）

- [x] Task 4: 编写 examples/ 模板
  - [x] SubTask 4.1: `spec-template.md`——L1 模板（变更背景 + 影响范围清单 + 决策结论，不含实施细节）
  - [x] SubTask 4.2: `plan-template.md`——L2 模板（delta 规格 MODIFIED/ADDED/REMOVED + 技术方案选择）
  - [x] SubTask 4.3: `tasks-template.md`——L3 模板（文件/模块级任务 + 动词描述 + 需调研标注 + 依赖关系）
  - [x] SubTask 4.4: `checklist-template.md`——独立验收模板（spec/plan/tasks 三分组检查点，不重复各层内容）
  - [x] SubTask 4.5: `change-record-template.md`——留痕归档模板

- [x] Task 5: 编写 agents/ 子代理指令
  - [x] SubTask 5.1: `impact-analyzer.md`——影响分析子代理（输入变更需求+特性目录，输出结构化影响清单）

- [x] Task 6: 编写 scripts/ 校验工具
  - [x] SubTask 6.1: `lib/utils.js`——共享工具函数（复用 uluo-doc-standards 的模式）
  - [x] SubTask 6.2: `checks/change-spec.js`——L1 校验（影响清单完整性、决策结论存在、不含实施细节）
  - [x] SubTask 6.3: `checks/change-plan.js`——L2 校验（delta 格式正确、引用位置存在、不含文件路径/行号）
  - [x] SubTask 6.4: `checks/change-tasks.js`——L3 校验（任务定位到文件级、动词描述、调研标注格式、不含验收检查点）
  - [x] SubTask 6.5: `checks/change-checklist.js`——checklist 校验（覆盖 spec/plan/tasks 三分组、不重复各层内容、review 状态校验、不通过项回退层级标注）
  - [x] SubTask 6.6: `checks/sync-consistency.js`——同步一致性校验（L1→L2→L3→checklist 链路完整 + 变更后文档与代码对齐 + 失败时标注回退层级）
  - [x] SubTask 6.7: `validate-change.js`——主编排器（5 步管线：结构→L1→L2→L3→checklist→同步）

- [x] Task 7: 编写测试
  - [x] SubTask 7.1: `__tests__/helpers.js`——测试工具（复用 uluo-doc-standards 模式）
  - [x] SubTask 7.2: `__tests__/change-spec.test.js`——L1 校验测试（含"不应有实施细节"反例）
  - [x] SubTask 7.3: `__tests__/change-plan.test.js`——L2 校验测试（含 delta 格式正反例）
  - [x] SubTask 7.4: `__tests__/change-tasks.test.js`——L3 校验测试（含调研标注正反例）
  - [x] SubTask 7.5: `__tests__/change-checklist.test.js`——checklist 校验测试（含三分组覆盖正反例 + review 不通过回退标注正反例）
  - [x] SubTask 7.6: `__tests__/integration.test.js`——集成测试（完整变更流程 L1→L2→L3→checklist→review→回退→重新review→归档）

# Task Dependencies

- Task 1 → Task 2（需要目录结构）
- Task 2 → Task 3, Task 4, Task 5（SKILL.md 定义后才能写具体内容）
- Task 3, Task 4 → Task 6（校验工具需要知道模板格式）
- Task 6 → Task 7（测试需要校验工具）
- Task 3 和 Task 4 可并行
- Task 5 依赖 Task 3（子代理需要影响分析协议）

# 修复任务（验证后发现的问题）

- [x] Task 8: 修复 checklist 校验缺失"不重复各层内容"检查
  - [x] SubTask 8.1: 在 `checks/change-checklist.js` 中新增校验逻辑——检查 checklist 是否复制了 spec/plan/tasks 的正文内容（而非只抽检查点）。检测方法：如果 checklist 中出现 spec/plan/tasks 的完整段落（超过 3 行的连续文本与原文相同），则报 fail
  - [x] SubTask 8.2: 在 `__tests__/change-checklist.test.js` 中新增对应测试案例

- [x] Task 9: 修复 sync-consistency 缺失"spec 与代码对齐"校验
  - [x] SubTask 9.1: 在 `checks/sync-consistency.js` 中新增代码对齐校验——检查 tasks.md 中列出的目标文件是否实际存在于项目根目录（通过 git diff 或文件存在性检查）。如果文件不存在则报 fail
  - [x] SubTask 9.2: 在 `__tests__/integration.test.js` 中新增对应测试案例

- [x] Task 10: 补充集成测试的"回退→重新review→归档"流程
  - [x] SubTask 10.1: 在 `__tests__/integration.test.js` 中新增测试案例——模拟 review 不通过 → 回退到 spec → 修复 → 重新 review 通过 → 归档的完整流程
  - [x] SubTask 10.2: 新增 change-record.md 生成和校验的测试案例
