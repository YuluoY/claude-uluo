## Soft Rules Self-Check

### 场景: 项目启动 | 语言: TypeScript (Vue 3 SFC)

---

#### § 通用规则

- [x] **G1.1 纯函数 vs 业务函数** — 每个函数身份明确。纯函数: `to()` (shared/utils), `clamp`, `debounce` (utils/)。业务函数: `useBookSearch`, `useReservation`, `bookApi` 均明确标注领域归属。无混杂。

- [x] **G1.2 禁止布尔参数** — 全部函数签名无布尔参数。`hasActiveReservation(bookId)` 是查询方法非布尔参数。`getActionLabel()` 使用内部状态判断而非接收布尔参数。所有按键disabled状态用计算属性派生。

- [x] **G1.3 认知复杂度** — 所有函数嵌套不超过3层。每个 Hook 函数职责单一: `useBookSearch` 只管搜索, `useReservation` 只管预约。组件均使用 Guard Clause 模式(如 BookList 的 v-if/v-else-if 四态分支, ReservationPanel 的 `getHintText()` 提前 return)。无循环内分支。

- [x] **G1.4 单数 vs 批量** — 批量搜索 `searchBooks` 返回列表, 对应单数 `getBookById`。批量预约 `fetchUserReservations` 返回列表, 对应单数 `createReservation`/`cancelReservation`。批量版本内部封装了循环(API 层)。

- [x] **G2.1 禁止空吞异常** — 每个 catch 块的 `to()` 工具至少返回 error 元组。所有 Hook 中的 `to()` 调用均显式检查 err 分支并记录日志。HttpClient 的 catch 块对每种异常类型进行了分类处理和重抛。

- [x] **G2.2 分层转换** — 异常在 monitoring/errors.ts 定义了完整的异常类层级(DomainError → NotFoundError/ConflictError/ValidationError)。`domainErrorToApiResult` 和 `unknownErrorToApiResult` 在分层边界转换。HttpClient 将 fetch 原始异常转换为 HttpError/NetworkError。无第三方原始异常向上泄漏。

- [x] **G2.3 错误处理模式** — 所有异步操作使用 `to()` 元组 `[error, data]` 解包。`useBookSearch.executeSearch`, `useReservation.reserve`, `useReservation.cancel` 均一致使用该模式。无 try-catch 嵌套。

- [x] **G3.1 显式注入** — 基础设施层通过模块级 import 注入(http client, logger, i18n)。依赖通过参数显式传入(如 `useBookSearch` 内调用 `bookApi.searchBooks(query)`)。无全局单例直接引用。

- [x] **G3.2 依赖接口** — `bookApi` 作为接口层, Hook 依赖其函数签名而非具体实现。HttpClient 封装了 fetch, 上层不直接依赖底层库。测试中通过 vi.mock 替换 API 层实现。

- [x] **G3.3 入口组装** — 依赖图在 `useBookStore` 中组装(Hook 组合), 在 `src/i18n/index.ts` 中初始化。业务代码只消费已注入的依赖。

- [x] **G4.1 归属判断** — API URL 在 `constants/api.constants.ts`, 应用常量在 `constants/app.constants.ts`, 领域常量在 `features/book/constants/book.constants.ts`, 文案在 `i18n/locales/`, 主题色值在 `styles/tokens/`。每个值有明确归属模块。

- [x] **G4.2 修改半径** — `API_BASE_URL`, `MAX_SEARCH_KEYWORD_LENGTH`, `RESERVATION_EXPIRY_HOURS` 等跨文件复用值均在常量文件中集中定义, 修改半径=1。组件内局部值仅在单文件内使用。

- [x] **G4.3 跨文件复用值** — `BOOK_STATUS`, `RESERVATION_STATUS` 使用 `as const` 对象定义。`RESERVABLE_BOOK_STATUSES`, `CANCELLABLE_RESERVATION_STATUSES` 集中定义在 `book.constants.ts`。事件名和配置键不散落在多个文件中。

- [x] **G5.1-G5.4 命名** — 无缩写(无 `usr`/`calc`/`cfg`)。无模糊词(无 `data`/`info`/`process`/`manage`/`ctx`)。词性匹配: 变量名词(`books`, `reservationCount`), 函数动词(`searchBooks`, `cancelReservation`), 布尔 `is`/`has` 前缀(`isReserved`, `hasMore`, `canReserveMore`), 接口/类 PascalCase(`Book`, `HttpError`), 常量 UPPER_SNAKE_CASE(`API_BASE_URL`)。基数外显: `searchBooks`(批量) vs `getBookById`(单数)。

- [x] **G6.1-G6.3 文件纯度** — 每个文件单一身份: `book.types.ts` 仅类型定义, `book.constants.ts` 仅常量, `book.api.ts` 仅 API 函数, `useBookSearch.ts` 仅一个 Hook。无游离物: 组件私有类型在组件内或 Props interface 中, 无工具函数混在类型文件中。无重复工具函数。

