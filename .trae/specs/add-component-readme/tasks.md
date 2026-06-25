# Tasks

- [x] Task 1: 创建 references/readme-convention.md——README 结构规范 + 版本迭代策略
  - [x] SubTask 1.1: 定义 9 个固定 H2 节的顺序和内容要求
  - [x] SubTask 1.2: 定义「元信息」速查表格式（组件名、版本、框架、状态、入口路径、依赖）
  - [x] SubTask 1.3: 定义「API 参考」四张表格的列规范（Props/Emits/Slots/Methods，含版本列和废弃标记）
  - [x] SubTask 1.4: 定义「快速上手」最小示例的要求
  - [x] SubTask 1.5: 定义「变更记录」节格式（Keep a Changelog，倒序，Added/Changed/Deprecated/Removed/Fixed）
  - [x] SubTask 1.6: 定义版本迭代更新策略（触发条件、SemVer 规则、废弃过渡期规则）
  - [x] SubTask 1.7: 说明 AI 扫描友好的设计原则

- [x] Task 2: 创建 examples/README.template.md——README 模板
  - [x] SubTask 2.1: 按 9 个 H2 节填写模板骨架
  - [x] SubTask 2.2: 每节附填写指南和示例值
  - [x] SubTask 2.3: API 参考节预填四张空表格（含版本列）
  - [x] SubTask 2.4: 变更记录节预填 v1.0.0 初始条目示例

- [x] Task 3: 修改 SKILL.md
  - [x] SubTask 3.1: Phase 3.2 文件结构树新增 README.md 条目（根部第一项）
  - [x] SubTask 3.2: Phase 5 末尾新增「产出/更新 README」步骤（含首次产出和迭代更新两种场景）
  - [x] SubTask 3.3: 文件索引表新增 readme-convention.md 和 README.template.md 条目

- [x] Task 4: 修改三个框架 reference 的文件结构树
  - [x] SubTask 4.1: vue.md 文件结构树新增 README.md（根部第一项）
  - [x] SubTask 4.2: react.md 文件结构树新增 README.md（根部第一项）
  - [x] SubTask 4.3: web-component.md 文件结构树新增 README.md（根部第一项）

- [x] Task 5: 修改 checklist-bans.md
  - [x] SubTask 5.1: 「可维护性」维度新增 5 项 README 首次产出检查
  - [x] SubTask 5.2: 新增 4 项 README 迭代更新检查
  - [x] SubTask 5.3: Phase 映射表新增 README 检查项到 Phase 5
  - [x] SubTask 5.4: 禁止事项新增第 13 条「禁止迭代后不更新 README」（附 ❌/✅ 反例）

# Task Dependencies

- Task 2 依赖 Task 1（模板需遵循规范）
- Task 3 依赖 Task 1 和 Task 2（SKILL.md 需引用规范和模板）
- Task 4 和 Task 5 可与 Task 3 并行
