# html-blueprint 职责边界重构 Spec

## Why

当前 html-blueprint skill 越界实现了框架特定代码生成（Vue/React），与其"协议与流程"的核心定位矛盾。skill 名字是 "html-blueprint"（蓝图协议），不是 "code-generator"（代码生成器）。框架特定生成器带来三个问题：框架锁定（只支持 Vue/React）、维护负担（需跟随框架演进）、限制 AI 能力（AI 本身能生成任意框架代码）。本 spec 重新划定 skill 的职责边界：**只负责协议定义和校验，不负责框架特定代码生成**。

## 客观分析：当前实现的职责越界

### 当前脚本分类

| 脚本 | 职责 | 是否越界 |
|------|------|---------|
| validate-spec.js | Spec 格式校验 | ✅ 协议层，保留 |
| validate-all.js | HTML 协议校验 | ✅ 协议层，保留 |
| check-*.js (9个) | HTML 协议校验 | ✅ 协议层，保留 |
| check-spec-fidelity.js | 三角一致性校验 | ✅ 协议层，保留 |
| check-convert-fidelity.js | 转换保真度校验 | ✅ 协议层，保留 |
| html-to-spec.js | HTML → Spec 逆向 | ✅ 协议层，保留 |
| generate-html.js | Spec → HTML 生成 | ⚠️ 边界情况（见下文） |
| generate-code.js | Spec → Vue/React 代码 | ❌ **越界** |
| convert-to-react.js | HTML → React 代码 | ❌ **越界** |
| convert-to-vue.js | HTML → Vue 代码 | ❌ **越界** |
| convert-lib/react-generator.js | React 代码生成器 | ❌ **越界** |
| convert-lib/vue-generator.js | Vue 代码生成器 | ❌ **越界** |
| convert-lib/parser.js | HTML 解析器（服务转换器） | ❌ **越界**（随转换器移除） |
| convert-lib/code-writer.js | 代码写入器 | ❌ **越界**（随转换器移除） |
| convert-lib/report.js | 转换报告 | ❌ **越界**（随转换器移除） |

### 越界的本质问题

1. **职责错位**: skill 应定义"做什么"（协议），不应实现"怎么做"（框架代码）
2. **框架锁定**: 当前只支持 Vue 3 和 React，用户选 Angular/Svelte/Solid/Web Components 就不行
3. **维护负担**: Vue 的 `<script setup>` 语法、React 的 Server Components 都在演进，生成器需持续跟随
4. **限制 AI**: AI 本身能根据 Spec 生成任意框架代码，且能贴合项目上下文（已有组件库、工具函数），预置生成器反而僵化
5. **与定位矛盾**: SKILL.md 声明"不发明 DSL，不替代 HTML"，但 generate-code.js 实际在"替代 AI 写代码"

### generate-html.js 的边界判断

generate-html.js 处于灰色地带：
- **支持保留**: HTML 是 skill 的核心产物（skill 名字就叫 html-blueprint），从 Spec 生成 HTML 是合理的视觉投影
- **反对保留**: 它也实现了具体 CSS 生成逻辑（BEM 命名、var() 引用），这部分属于"视觉实现"

**决策**: 保留 generate-html.js，但定位为"骨架生成器"——生成符合协议的 HTML 骨架（含 data-* 标注和基础结构），视觉细节（具体 CSS 值、动画、渐变）由 AI 基于 Spec.visual 字段补充。这样它仍是"协议层"工具（生成协议合规的 HTML 骨架），而非"实现层"工具。

## 目标职责边界

### skill 应该负责（协议层）

1. **协议定义**: Design Spec 格式、data-* 属性字典、约束分级（HARD/SHOULD/WARN）
2. **校验器**: Spec 合法性校验、HTML 协议合规校验、Spec↔HTML↔代码一致性校验
3. **流程指引**: Spec-First 工作流步骤、决策树、模块加载表
4. **骨架生成**: 从 Spec 生成 HTML 骨架（仅结构 + data-* 标注，不含完整视觉实现）
5. **逆向工具**: HTML → Spec 逆向生成（用于迁移）

