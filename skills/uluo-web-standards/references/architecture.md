# 项目组织法：水平分层 + 垂直切片

**加载条件：** 搭建完整模块、项目从零启动。重构单函数和新增小模块不需要加载此文件。

此文件描述项目组织方式——顶层按技术角色水平分层，领域内按业务垂直切片。两者正交互补。

---

## 目录

- [全景](#overview)
- [水平分层（顶层）](#horizontal-layers)
  - [水平层依赖方向](#layer-dependency-direction)
- [垂直切片（领域内）](#vertical-slices)
  - [切片内部结构](#slice-internal-structure)
  - [切片内依赖](#slice-dependencies)
  - [切片出口](#slice-exports)
- [组件组织：文件夹即组件](#component-organization)
  - [通用组件 vs 业务组件](#generic-vs-business-components)
- [工具函数：两池 + 原子化](#utility-functions)
  - [纯函数池 utils/](#pure-function-pool)
  - [业务工具池 business-utils/](#business-utility-pool)
  - [原子化与组合](#atomic-functions-and-composition)
- [Hooks / Composables 扁平化](#hooks-composables)
  - [通用 hooks](#generic-hooks)
  - [领域 hooks](#domain-hooks)
- [出口规则：每个文件夹都有 index](#export-rules)
- [渐进式组织](#progressive-organization)

---

## 全景

```
src/
├── assets/                       # 静态资源（水平）
│   └── images/                   # 图片（图标用 pnpm 包，见 infrastructure-setup.md）
├── components/                   # 通用 UI 组件（水平 - 纯UI，无业务逻辑）
│   ├── Button/
│   │   ├── index.ts
│   │   ├── Button.vue
│   │   └── Button.test.ts
│   ├── Modal/
│   │   ├── index.ts
│   │   └── Modal.vue
│   └── index.ts
│
├── hooks/                        # 通用 Hooks/Composables（水平）
│   ├── useDebounce.ts
│   ├── usePagination.ts
│   └── index.ts
│
├── utils/                        # 纯函数工具（水平 - 一个函数一个文件）
│   ├── clamp.ts
│   ├── debounce.ts
│   ├── deepClone.ts
│   └── index.ts
│
├── business-utils/               # 业务工具（水平 - 有业务属性但跨领域复用）
│   ├── formatTaskStatus.ts
│   ├── calcShippingFee.ts
│   └── index.ts
│
├── constants/                    # 跨领域常量（水平）
│   ├── api.constants.ts
│   ├── app.constants.ts
│   └── index.ts
│
├── stores/                       # 全局状态（水平）
│   └── useAuthStore.ts
│
├── types/                        # 跨领域共享类型（水平）
│   ├── api.types.ts
│   └── common.types.ts
│
├── i18n/                         # 国际化（水平）
│   ├── locales/
│   │   ├── zh-CN.json
│   │   └── en.json
│   └── index.ts                  # 初始化 + t() 导出
│
├── styles/                       # 主题 / 设计 Token / 全局样式（水平）
│   ├── tokens/
│   │   ├── colors.css
│   │   ├── spacing.css
│   │   └── typography.css
│   ├── reset.css
│   ├── global.css
│   └── index.css
│
├── monitoring/                   # 日志 / 埋点 / 性能 / 异常处理（水平）
│   ├── logger.ts                 # 统一 Logger
│   ├── tracker.ts                # 埋点
│   ├── metrics.ts                # 性能打点 + Web Vitals
│   ├── errors.ts                 # 异常类层级 + 边界转换
│   └── index.ts
│
├── shared/                       # 跨领域基础设施（水平）
│   ├── http/
│   │   ├── http-client.ts        # 统一请求实例（baseURL, timeout, interceptor）
│   │   ├── http-error.ts         # 请求错误类型定义
│   │   └── index.ts
│   └── utils/
│       ├── to.ts                 # await-to-js 错误元组工具
│       └── index.ts
│
├── mocks/                        # 全局 Mock 数据（水平）
│   ├── users.mock.ts
│   └── tasks.mock.ts
│
├── features/                     # 业务领域（垂直切片）
│   ├── user/
│   │   ├── index.ts
│   │   ├── components/           # 业务组件
│   │   │   ├── UserCard/
│   │   │   │   ├── index.ts
│   │   │   │   └── UserCard.vue
│   │   │   └── UserList/
│   │   │       ├── index.ts
│   │   │       └── UserList.vue
│   │   ├── hooks/                # 领域专用 hooks
│   │   │   ├── useUserSearch.ts
│   │   │   └── index.ts
│   │   ├── stores/               # 领域状态
│   │   │   └── useUserStore.ts
│   │   ├── types/                # 领域类型
│   │   │   └── user.types.ts
│   │   ├── constants/            # 领域常量
│   │   │   └── user.constants.ts
│   │   ├── api/                  # 领域 API
│   │   │   └── user.api.ts
│   │   ├── __tests__/            # 测试——与被测代码共存
│   │   └── __mocks__/            # 领域 Mock 数据
│   │
│   └── order/
│       ├── index.ts
│       ├── components/
│       ├── hooks/
│       ├── stores/
│       ├── types/
│       ├── constants/
│       ├── api/
│       ├── __tests__/
│       └── __mocks__/
```

---

## 水平分层（顶层）

按技术角色归类，放在 `src/` 直接子级。每一层内都是同名角色的资源。

| 目录 | 角色 | 约束 |
|------|------|------|
| `assets/` | **静态资源**——images 等。图标使用 pnpm 生态（lucide-vue-next/lucide-react 等），不手动管理 SVG | 不 import features/
| `components/` | **通用 UI 组件**——纯视图，不含业务逻辑。Button、Modal、Table、Empty、Input | 不 import 任何 features/ 下的东西 |
| `hooks/` | **通用 Hooks/Composables**——跨领域复用。useDebounce、usePagination、useMediaQuery | 不 import 业务类型 |
| `utils/` | **纯函数**——无副作用、无业务知识、脱离项目可复用。clamp、debounce、deepClone | 不 import 任何 features/、business-utils/、stores/ |
| `business-utils/` | **业务工具**——有业务属性但跨领域复用。formatTaskStatus、calcShippingFee | 可以 import utils/、types/；不 import features/ 内部 |
| `constants/` | **跨领域常量**——API 配置、应用级常量、共享正则 | 可以 import types/；不 import features/ |
| `stores/` | **全局状态**——跨领域共享。useAuthStore | 不直接承载复杂业务规则 |
| `types/` | **跨领域共享类型**——API 响应类型、通用枚举 | 不 import 任何 features/ |
| `i18n/` | **国际化**——locale 文件 + t() 函数 | 不 import features/ |
| `styles/` | **主题 / 设计 Token / 全局样式**——CSS 变量、reset、全局样式 | 不 import 任何业务模块 |
| `monitoring/` | **日志 + 埋点 + 性能 + 异常**——logger.ts、tracker.ts、metrics.ts、errors.ts | 可以 import types/、constants/；不 import features/ |
| `shared/` | **跨领域基础设施**——统一 HTTP client（shared/http/）、共享工具（shared/utils/to.ts） | 只 import types/、constants/；不 import features/ |
| `mocks/` | **全局 Mock 数据**——跨领域共享的 mock 工厂 | 只被测试代码 import，不进入生产代码 |

### 水平层依赖方向

```
assets/  styles/  i18n/           ← 纯视觉/内容，零依赖
  ↓
types/  constants/                ← 共享数据和类型
  ↓
utils/                            ← 纯函数，不依赖业务
  ↓
monitoring/  shared/  business-utils/  stores/  ← 可以 import 上面所有层
  ↓
hooks/                            ← 可以 import 上面所有层
  ↓
components/                       ← 可以 import 上面所有层，但不能 import features/
  ↓
mocks/                            ← 只在测试中使用
```

---

## 垂直切片（领域内）

`features/<domain>/` 是业务能力的自包含单元。每个切片内部按需要做小范围水平分层。

### 切片内部结构

| 目录 | 角色 | 何时需要 |
|------|------|---------|
| `components/` | **业务组件**——包含领域知识。UserCard、OrderForm、PaymentStatus | 该领域有 UI 时 |
| `hooks/` | **领域专用 hooks**——useUserSearch、useOrderSubmit | 有复杂副作用逻辑时 |
| `stores/` | **领域状态**——useUserStore、useOrderStore | 状态需要跨该领域组件共享时 |
| `types/` | **领域类型**——user.types.ts、order.types.ts | 有领域特有 interface/type 时 |
| `api/` | **领域 API**——user.api.ts、order.api.ts | 该领域有后端调用时 |

### 切片内依赖

```
api/
 hooks/
  stores/
   components/
```

### 切片出口

每个切片只有一个对外接口 `features/<domain>/index.ts`。外部代码不穿透切片内部结构。

---

## 组件组织：文件夹即组件

组件以**文件夹为单位**，不管内部有多少文件——调用方只关心 `index.ts` 导出什么。

```
# 通用组件
components/
  Button/
    index.ts          ← export { Button } from './Button.vue'
    Button.vue
    Button.test.ts

# 业务组件
features/user/components/
  UserCard/
    index.ts          ← export { UserCard } from './UserCard.vue'
    UserCard.vue
    UserCard.test.ts
    types.ts          ← 本组件私有类型
```

### 通用组件 vs 业务组件

| 维度 | `components/`（通用） | `features/<domain>/components/`（业务） |
|------|---------------------|----------------------------------------|
| 依赖 | 只能 import hooks/、utils/、types/ | 可以 import 本切片内的 hooks/stores/types/api |
| 知识 | 无业务知识，纯 UI | 包含领域知识 |
| 复用范围 | 全项目共享 | 仅该领域内共享 |
| 示例 | Button、Modal、Empty、Table、Input | UserCard、OrderForm、PaymentStatus |
| 归属判断 | 换个项目还能直接用 → `components/` | 换个项目没意义 → `features/` 内 |
| 升级路径 | 业务组件被 ≥2 个 feature 用到 → 提升到 `components/` | |

---

## 工具函数：两池 + 原子化

### 纯函数池 `utils/`

脱离当前项目可复用的通用计算。一个文件只导出一个函数。

```
utils/
  clamp.ts              ← export function clamp(value, min, max)
  debounce.ts
  deepClone.ts
  index.ts              ← export { clamp } from './clamp' ...
```

约束：
- 无副作用，确定性输出
- 不 import 任何业务模块
- 不 import 任何 features/、business-utils/、stores/
- 一个文件一个函数

### 业务工具池 `business-utils/`

有业务上下文、但在多个 features 中用到。一个文件只导出一个函数。

```
business-utils/
  formatOrderStatus.ts  ← export function formatOrderStatus(status)
  calcShippingFee.ts
  index.ts
```

约束：
- 可以 import utils/ 和 types/
- 不 import 任何 features/ 内部文件
- 提取判断：同一个函数在 ≥2 个 feature 中被用到 → 提入 business-utils/
- 一个文件一个函数

### 原子化与组合

每个函数文件只导出一个函数。更强功能通过组合实现，不修改原函数：

```typescript
import { formatPrice } from '@/utils/formatPrice'
import { calcDiscount } from '@/business-utils/calcDiscount'

export function calcFinalPrice(price: number, vipLevel: string): number
{
  const discounted = calcDiscount(price, vipLevel)
  return formatPrice(discounted)
}
```

组合后的函数有明确的层级定位——它导入了 business-utils/，所以自身也是业务工具或领域逻辑。

---

## Hooks / Composables 扁平化

一个文件一个 Hook/Composable，扁平放在对应目录下。

### 通用 hooks

```
hooks/
  useDebounce.ts        ← export function useDebounce
  usePagination.ts
  useMediaQuery.ts
  index.ts              ← 聚合导出
```

### 领域 hooks

```
features/user/hooks/
  useUserSearch.ts      ← export function useUserSearch
  useUserProfile.ts
  index.ts
```

每个 Hook 文件：
- 只 export 一个 function（以 `use` 开头）
- 职责单一
- 返回值类型显式标注
- 放在对应层级的目录下

---

## 出口规则：每个文件夹都有 index

每个目录只有一个对外接口 `index.ts`。外部消费者 import 文件夹本身，不穿透内部结构。

```typescript
import { Button, Modal } from '@/components'
import { useUserStore } from '@/features/user'
import { formatPrice } from '@/utils'
```

**禁止**穿透文件夹：`import { Button } from '@/components/Button/Button.vue'`

---

## 渐进式组织

不一开始就画定所有目录。组织随复杂度演进：

1. **项目启动**：`utils/`、`components/`、`types/` 就位（水平层先搭好）
2. **首个 feature**：`features/<domain>/` 创建，只建实际用到的子目录
3. **跨 feature 复用浮现**：函数 ≥2 个 feature 用了 → 提入 business-utils/；组件 ≥2 个 feature 用了 → 提入 components/
4. **hooks/composables 多了**：按通用 vs 领域拆分
