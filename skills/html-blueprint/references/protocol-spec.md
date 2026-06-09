# HTML Blueprint 协议规范

本文档是 html-blueprint 协议的完整参考。HTML 负责视觉保真，`data-*` 属性负责组件语义。本文件为**属性字典 + 组件分类 + 转换报告格式 + 禁止模式**。

---

## 属性字典

### 结构层

| 属性 | 适用元素 | 值 | 说明 |
|------|---------|---|------|
| `data-page` | `<main>` | PascalCase 页面名 | 页面根节点标识 |
| `data-section` | `<section>` | PascalCase 区块名 | 页面大区域标识 |
| `data-component` | 任意 | PascalCase 组件名 | 组件根节点，值必须是 PascalCase |
| `data-slot` | 任意 | 插槽名 | 可替换内容区域 |

### 数据层

| 属性 | 适用元素 | 值 | 说明 |
|------|---------|---|------|
| `data-prop` | 任意 | camelCase 属性名 | 动态数据字段，转为 props/state |
| `data-type` | 配合 data-prop | string, number, boolean, date, email 等 | Prop 类型声明 |
| `data-static` | 任意 | "true" | 静态文案，不 props 化 |
| `data-i18n` | 任意 | 国际化 key | i18n 文案 key |

### 行为层

| 属性 | 适用元素 | 值 | 说明 |
|------|---------|---|------|
| `data-event` | 交互元素 | click, submit, change, input 等 | 事件出口 |
| `data-action` | 配合 data-event | camelCase 业务动作名 | 业务回调名 |
| `data-payload` | 按钮/链接 | 表达式 | 事件携带的数据 |
| `data-confirm` | 按钮 | "true" | 需要确认的操作 |

### 转换控制层

| 属性 | 适用元素 | 值 | 说明 |
|------|---------|---|------|
| `data-convert` | 任意 | component, layout, static, decorative, manual | 转换模式 |
| `data-list` | 容器 | 列表名 | 列表声明 |
| `data-list-type` | 配合 data-list | dynamic, static, config | dynamic→v-for/map, static→静态, config→前端配置 |
| `data-risk` | 任意 | absolute-content 等 | 风险标记 |
| `data-manual` | 任意 | "true" | 需要人工处理 |

### 表单层

| 属性 | 适用元素 | 值 | 说明 |
|------|---------|---|------|
| `data-model` | `<form>` | 数据模型名 | 表单绑定数据模型 |
| `data-field` | `<input>/<select>/<textarea>` | 字段名 | 表单字段名 |
| `data-required` | 表单控件 | "true" | 必填标记 |

### 图表层

| 属性 | 适用元素 | 值 | 说明 |
|------|---------|---|------|
| `data-chart` | `<div>` | bar, line, pie 等 | 图表类型声明 |
| `data-chart-lib` | 配合 data-chart | echarts, antv, chart.js | 目标图表库 |

### UI 库映射层

| 属性 | 适用元素 | 值 | 说明 |
|------|---------|---|------|
| `data-role` | 交互元素 | button, input, select 等 | 中立组件角色 |
| `data-variant` | 交互元素 | primary, secondary, danger 等 | 样式变体 |
| `data-ui-lib` | 组件根 | element-plus, ant-design, shadcn 等 | 目标 UI 库 |
| `data-ui-name` | 组件根 | ElButton, AButton 等 | 目标组件名 |

### 响应式层

| 属性 | 适用元素 | 值 | 说明 |
|------|---------|---|------|
| `data-responsive` | 容器 | fluid, grid, flex | 响应式策略 |
| `data-breakpoints` | 配合 data-responsive | mobile:N,tablet:N,desktop:N | 断点列数 |

### 状态层

| 属性 | 适用元素 | 值 | 说明 |
|------|---------|---|------|
| `data-state` | 组件根 | default, hover, loading 等 | 当前展示状态 |
| `data-states` | 组件根 | 逗号分隔状态列表 | 组件全部状态声明 |

---

## 组件分类决策

```
元素是什么？
├─ 有独立业务含义 + 可复用 → data-convert="component"
├─ 仅用于布局组织 → data-convert="layout"
├─ 纯静态展示，不变 → data-convert="static"
├─ 纯视觉装饰 → data-convert="decorative" + aria-hidden="true"
└─ 复杂/图表/不确定 → data-convert="manual"
```

### 分类规则

1. **component**: 有明确 PascalCase 命名、可独立复用、含 data-prop/data-event。
2. **layout**: 页面骨架、网格容器、flex 容器，不承载业务数据。
3. **static**: 页头、页脚、版权信息、固定说明文本。
4. **decorative**: 光效、模糊圆、渐变背景层、动画装饰。必须 `aria-hidden="true"`。
5. **manual**: 图表、富文本编辑器、第三方嵌入、复杂交互区域。

---

## 转换置信度报告格式

```json
{
  "component": "StatCard",
  "confidence": 0.93,
  "convertMode": "auto",
  "issues": [
    "按钮文案被识别为静态文案，不作为 props",
    "装饰光效标记为 aria-hidden"
  ]
}
```

### 字段说明

- `component`: 组件名
- `confidence`: 0-1 置信度，≥0.8 建议 auto，0.5-0.8 建议 review，<0.5 建议 manual
- `convertMode`: auto, review, manual
- `issues`: 转换注意事项列表

---

## 输出格式

### 生成 HTML 设计稿时

1. HTML（含 `<!-- @viewport -->` 和必要的 `<!-- @page -->` 注释）
2. CSS（遵循 BEM 约定，hybrid token 模式）
3. 组件语义说明（列出所有 data-component 及其 props/events）
4. 转换风险报告（每个组件一个 JSON 块）

### 转 Vue/React 时

1. 组件文件（.vue / .tsx）
2. 样式文件（scoped / CSS Modules / styled-components）
3. props / emits / events 说明
4. 未解决问题（data-risk 区域、manual 区域）
5. 转换置信度报告

---

## 禁止模式

### 命名禁止

- `data-component="card"` → 应为 `"StatCard"`
- `data-component="box1"` → 应有业务含义
- `data-component="组件A"` → 禁止中文
- `class="box1"`, `class="left"`, `class="text2"` → 应使用 BEM

### CSS 禁止

- `!important`
- `div > div > span`（>2 层标签选择器）
- `div:nth-child(2)`（无 class 前缀的 nth-child）
- `*:not(...)`（过于宽泛）
- 业务元素 position:absolute 不标记 `data-risk="absolute-content"`

### 语义禁止

- 图表不标记 `data-convert="manual"`
- 表单无 `data-model`
- 表单控件无 `data-field`
- 装饰元素缺少 `aria-hidden="true"`
- 装饰元素包含 `data-prop`/`data-field`/`data-event`
- 每段文本都 props 化
- 每段重复 DOM 都识别为动态列表
- 把纯视觉预览图表当真实图表组件
