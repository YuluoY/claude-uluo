# Stripe 支付网关对接 调研报告

> 日期: 2026-06-08 | 作者: AI Researcher | 关联 spec: [spec.md](./spec.md) | 状态: 已完成

## 调研目标

- 问题 1: Stripe API 模型是怎样的？与支付宝对接模式的差异在哪里？
- 问题 2: Spring Boot + MyBatis 项目如何与 Stripe Java SDK 集成？
- 问题 3: 已对接支付宝的情况下，如何设计统一的多支付网关架构？
- 问题 4: Stripe 的异步通知/Webhook 机制如何对接？
- 问题 5: 支付幂等性、状态机如何设计？
- 问题 6: Stripe 对接有哪些已知坑点和生产环境风险？

## 知识缺口与结论

| 缺口编号 | 知识缺口 | 调研深度 | 信息源 | 结论 | 可信度 |
|---------|---------|---------|--------|------|--------|
| KG-1 | Stripe API 核心对象模型与支付流程 | L3 | Context7, WebSearch, GitHub | Stripe 核心使用 PaymentIntent 状态机管理支付生命周期，Checkout Session 适合快速集成但灵活度低；企业级对接推荐 PaymentIntent | 高 |
| KG-2 | Stripe Java SDK 在 Spring Boot 中的集成方式 | L2 | Context7 + WebSearch | 引入 `com.stripe:stripe-java` Maven 依赖，通过 `Stripe.apiKey` 全局配置或 `RequestOptions` 按请求配置；支持同步调用和 Webhook 异步通知 | 高 |
| KG-3 | 多支付网关（支付宝+Stripe）统一架构模式 | L3 | WebSearch, GitHub, SO | 业界标准方案：策略模式 + 适配器模式 + 工厂模式；定义统一 `PaymentGateway` 接口，各网关各自实现，工厂根据渠道选择 | 高 |
| KG-4 | Stripe Webhook 签名验证与事件处理 | L2 | Context7 + Stripe 官方文档 | 使用 `Webhook.constructEvent(payload, sigHeader, secret)` 验证签名；事件类型通过 `event.getType()` 判断；需注意 API 版本匹配 | 高 |
| KG-5 | 支付幂等性保障 | L2 | Context7 + WebSearch | Stripe SDK 内置 `RequestOptions.setIdempotencyKey()` 支持；服务端需在业务层做幂等校验（基于订单号/支付单号去重） | 高 |
| KG-6 | 支付状态机设计 | L2 | GitHub + Stripe 文档 | PaymentIntent 有明确的状态转换：requires_payment_method → requires_confirmation → processing → succeeded / requires_payment_method（失败重试） | 高 |
| KG-7 | Stripe Java SDK 已知坑点 | L2 | GitHub issues + WebSearch | API 版本不匹配导致 Webhook 反序列化失败；SDK 升级变更频繁需注意迁移指南；生产环境需处理 Stripe 服务降级场景 | 中 |

## 技术可行性

| 调研项 | 结论 | 来源 | 可信度 | 备注 |
|--------|------|------|--------|------|
| Spring Boot 集成 Stripe Java SDK | 可行 | Context7 官方文档 / stripe-java README | 高 | Maven 依赖引入即可，无框架冲突 |
| 多支付网关统一抽象 | 可行 | GitHub PaySpring 项目 / Stack Overflow 社区方案 | 高 | 策略+适配器模式，已有支付宝模块可复用 |
| Webhook 签名验证 | 可行 | Stripe 官方文档 / Context7 SDK 文档 | 高 | `Webhook.constructEvent()` 一行搞定 |
| 幂等性保障 | 可行 | Stripe SDK RequestOptions + 数据库唯一约束 | 高 | SDK 层面 + 业务层面双保险 |
| PCI DSS 合规（后端集成方式） | 可行，Stripe 承担主要责任 | Stripe 文档 | 高 | 使用 Stripe.js/Elements 在前端收集卡信息，后端只接触 token，PCI 负担降至 SAQ A |

## 业界方案对比

### 对比维度：Stripe 对接方案（PaymentIntent vs Checkout Session）

