# HTML Blueprint → Vue/React 转换指南

将带 `data-*` 标注的 HTML 设计稿转换为 Vue 3 或 React 组件。

---

## 转换流程

```
1. 识别 data-page → 确定页面文件
2. 遍历 data-component → 生成组件文件
3. 遍历 data-prop → 生成 props/state
4. 遍历 data-event → 生成 emits/handlers
5. 遍历 data-slot → 生成 slot/children
6. 遍历 data-list → 生成 v-for/map
7. 按 data-convert 决定转换深度
8. 输出转换置信度报告
```

---

## Step 1: data-component → 组件文件

```html
<article data-component="StatCard" data-convert="component" class="stat-card">
```

生成：

```vue
<!-- StatCard.vue -->
<template>
  <article class="stat-card stat-card--highlight">
    ...
  </article>
</template>
```

```tsx
// StatCard.tsx
export function StatCard() {
  return (
    <article className="stat-card stat-card--highlight">
      ...
    </article>
  )
}
```

**规则**：
- 组件名 = `data-component` 值
- 文件名 = 组件名（PascalCase）
- `data-convert="component"` → 独立组件文件
- `data-convert="layout"` → 保留在原页面，不拆分

---

## Step 2: data-prop → props/state

```html
<span data-prop="title">本月销售额</span>
<span data-prop="value" data-type="number">128000</span>
```

生成：

```vue
<!-- Vue -->
<script setup lang="ts">
interface Props {
  title: string
  value: number
  trend: string
}
defineProps<Props>()
</script>
```

```tsx
// React
interface StatCardProps {
  title: string
  value: number
  trend: string
}
```

**规则**：
- `data-prop` 名称转 camelCase → props 字段名
- `data-type` → TypeScript 类型映射
- `data-static="true"` → 不转为 prop，保留为静态内容
- `data-i18n` → 使用 `$t()` / `useI18n()`
- 示例文本转为默认值或移除，由调用方传入

---

## Step 3: data-event → emits/handlers

```html
<button data-event="click" data-action="viewDetail">查看详情</button>
```

生成：

```vue
<!-- Vue -->
<script setup lang="ts">
const emit = defineEmits<{
  viewDetail: []
}>()
</script>
<template>
  <button @click="emit('viewDetail')">查看详情</button>
</template>
```

```tsx
// React
interface StatCardProps {
  onViewDetail?: () => void
}
<button onClick={onViewDetail}>查看详情</button>
```

**规则**：
- `data-event` → 事件类型（click → @click/onClick）
- `data-action` → emit 名/handler 名（camelCase）
- 无 `data-action` → 只暴露事件出口，不绑定具体逻辑
- `data-confirm="true"` → 包裹确认对话框

---

## Step 4: data-slot → slot/children

```html
<div data-slot="header" class="card__header">...</div>
<div data-slot="default" class="card__body">...</div>
```

```vue
<template>
  <div class="card">
    <div class="card__header"><slot name="header" /></div>
    <div class="card__body"><slot /></div>
  </div>
</template>
```

```tsx
interface CardProps {
  header?: React.ReactNode
  children?: React.ReactNode
}
```

---

## Step 5: data-list → 循环

```html
<ul data-list="projects" data-list-type="dynamic">
  <li data-component="ProjectItem">
    <span data-prop="name">项目名</span>
  </li>
</ul>
```

```vue
<template>
  <ul class="project-list">
    <ProjectItem
      v-for="item in projects"
      :key="item.id"
      :name="item.name"
    />
  </ul>
</template>
```

```tsx
<ul className="project-list">
  {projects.map(item => (
    <ProjectItem key={item.id} name={item.name} />
  ))}
</ul>
```

**规则**：
- `data-list-type="dynamic"` → `v-for` / `.map()`
- `data-list-type="static"` → 保留静态 HTML
- `data-list-type="config"` → 转为本地配置数组

---

## Step 6: data-convert 决定转换深度

| data-convert | 操作 |
|-------------|------|
| `component` | 生成独立 .vue/.tsx 文件 |
| `layout` | 保留在原页面模板中 |
| `static` | 转为静态 HTML，不做组件化 |
| `decorative` | 保留 DOM + aria-hidden，不移除 |
| `manual` | 保留原始 HTML + `<!-- TODO: manual conversion -->` 注释 |

---

## Step 7: 表单转换

```html
<form data-component="UserForm" data-model="user">
  <input data-field="name" data-type="string" data-required="true" />
</form>
```

```vue
<script setup lang="ts">
import { reactive } from 'vue'
const user = reactive({ name: '' })
</script>
<template>
  <form>
    <input v-model="user.name" required />
  </form>
</template>
```

```tsx
const [user, setUser] = useState({ name: '' })
<form>
  <input value={user.name} onChange={e => setUser({...user, name: e.target.value})} required />
</form>
```

---

## Step 8: 图表处理

```html
<div data-chart="bar" data-chart-lib="echarts" data-convert="manual">
  <!-- preview-only chart -->
</div>
```

```vue
<!-- TODO: manual conversion — chart.html blueprint was visual preview only -->
<!-- Replace with ECharts <v-chart :option="barOption" /> after defining data structure -->
<div class="sales-chart">
  <v-chart :option="barOption" />
</div>
```

**规则**：
- `data-convert="manual"` 的图表不自动生成 chart option
- 只在用户提供数据结构后才生成真实图表配置
- 转换为带 `TODO` 注释的占位代码

---

## 转换置信度报告

每个组件输出：

```json
{
  "component": "StatCard",
  "confidence": 0.93,
  "convertMode": "auto",
  "issues": [
    "按钮文案标记为 data-static，不作为 props",
    "装饰光效保留为 aria-hidden 元素"
  ],
  "props": ["title", "value", "trend"],
  "events": ["viewDetail"],
  "slots": []
}
```

### 置信度阈值

- **≥0.85**: 自动转换，无需人工复核
- **0.6-0.84**: 自动转换，建议人工复核特定区域
- **<0.6**: 仅生成骨架，标记为 manual，等待补充信息
