# 文档驱动 + 协议约束的双重保障 Spec

## Why

当前 html-blueprint 的协议遵循是"软约束"——SKILL.md 文字描述 + 事后校验，AI 可以绕过。而同仓库的 uluo-doc-standards 已经建立了一套成熟的"文档驱动开发"体系（spec→plan→tasks→changelog→验收→复盘），有模板、有校验器、有子代理。两个 skill 结合可以形成双重保障：uluo-doc-standards 保证流程被严格执行（文档驱动），html-blueprint 保证产物符合协议（协议约束）。

## 结合点分析

### uluo-doc-standards 提供什么

| 能力 | 如何用于 html-blueprint |
|------|------------------------|
| **spec.md 模板** | html-blueprint 的 Design Spec 可纳入 spec.md 的"功能需求"章节 |
| **plan.md 模板** | 前端转换方案（Spec→HTML→代码）写入 plan.md 的"模块设计"章节 |
| **tasks.md 模板** | 转换任务按 phase 拆分，每 phase 对应一个转换步骤 |
| **validate-docs.js** | 校验文档完整性，可扩展为校验 Design Spec 嵌入 |
| **researcher 子代理** | 调研项目现有组件库、设计系统、token 体系 |
| **reviewer 子代理** | 对抗性审查 HTML 设计稿和生成代码的协议合规性 |
| **验收报告模板** | 逐条对照 Design Spec 验证转换保真度 |
| **五层递进流程** | Phase 0-9 流程直接套用，html-blueprint 在 Phase 7 注入 |

### html-blueprint 提供什么

| 能力 | 如何补充 uluo-doc-standards |
|------|---------------------------|
| **Design Spec 格式** | 前端需求的精确契约（props/events/states/dataSource） |
| **data-* 协议** | HTML 产物的结构化语义标注 |
| **validate-all.js** | HTML 协议合规校验（9 个 check 脚本） |
| **check-spec-fidelity.js** | Spec↔HTML 一致性校验 |
| **generate-html.js** | 从 Spec 生成 HTML 骨架 |
| **html-to-spec.js** | 从现有 HTML 逆向生成 Spec |

### 结合后的工作流

```
uluo-doc-standards 的五层流程 + html-blueprint 的协议注入点：

Phase 0: 获取作者
Phase 1: 识别场景 → 判断是否涉及前端 UI
Phase 2: 信息调研 → researcher 调研项目设计系统、组件库、token
Phase 3: 产出 spec → 嵌入 Design Spec（html-blueprint 的 JSON 契约）
Phase 4: 源码分析 → 分析现有前端架构、组件风格、CSS 规范
Phase 5: 产出 plan → 前端转换方案（Spec→HTML→代码的转换策略）
Phase 6: 产出 tasks → 按 phase 拆分转换任务
Phase 7: 执行编码 → ★ html-blueprint 注入点
  7a: 生成 HTML 骨架（generate-html.js）
  7b: AI 补充视觉细节
  7c: 校验 HTML 协议合规（validate-all.js）★ 门禁
  7d: AI 根据 Spec 生成代码（任意框架）
  7e: 校验 Spec↔HTML 一致性（check-spec-fidelity.js）★ 门禁
Phase 8: 验收 → reviewer 审查协议合规性 + 转换保真度
Phase 9: 复盘
```

### 关键结合机制

#### 机制 1: Design Spec 嵌入 spec.md

uluo-doc-standards 的 spec.md 是 Markdown 文档，html-blueprint 的 Design Spec 是 JSON。结合方式：

```markdown
## 功能需求

### FR-1: 统计卡片组件

<!-- 常规需求描述 -->

#### Design Spec

<!-- html-blueprint 的 Design Spec 作为需求的精确契约嵌入 -->
<!-- 校验器会提取此代码块并运行 validate-spec.js -->

​```design-spec
{
  "version": "1.0",
  "page": { "name": "DashboardPage" },
  "components": [
    {
      "name": "StatCard",
      "convertMode": "component",
      "props": [...],
      "events": [...]
    }
  ]
}
​```
```

**校验联动**: validate-docs.js 检测到 `design-spec` 代码块时，自动调用 validate-spec.js 校验。

#### 机制 2: 转换门禁嵌入 tasks.md

