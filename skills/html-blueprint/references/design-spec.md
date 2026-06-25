# Design Spec 格式规范

Design Spec 是 html-blueprint 的**单一真相源**。HTML 设计稿和工程代码都从 Spec 生成，确保 100% 一致。

**Design Spec 是 AI 提取的中间契约，用户不手写。** AI 按 [requirement-extraction-guide.md](./requirement-extraction-guide.md) 从需求（uluo-spec-driven 的 spec.md 或自然语言）提取，用户确认后生成 HTML。

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

- **路径 A（对齐口径）**：AI 用 uluo-spec-driven 生成 spec.md，再从 spec.md 的功能需求提取 component/props/events，用验收标准验证覆盖度
- **路径 B（独立工作）**：AI 从自然语言需求用模式匹配规则提取 props/events/states/dataSource

提取规则详见 [requirement-extraction-guide.md](./requirement-extraction-guide.md)。

### 生成代码

AI 参考 [code-generation-guide.md](./code-generation-guide.md) 根据 Design Spec 生成任意框架代码（Vue/React/Angular/Svelte）。html-blueprint 不提供框架特定代码生成器——代码生成是 AI 的职责，Spec 是契约。

---

## 顶层结构

```yaml
version: "1.0"           # 必填，Spec 版本
pageType: landing        # 可选，页面类型（landing|dashboard|form|detail|list|other）
page:                    # 必填，页面元信息
  name: LandingPage      # PascalCase 页面名
  viewport:              # 可选，视口尺寸
    width: 1440
    height: 900
  canvas:                # 可选，设计画布尺寸
    width: 1440
    height: 900
    device: desktop      # desktop|tablet|mobile
  grid:                  # 可选，12列栅格参数
    columns: 12
    gutter: "24px"
    margin: "80px"
  container:             # 可选，内容容器宽度
    maxWidth: "1200px"
    paddingX: "24px"
  sections:              # 可选，页面语义区域划分
    - name: Header
      role: header
      columns: 12
      components: [TopNav]
    - name: Hero
      role: hero
      columns: 12
      components: [HeroBanner]
  layoutRef: main-layout # 可选，引用的骨架布局文件名
  theme: ../tokens.css   # 可选，主题 token 文件路径
  lang: zh-CN            # 可选，默认 zh-CN
pages:                   # 可选，多页面清单
  - name: Dashboard
    file: dashboard.html
    layout: main-layout
    blocks: [StatsGroup, ChartSection]
components:              # 必填，组件列表（数组）
  - name: StatCard       # 组件定义（见下文）
    ...
layout:                  # 可选，页面布局结构
  type: grid             # grid | flex | flow
  columns: 12
  gap: var(--space-4)
```

### 新增字段说明

#### `pageType` - 页面类型识别

`pageType` 决定页面的默认尺寸预设和布局模板：

| 页面类型 | 默认容器宽度 | 导航高度 | 侧边栏 | 说明 |
|---------|------------|---------|--------|------|
| `landing` | 1200px | 80px | 无 | 营销落地页，居中大容器 |
| `dashboard` | 1320px | 64px | 240px | 管理后台，侧边栏+主内容 |
| `form` | 640px | 64px | 可选 | 表单页，居中窄容器 |
| `detail` | 主800+侧320 | 64px | 320px | 详情页，双栏布局 |
| `list` | 100% | 56px | 可选 | 列表页，工具栏+表格 |
| `other` | 1320px | 64px | 无 | 其他通用页面 |

#### `canvas` - 设计画布尺寸

设计稿的画布尺寸，默认 1440×900（桌面端）。AI 生成 HTML 时以此作为基准尺寸。

#### `grid` - 栅格系统

12列栅格参数，用于页面布局对齐：
- `columns`: 栅格列数（默认 12）
- `gutter`: 列间距（默认 24px）
- `margin`: 页面左右边距（默认 80px）

#### `container` - 内容容器

页面内容区域的宽度约束：
- `maxWidth`: 容器最大宽度（landing 默认 1200px，其他默认 1320px）
- `paddingX`: 容器水平内边距（默认 24px）

#### `sections` - 页面语义区域

将页面划分为有语义角色的区域，每个区域包含若干组件：
- `role`: 语义角色（header|nav|hero|main|aside|footer|section）
- `columns`: 占用栅格列数（1-12）
- `components`: 区域内包含的组件名列表

#### `layoutRef` - 布局引用

引用预定义的骨架布局文件，如 `main-layout`，用于复用通用布局结构。

#### `pages` - 多页面清单

多页面应用的页面清单，用于多页项目：
- `name`: 页面名称
- `file`: 页面 HTML 文件名
- `layout`: 使用的布局文件名
- `blocks`: 页面包含的区块/组件列表

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
    sizing:                         # 可选，组件尺寸规格
      height: var(--size-md)
      padding: var(--space-6)
      minWidth: var(--size-sm)
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
      xs: 480                       # 极小屏断点
      sm: 640                       # 小屏断点
      md: 768                       # 中屏断点
      lg: 1024                      # 大屏断点
      xl: 1280                      # 超大屏断点
      xxl: 1536                     # 超大屏断点
```

### `visual.sizing` - 组件尺寸规格

组件的尺寸约束属性：
- `height`: 组件固定高度，如 `var(--size-md)` 或 `48px`
- `padding`: 组件内边距（与根级 `padding` 语义一致，用于更细粒度控制）
- `minWidth`: 组件最小宽度

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

### 示例 1：统计卡片（Dashboard 页面）

```yaml
version: "1.0"
pageType: dashboard
page:
  name: DashboardPage
  viewport:
    width: 1440
    height: 900
  canvas:
    width: 1440
    height: 900
    device: desktop
  grid:
    columns: 12
    gutter: "24px"
    margin: "48px"
  container:
    maxWidth: "1320px"
    paddingX: "24px"
  sections:
    - name: Sidebar
      role: aside
      columns: 3
      components: [SideNav]
    - name: Main
      role: main
      columns: 9
      components: [StatsGroup, ChartSection]
  layoutRef: dashboard-layout
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
      sizing:
        height: var(--size-xl)
        padding: var(--space-6)
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
    responsive:
      strategy: mobile-first
      breakpoints:
        xs: 480
        sm: 640
        md: 768
        lg: 1024
        xl: 1280
        xxl: 1536
```

### 示例 2：用户表单

```yaml
version: "1.0"
pageType: form
page:
  name: UserFormPage
  container:
    maxWidth: "640px"
    paddingX: "24px"
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
      sizing:
        minWidth: 320px
      gap: var(--space-4)
      padding: var(--space-8)
```

### 示例 3：销售图表

```yaml
version: "1.0"
pageType: dashboard
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
5. 建议设置 `pageType` 以启用页面类型预设

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
