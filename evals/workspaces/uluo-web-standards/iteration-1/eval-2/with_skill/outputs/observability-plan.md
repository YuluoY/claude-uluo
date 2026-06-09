# 订单服务 — 可观测性方案设计

## 一、三信号总览

| 信号 | 目标 | 存储 | 保留期 |
|------|------|------|:---:|
| **Metrics**（指标） | QPS / 延迟 P50 P99 / 错误率 / 资源用量 | Prometheus / VictoriaMetrics | 30d |
| **Logs**（日志） | 业务审计、错误上下文、调试信息 | ElasticSearch / CLS | 30d |
| **Traces**（追踪） | 跨服务调用链、耗时分解 | Jaeger / Grafana Tempo | 7d |

**黄金流程：** Metric 告警 → 点进 Trace 查看慢在哪里 → Span 里找到 traceId → 用 traceId 搜日志 → 分钟级定位根因。

---

## 二、日志设计

### 2.1 日志库选型

选用 **pino**（Node.js 最高性能的结构化日志库），封装为 `monitoring/logger.ts`。

### 2.2 结构化日志格式

```json
{
  "timestamp": "2026-06-08T10:23:45.123Z",
  "level": "INFO",
  "service": "order-service",
  "traceId": "abc123...",
  "spanId": "def456...",
  "userId": "u_456",
  "message": "order submitted",
  "context": {
    "orderId": "ord_789",
    "itemCount": 3,
    "totalAmount": 128.50
  }
}
```

必带字段：`timestamp`、`level`、`service`、`traceId`。

### 2.3 日志级别策略

| 级别 | 触发场景 | 生产环境 | 告警 |
|------|---------|:---:|:---:|
| DEBUG | 循环体内、中间计算结果、开发调试 | 关闭 | 否 |
| INFO | 下单、支付、退款、外部服务调用 | 开启 | 否 |
| WARN | 重试成功、降级触发、接近限流阈值 | 开启 | 关注趋势 |
| ERROR | 支付失败、DB 断连、外部服务不可用 | 开启 | 立即告警 |

### 2.4 关键业务节点日志打点

| 节点 | 级别 | 携带信息 |
|------|:---:|---------|
| 请求到达 | INFO | traceId, method, path, userId |
| 调用用户服务 | INFO | traceId, userId, duration |
| 调用库存服务 | INFO | traceId, items, duration |
| 调用支付服务 | INFO | traceId, amount, orderId, duration |
| 订单创建成功 | INFO | traceId, orderId, userId, amount |
| 库存不足 | WARN | traceId, itemId, requestedQty, availableQty |
| 支付失败 | ERROR | traceId, orderId, reason, paymentGateway |
| 上游服务不可用 | ERROR | traceId, serviceName, statusCode |
| 请求完成 | INFO | traceId, statusCode, duration |

### 2.5 日志原则

- 禁止 `console.log` — eslint `no-console` 阻断，统一走 Logger
- 一行日志 = 一个事件，不把多个事件的上下文堆在一行
- 日志用英语
- 不记录纯读查询（GET 请求数据），除非 DEBUG
- **敏感数据脱敏**：密码、Token、身份证号、银行卡号不入日志

---

## 三、埋点设计

### 3.1 事件模型

```typescript
interface TrackingEvent {
  event: string          // snake_case 过去式，如 "order_created"
  userId: string         // 操作人
  timestamp: number      // ms
  sessionId: string      // 串联同一会话
  traceId: string        // 串联后端追踪
  context: Record<string, unknown>  // 业务上下文
}
```

### 3.2 事件清单

| 事件名 | 触发时机 | context 关键字段 |
|--------|---------|-----------------|
| `order_created` | 订单创建成功 | orderId, itemCount, totalAmount, source |
| `order_payment_initiated` | 发起支付 | orderId, amount, paymentMethod |
| `order_payment_completed` | 支付成功 | orderId, amount, transactionId |
| `order_payment_failed` | 支付失败 | orderId, amount, reason |
| `order_cancelled` | 订单取消 | orderId, cancelReason |
| `order_refunded` | 订单退款 | orderId, refundAmount |
| `inventory_reserved` | 库存预留成功 | orderId, items |
| `inventory_released` | 库存释放 | orderId, items, reason |
| `external_call_failed` | 外部调用失败 | serviceName, endpoint, duration, statusCode |

