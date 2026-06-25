# AI 代码生成指南

AI 参考 Design Spec 生成任意框架代码的指南。html-blueprint 不提供代码生成器——AI 根据本指南自行生成。

---

## 串行生成规则与文件输出

1. **串行生成顺序（HARD）**：必须严格按以下顺序生成，不可颠倒：
   - 第一步：design/tokens.css（全局设计 token）
   - 第二步：design/layout/*.html（骨架布局）
   - 第三步：design/blocks/*.html（页面区块）
   - 第四步：design/pages/*.html（页面，引用 layout + blocks）
   - 第五步：design/components/*.html（抽取的可复用组件）

2. **文件输出路径规则**：
   - tokens.css → `design/tokens.css`
   - 骨架布局 → `design/layout/<name>-layout.html`
   - 页面区块 → `design/blocks/<name>-section.html` 或 `design/blocks/<name>-group.html`
   - 原子组件 → `design/components/<name>.html`
   - 页面 → `design/pages/<name>.html`
   - 所有 HTML 都必须在文件头部添加 `<!-- @theme ../tokens.css -->` 注释
   - pages/ 下的 HTML 必须添加 `<!-- @layout ../layout/<layout-name>.html -->` 注释声明引用的骨架

3. **尺寸规范遵循**：
   - 间距使用 `var(--space-*)`（space-1=4px 到 space-20=80px），禁止硬编码 8/16/24/32px
   - 圆角使用 `var(--radius-*)`（sm=4/md=8/lg=12/xl=16/2xl=24/full），禁止硬编码 4/8/12px
   - 阴影使用 `var(--shadow-*)`（sm/md/lg/xl），禁止手写 box-shadow 多层值
   - 字号使用 `var(--font-size-*)`（h1-h6/body-lg/base/sm/caption/button），禁止硬编码 font-size
   - 组件高度使用 `var(--size-*)`（sm=32/md=40/lg=48/header/nav/sidebar），禁止硬编码按钮/输入框高度
   - 例外允许硬编码：1px 分割线(border)、装饰性绝对定位微调、特殊视觉效果（blur/backdrop-filter），但需注释说明原因
   - 详细尺寸标准见 design-dimensions.md

4. **交互状态（HARD）**：所有可交互元素（button、a[href]、input、select、textarea、[role="button"]）必须定义 :hover 和 :focus-visible 样式。

---

## 核心原则

1. **Spec 是单一真相源**：代码必须与 Design Spec 一致，不得自行增减 props/events
2. **框架无关**：本指南适用于 Vue/React/Angular/Svelte 等任意框架
3. **语义对齐**：代码中的标识符必须与 Spec 中的名称匹配（checks/spec-fidelity.js 用语义搜索校验）
4. **CSS 类名一致**：HTML 设计稿中的 CSS 类必须在代码中存在

---

## Spec 字段到代码概念的映射

| Design Spec 字段 | 代码概念 | 校验方式 |
|-----------------|---------|---------|
| components[].name | 组件文件名 / 组件函数名 / 类名 | 文件名匹配（如 StatCard.vue / StatCard.tsx） |
| props[].name | props 参数名 / defineProps 字段 / @Input() | 标识符存在性搜索 |
| props[].required | required 标注 / 可选标注 | required prop 必须存在 |
| events[].name | emit 事件名 / 回调 prop 名 | 标识符存在性搜索（支持 onEventName 形式） |
| states[].name | 状态变量 / v-if 条件 | 标识符存在性搜索 |
| dataSource.endpoint | API 调用路径 | 标识符存在性搜索 |
| dataSource.polling | setInterval / 定时器 | 标识符存在性搜索 |
| convertMode | 组件封装方式 | 文件存在性 |

---

## 框架映射示例

### Vue 3 (Composition API)

**Spec 片段**：
```json
{
  "name": "StatCard",
  "convertMode": "component",
  "props": [
    { "name": "title", "type": "string", "required": true },
    { "name": "value", "type": "number", "required": true }
  ],
  "events": [
    { "name": "viewDetail", "trigger": "click" }
  ]
}
```

**生成的 Vue 代码**：
```vue
<script setup>
defineProps({
  title: { type: String, required: true },
  value: { type: Number, required: true },
})
const emit = defineEmits(['viewDetail'])
</script>

<template>
  <div class="stat-card" @click="emit('viewDetail')">
    <span class="stat-card__title">{{ title }}</span>
    <span class="stat-card__value">{{ value }}</span>
  </div>
</template>

<style>
.stat-card {}
.stat-card__title {}
.stat-card__value {}
</style>
```

### React (TypeScript)

**生成的 React 代码**：
```tsx
interface StatCardProps {
  title: string;
  value: number;
}

interface StatCardEvents {
  onViewDetail?: () => void;
}

export function StatCard({ title, value, onViewDetail }: StatCardProps & StatCardEvents) {
  return (
    <div className="stat-card" onClick={onViewDetail}>
      <span className="stat-card__title">{title}</span>
      <span className="stat-card__value">{value}</span>
    </div>
  );
}
```

**注意**：React 回调约定为 `onEventName`，checks/spec-fidelity.js 会同时搜索 `viewDetail` 和 `onViewDetail`。

### Angular

**生成的 Angular 代码**：
```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  template: `
    <div class="stat-card" (click)="viewDetail.emit()">
      <span class="stat-card__title">{{ title }}</span>
      <span class="stat-card__value">{{ value }}</span>
    </div>
  `,
  styles: [`
    .stat-card {}
    .stat-card__title {}
    .stat-card__value {}
  `]
})
export class StatCardComponent {
  @Input() title: string = '';
  @Input() value: number = 0;
  @Output() viewDetail = new EventEmitter<void>();
}
```

### Svelte

**生成的 Svelte 代码**：
```svelte
<script lang="ts">
  export let title: string;
  export let value: number;
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
</script>

<div class="stat-card" on:click={() => dispatch('viewDetail')}>
  <span class="stat-card__title">{title}</span>
  <span class="stat-card__value">{value}</span>
</div>

<style>
  .stat-card {}
  .stat-card__title {}
  .stat-card__value {}
</style>
```

---

## 生成步骤

1. **创建组件文件**
   - 文件名必须与 `components[].name` 一致（如 `StatCard.vue`、`StatCard.tsx`）
   - 扩展名取决于目标框架

2. **定义 props**
   - 将 Spec 的 `props[]` 转为框架对应的 props 声明
   - required props 必须标注为必填

3. **定义 events**
   - 将 Spec 的 `events[]` 转为框架对应的事件声明
   - React 用 `onEventName` 回调 prop，Vue 用 `defineEmits`，Angular 用 `@Output()`

4. **实现 states**
   - 将 Spec 的 `states[]` 转为状态变量和条件渲染
   - loading/error/empty 状态需要对应的 UI

5. **实现 dataSource**
   - 将 Spec 的 `dataSource.endpoint` 转为 API 调用
   - 将 Spec 的 `dataSource.polling` 转为定时器

6. **保留 CSS 类名**
   - HTML 设计稿中的所有 CSS 类必须在代码 CSS 中存在
   - 可以是空规则（`.stat-card {}`），后续由开发者补充样式

7. **运行校验**
   - 生成代码后运行 `checks/spec-fidelity.js <spec.json> <html-file> <code-dir>`
   - 校验 Spec↔HTML↔代码 三者一致性

---

## 校验机制

checks/spec-fidelity.js 用语义搜索校验代码：

- **prop 校验**：搜索 prop 名称在代码中的存在性（词边界匹配）
- **event 校验**：搜索 event 名称和 `onEventName` 形式
- **CSS 类校验**：HTML 中的 CSS 类必须在代码 CSS 中存在

这种框架无关的校验方式支持任意框架，不依赖语法解析。

---

## 相关文件

- [design-spec.md](./design-spec.md) — Design Spec 格式规范
- [design-dimensions.md](./design-dimensions.md) — 尺寸规范与预设值
- [requirement-extraction-guide.md](./requirement-extraction-guide.md) — 需求提取规则
- [../SKILL.md](../SKILL.md) — Skill 主文档（含门禁定义）
