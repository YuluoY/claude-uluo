# 设计稿到代码 100% 还原方案评审与重构 Spec

## Why

当前 html-blueprint skill 的设计目标是"设计稿到真实项目代码的高保真转换"，但经审计发现：**当前架构无法实现 100% 还原**，且存在多个根本性障碍。本 spec 评审当前设计的可行性边界，并提出达到"高效 100% 还原"的目标架构。

## 评审结论：当前设计为何无法 100% 还原

### 障碍一：信息不完整（根本性）

HTML 设计稿本质是**视觉表达**，而真实项目代码需要**工程规格**。两者存在不可消除的语义鸿沟：

| 维度 | HTML 设计稿能表达 | 真实代码需要 |
|------|------------------|-------------|
| 视觉 | ✅ CSS/DOM 完整 | ✅ CSS/DOM |
| 组件结构 | ⚠️ data-component 标注 | ✅ 组件树 |
| Props | ⚠️ data-prop 名称+示例值 | ❌ 类型、校验规则、必填、默认值语义 |
| 事件 | ⚠️ data-event 名称 | ❌ payload 结构、副作用、状态变更 |
| API | ❌ 完全缺失 | ✅ 接口契约、错误处理、loading 态 |
| 状态机 | ❌ 完全缺失 | ✅ 状态流转、条件渲染 |
| 路由 | ❌ 完全缺失 | ✅ 路由参数、守卫、嵌套 |
| 业务逻辑 | ❌ 完全缺失 | ✅ 计算逻辑、校验、权限 |

**结论**：即使 data-* 标注 100% 正确，转换器也无法生成"生产就绪代码"，只能生成"骨架代码"。当前 SKILL.md 已承认这一点（"生成骨架需补充：API 调用、业务逻辑、错误处理等"），但这与"100% 还原"目标矛盾。

### 障碍二：转换有损（技术性）

当前转换器用**正则 + 字符串替换**处理 HTML，存在不可修复的有损性：

1. **自研 HTML 解析器**（`html-parser.js`）用正则解析，无法处理：
   - 嵌套同标签的 innerHTML 边界（已导致 C-1 双重嵌套 bug）
   - 自闭合标签与 data-prop 组合
   - 属性值中的 `>` 字符
   - HTML 实体解码

2. **CSS 提取**用 `globalCSS.split('}')` 粗暴切分，丢失：
   - `@media` 嵌套上下文
   - `@keyframes` 完整定义
   - 选择器组合（`.a, .b {}`）
   - 注释中的选择器误匹配

3. **模板替换**用正则匹配子组件 `<\w+[^>]*\sdata-component="${childName}"[^>]*>[\s\S]*?<\/\w+>`，非贪婪匹配会在第一个闭合标签处截断，导致嵌套组件内容丢失。

**结论**：正则路线在复杂真实场景下必然失败。任何"100% 还原"方案必须放弃正则，改用 AST 解析。

### 障碍三：单向流程（架构性）

当前是**单向不可逆流程**：

```
HTML 设计稿 → 转换器 → 代码（终态）
```

问题：
- 设计稿变更后，无法同步到已修改的代码（代码已被开发者手动补充业务逻辑）
- 代码变更后，无法反向更新设计稿
- 转换置信度报告是"事后评估"，无法在生成前保证质量

**结论**：100% 还原要求**双向同步**或**单一真相源**，单向转换只能做到"一次性骨架生成"。

### 障碍四：置信度报告不可信（验证层）

当前保真度校验（`check-convert-fidelity.js`）用子串匹配：

```js
const missing = designSelectors.filter(sel => !scss.includes(`.${sel}`))
```

- `.stat-card` 会匹配 `.stat-card__title` 的子串 → 误报通过
- 字符串字面量中的 class 名也算匹配 → 误报通过
- 不校验 CSS 属性值是否一致 → 只看选择器名，不看实际样式

**结论**：即使校验通过，也不代表视觉 100% 一致。当前 100% 的通过率是假阳性。

## 目标方案：规格驱动的高保真架构

### 核心理念

**100% 还原 ≠ 从 HTML 推导代码。100% 还原 = 从规格生成 HTML 和代码。**

将"设计稿"从"HTML 文件"升级为"设计规格（Design Spec）"，HTML 只是规格的视觉投影，代码是规格的工程投影。两者都从规格生成，天然 100% 一致。

### 架构对比

#### 当前架构（HTML-First）

```
用户需求 → AI 生成 HTML 设计稿（含 data-*）→ 转换器 → 代码骨架
                    ↑                              ↓
                    └────── 人工补充业务逻辑 ────────┘
                            （此处丢失还原度）
```

问题：HTML 是真相源，代码是派生物，人工补充后两者脱节。

#### 目标架构（Spec-First）

