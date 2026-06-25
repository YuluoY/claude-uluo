# html-blueprint 单向适配 uluo-doc-standards Spec

## Why

html-blueprint 需要保证 AI 始终遵循协议和流程。同仓库的 uluo-doc-standards 已有成熟的文档驱动体系（spec→plan→tasks→验收→复盘），html-blueprint 应**单向适配**它——在自己的 SKILL.md 和产物中引用 uluo-doc-standards 的流程和模板，而不修改 uluo-doc-standards 的任何文件。同时移除 html-blueprint 自身越界的框架特定代码生成器，回归"协议与校验"的本职。

## 适配策略：单向引用，不改对方

```
uluo-doc-standards（不改动）          html-blueprint（本 spec 修改对象）
┌──────────────────────┐            ┌──────────────────────────┐
│ spec.md 模板          │ ←──引用── │ Design Spec 嵌入 spec.md  │
│ plan.md 模板          │ ←──引用── │ 转换方案写入 plan.md       │
│ tasks.md 模板         │ ←──引用── │ 转换门禁嵌入 tasks.md      │
│ 验收报告模板          │ ←──引用── │ 协议验收对照 Design Spec   │
│ reviewer 子代理       │ ←──引用── │ SKILL.md 指导 AI 调用     │
│ validate-docs.js      │  不改动   │ html-blueprint 自带校验器  │
└──────────────────────┘            └──────────────────────────┘
```

**原则**: html-blueprint 在自己的文档中告诉 AI "当 uluo-doc-standards 启用时，按以下方式协作"，但不修改 uluo-doc-standards 的任何文件。

## 核心问题解答

### 如何保证 AI 始终遵循协议和流程？

**答案**: html-blueprint 在 SKILL.md 中明确引用 uluo-doc-standards 的流程，并把自己的校验器标注为流程中的"门禁步骤"。当两个 skill 同时启用时，AI 必须同时满足两边的约束。

| 保障 | 来源 | 机制 |
|------|------|------|
| 流程不可跳过 | uluo-doc-standards | spec→plan→tasks→验收 五层递进 |
| 文档必须产出 | uluo-doc-standards | validate-docs.js 校验 |
| 产物必须合规 | html-blueprint | validate-all.js + check-spec-fidelity.js |
| 转换有门禁 | html-blueprint | SKILL.md 标注门禁步骤，tasks.md 中标注校验点 |
| 验收对照契约 | html-blueprint | 验收报告对照 Design Spec（AI 自行填写，不改模板） |

### 两者之间的转换如何保证？

**答案**: Design Spec 是转换契约，html-blueprint 的校验器是转换守卫。AI 在 uluo-doc-standards 的 Phase 7（执行编码）中执行转换，每个转换步骤后必须运行 html-blueprint 的校验器。

```
uluo-doc-standards Phase 7（执行编码）
  ├─ 7a: 生成 HTML 骨架（generate-html.js）
  ├─ 7b: AI 补充视觉细节
  ├─ 7c: ★ 门禁 — validate-all.js（HTML 协议合规）
  ├─ 7d: AI 根据 Spec 生成代码（任意框架）
  └─ 7e: ★ 门禁 — check-spec-fidelity.js（Spec↔HTML 一致性）
```

## 结合方式（html-blueprint 单方面适配）

### 方式 1: SKILL.md 引用 uluo-doc-standards 流程

在 SKILL.md 中新增"与 uluo-doc-standards 协作"章节，告诉 AI：

```markdown
## 与 uluo-doc-standards 协作

当 uluo-doc-standards skill 启用时，本 skill 的协议校验器作为其流程中的门禁：

| uluo-doc-standards 阶段 | html-blueprint 注入点 |
|------------------------|----------------------|
| Phase 3 产出 spec | 在 spec.md 中嵌入 Design Spec（用 ```design-spec 代码块） |
| Phase 5 产出 plan | 在 plan.md 中描述转换策略（Spec→HTML→代码） |
| Phase 6 产出 tasks | 在 tasks.md 中标注校验门禁（★ 标记） |
| Phase 7 执行编码 | 运行 generate-html.js → validate-all.js → 生成代码 → check-spec-fidelity.js |
| Phase 8 验收 | 在验收报告中对照 Design Spec 逐条验证 |

uluo-doc-standards 未启用时，本 skill 独立工作，AI 自行确保流程完整。
```

### 方式 2: Design Spec 嵌入 spec.md

html-blueprint 的 SKILL.md 指导 AI 将 Design Spec JSON 嵌入 uluo-doc-standards 的 spec.md：

```markdown
## 功能需求

### FR-1: 统计卡片组件

<!-- 常规需求描述（uluo-doc-standards 格式） -->

#### Design Spec

<!-- html-blueprint 的精确契约，用 design-spec 代码块标记 -->
<!-- AI 运行 validate-spec.js 校验此代码块 -->

​```design-spec
{
  "version": "1.0",
  "page": { "name": "DashboardPage" },
  "components": [...]
}
​```
```

**不改 validate-docs.js**: html-blueprint 自己的 validate-spec.js 负责校验 Design Spec。AI 在产出 spec.md 后，手动运行 `node html-blueprint/scripts/validate-spec.js` 提取并校验代码块。

### 方式 3: 转换门禁嵌入 tasks.md

html-blueprint 的 SKILL.md 指导 AI 在 uluo-doc-standards 的 tasks.md 中标注门禁：

```markdown
## Phase 1: HTML 设计稿生成

