# 订单服务 — 错误处理策略设计

## 一、设计目标

订单服务调用三个外部依赖（用户服务、支付服务、库存服务），所有远程调用的失败需要被统一处理、分层转换、可追溯。

## 二、错误分层模型

```
interface 层（Controller/API Handler）
    ↑ 转换为 HTTP 状态码 + ApiError 信封
application 层（Service/UseCase）
    ↑ 转换为领域异常，隐藏第三方细节
domain 层（Domain Logic）
    ↑ 抛出 DomainError，语义化错误码
infrastructure 层（外部调用）
```

### 2.1 分层转换规则

| 层级 | 抛出的异常类型 | 职责 |
|------|--------------|------|
| Domain | `DomainError` + 语义化 code | 表达业务规则违反（如库存不足、订单状态不允许支付） |
| Application | 消费 DomainError，转换重抛或处理 | 编排业务流程，不直接抛出第三方异常 |
| Infrastructure | 原始第三方错误 + 立即包装 | HttpClient 层统一包装 AxiosError/fetch Error 为 HttpError |
| Interface | 消费上层异常，转换为 HTTP 响应 | 将 DomainError/HttpError 映射为 HTTP 状态码 + ApiError 信封 |

### 2.2 错误分类

#### 领域错误（DomainError）

```typescript
type OrderErrorCode =
  | 'INSUFFICIENT_INVENTORY'    // 库存不足
  | 'ORDER_STATUS_CONFLICT'     // 订单状态不允许当前操作
  | 'PAYMENT_AMOUNT_MISMATCH'   // 支付金额与订单金额不一致
  | 'USER_NOT_FOUND'            // 用户不存在
  | 'ORDER_NOT_FOUND'           // 订单不存在
  | 'DUPLICATE_ORDER'           // 重复订单（幂等性冲突）
  | 'PAYMENT_FAILED'            // 支付失败
```

#### 基础设施错误（InfrastructureError）

```typescript
type InfraErrorCode =
  | 'UPSTREAM_SERVICE_UNAVAILABLE'  // 上游服务不可用
  | 'UPSTREAM_TIMEOUT'              // 上游超时
  | 'NETWORK_ERROR'                 // 网络错误
  | 'DATABASE_ERROR'                // 数据库错误
  | 'RATE_LIMITED'                  // 被限流
```

## 三、错误处理流程

### 3.1 外部调用 — await-to-js 元组模式

每个异步调用通过 `to()` 解包为 `[error, data]` 元组，错误和成功在同一缩进层级处理：

```typescript
const [err, user] = await to(userServiceClient.getUser(userId))
if (err) {
  return handleError(err)  // 集中转换处理
}
// user 可用，继续业务流程
```

### 3.2 Service 层全局错误兜底

Service 层每个公开方法入口统一捕获，确保不向上泄漏未处理的异常：

```typescript
async createOrder(payload: CreateOrderPayload): Promise<ApiResponse<Order>> {
  // 1. 参数校验 — Fail Fast
  // 2. 调用外部服务 — to() 元组
  // 3. 领域逻辑 — DomainError
  // 4. 返回成功信封
}
```

### 3.3 幂等性保障

POST 创建操作携带 `Idempotency-Key` header，防重放：

- 网络超时 → 用户重试 → service 检查 idempotency key → 返回缓存结果
- 缓存过期（24h）→ 按正常流程处理

## 四、外部服务调用错误处理策略

### 4.1 用户服务

| 场景 | 错误码 | 处理策略 |
|------|--------|---------|
| 用户不存在 | `USER_NOT_FOUND` | 返回 404 |
| 用户服务超时 | `UPSTREAM_TIMEOUT` | 重试 2 次，指数退避 |
| 用户服务不可用 | `UPSTREAM_SERVICE_UNAVAILABLE` | 熔断，降级返回缓存 |

### 4.2 支付服务

| 场景 | 错误码 | 处理策略 |
|------|--------|---------|
| 支付失败（余额不足等） | `PAYMENT_FAILED` | 返回 422 + 具体原因 |
| 支付服务超时 | `UPSTREAM_TIMEOUT` | 重试 1 次（支付幂等性由支付服务保证） |
| 支付回调未到达 | N/A | 主动查询支付状态（scheduled job） |

### 4.3 库存服务

| 场景 | 错误码 | 处理策略 |
|------|--------|---------|
| 库存不足 | `INSUFFICIENT_INVENTORY` | 返回 409 + 可用库存数 |
| 库存服务超时 | `UPSTREAM_TIMEOUT` | 重试 2 次 |
| 库存预留冲突 | `ORDER_STATUS_CONFLICT` | 返回 409，建议用户刷新 |

## 五、错误转换表（Error → HTTP Response）

| 异常类型 | HTTP 状态码 | error.code |
|---------|:----------:|-----------|
| `DomainError(code: INSUFFICIENT_INVENTORY)` | 409 | `INSUFFICIENT_INVENTORY` |
| `DomainError(code: ORDER_STATUS_CONFLICT)` | 409 | `ORDER_STATUS_CONFLICT` |
| `DomainError(code: PAYMENT_FAILED)` | 422 | `PAYMENT_FAILED` |
| `DomainError(code: USER_NOT_FOUND)` | 404 | `USER_NOT_FOUND` |
| `DomainError(code: ORDER_NOT_FOUND)` | 404 | `ORDER_NOT_FOUND` |
| `DomainError(code: DUPLICATE_ORDER)` | 409 | `DUPLICATE_ORDER` |
| `DomainError(code: PAYMENT_AMOUNT_MISMATCH)` | 422 | `PAYMENT_AMOUNT_MISMATCH` |
| `HttpError(status: 503)` | 502 | `UPSTREAM_SERVICE_UNAVAILABLE` |
| `HttpError(status: 504)` | 504 | `UPSTREAM_TIMEOUT` |
| 未预期 Error | 500 | `INTERNAL_ERROR` |

## 六、编码约束（MUST）

- 禁止空 catch 块 — eslint `no-empty` 阻断；每个 catch 至少做日志记录
- 异步操作用 `to()` 元组，不 try-catch 嵌套
- 第三方原始异常（如 AxiosError）只在 infrastructure 层消费，向上转换为 DomainError 或 ApiError
- 所有错误转换经过 `monitoring/errors.ts` 定义的转换函数
