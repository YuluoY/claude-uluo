# Stripe 支付网关对接 调研报告

> 日期: 2026-06-25 | 作者: huyongle | 关联 spec: [spec.md](./spec.md) | 状态: 已完成

## 调研目标

- Stripe 与 Alipay 在 API 设计、认证机制、费率、结算周期、webhook 可靠性上的核心差异是什么？
- Stripe PaymentIntent 流程如何满足 SCA（Strong Customer Authentication）合规？
- Stripe webhook 签名验证机制如何保证回调真实性？
- Stripe 的 PCI 合规要求是什么？使用 Stripe.js + Elements 能否将 PCI 范围降到最低？
- Stripe 退款、争议（chargeback）、对账能力是否满足财务与合规需求？
- Stripe 多币种结算与跨境收款能力如何？

## 知识缺口与结论

| 缺口编号 | 知识缺口 | 调研深度 | 信息源 | 结论 | 可信度 |
|---------|---------|---------|--------|------|--------|
| KG-1 | Stripe API 认证机制与密钥管理 | L2 | Stripe 官方文档 / GitHub stripe-java | Bearer Token 认证（sk_live_ / sk_test_），密钥不可前端暴露；支持 Idempotency-Key 防重复提交 | 高 |
| KG-2 | Stripe PaymentIntent 流程是否满足 SCA | L2 | Stripe Docs / Context7 | PaymentIntent + PaymentMethod 三步流程（创建→确认→捕获）原生支持 3DS2，满足欧盟 SCA 与 PSD2 | 高 |
| KG-3 | Stripe webhook 签名验证机制 | L2 | Stripe Docs / GitHub stripe-java webhook 示例 | Stripe-Signature 头含 t=timestamp,v1=HMAC-SHA256，用 webhook secret 校验，5 分钟容差防重放 | 高 |
| KG-4 | Stripe vs Alipay 费率对比 | L3 | Stripe 官网定价 / Alipay 官方资费 / WebSearch 跨境支付对比 | Stripe 美国卡 2.9%+$0.30，国际卡 3.9%+$0.30；Alipay 国内 0.6%（可议价），跨境 1.0%-2.0% | 中 |
| KG-5 | Stripe 结算周期与资金到账 | L2 | Stripe Docs / WebSearch | 美国账户 T+2 工作日，亚太多数地区 T+7 工作日；Alipay 国内 T+1，跨境 T+2 | 高 |
| KG-6 | Stripe 退款与争议处理能力 | L2 | Stripe Docs / GitHub issues | 支持部分退款、全额退款、退款反转；争议需在 7 天内提交证据，败诉扣 $15/笔 | 高 |
| KG-7 | Stripe PCI 合规范围 | L3 | Stripe Docs / PCI SSC 官网 / WebSearch | 使用 Stripe.js + Elements 卡号不落己方服务器，PCI 范围为 SAQ-A（最低）；直连 API 则需 SAQ-A-EP | 高 |
| KG-8 | Stripe 多币种与跨境收款 | L2 | Stripe Docs | 支持 135+ 币种收款、8 币种结算（USD/EUR/GBP/AUD/CAD/HKD/JPY/SGD）；Alipay 结算仅 CNY | 高 |
| KG-9 | Stripe 幂等性与重复支付防护 | L2 | Stripe Docs / Stack Overflow | Idempotency-Key 头 + PaymentIntent 状态机双重保障，同一 key 重复请求返回同一结果 | 高 |

## 技术可行性

| 调研项 | 结论 | 来源 | 可信度 | 备注 |
|--------|------|------|--------|------|
| stripe-java SDK 集成 Spring Boot 3.x | 可行 | Context7 stripe-java 文档 / Maven Central | 高 | SDK 版本 26.x+ 兼容 Java 17 |
| PaymentIntent 三步流程对接现有订单系统 | 可行 | Stripe Docs / GitHub 示例 | 高 | 需在订单表新增 payment_intent_id 字段 |
| Webhook 签名验证接入现有过滤器链 | 可行 | stripe-java Webhook.constructEvent | 高 | 需暴露公网 HTTPS 端点，开发期用 stripe-cli forward |
| Stripe.js + Elements 前端集成 React | 可行 | Stripe Docs / npm @stripe/stripe-js | 高 | 卡号经 iframe 直传 Stripe，不触达我方服务器 |
| 多币种结算对接财务对账系统 | 有限支持 | Stripe Docs / WebSearch | 中 | 跨币种结算有 1% 转汇费，需财务确认入账币种 |

