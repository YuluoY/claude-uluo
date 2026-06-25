# Checklist

## 结构与注册
- [x] `skills/uluo-change-flow/` 目录存在
- [x] `.claude-plugin/plugin.json` 符合最小 plugin 包装格式
- [x] `marketplace.json` 新增 `uluo-change-flow` 条目

## SKILL.md 编排器
- [x] 定义了三级递进 + 独立验收模型（L1 spec / L2 plan / L3 tasks + 独立 checklist）
- [x] 定义了三层职责边界（spec 范围 / plan 方案 / tasks 执行 / checklist 验收）
- [x] 定义了执行协议（Phase 0-9）
- [x] 定义了场景跳过规则（小/中/大/紧急）
- [x] 定义了文件存放约定（changes/CHG-NNN/ 结构）
- [x] 说明了与 uluo-doc-standards 的命名统一关系（spec/plan/tasks + checklist）

## references/ 方法论
- [x] `impact-analysis-protocol.md` 含影响扫描方法（文档+代码+设计稿三维度）
- [x] `impact-analysis-protocol.md` 含风险等级评估标准（高/中/低）
- [x] `sync-protocol.md` 含 spec ↔ plan ↔ tasks ↔ checklist 四者一致性校验方法

## examples/ 模板
- [x] `spec-template.md` 含变更背景章节
- [x] `spec-template.md` 含影响范围清单（章节/组件/模块 + 类型 + 风险）
- [x] `spec-template.md` 含决策结论字段（批准/拒绝/需更多信息 + 理由）
- [x] `spec-template.md` 不含具体文件路径、代码片段、行号、技术方案选择
- [x] `plan-template.md` 含 delta 格式（MODIFIED/ADDED/REMOVED）
- [x] `plan-template.md` MODIFIED 项含"原文摘要"和"改为"
- [x] `plan-template.md` ADDED 项含"插入位置"和"新内容"
- [x] `plan-template.md` REMOVED 项含"删除位置"和"删除原因"
- [x] `plan-template.md` 含技术方案选择章节
- [x] `plan-template.md` 不含具体文件路径、行号、任务执行顺序
- [x] `tasks-template.md` 含文件/模块级任务定位
- [x] `tasks-template.md` 含动词开头的任务描述（修改/新增/删除/重构）
- [x] `tasks-template.md` 含"需调研"标注格式（WebSearch/MCP/Context7/官网）
- [x] `tasks-template.md` 含任务依赖关系
- [x] `tasks-template.md` 不含验收检查点（那是 checklist 的事）
- [x] `checklist-template.md` 含 spec 验收分组（影响范围覆盖、决策落实）
- [x] `checklist-template.md` 含 plan 验收分组（delta 应用、方案落实）
- [x] `checklist-template.md` 含 tasks 验收分组（任务执行、调研记录）
- [x] `checklist-template.md` 每条可勾选（`- [ ]`）
- [x] `checklist-template.md` 不重复 spec/plan/tasks 各层内容，只抽检查点
- [x] `change-record-template.md` 含变更编号/日期/发起人/原因/结果/验收

## agents/ 子代理
- [x] `impact-analyzer.md` 定义了输入（变更需求+特性目录）
- [x] `impact-analyzer.md` 定义了输出（结构化影响清单）
- [x] `impact-analyzer.md` 定义了扫描流程（文档→代码→设计稿）

## scripts/ 校验工具
- [x] `validate-change.js` 实现 5 步管线（结构→L1→L2→L3→checklist→同步）
- [x] `checks/change-spec.js` 校验影响清单完整性
- [x] `checks/change-spec.js` 校验决策结论存在
- [x] `checks/change-spec.js` 校验不含实施细节（无文件路径/代码片段/行号/技术方案）
- [x] `checks/change-plan.js` 校验 delta 格式正确（MODIFIED/ADDED/REMOVED）
- [x] `checks/change-plan.js` 校验引用的原文位置存在
- [x] `checks/change-plan.js` 校验不含文件路径/行号
- [x] `checks/change-tasks.js` 校验任务定位到文件级
- [x] `checks/change-tasks.js` 校验动词描述格式
- [x] `checks/change-tasks.js` 校验调研标注格式
- [x] `checks/change-tasks.js` 校验不含验收检查点
- [x] `checks/change-checklist.js` 校验覆盖 spec/plan/tasks 三分组
- [x] `checks/change-checklist.js` 校验不重复各层内容
- [x] `checks/change-checklist.js` 校验 review 状态（通过 `[x]` / 不通过 `[-]`）
- [x] `checks/change-checklist.js` 校验不通过项有回退层级标注
- [x] `checks/sync-consistency.js` 校验 L1→L2→L3→checklist 链路完整
- [x] `checks/sync-consistency.js` 校验变更后 spec 与代码对齐
- [x] `checks/sync-consistency.js` 校验失败时标注回退层级

## 测试
- [x] `__tests__/change-spec.test.js` 覆盖 L1 正反案例（含"不应有实施细节"反例）
- [x] `__tests__/change-plan.test.js` 覆盖 L2 delta 格式正反例
- [x] `__tests__/change-tasks.test.js` 覆盖 L3 正反案例（含调研标注正反例）
- [x] `__tests__/change-checklist.test.js` 覆盖 checklist 三分组覆盖正反例
- [x] `__tests__/change-checklist.test.js` 覆盖 review 不通过 + 回退标注正反例
- [x] `__tests__/integration.test.js` 覆盖完整变更流程（L1→L2→L3→checklist→review→回退→重新review→归档）
- [x] 所有测试通过
