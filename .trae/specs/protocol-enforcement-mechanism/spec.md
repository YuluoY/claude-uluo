# 协议遵循保障机制 Spec

## Why

移除框架特定代码生成器后，AI 需要自己执行 Spec ↔ HTML ↔ 代码的转换。当前 skill 的协议是"软约束"——文字描述 + 事后校验，AI 可以绕过、忽略或遗忘。需要建立"硬约束"机制，确保 AI 在每次转换中始终遵循协议和流程，无论生成什么框架的代码。

## 核心问题分析

### 问题一：协议遵循没有强制力

当前协议散落在 SKILL.md 文字描述中，AI 可能：
- 生成 HTML 时遗漏 data-* 标注
- 生成代码时偏离 Spec 契约（props/events 不一致）
- 跳过校验步骤直接交付
- 校验失败后不修复就继续

**根因**：协议是"文字指导"而非"可执行约束"，没有门禁机制。

### 问题二：转换过程不可追溯

当前转换是黑盒：
- AI 生成 HTML 后，不知道是否覆盖了 Spec 的所有组件
- AI 生成代码后，不知道 props/events 是否与 Spec 一致
- 校验只在最后运行，错误发现太晚

**根因**：缺少转换过程中的实时反馈。

### 问题三：框架无关校验缺失

当前 check-spec-fidelity.js 的代码校验部分依赖正则匹配 Vue/React 特定语法（interface Props、defineEmits），无法支持 Angular/Svelte/Solid 等框架。

**根因**：校验器绑定了框架语法，而非校验框架无关的契约。

## 解决方案：三层保障体系

```
┌─────────────────────────────────────────────────┐
│  第一层：转换契约（Contract）                     │
│  定义 Spec ↔ HTML ↔ 代码 的可校验映射规则         │
│  框架无关，只校验语义一致性                       │
├─────────────────────────────────────────────────┤
│  第二层：门禁机制（Gate）                         │
│  每个转换步骤后强制运行校验，未通过则阻断          │
│  通过 hooks 实现自动化                            │
├─────────────────────────────────────────────────┤
│  第三层：协议物化（Materialization）              │
│  协议从文字描述物化为可执行校验 + 骨架模板         │
│  AI 不从零开始，而是基于骨架填充                   │
└─────────────────────────────────────────────────┘
```

### 第一层：转换契约

定义三种转换的可校验规则，**框架无关**：

#### 契约 1: Spec → HTML

| 规则 | 校验方式 | 级别 |
|------|---------|------|
| Spec 中每个 component 必须在 HTML 中有 `data-component="Name"` | DOM 查询 | HARD |
| HTML 中每个 `data-component` 必须在 Spec 中有定义 | DOM 查询 | HARD |
| Spec 中每个 prop 必须在 HTML 中有 `data-prop="name"` | DOM 查询 | SHOULD |
| HTML 中每个 `data-prop` 必须在 Spec 中有定义 | DOM 查询 | HARD |
| Spec 的 convertMode 必须与 HTML 的 `data-convert` 一致 | DOM 查询 | HARD |
| Spec 中每个 event 必须在 HTML 中有 `data-action="name"` | DOM 查询 | SHOULD |

**已有校验器**: check-spec-fidelity.js 的 specVsHtml 部分（保留）

#### 契约 2: Spec → 代码（框架无关）

不解析框架特定语法，而是校验**语义一致性**：

| 规则 | 校验方式 | 级别 |
|------|---------|------|
| Spec 中每个 component 必须有对应的代码文件 | 文件名匹配（`*<ComponentName>*`） | HARD |
| Spec 中每个 required prop 必须在代码中出现 | 全文搜索 `propName`（camelCase 精确匹配） | HARD |
| Spec 中每个 event 必须在代码中出现 | 全文搜索 `eventName`（camelCase 精确匹配） | HARD |
| Spec 中每个 component 的 convertMode=manual 必须有 TODO 标记 | 全文搜索 `TODO` | SHOULD |

**关键设计**: 不用正则匹配 `interface Props` 或 `defineEmits`，而是用**语义搜索**——在代码文件中搜索 prop/event 名称是否存在。这适用于任何框架：
- Vue: `defineProps<{ title: string }>` 包含 `title`
- React: `interface Props { title: string }` 包含 `title`
- Angular: `@Input() title: string` 包含 `title`
- Svelte: `export let title` 包含 `title`

