# Stripe 支付网关对接 需求规格说明

> 日期: 2026-06-25 | 作者: huyongle | 状态: 评审中

## 背景与动机

当前订单系统仅支持线下转账与支付宝国内收款，跨境客户（北美、欧洲、东南亚）无法在线完成支付，导致跨境订单流失率约 35%。同时现有支付流程无 SCA 合规能力，无法进入欧盟市场。需对接 Stripe 支付网关，支持信用卡、多币种收款与 3DS2 强认证，将跨境支付转化率提升至 95% 以上，并满足 PCI DSS SAQ-A 合规要求。

## 用户故事

| 编号 | 角色 | 故事 | 验收线索 |
|------|------|------|---------|
| US-1 | 普通用户 | 作为跨境购物的普通用户，我希望在结账页用信用卡完成支付，以便快速拿到订单商品 | FR-1, FR-2 |
| US-2 | 普通用户 | 作为跨境购物的普通用户，我希望支付失败时能清晰看到原因并重试，以便不用重新填写卡号 | FR-1, FR-5 |
| US-3 | 运营人员 | 作为运营人员，我希望在后台查询任意订单的支付状态与流水号，以便回答客户咨询 | FR-4 |
| US-4 | 财务人员 | 作为财务人员，我希望每日收到对账报表，以便核对 Stripe 结算与系统订单金额 | FR-6, 非功能性-可维护性 |
| US-5 | 合规审计员 | 作为合规审计员，我希望所有支付操作有审计日志可追溯，以便应对 PCI 与税务审计 | 非功能性-安全 |
| US-6 | 运维工程师 | 作为运维工程师，我希望支付服务有监控告警与降级开关，以便在 Stripe 故障时快速响应 | 非功能性-可维护性 |
| US-7 | 客服人员 | 作为客服人员，我希望能在后台发起退款并查看退款状态，以便处理客户投诉 | FR-3 |

### 目标

- 支持信用卡（Visa/Mastercard/Amex）在线支付，覆盖北美、欧洲、东南亚主要市场
- 满足 SCA/PS2 合规，支持 3DS2 强客户认证
- PCI DSS 合规范围降至 SAQ-A（卡号不落我方服务器）
- 跨境支付成功率 ≥ 95%

### 非目标（明确不做的事）

- 不对接 Alipay 国内收单（本期仅 Stripe，Alipay 预留扩展点）
- 不实现 Stripe Connect 多商户分账（本期单商户模式）
- 不实现订阅与周期性扣款（本期仅一次性支付）
- 不实现 Stripe Issuing 发卡能力
- 不重构现有订单状态机（仅新增支付回调入口）

## 功能需求

### FR-1: 创建支付意图

- **描述**: 用户在结账页点击"去支付"时，后端调用 Stripe 创建 PaymentIntent，返回 client_secret 给前端
- **优先级**: P0
- **触发条件**: 用户在订单确认页点击"去支付"，订单状态为"待支付"
- **预期行为**: 后端生成 Idempotency-Key（UUID），调用 Stripe PaymentIntents.create，金额按订单币种传入，返回 client_secret；前端用 client_secret 初始化 Stripe.js Elements 收集卡号
- **边界条件**: 订单已支付则返回 409；订单已取消则返回 410；Stripe 返回 5xx 则降级返回 503 并记录告警

### FR-2: 支付回调处理

- **描述**: Stripe 通过 webhook 推送 payment_intent.succeeded 等事件，后端校验签名后更新订单状态
- **优先级**: P0
- **触发条件**: Stripe webhook 推送事件到 `/api/v1/payments/webhook`
- **预期行为**: 用 webhook secret 校验 Stripe-Signature 头（HMAC-SHA256 + 时间戳），解析事件类型，幂等更新订单状态（succeeded→已支付，payment_failed→支付失败），返回 200
- **边界条件**: 签名校验失败返回 400；事件已处理（幂等命中）返回 200 但不重复更新；订单状态机不允许的转换忽略并记录告警

### FR-3: 退款

- **描述**: 客服/财务在后台对已支付订单发起退款，支持部分退款
- **优先级**: P1
- **触发条件**: 后台用户点击"退款"并输入金额（≤ 已支付金额）
- **预期行为**: 调用 Stripe Refunds.create，传入 PaymentIntent id 与金额，记录退款流水；webhook 收到 charge.refunded 后更新订单状态为"部分退款"或"全额退款"
- **边界条件**: 退款金额超过已支付金额返回 422；订单未支付返回 409；Stripe 退款失败记录原因并提示重试

