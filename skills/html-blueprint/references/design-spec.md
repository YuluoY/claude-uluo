# Design Spec 格式规范

Design Spec 是 html-blueprint 的**单一真相源**。HTML 设计稿和工程代码都从 Spec 生成，确保 100% 一致。

**Design Spec 是 AI 提取的中间契约，用户不手写。** AI 按 [requirement-extraction-guide.md](./requirement-extraction-guide.md) 从需求（uluo-doc-standards 的 spec.md 或自然语言）提取，用户确认后生成 HTML。

本文件定义 Spec 的 YAML/JSON 结构、字段语义和校验规则。

---

## 设计理念

```
需求（spec.md 或自然语言）
       ↓
  AI 提取
       ↓
Design Spec（中间契约，真相源）
       ↓
  ┌────┴────┐
  ↓         ↓
HTML      代码
（视觉投影）（工程投影）
  ↓         ↓
视觉校验  工程校验
  └────┬────┘
       ↓
  一致性校验
```

Spec 包含 HTML 能表达的视觉信息 + HTML 无法表达的工程信息（API、状态机、类型契约）。

### 从需求提取

AI 提取 Design Spec 的两条路径：

- **路径 A（对齐口径）**：AI 用 uluo-doc-standards 生成 spec.md，再从 spec.md 的功能需求提取 component/props/events，用验收标准验证覆盖度
- **路径 B（独立工作）**：AI 从自然语言需求用模式匹配规则提取 props/events/states/dataSource

提取规则详见 [requirement-extraction-guide.md](./requirement-extraction-guide.md)。

### 生成代码

AI 参考 [code-generation-guide.md](./code-generation-guide.md) 根据 Design Spec 生成任意框架代码（Vue/React/Angular/Svelte）。html-blueprint 不提供框架特定代码生成器——代码生成是 AI 的职责，Spec 是契约。

---

## 顶层结构

```yaml
version: "1.0"           # 必填，Spec 版本
page:                    # 必填，页面元信息
  name: DashboardPage    # PascalCase 页面名
  viewport:              # 可选，视口尺寸
    width: 1440
    height: 900
  theme: ../tokens.css   # 可选，主题 token 文件路径
  lang: zh-CN            # 可选，默认 zh-CN
components:              # 必填，组件列表（数组）
  - name: StatCard       # 组件定义（见下文）
    ...
layout:                  # 可选，页面布局结构
  type: grid             # grid | flex | flow
  columns: 12
  gap: var(--space-4)
```

---

## 组件定义

每个组件是 `components` 数组的一个元素：

```yaml
- name: StatCard                    # 必填，PascalCase 组件名
  convertMode: component            # 必填，component|layout|static|decorative|manual
  description: 统计数据卡片          # 可选，组件描述
  
  # Props 定义（HTML 的 data-prop 升级版）
  props:
    - name: title                   # 必填，camelCase 属性名
      type: string                  # 必填，类型
      required: true                # 可选，默认 false
      default: ""                   # 可选，默认值
      example: "本月销售额"          # 可选，示例值（用于生成 HTML 设计稿）
      description: 卡片标题          # 可选
      # 类型扩展
      format:                       # 可选，格式化规则
        unit: "元"
        precision: 0
      validation:                   # 可选，校验规则
        min: 0
        max: 9999999
    
    - name: value
      type: number
      required: true
      example: 128000
    
    - name: trend
      type: Trend                   # 自定义类型，需配合 typeRef
      required: false
      typeRef: ./types/trend.ts     # 类型定义文件引用
  
  # Events 定义（HTML 的 data-event 升级版）
  events:
    - name: viewDetail              # 必填，camelCase 事件名
      trigger: click                # 必填，click|submit|change|hover|...
      payload:                      # 可选，payload 结构
        id: string
        category: string
      description: 查看详情          # 可选
      confirm: true                 # 可选，是否需要二次确认
  
  # States 定义（HTML 无法表达）
  states:
    - name: default                 # 默认态
    - name: loading                 # 加载态
      skeleton: true                # 显示骨架屏
    - name: error                   # 错误态
      fallback: ErrorBoundary       # 错误边界组件
      retry: true                   # 支持重试
    - name: empty                   # 空数据态
      emptyText: "暂无数据"
  
  # 数据源（HTML 完全缺失）
  dataSource:                       # 可选
    type: api                       # api|static|store|computed
    endpoint: GET /api/stats/sales  # API 契约
    polling: 30000                  # 可选，轮询间隔（ms）
    errorHandling: retry-3-times    # 可选，错误处理策略
    transform:                      # 可选，数据转换函数
      typeRef: ./transforms/sales.ts
  
  # 视觉规格（从 CSS 提取的结构化定义）
  visual:
    layout: flex-column             # flex-row|flex-column|grid|absolute
    padding: var(--space-6)
    background: linear-gradient(135deg, #fff 0%, #f7faff 100%)
    border:
      radius: var(--radius-lg)
      width: 1px
      color: var(--color-border)
    shadow: var(--shadow-card)
    # 装饰元素
    decorative:
      - name: glow
        position: absolute
        top: -20px
        right: -20px
        width: 120px
        height: 120px
        blur: 24px
        color: rgba(59, 130, 246, 0.16)
        ariaHidden: true
  
  # 子组件引用（用于嵌套组件）
  children:
    - name: TrendIndicator
      required: false
      slot: trend                   # 对应 data-slot
  
  # 响应式（可选）
  responsive:
    strategy: mobile-first
    breakpoints:
      sm: 640
      md: 768
      lg: 1024
      xl: 1280
```

---

## 类型系统

### 基本类型

