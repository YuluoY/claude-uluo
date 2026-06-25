# JavaScript 编码规范

**加载条件：** 当前项目使用 JavaScript 时加载。**TypeScript 项目必须先加载本文件再加载 `typescript.md`。**

> 参考：[Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)、[Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
> 格式由 `validate.js` 检查（包含 eslint/stylelint/tsc + DDD 层边界检查）。语法质量由 `eslint` 统一处理。项目组织遵循 `references/architecture.md`。

## 目录

- [声明](#declarations)
- [字符串](#strings)
- [相等比较](#equality-comparison)
- [空值处理](#nullish-handling)
- [解构](#destructuring)
- [数组](#arrays)
- [对象](#objects)
  - [深拷贝](#deep-copy)
- [函数](#functions)
  - [声明与调用](#declaration-and-invocation)
  - [高阶函数优先](#higher-order-functions)
  - [纯函数](#pure-functions)
- [模块](#modules)
  - [禁止](#prohibited)
- [类](#classes)
- [错误处理](#error-handling)
- [switch](#switch)
- [工具函数组织：两池 + 原子化](#utility-function-organization)
  - [纯函数池 utils/](#pure-function-pool-utils)
  - [业务工具池 business-utils/](#business-utility-pool-business-utils)
  - [原子化与组合](#atomic-and-composition)
- [命名规范](#naming-conventions)
- [公共 API 文档](#public-api-documentation)
- [测试](#testing)
- [输出前自检](#output-checklist)

---

## 声明

```javascript
// const 声明不变绑定，let 声明可变绑定
const MAX_RETRIES = 3
let currentRetry = 0

// 禁止 var（eslint no-var 已阻断）
// 禁止 let a = 1, b = 2 — 一个变量一个声明
```

eslint `no-var`、`no-default-export` 已覆盖。

---

## 字符串

模板字面量拼接变量，不用 `+` 拼接：

```javascript
// ❌
const msg = 'Hello, ' + name + '!'

// ✅
const msg = `Hello, ${name}!`
```

多行字符串用模板字面量，不用 `\n` 或行续符 `\`。

---

## 相等比较

```javascript
// === 和 !== 始终使用（eslint eqeqeq 已阻断）
if (value === expected) {}

// 唯一例外：== null 同时捕获 null 和 undefined
if (value == null) {}   // 等价于 value === null || value === undefined
```

---

## 空值处理

eslint `prefer-nullish-coalescing` 已强制 `??`，`prefer-optional-chain` 已强制 `?.`：

```javascript
// ❌ || 吞掉 ''、0、false
const count = input || 0
const city = user && user.profile && user.profile.city

// ✅ ?? 只处理 null/undefined
const count = input ?? 0

// ✅ ?. 链式安全访问
const city = user?.profile?.city ?? '未知'

// ✅ 组合使用
const title = post?.meta?.title ?? '无标题'
```

---

## 解构

```javascript
// 对象解构
const { name, email } = user

// 带默认值
const { verified = false } = user

// 重命名
const { title: blogTitle } = post

// 函数参数解构 + 默认值
function renderUser({ name, email, verified = false })
{
  // ...
}

// 数组解构
const [first, second, ...rest] = items
```

---

## 数组

```javascript
// 字面量创建
const items = []
const three = [1, 2, 3]

// 展开运算符复制/合并
const copy = [...arr]
const merged = [...a, ...b]

// 新增/删除/更新——不可变（见 coding-paradigms.md §Immutable Update）
const added = [...arr, newItem]
const removed = arr.filter(i => i.id !== targetId)
const updated = arr.map(i => i.id === targetId ? { ...i, ...patch } : i)

// at() 取首尾元素
const last = arr.at(-1)          // 比 arr[arr.length - 1] 清晰
const first = arr.at(0)

// for...of 遍历值，for...in 只用于普通对象且必须加 hasOwnProperty
for (const item of items) {}
for (const key in obj)
{
  if (Object.hasOwn(obj, key))
  {}
}
```

---

## 对象

```javascript
// 字面量创建
const obj = {}

// 属性简写
const name = 'Alice'
const user = { name, age: 30 }          // name 简写

// 方法简写
const service = {
  fetch(id)
  {
    return http.get(`/api/${id}`)
  },
}

// 计算属性名
const KEY = 'status'
const entry = { [KEY]: 'active' }
```

### 深拷贝

```javascript
// ✅ structuredClone —— 标准 API，处理循环引用、Date、Map、Set、ArrayBuffer
const copy = structuredClone(obj)

// ⚠️ structuredClone 不能拷贝：
//   - 函数、Symbol、DOM 节点、Error（丢 stack）
//   - WeakMap / WeakSet
//   - 原型链（拷贝后变成普通对象）
//   这些场景用展开或 Immer 逐层处理。

// ❌ JSON.parse(JSON.stringify(obj)) — 丢 Date、undefined、函数、循环引用报错
```

---

## 函数

### 声明与调用

```javascript
// 箭头函数用于回调
items.map(item => transform(item))

// function 声明用于具名函数（见 react.md/vue.md 各框架规则）
export function calculateTotal(items, discountRate)
{
  // ...
}

// 默认参数，不用函数体内 || 判断
function fetch(url, { method = 'GET', retries = 3 } = {})
{
  // ...
}
```

### 高阶函数优先

```javascript
// ✅ map/filter/reduce
const names = users.map(u => u.name)
const active = users.filter(u => u.isActive)
const total = items.reduce((sum, i) => sum + i.price, 0)

// ❌ for 循环（除非 >10000 条且有性能硬证据）
```

### 纯函数

无副作用、确定性输出、不 import 业务模块：

```javascript
export function clamp(value, min, max)
{
  if (value < min)
    return min
  if (value > max)
    return max
  return value
}
```

---

## 模块

```javascript
// ES Module
import { formatPrice } from '@/utils/formatPrice.js'
import { calcDiscount } from '@/business-utils/calcDiscount.js'

// 文件扩展名显式写出（eslint import/no-cycle 阻断循环依赖）

export function calcFinalPrice(price, vipLevel)
{
  return formatPrice(calcDiscount(price, vipLevel))
}
```

### 禁止

```javascript
// ❌ default export（eslint import/no-default-export 已阻断）
export default function foo() {}

// ❌ require()
import x = require('x')

// ❌ 任何情况不能用 with / eval / Function() 构造器
```

---

## 类

```javascript
// 只用 class 承载实例化对象，不用容器类做命名空间
export class EventEmitter
{
  #listeners = []    // 私有字段

  on(handler)
  {
    this.#listeners.push(handler)
  }

  emit(event)
  {
    for (const listener of this.#listeners)
      listener(event)
  }
}
```

- 不用 getter/setter（除非框架或外部 API 兼容要求）
- `readonly` 标记构造后不再变的字段
- 实例字段在 constructor 中全部初始化完毕

---

## 错误处理

```javascript
// ✅ 只抛 Error 实例
throw new Error('Invalid input')
throw new TypeError('Expected string')

// ❌ 不抛裸字符串或裸值
throw 'Invalid input'       // 无 stack trace
throw 404                   // 无语义
```

异步操作使用 `to()` 元组（见 `coding-paradigms.md` §await-to-js）：

```javascript
const [err, data] = await to(fetchUser(id))
if (err)
  return handleError(err)
```

空 catch 必须有注释说明原因（eslint `no-empty` 已阻断）。

---

## switch

```javascript
switch (value)
{
  case 'a':
    handleA()
    break
  case 'b':
    handleB()
    break
  default:
    // 即使不需要行动也必须存在
    break
}
```

- 每个 case 以 `break` / `return` / `throw` 结尾
- 有意 fall-through 加注释 `// falls through`
- `default` 必须存在且必须最后

---

## 工具函数组织：两池 + 原子化

### 纯函数池 `utils/`

脱离项目可复用的通用计算。一个文件一个函数：

```
utils/
  clamp.js              ← export function clamp(value, min, max)
  debounce.js
  deepClone.js
  index.js              ← export { clamp } from './clamp.js' ...
```

- 无副作用，确定性输出
- 不 import 业务模块或 features/
- 通过组合实现更强功能

### 业务工具池 `business-utils/`

有业务属性但跨领域复用。一个文件一个函数：

```
business-utils/
  formatOrderStatus.js  ← export function formatOrderStatus(status)
  calcShippingFee.js
  index.js
```

- 可 import utils/ 和 types/
- 不 import features/ 内部
- 提入条件：同一个函数在 ≥2 个 feature 中被用到

### 原子化与组合

每个文件只导出一个函数，更强功能通过组合实现：

```javascript
import { formatPrice } from '@/utils/formatPrice.js'
import { calcDiscount } from '@/business-utils/calcDiscount.js'

export function calcFinalPrice(price, vipLevel)
{
  return formatPrice(calcDiscount(price, vipLevel))
}
```

---

## 命名规范

普遍规则见 `references/naming.md`。JS 特有：

| 元素 | 规则 | 示例 |
|------|------|------|
| 变量 | `camelCase` | `userName`、`orderList` |
| 常量 | `UPPER_SNAKE_CASE` | `MAX_RETRIES`、`API_BASE_URL` |
| 函数 | 动词开头 `camelCase` | `fetchOrders`、`handleClick` |
| 异步函数 | 不加 `Async` 后缀 | `fetchUser` 而非 `fetchUserAsync` |
| 类 | `PascalCase` | `EventEmitter` |
| 文件（工具/hook） | `camelCase` | `formatDate.js`、`usePagination.js` |
| 文件（组件） | `PascalCase` | `UserCard.vue`、`OrderList.tsx` |
| 文件夹 | `kebab-case` | `user-profile/`、`business-utils/` |

---

## 公共 API 文档

导出函数、类、常量必须有 JSDoc：

```javascript
/**
 * 计算订单总金额（含折扣和运费）。
 * @param {OrderItem[]} items
 * @param {number} discountRate - 折扣率 (0–1)
 * @returns {{ total: number, subtotal: number }}
 */
export function calculateTotal(items, discountRate)
{
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const total = subtotal * (1 - discountRate)
  return {
    total,
    subtotal
  }
}
```

---

## 测试

Vitest 或 Jest。`__tests__/` 目录与被测代码同模块。Mock 数据工厂化（`createMockTask(overrides)`）：

```javascript
import { describe, it, expect } from 'vitest'

describe('calculateTotal', () =>
{
  it('should sum item prices', () =>
  {
    const items = [{ price: 10, quantity: 2 }, { price: 5, quantity: 3 }]
    const result = calculateTotal(items, 0)
    expect(result.subtotal).toBe(35)
  })
})
```

---

## 输出前自检

- [ ] `const`/`let` 而非 `var`？（eslint 已阻断）
- [ ] `===` 而非 `==`（`== null` 例外）？（eslint 已阻断）
- [ ] `?.` + `??` 处理空值？（eslint `prefer-optional-chain` / `prefer-nullish-coalescing` 已阻断）
- [ ] named export 而非 default？（eslint 已阻断）
- [ ] 无 `console.log`？（eslint 已阻断）
- [ ] 无 `with` / `eval` / `Function()` 构造器？
- [ ] `throw new Error()`，不抛裸值？
- [ ] switch 有 `default`？
- [ ] 纯函数在 utils/，业务工具在 business-utils/？
- [ ] 一个文件一个函数？
- [ ] 公共 API 有 JSDoc？
- [ ] 异步操作使用 `to()` 元组？
