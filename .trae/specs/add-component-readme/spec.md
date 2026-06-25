# 组件 README 规范——AI 可扫描可精确调用 + 版本迭代 Spec

## Why

当前 component-creator skill 的组件目录结构中缺少 README 文件。当 AI（或开发者）想要复用一个已有组件时，必须打开多个文件（component-spec.md、types.ts、源码）才能理解组件的 API 和用法，效率低下。

需要一个**AI 友好的 README.md**，放在组件目录根部，作为组件的「快速入口」——AI 扫一遍就能精确使用组件的全部属性和特性，无需读源码。

同时，组件通常会迭代很多次（新增 prop、修改默认值、废弃 API、重构实现），README 必须支持版本演进——每次迭代后同步更新，变更记录可追溯，让 AI 能识别当前版本的能力边界和废弃项。

## What Changes

- **新增** `skills/component-creator/references/readme-convention.md`——README 的结构规范、编写指南、版本迭代更新策略
- **新增** `skills/component-creator/examples/README.template.md`——README 模板（含变更记录格式）
- **修改** `skills/component-creator/SKILL.md`——Phase 3.2 文件结构新增 README.md，Phase 5 新增「产出/更新 README」步骤，新增「迭代时更新 README」规则
- **修改** `skills/component-creator/references/frameworks/*.md`——三个框架的文件结构树新增 README.md
- **修改** `skills/component-creator/references/checklist-bans.md`——检查清单新增 README 相关检查项（含迭代更新检查）
- **修改** `skills/component-creator/references/checklist-bans.md`——禁止事项新增「禁止迭代后不更新 README」

## Impact

- Affected specs: component-creator skill
- Affected code:
  - `skills/component-creator/SKILL.md`
  - `skills/component-creator/references/readme-convention.md`（新建）
  - `skills/component-creator/examples/README.template.md`（新建）
  - `skills/component-creator/references/frameworks/vue.md`
  - `skills/component-creator/references/frameworks/react.md`
  - `skills/component-creator/references/frameworks/web-component.md`
  - `skills/component-creator/references/checklist-bans.md`

## ADDED Requirements

### Requirement: 组件目录必须包含 README.md

每个组件目录根部 SHALL 包含 `README.md` 文件，作为组件的快速入口文档。

#### Scenario: 组件目录结构

- **WHEN** 创建一个新组件
- **THEN** 组件目录 SHALL 包含 `README.md` 文件，位于组件目录根部（与 `index.vue` / `index.ts` 同级）

#### Scenario: README 是组件的唯一入口文档

- **WHEN** AI 或开发者想要了解或使用一个组件
- **THEN** 只需阅读 `README.md` 即可获得：组件用途、完整 API、使用示例、四态说明、a11y 特性、版本变更——无需读源码

### Requirement: README 结构规范

README.md SHALL 采用固定的 H2 分节结构，让 AI 能按节快速定位信息。

#### Scenario: 固定分节

- **WHEN** AI 扫描 README.md
- **THEN** 文件 SHALL 按以下固定顺序包含 H2 节：

```
## 元信息          ← 组件名、版本、框架、状态、依赖（速查表）
## 是什么          ← 一句话描述 + 职责边界
## 快速上手        ← 最小可用示例，复制即用
## API 参考        ← 结构化表格：Props / Emits / Slots / Methods
## 四态说明        ← Loading / Error / Empty / Success 的 UI 表现
## 使用示例        ← 常见场景的完整代码
## 设计决策        ← 关键 why（为什么这样设计）
## 可访问性        ← a11y 特性和键盘操作
## 变更记录        ← 版本变更摘要（倒序，最新在前）
```

#### Scenario: 元信息节为速查表

- **WHEN** AI 读取「元信息」节
- **THEN** 该节 SHALL 是一个 Markdown 表格，包含：组件名、当前版本号、框架、状态（stable/experimental/deprecated）、入口路径、依赖列表

### Requirement: API 参考节为结构化表格

README 的「API 参考」节 SHALL 用 Markdown 表格列出全部 Props、Emits、Slots、Methods，每项含类型、默认值、说明。

#### Scenario: Props 表格

- **WHEN** AI 查询组件的 Props
- **THEN** 「API 参考」节 SHALL 有一个 Props 表格，列为：名称、类型、必填、默认值、说明、版本（新增时的版本号）

#### Scenario: Emits/Events 表格

- **WHEN** AI 查询组件的事件
- **THEN** 「API 参考」节 SHALL 有一个 Emits 表格，列为：名称、参数、触发时机、版本

#### Scenario: Slots 表格

- **WHEN** AI 查询组件的插槽
- **THEN** 「API 参考」节 SHALL 有一个 Slots 表格，列为：名称、作用域参数、默认内容、说明、版本

#### Scenario: Methods 表格（如有暴露的方法）

- **WHEN** 组件通过 ref / defineExpose 暴露方法
- **THEN** 「API 参考」节 SHALL 有一个 Methods 表格，列为：名称、参数、返回值、说明、版本

#### Scenario: 废弃项标记

- **WHEN** 某个 prop/emit/slot/method 被废弃
- **THEN** 表格的「说明」列 SHALL 以 `⚠️ [deprecated since v1.2.0]` 前缀标记，并注明替代方案

