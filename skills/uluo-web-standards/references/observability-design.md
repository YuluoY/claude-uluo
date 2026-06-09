# 可观测性设计

运行时系统的三个信号：埋点、日志、追踪。外加前端专属的 RUM 和 Web Vitals。

> 参考：[OpenTelemetry](https://opentelemetry.io/)、[Google Core Web Vitals](https://web.dev/vitals/)
> 基础设施搭建见 `references/infrastructure-setup.md`。

---

## 目录

- [三信号模型](#three-signals-model)
- [一、埋点设计](#telemetry-design)
  - [事件模型](#event-model)
  - [埋点时机](#telemetry-timing)
  - [声明式 vs 命令式](#declarative-vs-imperative)
- [二、日志设计](#logging-design)
  - [结构化日志](#structured-logging)
  - [日志级别](#log-levels)
  - [原则](#logging-principles)
- [三、性能指标](#performance-metrics)
  - [后端最少指标（RED 法）](#backend-red-metrics)
  - [前端 Web Vitals](#frontend-web-vitals)
  - [关键路径打点](#critical-path-instrumentation)
- [四、分布式追踪](#distributed-tracing)
  - [Trace ID 生命周期](#trace-id-lifecycle)
  - [采样策略](#sampling-strategy)
  - [Span 设计](#span-design)
  - [传递](#propagation)
- [五、OpenTelemetry](#opentelemetry)
- [六、前端 RUM（Real User Monitoring）](#frontend-rum)
  - [采集内容](#rum-collection)
  - [工具](#rum-tools)
- [七、告警](#alerting)
- [加载规则](#loading-rules)

## 三信号模型

| 信号 | 回答 | 优势 | 廉价存储？ |
|------|------|------|:---:|
| **Metrics**（指标） | "发生了什么？" | 告警、趋势、聚合 | ✅ |
| **Logs**（日志） | "为什么发生？" | 上下文、审计 | ❌ |
| **Traces**（追踪） | "在哪里发生？" | 因果链、耗时分解 | ❌ |

**黄金流程：** Metric 告警 → 点进 Trace 查看慢在哪里 → Span 里找到 traceId → 用 traceId 搜日志 → 几 分钟定位根因。

---

## 一、埋点设计

回答"用户做了什么"和"系统发生了什么"。

### 事件模型

```typescript
{
  event: "order_submitted",          // what — snake_case 过去式
  userId: "u_123",                   // who
  timestamp: 1713427200000,          // when (ms)
  sessionId: "s_456",                // 串联同一会话
  traceId: "abc123...",              // 串联后端追踪
  context: {                         // where — 业务上下文
    orderId: "ord_456",
    itemCount: 3,
    totalAmount: 128.50,
    source: "mini_program"
  }
}
```

**原则：**
- 事件名 `snake_case` 过去式（`page_viewed`、`payment_completed`）
- 相同业务动作在不同入口触发同一事件，靠 `context.source` 区分
- 不埋敏感数据（密码、身份证号、手机号明文）
- 不埋可推导数据——能从已有字段算出的就不新增字段
- `sessionId` 和 `traceId` 每条事件必带

### 埋点时机

- 用户完成 UI 动作（点击、提交、搜索）→ 前端埋
- 业务状态变更（订单创建、支付成功、审批通过）→ 后端埋
- 外部系统回调（支付回调、消息到达）→ 接收端埋
- 不重复埋——前后端选一个，有交叉时优先后端（数据更可靠）

### 声明式 vs 命令式

优先声明式——组件/函数上加装饰器或属性声明，不手写 `track()` 散落业务逻辑：

```typescript
// ✅ 声明式
@TrackEvent('button_clicked', { button: 'submit_order' })
async function submitOrder()
{
  // 业务逻辑...
}

// ❌ 命令式
async function submitOrder()
{
  track('button_clicked', { button: 'submit_order' })
  // 业务逻辑...
}
```

---

## 二、日志设计

回答"系统运行时发生了什么"。结构化、可搜索、按级别分类。

### 结构化日志

每条日志 JSON 格式，携带统一基础字段 + 本条特定上下文：

```json
{
  "timestamp": "2025-04-25T10:23:45.123Z",
  "level": "INFO",
  "service": "order-service",
  "traceId": "abc123...",
  "spanId": "def456...",
  "userId": "u_456",
  "message": "order submitted",
  "context": {
    "orderId": "ord_789",
    "itemCount": 3
  }
}
```

**必须携带：** `timestamp`、`level`、`service`、`traceId`。`spanId`、`userId` 和 `context` 按场景附加。

### 日志级别

| 级别 | 含义 | 触发场景 | 动作 |
|------|------|----------|------|
| DEBUG | 开发调试 | 循环体内、中间计算结果 | 生产环境关闭 |
| INFO | 关键业务节点 | 下单、支付、退款、外部调用 | 仅记录 |
| WARN | 异常但可恢复 | 重试、降级、超时一次成功 | 关注趋势 |
| ERROR | 需人工介入 | 支付失败、DB 断连、断言违反 | 立即告警 |

### 原则

- 不用 `console.log`——走统一 Logger（winston / pino），方便切换输出（文件、ElasticSearch、CLS）
- 一行日志 = 一个事件。不把多个事件的上下文堆在一行
- 日志用英语
- 不用日志记录纯读查询（除非 DEBUG 模式）
- **敏感数据脱敏**：密码、Token、身份证号、银行卡号不入日志，不写明文

---

## 三、性能指标

回答"系统快不快"和"哪里慢了"。

### 后端最少指标（RED 法）

| 指标 | 含义 | 采集 |
|------|------|------|
| Rate（QPS） | 每秒请求数 | 中间件计数 |
| Error（错误率） | 5xx / 总请求 | 中间件计数 |
| Duration（延迟） | P50 / P95 / P99 | 中间件打点 |

### 前端 Web Vitals

| 指标 | 含义 | 阈值 |
|------|------|------|
| **LCP** | 最大内容绘制 | ≤ 2.5s |
| **INP** | 交互到下次绘制（替代 FID） | ≤ 200ms |
| **CLS** | 累计布局偏移 | ≤ 0.1 |

INP 在 2024 年正式替代 FID——它衡量**整个会话所有交互**的延迟，不再只看首次。

### 关键路径打点

不是所有函数都需要监控——只在关键路径上手动打点：

- 数据库慢查询（>200ms）
- 外部 API 调用耗时和响应状态
- 复杂业务计算（价格引擎、匹配算法）
- 消息队列消费延迟

不要在高基数维度上建指标（如 `user_id`），用 `user_tier` 等聚合维度替代。

---

## 四、分布式追踪

回答"一个请求经过了哪些环节"。

### Trace ID 生命周期

```
用户请求 → [Gateway 注入 traceId]
  → Service A: 处理 + 打日志(带 traceId) + 记录 Span
    → Service B: 从 header 提取 traceId + 子 Span
      → DB 查询: Span 记录 SQL + 耗时
    → 返回 B
  → 返回 A
→ 返回用户
```

### 采样策略

| 策略 | 原理 | 适用 |
|------|------|------|
| 头部采样 | 请求入口按概率决定 | 简单，但可能漏掉有趣的 trace |
| **尾部采样** | 缓冲全部 span，结束后按条件保留 | 生产推荐：100% 保留 error + 慢请求 + 随机抽 |

### Span 设计

- 跨服务调用 → 一个 span
- 数据库/缓存操作 → 一个 span
- 消息队列生产/消费 → 一个 span
- **不叫 span**：纯内存计算、if/else 判断

### 传递

- traceId 在 Gateway 生成，通过 HTTP header `X-Trace-Id` 或 `traceparent`（W3C 标准）向下游传播
- 每个服务在入口提取，出口携带
- 前端 RUM SDK 在请求头注入 traceId，和后端串联成一整条链路

---

## 五、OpenTelemetry

[OpenTelemetry](https://opentelemetry.io/) 是业界统一的遥测数据采集标准。一次埋点，导出到任意兼容后端（Datadog / Grafana / Jaeger / SigNoz）。

```
Application → OTel SDK → OTel Collector（可选）→ 后端
```

- **OTel SDK**：代码内埋点（logs、metrics、traces）
- **OTel Collector**：接收、处理、导出。可做脱敏、采样、路由——不改应用代码

---

## 六、前端 RUM（Real User Monitoring）

### 采集内容

| 类别 | 内容 |
|------|------|
| 页面性能 | LCP、INP、CLS、TTFB、FCP |
| JS 错误 | 未捕获异常、Promise rejection、sourcemap 还原 |
| 网络请求 | 慢 API、失败 API、响应时间 |
| 用户行为 | 页面浏览、点击、session 时长 |
| 资源加载 | 慢图片、慢字体、阻塞脚本 |

### 工具

- `web-vitals` 库采集 Core Web Vitals
- 自建 RUM SDK 或使用 Grafana Faro、Sentry、Datadog RUM
- 错误上报附带 `userId`、`sessionId`、`url`、`userAgent`、sourcemap 信息

---

## 七、告警

- **告警不等于 on-call。** 区分 P0（凌晨叫醒）和 P2（明天处理）
- 阈值不要拍脑袋——上线观察至少一周再定
- 基于 SLO 设告警（如"错误率 >0.1% 持续 5 分钟"），不基于绝对值
- 告警必须附带 runbook 链接——值班人不需要推理

---

## 加载规则

此文件在以下场景加载：

- 新项目启动、基础设施搭建阶段
- 设计埋点规范、日志格式、告警策略时
- Code Review 发现日志/埋点不合规时
- 排查线上问题时作为检查清单