#### 契约 3: HTML → Spec（逆向）

| 规则 | 校验方式 | 级别 |
|------|---------|------|
| HTML 中每个 `data-component` 必须在 Spec 中有定义 | DOM 查询 | HARD |
| HTML 中每个 `data-prop` 必须在 Spec 的对应组件中有定义 | DOM 查询 | HARD |
| HTML 中每个 `data-action` 必须在 Spec 的对应组件中有定义 | DOM 查询 | HARD |

**已有校验器**: check-spec-fidelity.js 的 specVsHtml 部分（双向校验）

### 第二层：门禁机制

通过 Claude Code Plugin Hooks 实现自动门禁：

#### 门禁 1: HTML 生成后自动校验

```
触发: PostToolUse (Write/Edit .html 文件)
动作: 运行 validate-all.js
失败: 返回警告，提示 AI 修复
```

#### 门禁 2: Spec 文件修改后自动校验

```
触发: PostToolUse (Write/Edit .spec.json 文件)
动作: 运行 validate-spec.js
失败: 返回警告，提示 AI 修复
```

#### 门禁 3: 代码生成后自动校验

```
触发: PostToolUse (Write/Edit .vue/.tsx/.svelte/.ts 文件)
动作: 如果存在对应的 Spec 文件，运行 check-spec-fidelity.js
失败: 返回警告，提示 AI 修复
```

#### 门禁 4: 交付前最终校验

```
触发: Stop (AI 准备结束响应)
动作: 检查是否有未通过的校验
失败: 阻断结束，提示 AI 完成校验
```

**实现方式**: 创建 `hooks/hooks.json` + `hooks/post_tool_use.py` + `hooks/stop.py`，参考 memex 的 hooks 实现。

### 第三层：协议物化

将协议从"文字描述"物化为"可执行资产"：

#### 资产 1: HTML 骨架模板（已有）

generate-html.js 从 Spec 生成 HTML 骨架，AI 不从零写 HTML，而是基于骨架填充视觉细节。

#### 资产 2: 代码骨架模板（新增，框架无关）

不生成完整代码，而是生成**代码骨架文件**，包含：
- 组件文件（空壳，含组件名和导入语句）
- TODO 注释（标注需要 AI 填充的部分，引用 Spec 字段）

```
// StatCard.tsx
// TODO: 根据 Spec 实现组件
// Spec 引用:
//   props: title (string, required), value (number, required)
//   events: viewDetail (click, payload: { id: string })
//   states: default, loading, error
//   dataSource: GET /api/stats/sales

export function StatCard() {
  // TODO: 实现组件逻辑
}
```

AI 基于骨架填充实现，骨架确保 AI 不会遗漏 Spec 中的任何字段。

#### 资产 3: 转换检查清单（新增）

每次转换时 AI 必须填写的检查清单：

```markdown
## 转换检查清单

### Spec → HTML
- [ ] Spec 中每个 component 都有对应的 data-component
- [ ] Spec 中每个 prop 都有对应的 data-prop
- [ ] Spec 中每个 event 都有对应的 data-action
- [ ] convertMode 与 data-convert 一致
- [ ] validate-all.js 通过

### Spec → 代码
- [ ] Spec 中每个 component 都有对应的代码文件
- [ ] Spec 中每个 required prop 在代码中出现
- [ ] Spec 中每个 event 在代码中出现
- [ ] manual 模式组件有 TODO 标记
- [ ] check-spec-fidelity.js 通过
```

## What Changes

### 新增

- **新增** `hooks/hooks.json`: 注册 PostToolUse 和 Stop hooks
- **新增** `hooks/post_tool_use.py`: 文件写入后自动校验
- **新增** `hooks/stop.py`: 交付前最终校验门禁
- **新增** `hooks/lib.py`: hooks 共享工具函数
- **新增** `scripts/generate-skeleton.js`: 生成框架无关的代码骨架（替代 generate-code.js）
- **新增** `references/transformation-contract.md`: 转换契约文档（Spec↔HTML↔代码的映射规则）
- **新增** `references/conversion-checklist.md`: 转换检查清单模板

### 修改

- **修改** `scripts/check-spec-fidelity.js`: 代码校验改为框架无关的语义搜索（搜索 prop/event 名称存在性，不解析框架语法）
- **修改** `SKILL.md`: 新增门禁机制说明、转换契约引用、检查清单要求
- **修改** `references/constraint-tiers.md`: 新增转换契约相关的 HARD 规则