| 方案 | 参考项目/文章 | 优点 | 缺点 | 本项目适用性 |
|------|-------------|------|------|------------|
| PaymentIntent API | Stripe 官方文档 / stripe-java GitHub | 完全控制支付流程；可与自定义 UI 集成；支持手动捕获（capture_method=manual）；状态机语义清晰 | 需要自行处理更多错误场景；前端需额外集成 Stripe.js | ✅ 适用——项目已有支付宝自定义对接经验，需要统一支付体验 |
| Checkout Session | Stripe 官方文档 / Kinsta 教程 | 开箱即用的 Stripe 托管页面；少量代码即可完成；自动处理 3DS/SCA 合规 | UI 不可定制；跳转到 Stripe 域，用户体验割裂；扩展性受限 | ⚠️ 部分适用——适合快速原型，但不适合与支付宝统一体验 |

### 对比维度：多支付网关架构设计方案

| 方案 | 参考项目/文章 | 优点 | 缺点 | 本项目适用性 |
|------|-------------|------|------|------------|
| 策略模式（Strategy） | GitHub PaySpring / Stack Overflow / Medium 多篇文章 | 运行时切换；每个网关独立封装；符合开闭原则；Spring 自动注入 | 网关数量多时工厂类复杂度增加 | ✅ 适用——推荐方案 |
| 适配器模式（Adapter） | Medium 技术文章 | 统一外部 API 差异；适合网关 API 差异大的场景 | 增加一层间接性 | ⚠️ 可配合策略模式使用 |
| 抽象工厂 | 设计模式经典方案 | 创建相关对象族 | 过度设计——本项目网关数量有限 | ❌ 不适用 |

## 性能/安全基准

| 指标 | 调研项 | 业界基准 | 来源 | 本项目目标 | 依据 |
|------|--------|---------|------|-----------|------|
| 性能 | 创建 PaymentIntent API 调用延迟 | Stripe API P99 ≈ 200-500ms | Stripe 官方 SLA / WebSearch | 服务端总耗时 < 800ms (含 Stripe 调用) | 支付宝已有基准 ≈ 500ms，加网络开销 |
| 性能 | Webhook 处理延迟 | 业界通常 < 3s 完成处理并返回 200 | Stripe 最佳实践 | < 2s | Stripe 有 Webhook 重试机制，超时不返回 200 会重试 |
| 安全 | Webhook 签名验证 | HMAC-SHA256，必须验证 | Stripe 官方文档 | 强制验证，未通过拒绝处理 | 防止伪造 Webhook |
| 安全 | API Key 管理 | 服务端存储，不暴露给前端 | OWASP / Stripe 最佳实践 | 配置中心/环境变量管理，仅后端使用 | PCI DSS 基本要求 |
| 安全 | 幂等性 | 幂等 Key 有效期为 24 小时 | Stripe 文档 | 业务层基于支付单号去重 + Stripe Idempotency Key | 防止重复扣款 |

## 已知风险与坑点

| 风险/坑点 | 来源 | 影响评估 | 缓解措施 |
|----------|------|---------|---------|
| Stripe API 版本升级导致 Webhook 事件反序列化失败 | Stripe Java SDK 迁移指南 v8/v9 / Context7 文档 | 高 | 锁定 Webhook endpoint API 版本；使用 EventDataObjectDeserializer 安全反序列化；灰度升级 |
| Stripe SDK 版本升级频繁（月更）且不兼容变更集中在主版本 | stripe-java GitHub Releases | 中 | 定期跟进但不盲升；每次升级先查 Migration Guide；集成测试覆盖 |
| 网络超时导致支付状态不一致 | Stripe 最佳实践文档 | 中 | 轮询+Webhook 双通道确认；定时任务对账；前端展示明确加载状态 |
| Webhook 延迟/丢失 | Stripe 文档 / 社区经验 | 中 | Webhook 处理后异步落库；定时任务兜底查询 Stripe 支付状态 |
| Stripe 服务降级 | Stripe Status Page | 低 | 降级方案：记录支付请求，待恢复后重试；监控告警 |
| 支付宝与 Stripe 退款流程差异 | 支付宝开放文档 / Stripe 文档 | 低 | 统一退款接口内部分发，各网关自行实现 |

## 综合建议