- [ ] 任务 1.1: 运行 generate-html.js 生成 HTML 骨架
- [ ] 任务 1.2: AI 补充视觉细节
- [ ] 任务 1.3: ★ 门禁 — 运行 validate-all.js，HARD 违规必须修复

## Phase 2: 代码生成

- [ ] 任务 2.1: AI 根据 Design Spec 生成组件代码
- [ ] 任务 2.2: ★ 门禁 — 运行 check-spec-fidelity.js，Spec↔HTML 不一致必须修复
```

### 方式 4: 验收报告对照 Design Spec

html-blueprint 的 SKILL.md 指导 AI 在 uluo-doc-standards 的验收报告中增加协议验收内容（不改模板，AI 自行追加）：

```markdown
## 验收结果

### 需求验收（对照 spec.md）
<!-- uluo-doc-standards 原有内容 -->

### 协议验收（html-blueprint 注入）
| 契约规则 | 结果 | 证据 |
|---------|------|------|
| Spec 中所有 component 在 HTML 中有标注 | ✅ | check-spec-fidelity.js 通过 |
| HTML 通过 validate-all.js | ✅ | 0 HARD 违规 |
| 代码中包含所有 required props | ✅ | 语义搜索通过 |
```

## What Changes

### 移除（框架特定实现）

- **移除** `scripts/generate-code.js`
- **移除** `scripts/convert-to-react.js`
- **移除** `scripts/convert-to-vue.js`
- **移除** `scripts/convert-lib/` 整个目录
- **移除** `scripts/__tests__/convert.test.js`
- **移除** `scripts/__tests__/generate-code.test.js`
- **修改** `scripts/__tests__/e2e.test.js`（移除代码生成场景）

### 修改

- **修改** `scripts/check-spec-fidelity.js`: 代码校验改为框架无关的语义搜索（搜索 prop/event 名称存在性，不解析框架语法）；CLI 接口改为 `<spec.json> <html-file> [code-dir]`（code-dir 可选）
- **修改** `SKILL.md`: 声明职责边界、新增 uluo-doc-standards 协作章节、更新工作流、移除框架生成器引用

### 新增

- **新增** `references/code-generation-guide.md`: AI 代码生成指南（框架无关，指导 AI 根据 Spec 生成任意框架代码）
- **新增** `references/integration-guide.md`: 与 uluo-doc-standards 的协作指南（单向适配说明）

### 不改动

- **不改动** uluo-doc-standards 的任何文件（SKILL.md、validate-docs.js、agents/、examples/ 等）

## Impact

- **Affected specs**: 仅 html-blueprint 的 SKILL.md、references/
- **Affected code**: 仅 html-blueprint 的 scripts/（移除框架生成器、修改校验器）
- **Not affected**: uluo-doc-standards 的所有文件

## ADDED Requirements

### Requirement: 与 uluo-doc-standards 单向适配
系统 SHALL 在 SKILL.md 中说明与 uluo-doc-standards 的协作方式，引用其流程阶段并标注 html-blueprint 的注入点，但不修改 uluo-doc-standards 的任何文件。

#### Scenario: 两个 skill 同时启用
- **WHEN** uluo-doc-standards 和 html-blueprint 同时启用
- **THEN** AI 按 uluo-doc-standards 的五层流程执行
- **AND** 在 Phase 7 注入 html-blueprint 的校验门禁
- **AND** 在 Phase 8 验收报告中追加协议验收内容

#### Scenario: 仅 html-blueprint 启用
- **WHEN** 只有 html-blueprint 启用
- **THEN** AI 按 html-blueprint 自身的 Spec-First 工作流执行
- **AND** 仍运行所有校验门禁

### Requirement: 框架无关代码校验
check-spec-fidelity.js SHALL 用语义搜索替代框架语法解析，支持任意框架。

#### Scenario: 校验任意框架代码
- **WHEN** AI 生成 Vue/React/Angular/Svelte 代码
- **THEN** check-spec-fidelity.js 搜索 prop/event 名称在代码中的存在性
- **AND** 不依赖任何框架特定语法

### Requirement: AI 代码生成指南
系统 SHALL 提供 code-generation-guide.md，指导 AI 根据 Design Spec 生成任意框架代码。

#### Scenario: AI 生成代码
- **WHEN** AI 根据 Spec 生成代码
- **THEN** AI 参考 code-generation-guide.md 的映射规则
- **AND** AI 结合项目上下文（组件库、工具函数）生成代码
- **AND** 生成的代码可通过 check-spec-fidelity.js 校验

## MODIFIED Requirements

### Requirement: html-blueprint 职责边界
html-blueprint 只负责协议定义和校验，不负责框架特定代码生成。代码生成是 AI 职责。

### Requirement: Spec-First 工作流
工作流中代码生成步骤从"运行 generate-code.js"改为"AI 根据 code-generation-guide.md 生成"。
