# Checklist

## readme-convention.md 规范文件

- [x] 文件已创建于 `skills/component-creator/references/readme-convention.md`
- [x] 定义 9 个固定 H2 节的顺序：元信息 / 是什么 / 快速上手 / API 参考 / 四态说明 / 使用示例 / 设计决策 / 可访问性 / 变更记录
- [x] 定义「元信息」速查表格式（组件名、版本、框架、状态、入口路径、依赖）
- [x] 定义「API 参考」四张表格列规范（Props/Emits/Slots/Methods，含版本列和废弃标记 `⚠️ [deprecated since vX.Y.Z]`）
- [x] 定义「快速上手」最小示例要求
- [x] 定义「变更记录」节格式（Keep a Changelog，倒序，Added/Changed/Deprecated/Removed/Fixed 五类）
- [x] 定义版本迭代更新策略（触发条件、SemVer 规则、废弃过渡期至少一个 MINOR 版本）
- [x] 说明 AI 扫描友好的设计原则

## README.template.md 模板文件

- [x] 文件已创建于 `skills/component-creator/examples/README.template.md`
- [x] 包含 9 个 H2 节骨架
- [x] 每节附填写指南
- [x] API 参考节预填四张空表格（含版本列）
- [x] 变更记录节预填 v1.0.0 初始条目示例

## SKILL.md 修改

- [x] Phase 3.2 文件结构树新增 README.md 条目（根部第一项，标注「组件入口文档，AI 快速扫描入口」）
- [x] Phase 5 末尾新增「产出/更新 README」步骤（含首次产出 v1.0.0 和迭代更新两种场景）
- [x] 文件索引表新增 readme-convention.md 条目
- [x] 文件索引表新增 README.template.md 条目

## 框架 reference 修改

- [x] vue.md 文件结构树新增 README.md（根部第一项）
- [x] react.md 文件结构树新增 README.md（根部第一项）
- [x] web-component.md 文件结构树新增 README.md（根部第一项）

## checklist-bans.md 修改

- [x] 「可维护性」维度新增 5 项 README 首次产出检查
- [x] 新增 4 项 README 迭代更新检查（版本号更新、API 同步、变更记录、废弃项移除计划）
- [x] Phase 映射表新增 README 检查项到 Phase 5
- [x] 禁止事项新增第 13 条「禁止迭代后不更新 README」（附 ❌/✅ 反例和判定标准）

## 引用完整性

- [x] SKILL.md 中所有新链接路径正确
- [x] readme-convention.md 内部交叉引用正确
- [x] 未破坏现有文件结构
