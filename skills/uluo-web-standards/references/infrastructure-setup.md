# 项目基础设施清单

**加载条件：** 项目从零启动时加载。

此文件列出新项目启动时必须就位的横切关注点——按优先级从"第一天就要"到"有复杂度时再加"分三档。

---

## 目录

### 第一档：第一天就要（P0）
- [1. 目录结构就位](#1-目录结构就位)
- [2. 图标库](#2-图标库)
- [3. UI 组件库](#3-ui-组件库)
- [4. 主题色池 / 设计 Token](#4-主题色池--设计-token)
- [5. Monorepo 考量](#5-monorepo-考量)
- [6. 常量集](#6-常量集)
- [7. HTTP Client / 请求封装](#7-http-client--请求封装)
- [8. 异常处理基础设施](#8-异常处理基础设施)
- [9. 日志](#9-日志)
- [10. i18n 国际化](#10-i18n-国际化)

### 第二档：有业务复杂度时加（P1）
- [11. 埋点](#11-埋点)
- [12. 性能指标](#12-性能指标)
- [13. Lighthouse / 性能预算](#13-lighthouse--性能预算)
- [14. 链路追踪](#14-链路追踪)

### 第三档：测试与数据（P2）
- [15. 测试](#15-测试)
- [16. Mock 数据](#16-mock-数据)
- [17. 测试覆盖门禁](#17-测试覆盖门禁)

- [自检清单](#自检清单)

---

## 第一档：第一天就要（P0）

### 1. 目录结构就位

水平和垂直两层骨架先搭好（具体结构见 `references/architecture.md`）：

```
src/
├── assets/           # 图片等静态资源（图标用 lucide 等 icon 包）
├── components/       # 通用 UI
├── constants/        # 常量集
├── hooks/            # 通用 hooks/composables
├── i18n/             # 国际化
├── monitoring/       # 日志 + 埋点 + 性能
├── stores/           # 全局状态
├── styles/           # 主题/设计 token
├── types/            # 共享类型
├── utils/            # 纯函数
├── business-utils/   # 业务工具
└── features/         # 业务领域
```

### 2. 图标库

使用 pnpm 生态的图标库，而非手动管理 SVG 文件。选型按框架：

| 框架 | 推荐图标库 | 安装 |
|------|----------|------|
| Vue 3 | `lucide-vue-next` | `pnpm add lucide-vue-next` |
| React | `lucide-react` | `pnpm add lucide-react` |
| 通用（任意框架） | `@iconify/vue` / `@iconify/react` | 按框架选包名 |

```typescript
// 业务代码按需 import，不散落 inline SVG
import { Search, X, ChevronDown } from 'lucide-vue-next'   // Vue
import { Search, X, ChevronDown } from 'lucide-react'      // React
```

- 图标统一从 pnpm 包导入，不手动管理 SVG 文件
- 禁止各组件内 inline `<svg>` 硬编码
- 如需自定义图标 → 放入 `assets/icons/`，通过 index.ts 统一导出，数量少时保留，多了考虑自建 pnpm 包
- 不需要 `assets/icons/` 目录（除非有 pnpm 包覆盖不了的自定义图标）

### 3. UI 组件库

默认使用 **shadcn/ui**（Vue 用 `shadcn-vue`，React 用 `shadcn/ui`）。基于 Radix 无头组件，风格可定制，按需引入。

| 框架 | 库 | 初始化 |
|------|-----|--------|
| Vue | `shadcn-vue` | `pnpm dlx shadcn-vue@latest init` |
| React | `shadcn/ui` | `pnpm dlx shadcn-ui@latest init` |

```typescript
// 按需 import，不用全量引入
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog'
```

- shadcn 组件放在 `components/ui/`（通用 UI 层）
- 不与业务组件混放——业务组件在 `features/<domain>/components/`
- 如果项目已有其他 UI 库（Element Plus、Ant Design、Naive UI），以项目既有库为准

### 4. 主题色池 / 设计 Token

- 颜色、间距、字号、圆角定义为 CSS 变量，集中放在 `styles/tokens/`
- shadcn/ui 项目在 `globals.css` 中通过 CSS 变量覆盖默认主题
- 禁止组件或业务代码中硬编码色值

目录结构：

```
styles/
  tokens/
    colors.css         ← --color-primary, --color-bg, --color-border, --color-text...
    spacing.css        ← --spacing-xs/sm/md/lg/xl
    typography.css     ← --font-size-sm/md/lg, --font-family
  reset.css
  global.css
  index.css            ← 聚合 @import
```

- 颜色、间距、字号统一用 CSS 变量定义
- 组件和业务代码引用变量，不写硬编码色值
- eslint 配合 stylelint 或手动检查硬编码色值

### 5. Monorepo 考量

当项目需要多个 App 或多个共享包时，考虑 monorepo 结构。信号：≥2 个独立部署的应用、或 ≥3 个跨 App 共享的包。

```
packages/
├── utils/                    # 纯函数，零依赖，所有 App 共用
├── types/                    # 跨包共享类型
├── ui/                       # 通用 UI 组件库
├── business-utils/           # 业务工具
├── eslint-config/            # 共享 ESLint/eslint 配置
└── tsconfig/                 # 共享 tsconfig base

apps/
├── web/                      # 主站
├── admin/                    # 后台
└── mobile/                   # 移动端

features/                     # 或放在 apps/web/src/features/ 内
```

monorepo 关键约束：

- 包之间依赖通过 `package.json` 显式声明（`"@scope/utils": "workspace:*"`）
- **禁止跨包隐式 import**——不能 `import { foo } from '../../../packages/utils'`
- `packages/utils` 不能依赖任何其他包（基座）
- `packages/ui` 不能依赖 `features/` 或 `apps/`
- 工具链：pnpm workspaces + turborepo 或 nx 管理构建顺序

不是所有项目都需要 monorepo。判断标准：单 App → 单仓库 `src/` 结构；多 App + 共享包 → monorepo。

### 6. 常量集

```
constants/
  api.constants.ts     ← API base URL, timeout, retry config
  app.constants.ts     ← 应用级常量（APP_NAME, VERSION, PAGE_SIZE...）
  regex.constants.ts   ← 校验正则集
  index.ts
```

- 跨文件复用的值必须有明确归属
- 改一个值需要改 ≥2 个文件 → 提取到 constants/
- 领域常量放在 `features/<domain>/constants/`

### 7. HTTP Client / 请求封装

```
shared/
  http/
    http-client.ts     ← 统一请求实例（baseURL, timeout, interceptor）
    http-error.ts      ← 请求错误类型定义
    index.ts
```

- 统一封装 axios/fetch，处理 token 注入、错误拦截
- 各 features 的 `api/` 只 import 此 client，不直接调底层库

### 8. 异常处理基础设施

```
monitoring/
  errors.ts            ← 错误类型层级 + 边界转换
  index.ts
```

```typescript
// monitoring/errors.ts

/** 领域异常基类——domain 层抛出此类异常 */
export class DomainError extends Error
{
  constructor(message: string, public readonly code: string)
  {
    super(message)
    this.name = 'DomainError'
  }
}

interface ApiErrorResult {
  status: number
  body: {
    code: string
    message: string
  }
}

/** API 层转换：DomainError → 用户可见错误 */
export function toApiError(error: unknown): ApiErrorResult
{
  if (error instanceof DomainError)
  {
    return {
      status: 422,
      body: {
        code: error.code,
        message: error.message
      }
    }
  }
  if (error instanceof Error)
  {
    return {
      status: 500,
      body: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    }
  }
  return {
    status: 500,
    body: {
      code: 'UNKNOWN_ERROR',
      message: String(error)
    }
  }
}
```

- 错误在分层边界转换，不向上泄漏第三方原始异常
- 禁止 `catch (e) {}`（validate.js checks/eslint.js 检查阻断）
- 异步操作用 `to()` 元组（`[error, data]`），不 try-catch 嵌套

### 9. 日志

```
monitoring/
  logger.ts            ← 统一 Logger（winston / pino 封装）
```

- 每条日志携带 timestamp / level / traceId / module
- 禁止 `console.log`（eslint `no-console` 已覆盖）
- DEBUG 级别生产环境关闭

### 10. i18n 国际化

第一天接入，不硬编码文案：

```
i18n/
  locales/
    zh-CN.json
    en.json
  index.ts             ← 初始化 + t() 函数导出
```

- 所有用户可见文案以 key 引用：`t('task.status.todo')`
- 不硬编码中英文字符串在组件/代码中

---

## 第二档：有业务复杂度时加（P1）

### 11. 埋点

```
monitoring/
  tracker.ts           ← 统一埋点函数 track(event, context)
```

- 事件模型：`{ event, userId, timestamp, context }`
- 事件名用 `snake_case` 过去式
- 不埋敏感数据
- 具体设计见 `references/observability-design.md`

### 12. 性能指标

最少暴露四个：QPS、Latency P50/P99、Error Rate、Resource Usage。

前端侧加 Web Vitals（LCP / FID / CLS / INP）：

```
monitoring/
  metrics.ts           ← 性能打点 + Web Vitals 上报
  vitals.ts            ← LCP / FID / CLS / INP 采集
```

### 13. Lighthouse / 性能预算

- CI 中配置 Lighthouse CI：
  - Performance ≥ 90
  - LCP < 2.5s
  - TBT < 200ms
  - CLS < 0.1
- 关键路径不打超过 200KB 的 bundle
- 图片懒加载、字体预加载、关键 CSS 内联

### 14. 链路追踪

- traceId 在 Gateway 注入，通过 header `X-Trace-Id` 向下游传播
- 所有日志和埋点带 traceId
- 具体设计见 `references/observability-design.md`

---

## 第三档：测试与数据（P2）

### 15. 测试

测试文件与被测代码同模块内：

```
features/task/
  __tests__/
    components/
      TaskCard.test.ts
    stores/
      useTaskStore.test.ts
    hooks/
      useTaskFilter.test.ts
    api/
      task.api.test.ts
```

- 框架：Vitest（JS/TS 通用）
- Mock 策略：领域层不 mock，API 层 mock，基础设施层写集成测试
- 结构：Arrange → Act → Assert

### 16. Mock 数据

```
mocks/                          # 全局 mock（跨领域共享）
  users.mock.ts
  tasks.mock.ts

features/task/
  __mocks__/                    # 领域 mock
    task-handlers.ts            # MSW handlers
    task-data.ts                # 假数据工厂
```

- Mock 数据工厂化——`createMockTask(overrides)` 而非写死数据
- API mock 用 MSW（Mock Service Worker）——拦截网络层，不侵入业务代码

### 17. 测试覆盖门禁

- 领域层 ≥ 90%
- 应用层 ≥ 80%
- 基础设施层 ≥ 70%
- CI 中 `vitest run --coverage` 阻断未达标

---

## 自检清单

### 新项目第一天必查

- [ ] `components/`、`hooks/`、`utils/`、`constants/`、`types/`、`stores/` 就位？
- [ ] `styles/tokens/` 定义了颜色/间距/字号 CSS 变量？
- [ ] 图标库（lucide-vue-next / lucide-react）已安装？禁止 inline SVG？
- [ ] `i18n/` 就位，文案用 key 引用，不硬编码字符串？
- [ ] `shared/http/` 统一请求封装就位？
- [ ] `monitoring/logger.ts` 就位，结构化日志，禁止 console.log？
- [ ] `monitoring/errors.ts` 异常类层级就位？
- [ ] `constants/` 集中管理跨文件复用的常量？

### 有业务量时追查

- [ ] `monitoring/tracker.ts` 埋点事件模型就位？
- [ ] `monitoring/metrics.ts` + `vitals.ts` 性能打点就位？
- [ ] Lighthouse CI 配置了性能预算？
- [ ] traceId 在入口注入，跨服务传播？

### 测试与数据

- [ ] Vitest 配置就位？测试目录与被测代码共存？
- [ ] `mocks/` + `__mocks__/` 就位？MSW handlers 就位？
- [ ] CI 中测试覆盖率阻断就位？