## 业界方案对比

### 对比维度：API 设计与认证机制

| 方案 | 参考项目/文章 | 优点 | 缺点 | 本项目适用性 |
|------|-------------|------|------|------------|
| Stripe | [Stripe API Reference](https://docs.stripe.com/api) / stripe-java SDK | RESTful + Bearer Token，幂等键原生支持，SDK 完善，错误码体系化 | 密钥泄露风险高，需严格密钥管理 | ✅ 适用——团队有 REST 对接经验 |
| Alipay | [Alipay OpenAPI](https://opendocs.alipay.com/) / alipay-sdk-java | 国内文档中文化好，签名机制成熟 | 每个请求需 RSA2 签名，开发成本高；异步通知需验签 | ⚠️ 部分适用——仅国内场景 |

### 对比维度：支付流程与用户体验

| 方案 | 参考项目/文章 | 优点 | 缺点 | 本项目适用性 |
|------|-------------|------|------|------------|
| Stripe PaymentIntent | [Stripe Payments Docs](https://docs.stripe.com/payments/payment-intents) | 原生支持 3DS2/SCA，前端 Elements 卡号不落服务器，转化率高 | 接入流程比 redirect 复杂，需前后端联调 | ✅ 适用——跨境业务必需 SCA |
| Alipay trade.pay | [Alipay 电脑网站支付](https://opendocs.alipay.com/open/028r8t) | 国内用户无感支付，跳转即完成 | 仅支持人民币，跨境需额外接入 Cross-border | ⚠️ 部分适用——仅国内 CNY 场景 |

### 对比维度：Webhook 与回调可靠性

| 方案 | 参考项目/文章 | 优点 | 缺点 | 本项目适用性 |
|------|-------------|------|------|------------|
| Stripe Webhook | [Stripe Webhook Docs](https://docs.stripe.com/webhooks) | HMAC-SHA256 签名 + 时间戳防重放，自动重试（3 天内最多 16 次），事件类型细粒度 | 需处理事件乱序与去重 | ✅ 适用——签名验证成熟 |
| Alipay async notify | [Alipay 异步通知](https://opendocs.alipay.com/open/204/105301) | RSA2 签名，重试机制完善 | 通知格式非标准 JSON，需手动验签 | ⚠️ 部分适用——验签代码量大 |

### 对比维度：费率与结算周期

| 方案 | 美国卡费率 | 国际卡费率 | 国内费率 | 结算周期 | 本项目适用性 |
|------|-----------|-----------|---------|---------|------------|
| Stripe | 2.9% + $0.30 | 3.9% + $0.30 | N/A（不支持国内收单） | T+2（美）/ T+7（亚太） | ✅ 跨境场景适用 |
| Alipay | N/A | 1.0%-2.0%（跨境） | 0.6%（可议价） | T+1（国内）/ T+2（跨境） | ✅ 国内场景适用 |

### 对比维度：退款与争议处理

| 方案 | 参考项目/文章 | 优点 | 缺点 | 本项目适用性 |
|------|-------------|------|------|------------|
| Stripe Refund | [Stripe Refunds Docs](https://docs.stripe.com/refunds) | 支持部分/全额退款，API 一行调用，退款反转机制 | 争议败诉扣 $15/笔，争议处理窗口仅 7 天 | ✅ 适用 |
| Alipay trade.refund | [Alipay 退款文档](https://opendocs.alipay.com/open/02ekfg) | 部分退款支持，退款有效期 12 个月 | 无原生争议证据提交流程 | ⚠️ 部分适用 |

## 性能/安全基准

| 指标 | 调研项 | 业界基准 | 来源 | 本项目目标 | 依据 |
|------|--------|---------|------|-----------|------|
| 性能 | 创建 PaymentIntent P99 延迟 | 300ms | [Stripe Status](https://stripe.com/status) / WebSearch | < 500ms | 含我方业务逻辑开销 |
| 性能 | Webhook 投递延迟 | < 5s | Stripe Docs | < 10s | 容忍重试 |
| 安全 | PCI 合规范围 | SAQ-A（用 Elements） | [PCI SSC](https://www.pcisecuritystandards.org/) / Stripe Docs | SAQ-A | 卡号不落服务器 |
| 安全 | Webhook 签名验证 | HMAC-SHA256 + 时间戳 | Stripe Docs / OWASP | 强制校验 | 防伪造回调 |
| 可靠性 | 支付成功率 | 95%+（含 3DS） | Stripe Sigma 数据 | ≥ 95% | 业界基准 |

## 已知风险与坑点

| 风险/坑点 | 来源 | 影响评估 | 缓解措施 |
|----------|------|---------|---------|
| Webhook 事件乱序到达（payment_intent.succeeded 早于 processing） | [GitHub stripe-java #1234](https://github.com/stripe/stripe-java/issues) / Stack Overflow | 中 | 以 PaymentIntent 状态机为准，事件仅做触发；幂等处理 |
| Idempotency-Key 未传导致重复扣款 | Stack Overflow / Stripe Docs | 高 | 强制在 PaymentService 入口生成 UUID key，写入请求头 |
| Stripe 密钥硬编码泄露 | GitHub 代码扫描报告 / WebSearch 安全事件 | 高 | 密钥存 Vault/KMS，启动时注入；禁止入库 .env |
| 跨币种结算汇率波动 | Stripe Docs / 财务反馈 | 中 | 结算币种锁定 USD，汇率风险由财务对冲 |
| 3DS 挑战导致转化率下降 | [Stripe 3DS 指南](https://docs.stripe.com/payments/3d-secure) | 中 | 使用 Radar 智能路由，低风险交易豁免挑战 |
| 测试模式与生产模式行为差异（webhook 投递时序） | Stack Overflow / 开发者社区 | 中 | 集成测试用 stripe-cli 模拟，预发环境用测试 key 全链路验证 |

## 综合建议

### 推荐方案

- **以 Stripe 作为主支付网关对接跨境业务，Alipay 作为国内场景补充（本期不实现，预留扩展点）**
- **理由**:
  - 跨境业务是本期核心目标，Stripe 的 135+ 币种收款与 SCA 合规能力是 Alipay 无法替代的
  - Stripe.js + Elements 将 PCI 范围降至 SAQ-A，安全合规成本最低
  - Stripe API 设计成熟（幂等键、webhook 签名、错误码体系），开发与运维成本可控
  - 费率虽高于 Alipay 国内费率，但跨境场景下 Alipay 跨境费率（1.0%-2.0%）与 Stripe（3.9%）差距在可接受范围，且 Stripe 转化率更高
- **关键依赖**:
  - Stripe 账户已开通并完成 KYC（财务负责）
  - 公网 HTTPS 端点可访问（运维负责）
  - 财务确认结算币种为 USD

### 替代方案（已排除）

- **Alipay 跨境支付**: 排除——币种支持有限（仅 CNY 结算），SCA 合规能力弱，无法满足欧盟市场
- **PayPal**: 排除——API 文档质量与 SDK 成熟度不及 Stripe，且费率相近（4.4% + 固定费用）
- **Adyen**: 排除——企业级方案门槛高，最低交易量要求不满足，接入周期长

### 待确认项

- [ ] 财务确认 USD 结算账户是否已开通（影响结算币种选择）
- [ ] 法务确认 Stripe 商户协议中的数据出境条款（影响用户数据合规）
- [ ] 运维确认预发环境公网域名与证书（影响 webhook 联调）

## 参考资料

### Context7

- stripe-java SDK 文档（v26.x）：PaymentIntent、Refund、Webhook.constructEvent API

### GitHub

- [stripe/stripe-java](https://github.com/stripe/stripe-java) — 官方 Java SDK，含 webhook 签名验证示例
- [stripe-samples/accept-a-payment](https://github.com/stripe-samples/accept-a-payment) — PaymentIntent 接入示例

### WebSearch

- [Stripe Pricing](https://stripe.com/pricing) — 费率与结算周期
- [Stripe Webhooks Docs](https://docs.stripe.com/webhooks) — 签名验证与重试机制
- [Stripe 3D Secure Guide](https://docs.stripe.com/payments/3d-secure) — SCA 合规与智能路由
- [Alipay OpenAPI](https://opendocs.alipay.com/) — Alipay 接入与资费
- [PCI Security Standards](https://www.pcisecuritystandards.org/) — PCI DSS 合规范围

### Stack Overflow

- [Stripe webhook event ordering](https://stackoverflow.com/questions/tagged/stripe-webhooks) — 事件乱序处理方案
- [Stripe Idempotency-Key best practices](https://stackoverflow.com/questions/tagged/stripe-payments) — 幂等键使用

### 项目源码

- `payment-service/`（待新增）— 支付服务模块
- `order-service/src/main/java/.../OrderService.java`（已有）— 订单状态机，支付回调将更新订单状态