### 推荐方案
- **方案描述**: 采用策略模式（Strategy Pattern）设计统一支付网关层。定义 `PaymentGateway` 接口（含 `pay/createOrder/query/callback/refund` 方法），`AlipayGateway` 复用已有逻辑，`StripeGateway` 基于 Stripe Java SDK 新实现。使用 `PaymentGatewayFactory` 根据支付渠道（channel）路由到对应实现。Stripe 侧使用 PaymentIntent API（非 Checkout Session）以与支付宝保持一致的流程控制能力。
- **理由**: 策略模式是业界多支付网关的标准实践（GitHub 多个开源项目采用此模式）；已有支付宝模块可平滑迁移到统一接口下；PaymentIntent 提供与支付宝类似的支付控制粒度；Spring IoC 天然支持策略模式注入。
- **关键依赖**: `com.stripe:stripe-java`（最新稳定版，Maven 官方仓库）；Stripe Secret Key + Webhook Signing Secret；项目现有 `payment/alipay/` 模块作为锚点模块参考。

### 替代方案（已排除）
- **Checkout Session 方案**: 虽然开发量小，但 UI 托管在 Stripe 域，无法与支付宝的自定义支付流程统一用户体验。不满足企业内部系统对支付流程完全可控的要求。
- **适配器模式单独使用**: 仅做 API 适配不做策略路由，多网关切换时代码侵入性大。

### 待确认项
- [ ] Stripe 账户的地区和币种配置——需与业务确认收款的币种和目标市场
- [ ] Webhook 端点公网可达性——需配置 HTTPS 域名并注册到 Stripe Dashboard
- [ ] 退款流程的业务规则——Stripe 支持部分退款，需与业务确认退款策略
- [ ] 是否启用 Stripe Radar（风控）——涉及额外费用和配置

## 参考资料

### Context7
- stripe-java SDK 官方文档：PaymentIntent 创建、确认流程；Webhook 构造与签名验证；RequestOptions 配置（幂等 Key、API Key）；事件反序列化与 API 版本匹配
- 查询范围：`/stripe/stripe-java` — PaymentIntent、Webhook、RequestOptions、API Versioning

### GitHub
- [stripe/stripe-java](https://github.com/stripe/stripe-java) — Stripe 官方 Java SDK，244 个代码示例
- [lokeshmori/Payment-Processing-System](https://github.com/lokeshmori/Payment-Processing-System) — Spring Boot + Stripe + Razorpay 多网关支付系统
- [hopquangdo/PaySpring](https://github.com/hopquangdo/PaySpring) — 开源多支付网关 Spring Boot 库（Stripe、PayPal、Momo、VNPay）
- [msedky/ecommerce-payment-gateway](https://github.com/msedky/ecommerce-payment-gateway) — 策略模式多 PSP 切换（Stripe、PayPal、Adyen）
- [azlicn/pet-store](https://github.com/azlicn/pet-store) — Spring Boot 设计模式示例，含 AliPayStrategy + PaymentStrategy 接口

### WebSearch
- [Baeldung: Introduction to Stripe API for Java](https://www.baeldung.com/java-stripe-api) — Stripe Java SDK 入门教程
- [Kinsta: Guide to Stripe Integration in Spring Boot](https://kinsta.com/blog/stripe-java-api/) — 完整的 Spring Boot Stripe 集成教程
- [Medium: Multi-Payment Gateway System with Strategy Pattern](https://medium.com/@anayshri/implementing-a-multi-payment-gateway-system-with-strategy-pattern-7750e86f1f65) — 策略模式多支付网关实践
- [Medium: Adapter Design Pattern for Payment Gateway](https://medium.com/@mehar.chand.cloud/adapter-design-pattern-use-case-payment-gateway-integration-8dc316e1dba8) — 适配器模式支付网关示例
- [Stack Overflow: Strategy pattern for payment gateway in Spring Boot](https://stackoverflow.com/questions/70680247/strategy-pattern-in-spring-boot-application-for-payment-gateway-and-methods) — 社区讨论 Spring Boot 支付策略模式
- [Reddit: Design pattern for multiple payment gateways](https://www.reddit.com/r/developersIndia/comments/1hvjtu2/design_pattern_for_integrating_multiple_payment/) — 社区多网关设计模式讨论

### Stack Overflow
- [Spring Boot Stripe Payment Integration](https://stackoverflow.com/questions/71465730/spring-boot-stripe-payment-integration) — Stripe 集成实现参考
- [Difference between Checkout.Session and PaymentIntent](https://stackoverflow.com/questions/70589285/difference-between-checkout-session-and-paymentintent-in-stripe) — 两种 API 的区分

### 项目源码
- `payment/alipay/` — 已有支付宝对接模块，作为 Stripe 对接的锚点模块和架构参考