| 类型 | 说明 | 对应 TypeScript |
|------|------|----------------|
| `string` | 字符串 | `string` |
| `number` | 数字 | `number` |
| `boolean` | 布尔 | `boolean` |
| `date` | 日期 | `string` (ISO 8601) |
| `email` | 邮箱 | `string` |
| `url` | URL | `string` |
| `array` | 数组 | `T[]`（需配合 items） |
| `object` | 对象 | `Record<string, T>`（需配合 properties） |

### 复杂类型

使用 `type` + `typeRef` 引用外部类型定义：

```yaml
props:
  - name: trend
    type: Trend
    typeRef: ./types/trend.ts   # 文件需存在
```

数组类型：

```yaml
props:
  - name: items
    type: array
    items:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
```

---

## convertMode 语义

| Mode | 说明 | 生成行为 |
|------|------|---------|
| `component` | 可复用业务组件 | 生成独立组件文件 + props/events 接口 |
| `layout` | 布局容器 | 生成布局组件，不含业务逻辑 |
| `static` | 静态内容 | 内联到父组件，不单独生成文件 |
| `decorative` | 纯装饰 | aria-hidden=true，不生成组件 |
| `manual` | 需人工处理 | 生成骨架 + TODO 注释（如图表） |

---

## 完整示例

### 示例 1：统计卡片

```yaml
version: "1.0"
page:
  name: DashboardPage
  viewport:
    width: 1440
    height: 900
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
        format:
          unit: "元"
          precision: 0
      - name: trend
        type: Trend
        required: false
        typeRef: ./types/trend.ts
    events:
      - name: viewDetail
        trigger: click
        payload:
          id: string
    states:
      - name: default
      - name: loading
        skeleton: true
      - name: error
        fallback: ErrorBoundary
    dataSource:
      type: api
      endpoint: GET /api/stats/sales
      polling: 30000
    visual:
      layout: flex-column
      padding: var(--space-6)
      background: linear-gradient(135deg, #fff 0%, #f7faff 100%)
      border:
        radius: var(--radius-lg)
      decorative:
        - name: glow
          position: absolute
          blur: 24px
          color: rgba(59, 130, 246, 0.16)
          ariaHidden: true
```

### 示例 2：用户表单

```yaml
version: "1.0"
page:
  name: UserFormPage
  theme: ../tokens.css

components:
  - name: UserForm
    convertMode: component
    props:
      - name: initialData
        type: object
        properties:
          name:
            type: string
          email:
            type: email
    events:
      - name: submit
        trigger: submit
        payload:
          name: string
          email: string
      - name: cancel
        trigger: click
    states:
      - name: default
      - name: submitting
        disableInputs: true
      - name: validationError
        showErrors: true
    dataSource:
      type: api
      endpoint: POST /api/users
    visual:
      layout: flex-column
      gap: var(--space-4)
      padding: var(--space-8)
```

### 示例 3：销售图表

```yaml
version: "1.0"
page:
  name: SalesChartPage
  theme: ../tokens.css

components:
  - name: SalesChart
    convertMode: manual
    chart:
      type: bar
      lib: echarts
      dataContract:
        xAxis:
          field: month
          type: category
        yAxis:
          field: sales
          type: number
        series:
          - name: 销售额
            field: sales
      interactions:
        - tooltip: true
        - zoom: true
    props:
      - name: data
        type: array
        items:
          type: object
          properties:
            month:
              type: string
            sales:
              type: number
      - name: period
        type: string
        default: "monthly"
    states:
      - name: default
      - name: loading
        skeleton: true
      - name: empty
        emptyText: "暂无销售数据"
    dataSource:
      type: api
      endpoint: GET /api/stats/sales
      params:
        period: monthly
```

---

## 校验规则

### HARD 级别（必须满足）

1. `version` 必填，且为 `"1.0"`
2. `page.name` 必填，PascalCase
3. `page.name` 不得与任何 `components[].name` 重复
4. 每个 `components[]` 必须有 `name`（PascalCase）和 `convertMode`
5. `convertMode` 必须是 `component|layout|static|decorative|manual` 之一
6. `props[].name` 必填，camelCase
7. `props[].type` 必填，且为基本类型或自定义类型名
8. 若 `type` 为自定义类型，`typeRef` 必填且指向的文件必须存在
9. `events[].name` 必填，camelCase
10. `events[].trigger` 必填
11. 组件名不得重复
12. `decorative` 组件的 `ariaHidden` 必须为 `true`

### SHOULD 级别（建议满足）

1. `component` 模式的组件应定义至少一个 prop 或 event
2. `dataSource` 存在时应定义 `states.loading`
3. `props` 应提供 `example` 值（用于生成 HTML 设计稿）
4. `visual` 应定义 `layout`

### WARN 级别（提醒）

1. `manual` 模式的组件应补充 `chart` 或其他手工处理说明
2. `typeRef` 指向的文件建议有 TypeScript 类型定义

---

## 与 data-* 属性的映射

| Spec 字段 | data-* 属性 | 说明 |
|-----------|------------|------|
| `components[].name` | `data-component` | 组件名 |
| `props[].name` | `data-prop` | 属性名 |
| `props[].type` | `data-type` | 属性类型 |
| `events[].name` | `data-event` / `data-action` | 事件名 |
| `states[].name` | `data-state` | 状态名 |
| `children[].slot` | `data-slot` | 插槽名 |
| `convertMode` | `data-convert` | 转换模式 |
| `visual.decorative[].ariaHidden` | `aria-hidden` | 无障碍属性 |

Spec 是真相源，HTML 中的 data-* 是 Spec 的投影。校验时检查两者一致性。