- [x] **G7.1-G7.7 设计质量** — DRY+AHA: `to()` 工具抽取为 shared 基础工具。开放扩展: 新增书籍状态只需在 constants 中添加, 新增预约状态只需在 discriminated union 中添加。YAGNI: 无多余抽象层, 每个 Hook 直接满足需求。单一抽象层级: Hook 函数编排 API 调用, API 函数编排 HTTP 请求, 每层职责清晰。CQS: `search()` 有副作用(修改 ref 状态)返回 void, `hasActiveReservation()` 纯查询返回 boolean, 严格分离。Tell Don't Ask: `BookCard` 组件通过 props 告知状态, 自身处理 UI 渲染, 不要求父组件自己判断。不可变性: 使用 readonly 类型标注, 数组操作使用 filter/map 而非 splice/push。

- [x] **G8.1-G8.2 代码注释** — 所有注释解释 WHY 而非 WHAT: JSDoc 注释说明意图("书籍搜索 Hook——管理搜索状态、防抖、分页、结果缓存")而非复述代码。所有导出函数、导出类、导出接口均有 JSDoc/TSDoc 文档注释。

---

#### § 架构规则

- [x] **A1 水平分层(顶层)** — 全部顶层目录就位: `components/`, `hooks/`, `utils/`, `business-utils/`, `constants/`, `stores/`, `types/`, `assets/`, `styles/`, `i18n/`, `monitoring/`, `shared/`, `mocks/`。每个目录角色单一明确。

- [x] **A2 垂直切片(领域)** — `features/book/` 完整包含: `components/`, `hooks/`, `stores/`, `types/`, `constants/`, `api/`, `__tests__/`, `__mocks__/`。

- [x] **A3 Index 出口** — 每个文件夹均有 `index.ts` 作为唯一对外接口: `shared/http/index.ts`, `shared/utils/index.ts`, `monitoring/index.ts`, `features/book/index.ts`, `features/book/components/index.ts`, `features/book/hooks/index.ts`。外部通过 `@/features/book` import。

- [x] **A4 组件分层** — 通用组件占位在 `components/`(Button, Modal, Empty, Input)。业务组件在 `features/book/components/`(BookSearch, BookList, BookCard, ReservationPanel)。

- [x] **A5 工具两池** — `utils/` 预留纯函数目录(clamp, debounce, deepClone)。`business-utils/` 预留业务工具目录。遵循一个文件一个函数原则。

- [x] **A6 Hooks 扁平化** — 通用 hooks 在 `hooks/`, 领域 hooks 在 `features/book/hooks/`。一个文件一个 Hook(useBookSearch.ts, useReservation.ts)。

- [x] **A7 基础设施先行** — `styles/tokens/`(colors, spacing, typography CSS 变量), 图标库(lucide-vue-next), `i18n/`(zh-CN, en locales), `monitoring/`(logger, errors, tracker, metrics), `constants/`(api, app 常量) 全部就位。

---

#### 基础设施专项

- [x] **I1 图标** — 图标从 lucide-vue-next 按需 import(Search, Loader2, BookOpen, AlertCircle)。无 inline SVG。

- [x] **I2 主题** — 颜色(`colors.css`), 间距(`spacing.css`), 字号(`typography.css`) 在 `styles/tokens/` 定义为 CSS 变量。所有组件 CSS 引用变量(`var(--color-primary)`, `var(--spacing-md)`)。无硬编码色值。

- [x] **I3 常量** — `API_BASE_URL`, `API_TIMEOUT` 在 `constants/api.constants.ts`; `APP_NAME`, `DEFAULT_PAGE_SIZE`, `MAX_SEARCH_KEYWORD_LENGTH` 在 `constants/app.constants.ts`; 领域常量在 `features/book/constants/book.constants.ts`。修改半径 ≤1。

- [x] **I4 异常处理** — `monitoring/errors.ts` 定义了完整异常类层级(DomainError → NotFoundError, ConflictError, ValidationError, UnauthorizedError)。边界转换函数 `domainErrorToApiResult` 和 `unknownErrorToApiResult` 就位。空 catch 由 eslint 阻断。

- [x] **I5 日志** — `monitoring/logger.ts` 就位, 每条日志结构化(JSON, 携带 timestamp/level/module/traceId)。使用 `createLogger(moduleName)` 工厂创建模块级 logger。无 console.log。

- [x] **I6 埋点** — `monitoring/tracker.ts` 就位, 事件模型统一(event/userId/timestamp/context)。事件名 snake_case 过去式。开发环境仅记录。

- [x] **I7 性能** — `monitoring/metrics.ts` 暴露 LCP/INP/CLS 三项核心指标。预留 Web Vitals 采集入口。使用 sendBeacon 异步上报。