uluo-doc-standards 的 tasks.md 按 phase 拆分，html-blueprint 的校验作为 phase 的"完成条件"：

```markdown
## Phase 1: HTML 设计稿生成

- [ ] 任务 1.1: 运行 generate-html.js 生成 HTML 骨架
- [ ] 任务 1.2: AI 补充视觉细节（CSS 渐变、动画、阴影）
- [ ] 任务 1.3: 运行 validate-all.js 校验协议合规 ★ 门禁
  - HARD 违规必须修复后才能进入 Phase 2

## Phase 2: 代码生成

- [ ] 任务 2.1: AI 根据 Design Spec 生成 Vue/React 组件
- [ ] 任务 2.2: 运行 check-spec-fidelity.js 校验一致性 ★ 门禁
  - Spec↔HTML 不一致必须修复后才能进入 Phase 3
```

#### 机制 3: reviewer 子代理扩展

uluo-doc-standards 的 reviewer 子代理在 Phase 8 做对抗性审查。扩展为也审查 html-blueprint 协议合规性：

```markdown
## 审查清单（扩展）

### uluo-doc-standards 原有审查
- [ ] spec 核心结论有信息源支撑？
- [ ] plan 设计决策有源码依据？
- [ ] tasks 按 phase 拆分？

### html-blueprint 协议审查（新增）
- [ ] HTML 中所有 data-component 是 PascalCase？
- [ ] HTML 中所有 data-convert 值合法？
- [ ] Spec 中每个 component 在 HTML 中有对应标注？
- [ ] Spec 中每个 prop 在 HTML 中有 data-prop？
- [ ] validate-all.js 通过（0 HARD 违规）？
- [ ] check-spec-fidelity.js 通过（Spec↔HTML 一致）？
```

#### 机制 4: 验收报告对照 Design Spec

uluo-doc-standards 的验收报告逐条对照 spec 的验收标准。html-blueprint 的 Design Spec 提供了精确的可验收契约：

```markdown
## 验收报告

### 需求验收（对照 spec.md）

| 验收标准 | 结果 | 证据 |
|---------|------|------|
| 统计卡片显示销售额 | ✅ | HTML 中 data-prop="value" 存在 |
| 点击卡片触发查看详情 | ✅ | HTML 中 data-action="viewDetail" 存在 |

### 协议验收（对照 Design Spec）★ 新增

| 契约规则 | 结果 | 证据 |
|---------|------|------|
| Spec 中 3 个 component 都在 HTML 中有标注 | ✅ | check-spec-fidelity.js 通过 |
| HTML 通过 validate-all.js | ✅ | 0 HARD 违规 |
| 代码中包含所有 required props | ✅ | 语义搜索通过 |
```

## 核心问题解答

### 问题：如何保证 AI 始终遵循协议和流程？

**答案：通过 uluo-doc-standards 的文档驱动机制 + html-blueprint 的协议校验器，形成"流程不可跳过 + 产物必须合规"的双重保障。**

| 保障层 | 机制 | 来源 |
|--------|------|------|
| 流程不可跳过 | spec→plan→tasks→执行→验收→复盘 五层递进 | uluo-doc-standards |
| 文档必须产出 | validate-docs.js 校验文档完整性 | uluo-doc-standards |
| 任务有门禁 | tasks.md 中标注 ★ 门禁步骤 | 结合 |
| 产物必须合规 | validate-all.js + check-spec-fidelity.js | html-blueprint |
| 对抗性审查 | reviewer 子代理审查协议合规 | 结合 |
| 验收对照契约 | 验收报告对照 Design Spec | 结合 |

### 问题：两者之间的转换如何保证？

**答案：Design Spec 是转换的契约，校验器是转换的守卫。**

```
Design Spec（契约）
    ↓ generate-html.js
HTML 骨架
    ↓ AI 补充视觉
HTML 设计稿 → validate-all.js（守卫 1：协议合规）
    ↓ AI 生成代码
工程代码 → check-spec-fidelity.js（守卫 2：契约一致）
    ↓ reviewer 审查
验收报告 → 对照 Design Spec 逐条验证（守卫 3：验收门禁）
```

每个转换步骤后都有校验器守卫，未通过则阻断流程。

