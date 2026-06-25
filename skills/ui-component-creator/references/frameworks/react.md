# React 组件创建领域知识

选定 React 时加载。覆盖函数组件、Hooks、Props/Children、Context。

---

## 函数组件结构

```typescript
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import type { ReactNode, ChangeEvent } from 'react'

// 1. 类型定义（Props 在最前）
interface ItemListProps {
  items: Item[]
  pageSize?: number
  loading?: boolean
  onSelect?: (item: Item) => void
  children?: ReactNode
}

// 2. 组件定义
export function ItemList({
  items,
  pageSize = 10,           // 默认值直接在参数解构中
  loading = false,
  onSelect,
  children,
}: ItemListProps) {
  // 3. 状态
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  // 4. 派生状态（用 useMemo，不存 state）
  const totalPages = useMemo(
    () => Math.ceil(items.length / pageSize),
    [items.length, pageSize],
  )

  // 5. 回调（用 useCallback 避免不必要 re-render）
  const handleSelect = useCallback(
    (item: Item) => {
      setSelectedId(item.id)
      onSelect?.(item)
    },
    [onSelect],
  )

  // 6. 副作用
  useEffect(() => {
    // items 变化时重置选中
    setSelectedId(null)
  }, [items])

  // 7. 渲染
  if (loading) return <ItemListSkeleton />
  if (items.length === 0) return <EmptyState />

  return (
    <div className="item-list">
      {children}
      <ul>
        {items.map(item => (
          <li
            key={item.id}
            onClick={() => handleSelect(item)}
            data-testid={`item-${item.id}`}
          >
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## Props 设计

### 基本类型

```typescript
interface Props {
  // 基本类型
  title: string
  count?: number                    // 可选
  size?: 'sm' | 'md' | 'lg'        // 联合类型做枚举
  disabled?: boolean

  // 数组/对象
  items: Item[]
  config?: Partial<Config>          // Partial 让所有字段可选

  // 回调
  onSelect?: (item: Item) => void
  onChange?: (value: string) => void

  // 渲染
  children?: ReactNode
  renderHeader?: () => ReactNode     // render prop 模式
}
```

### 受控 vs 非受控

```typescript
interface InputProps {
  // 受控
  value?: string
  onChange?: (value: string) => void
  // 非受控
  defaultValue?: string
}

export function Input({ value, onChange, defaultValue }: InputProps) {
  // 判断是否受控
  const isControlled = value !== undefined

  const [internalValue, setInternalValue] = useState(defaultValue ?? '')
  const currentValue = isControlled ? value : internalValue

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (!isControlled) {
      setInternalValue(newValue)
    }
    onChange?.(newValue)
  }

  return <input value={currentValue} onChange={handleChange} />
}
```

---

## Hooks

抽取逻辑为自定义 Hook，约定 `use` 前缀：

```typescript
// useSelection.ts
import { useState, useCallback } from 'react'

export function useSelection<T extends { id: string }>(items: T[]) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selected = useMemo(
    () => items.find(item => item.id === selectedId),
    [items, selectedId],
  )

  const select = useCallback((item: T) => {
    setSelectedId(item.id)
  }, [])

  const clear = useCallback(() => {
    setSelectedId(null)
  }, [])

  return { selectedId, selected, select, clear }
}
```

**拆分时机：**
- 组件逻辑 > 150 行
- 包含 3 个以上不相关关注点
- 逻辑需要在多个组件间复用

### Hooks 规则

- **只在顶层调用**——不在循环、条件、嵌套函数中调用
- **依赖数组完整**——useEffect/useMemo/useCallback 的依赖必须完整
- **避免在 render 中创建新对象/函数**——会导致子组件不必要 re-render

---

## Context

跨层级传递，适合主题、配置等：

```typescript
import { createContext, useContext } from 'react'

// 1. 创建 Context
interface ComponentContextValue {
  size: 'sm' | 'md' | 'lg'
  disabled: boolean
}
const ComponentContext = createContext<ComponentContextValue | null>(null)

// 2. Provider
function ComponentProvider({ children, size, disabled }: ComponentProviderProps) {
  return (
    <ComponentContext.Provider value={{ size, disabled }}>
      {children}
    </ComponentContext.Provider>
  )
}

