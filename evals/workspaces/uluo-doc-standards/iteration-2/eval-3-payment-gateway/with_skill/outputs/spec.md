# Stripe 支付网关对接 需求规格说明

> 日期: 2026-06-08 | 作者: AI Researcher | 状态: 评审中

## 背景与动机

当前系统已对接支付宝支付网关（`payment/alipay/`），但仅支持国内支付场景。随着业务拓展至海外市场，需要支持国际信用卡支付。Stripe 是全球应用最广泛的支付网关之一，支持 Visa、Mastercard、American Express 等主流信用卡及 135+ 种货币，是海外支付的首选方案。本次对接目标：在现有支付宝支付能力基础上新增 Stripe 支付渠道，通过统一的多支付网关架构实现渠道可扩展、业务无感知的支付体验。

## 用户故事

| 编号 | 角色 | 故事 | 验收线索 |
|------|------|------|---------|
| US-1 | 海外用户 | 作为海外用户，我希望使用信用卡（Visa/Mastercard 等）完成支付，以便用我熟悉的支付方式完成购买 | FR-1, FR-3 |
| US-2 | 运营人员 | 作为运营人员，我希望在后台查询 Stripe 支付记录并处理退款，以便支持海外用户的售后需求 | FR-4, FR-5 |
| US-3 | 系统管理员 | 作为系统管理员，我希望 Stripe 对接不影响现有支付宝支付流程，以便系统稳定运行 | FR-6 |
| US-4 | 开发者 | 作为开发者，我希望支付网关层有统一的接口抽象，以便未来对接其他支付渠道时成本最低 | FR-6 |
| US-5 | 运维人员 | 作为运维人员，我希望监控 Stripe API 调用成功率、Webhook 处理延迟和异常告警，以便及时发现和处理支付故障 | NFR-可维护性 |

### 目标
- 实现 Stripe 信用卡支付能力，覆盖 Visa、Mastercard、American Express 等主流卡组织
- 设计统一的多支付网关架构，支持通过配置/参数切换支付渠道
- Stripe 支付流程（创建订单、支付确认、查询、退款、回调）完整闭环
- 已有支付宝支付功能零影响

### 非目标（明确不做的事）
- 不涉及前端支付页面的 UI 改造（仅提供后端 API）
- 不实现 Stripe Connect（平台分账）功能
- 不实现 Stripe Subscription（订阅/周期性支付）功能
- 不涉及 Stripe Radar 风控集成
- 不改造支付宝已有代码逻辑，仅提取公共接口

## 功能需求

### FR-1: 创建 Stripe 支付订单
- **描述**: 根据业务订单信息（金额、币种、订单号等），调用 Stripe PaymentIntent API 创建支付意图，返回 client_secret 供前端完成支付
- **优先级**: P0
- **触发条件**: 用户选择 Stripe 支付方式，前端请求创建支付
- **预期行为**: 服务端调用 Stripe API 创建 PaymentIntent（capture_method=automatic），记录支付单到本地数据库（状态=待支付），返回 client_secret 和 payment_intent_id
- **边界条件**: 金额为负数或零时拒绝；币种不在 Stripe 支持范围内时拒绝；Stripe API 不可用时返回明确错误信息

### FR-2: Stripe 支付确认/状态查询
- **描述**: 服务端根据 payment_intent_id 向 Stripe 查询支付状态，同步更新本地支付单状态
- **优先级**: P0
- **触发条件**: 前端支付完成后回调；或定时任务兜底查询
- **预期行为**: 调用 Stripe `PaymentIntent.retrieve()` 获取最新状态，更新本地支付单状态，返回给前端
- **边界条件**: payment_intent_id 不存在时返回"支付单未找到"；Stripe 返回处理中状态时前端展示 loading

### FR-3: Stripe Webhook 回调处理
- **描述**: 接收 Stripe 异步 Webhook 通知，验证签名后处理支付状态变更事件
- **优先级**: P0
- **触发条件**: Stripe 服务端异步推送事件（payment_intent.succeeded、payment_intent.payment_failed 等）
- **预期行为**: 验证 Webhook 签名（HMAC-SHA256），解析事件类型，更新本地支付单状态和业务订单状态，返回 HTTP 200
- **边界条件**: 签名验证失败返回 HTTP 400；重复事件做幂等处理；未识别事件类型记录日志但不报错

