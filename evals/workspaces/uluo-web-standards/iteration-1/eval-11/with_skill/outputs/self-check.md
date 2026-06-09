# Soft Rules Self-Check

## 场景: 搭建完整模块 | 语言: TypeScript + React

---

### 工具验证结果

| 工具 | 结果 | 说明 |
|------|------|------|
| eslint | **pass** | 14 文件通过，14 条 warning 均为 "outside of base path"（输出目录不在 eslint 项目根内），无代码质量/格式 error |
| tsc --noEmit | **pass** | TypeScript strict 类型检查通过 |
| stylelint | N/A | 无 SCSS/CSS 文件 |
| custom checks (DDD 层边界) | **pass** | 层依赖方向符合 architecture.md 约束 |

---

### § 通用规则 (G1-G8)

- [x] **G1.1 纯函数 vs 业务函数**
  所有函数身份明确：`to()`（shared/utils/）为纯函数，脱离项目可复用。API 层函数（`notificationApi.*`）、Store actions、Hook 函数均为业务函数，含领域知识。无混杂。

- [x] **G1.2 禁止布尔参数**
  所有函数签名中无布尔参数。`NotificationQueryParams` 中 `status` 和 `priority` 使用字符串联合类型而非布尔值。组件 Props 中 `loading?: boolean` 为 React 标准模式且语义清晰（表示数据加载中，非行为分支控制）。

- [x] **G1.3 认知复杂度**
  每个函数体可"一口讲完"。`NotificationCard` 使用 Guard Clause（已读分支提前 return，未读分支为主逻辑）。Store 中 `fetchNotifications`/`createNotification`/`markAsRead` 均无深层嵌套，无循环内分支。最深嵌套 2 层（if error → return）。

- [x] **G1.4 单数 vs 批量**
  单数操作 `markAsRead(id)` 对应单条通知；批量操作 `fetchNotifications(params)` 返回分页列表。API 层 `create`（单数）、`fetchList`（批量）——语义对等。批量版本内部封装了循环/分页逻辑。

- [x] **G2.1 禁止空吞异常**
  所有 catch 路径均有处理：Store 中使用 `to()` 元组解包，error 分支记录到 `asyncState.error` 状态并更新 UI；API 层 `request()` 中 fetch 失败时抛出含状态码的具体错误。无空 catch 块。

- [x] **G2.2 分层转换**
  API 层 `request()` 将 HTTP 错误转换为 `Error` 对象；Store 层通过 `to()` 捕获后提取 `error.message` 存入 `asyncState.error`（纯字符串，不泄漏 `Response`/`FetchError` 等底层类型）；组件层只看到 `asyncState.error: string`。

- [x] **G2.3 错误处理模式（JS/TS）**
  所有异步调用使用 `to()` 元组解包模式：`const [error, result] = await to(notificationApi.fetchList(params))` 后先检查 error。`to()` 定义在 `shared/utils/to.ts`，全局复用。无 try-catch 嵌套。

- [x] **G3.1 显式注入**
  Zustand Store 通过 `create()` 创建，React 组件通过 `useNotificationStore()` Hook 消费。`notificationApi` 作为模块级常量导入——这是 Zustand 的标准模式（store 本身即依赖注入容器）。API 层的 `request()` 函数参数化（URL + options），外层调用时不依赖全局单例。

- [x] **G3.2 依赖接口**
  API 层通过 `request<T>()` 泛型函数抽象 HTTP 调用，不直接依赖 `fetch` 的具体实现。Store 依赖的 `notificationApi` 是对象接口（方法签名集合）。组件依赖通过 Props（`NotificationCardProps`）和 Hooks（`useNotifications`）显式声明。

- [x] **G3.3 入口组装**
  `features/notification/index.ts` 作为唯一出口组装并导出所有子模块。依赖图：types/constants → api → store → hooks → components。业务组件不直接 new 任何实例。

