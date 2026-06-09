# Vue 编码风格

**加载条件：** 当前任务涉及 Vue、Vue 3、SFC、Composition API、Options API、Pinia、组件拆分或前端状态管理时加载。若项目已有更具体的 Vue 规范，以项目规范为准；本文件作为质量底线补充。

> 参考：[Official Vue Style Guide](https://vuejs.org/style-guide/)、[VueUse Composable Patterns](https://alexop.dev/posts/vueuse_composables_style_guide/)
> 格式由 `validate-rules.js` 检查。Vue 专项 lint 由 `eslint-plugin-vue` 处理（见 `config/eslint.config.mjs`）。SCSS 由 `stylelint` 处理。
> 项目组织、组件四态、可访问性、性能分别见 `references/architecture.md`、`references/ui-states.md`、`references/accessibility.md`、`references/performance.md`。

## 目录

- [一、组件组织](#component-organization)
  - [组件命名](#component-naming)
  - [SFC 块顺序](#sfc-block-order)
  - [自闭合](#self-closing)
- [二、Template](#template)
  - [属性排序](#attribute-order)
  - [多属性换行](#multi-attribute-line-breaks)
  - [v-for](#v-for)
  - [表达式简洁](#simple-expressions)
  - [指令简写](#directive-shorthand)
- [三、Composition API（推荐）](#composition-api)
  - [v-model 双向绑定](#v-model-two-way-binding)
- [四、Options API](#options-api)
- [五、Composables](#composables)
  - [输入灵活：MaybeRefOrGetter](#input-flexibility-maybereforgetter)
  - [返回值模式](#return-value-patterns)
  - [清理 & SSR 安全](#cleanup--ssr-safety)
  - [ref 选择](#ref-selection)
  - [命名规范](#naming-conventions)
- [六、Pinia](#pinia)
- [七、样式](#styles)
- [八、Error Boundary](#error-boundary)
- [九、组件四态](#component-four-states)
- [十、可访问性与性能](#accessibility-and-performance)
- [十一、国际化](#internationalization)
- [十二、测试](#testing)
- [输出前自检](#output-checklist)

---

## 一、组件组织

组件以**文件夹为单位**，通过 `index.ts` 对外暴露：

```
# 通用组件（纯 UI）
components/
  Button/
    index.ts          ← export { Button } from './Button.vue'
    Button.vue
    Button.test.ts

# 业务组件（领域内）
features/user/components/
  UserCard/
    index.ts          ← export { UserCard } from './UserCard.vue'
    UserCard.vue
    UserCard.test.ts
    types.ts          ← 本组件私有 Props/Emits 类型
```

### 组件命名

| 规则 | 正确 | 错误 |
|------|------|------|
| PascalCase 多词（eslint 已覆盖） | `UserCard`、`OrderForm` | `Card`、`Form` |
| 基础组件用 `Base` / `App` 前缀 | `BaseButton`、`BaseModal` | `MyButton` |
| 父子紧耦合加父名前缀 | `TodoListItem`、`TodoListItemButton` | `TodoButton`（看不出归属） |
| 全称不缩写 | `UserProfileOptions` | `UProfOpts` |
| 从通用到具体排序 | `SearchButtonClear`、`SearchButtonRun` | `ClearSearchButton` |

### SFC 块顺序

固定 `<script>` → `<template>` → `<style>`（eslint `vue/block-order` 已覆盖）。

### 自闭合

无 slot 内容时自闭合：

```vue
<!-- ✅ -->
<MyComponent />

<!-- ❌ -->
<MyComponent></MyComponent>
```

---

## 二、Template

### 属性排序

eslint `vue/attributes-order` 已覆盖。按：定义 → 列表渲染 → 条件 → 渲染修饰 → 全局感知 → 唯一属性 → 双向绑定 → 其他 → 事件 → 内容。

### 多属性换行

多属性时每个属性一行（eslint `vue/max-attributes-per-line` 已覆盖）：

```vue
<MyComponent
  foo="a"
  bar="b"
  baz="c"
/>
```

### v-for

- `key` 始终用稳定业务 ID，禁止 index
- **禁止** `v-if` 与 `v-for` 同元素——用 `computed` 过滤或用 `<template>` 包裹后放 `v-if`

```vue
<!-- ❌ -->
<li v-for="user in users" v-if="user.isActive" :key="user.id">

<!-- ✅ computed 过滤 -->
<script setup lang="ts">
const activeUsers = computed(() => users.filter(u => u.isActive))
</script>
<li v-for="user in activeUsers" :key="user.id">

<!-- ✅ template 包裹 -->
<template v-for="user in users" :key="user.id">
  <li v-if="user.isActive">{{ user.name }}</li>
</template>
```

### 表达式简洁

模板只放简单表达式。复杂逻辑提取为 `computed` 或方法：

```vue
<!-- ❌ -->
{{ fullName.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ') }}

<!-- ✅ -->
const initials = computed(() =>
  fullName.value.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
)
```

### 指令简写

`:bind` / `@event` / `#slot` 始终用简写（项目内保持一致）：

```vue
<input :value="text" @input="onInput" />
<template #header>...</template>
```

---

## 三、Composition API（推荐）

```vue
<script setup lang="ts">
// Props —— 显式类型声明
const props = defineProps<{
  items: OrderItem[]
  loading?: boolean
}>()

// Emits —— 显式类型声明
const emit = defineEmits<{
  select: [id: string]
  submit: [payload: FormData]
}>()

// 状态
const selectedId = ref<string | null>(null)

// 派生数据 —— 纯函数，无副作用
const selectedItem = computed(() =>
  props.items.find(i => i.id === selectedId.value) ?? null
)

// 副作用 —— 仅 computed 无法表达时用
watch(selectedId, (newId) =>
{
  emit('select', newId ?? '')
})
</script>
```

- Props 只读，子组件不直接修改——通过 `emit` 上抛
- `computed` 不含副作用（API 调用、状态修改）
- `watch` 必须说明副作用目的；能用 `computed` 时不写 `watch`
- 复杂状态逻辑抽 composable，组件只做视图编排
- Ref 变量用 `ref` 后缀：`inputRef`、`listRef`

### v-model 双向绑定

```vue
<!-- 父 -->
<UserForm v-model:name="userName" v-model:email="userEmail" />

<!-- 子 -->
<script setup lang="ts">
const props = defineProps<{ name: string; email: string }>()
const emit = defineEmits<{ 'update:name': [value: string]; 'update:email': [value: string] }>()
</script>
```

---

## 四、Options API

项目已有 Options API 或明确要求时使用。选项顺序：

`name` → `components` → `props` → `emits` → `data` → `computed` → `watch` → `methods` → 生命周期

`methods` 中禁用箭头函数。

---

## 五、Composables

一个文件一个 composable，扁平放置。职责单一，返回值类型显式标注。

### 输入灵活：MaybeRefOrGetter

```typescript
import { toValue, type MaybeRefOrGetter } from 'vue'

// 接受 ref、computed、getter 或裸值——调用方不受限
export function useTitle(title: MaybeRefOrGetter<string>)
{
  watchEffect(() =>
  {
    document.title = toValue(title)
  })
}

// 四种调用方式都合法
useTitle('静态标题')
useTitle(ref('响应式标题'))
useTitle(() => dynamicTitle)
useTitle(computed(() => `${prefix}: ${title}`))
```

### 返回值模式

```typescript
// 多值 → 对象返回，用 readonly 防外部修改
export function useMouse()
{
  const x = ref(0)
  const y = ref(0)
  return {
    x: readonly(x),
    y: readonly(y),
  }
}

// 单值 → 直接返回 ref
export function useOnline()
{
  const online = ref(navigator.onLine)
  return readonly(online)
}
```

### 清理 & SSR 安全

```typescript
import { onScopeDispose, getCurrentScope } from 'vue'

function tryOnCleanup(fn: () => void): boolean
{
  if (getCurrentScope())
  {
    onScopeDispose(fn)
    return true
  }
  return false
}

export function useInterval(fn: () => void, ms: number)
{
  const timer = setInterval(fn, ms)
  tryOnCleanup(() => clearInterval(timer))
}
```

### ref 选择

| 用 `shallowRef` | 用 `ref` |
|:---|:---|
| 原始值、对象整体替换（`obj.value = newObj`） | 需要深度修改嵌套属性 |

### 命名规范

| 前缀 | 用途 | 示例 |
|------|------|------|
| `use` | 标准 composable | `useMouse`、`useFetch` |
| `create` | 工厂函数 | `createSharedState` |
| `on` | 事件监听 | `onClickOutside` |
| `try` | 安全操作（可在组件外调用） | `tryOnMounted` |

---

## 六、Pinia

```typescript
// features/user/stores/useUserStore.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', () =>
{
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)

  const isLoggedIn = computed(() => token.value !== null)

  async function login(credentials: Credentials)
  {
    const res = await authApi.login(credentials)
    user.value = res.user
    token.value = res.token
  }

  function logout()
  {
    user.value = null
    token.value = null
  }

  return {
    user: readonly(user),
    token: readonly(token),
    isLoggedIn,
    login,
    logout,
  }
})
```

- Vue 3 + TS 优先用 setup store（函数式）
- Store 只管状态、getter、action——复杂业务规则进独立纯函数或 business-utils/
- 异步请求封装在 action 中，不散落在组件生命周期
- 单 store >200 行必须拆分

---

## 七、样式

- SCSS，属性排序由 `stylelint-order` 管理（Concentric）
- 类名 BEM：`block__element--modifier`
- 设计 token 用 CSS 变量，不硬编码色值
- 组件样式 `scoped`

```vue
<style lang="scss" scoped>
.counter {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);

  &__value {
    font-size: var(--font-size-lg);
    color: var(--color-text);
  }

  &__btn {
    padding: var(--spacing-xs) var(--spacing-sm);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-sm);
    background: var(--color-primary);
    color: var(--color-text-inverse);
    cursor: pointer;
  }
}
</style>
```

---

## 八、Error Boundary

```vue
<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

const error = ref<Error | null>(null)

onErrorCaptured((err) =>
{
  error.value = err
  return false
})
</script>

<template>
  <div v-if="error" class="error-boundary">
    <p>{{ t('common.error.pageLoadFailed') }}：{{ error.message }}</p>
    <button @click="error = null">{{ t('common.retry') }}</button>
  </div>
  <slot v-else />
</template>
```

---

## 九、组件四态

每个数据驱动组件覆盖四态（详见 `references/ui-states.md`）：

```vue
<template>
  <Skeleton v-if="loading" />
  <ErrorPage v-else-if="error" :message="error.message" @retry="refetch" />
  <Empty v-else-if="!items.length" :title="t('task.empty')" :hint="t('task.emptyHint')" />
  <List v-else :items="items" />
</template>
```

---

## 十、可访问性与性能

详见 `references/accessibility.md` 和 `references/performance.md`。Vue 侧要点：

- 语义标签：`<button>`、`<form>`，图标按钮加 `aria-label`
- 键盘：`@keydown.esc` 关闭弹窗
- 路由懒加载：`defineAsyncComponent(() => import('./pages/OrderPage.vue'))`
- 长列表 >100 条：`vue-virtual-scroller`
- 频繁切用 `v-show`，不频繁用 `v-if`

---

## 十一、国际化

所有用户可见文本用 `t()` 引用：

```vue
<template>
  <Button>{{ t('common.submit') }}</Button>
  <Empty :title="t('task.empty')" :hint="t('task.emptyHint')" />
</template>
```

---

## 十二、测试

Vitest + @vue/test-utils：

```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import UserCard from './UserCard.vue'

describe('UserCard', () =>
{
  it('should render user name', () =>
  {
    const wrapper = mount(UserCard, {
      props: { user: createMockUser({ name: 'Alice' }) },
    })
    expect(wrapper.text()).toContain('Alice')
  })

  it('should emit select when clicked', async () =>
  {
    const wrapper = mount(UserCard, {
      props: { user: createMockUser({ id: '1' }) },
    })
    await wrapper.trigger('click')
    expect(wrapper.emitted('select')).toEqual([['1']])
  })
})
```

---

## 输出前自检

- [ ] 组件 multi-word PascalCase？文件夹为单位有 index 出口？
- [ ] `<script setup>` 优先？Props / Emits 类型显式声明？
- [ ] v-for 有 `:key`（业务 ID 非 index）？无 v-if 与 v-for 同元素？
- [ ] `computed` 纯，`watch` 克制？副作用有说明？
- [ ] 样式 `scoped` + BEM？颜色用 CSS 变量？
- [ ] Composable 一个文件一个？输入用 MaybeRefOrGetter？有 cleanup？
- [ ] 文案 `t()` 引用，无硬编码字符串？
- [ ] 每个数据组件覆盖 loading / empty / error / success？
- [ ] 关键区域有 Error Boundary？
- [ ] Store >200 行已拆分？业务规则在纯函数不在 store？
- [ ] 语义 HTML（button 而非 div @click）？图标按钮有 aria-label？