### FR-4: Stripe 退款
- **描述**: 对已支付订单发起退款，调用 Stripe Refund API
- **优先级**: P1
- **触发条件**: 运营人员在后台发起退款申请
- **预期行为**: 验证支付单状态为已支付，调用 Stripe `Refund.create()`（支持部分退款参数），记录退款单到本地数据库
- **边界条件**: 退款金额超过支付金额时拒绝；支付单状态不是已支付时拒绝；Stripe 退款失败时记录失败原因

### FR-5: 支付记录查询
- **描述**: 提供 Stripe 支付记录的分页查询接口，供后台管理系统使用
- **优先级**: P1
- **触发条件**: 运营人员访问支付记录页面
- **预期行为**: 支持按支付状态、时间范围、订单号等条件查询，返回分页结果
- **边界条件**: 无数据时返回空列表而非报错

### FR-6: 统一支付网关接口抽象
- **描述**: 定义 `PaymentGateway` 统一接口，将现有支付宝实现和新 Stripe 实现统一纳入，通过工厂类按渠道路由
- **优先级**: P0
- **触发条件**: N/A（架构层面需求）
- **预期行为**: 接口定义 `createPayment / queryPayment / handleCallback / refund` 方法；支付宝实现类 `AlipayGateway` 迁移现有逻辑；Stripe 实现类 `StripeGateway` 新实现；`PaymentGatewayFactory` 通过 `channel` 参数返回对应实现
- **边界条件**: 未知渠道时抛出明确异常；支付宝现有功能不受影响

## 非功能性需求

### 性能
- 创建支付 API 响应时间 P99 < 800ms（含 Stripe API 调用，业界基准约 200-500ms）
- Webhook 处理时间 < 2s（超过 Stripe 会重试）
- 支持并发支付请求，预计峰值 QPS 100

### 安全
- Stripe Secret Key 通过配置中心管理，禁止出现在代码、日志、前端中
- Webhook 签名强制验证，使用 `Webhook.constructEvent()` + Webhook Signing Secret
- 支付金额服务端计算，不信任前端传入金额
- 前端仅接触 Stripe Publishable Key（非敏感），信用卡信息由 Stripe.js/Elements 在前端直接收集，后端不接触原始卡号
- 幂等性保障：业务层基于支付单号唯一约束去重 + Stripe SDK Idempotency Key

### 可维护性
- 所有 Stripe API 调用记录请求日志（含 request_id、耗时、状态码）
- Webhook 事件处理记录完整日志（含 event_id、类型、处理结果）
- Stripe API 调用异常接入系统现有告警体系
- 配置项：Stripe API Key、Webhook Secret、超时时间等可动态配置

## 影响范围

| 模块 | 影响类型 | 说明 |
|------|---------|------|
| payment/gateway/ | 新增 | 统一支付网关接口定义 + 工厂类 |
| payment/stripe/ | 新增 | Stripe 支付网关实现（Service + Webhook Controller + DTO） |
| payment/alipay/ | 修改 | 提取公共接口，实现 PaymentGateway 接口 |
| payment/common/ | 新增 | 支付相关公共枚举（PaymentChannel, PaymentStatus）和 Entity |
| database | 新增 | 新增 stripe_payment 表、refund 表（或扩展已有支付表） |
| config/ | 新增 | Stripe 配置类（API Key、Webhook Secret） |

## 依赖与前置条件

- `com.stripe:stripe-java` Maven 依赖（最新稳定版，Maven Central）
- Stripe 账号已注册并获取 Secret Key（sk_live_/sk_test_）和 Publishable Key（pk_live_/pk_test_）
- Stripe Dashboard 中配置 Webhook Endpoint URL（需 HTTPS 公网可达）
- 获取 Webhook Signing Secret（whsec_）
- 项目已有 `payment/alipay/` 模块代码完整可用

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| Stripe 服务不可用 | 低 | 高 | 降级方案：创建支付时记录失败，待恢复后重试；监控告警及时响应 |
| Webhook 延迟/丢失导致支付状态不同步 | 中 | 中 | 定时任务主动查询 Stripe 支付状态（兜底）；Webhook + 轮询双通道 |
| Stripe API 版本升级导致不兼容 | 中 | 中 | 锁定 API 版本（Webhook Endpoint 指定版本）；SDK 升级前查阅 Migration Guide；集成测试覆盖 |
| 支付宝已有代码改动引入回归 | 低 | 中 | 提取接口非修改逻辑；支付宝集成测试完整覆盖 |
| 跨境支付汇率波动 | 低 | 低 | 支付时锁定金额；退款按原币种原路退回 |
| 网络延迟导致重复请求 | 低 | 中 | 业务层幂等校验 + Stripe Idempotency Key 双保障 |

