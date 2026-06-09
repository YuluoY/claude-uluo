# 编码范式集

具体的、可操作的编码范式——语言无关，写每一行代码时即可应用。

这些范式是 uluo-coding 宏观支柱在微观代码层面的落地手法。

---

## 目录

- [Guard Clause（卫语句）](#guard-clause卫语句)
- [LICM Hoisting（不变量外提）](#licm-hoisting不变量外提)
- [Fail Fast（快速失败）](#fail-fast快速失败)
- [Single Level of Abstraction（单一抽象层级）](#single-level-of-abstraction单一抽象层级)
- [Command-Query Separation（命令查询分离）](#command-query-separation命令查询分离)
- [Tell, Don't Ask（告知而非询问）](#tell-dont-ask告知而非询问)
- [Law of Demeter（最少知识原则）](#law-of-demeter最少知识原则)
- [Avoid Flag Arguments（避免布尔参数）](#avoid-flag-arguments避免布尔参数)
- [Factory Cohesion（工厂聚合）](#factory-cohesion工厂聚合)
- [await-to-js（错误优先元组）](#await-to-js错误优先元组)
- [Immutable Update（不可变更新）](#immutable-update不可变更新)
- [加载规则](#加载规则)

---

## Guard Clause（卫语句）

将异常/边界条件放在函数顶部独立检查，不满足立即 return 或 throw。主逻辑留在函数末尾，不被缩进层层包裹。

**原则：**
- 每个 guard 只检查一个条件，独立成行
- guard 命中后立即退出，不继续执行后续逻辑
- 主逻辑（happy path）是函数体的最后一段代码，处于最外层缩进
- 反对深层嵌套的 `if-else` 箭头——那是在"向右指向痛苦"

**对比：**
```javascript
// ❌ 嵌套 — happy path 被埋在三层缩进里
function getPayment(employee)
{
  if (!employee.isDead)
  {
    if (!employee.isSeparated)
    {
      if (!employee.isRetired)
        return employee.salary + employee.bonus
      else
        return employee.retirementAmount;
    }
    else
      return employee.separationAmount;
  }
  else
    return employee.deathBenefit;
}

// ✅ Guard Clause — 异常先排除，主逻辑平铺
function getPayment(employee)
{
  if (employee.isDead)
    return employee.deathBenefit
  if (employee.isSeparated)
    return employee.separationAmount
  if (employee.isRetired)
    return employee.retirementAmount
  return employee.salary + employee.bonus
}
```

---

## LICM Hoisting（不变量外提）

闭包或循环内部，值不变的常量、配置、映射表提到外面定义。只计算一次，避免每次迭代重复创建和分配内存。

**原则：**
- 闭包体内只保留随迭代变化的核心计算逻辑
- 静态数据（常量、枚举映射、正则）定义在闭包外部
- 不仅关乎性能——更关乎"让闭包体的职责一眼可见"（纯度意识）
- 源自编译器优化技术 Loop-Invariant Code Motion，手写代码同效

**对比：**
```javascript
// ❌ 每次迭代重复定义常量、重复创建对象
items.map((item) =>
{
  const TAX_RATE = 0.13

  const CATEGORY_MAP = { 
    a: '食品', 
    b: '日用品', 
    c: '家电' 
  }

  return { 
    ...item, 
    tax: item.price * TAX_RATE, 
    category: CATEGORY_MAP[item.type] 
  }

})


// ✅ 不变量外提
const TAX_RATE = 0.13

const CATEGORY_MAP = { 
  a: '食品', 
  b: '日用品', 
  c: '家电' 
}

items.map((item) =>
{
  return { 
    ...item, 
    tax: item.price * TAX_RATE, 
    category: CATEGORY_MAP[item.type] 
  }
})

```

---

## Fail Fast（快速失败）

输入不合法、状态不正确时，在函数最开始位置就抛出错误。不要让坏数据流向下游，在远离真正出错点的地方才暴露。

**原则：**
- 函数入口处校验所有必要的前置条件（参数非空、类型正确、范围合理）
- 校验不通过 → 立即 clear 抛出异常或返回错误
- 不推迟校验、不靠"后面某个步骤会自然报错"
- 快速失败 = 错误离根因最近，调试时间最短

**对比：**
```javascript
// ❌ 推迟暴露 — 坏数据一路流到深层逻辑才报错
function processOrder(order)
{
  applyDiscount(order);        // 没校验 order 是否为空
  saveToDatabase(order);       // 空 order 在数据库层才报错，栈深难排查
}

// ✅ Fail Fast — 入口校验，不满足立刻退出
function processOrder(order)
{
  if (!order)
    throw new Error('order is required')

  if (!order.items || order.items.length === 0)
    throw new Error('order has no items')

  applyDiscount(order)
  saveToDatabase(order)
}
```

---

## Single Level of Abstraction（单一抽象层级）

一个函数内部，所有语句处于同一个抽象层级。不把"高层次编排"和"低层次操作细节"混在一起。

**原则：**
- 函数体要么都是"做什么"（编排其他函数），要么都是"怎么做"（本函数的实现细节）
- 一眼扫过去，每一行在同一个概念平面上
- 底层细节提取为私有函数，用函数名表达其意图
- 如果你需要在某一行写注释解释它做了什么→它就是该被提取出去的

**对比：**
```javascript
// ❌ 抽象层级混乱 — 业务编排与字符串操作混杂
function sendWelcomeEmail(user)
{
  const email = user.email.trim().toLowerCase();                 // 低层：字符串操作
  const domain = email.split('@')[1];                            // 低层：字符串解析
  if (domain === 'gmail.com')
  {
    const body = 'Hi ' + user.name + ', welcome!';                // 低层：拼接
    emailService.send({ to: email, body: body });                  // 高层：发送
  }
}

// ✅ 提取低层细节，保持同一抽象层级
function sendWelcomeEmail(user)
{
  const email = normalizeEmail(user.email)

  if (isGmailAddress(email))
    applyGmailSpecialHandling(email)

  emailService.send({ 
    to: email, 
    body: buildWelcomeBody(user.name) 
  })
}
```

---

## Command-Query Separation（命令查询分离）

每个函数要么是命令（执行动作、修改状态、无返回值），要么是查询（返回数据、无副作用）。不能二者兼有。

**原则：**
- 命令：完成副作用，返回 void 或成功/失败状态（不返回业务数据）
- 查询：返回数据，不修改任何状态，调用多少次结果一致
- 致命案例：`getUser()` 的副作用是顺便更新 `lastAccessTime`——名字暗示查询，实际是命令
- CQS 的来源是 Eiffel 语言作者 Bertrand Meyer，是写出可预测代码的基础

**对比：**
```javascript
// ❌ 命令+查询混杂 — 调用方不知道有副作用
function getUser(id)
{
  user.lastAccessedAt = new Date()   // 副作用！
  return userService.findById(id)    // 查询
}

// ✅ 命令与查询分离
function getUser(id)                    // 纯查询，无副作用
{
  return userService.findById(id)
}
function recordAccess(user)            // 纯命令，无返回值
{
  user.lastAccessedAt = new Date()
}
```

---

## Tell, Don't Ask（告知而非询问）

不要向对象索取数据，做完判断后自己行动——而是直接告诉对象去完成。把数据和操作数据的逻辑封装在同一个对象内。

**原则：**
- 反对：从对象取出一堆 getter，在外面做判断和计算
- 主张：把判断逻辑放进对象的方法里，调用方只"告知"对象去做
- 目的：行为靠近数据，避免贫血模型，降低调用方和对象数据的耦合

**对比：**
```javascript
// ❌ Ask — 调用方获取数据，自己做判断
if (order.getStatus() === 'pending' && order.getTotal() > 1000)
  order.setRequiresApproval(true)

// ✅ Tell — 告诉对象去做，判断逻辑在对象内部
order.checkApprovalRequired()

```

---

## Law of Demeter（最少知识原则）

方法只和直接的朋友说话，不穿透朋友去找朋友的朋友。只和"最近"的对象打交道。

**原则：**
- 方法内可访问：自身、方法参数、当前对象自己创建的实例、当前对象的直接成员
- 禁止链式调用横跨多个对象：`a.getB().getC().doSomething()`
- 违反时 → 中间对象暴露了不该暴露的内部结构
- 本质上不是"不要用超过一个点"，而是"不要和陌生对象说话"

**对比：**
```javascript
// ❌ 穿透两个对象取数据
const city = order.getCustomer().getAddress().getCity()


// ✅ 只和直接朋友说话
const city = order.getCustomerCity(); // Customer 内部取 address.city
```

---

## Avoid Flag Arguments（避免布尔参数）

布尔参数意味着函数做了两件事。将 true/false 拆成两个独立函数，每个只做一件事。

**原则：**
- `function render(editable: boolean)` → 拆为 `renderReadOnly()` 和 `renderEditable()`
- 如果布尔参数改变了函数的行为分支 → 那就是两个不同的职责
- 如果是可选配置 → 用 options 对象代替布尔参数
- 和原子化开发一脉相承——一个函数只做一件事

**对比：**
```javascript
// ❌ 布尔参数控制两套逻辑
function render(isEditable)
{
  if (isEditable)
    return '<div contenteditable>' + content + '</div>'
  else
    return '<div>' + content + '</div>'
}

// ✅ 拆成两个函数，调用方意图一目了然
function renderEditable()
{
  return '<div contenteditable>' + content + '</div>'
}
function renderReadOnly()
{
  return '<div>' + content + '</div>'
}
```

**拆开后的问题：** 碎片化的函数丧失了概念完整性。`renderEditable`、`renderReadOnly`、`renderCompact`、`renderFull`——它们本质是同一家族"渲染策略"的不同变体，散落各处让调用方难以发现、难以切换。拆完需要聚合，见下一节。

---

## Factory Cohesion（工厂聚合）

用 Avoid Flag Arguments 拆散的变体函数，它们是同一个概念家族的成员。工厂模式把它们重新聚合为一个内聚模块——保有"概念完整性"，同时消除调用方的选择负担。

**原则：**
- 拆散的函数在概念上属于同一家族（渲染策略、校验规则、折扣计算器...）→ 用工厂聚合
- 工厂是调用方的唯一入口，内部持有策略映射表
- 新增变体只需在工厂内注册+创建新文件，不改调用方代码
- 聚合后的模块既满足原子化（单个策略函数独立），也满足高内聚（策略族集中管理）

**不仅是布尔参数场景：** 当 Guard Clause 拆出一堆校验函数 → 聚合为 `*Validator`；当 Command-Query 拆出一堆命令 → 聚合为 `*CommandHandler`；当 Fail Fast 校验函数多了 → 聚合为 `*Assertion`。

**对比：**
```javascript
// ❌ 拆散了但没有聚合 — 调用方面临选择难题
function renderEditable()
{
  // ...
}
function renderReadOnly()
{
  // ...
}
function renderCompact()
{
  // ...
}
// 调用方：
function buildPage(mode)
{
  if (mode === 'editable')
    return renderEditable()
  else if (mode === 'readonly')
    return renderReadOnly()
  else if (mode === 'compact')
    return renderCompact()
}

// ✅ 工厂聚合 — 策略族集中管理，调用方一个入口
class RenderStrategyFactory
{
  static #strategies = {
    editable: () =>
    {
      /* ... */
    },
    readOnly: () =>
    {
      /* ... */
    },
    compact: () =>
    {
      /* ... */
    },
  }

  static render(mode)
  {
    return this.#strategies[mode]?.()
  }
}
// 调用方：
function buildPage(mode)
{
  // 新增变体 = 工厂内加一项，buildPage 不动
  return RenderStrategyFactory.render(mode)
}
```

**判断自己是否该用工厂聚合：**
- 问："这些拆出来的函数，是否属于同一个概念家族？"
- 是 → 聚合。4 个 guard clause stripper → `PaymentRuleEngine`；3 个 render 函数 → `RenderStrategyFactory`
- 不是 → 保持独立，各自归属各自的领域模块

**设计思考链：**
```
发现函数有多个职责分支
      ↓ Guard Clause / Avoid Flag Arguments
拆成独立函数，每个只做一件事
      ↓ 思考关联性
这些函数是同一家族的变体吗？
      ├─ 是 → Factory Cohesion 聚合
      └─ 否 → 保持独立，分别归属各自领域
```

---

## await-to-js（错误优先元组）

JS/TS 异步操作中，每个 await 必须显式处理错误。不依赖 try-catch 包裹——用 `[error, data]` 元组解包，让错误变成取值流程中不可跳过的一步。

灵感来自 Go 语言的多返回值错误处理：`value, err := fn()`。

**原则：**
- 异步调用通过 `to()` 解包为 `[error, data]` 元组，错误优先，先检查 error 再往下
- 错误和成功在同一缩进层级，不形成 try-catch 嵌套
- `to()` 定义一次，全局复用——不在每个函数内手写 try-catch

**注意：** await-to-js 只管"错误优先元组返回"这一件事。错误取出后如何处理（集中加工、分层转换、日志上报）属于**错误处理统一策略**（SKILL.md）的范畴，不在本范式范围内。

**对比：**
```javascript
// ❌ try-catch 嵌套 — 正常逻辑被缩进层层包裹
async function getUserOrders(userId)
{
  try
  {
    const user = await fetchUser(userId)

    try
    {
      const orders = await fetchOrders(user.id)
      return orders
    }
    catch (err)
    {
      handleError(err)
    }
  }
  catch (err) 
  {
    handleError(err)
  }
}

// ✅ await-to-js — 错误优先元组，正常逻辑和异常平级
// to() — 全局工具，将 Promise 解包为 [error, data]
async function to(promise)
{
  try
  {
    return [null, await promise]
  }
  catch (err)
  {
    return [err, null]
  }
}

async function getUserOrders(userId)
{
  const [err, user] = await to(fetchUser(userId))
  if (err)
    return handleError(err)

  const [fetchErr, orders] = await to(fetchOrders(user.id))
  if (fetchErr)
    return handleError(fetchErr)

  return orders

}
```

**与 uluo-coding 体系的关系：**
- await-to-js 只管元组解包这一件事；错误取出后的处理策略（集中转换、分层上报）见 SKILL.md **错误处理统一策略**
- `to()` 函数属于 `shared/` 基础设施，项目启动时就位（**基础设施先行**）
- `[err, data]` 让错误在调用点显式可见（**显式优于隐式**）

---

## 加载规则

此文件包含 10 个编码范式，按需查阅。在以下场景使用：

- 写函数体时，遇到深层嵌套 → 查 Guard Clause
- 写 map/filter/forEach 回调时，内部有常量 → 查 LICM Hoisting
- 写函数签名时，参数校验 → 查 Fail Fast
- Code Review 时，发现函数内逻辑跳跃 → 查 Single Level of Abstraction
- 设计对象方法时 → 查 Command-Query Separation、Tell Don't Ask
- 发现链式调用横跨多个对象 → 查 Law of Demeter
- 发现布尔参数或条件分支过多的函数 → 查 Avoid Flag Arguments + Factory Cohesion
- 拆分了多个同类函数后，考虑模块聚合 → 查 Factory Cohesion
- 处理异步操作、编写 try-catch 时 → 查 await-to-js
- 修改对象/数组，需要返回新值而非修改原值 → 查 Immutable Update

---

## Immutable Update（不可变更新）

永远不直接修改 state/props。创建新对象/数组替代：

```typescript
// ❌ 直接修改
user.name = 'new'
items.push(newItem)

// ✅ 创建新值
const updated = { ...user, name: 'new' }
const added = [...items, newItem]
```

### 数组操作

| 操作 | 不可变写法 | 禁止写法 |
|------|----------|---------|
| 新增 | `[...arr, item]` | `arr.push(item)` |
| 删除 | `arr.filter(i => i.id !== id)` | `arr.splice(index, 1)` |
| 更新 | `arr.map(i => i.id === id ? { ...i, ...patch } : i)` | `arr[index].field = value` |
| 排序 | `[...arr].sort(fn)` | `arr.sort(fn)` |

### 嵌套对象

浅层展开不够时，用 `structuredClone` 深拷贝再修改，或引入 Immer：

```typescript
// 浅层不够
const updated = { 
  ...obj, 
  nested: { 
    ...obj.nested, 
    value: 'new' 
  } 
}

// 深层多级
import { produce } from 'immer'
const updated = produce(obj, draft =>
{
  draft.nested.value = 'new'
})
```

不可变更新配合 React/Vue 的响应式系统，避免因引用相等导致的无效渲染。
