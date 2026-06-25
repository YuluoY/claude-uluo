# React 编码风格

**加载条件：** 当前任务涉及 React、React Hooks、JSX、Next.js、Vite React、状态管理（Zustand/Jotai/Redux）、组件拆分或前端状态管理时加载。若项目已有更具体的 React 规范，以项目规范为准；本文件作为质量底线补充。

> 参考：[Airbnb React Style Guide](https://github.com/airbnb/javascript/tree/master/react)、[React Docs: Thinking in React](https://react.dev/learn/thinking-in-react)
> 格式由 `validate-rules.js` 检查。React 专项 lint 由 `eslint-plugin-react` + `eslint-plugin-react-hooks` 处理（见 `assets/eslint.config.mjs`）。
> 项目组织、组件四态、可访问性、性能分别见 `references/architecture.md`、`references/ui-states.md`、`references/accessibility.md`、`references/performance.md`。

## 目录

- [一、组件架构](#component-architecture)
  - [组件即文件夹](#component-as-folder)
  - [组件分层](#component-layering)
- [二、命名规范](#naming-conventions)
- [三、函数组件](#function-components)
- [四、Props](#props)
- [五、Hooks 使用约束](#hooks-usage-constraints)
  - [useState](#usestate)
  - [useEffect](#useeffect)
  - [useReducer — 复杂状态逻辑](#usereducer)
  - [useRef](#useref)
  - [useMemo / useCallback — 克制使用](#usememo-usecallback)
- [六、React 18+ 并发特性](#react-18-concurrent-features)
- [七、自定义 Hook](#custom-hooks)
- [八、组件模式](#component-patterns)
  - [Container / Presentational](#container-presentational)
  - [Compound Components](#compound-components)
  - [Controlled Components](#controlled-components)
- [九、服务端状态（React Query）](#server-state-react-query)
- [十、客户端状态管理](#client-state-management)
- [十一、样式](#styles)
- [十二、Error Boundary + 组件四态](#error-boundary-component-states)
- [十三、可访问性](#accessibility)
- [十四、性能](#performance)
- [十五、国际化](#internationalization)
- [十六、测试](#testing)
- [输出前自检](#output-checklist)

---

## 一、组件架构

### 组件即文件夹

```
# 通用组件（纯 UI）
components/
  Button/
    index.ts          ← export { Button } from './Button.tsx'
    Button.tsx
    Button.test.tsx

# 业务组件（领域内）
features/user/components/
  UserCard/
    index.ts          ← export { UserCard } from './UserCard.tsx'
    UserCard.tsx
    UserCard.test.tsx
    types.ts          ← 本组件私有 Props 类型
```

通用组件 vs 业务组件的归属判断见 `references/architecture.md`。

### 组件分层

| 角色 | 位置 | 约束 |
|------|------|------|
| 通用 UI | `components/` | 无业务知识，换个项目直接能用 |
| 业务组件 | `features/<domain>/components/` | 含领域知识，仅在领域内复用 |
| 页面 | `pages/` 或 App Router 目录 | 编排业务组件，连接路由和数据 |

---

## 二、命名规范

普遍规则见 `references/naming.md`。React 特有：

| 元素 | 规则 | 示例 |
|------|------|------|
| 组件 | `PascalCase` 多词 | `UserList`、`OrderDetail` |
| Hook | `use` 前缀 `camelCase` | `useUserSearch`、`useDebounce` |
| Store | `useXxxStore` | `useOrderStore`、`useAuthStore` |
| 事件 handler | `handle` 前缀 | `handleClick`、`handleSubmit` |
| 回调 Props | `on` 前缀 | `onSelect`、`onClose` |
| Props interface | `XxxProps` | `UserListProps`、`ButtonProps` |

---

## 三、函数组件

```tsx
// ✅ function 关键字声明
// ✅ Props 用 interface，不用 React.FC
// ✅ 解构参数

interface UserListProps {
  users: User[]
  onSelect: (userId: string) => void
  loading?: boolean
}

export function UserList({ users, onSelect, loading = false }: UserListProps)
{
  const handleClick = (e: React.MouseEvent<HTMLUListElement>) =>
  {
    const li = (e.target as HTMLElement).closest('[data-user-id]')
    if (li instanceof HTMLElement && li.dataset.userId)
      onSelect(li.dataset.userId)
  }

  if (loading)
    return <UserListSkeleton />

  if (users.length === 0)
    return <Empty title={t('user.empty')} hint={t('user.emptyHint')} />

  return (
    <ul onClick={handleClick}>
      {users.map(user => (
        <li key={user.id} data-user-id={user.id}>
          {user.name}
        </li>
      ))}
    </ul>
  )
}
```

- 不用 Class Component（Error Boundary 除外——React 尚无函数式替代）
- 不在 render 中定义子组件（每次 render 重新创建，丢失状态）
- `StrictMode` 包裹应用根节点（开发时双调 effect 检测副作用）

---

## 四、Props

```typescript
// ✅ interface 定义
interface ButtonProps {
  label: string
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  onClick?: () => void
}

export function Button({ label, variant = 'primary', disabled = false, onClick }: ButtonProps)
{
  return (
    <button
      className={`btn btn--${variant}`}
      disabled={disabled}
      onClick={onClick}
      aria-disabled={disabled}
    >
      {label}
    </button>
  )
}
```

- Props 用 `interface`，不用 `type`（与基础规范一致）
- 不加 `I` 前缀
- 不用 `React.FC`——直接标注参数
- 可选 Props 标注 `?` 并提供有意义的默认值

---

## 五、Hooks 使用约束

### useState

```typescript
// 状态切片要细，不用一个大对象装所有
const [name, setName] = useState('')
const [email, setEmail] = useState('')

// 初始化开销大时用惰性初始化
const [items, setItems] = useState(() => loadFromCache())

// 更新依赖前值用函数式更新
setCount(c => c + 1)
```

### useEffect

```typescript
// 依赖数组必须完整，不抑制 eslint
// 异步操作必须 cleanup
useEffect(() =>
{
  const controller = new AbortController()

  async function fetchData()
  {
    const result = await api.getUsers({ signal: controller.signal })
    setUsers(result)
  }
  fetchData()

  return () =>
  {
    controller.abort()
  }
}, [])
```

### useReducer — 复杂状态逻辑

多个 `useState` 相互依赖时，用 `useReducer` 集中：

```typescript
type Action =
  | { type: 'start_loading' }
  | { type: 'success'; data: User[] }
  | { type: 'error'; error: Error }

function userReducer(state: State, action: Action): State
{
  switch (action.type)
  {
    case 'start_loading':
      return { status: 'loading' }
    case 'success':
      return { status: 'success', data: action.data }
    case 'error':
      return { status: 'error', error: action.error }
    default:
      return action satisfies never
  }
}
```

### useRef

```typescript
// DOM 引用
const inputRef = useRef<HTMLInputElement>(null)

// 可变值（不触发重渲染）
const prevValue = useRef<string>()
```

### useMemo / useCallback — 克制使用

只在三种场景用，不全局包裹：
1. 传递给 `React.memo` 子组件的引用需稳定
2. 计算开销大（循环 >1000 次、递归、大对象转换）
3. 作为其他 Hook 的依赖

```typescript
// ✅ 有理由地用
const sorted = useMemo(() => items.toSorted(comparator), [items, comparator])
const handleSubmit = useCallback((data: FormData) => submit(data), [submit])
```

---

## 六、React 18+ 并发特性

```typescript
// useTransition — 低优先级更新，保持界面响应
const [isPending, startTransition] = useTransition()

function handleSearch(input: string)
{
  startTransition(() =>
  {
    setSearchResults(filter(input))
  })
}

// useDeferredValue — 延迟计算旧值，避免阻塞
const deferredQuery = useDeferredValue(query)
const suggestions = useMemo(() => search(deferredQuery), [deferredQuery])
```

`<Suspense>` 包裹异步加载区域，配合 `React.lazy` 做代码分割（见 `references/performance.md`）。

---

## 七、自定义 Hook

```typescript
// 一个文件一个 Hook，职责单一
export function useDebouncedValue<T>(value: T, delay: number): T
{
  const [debounced, setDebounced] = useState(value)

  useEffect(() =>
  {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
```

文件组织：

```
# 通用 hooks
hooks/
  useDebounce.ts
  usePagination.ts
  index.ts

# 领域 hooks
features/user/hooks/
  useUserSearch.ts
  index.ts
```

---

## 八、组件模式

### Container / Presentational

业务逻辑在 Container，UI 在 Presentational：

```typescript
// Container — 负责数据、副作用、回调
export function UserListContainer()
{
  const [users, status, error] = useUsers()

  if (status === 'loading')
    return <UserListSkeleton />
  if (status === 'error')
    return <ErrorPage error={error} onRetry={refetch} />

  return <UserList users={users} onSelect={handleSelect} />
}

// Presentational — 纯 UI，无副作用
export function UserList({ users, onSelect }: UserListProps)
{
  return (
    <ul>
      {users.map(user => <li key={user.id} onClick={() => onSelect(user.id)}>{user.name}</li>)}
    </ul>
  )
}
```

### Compound Components

构建 Tabs、Select、Modal 等组合式 API：

```tsx
<Tabs defaultTab="info">
  <Tabs.List>
    <Tabs.Tab value="info">{t('tabs.info')}</Tabs.Tab>
    <Tabs.Tab value="settings">{t('tabs.settings')}</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="info"><UserInfo /></Tabs.Panel>
  <Tabs.Panel value="settings"><UserSettings /></Tabs.Panel>
</Tabs>
```

### Controlled Components

表单组件单一数据源，状态在父组件：

```tsx
<Input value={name} onChange={setName} />
<Select value={city} onChange={setCity} options={cities} />
```

---

## 九、服务端状态（React Query）

API 数据用 [TanStack Query](https://tanstack.com/query)，不手写 fetch + useState + useEffect：

```typescript
function useUsers()
{
  return useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.fetchList(),
    staleTime: 5 * 60 * 1000,
  })
}

function UserList()
{
  const { data, isLoading, isError, error, refetch } = useUsers()

  if (isLoading)
    return <UserListSkeleton />
  if (isError)
    return <ErrorPage error={error} onRetry={refetch} />

  return <List items={data} />
}
```

- Query Key 结构：`['resource', id?, filters?]`
- 默认 `staleTime` 项目级配置
- Mutation 配合 `onMutate` / `onError` 实现乐观更新

---

## 十、客户端状态管理

适用 Zustand / Jotai / Redux Toolkit。按复杂度选：

| 场景 | 方案 |
|------|------|
| 组件内状态 | `useState` |
| 跨组件小范围共享 | Context |
| 多组件复杂交互 | `useReducer` |
| 全局状态 | Zustand / Jotai |

```typescript
// Zustand example
import { create } from 'zustand'

interface AuthState {
  user: User | null
  login: (credentials: Credentials) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>(set => ({
  user: null,
  login: async (credentials) =>
  {
    const user = await authApi.login(credentials)
    set({ user })
  },
  logout: () => set({ user: null }),
}))
```

- Store 只管状态、派生值和 action，复杂业务规则进独立的纯函数或 business-utils/
- 单 store >200 行必须拆分
- 异步请求封装在 action 或 Hook 中，不散落在组件生命周期

---

## 十一、样式

- SCSS Modules（`.module.scss`）或 SCSS + BEM
- 设计 token 全部引用 CSS 变量，不硬编码色值
- `stylelint` 管属性排序和 BEM 命名（见 `assets/stylelint.config.mjs`）

```scss
.user-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);

  &__item {
    padding: var(--spacing-sm) var(--spacing-md);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    color: var(--color-text);
  }

  &--loading {
    opacity: 0.6;
    pointer-events: none;
  }
}
```

---

## 十二、Error Boundary + 组件四态

Error Boundary 是 React 唯一仍需 Class Component 的场景（尚无函数式替代）：

```tsx
import { Component, type ReactNode } from 'react'

interface Props {
  fallback: ReactNode
  children: ReactNode
}
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State>
{
  state: State = {
    error: null
  }

  static getDerivedStateFromError(error: Error)
  {
    return {
      error
    }
  }

  render()
  {
    if (this.state.error)
    {
      return this.props.fallback || (
        <div>{t('common.error.pageLoadFailed')}：{this.state.error.message}</div>
      )
    }
    return this.props.children
  }
}
```

```tsx
// 使用
<ErrorBoundary fallback={<PageError />}>
  <OrderDetail />
</ErrorBoundary>
```

每个数据驱动组件覆盖四态（详见 `references/ui-states.md`）：

```
loading → <Skeleton />
empty   → <Empty title={t('empty.title')} hint={t('empty.hint')} />
error   → <ErrorPage error={error} onRetry={refetch} />
success → <Content />
```

---

## 十三、可访问性

详见 `references/accessibility.md`。React 侧：

```tsx
// 语义标签
<button onClick={handleClose} aria-label={t('common.close')}>
  <XIcon aria-hidden="true" />
</button>

// 图片 alt 来自 i18n
<img src="chart.png" alt={t('chart.salesDesc')} />

// 键盘：Enter/Esc
function handleKeyDown(e: React.KeyboardEvent)
{
  if (e.key === 'Escape')
    onClose()
}
```

---

## 十四、性能

详见 `references/performance.md`。React 侧：

```tsx
// 路由级别代码分割
const OrderPage = lazy(() => import('./pages/OrderPage'))

<Suspense fallback={<PageSkeleton />}>
  <OrderPage />
</Suspense>
```

- `React.memo`：纯展示组件经常同 prop 重渲染时包裹
- 列表 >100 条用 `react-window` 虚拟滚动
- 不在 render 中创建不稳定引用（inline 对象/数组/函数）

---

## 十五、国际化

所有用户可见文本用 `t()` 引用：

```tsx
<Button>{t('common.submit')}</Button>
<Empty title={t('task.empty')} hint={t('task.emptyHint')} />
<img alt={t('product.imageAlt')} />
```

---

## 十六、测试

React Testing Library + Vitest：

```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UserList } from './UserList'

describe('UserList', () =>
{
  it('should render user names', () =>
  {
    const users = [createMockUser({ name: 'Alice' }), createMockUser({ name: 'Bob' })]
    render(<UserList users={users} onSelect={vi.fn()} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('should call onSelect when user clicked', async () =>
  {
    const onSelect = vi.fn()
    const users = [createMockUser({ id: '1' })]
    render(<UserList users={users} onSelect={onSelect} />)
    await userEvent.click(screen.getByText(users[0].name))
    expect(onSelect).toHaveBeenCalledWith('1')
  })
})
```

- 行为测试优先：测用户看到什么、做了什么，不测实现细节
- mock 数据工厂化：`createMockUser(overrides)`
- 测试 loading / empty / error / success 四态

---

## 输出前自检

- [ ] 组件以文件夹为单位？有 index 出口？
- [ ] 函数组件，不用 Class（ErrorBoundary 除外）？
- [ ] Props 有 `interface` 类型定义？不用 `React.FC`？
- [ ] 列表 key 用稳定业务 ID，非 index？（eslint `react/jsx-key` 已覆盖）
- [ ] JSX 子元素缩进 2 空格？（eslint `react/jsx-indent` 已覆盖）
- [ ] useEffect 依赖完整？有 cleanup？（eslint `react-hooks/exhaustive-deps` 已覆盖）
- [ ] useMemo/useCallback 只用于必要场景？
- [ ] 每个数据组件覆盖 loading / empty / error / success？
- [ ] 关键区域包裹 Error Boundary？
- [ ] 文案用 `t()` 引用，无硬编码字符串？颜色用 CSS 变量？
- [ ] 自定义 Hook 一个文件一个？职责单一？
- [ ] 语义 HTML（button 而非 div onclick）？图标按钮有 aria-label？
