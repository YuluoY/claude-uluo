# 需求到设计稿的 AI 转换协议 Spec

## Why

用户用 AI 完成从前端需求到设计稿的全流程。当 AI 同时使用 uluo-doc-standards 和 html-blueprint 时，两个 skill 的产物必须对齐口径——uluo-doc-standards 产出的 spec.md（需求文档）和 html-blueprint 产出的 Design Spec + HTML 设计稿必须语义一致。当 AI 只用 html-blueprint 时，它必须能独立从需求生成设计稿。当前 html-blueprint 越界实现了框架代码生成器，且未定义需求到 Design Spec 的提取规则，导致 AI 无法保证转换的一致性。

## 场景分析

### 场景 A: AI 同时使用两个 skill

```
用户: "帮我做一个 Dashboard 页面"
  ↓
AI 用 uluo-doc-standards 生成 spec.md
  - 功能需求 FR-1: 统计卡片
  - 验收标准: 显示销售额、点击查看详情
  ↓
AI 用 html-blueprint 从 spec.md 提取 Design Spec（对齐口径）
  - component: StatCard（对应 FR-1）
  - props: title, value（对应验收标准"显示销售额"）
  - events: viewDetail（对应验收标准"点击查看详情"）
  ↓
AI 用 html-blueprint 生成 HTML 设计稿
  ↓
AI 运行校验门禁
```

### 场景 B: AI 只用 html-blueprint

```
用户: "帮我做一个 Dashboard 页面"
  ↓
AI 用 html-blueprint 从需求提取 Design Spec
  - component: StatCard
  - props: title, value
  - events: viewDetail
  ↓
AI 用 html-blueprint 生成 HTML 设计稿
  ↓
AI 运行校验门禁
```

### 核心问题

AI 如何保证两个 skill 产物对齐？如何保证转换遵循协议？

**答案**: html-blueprint 在 SKILL.md 中定义提取规则和门禁，AI 遵循这些规则即可保证一致性。不需要修改 uluo-doc-standards，不需要 hooks，不需要复杂机制——SKILL.md 的协议本身就是 AI 的行为约束。

## 对齐口径的定义

### spec.md → Design Spec 的语义映射

| uluo-doc-standards spec.md | html-blueprint Design Spec | 映射规则 |
|---------------------------|---------------------------|---------|
| 功能需求 FR-N: [组件名] | components[].name | FR 标题中的名词 → PascalCase 组件名 |
| FR 的"预期行为"-展示数据 | props[] | "显示/展示 XX" → prop（XX 为数据名） |
| FR 的"预期行为"-交互行为 | events[] | "点击/提交 XX" → event |
| FR 的"边界条件"-异常 | states[] | "加载失败时" → error 状态 |
| 非功能性需求-性能 | dataSource.polling | "30秒刷新" → polling: 30000 |
| 验收标准 | 覆盖度验证 | 每条验收标准必须有对应的 prop/event |

### Design Spec → HTML 的映射

| Design Spec | HTML data-* | 映射规则 |
|-------------|-------------|---------|
| components[].name | data-component | 直接映射 |
| props[].name | data-prop | 直接映射 |
| props[].type | data-type | 直接映射 |
| events[].name | data-action | 直接映射 |
| events[].trigger | data-event | 直接映射 |
| convertMode | data-convert | 直接映射 |

### 对齐的验证

check-spec-fidelity.js 校验 Design Spec ↔ HTML 的一致性。当 spec.md 存在时，AI 还应人工核对：
- 每个 FR 是否有对应的 component
- 每条验收标准是否有对应的 prop/event
- 非功能性需求是否体现在 Design Spec 中

## html-blueprint 的职责

### 应该负责

1. **协议定义**: Design Spec 格式、data-* 属性字典、约束分级
2. **提取规则**: 在 SKILL.md 中定义从需求（spec.md 或自然语言）到 Design Spec 的提取规则
3. **骨架生成**: generate-html.js 从 Design Spec 生成 HTML 骨架
4. **校验器**: validate-spec.js、validate-all.js、check-spec-fidelity.js
5. **逆向工具**: html-to-spec.js
6. **门禁定义**: 在 SKILL.md 中标注 HARD 级校验步骤

### 不应该负责

1. 框架特定代码生成（Vue/React/Angular）
2. 完整视觉实现（CSS 渐变值、动画关键帧由 AI 补充）
3. 修改 uluo-doc-standards

## AI 工作流

### 提取 Design Spec

AI 从需求提取 Design Spec 时：

**当 spec.md 存在时（uluo-doc-standards 产出）**:
1. 读取 spec.md 的功能需求章节
2. 每个 FR 提取为一个 component（FR 标题的名词 → PascalCase）
3. FR 的预期行为提取为 props（展示数据）和 events（交互行为）
4. 边界条件提取为 states
5. 非功能性需求提取为 dataSource
6. 用验收标准验证提取的覆盖度