### skill 不应该负责（实现层）

1. **框架特定代码生成**: Vue SFC、React TSX、Angular TS、Svelte 等具体代码
2. **框架语法细节**: defineEmits 类型、useCallback 依赖、Composition API 等
3. **业务逻辑生成**: API 调用实现、状态管理逻辑、错误处理代码
4. **组件库映射**: 将 Spec 组件映射到 Ant Design/Element Plus 等

### 重新定位后的工作流

```
Design Spec（协议层，skill 定义格式 + 校验）
    ↓
    ├─→ HTML 骨架（协议层，skill 生成骨架 + 校验合规）
    │       ↓
    │   AI 补充视觉细节（实现层，AI 职责）
    │       ↓
    │   视觉校验（协议层，skill 校验）
    │
    └─→ 工程代码（实现层，AI 根据 Spec 生成任意框架代码）
            ↓
        工程校验（协议层，skill 校验 Spec↔代码一致性）
```

**关键变化**: 代码生成从"skill 脚本生成"改为"AI 生成"。skill 提供的是 Spec 契约和一致性校验器，AI 根据 Spec 契约生成任意框架的代码。

## What Changes

### 移除（框架特定实现）

- **移除** `scripts/generate-code.js` — Spec → Vue/React 代码生成器
- **移除** `scripts/convert-to-react.js` — HTML → React 转换器
- **移除** `scripts/convert-to-vue.js` — HTML → Vue 转换器
- **移除** `scripts/convert-lib/react-generator.js` — React 代码生成器
- **移除** `scripts/convert-lib/vue-generator.js` — Vue 代码生成器
- **移除** `scripts/convert-lib/parser.js` — HTML 解析器（仅服务转换器）
- **移除** `scripts/convert-lib/code-writer.js` — 代码写入器
- **移除** `scripts/convert-lib/report.js` — 转换报告生成器
- **移除** `scripts/__tests__/convert.test.js` — 转换器测试
- **移除** `scripts/__tests__/generate-code.test.js` — 代码生成器测试
- **移除** `scripts/__tests__/e2e.test.js` 中的代码生成场景（保留 HTML 生成和校验场景）

### 保留（协议层）

- **保留** `scripts/validate-spec.js` — Spec 校验器
- **保留** `scripts/validate-all.js` — HTML 协议校验
- **保留** `scripts/check-*.js` (9个) — HTML 协议校验
- **保留** `scripts/check-spec-fidelity.js` — 三角一致性校验
- **保留** `scripts/check-convert-fidelity.js` — 保真度校验
- **保留** `scripts/html-to-spec.js` — 逆向生成器
- **保留** `scripts/generate-html.js` — HTML 骨架生成器（定位调整，见下文）

### 修改

- **修改** `scripts/generate-html.js`: 定位为"骨架生成器"，生成 HTML 结构 + data-* 标注 + 基础 CSS 骨架，视觉细节（具体渐变值、动画、阴影）由 AI 基于 Spec.visual 补充
- **修改** `scripts/check-spec-fidelity.js`: 移除"代码文件存在性"和"props 接口完整性"等需要解析代码的校验（因为代码不再由脚本生成），改为只校验 Spec↔HTML 一致性
- **修改** `SKILL.md`: 更新工作流，代码生成改为 AI 职责，skill 只提供契约和校验
- **修改** `references/conversion-guide.md`: 从"脚本转换指南"改为"AI 转换指南"，指导 AI 如何根据 Spec 生成代码
- **修改** `references/design-spec.md`: 移除框架特定的生成规则说明

### 新增

- **新增** `references/code-generation-guide.md`: 指导 AI 如何根据 Design Spec 生成任意框架代码的指南（非脚本，是 AI 的参考文档）

## Impact

- **Affected specs**:
  - `references/protocol-spec.md`（保留，data-* 字典仍是核心）
  - `references/conversion-guide.md`（修改，从脚本指南改为 AI 指南）
  - `references/design-spec.md`（修改，移除框架特定说明）
  - `SKILL.md`（修改，重新定位职责边界）
