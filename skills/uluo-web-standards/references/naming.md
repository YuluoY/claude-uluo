# 命名规范

**加载条件：** 所有场景加载。语言特有的追加项见对应 `references/languages/` 文件。

> 参考：[naming-cheatsheet](https://github.com/kettanaito/naming-cheatsheet)（A/HC/LC 模式）
> eslint `@typescript-eslint/naming-convention` 已覆盖机械规则（case、boolean 前缀、Interface 不加 I）。语义规则仍需模型自查。

---

## 目录

- [S-I-D 原则](#s-i-d-原则)
- [英语](#英语)
- [A/HC/LC 模式（函数命名）](#ahclc-模式函数命名)
  - [动作动词](#动作动词)
  - [避免上下文重复](#避免上下文重复)
- [布尔值](#布尔值)
- [单复数](#单复数)
- [变量](#变量)
- [回调 Props](#回调-props)
- [类 / 接口 / 类型](#类--接口--类型)
- [文件与文件夹](#文件与文件夹)
- [禁止项](#禁止项)
- [自检](#自检)

---

## S-I-D 原则

每个名字满足三点：

- **Short**（短）——打起来快、扫读不费力
- **Intuitive**（直觉）——读起来像自然语言
- **Descriptive**（描述）——一眼看出做什么/存什么

三者有冲突时：**Descriptive > Intuitive > Short**。宁可名字长一点，也不能让人猜。

---

## 英语

所有标识符用英语。英语是编程的通用语——跨团队搜索、IDE 补全、国际化都以此为基础。

---

## A/HC/LC 模式（函数命名）

函数名 = `前缀? + 动作(Action) + 高上下文(High Context) + 低上下文?(Low Context)`

```typescript
//          Action   High Context   Low Context
getUser             // get       User
getUserMessages     // get       User          Messages
handleClickOutside  // handle    Click         Outside
shouldUpdateComponent // should Update        Component
```

**上下文顺序决定语义：** `shouldUpdateComponent`（是否更新组件）≠ `shouldComponentUpdate`（组件是否该更新）。

### 动作动词

| 动作 | 语义 | 示例 | 配对 |
|------|------|------|------|
| `get` | 即时访问数据（同步/异步取值） | `getUser`、`getOrders` | |
| `fetch` | 请求数据（强调异步 I/O） | `fetchOrders`、`fetchConfig` | |
| `find` | 搜索/查找 | `findByName`、`findUserById` | |
| `set` | 声明式赋值（A → B） | `setLoading`、`setTheme` | |
| `update` | 部分修改 | `updateStatus`、`updateProfile` | |
| `reset` | 回到初始值/初始状态 | `resetForm`、`resetFilters` | |
| `create` | 从无到有创建 | `createOrder`、`createUser` | `delete` |
| `delete` | 彻底擦除 | `deleteUser`、`deletePhoto` | `create` |
| `add` | 添加到某个集合/容器 | `addItem`、`addTag` | `remove` |
| `remove` | 从某个集合/容器移出 | `removeItem`、`removeTag` | `add` |
| `compose` | 从已有数据组合出新数据 | `composeQuery`、`composeEmail` | |
| `calculate` | 数值计算 | `calculateTotal`、`calculateTax` | |
| `format` | 格式化/转换表示形式 | `formatDate`、`formatCurrency` | |
| `convert` | 类型/单位转换 | `toApiError`、`fromJson` | |
| `handle` | 处理事件/回调 | `handleClick`、`handleSubmit` | |
| `is` / `has` / `can` | 布尔判断 | `isValid`、`hasPermission`、`canEdit` | |
| `should` | 条件判断（带建议意味） | `shouldUpdate`、`shouldRetry` | |
| `validate` | 校验输入 | `validateEmail`、`validateForm` | |

**`delete` vs `remove` 的区分：** `delete` 是彻底消失（配 `create`），`remove` 是从某处拿出（配 `add`）。如果对象离开集合后还存在 → `remove`；如果对象本身被销毁 → `delete`。

### 避免上下文重复

不要在函数名里重复所在模块/类的上下文：

```typescript
// ❌ 重复——类名已经说了是 MenuItem
class MenuItem {
  handleMenuItemClick() {}
  validateMenuItemInput() {}
}

// ✅ 上下文由类承担，方法名只表动作
class MenuItem {
  handleClick() {}
  validateInput() {}
}
```

---

## 布尔值

用 `is`/`has`/`can`/`should` 前缀。**优先肯定而非否定**：

```typescript
// ✅ 肯定——直觉
const isEnabled = true
const isVisible = false
const hasError = false
const canSubmit = true
if (isEnabled) {}   // 自然阅读

// ❌ 否定——双重否定绕脑子
const isDisabled = false
const isNotVisible = true
if (!isDisabled) {}  // 脑内转换：非禁用 = 启用？
```

---

## 单复数

名字外显基数：

```typescript
const user = { id: 1, name: 'Alice' }    // 单个 → 单数
const users = [{ id: 1 }, { id: 2 }]      // 多个 → 复数
const userList = [...users]                // 列表 → 显式后缀
```

函数名同样：`getUser`（单数）vs `getUsers`（批量）。

---

## 变量

| 类型 | 规则 | 示例 |
|------|------|------|
| 数据/实体 | 名词，单复数明确 | `user`、`orders`、`productList` |
| 布尔 | `is`/`has`/`can`/`should` 前缀，肯定 | `isLoading`、`hasError`、`canEdit` |
| 常量 | `UPPER_SNAKE_CASE` | `MAX_RETRIES`、`API_BASE_URL` |
| 引用 | `ref` 后缀（Vue） | `inputRef`、`listRef` |

---

## 回调 Props

传入组件的回调函数 Props 用 `on` 前缀：`onSelect`、`onSubmit`、`onClose`。事件处理函数用 `handle` 前缀：`handleClick`、`handleSubmit`。

---

## 类 / 接口 / 类型

`PascalCase`，名词。不加 `I` 前缀。泛型单参数 `T`，依次 `K`/`V`/`R`，语义化时 `TResponse` 等。

---

## 文件与文件夹

| 类型 | 规则 | 示例 |
|------|------|------|
| 组件文件 | `PascalCase` | `UserCard.vue`、`OrderList.tsx` |
| 工具/Hook 文件 | `camelCase` | `usePagination.ts`、`formatDate.ts` |
| 文件夹 | `kebab-case` | `user-profile/`、`business-utils/` |

---

## 禁止项

- **禁止缩写**：`usr`、`calc`、`cfg`、`btn`。`id`/`url`/`api` 等通用缩写除外
- **禁止模糊词**：`data`、`info`、`process`、`manage`、`ctx`、`handle`、`do` 作为独立函数名
- **禁止匈牙利命名**：类型系统承担类型信息，名字承担语义——不用 `strName`、`arrItems`

---

## 自检

- [ ] S-I-D：短、直觉、一眼就懂？
- [ ] 函数名 A/HC/LC 结构清晰？动作动词准确？
- [ ] 布尔 `is`/`has`/`can`/`should` 前缀？肯定形式？
- [ ] 单复数外显基数？
- [ ] 上下文没重复？（类名已说的，方法名不再说）
- [ ] 回调 Props `on` 前缀？事件处理 `handle` 前缀？
- [ ] 无缩写、无模糊词？
- [ ] 组件文件 PascalCase？工具文件 camelCase？文件夹 kebab-case？