// 3. Consumer（封装 useContext，带 null 检查）
function useComponentContext() {
  const ctx = useContext(ComponentContext)
  if (!ctx) {
    throw new Error('useComponentContext must be used within ComponentProvider')
  }
  return ctx
}
```

---

## 渲染优化

```typescript
// React.memo — 浅比较 props，避免不必要 re-render
export const ExpensiveItem = memo(function ExpensiveItem({ item }: { item: Item }) {
  return <div>{item.name}</div>
})

// useMemo — 缓存计算结果
const sortedItems = useMemo(
  () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items],
)

// useCallback — 缓存回调引用
const handleSelect = useCallback((item: Item) => {
  onSelect(item)
}, [onSelect])

// key — 列表必须有稳定 key（不用 index）
{items.map(item => <ListItem key={item.id} item={item} />)}
```

---

## 样式与三层架构

React 组件样式采用三层分离架构——结构层（固定值）、语义层（token 引用）、风格层（预设提供）。

### CSS Modules 示例

```tsx
import styles from './ComponentName.module.css'

export function ComponentName({ items }: Props) {
  return (
    <div className={styles.component}>
      {items.map(item => (
        <div
          key={item.id}
          className={`${styles.item} ${item.selected ? styles.selected : ''}`}
        >
          {item.name}
        </div>
      ))}
    </div>
  )
}
```

```css
/* ComponentName.module.css */
.component {
  /* 结构层：布局、尺寸、定位——与风格无关 */
  display: flex;
  flex-direction: column;
  gap: 8px;

  /* 语义层：引用语义 token */
  padding: var(--spacing-md);
  background: var(--color-surface);
  border-radius: var(--radius-md);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.item {
  padding: var(--spacing-sm);
  color: var(--color-text-secondary);
}

.item:hover {
  background: var(--color-hover);
}

.selected {
  background: var(--color-primary-bg);
  color: var(--color-primary);
}
```

### styled-components 示例（如使用 CSS-in-JS）

```tsx
import styled from 'styled-components'

const Component = styled.div`
  /* 结构层 */
  display: flex;
  flex-direction: column;
  gap: 8px;

  /* 语义层——引用 theme token */
  padding: ${props => props.theme.spacing.md};
  background: ${props => props.theme.color.surface};
  border-radius: ${props => props.theme.radius.md};
  color: ${props => props.theme.color.text};
  border: 1px solid ${props => props.theme.color.border};
`
```

> **注意**：组件代码只引用语义层 token，风格层值由 `references/style-presets/` 预设文件提供。切换风格时只需替换预设，组件代码零改动。

---

## 文件结构

```
ComponentName/
├── README.md                   ← 组件入口文档，AI 快速扫描入口
├── docs/                       ← 设计文档（与代码同目录）
│   ├── research-report.md      ← Phase 1 调研笔记
│   ├── component-spec.md       ← Phase 2 组件设计规格
│   └── verification-report.md  ← Phase 5 验收报告（可选）
├── index.ts                   ← 导出入口
├── ComponentName.tsx          ← 主组件
├── components/                ← 私有子组件
│   └── SubComponent.tsx
├── hooks/                     ← 自定义 Hooks
│   └── useSelection.ts
├── types.ts                   ← 类型定义
├── ComponentName.module.css   ← 样式（如用 CSS Modules）
└── __tests__/
    └── ComponentName.test.tsx
```

---

## 测试

推荐用 `@testing-library/react` + `vitest`：

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { ItemList } from '../ItemList'

describe('ItemList', () => {
  it('renders items', () => {
    render(<ItemList items={[{ id: '1', name: 'Test' }]} />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('calls onSelect on click', () => {
    const onSelect = vi.fn()
    render(<ItemList items={[{ id: '1', name: 'Test' }]} onSelect={onSelect} />)
    fireEvent.click(screen.getByTestId('item-1'))
    expect(onSelect).toHaveBeenCalledWith({ id: '1', name: 'Test' })
  })

  it('shows empty state', () => {
    render(<ItemList items={[]} />)
    expect(screen.getByText(/no data/i)).toBeInTheDocument()
  })
})
```
