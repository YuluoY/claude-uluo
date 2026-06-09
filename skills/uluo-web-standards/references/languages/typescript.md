# TypeScript 编码规范

**加载条件：** 当前项目使用 TypeScript 时加载。**必须先加载 `javascript.md`，本文件只列出 TS 独有规则。**

> 参考：[Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)、[Basarat TypeScript Style Guide](https://basarat.gitbook.io/typescript/styleguide)
> 格式由 `validate-rules.js` 检查。类型安全由 `eslint` 的 `typescript-eslint` 插件处理。

## 目录

- [tsconfig：strict 只是起点](#tsconfig-strict)
- [禁令清单](#prohibited-list)
  - [any — 零容忍](#any-zero-tolerance)
  - [{} — 不表示空对象](#empty-object-type)
  - [包装类型 — 禁止](#wrapper-types)
  - [Function — 禁止](#function-type)
  - [@ts-ignore / @ts-nocheck — 禁止](#ts-ignore-ts-nocheck)
  - [enum — 禁止](#enum-prohibited)
- [null vs undefined](#null-vs-undefined)
  - [Type alias 不加可空标记](#type-alias-no-nullable)
- [类型注解](#type-annotations)
- [interface vs type](#interface-vs-type)
- [import type](#import-type)
- [泛型](#generics)
  - [命名](#naming)
  - [约束](#constraints)
  - [返还类型泛型 — 避免](#return-type-generics)
- [Utility Types](#utility-types)
- [Discriminated Union](#discriminated-union)
- [Exhaustiveness Check](#exhaustiveness-check)
- [as const — 替代 enum](#as-const)
- [类型工具速查](#type-tools-cheatsheet)
- [类型文件组织](#type-file-organization)
- [命名规范](#naming-conventions)
- [SDK 方法签名](#sdk-method-signatures)
- [输出前自检](#output-checklist)

---

## tsconfig：strict 只是起点

`"strict": true` 只启用 8 项检查。生产项目追加：

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

| 选项 | 为什么加 |
|------|---------|
| `noUncheckedIndexedAccess` | `arr[5]` 返回 `T \| undefined`，强制判空。**strict 之外最值的一行** |
| `exactOptionalPropertyTypes` | `prop?: string` ≠ `prop: string \| undefined`，不混用 |
| `noImplicitOverride` | 重写父类方法必须显式 `override`，重构时不漏 |

---

## 禁令清单

### `any` — 零容忍

eslint `@typescript-eslint/no-explicit-any` 已阻断。

```typescript
// ❌
function parse(data: any): any {}

// ✅ 泛型约束
function parse<T>(data: string): T
{
  return JSON.parse(data) as T
}
```

### `{}` — 不表示空对象

eslint `@typescript-eslint/no-empty-object-type` 已阻断。`{}` 在 TS 中表示"任意非 nullish 值"，不是"空对象"。用 `unknown`、`Record<string, T>` 或 `object` 替代。

### 包装类型 — 禁止

eslint `@typescript-eslint/no-wrapper-object-types` 已阻断。不用 `Number`/`String`/`Boolean`/`Object`（大写），只用小写原始类型 `number`/`string`/`boolean`/`object`。

### `Function` — 禁止

eslint `@typescript-eslint/no-unsafe-function-type` 已阻断。`Function` 允许任意入参、返回 `any`。用具体签名 `(x: string) => number`。

### `@ts-ignore` / `@ts-nocheck` — 禁止

不抑制编译器错误。每个错误都是真实问题——修根因，不贴膏药。

### `enum` — 禁止

eslint `no-restricted-syntax` 已阻断。用字符串联合类型或 `as const` 对象：

```typescript
// ❌
enum OrderStatus { Draft, Confirmed, Cancelled }

// ✅ 字符串联合（优先）
type OrderStatus = 'draft' | 'confirmed' | 'cancelled'

// ✅ as const 对象（需要运行时遍历时）
const ORDER_STATUS = {
  draft: 'draft',
  confirmed: 'confirmed',
  cancelled: 'cancelled',
} as const
type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS]
```

---

## `null` vs `undefined`

**优先 `undefined`。** `null` 仅在对接明确语义的外部 API 时使用（如 DOM、Node.js error-first callback）。

```typescript
// ✅ 可选属性 / 参数，而非 |undefined
interface User {
  nickname?: string               // 可省略、可缺失
}

// ✅ 缺省值用 ??，不用 ||
const name = input ?? 'default'   // 只处理 null/undefined
const flag = input || true        // ❌ '' 和 0 也被吞
```

eslint `@typescript-eslint/prefer-nullish-coalescing` 已阻断 `||`。

### Type alias 不加可空标记

可空标在**使用处**，不污染类型定义：

```typescript
// ❌ 可空污染类型
type User = { name: string } | null

// ✅ 使用处标注
function findUser(id: string): User | undefined {}
```

---

## 类型注解

函数参数和返回值**必须显式标注**。局部变量能让 TS 推断时**不标**。

```typescript
function calculateSubtotal(items: readonly OrderItem[]): number
{
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

const user = User.create(id, email)      // 推断
let result: Order | undefined             // 无法推断时标
```

不使用 `React.FC` 包裹组件、不在变量名加匈牙利前缀——**类型系统承担类型，命名承担语义。**

---

## interface vs type

```typescript
// 对象形状 → interface（eslint consistent-type-definitions 已阻断歧义）
interface User {
  id: string
  name: string
}

// 联合/交叉/映射/函数 → type
type Result<T> = { ok: true; data: T } | { ok: false; error: string }
type EventHandler = (e: Event) => void
```

Interface 不加 `I` 前缀。

---

## import type

纯类型导入用 `import type`。eslint `@typescript-eslint/consistent-type-imports` 已覆盖。

```typescript
import type { User } from './user.entity'
import { UserRepository } from './user.repository'
```

---

## 泛型

### 命名

单泛型用 `T`，多泛型依次 `K`/`V`/`R`。语义化时用 `UpperCamelCase`：`TResponse`、`TItem`。

### 约束

有边界就加 `extends`，不裸奔：

```typescript
// ❌ 无约束
function getProperty<T>(obj: T, key: string) { return obj[key] }

// ✅ extends 约束
function getProperty<T extends Record<string, unknown>, K extends keyof T>(obj: T, key: K): T[K]
{
  return obj[key]
}
```

### 返还类型泛型 — 避免

仅在函数定义不写具体返回类型、完全由调用方决定时才用：

```typescript
// ❌ 不必要的泛型
function identity<T>(x: T): T { return x }

// ✅ 泛型有意义——调用方决定返回值结构
function parse<T>(data: string): T { return JSON.parse(data) as T }
```

---

## Utility Types

用标准库，不自己发明：

```typescript
type CreateUserPayload = Omit<User, 'id' | 'createdAt'>
type UpdateUserPayload = Partial<CreateUserPayload>
type UserSummary = Pick<User, 'id' | 'name' | 'avatar'>
type ReadonlyUser = Readonly<User>
```

---

## Discriminated Union

用字面量标签区分状态，替代散落的可选属性：

```typescript
// ❌ 分散可选属性——Loading 时能访问 data？看不出来
type State = { loading: boolean; data?: Data; error?: Error }

// ✅ 一个字面量属性区分所有状态——窄化后 TS 精确知道可用属性
type State =
  | { status: 'loading' }
  | { status: 'success'; data: Data }
  | { status: 'error'; error: Error }
  | { status: 'empty' }
```

你的 `ApiResponse<T>` 就是这种模式（`success: true` / `success: false`）。

---

## Exhaustiveness Check

给 switch 加穷举守卫——新增变体时编译报错，不漏一处：

```typescript
function handleState(state: State): string
{
  switch (state.status)
  {
    case 'loading':
      return '加载中...'
    case 'success':
      return `数据: ${state.data.length} 条`
    case 'error':
      return `失败: ${state.error.message}`
    case 'empty':
      return '暂无数据'
    default:
      // 有新增状态但忘记处理 → 编译报错，不是运行时才发现
      throw state satisfies never
  }
}
```

`throw x satisfies never` 优于 `assertNever(x)`（无需额外函数）。

---

## `as const` — 替代 enum

```typescript
// 比 enum 更灵活——值在编译后就是字符串字面量，无运行时开销
const COLORS = ['red', 'green', 'blue'] as const
type Color = typeof COLORS[number]  // 'red' | 'green' | 'blue'

const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  DELETE: 'DELETE',
} as const
type HttpMethod = typeof HTTP_METHODS[keyof typeof HTTP_METHODS]
```

---

## 类型工具速查

| 场景 | 推荐 | 避免 |
|------|------|------|
| 类型标注 | `string[]` | `Array<string>` |
| 只读数组 | `readonly T[]` | `ReadonlyArray<T>` |
| 类型断言 | `x as T` | `<T>x` |
| 双断言 | 必须经 `unknown` | `x as any as T` |
| 空值 | `undefined` | `null`（无明确语义时） |
| 可选链 | `obj?.prop` | `obj && obj.prop` |
| 空值合并 | `x ?? 'default'` | `x \|\| 'default'` |

---

## 类型文件组织

- 跨领域共享类型 → `types/`（顶层）
- 领域专属类型 → `features/<domain>/types/`
- 组件私有类型 → 组件文件夹内的 `types.ts`

```
types/
  api.types.ts          ← 跨领域 API 响应类型

features/user/types/
  user.types.ts         ← user 领域类型
```

---

## 命名规范

普遍规则见 `references/naming.md`。TS 特有：

| 元素 | 规则 | 示例 |
|------|------|------|
| Interface / Type / Enum | `PascalCase` | `OrderItem`、`OrderStatus` |
| 泛型参数 | 单字母 `T`/`K`/`V`/`R` 或 `T` + 语义 | `T`、`TItem`、`TResponse` |
| 请求体 | `XxxPayload` | `CreateOrderPayload` |
| 响应体 | `XxxResponse` | `OrderListResponse` |
| 查询参数 | `XxxQueryParams` | `OrderQueryParams` |

---

## SDK 方法签名

```typescript
export const orderApi = {
  fetchList: (params: ListOrdersParams) => http.get<PaginatedResponse<Order>>('/api/orders', { params }),
  getById: (id: string) => http.get<Order>(`/api/orders/${id}`),
  create: (payload: CreateOrderPayload) => http.post<Order>('/api/orders', payload),
  update: (id: string, payload: UpdateOrderPayload) => http.put<Order>(`/api/orders/${id}`, payload),
  delete: (id: string) => http.delete(`/api/orders/${id}`),
}
```

---

## 输出前自检

- [ ] `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`？
- [ ] 无 `any` / `{}` / `Function` / 包装类型？（eslint 已阻断）
- [ ] 无 `enum`，用 string union 或 `as const`？（eslint 已阻断）
- [ ] 无 `@ts-ignore`？
- [ ] 函数参数和返回值显式标注？
- [ ] `import type` 用于纯类型导入？
- [ ] 可空标在**使用处**，不污染类型定义？
- [ ] switch 穷举守卫 `satisfies never`？
- [ ] 状态模型用 discriminated union？
- [ ] 跨领域类型在 `types/`，领域类型在 `features/<domain>/types/`？