### Requirement: 快速上手节为最小可用示例

README 的「快速上手」节 SHALL 提供一个复制即用的最小示例。

#### Scenario: 最小示例

- **WHEN** AI 想快速使用组件
- **THEN** 「快速上手」节 SHALL 包含一个代码块，包含：导入语句 + 最少必填 props 的使用代码 + 预期渲染效果描述

### Requirement: 变更记录节支持版本追溯

README 的「变更记录」节 SHALL 按 Keep a Changelog 格式记录版本变更，倒序排列（最新在前）。

#### Scenario: 变更记录格式

- **WHEN** 组件迭代后更新 README
- **THEN** 「变更记录」节 SHALL 新增一个版本条目，格式为：

```markdown
### v1.2.0 (2026-06-25)
- **Added**: 新增 `pageSize` prop，支持分页
- **Changed**: `loading` 默认值从 `undefined` 改为 `false`
- **Deprecated**: `onSelect` 回调废弃，改用 `@select` 事件（v2.0 移除）
- **Removed**: 移除 `oldProp`（v1.0 废弃）
- **Fixed**: 修复空数据时布局抖动
```

#### Scenario: 变更类型分类

- **WHEN** 记录变更
- **THEN** 变更类型 SHALL 使用以下标准分类：
  - **Added**——新增功能
  - **Changed**——修改现有功能
  - **Deprecated**——标记即将移除
  - **Removed**——已移除（需标注原废弃版本）
  - **Fixed**——修复 bug

### Requirement: README 版本迭代更新策略

组件每次迭代后 SHALL 同步更新 README，保持文档与代码一致。

#### Scenario: 迭代触发更新

- **WHEN** 组件发生以下任一变更：
  - 新增/修改/删除 prop、emit、slot、method
  - 修改默认值
  - 修改行为语义
  - 修复 bug
- **THEN** README SHALL 同步更新：
  - 更新「元信息」节的版本号
  - 更新「API 参考」对应表格
  - 在「变更记录」节新增版本条目

#### Scenario: 版本号规则

- **WHEN** 组件迭代
- **THEN** 版本号 SHALL 遵循语义化版本（SemVer）：
  - **MAJOR**：破坏性变更（移除 prop、修改语义）
  - **MINOR**：向后兼容的新功能（新增可选 prop）
  - **PATCH**：向后兼容的 bug 修复

#### Scenario: 废弃过渡期

- **WHEN** 某个 API 需要移除
- **THEN** SHALL 先标记 deprecated（至少一个 MINOR 版本），再在下一个 MAJOR 版本移除
- **AND** README 的「变更记录」和「API 参考」表格 SHALL 同时标注废弃信息和移除计划

### Requirement: README 编写时机

README SHALL 在 Phase 5（测试策略）完成后产出，作为组件交付的最后一步；迭代时在每次变更后更新。

#### Scenario: 首次产出

- **WHEN** 组件首次实现和测试完成
- **THEN** Phase 5 SHALL 新增步骤「产出 README.md」，加载 `examples/README.template.md` 模板，基于已完成的 component-spec 和实现填写，版本号初始化为 `v1.0.0`

#### Scenario: 迭代更新

- **WHEN** 组件迭代（新增功能/修复 bug/修改 API）
- **THEN** 完成实现后 SHALL 更新 README.md：更新版本号、更新 API 表格、新增变更记录条目

### Requirement: README 检查项

checklist-bans.md SHALL 新增 README 相关检查项，覆盖首次产出和迭代更新。

#### Scenario: 首次产出检查

- **WHEN** 验证组件首次交付质量
- **THEN** checklist-bans.md 的「可维护性」维度 SHALL 新增：
  - README.md 存在于组件目录根部
  - README 包含全部 9 个固定 H2 节
  - API 参考表格覆盖全部 props/emits/slots/methods
  - 快速上手示例可复制即用
  - 变更记录包含 v1.0.0 初始条目

#### Scenario: 迭代更新检查

- **WHEN** 验证组件迭代后的质量
- **THEN** checklist-bans.md SHALL 新增：
  - README 版本号已更新（与代码变更匹配）
  - API 参考表格已同步本次变更
  - 变更记录新增了本次版本条目
  - 废弃项有明确的移除计划版本

### Requirement: 禁止迭代后不更新 README

checklist-bans.md 的禁止事项 SHALL 新增一条禁令。

#### Scenario: 禁令内容

- **WHEN** 组件迭代完成
- **THEN** 禁止不更新 README 就提交——README 是组件的单一入口文档，过期的 README 比没有 README 更危险

## MODIFIED Requirements

### Requirement: Phase 3.2 文件结构

文件结构 SHALL 在组件目录根部新增 `README.md`，标注为「组件入口文档，AI 快速扫描入口」。

### Requirement: Phase 5 测试策略

Phase 5 SHALL 在测试策略之后新增「产出/更新 README」步骤，作为组件交付的最后一步。

### Requirement: 框架文件结构树

vue.md、react.md、web-component.md 的文件结构树 SHALL 新增 `README.md` 条目，位于根部第一项。