## 验收标准

- [ ] `PaymentGateway` 统一接口定义完成，包含 `createPayment`、`queryPayment`、`handleCallback`、`refund` 方法
- [ ] 支付宝模块实现 `PaymentGateway` 接口，现有功能不受影响（回归测试通过）
- [ ] Stripe PaymentIntent 创建接口可用，返回 client_secret 供前端完成支付
- [ ] Stripe Webhook 端点可接收并验证签名，正确更新支付状态
- [ ] 支付幂等性通过——同一订单号重复请求不会产生多次扣款
- [ ] 退款接口可用，支持全额退款和部分退款
- [ ] Stripe API 调用异常时有明确的错误信息和日志记录
- [ ] 单元测试覆盖 StripeGateway 核心逻辑（Mock Stripe API）
- [ ] 集成测试覆盖创建支付 → 模拟 Webhook → 状态同步的完整链路
- [ ] 文档：Stripe 对接开发文档（含 Webhook 配置步骤）

## 调研依据

### 技术可行性

| 调研项 | 结论 | 来源 | 可信度 |
|--------|------|------|--------|
| Spring Boot 集成 Stripe Java SDK | 可行，Maven 引入即可，无框架冲突 | Context7 / stripe-java 官方 README | 高 |
| PaymentIntent API 用于自定义支付流程 | 可行，提供完整状态机和支付控制能力 | Context7 / Stripe 官方文档 | 高 |
| Webhook 签名验证 | 可行，SDK 内置 `Webhook.constructEvent()` | Context7 | 高 |
| 幂等性保障 | 可行，SDK RequestOptions + 业务去重 | Context7 / Stripe 文档 | 高 |
| 多支付网关策略模式 | 可行，业界标准方案 | GitHub PaySpring / Stack Overflow | 高 |

### 业界方案参考

| 调研项 | 参考项目/文章 | 关键发现 |
|--------|-------------|---------|
| 多支付网关架构 | GitHub PaySpring / azlicn/pet-store | 策略模式 + 统一接口是最广泛采用的方案 |
| Stripe PaymentIntent 使用 | Baeldung / Kinsta 教程 | PaymentIntent 适合需要自定义支付流程的企业级应用 |
| Webhook 处理最佳实践 | Stripe 官方文档 / Context7 | 签名验证 + 幂等处理 + 兜底轮询是关键设计要点 |

### 性能/安全基准

| 调研项 | 业界基准 | 本项目目标 |
|--------|---------|-----------|
| Stripe API 调用延迟 | P99 200-500ms（Stripe 官方 SLA） | 服务端总耗时 P99 < 800ms |
| Webhook 处理时限 | Stripe 重试阈值：未收到 200 响应 | < 2s 完成处理 |
| PCI DSS 合规等级 | 使用 Stripe.js/Elements → SAQ A（最轻量） | SAQ A |

### 已知风险/坑点

| 风险 | 来源 | 缓解措施 |
|------|------|---------|
| API 版本不匹配导致 Webhook 反序列化失败 | stripe-java Migration Guide v8/v9 | 锁定 Webhook 端点 API 版本；安全反序列化 |
| SDK 主版本升级频繁 | stripe-java GitHub Releases | 升级前查阅 Migration Guide；集成测试覆盖 |

## 参考资料

### Context7
- `/stripe/stripe-java` — PaymentIntent、Webhook 构造、RequestOptions、事件反序列化

### GitHub
- [stripe/stripe-java](https://github.com/stripe/stripe-java)
- [hopquangdo/PaySpring](https://github.com/hopquangdo/PaySpring)
- [msedky/ecommerce-payment-gateway](https://github.com/msedky/ecommerce-payment-gateway)

### WebSearch
- [Baeldung: Introduction to Stripe API for Java](https://www.baeldung.com/java-stripe-api)
- [Kinsta: Guide to Stripe Integration in Spring Boot](https://kinsta.com/blog/stripe-java-api/)
- [Stripe 官方文档: Checkout vs PaymentIntent](https://docs.stripe.com/payments/checkout-sessions-and-payment-intents-comparison)

### Stack Overflow
- [Strategy Pattern in Spring Boot for Payment Gateway](https://stackoverflow.com/questions/70680247/strategy-pattern-in-spring-boot-application-for-payment-gateway-and-methods)