```
用户需求 → AI 生成设计规格（Design Spec）
                    ↓
          ┌─────────┴─────────┐
          ↓                   ↓
    HTML 设计稿          工程代码
   （视觉投影）        （工程投影）
          ↓                   ↓
    视觉校验             工程校验
          └─────────┬─────────┘
                    ↓
              一致性校验
              （双向比对）
```

优势：规格是真相源，HTML 和代码都是生成物，天然一致。规格变更时两者同步更新。

### Design Spec 的结构

Design Spec 是一个 JSON/YAML 文件，包含完整的设计与工程信息：

```yaml
# design-spec.yaml
version: "1.0"
page:
  name: DashboardPage
  viewport: { width: 1440, height: 900 }
  theme: ../tokens.css

components:
  - name: StatCard
    convertMode: component
    props:
      - name: title
        type: string
        required: true
        example: "本月销售额"
      - name: value
        type: number
        required: true
        example: 128000
        # 扩展：格式化、单位、精度
        format:
          unit: "元"
          precision: 0
      - name: trend
        type: Trend
        required: false
        # 扩展：类型定义
        typeRef: ./types/trend.ts
    events:
      - name: viewDetail
        trigger: click
        payload: "{ id: string }"
    states:
      - name: default
      - name: loading
        # 扩展：骨架屏规格
        skeleton: true
      - name: error
        # 扩展：错误态规格
        fallback: ErrorBoundary
    # 扩展：API 契约（当前完全缺失）
    dataSource:
      type: api
      endpoint: GET /api/stats/sales
      polling: 30000
      errorHandling: retry-3-times
    # 扩展：视觉规格（当前散落在 CSS 中）
    visual:
      layout: flex-column
      padding: var(--space-6)
      background: linear-gradient(135deg, #fff 0%, #f7faff 100%)
      decorative:
        - name: glow
          position: absolute
          blur: 24px
          color: rgba(59, 130, 246, 0.16)

  - name: SalesChart
    convertMode: manual
    chart:
      type: bar
      lib: echarts
      # 扩展：图表数据契约（当前完全缺失）
      dataContract:
        xAxis: { field: "month", type: "category" }
        yAxis: { field: "sales", type: "number" }
        series: [{ name: "销售额", field: "sales" }]
      # 扩展：交互规格
      interactions:
        - tooltip: true
        - zoom: true
```

### 关键设计决策

#### 决策 1：HTML 不再是真相源，而是生成物

- **当前**：AI 生成 HTML，转换器解析 HTML 生成代码
- **目标**：AI 生成 Spec，生成器从 Spec 生成 HTML 和代码

**影响**：
- HTML 设计稿仍然可独立渲染（视觉校验用）
- 代码生成不再依赖 HTML 解析（消除障碍二）
- Spec 变更时 HTML 和代码同步更新（消除障碍三）

#### 决策 2：保留 data-* 标注作为 HTML 的语义注释

HTML 仍然包含 data-* 标注，但这是**为了人类可读性**，不是转换的输入。转换器从 Spec 读取信息，不从 HTML 解析。

**影响**：
- 现有的 check-*.js 校验脚本仍然可用（校验 HTML 与 Spec 的一致性）
- 现有的视觉保真度校验仍然可用（校验代码 CSS 与 HTML CSS 的一致性）

#### 决策 3：引入 Spec 校验层

新增 `check-spec-fidelity.js`，校验：
- HTML 中的 data-component 与 Spec 中的 component 一致
- HTML 中的 data-prop 与 Spec 中的 prop 一致
- 代码中的 props 接口与 Spec 中的 prop 一致
- 代码中的 CSS 与 HTML 中的 CSS 一致

形成**三角校验**：Spec ↔ HTML ↔ 代码。

#### 决策 4：分阶段实现，保持向后兼容

- **Phase 1**：修复当前架构的 P0 bug（cloneHTML、innerHTML、生成器 bug）
- **Phase 2**：引入 Design Spec 作为可选输入（HTML 仍可独立使用）
- **Phase 3**：Spec 成为推荐路径，HTML 降级为"快速预览模式"
- **Phase 4**：Spec 成为唯一真相源，HTML 完全由 Spec 生成

## What Changes

### Phase 1: 修复当前架构（P0）
- 修复 `html-parser.js` 的 `innerHTML` 语义错误（C-1, C-2）
- 修复 `react-generator.js` 的 `useCallback` 依赖数组（C-3）
- 修复 `vue-generator.js` 的 `defineEmits` 类型语法（C-4）
- 添加 `package.json` 声明依赖（M-1）