### 3.3 原则

- 事件名 `snake_case` 过去式
- 不埋敏感数据
- 不埋可推导数据
- sessionId 和 traceId 每条事件必带
- 前后端同时覆盖的节点优先后端埋（数据更可靠）

---

## 四、分布式追踪设计

### 4.1 Trace ID 生命周期

```
用户请求 → [Gateway 注入 traceId / X-Trace-Id header]
  → order-service: 提取 traceId → 打日志(带 traceId) → 创建 Root Span
    → user-service: 从 header 提取 traceId → 创建子 Span
    → payment-service: 从 header 提取 traceId → 创建子 Span
    → inventory-service: 从 header 提取 traceId → 创建子 Span
      → DB 操作: Span 记录 SQL + 耗时
```

### 4.2 Span 划分

| Span | 触发条件 |
|------|---------|
| `http.request` | 每个 HTTP 请求入口 |
| `external.user.get_user` | 调用用户服务获取用户信息 |
| `external.user.validate` | 调用用户服务校验用户状态 |
| `external.inventory.reserve` | 调用库存服务预留库存 |
| `external.inventory.release` | 调用库存服务释放库存 |
| `external.payment.create` | 调用支付服务创建支付 |
| `external.payment.query` | 调用支付服务查询支付状态 |
| `db.query` | 数据库操作 |

### 4.3 采样策略

采用**尾部采样**（100% 保留 error + 慢请求 >500ms + 随机 10%）：

- 正常快速请求：10% 随机采样
- ERROR/WARN 级别请求：100% 保留
- 慢请求（>500ms）：100% 保留

### 4.4 传递机制

- traceId 从 Gateway 层注入，通过 HTTP header `X-Trace-Id` 向下游传播
- spanId 在每层自动生成，记录父子关系
- 日志中自动附带 traceId + spanId

---

## 五、性能指标

### 5.1 RED 指标（最少四个）

| 指标 | 含义 | 采集方式 |
|------|------|---------|
| Rate（QPS） | 每秒请求数 | HTTP 中间件计数 |
| Error Rate | 5xx 错误 / 总请求 | HTTP 中间件计数 |
| Duration P50/P99 | 请求延迟分布 | HTTP 中间件打点 |
| External Call Duration | 外部服务调用延迟 | to() 工具内嵌打点 |

### 5.2 关键路径打点

- 外部 API 调用耗时和响应状态（所有三个下游服务）
- 订单创建完整链路耗时（从请求到响应）
- 复杂业务计算（如优惠叠加计算）

### 5.3 告警策略

| 条件 | 级别 | 动作 |
|------|:---:|------|
| 错误率 > 1% 持续 5 分钟 | P0 | 立即 on-call |
| P99 延迟 > 5s 持续 5 分钟 | P0 | 立即 on-call |
| 上游服务错误率 > 10% | P1 | 通知 + 检查熔断 |
| 错误率 > 0.5% 持续 10 分钟 | P1 | 通知处理 |
| 错误率 > 0.1% 持续 15 分钟 | P2 | 第二天处理 |

---

## 六、基础设施文件对照

| 文件 | 内容 |
|------|------|
| `src/monitoring/logger.ts` | Pino 封装，结构化日志输出 |
| `src/monitoring/tracker.ts` | 统一埋点函数，事件模型约束 |
| `src/monitoring/tracer.ts` | OpenTelemetry SDK 封装，trace/span 管理 |
| `src/monitoring/metrics.ts` | RED 指标采集，关键路径打点 |
| `src/monitoring/errors.ts` | 异常类层级 + 边界转换函数 |
| `src/monitoring/index.ts` | 聚合导出 |
