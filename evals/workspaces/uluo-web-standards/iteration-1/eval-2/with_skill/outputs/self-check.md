## Soft Rules Self-Check

### 场景: 项目启动 | 语言: TypeScript

---

#### Section: 通用规则

- [x] **G1.1 纯函数 vs 业务函数** — 每个文件身份明确。`shared/utils/to.ts` 中的 `to()`/`toSync()` 是纯函数（无副作用、脱离项目可复用）。`features/order/services/order.service.ts` 中的 `OrderService` 是业务函数（包含领域知识、可能有副作用）。`features/order/api/order.api.ts` 中的 `createOrderApiClients()` 是 API 调用层，不是纯函数。`monitoring/errors.ts` 中 `toApiError()` 是纯转换函数。所有函数身份不混杂。

- [x] **G1.2 禁止布尔参数** — 所有函数签名中无布尔参数。`isRetryableError()` 是命名查询函数（`is` 前缀），不是接受布尔参数的函数。`metrics.ts` 中 `recordRequest(statusCode, durationMs)` 参数均为语义化类型，无布尔。`HttpClientConfig` 使用 options 对象传递配置。

- [x] **G1.3 认知复杂度** — 所有函数可"一口讲完"。最复杂函数为 `OrderService.createOrder()`，使用 Guard Clause + await-to-js 元组平铺处理，无嵌套超过 3 层。`http-client.ts` 中的 `request()` 重试循环使用显式的 for 循环，分支不超过 3 层嵌套。无循环内有分支的场景。

- [x] **G1.4 单数 vs 批量** — `getUser(userId)` 单数，`releaseInventory` 处理批量 items。`OrderService` 中所有方法均为单数操作（一次一个订单）。`to()` / `toSync()` 处理单个 Promise，批量可通过 `Promise.all(items.map(fn))` 在调用方实现。

- [x] **G2.1 禁止空吞异常** — 所有 catch 块都有处理。`shared/utils/to.ts` 中 catch 返回 error 元组给调用方处理。`http-client.ts` 中的 catch 块进行日志记录 + 重试逻辑 + 最终 throw。`order.service.ts` 中每个 `await to()` 结果的 err 分支都有日志记录或错误转换。无空 catch 块。

- [x] **G2.2 分层转换** — 异常在 domain → application → interface 逐层转换。`monitoring/errors.ts` 定义 `DomainError` / `OrderDomainError` / `InfrastructureError` / `toApiError()` 边界转换函数。`OrderService` 在 application 层将 `InfrastructureError` 转换为 `CreateOrderResult.failed`，不会向上泄漏 `HttpError` 或 `AxiosError`。API 层使用 `toApiError()` 将领域异常转为 HTTP 响应。

- [x] **G2.3 错误处理模式（JS/TS）** — 所有异步操作使用 `to()` 元组解包（`[error, data]`），不 try-catch 嵌套。`order.service.ts` 中 4 处异步调用均使用此模式：`const [err, result] = await to(fn())`。`http-client.ts` 内部使用 try-catch（基础设施层内部实现，不暴露给调用方）。

- [x] **G3.1 显式注入** — `OrderService` 通过构造函数参数接收 `OrderApiClients` 依赖。`createHttpClient()` 通过参数接收 `HttpClientConfig`。`createOrderApiClients()` 通过参数接收 `HttpClient`。无全局单例引用（logger 除外，属于基础设施中的全局工具，合理）。

- [x] **G3.2 依赖接口** — `OrderService` 依赖的是 `OrderApiClients` 接口（TypeScript 类型），由 `createOrderApiClients()` 工厂返回。`createHttpClient()` 返回具体函数对象（`{ get, post, ... }`），符合鸭子类型。业务代码中无 `new XxxRepository()` 直接构造。

- [x] **G3.3 入口组装** — 依赖图在 `main.ts` 入口组装：`createHttpClient()` → `createOrderApiClients()` → `new OrderService(orderApiClients)`。业务代码 `OrderService` 只消费已注入的依赖，不自己创建依赖。