### Phase 2: 引入 Design Spec 层
- **新增** `references/design-spec.md`：Design Spec 格式规范
- **新增** `scripts/generate-html.js`：从 Spec 生成 HTML 设计稿
- **新增** `scripts/generate-code.js`：从 Spec 生成 Vue/React 代码（替代当前 convert-to-*.js）
- **新增** `scripts/check-spec-fidelity.js`：Spec ↔ HTML ↔ 代码 三角校验
- **修改** `SKILL.md`：新增 Spec-First 工作流

### Phase 3: 替换转换器核心
- **替换** `html-parser.js` 为 AST 解析（`node-html-parser` 或 `cheerio`）
- **替换** `parser.js` 的正则提取为 AST 遍历
- **替换** `vue-generator.js` / `react-generator.js` 的字符串替换为模板引擎（或 AST 生成）
- **修改** `check-convert-fidelity.js`：用 AST 比对替代子串匹配

### Phase 4: 工程化补全
- **新增** Spec 类型定义（JSON Schema / TypeScript 类型）
- **新增** Spec 校验器（`validate-spec.js`）
- **修改** `validate-all.js`：加入 Spec 校验到管线
- **新增** Spec → HTML → 代码的端到端测试

## Impact

- **Affected specs**: 
  - `references/protocol-spec.md`（data-* 属性字典保留，但定位从"转换输入"降级为"语义注释"）
  - `references/conversion-guide.md`（转换流程从 HTML→代码 改为 Spec→HTML+代码）
  - `references/constraint-tiers.md`（新增 Spec 相关的 HARD 约束）
- **Affected code**:
  - `scripts/lib/html-parser.js`（Phase 1 修复，Phase 3 替换）
  - `scripts/convert-lib/parser.js`（Phase 3 重写）
  - `scripts/convert-lib/vue-generator.js`（Phase 3 重写）
  - `scripts/convert-lib/react-generator.js`（Phase 3 重写）
  - `scripts/convert-to-*.js`（Phase 2 替换为 generate-code.js）
  - `scripts/validate-all.js`（Phase 2 加入 Spec 校验）
  - `SKILL.md`（Phase 2 更新工作流）

## ADDED Requirements

### Requirement: Design Spec 作为单一真相源
系统 SHALL 提供 Design Spec 格式，作为 HTML 设计稿和工程代码的共同生成源。Spec 包含组件结构、props 类型、事件契约、状态机、API 契约、视觉规格的完整定义。

#### Scenario: 从 Spec 生成 HTML 和代码
- **WHEN** 用户提供 Design Spec 文件
- **THEN** 系统生成可独立渲染的 HTML 设计稿（含 data-* 标注）
- **AND** 系统生成 Vue/React 组件代码（含类型、props、events、状态管理）
- **AND** HTML 和代码的组件结构、props、events 完全一致

#### Scenario: Spec 变更同步
- **WHEN** Design Spec 变更（如新增 prop）
- **THEN** HTML 设计稿自动更新（新增 data-prop）
- **AND** 代码自动更新（props 接口新增字段）
- **AND** 一致性校验通过

### Requirement: 三角一致性校验
系统 SHALL 提供 Spec ↔ HTML ↔ 代码的三角校验，确保三者一致。

#### Scenario: HTML 与 Spec 不一致
- **WHEN** HTML 中 data-component="StatCard" 但 Spec 中无 StatCard 定义
- **THEN** 校验报告 HARD 违规
- **AND** 提示用户同步 Spec 或 HTML

#### Scenario: 代码与 Spec 不一致
- **WHEN** 代码中 StatCardProps 缺少 Spec 中定义的 `trend` 字段
- **THEN** 校验报告 HARD 违规
- **AND** 提示用户重新生成代码或同步 Spec

### Requirement: AST 级代码生成
系统 SHALL 使用 AST 解析和生成替代正则匹配，确保复杂嵌套场景的正确性。

#### Scenario: 嵌套组件正确转换
- **WHEN** 设计稿包含 3 层嵌套组件（Page > Layout > Card）
- **THEN** 生成的代码正确保留 3 层嵌套关系
- **AND** 每层组件的 props/events 正确归属
- **AND** 无双重嵌套或内容截断

## MODIFIED Requirements

### Requirement: HTML 设计稿的定位
HTML 设计稿从"转换的输入"修改为"Spec 的视觉投影"。data-* 标注保留用于人类可读性和视觉校验，但不再是代码生成的唯一输入。

### Requirement: 转换置信度报告
转换置信度报告从"基于子串匹配的估算"修改为"基于 AST 比对的精确计算"。visualFidelity 指标从可选变为必填。

## REMOVED Requirements

### Requirement: HTML 单向转换
**Reason**: 单向 HTML→代码转换无法实现 100% 还原，已被 Spec-First 双向生成替代。
**Migration**: 现有 HTML 设计稿可通过 `html-to-spec.js`（新增）逆向生成 Spec，之后进入 Spec-First 工作流。