**当只有自然语言需求时**:
1. 识别需求中的展示数据 → props
2. 识别需求中的交互行为 → events
3. 识别需求中的状态 → states
4. 识别需求中的数据源 → dataSource
5. 识别图表/复杂交互 → convertMode: manual

### 生成 HTML 设计稿

1. 运行 generate-html.js 从 Design Spec 生成 HTML 骨架
2. AI 基于 Spec.visual 和设计常识补充视觉细节
3. 运行 validate-all.js 校验协议合规（HARD 门禁）
4. 运行 check-spec-fidelity.js 校验 Spec↔HTML 一致性（HARD 门禁）

### 生成代码（可选）

1. AI 参考 code-generation-guide.md 根据 Design Spec 生成任意框架代码
2. 运行 check-spec-fidelity.js 校验 Spec↔代码一致性（HARD 门禁）

## 门禁保障

SKILL.md 中将三个校验标注为 HARD，AI 不可跳过：

| 门禁 | 校验器 | 时机 | 失败处理 |
|------|--------|------|---------|
| Spec 合法性 | validate-spec.js | Design Spec 提取后 | 修复后才能生成 HTML |
| HTML 协议合规 | validate-all.js | HTML 生成后 | 修复后才能交付 |
| Spec↔HTML 一致 | check-spec-fidelity.js | HTML 交付前 | 修复后才能交付 |

AI 在 SKILL.md 的约束下必须执行这些门禁。SKILL.md 是 AI 的行为协议，门禁是协议中的 HARD 约束。

## What Changes

### 移除

- `scripts/generate-code.js`、`scripts/convert-to-react.js`、`scripts/convert-to-vue.js`
- `scripts/convert-lib/` 整个目录
- `scripts/__tests__/convert.test.js`、`scripts/__tests__/generate-code.test.js`

### 修改

- `SKILL.md`: 重新定位、新增提取规则、新增门禁、移除框架生成器引用
- `scripts/check-spec-fidelity.js`: 代码校验改为框架无关语义搜索，CLI 改为 `<spec.json> <html-file> [code-dir]`
- `scripts/__tests__/e2e.test.js`: 移除代码生成场景
- `references/design-spec.md`: 强调 Design Spec 是 AI 提取的中间契约

### 新增

- `references/requirement-extraction-guide.md`: 需求提取规则（spec.md 对齐 + 自然语言模式）
- `references/code-generation-guide.md`: AI 代码生成指南（框架无关）

### 不改动

- uluo-doc-standards 的任何文件

## Impact

- 仅影响 html-blueprint 的 SKILL.md、references/、scripts/
- 不影响 uluo-doc-standards

## ADDED Requirements

### Requirement: 需求到 Design Spec 提取规则
系统 SHALL 在 SKILL.md 和 requirement-extraction-guide.md 中定义 AI 从需求提取 Design Spec 的规则，支持 spec.md 和自然语言两种输入。

#### Scenario: AI 从 spec.md 提取
- **WHEN** AI 用 uluo-doc-standards 生成了 spec.md
- **THEN** AI 按 extraction-guide 从功能需求提取 component/props/events
- **AND** 验收标准用于验证提取覆盖度

#### Scenario: AI 从自然语言提取
- **WHEN** 用户直接描述需求（无 spec.md）
- **THEN** AI 按 extraction-guide 的模式匹配规则提取 component/props/events

### Requirement: 门禁强制执行
系统 SHALL 在 SKILL.md 中将三个校验标注为 HARD 约束。

#### Scenario: 门禁未通过
- **WHEN** validate-spec.js / validate-all.js / check-spec-fidelity.js 任一失败
- **THEN** AI 必须修复后才能继续
- **AND** 不可跳过

### Requirement: 框架无关代码校验
check-spec-fidelity.js SHALL 用语义搜索支持任意框架。

#### Scenario: 校验任意框架
- **WHEN** AI 生成 Vue/React/Angular/Svelte 代码
- **THEN** 搜索 prop/event 名称在代码中的存在性
- **AND** 不依赖框架特定语法

## MODIFIED Requirements

### Requirement: html-blueprint 职责
html-blueprint 负责协议定义、提取规则、骨架生成、校验器。不负责框架代码生成。

### Requirement: Design Spec 定位
Design Spec 是 AI 从需求提取的中间契约，用户不手写。

### Requirement: Spec-First 工作流
工作流：AI 提取 Design Spec → 校验 → 生成 HTML 骨架 → AI 补充视觉 → 校验 → （可选）AI 生成代码 → 校验。