### FR-4: 支付状态查询

- **描述**: 运营/客服在后台查询订单支付详情，含 PaymentIntent id、状态、流水、退款记录
- **优先级**: P1
- **触发条件**: 后台用户进入订单详情页
- **预期行为**: 从本地数据库读取支付记录（不实时调 Stripe），返回结构化支付详情
- **边界条件**: 订单无支付记录返回空；数据权限校验失败返回 403

### FR-5: 支付失败处理与重试

- **描述**: 支付失败时前端展示错误原因（卡被拒、3DS 失败、余额不足等），允许用户重试而不重填卡号
- **优先级**: P1
- **触发条件**: Stripe 返回 payment_intent.payment_failed 或前端 confirmCardPayment 抛错
- **预期行为**: 前端解析 Stripe 错误码（card_declined、insufficient_funds、authentication_required），展示友好文案；3DS 失败时引导重新认证；卡号不重置
- **边界条件**: 同一 PaymentIntent 重试次数 ≤ 5 次，超过则关闭订单并提示重新下单

### FR-6: 对账报表

- **描述**: 每日凌晨生成 Stripe 交易对账报表，供财务核对
- **优先级**: P2
- **触发条件**: 定时任务每日 02:00 触发
- **预期行为**: 调用 Stripe Balance Transactions API 拉取前日交易，与本地支付记录按 PaymentIntent id 对账，输出差异报表（金额不符、缺失记录）
- **边界条件**: Stripe API 限流时退避重试；对账差异 > 0.01 USD 告警财务

## 非功能性需求

### 性能

- 创建 PaymentIntent 接口 P99 < 500ms（含 Stripe 调用）
- Webhook 处理 P99 < 200ms（异步更新订单，不阻塞响应）
- 支付状态查询 P99 < 100ms（本地数据库）
- 支付服务 QPS 峰值 200（按大促预估）

### 安全

- Stripe 密钥（sk_live_）存于 KMS/Vault，禁止入库与日志
- Webhook 强制签名校验，时间戳容差 ≤ 5 分钟防重放
- 卡号经 Stripe.js iframe 直传 Stripe，我方服务器不接收不存储卡号
- 所有支付操作记录审计日志（操作人、时间、金额、PaymentIntent id），保留 ≥ 1 年
- 退款操作需 RBAC 权限校验（仅客服主管与财务）

### 可维护性

- 支付服务独立模块，与订单服务解耦，通过事件总线通信
- Stripe 配置（密钥、webhook secret、币种）通过配置中心管理，支持热更新
- 关键指标接入监控：支付成功率、webhook 处理延迟、Stripe API 错误率
- 降级开关：Stripe 故障时可一键关闭支付入口，展示"支付维护中"提示
- 日志含 traceId 贯穿订单→支付→Stripe 调用链

## 影响范围

| 模块 | 影响类型 | 说明 |
|------|---------|------|
| payment-service | 新增 | 支付服务模块，对接 Stripe |
| order-service | 修改 | 新增支付回调入口，订单状态机新增"支付中/已支付/退款中"状态 |
| frontend-checkout | 新增 | 结账页集成 Stripe.js Elements |
| admin-portal | 修改 | 订单详情页新增支付详情与退款操作 |
| finance-report | 新增 | 对账报表定时任务 |
| config-center | 修改 | 新增 Stripe 配置项 |

## 依赖与前置条件

- Stripe 商户账户已开通并完成 KYC（财务负责，截止 2026-07-01）
- 公网 HTTPS 端点可访问，域名证书有效（运维负责）
- 订单服务状态机扩展已完成（前置特性 ORDER-STATE-V2）
- 财务确认结算币种为 USD

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| Stripe 服务故障导致无法支付 | 低 | 高 | 降级开关 + 监控告警；预留 Alipay 扩展点 |
| Webhook 事件丢失或乱序 | 中 | 中 | 幂等处理 + 定时对账任务补偿 |
| 3DS 挑战导致转化率下降 | 中 | 中 | Radar 智能路由豁免低风险交易 |
| 密钥泄露 | 低 | 高 | KMS 托管 + 代码扫描 + 启动时注入 |
| 跨币种汇率波动影响对账 | 中 | 低 | 结算币种锁定 USD，差异阈值告警 |

## 验收标准