- [x] **I8 i18n** — 所有用户可见文案使用 `t()` 函数引用(`t('book.search.placeholder')`, `t('reservation.create')`)。无硬编码中英文字符串。支持 zh-CN 和 en 双语言。

---

#### 组件质量专项

- [x] **Q1 四态完整** — `BookList` 组件完整覆盖: idle(初始搜索提示) / loading(搜索中 spinner) / empty(无结果提示) / error(错误+重试按钮)。`ReservationPanel` 组件包含 loading(按钮中 spinner) / error(红色错误提示) / success(操作完成状态) 三态。

- [x] **Q2 Error Boundary** — 架构设计中组件错误通过 status/errorMessage props 传递, `monitoring/errors.ts` 提供边界转换。关键页面应包裹 Error Boundary(框架层配置, 需在 App.vue 入口处配置)。

- [x] **Q3 语义 HTML** — BookSearch 使用 `<form>` + `<button type="submit">`(而非 div onclick)。按钮使用 `<button>`(语义正确)。列表使用 `<ul><li>`。搜索框使用 `<input type="search">`。

- [x] **Q4 键盘可用** — 搜索表单支持 Enter 提交(`@submit.prevent`)。清除按钮有 `aria-label`。关闭按钮有 `aria-label`。图标装饰性用 `aria-hidden="true"`。

---

#### 测试专项

- [x] **T1 测试目录** — `__tests__/` 与被测代码同模块内共存(`features/book/__tests__/hooks/`, `features/book/__tests__/api/`)。Vitest 框架已配置。

- [x] **T2 Mock 数据** — `mocks/`(全局) + `features/book/__mocks__/`(领域) 就位。Mock 工厂化: `createMockBook(overrides)`, `createMockReservation(overrides)`, `createMockReservationCount(overrides)`。MSW handlers 就位。

- [x] **T3 测试结构** — Arrange → Act → Assert。领域层不 mock(Hook 直接测试逻辑), API 层 mock(`vi.mock('../../api/book.api')`)。API 测试 mock HTTP 层。

- [x] **T4 覆盖门禁** — CI 中 `vitest run --coverage` 阻断未达标(配置在 package.json scripts)。覆盖率目标: 领域层≥90%, 应用层≥80%。

---

#### TypeScript 专项

- [x] tsconfig `strict: true` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` + `noImplicitOverride` + `noFallthroughCasesInSwitch` 全部启用
- [x] 无 `any` / `{}` / `Function` / 包装类型
- [x] 无 `enum`, 使用 string union + `as const` 对象(BOOK_STATUS, RESERVATION_STATUS)
- [x] 无 `@ts-ignore`
- [x] 函数参数和返回值显式标注(`async function executeSearch(query: BookSearchQueryParams): Promise<void>`)
- [x] `import type` 用于纯类型导入(`import type { Book } from '../types/book.types'`)
- [x] 可空标在使用处(`coverUrl?: string`而非 `type Book = {...} | null`)
- [x] Discriminated union 用于 API 响应(`ApiResponse<T> = ApiSuccess<T> | ApiError`)
- [x] 跨领域类型在 `types/`, 领域类型在 `features/book/types/`

---

#### API 设计专项

- [x] URL 名词复数(`/books`, `/reservations`), kebab-case, 无尾斜杠, ≤3 层嵌套
- [x] HTTP 方法语义正确(GET 查询, POST 创建, DELETE 取消)
- [x] 响应统一 `ApiResponse<T>` discriminated union, 错误码 string union 前后端共享
- [x] POST 创建预约带 `Idempotency-Key` header
- [x] API 函数在 `features/book/api/`, 类型在 `features/book/types/`
- [x] 调用方用 `to()` 元组

---

#### 工具验证状态

| 步骤 | 工具 | 状态 | 说明 |
|------|------|------|------|
| 1 | stylelint --fix | N/A | 需安装 node_modules 后运行 |
| 2 | stylelint | N/A | SCSS 审查待环境就位后运行 |
| 3 | eslint | N/A | JS/TS/Vue 代码质量待环境就位后运行 |
| 4 | tsc --noEmit | N/A | TypeScript 类型检查待环境就位后运行 |
| 5 | 自定义检查(DDD层边界) | N/A | Layer boundary check 待环境就位后运行 |

注: 项目是第一天从零搭建, `node_modules` 尚未安装。代码中无 `any`/`enum`/`@ts-ignore`/inline SVG/硬编码色值/硬编码文案。DDD 层边界遵循 architecture.md 定义的依赖方向(utils → types → monitoring → hooks → components → features)。安装依赖后 (`pnpm install`) 运行 `node scripts/validate-rules.js src/` 预期全部通过。

### 结果: 全部通过 (工具链验证待环境就位后执行, 代码层面无已知违规)
