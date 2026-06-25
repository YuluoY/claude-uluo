# Vue 3 组件创建领域知识

选定 Vue 3 时加载。覆盖 SFC 结构、API 定义、组合式函数、依赖注入。

---

## SFC 结构

```vue
<script setup lang="ts">
// 1. 导入
import { ref, computed, watch, onMounted } from 'vue'
import type { PropType } from 'vue'

// 2. Props（用 defineProps + withDefaults 或类型声明）
interface Props {
  items: Item[]
  pageSize?: number
  loading?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  pageSize: 10,
  loading: false,
})

// 3. Emits
const emit = defineEmits<{
  select: [item: Item]
  change: [value: string]
}>()

// 4. 双向绑定（v-model）
const modelValue = defineModel<string>()          // 单 v-model
const page = defineModel<number>('page')          // 具名 v-model

// 5. Slots（类型声明，运行时用 <slot>）
defineSlots<{
  default(props: { item: Item }): any
  header(): any
}>()

// 6. 内部状态
const selectedId = ref<string | null>(null)

// 7. 计算属性
const totalPages = computed(() => Math.ceil(props.items.length / props.pageSize))

// 8. 方法
function handleSelect(item: Item) {
  selectedId.value = item.id
  emit('select', item)
}

// 9. 侦听器
watch(() => props.items, () => {
  selectedId.value = null
})

// 10. 生命周期
onMounted(() => {
  // 初始化逻辑
})
</script>

<template>
  <div class="component">
    <slot name="header" />
    <div v-for="item in props.items" :key="item.id" @click="handleSelect(item)">
      <slot :item="item">{{ item.name }}</slot>
    </div>
  </div>
</template>

<!-- 三层样式架构：结构层（固定值）+ 语义层（token 引用）+ 风格层（预设提供） -->
<!-- 组件代码只引用语义层 token，风格层值由 references/style-presets/ 预设文件提供 -->
<style scoped>
/* 三层样式架构——组件代码只引用语义层 token，风格层由预设文件提供 */

.component {
  /* 结构层：布局、尺寸、定位——与风格无关，用固定值 */
  display: flex;
  flex-direction: column;
  gap: 8px;  /* 结构层固定值，不随风格变化 */

  /* 语义层：引用语义 token，与风格解耦 */
  padding: var(--spacing-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.component-item {
  /* 语义层 token 引用 */
  padding: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.component-item:hover {
  background: var(--color-hover);
}

.component-item.is-selected {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}
</style>
```

---

## Props 设计

### 类型声明（推荐）

```typescript
// TypeScript 泛型方式（推荐，类型推导好）
interface Props {
  items: Item[]
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  disabled: false,
})
```

### 运行时声明（需要校验时）

```typescript
const props = defineProps({
  items: { type: Array as PropType<Item[]>, required: true },
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md' },
  disabled: { type: Boolean, default: false },
  // 自定义校验
  age: {
    type: Number,
    validator: (v: number) => v >= 0 && v <= 150,
  },
})
```

---

## Emits

```typescript
// 类型声明（推荐）
const emit = defineEmits<{
  select: [item: Item]                    // 事件名: [参数类型]
  change: [value: string, oldValue: string]
  // 无参数
  close: []
}>()

// 使用
emit('select', item)
```

---

## v-model

Vue 3.4+ 推荐用 `defineModel`：

```typescript
// 单 v-model
const modelValue = defineModel<string>()
// <MyComponent v-model="text" />

// 具名 v-model
const page = defineModel<number>('page')
const size = defineModel<number>('size')
// <MyComponent v-model:page="p" v-model:size="s" />

// 修饰符
const [modelValue, modifiers] = defineModel<string>({
  set(value) {
    return modifiers.trim ? value.trim() : value
  },
})
```

---

## Slots

```typescript
// 类型声明
defineSlots<{
  default(props: { item: Item; index: number }): any
  header(): any
  footer(props: { total: number }): any
}>()
```

```vue
<template>
  <div>
    <slot name="header" />
    <ul>
      <li v-for="(item, index) in items" :key="item.id">
        <slot :item="item" :index="index">{{ item.name }}</slot>
      </li>
    </ul>
    <slot name="footer" :total="items.length" />
  </div>
</template>
```

---

## 组合式函数（Composable）

抽取逻辑为独立函数，约定 `use` 前缀：

```typescript
// useSelection.ts
import { ref, type Ref } from 'vue'

export function useSelection<T extends { id: string }>(items: Ref<T[]>) {
  const selectedId = ref<string | null>(null)
  const selected = computed(() =>
    items.value.find(item => item.id === selectedId.value),
  )

  function select(item: T) {
    selectedId.value = item.id
  }

  function clear() {
    selectedId.value = null
  }

  return { selectedId, selected, select, clear }
}
```

**拆分时机：**
- 组件逻辑 > 150 行
- 包含 3 个以上不相关关注点
- 逻辑需要在多个组件间复用

---

## 依赖注入（provide/inject）

跨层级传递，适合主题、配置等：

```typescript
// 父组件 provide
import { provide, type InjectionKey } from 'vue'

export interface ComponentContext {
  size: 'sm' | 'md' | 'lg'
  disabled: boolean
}

export const ComponentContextKey: InjectionKey<ComponentContext> = Symbol('ComponentContext')

provide(ComponentContextKey, {
  size: props.size,
  disabled: props.disabled,
})
```

```typescript
// 子组件 inject
import { inject } from 'vue'

const ctx = inject(ComponentContextKey)
if (!ctx) throw new Error('ComponentContext must be provided')
```

---

## 文件结构

```
ComponentName/
├── README.md                   ← 组件入口文档，AI 快速扫描入口
├── docs/                       ← 设计文档（与代码同目录）
│   ├── research-report.md      ← Phase 1 调研笔记
│   ├── component-spec.md       ← Phase 2 组件设计规格
│   └── verification-report.md  ← Phase 5 验收报告（可选）
├── index.vue                   ← 入口
├── ComponentName.vue           ← 主组件（如需拆分）
├── components/                 ← 私有子组件
│   └── SubComponent.vue
├── composables/                ← 组合式函数
│   └── useSelection.ts
├── types.ts                    ← 类型定义
├── __tests__/
│   └── ComponentName.spec.ts
└── index.ts                    ← 导出入口（如作为库）
```

---

## 测试

推荐用 `@vue/test-utils` + `vitest`：

```typescript
import { mount } from '@vue/test-utils'
import Component from '../ComponentName.vue'

describe('ComponentName', () => {
  it('renders items', () => {
    const wrapper = mount(Component, {
      props: { items: [{ id: '1', name: 'Test' }] },
    })
    expect(wrapper.text()).toContain('Test')
  })

  it('emits select on click', async () => {
    const wrapper = mount(Component, {
      props: { items: [{ id: '1', name: 'Test' }] },
    })
    await wrapper.find('[data-testid="item"]').trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })
})
```