- [ ] 用户在结账页输入信用卡完成支付，订单状态在 10 秒内变为"已支付"（FR-1, FR-2）
- [ ] 支付失败时前端展示具体错误原因（card_declined/insufficient_funds/authentication_required），且卡号不重置可重试（FR-5）
- [ ] 客服在后台对已支付订单发起部分退款，退款金额正确到账，订单状态更新为"部分退款"（FR-3）
- [ ] 运营在后台订单详情页可查看 PaymentIntent id、支付状态、流水号、退款记录（FR-4）
- [ ] 创建 PaymentIntent 接口 P99 延迟 < 500ms（压测 200 QPS 持续 10 分钟）（非功能性-性能）
- [ ] Webhook 签名校验失败时返回 400 且不更新订单状态（非功能性-安全）
- [ ] 卡号不出现在我方服务器日志与数据库（PCI SAQ-A 合规）（非功能性-安全）
- [ ] Stripe 故障时降级开关可在 1 分钟内关闭支付入口（非功能性-可维护性）
- [ ] 每日对账报表在 02:30 前生成，差异 > 0.01 USD 触发告警（FR-6）
- [ ] 所有支付与退款操作有审计日志，含操作人、时间、金额（非功能性-安全）

## 调研依据

### 技术可行性

| 调研项 | 结论 | 来源 | 可信度 |
|--------|------|------|--------|
| Stripe PaymentIntent 三步流程满足 SCA | 可行，原生支持 3DS2 | Context7 stripe-java 文档 / Stripe Docs | 高 |
| Stripe.js + Elements 将 PCI 降至 SAQ-A | 可行，卡号经 iframe 直传 Stripe | Stripe Docs / PCI SSC | 高 |
| stripe-java SDK 兼容 Spring Boot 3.x | 可行，v26.x+ 兼容 Java 17 | Maven Central / Context7 | 高 |
| Webhook 签名验证接入现有过滤器链 | 可行，Webhook.constructEvent | GitHub stripe-java | 高 |

### 业界方案参考

| 调研项 | 参考项目/文章 | 关键发现 |
|--------|-------------|---------|
| 跨境支付网关选型 | [stripe-samples/accept-a-payment](https://github.com/stripe-samples/accept-a-payment) | PaymentIntent 流程是 Stripe 推荐的 SCA 合规接入方式 |
| Webhook 事件处理模式 | [Stripe Webhooks Docs](https://docs.stripe.com/webhooks) | 幂等 + 状态机驱动是处理乱序事件的标准模式 |
| 支付对账方案 | [Stripe Balance Transactions API](https://docs.stripe.com/reports) | 每日拉取 Balance Transactions 与本地记录对账可行 |

### 性能/安全基准

| 调研项 | 业界基准 | 本项目目标 |
|--------|---------|-----------|
| 创建 PaymentIntent P99 延迟 | 300ms（Stripe Status） | < 500ms（含业务逻辑） |
| 支付成功率 | 95%+（含 3DS，Stripe Sigma） | ≥ 95% |
| PCI 合规范围 | SAQ-A（用 Elements） | SAQ-A |

### 已知风险/坑点

| 风险 | 来源 | 缓解措施 |
|------|------|---------|
| Webhook 事件乱序 | [GitHub stripe-java issues](https://github.com/stripe/stripe-java/issues) | 以 PaymentIntent 状态机为准，事件仅触发 |
| Idempotency-Key 未传导致重复扣款 | Stack Overflow | 强制在 PaymentService 入口生成 UUID |
| 密钥硬编码泄露 | GitHub 代码扫描 | KMS 托管 + 启动时注入 |

## 参考资料

- [Stripe API Reference](https://docs.stripe.com/api)
- [Stripe PaymentIntent Docs](https://docs.stripe.com/payments/payment-intents)
- [Stripe Webhooks Guide](https://docs.stripe.com/webhooks)
- [Stripe Pricing](https://stripe.com/pricing)
- [stripe-java SDK](https://github.com/stripe/stripe-java)
- [PCI DSS SAQ-A Guide](https://www.pcisecuritystandards.org/)
- [Alipay OpenAPI（对比参考）](https://opendocs.alipay.com/)
- Context7: stripe-java v26.x API 文档
- GitHub: stripe/stripe-java、stripe-samples/accept-a-payment
- WebSearch: Stripe 跨境支付费率与结算周期对比
- Stack Overflow: Stripe webhook 事件乱序与幂等处理