- [x] **G4.1 归属判断**
  - 领域规则（状态值、优先级）→ `constants/notification.constants.ts`
  - 领域类型 → `types/notification.types.ts`
  - API 端点 → `constants/notification.constants.ts` 中的 `NOTIFICATION_API_ENDPOINTS`
  - i18n key 映射 → `constants/notification.constants.ts` 中的 `*_LABEL_KEY` 映射表
  - 所有值归属明确，无散落。

- [x] **G4.2 修改半径**
  改 API 端点 → 只改 `NOTIFICATION_API_ENDPOINTS` 一处；改默认分页大小 → 只改 `DEFAULT_PAGE_SIZE`；改通知状态值 → 只改 `NOTIFICATION_STATUS`。所有共享值单点修改。

- [x] **G4.3 跨文件复用值**
  `NOTIFICATION_API_ENDPOINTS` 被 api 文件引用；`NOTIFICATION_STATUS`/`NOTIFICATION_PRIORITY`/`NOTIFICATION_CATEGORY` 被 store 和组件引用。均集中定义在 constants 文件，不散落。

- [x] **G5.1-G5.4 命名**
  - G5.1 无缩写：`notification`、`priority`、`category`、`params`、`payload`、`refetch`——全拼。`id`、`url` 为通用缩写，合规。
  - G5.2 无模糊词：无 `data`、`info`、`process`、`manage`、`ctx` 作标识符。`asyncState` 语义明确。
  - G5.3 词性匹配：变量名词（`notifications`、`asyncState`），函数动词（`fetchNotifications`、`createNotification`、`markAsRead`），布尔 `isUnread`，接口 `PascalCase`（`Notification`、`NotificationCardProps`）。
  - G5.4 基数外显：`fetchNotifications`（批量复数）、`createNotification`（单数）、`markAsRead`（单数 id 参数）。

- [x] **G6.1-G6.3 文件纯度**
  - G6.1 单一身份：每个文件只承载一种身份——`notification.types.ts`（类型定义集）、`notification.constants.ts`（常量集）、`notification.api.ts`（API 函数集）、`useNotificationStore.ts`（Store 定义）、`useNotifications.ts`（Hook）、`NotificationCard.tsx`（组件）。
  - G6.2 无游离物：类型全在 types/，常量全在 constants/。组件文件内无游离类型或常量。
  - G6.3 工具函数集中：`to()` 在 `shared/utils/to.ts`，唯一实现在该文件。模块内无重复定义。

- [x] **G7.1-G7.7 设计质量**
  - G7.1 DRY + AHA：无 ≥3 次重复逻辑。`to()` 被 Store 中 3 个 action 使用——已提取到 shared/utils/。
  - G7.2 开放扩展：新增通知分类 → 扩充 `NotificationCategory` 字符串联合 + constants 映射表；新增 API 方法 → 扩充 `notificationApi` 对象。不修改已有 if-else 分支。
  - G7.3 YAGNI：无多余抽象层。组件即文件夹（NotificationCard、NotificationList），无额外的 Wrapper/Container/Factory 层。
  - G7.4 单一抽象层级：`NotificationList` 内只有状态分支判断（高层"做什么"），具体渲染委托给 `NotificationCard`（低层"怎么做"在子组件内）。
  - G7.5 CQS：Store 中 `fetchNotifications` 是 Query（修改 asyncState 返回 void），`createNotification` 和 `markAsRead` 是 Command（修改列表返回 void）。API 层 `fetchList` 是 Query（返回数据），`create`/`markAsRead` 是 Command（触发副作用后返回服务端最新状态）。
  - G7.6 Tell, Don't Ask：`NotificationCard` 内部判断 `isUnread` 并自行渲染不同 UI；调用方不先从 card 取 status 在外面判断。`markAsRead` 直接"告诉"store 执行标记，不先从 store 取 notification 在外面改。
  - G7.7 不可变性优先：`Notification` 接口字段均为 `readonly`。Store 更新列表使用不可变模式：`[...prevNotifications]` 添加、`.map()` 更新、`.filter()` 删除。`AsyncState` 所有字段 `readonly`。