### 移除（来自上一个 spec 的决策）

- **移除** `scripts/generate-code.js` — 框架特定代码生成器
- **移除** `scripts/convert-to-react.js` — HTML → React 转换器
- **移除** `scripts/convert-to-vue.js` — HTML → Vue 转换器
- **移除** `scripts/convert-lib/` — 转换器核心库
- **移除** `scripts/__tests__/convert.test.js` — 转换器测试
- **移除** `scripts/__tests__/generate-code.test.js` — 代码生成器测试

## Impact

- **Affected specs**:
  - `SKILL.md`（新增门禁机制、转换契约、检查清单）
  - `references/constraint-tiers.md`（新增转换契约规则）
  - `references/conversion-guide.md`（改为 AI 指南，引用转换契约）
- **Affected code**:
  - 新增 hooks/ 目录（4 个文件）
  - 新增 scripts/generate-skeleton.js
  - 新增 2 个 references 文档
  - 修改 check-spec-fidelity.js
  - 移除 8 个框架特定脚本

## ADDED Requirements

### Requirement: 转换契约
系统 SHALL 定义 Spec ↔ HTML ↔ 代码的框架无关转换契约，每条规则都有对应的校验方式。

#### Scenario: Spec → HTML 转换
- **WHEN** AI 从 Spec 生成 HTML
- **THEN** 生成的 HTML 必须包含 Spec 中所有组件的 data-component 标注
- **AND** 生成的 HTML 必须包含 Spec 中所有 props 的 data-prop 标注
- **AND** check-spec-fidelity.js 的 Spec↔HTML 校验通过

#### Scenario: Spec → 代码转换（任意框架）
- **WHEN** AI 从 Spec 生成代码（Vue/React/Angular/Svelte）
- **THEN** 每个 component 必须有对应的代码文件
- **AND** 每个 required prop 的名称必须出现在代码中
- **AND** 每个 event 的名称必须出现在代码中
- **AND** check-spec-fidelity.js 的语义搜索校验通过

### Requirement: 门禁机制
系统 SHALL 通过 Plugin Hooks 实现自动门禁，在文件写入后自动运行校验。

#### Scenario: HTML 文件写入后
- **WHEN** AI 写入 .html 文件
- **THEN** PostToolUse hook 自动运行 validate-all.js
- **AND** 如果校验失败，返回警告给 AI
- **AND** AI 必须修复后才能继续

#### Scenario: 交付前最终校验
- **WHEN** AI 准备结束响应
- **THEN** Stop hook 检查是否有未通过的校验
- **AND** 如果有未通过的校验，阻断结束并提示 AI

### Requirement: 代码骨架生成器
系统 SHALL 提供框架无关的代码骨架生成器，生成包含 Spec 引用的空壳文件。

#### Scenario: 生成代码骨架
- **WHEN** 用户运行 generate-skeleton.js
- **THEN** 为每个 component 生成一个空壳文件（.txt 或无扩展名）
- **AND** 文件包含组件名和 TODO 注释
- **AND** TODO 注释列出 Spec 中的 props/events/states/dataSource
- **AND** AI 基于骨架填充实现

### Requirement: 转换检查清单
系统 SHALL 要求 AI 在每次转换后填写检查清单，确认所有契约规则已满足。

#### Scenario: AI 执行 Spec → HTML 转换
- **WHEN** AI 完成 HTML 生成
- **THEN** AI 必须填写转换检查清单
- **AND** 清单确认所有 component/prop/event 已映射
- **AND** 清单确认 validate-all.js 通过

## MODIFIED Requirements

### Requirement: 一致性校验
check-spec-fidelity.js 的代码校验从"解析 Vue/React 语法"改为"框架无关的语义搜索"：
- 不再匹配 `interface Props` 或 `defineEmits`
- 改为搜索 prop/event 名称在代码文件中的存在性
- 支持 Vue/React/Angular/Svelte/Solid 等任意框架

### Requirement: SKILL.md 工作流
Spec-First 工作流新增门禁和检查清单步骤：
1. 编写 Spec → 门禁: validate-spec.js
2. 生成 HTML 骨架 → AI 补充视觉 → 门禁: validate-all.js
3. 生成代码骨架 → AI 填充实现 → 门禁: check-spec-fidelity.js
4. 填写转换检查清单 → 门禁: Stop hook 最终校验