- **Affected code**:
  - 移除 8 个脚本文件（generate-code.js, convert-to-*.js, convert-lib/*.js）
  - 移除 2 个测试文件（convert.test.js, generate-code.test.js）
  - 修改 3 个文件（generate-html.js, check-spec-fidelity.js, SKILL.md）
  - 新增 1 个文档（code-generation-guide.md）

## ADDED Requirements

### Requirement: skill 职责边界声明
系统 SHALL 在 SKILL.md 中明确声明 skill 的职责边界：只负责协议定义和校验，不负责框架特定代码生成。

#### Scenario: 用户请求生成 Vue 代码
- **WHEN** 用户请求从 Spec 生成 Vue 代码
- **THEN** skill 不调用任何代码生成脚本
- **AND** skill 指导 AI 根据 Spec 契约和 code-generation-guide.md 生成代码
- **AND** skill 提供一致性校验器验证生成结果

### Requirement: AI 代码生成指南
系统 SHALL 提供 `references/code-generation-guide.md`，指导 AI 如何根据 Design Spec 生成任意框架代码，而非硬编码生成逻辑。

#### Scenario: AI 生成 React 代码
- **WHEN** AI 根据 Spec 生成 React 代码
- **THEN** AI 参考 code-generation-guide.md 中的映射规则
- **AND** AI 结合项目上下文（已有组件库、工具函数）生成代码
- **AND** 生成的代码可通过 check-spec-fidelity.js 校验

### Requirement: HTML 骨架生成器定位
generate-html.js SHALL 定位为"骨架生成器"，只生成 HTML 结构 + data-* 标注 + 基础 CSS 骨架，不生成完整视觉实现。

#### Scenario: 生成 HTML 骨架
- **WHEN** 用户运行 generate-html.js
- **THEN** 生成包含 data-* 标注的 HTML 结构
- **AND** 生成基础 CSS 骨架（类名 + 空规则或 token 引用）
- **AND** 不生成具体视觉细节（渐变值、动画关键帧、复杂阴影）
- **AND** 输出提示"视觉细节由 AI 基于 Spec.visual 补充"

## MODIFIED Requirements

### Requirement: Spec-First 工作流
Spec-First 工作流从"脚本生成代码"修改为"AI 生成代码"：

1. 编写 Design Spec
2. 校验 Spec（validate-spec.js）
3. 生成 HTML 骨架（generate-html.js）
4. AI 补充视觉细节
5. **AI 根据 Spec 生成任意框架代码**（替代原"generate-code.js 生成代码"）
6. 校验一致性（check-spec-fidelity.js，仅校验 Spec↔HTML）

### Requirement: 一致性校验范围
check-spec-fidelity.js 的校验范围从"Spec↔HTML↔代码三角校验"缩减为"Spec↔HTML 双向校验"：

- 保留: Spec↔HTML 的组件/props/events 一致性校验
- 移除: 代码文件存在性校验（代码由 AI 生成，位置不固定）
- 移除: 代码 Props 接口完整性校验（代码语法多样，正则解析不可靠）
- 保留: HTML CSS 类名合规性校验（协议层）

## REMOVED Requirements

### Requirement: 框架特定代码生成器
**Reason**: 框架特定代码生成（Vue/React）越界了 skill 的协议层职责，且限制了框架选择、增加维护负担、限制 AI 能力。
**Migration**: 代码生成改为 AI 职责，AI 参考 `references/code-generation-guide.md` 根据 Spec 生成任意框架代码。

### Requirement: HTML→代码直接转换
**Reason**: convert-to-react.js 和 convert-to-vue.js 是 HTML-First 时代的产物，Spec-First 工作流下应从 Spec 直接生成代码（由 AI 完成），无需 HTML→代码转换。
**Migration**: 现有 HTML 设计稿先通过 html-to-spec.js 逆向生成 Spec，再由 AI 根据 Spec 生成代码。