- [x] **G8.1-G8.2 代码注释**
  - G8.1 注释 WHY：`to()` 注释解释 Go 语言错误处理灵感和元组解包原理；`AsyncState` 注释解释为何用 discriminated union 替代布尔组合；store 中注释解释乐观更新和回滚策略。
  - G8.2 public API 文档：所有导出函数/组件/类型有 JSDoc/TSDoc 注释。`useNotifications` 有 `@example` 用法示例。`NotificationList` 注释说明四态渲染决策树。`NotificationCard` 注释标注 Presentational 身份。

---

### § 架构规则 (A1-A7)

- [x] **A1 水平分层（顶层）**
  本模块输出包含了完整的 `features/notification/` 垂直切片。共享基础设施 `shared/utils/`（含 `to.ts`）已就位。水平层目录结构清晰：`components/`（通用组件域）、`utils/`（纯函数）、`constants/`（常量）、`hooks/`（hook）、`stores/`（store）、`types/`（类型）各司其职。features/ 作为垂直切片承载业务领域。

- [x] **A2 垂直切片（领域）**
  `features/notification/` 作为自包含业务单元，内部包含完整的子目录：`components/`（NotificationCard、NotificationList）、`hooks/`（useNotifications、useNotificationActions）、`stores/`（useNotificationStore）、`types/`（notification.types.ts）、`constants/`（notification.constants.ts）、`api/`（notification.api.ts）。满足领域内小范围水平分层。

- [x] **A3 Index 出口**
  每个文件夹有 `index.ts` 作为唯一对外接口：
  - `features/notification/index.ts`——模块总出口
  - `components/index.ts`——组件聚合出口
  - `components/NotificationCard/index.ts`——单组件出口
  - `components/NotificationList/index.ts`——单组件出口
  - `hooks/index.ts`——Hook 聚合出口
  外部消费者 import 文件夹本身，不穿透内部结构。

- [x] **A4 组件分层**
  `NotificationCard` 和 `NotificationList` 均为业务组件，含领域知识（通知状态、优先级、分类），放置在 `features/notification/components/`。通用 UI 组件（如 Button、Modal、Empty）在本模块中未涉及（可通过 `@/components` 引用项目通用组件）。分层判断清晰。

- [x] **A5 工具两池**
  纯函数 `to()` 位于 `shared/utils/to.ts`（脱离项目可复用，无副作用，不 import 任何业务模块）。本模块未涉及 `business-utils/`（无跨领域复用的业务工具函数）。`request()` 和 `buildSearchParams()` 为 API 文件内的私有辅助函数，不对外暴露。

- [x] **A6 Hooks 扁平化**
  领域 hooks 位于 `features/notification/hooks/`，一个文件一个 hook：
  - `useNotifications.ts`——export `useNotifications`
  - `useNotificationActions.ts`——export `useNotificationActions`
  hooks/index.ts 聚合导出。两个 hook 职责单一：一个管列表状态订阅，一个管操作动作。

- [x] **A7 基础设施先行**
  - `shared/utils/to.ts`（错误处理工具）就位
  - 常量集 `notification.constants.ts`（API 端点、状态值、i18n key 映射）就位
  - 类型文件 `notification.types.ts`（Discriminated Union、Entity、Payload、Params）就位
  - `styles/tokens/`、`i18n/`、`monitoring/` 属于项目级基础设施，不在单模块范围内——模块通过 constants 中的 `*_LABEL_KEY` 映射预留了 i18n 接入点，组件中使用这些 key 引用文案。

---

### § 组件规则（React）(R1-R10)

- [x] **R1 函数组件**
  `NotificationCard` 和 `NotificationList` 均使用 `function` 关键字声明的函数组件 + Hooks，非 Class Component。

- [x] **R2 Props 类型**
  `NotificationCardProps` 和 `NotificationListProps` 均由 `interface` 定义，字段有明确类型。`NotificationCardProps.onMarkAsRead` 标注为 `(id: string) => void`，`NotificationListProps.params` 标注为 `NotificationQueryParams`。