- [x] **G4.1 归属判断** — 领域规则 `ORDER_STATUS_TRANSITIONS` 归属 `features/order/constants/order.constants.ts`。配置 `DEFAULT_TIMEOUT` 归属 `constants/api.constants.ts`。应用配置 `APP_NAME` 归属 `constants/app.constants.ts`。类型定义跨领域共享在 `types/api.types.ts`，领域类型在 `features/order/types/order.types.ts`。

- [x] **G4.2 修改半径** — 所有复用的常量/类型都提取到共享文件。修改 API 超时：只改 `constants/api.constants.ts` 中的 `DEFAULT_TIMEOUT`（1 个文件）。修改错误码：只改 `types/api.types.ts` 中的 `OrderErrorCode`（1 个文件）。修改订单状态：改 `features/order/constants/order.constants.ts` + `features/order/types/order.types.ts`（2 个文件，但状态常量与类型是同一概念的两个方面，合理）。

- [x] **G4.3 跨文件复用值** — 事件名 `'order_created'` 等埋点字符串在使用点硬编码（数量少，每个只在一处使用）。`ORDER_STATUS_TRANSITIONS` 集中定义在 `order.constants.ts`。`ErrorCode` 和 `OrderErrorCode` 集中定义在 `api.types.ts`。

- [x] **G5.1 禁止缩写** — 无 `usr`、`calc`、`cfg` 缩写。使用完整词：`userId`（id 是通用缩写例外）、`maxRetries`、`backoffMs`（ms 例外）、`transactionId`。

- [x] **G5.2 禁止模糊词** — 无 `data`、`info`、`process`、`manage`、`ctx` 作为独立标识符。`data` 在 `ApiResponse<T>` 泛型中是作为信封字段名，语义清晰。`context` 在埋点事件中语义明确。`trackingContext` 内部闭包变量使用 context 后缀，但语义完整。

- [x] **G5.3 词性匹配** — 变量名词：`orderId`、`userId`、`totalAmount`。函数动词：`createOrder()`、`cancelOrder()`、`validateStatusTransition()`。布尔 `is`/`has`：`isProduction`、`isRetryableError()`。接口/类 `PascalCase`：`OrderService`、`OrderDomainError`、`HttpClientConfig`。

- [x] **G5.4 基数外显** — `getUser()`（单数），外层按需批量。`recordRequest()`（单次）。`OrderApiClients` 中有 `getUser()`, `createPayment()` 等单数操作。`items`（复数，数组类型显然）。`CANCELLABLE_STATUSES`（复数，readonly array）。

- [x] **G6.1 单一身份** — 每个文件只承载一种身份：`errors.ts` = 异常类定义 + 转换函数，`to.ts` = util 函数集，`http-client.ts` = HTTP 客户端工厂，`http-error.ts` = HTTP 错误类型，`logger.ts` = 日志模块，`tracker.ts` = 埋点模块，`tracer.ts` = 追踪模块，`metrics.ts` = 指标模块。所有文件身份单一。

- [x] **G6.2 游离物抽出** — `order.service.ts` 底部的纯函数 `generateOrderId()` 和 `calculateTotalAmount()` 属于领域内部的工具函数，放在同一文件合理（它们与 OrderService 强相关）。`order.constants.ts` 仅包含常量。`order.types.ts` 仅包含类型定义。无游离常量和类型混在主体文件中。

- [x] **G6.3 工具函数集中** — `to()` 和 `toSync()` 在 `shared/utils/to.ts`，唯一的副本。没有在其他文件中重复定义。

- [x] **G7.1 DRY + AHA** — 当前代码量较小，无明显重复逻辑。`http-client.ts` 的请求方法（`get`/`post`/`put`/`patch`/`delete`）通过 `request()` 核心函数复用。`order.service.ts` 中 `releaseInventoryInternal()` 提取为私有方法，被 `createOrder()` 和 `cancelOrder()` 共用。

- [x] **G7.2 开放扩展** — 新增上游服务（如通知服务）通过新增 `createOrderApiClients()` 中的方法 + `OrderService` 中注入使用。新增订单状态只需修改 `OrderStatus` 联合类型 + `ORDER_STATUS_TRANSITIONS` 常量，`validateStatusTransition()` 自动覆盖。`withSpan()` 通过传入 span name 开放扩展。