## What Changes

### html-blueprint 侧

- **移除** 框架特定代码生成器（generate-code.js, convert-to-*.js, convert-lib/）
- **保留** 协议层资产（validate-spec.js, validate-all.js, check-*.js, check-spec-fidelity.js, generate-html.js, html-to-spec.js）
- **修改** check-spec-fidelity.js: 代码校验改为框架无关的语义搜索
- **修改** SKILL.md: 声明与 uluo-doc-standards 的协作关系，代码生成改为 AI 职责
- **新增** references/code-generation-guide.md: AI 代码生成指南（框架无关）

### uluo-doc-standards 侧

- **修改** validate-docs.js: 检测 spec.md 中的 `design-spec` 代码块，自动调用 validate-spec.js
- **修改** agents/reviewer.md: 扩展审查清单，增加 html-blueprint 协议合规检查
- **修改** examples/verification-report-template.md: 增加"协议验收"章节
- **新增** examples/spec-template.md 的"前端契约"章节说明: 当涉及前端 UI 时，嵌入 Design Spec

### 结合层

- **新增** references/integration-guide.md (html-blueprint 侧): 说明如何与 uluo-doc-standards 协作
- **修改** SKILL.md (html-blueprint): 在工作流中标注 uluo-doc-standards 的 Phase 注入点

## Impact

- **Affected specs**:
  - html-blueprint 的 SKILL.md、references/conversion-guide.md
  - uluo-doc-standards 的 SKILL.md、agents/reviewer.md、examples/verification-report-template.md
- **Affected code**:
  - html-blueprint: 移除 8 个框架特定脚本，修改 check-spec-fidelity.js
  - uluo-doc-standards: 修改 validate-docs.js、reviewer.md

## ADDED Requirements

### Requirement: 文档驱动 + 协议约束协作
系统 SHALL 支持 html-blueprint 与 uluo-doc-standards 协作，形成"流程不可跳过 + 产物必须合规"的双重保障。

#### Scenario: 前端 UI 功能开发
- **WHEN** 用户请求开发前端 UI 功能
- **THEN** uluo-doc-standards 的五层流程启动
- **AND** Phase 3 产出 spec.md 时嵌入 Design Spec
- **AND** Phase 7 执行编码时注入 html-blueprint 的协议校验门禁
- **AND** Phase 8 验收时 reviewer 审查协议合规性

### Requirement: Design Spec 嵌入 spec.md
系统 SHALL 支持 Design Spec JSON 嵌入 spec.md 的功能需求章节，使用 `design-spec` 代码块标记。

#### Scenario: validate-docs.js 检测 Design Spec
- **WHEN** validate-docs.js 校验 spec.md
- **THEN** 检测 `design-spec` 代码块
- **AND** 提取 JSON 内容
- **AND** 调用 validate-spec.js 校验
- **AND** 校验失败时在报告中标注

### Requirement: 转换门禁嵌入 tasks.md
系统 SHALL 支持 tasks.md 中标注门禁步骤，门禁未通过则阻断后续任务。

#### Scenario: HTML 协议校验门禁
- **WHEN** AI 完成 HTML 生成
- **THEN** tasks.md 中标注的 validate-all.js 门禁必须通过
- **AND** HARD 违规必须修复后才能进入代码生成任务

### Requirement: 框架无关代码校验
check-spec-fidelity.js SHALL 用语义搜索（prop/event 名称存在性）替代框架语法解析，支持任意框架。

#### Scenario: 校验 React 代码
- **WHEN** AI 生成 React 代码
- **THEN** check-spec-fidelity.js 搜索 prop 名称在代码中的存在性
- **AND** 不依赖 `interface Props` 等 React 特定语法
- **AND** 支持 Vue/React/Angular/Svelte 等任意框架

## MODIFIED Requirements

### Requirement: html-blueprint 职责边界
html-blueprint 只负责协议定义和校验，不负责框架特定代码生成。代码生成是 AI 职责，AI 参考 code-generation-guide.md 生成任意框架代码。

### Requirement: uluo-doc-standards 流程扩展
uluo-doc-standards 的五层流程在 Phase 7（执行编码）注入 html-blueprint 的协议校验门禁，在 Phase 8（验收）扩展协议合规审查。