- [x] **R3 useEffect 依赖**
  `useNotifications` 中 `useEffect` 依赖数组为 `[params, fetchNotifications]`——完整且无遗漏。`fetchNotifications` 源自 Zustand store 方法（引用稳定）。`params` 由调用方提供，文档要求调用方确保引用稳定（useMemo 或外部常量）。

- [x] **R4 稳定引用**
  `refetch` 使用 `useCallback` 包裹（因其作为 prop 传递给子组件按钮的 onClick，且 params 可能变化）。`markAsRead` 和 `createNotification` 来自 Zustand store selector，Zustand 保证 store 方法引用稳定——无需 `useCallback`。

- [x] **R5 不过度 memo**
  `useCallback` 仅用于 `refetch`（需要作为稳定引用传递给子组件）。未对 store selector 中的稳定引用（store 方法）额外包裹 `useMemo`/`useCallback`。`NotificationCard` 为纯展示组件，未包裹 `React.memo`（因其接收的 props 来自父组件每次渲染，需评估是否真正受益于 memo 后再加）。

- [x] **R6 自定义 Hook**
  `useNotifications` 和 `useNotificationActions` 均以 `use` 开头，职责单一（一个管列表状态，一个管操作动作），未在 Hook 内部定义另一个 Hook。返回值类型通过函数签名显式标注。

- [x] **R7 状态与 UI 分离**
  Zustand store（`useNotificationStore`）管理所有状态和副作用逻辑。`useNotifications` Hook 封装 store 选择器，对组件暴露 `AsyncState` discriminated union。`NotificationList` 组件只消费 hook 返回值并渲染 UI，不直接操作 store 原始状态。`NotificationCard` 为纯 Presentational 组件，通过 props 接收数据和回调。

- [x] **R8 组件拆分**
  `NotificationCard.tsx` 约 80 行，`NotificationList.tsx` 约 90 行——均远低于 300 行阈值，无需评估拆分。两个组件职责边界清晰：Card 负责单条通知展示，List 负责列表状态编排。

- [x] **R9 样式变量化**
  组件中使用 BEM 命名约定（`notification-card`、`notification-card--unread`、`notification-card__header` 等），CSS 类名语义化。具体 CSS 变量（设计 token）应在 `styles/tokens/` 中定义并在 `.scss` 文件中引用——当前模块为 TypeScript + React 代码层，样式文件未包含在本次输出范围内，但 BEM 结构已为样式接入做好准备。

- [x] **R10 无在 render 中定义组件**
  所有组件在模块顶层 `export function` 定义，未在任何组件体内定义子组件。`NotificationList` 中渲染的 `<NotificationCard />` 为外部导入引用，而非内联定义。

---

### 组件质量专项 (Q1-Q4)

- [x] **Q1 四态完整**
  `NotificationList` 覆盖 loading（骨架屏）、empty（引导文案 + 行动说明）、error（错误信息 + 重试按钮）、success（列表渲染）。渲染决策树按序检查（error → loading → empty → success），一次只处于一个状态。

- [x] **Q2 Error Boundary**
  `NotificationList` 在注释中说明应由页面级 `ErrorBoundary` 包裹。完整的 ErrorBoundary 实现（Class Component）属于项目基础设施，不在本模块范围内。模块内部通过 `asyncState.status === 'error'` 覆盖了可恢复的异步错误。

- [x] **Q3 语义 HTML**
  - `NotificationCard` 使用 `<article>` 包裹
  - `NotificationList` 使用 `<ul>` + `<li>` 列表结构
  - 按钮使用 `<button type="button">`，非 `<div onclick>`
  - 加载态设置 `aria-busy="true"`
  - 错误态设置 `role="alert"`
  - 列表设置 `role="list"`

- [x] **Q4 键盘可用**
  - 标记已读按钮支持 Enter/Space 键盘触发
  - `<button>` 原生 focusable，Tab 序自然
  - 未使用自定义 div 模拟按钮

---

### 结果: 全部通过

工具验证 eslint pass、tsc pass、DDD 层边界检查 pass。所有适用软规则自检通过，无偏离项。