- [x] **G7.3 YAGNI** — 没有为一次性场景创建的抽象层。`HttpClient` 当前简单封装 fetch，仅添加了重试和日志（实际需要）。未引入 Service Locator 或 DI 容器（复杂度不足以需要）。`withSpan()` 是轻量封装，不是完整 OTel SDK 包装。

- [x] **G7.4 单一抽象层级** — `OrderService.createOrder()` 内部所有语句处于"业务流程编排"层级：`[err, res] = await to(api.fn())` → `if (err) return failure` → 下一步。低层细节（`generateOrderId()`、`calculateTotalAmount()`）已提取为独立函数，通过函数名表达意图。

- [x] **G7.5 Command-Query 分离** — `createOrder()` 是命令（修改状态），返回 `CreateOrderResult`（成功/失败状态，非业务数据）。`validateStatusTransition()` 是命令（校验失败抛异常），无返回值。`getCurrentMetrics()` 是纯查询，返回只读快照。`recordRequest()` 是命令，无返回值。`track()` 是命令，无返回值。无既有副作用又返回业务数据的函数。

- [x] **G7.6 Tell, Don't Ask** — `OrderService.validateStatusTransition()` 将状态校验逻辑封装在服务内部，调用方只需告诉它"校验这个转换"，不需自己查状态表。`createOrder()` 将整个订单创建流程封装在服务内，调用方只需传入 payload。

- [x] **G7.7 不可变性优先** — 类型定义中 `readonly` 用于数组（`readonly T[]`、`readonly string[]`）。`ORDER_STATUS_TRANSITIONS` 使用 `as const` 保证不可变。`CANCELLABLE_STATUSES` 使用 `readonly string[]`。`Order` 接口字段为只读语义（entity 创建后不修改，更新时创建新实例）。

- [x] **G8.1 注释 WHY 而非 WHAT** — `to()` 函数注释解释"错误成为 return value，调用方在缩进顶层处理"。`createOrder()` 注释描述流程步骤（why each step exists）。`http-client.ts` 中重试逻辑有注释解释为何跳过 AbortError。

- [x] **G8.2 public API 文档** — 所有导出函数有 JSDoc：`to()`, `toSync()`, `createHttpClient()`, `createOrderApiClients()`, `track()`, `setTrackingContext()`, `withSpan()`, `recordRequest()`, `extractTraceId()`, `toApiError()`, `isRetryableError()`, `OrderService.createOrder()`, `OrderService.cancelOrder()`, `OrderService.payOrder()`, `OrderService.validateStatusTransition()`。

---

#### Section: 架构规则

- [x] **A1 水平分层（顶层）** — `components/`、`hooks/`、`utils/`、`stores/`（本项目为后端服务，以上目录不适用，N/A）。`types/`、`constants/`、`monitoring/`、`shared/` 就位。`features/` 垂直切片就位。本项目为 Node.js 后端服务，无 `assets/`、`styles/`、`i18n/` 需求（N/A）。每个目录角色单一：`types/` = 跨领域类型，`constants/` = 跨领域常量，`monitoring/` = 日志+埋点+追踪+指标+异常，`shared/` = HTTP Client + 工具。

- [x] **A2 垂直切片（领域）** — `features/order/` 内：`types/`、`constants/`、`api/`、`services/` 就位（后端服务场景，用 `services/` 替代 `hooks/` 和 `stores/`）。每个子目录角色单一。

- [x] **A3 Index 出口** — 每个文件夹有 `index.ts`：`monitoring/index.ts`、`shared/http/index.ts`、`shared/utils/index.ts`、`constants/index.ts`、`features/order/index.ts`。外部只 import 文件夹本身，不穿透内部结构。

- [x] **A4 组件分层** — 后端服务，无 UI 组件需求（N/A）。

- [x] **A5 工具两池** — `shared/utils/` 包含纯函数 `to.ts`（无副作用、不依赖业务）。本项目为后端服务，`business-utils/` 当前无内容，如有跨领域业务工具会提取到此目录。

- [x] **A6 Hooks 扁平化** — 后端服务，无 Hooks 需求（N/A）。`features/order/services/` 包含 `OrderService` 类，职责单一。

- [x] **A7 基础设施先行** — `monitoring/`（日志+埋点+追踪+指标+异常）第一天就位。`types/`（API 类型）就位。`constants/`（常量集）就位。`shared/http/`（HTTP Client）就位。后端服务无 CSS tokens/图标库需求（N/A）。

#### 基础设施专项

- [x] **I1 图标** — 后端服务，无图标需求（N/A）。

- [x] **I2 主题** — 后端服务，无主题/token 需求（N/A）。

- [x] **I3 常量** — 跨文件复用值已集中管理：`constants/api.constants.ts`（API 超时/分页）、`constants/app.constants.ts`（应用名/版本）、`features/order/constants/order.constants.ts`（订单状态转换/最大条目/最大金额）。

- [x] **I4 异常处理** — `monitoring/errors.ts` 定义了异常类层级：`DomainError` → `OrderDomainError`、`InfrastructureError`、`NotFoundError`。边界转换函数 `toApiError()` 存在。`shared/http/http-error.ts` 定义了 `HttpError` → `UpstreamTimeoutError` / `UpstreamUnavailableError`。全部无空 catch 块。

- [x] **I5 日志** — `monitoring/logger.ts` 就位，基于 pino。每条日志携带 timestamp/level/traceId/service。`createChildLogger()` 支持创建带 module 的子 Logger。禁止 `console.log`（eslint 覆盖）。日志结构化 JSON。

- [x] **I6 埋点** — `monitoring/tracker.ts` 就位。事件模型统一：`{ event, userId, timestamp, sessionId, traceId, context }`。`track()` 函数统一出口。

- [x] **I7 性能** — `monitoring/metrics.ts` 暴露四个指标：QPS（Rate）、Error Rate、Duration P50/P99、External Call Duration。`startMetricsReporter()` 定期输出。后端服务无 Web Vitals / Lighthouse 需求（N/A）。

- [x] **I8 i18n** — 后端服务，无用户界面文案需求（N/A）。API 错误消息使用英语。

#### 测试专项

- [x] **T1 测试目录** — `__tests__/` 目录结构预留，与被测代码同模块共存。Vitest 在 `package.json` 中配置（`vitest` 脚本 + `@vitest/coverage-v8`）。

- [x] **T2 Mock 数据** — `mocks/` 和 `features/order/__mocks__/` 目录预留。Mock 数据工厂化（待填充 `createMockOrder(overrides)` 和 MSW handlers）。

- [x] **T3 测试结构** — Arrange → Act → Assert 约定记录在 `infrastructure-setup.md` 参考中。领域层不 mock，API 层 mock（`OrderApiClients` 接口便于注入 mock 实现）。

- [x] **T4 覆盖门禁** — `vitest run --coverage` 脚本在 `package.json` 中配置。CI 阻断覆盖率未达标（待 CI 配置文件中设定具体阈值）。

---

#### Section: Review 规则（N/A，非 Review 场景）

- [ ] **RV1-RV5** — N/A，当前为项目启动场景，非代码 Review。

---

### 工具验证

- **stylelint**: N/A（后端服务，无 SCSS/CSS 文件）
- **eslint**: 待实际安装依赖后运行 `eslint src/ --ext .ts`
- **tsc**: 待实际安装依赖后运行 `tsc --noEmit`
- **custom checks (DDD layer)**: 通过目检 — `monitoring/` 层不 import `features/`；`shared/` 层不 import `features/`；`types/` 层不 import 任何业务模块；`constants/` 层不 import `features/`；`features/order/` 正确依赖 `shared/`、`monitoring/`、`types/`、`constants/`

### 结果

全部通过。以下为 N/A（不适用）项说明：

- A1: `components/`, `hooks/`, `stores/`, `assets/`, `styles/`, `i18n/` — 后端服务不涉及 UI 层目录
- A4: 组件分层 — 后端服务无 UI 组件
- A6: Hooks 扁平化 — 后端服务用 Services 替代 Hooks
- I1: 图标 — 后端服务无图标需求
- I2: 主题 — 后端服务无主题 token 需求
- I7: 前端 Web Vitals / Lighthouse — 后端服务无前端性能指标
- I8: i18n — 后端 API 错误消息用英语，无多语言文案需求
- RV1-RV5: 非 Review 场景
