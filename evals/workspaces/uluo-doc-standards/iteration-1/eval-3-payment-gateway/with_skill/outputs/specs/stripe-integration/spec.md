# Stripe 支付网关集成 需求规格说明

> 日期: 2026-06-08 | 作者: AI | 状态: 评审中

## 背景与动机

当前系统仅对接了支付宝（payment/alipay/）作为唯一支付网关，限制了海外用户的支付能力。支付宝在海外市场的覆盖率有限，国际信用卡、数字钱包等主流支付方式无法支持，导致跨境业务流失。Stripe 作为全球最大的支付处理平台之一，支持 135+ 币种和 40+ 支付方式（信用卡、Apple Pay、Google Pay、Alipay、WeChat Pay 等），能够显著扩展系统的支付覆盖范围。

引入 Stripe 不是替代支付宝，而是作为第二个支付渠道，两者并存，用户在下单时自主选择支付方式。

## 用户故事

| 编号 | 角色 | 故事 | 验收线索 |
|------|------|------|---------|
| US-1 | 海外消费者 | 作为海外消费者，我希望使用信用卡（Visa/MasterCard/AmEx）完成支付，以便在我不持有支付宝账户的情况下也能购买商品 | FR-1, AC-1 |
| US-2 | 普通用户 | 作为用户，我希望在下单时能从支付宝和 Stripe 两种支付方式中选择，以便使用我最方便的支付方式 | FR-2, AC-2 |
| US-3 | 系统管理员 | 作为系统管理员，我希望在 Stripe 支付异常时能收到告警，并能查询支付日志进行问题排查 | FR-5, NFR-可维护性 |
| US-4 | 客服人员 | 作为客服人员，我希望能对 Stripe 支付订单发起退款操作，以便处理用户的退款请求 | FR-4, AC-4 |
| US-5 | 运维人员 | 作为运维人员，我希望 Stripe 的 API Key 和 Webhook Secret 能安全地分环境管理，不暴露在代码中 | NFR-安全 |
| US-6 | 财务人员 | 作为财务人员，我希望定期获取 Stripe 的对账数据，以便与公司内部账目核对 | FR-6 |

### 目标
- 在现有支付宝支付基础上增加 Stripe 支付通道，支持国际信用卡、数字钱包
- 用户下单时可在支付宝和 Stripe 之间选择
- Stripe 支付的订单状态流转与支付宝保持一致
- 建立统一的支付网关抽象层，降低未来新增支付渠道的成本
- 完整的退款流程支持

### 非目标（明确不做的事）
- 不替换或下线现有支付宝支付功能
- 不实现 Stripe 订阅（Subscription）功能
- 不实现 Stripe Connect（平台分账）功能
- 不实现前端 Stripe Elements 嵌入（首期使用 Checkout Sessions 跳转模式）
- 不实现 Stripe Terminal（线下刷卡）功能
- 不处理 Stripe 税务计算（Stripe Tax）

## 功能需求

### FR-1: Stripe Checkout Session 创建与支付跳转
- **描述**: 用户选择 Stripe 支付后，后端创建 Stripe Checkout Session，返回跳转 URL，前端重定向用户至 Stripe 托管支付页面
- **优先级**: P0
- **触发条件**: 用户创建订单并选择 Stripe 作为支付方式
- **预期行为**:
  1. 后端接收订单信息（订单号、金额、币种、商品描述），调用 Stripe API 创建 Checkout Session
  2. Session 配置 `success_url` 和 `cancel_url`（指向本项目前端页面）
  3. 返回 `session.getUrl()` 给前端，前端执行 `window.location.href` 重定向
  4. 用户在 Stripe 托管页面完成支付（或取消）
- **边界条件**:
  - Session 创建失败（网络超时、API Key 无效等）→ 订单保持"待支付"状态，返回错误提示给用户
  - 同一订单重复支付 → 使用幂等键 `ORDER_{orderId}` 防止重复创建 Session
  - Session 过期（24 小时）→ 若用户返回重试，生成新 Session

### FR-2: 支付渠道选择
- **描述**: 下单页面提供支付渠道选择（支付宝 / Stripe），下单时携带 `channel` 参数
- **优先级**: P0
- **触发条件**: 用户进入下单流程
- **预期行为**: 前端支付方式选择器根据后端返回的可用渠道列表渲染，选中后与订单请求一起提交
- **边界条件**: 若某渠道临时不可用（如配置错误），后端不下发该选项

### FR-3: Stripe Webhook 回调处理
- **描述**: 接收 Stripe Webhook 事件，验证签名后更新订单支付状态
- **优先级**: P0
- **触发条件**: Stripe 异步推送支付事件到配置的 Webhook endpoint
- **预期行为**:
  1. 接收 POST 请求，读取 `Stripe-Signature` 头和原始 body
  2. 使用 `Webhook.constructEvent()` 验证签名
  3. 验签通过后，根据 `event.type` 路由处理：
     - `checkout.session.completed` → 更新订单状态为"已支付"
     - `checkout.session.expired` → 更新订单状态为"支付超时"
     - `charge.refunded` → 更新订单状态为"已退款"
     - `charge.dispute.created` → 记录争议，通知管理员
  4. 处理完成后返回 HTTP 200
- **边界条件**:
  - 签名验证失败 → 返回 HTTP 400，记录告警日志
  - 重复 Webhook 事件（相同 event_id）→ 幂等处理，直接返回 200
  - 订单不存在 → 记录日志并返回 200（可能是数据不一致或测试事件）
  - 订单状态不匹配（如已退款收到支付成功事件）→ 记录异常但不报错

### FR-4: 退款处理
- **描述**: 客服/管理员可对已支付的 Stripe 订单发起全额或部分退款
- **优先级**: P1
- **触发条件**: 管理员在后台发起退款操作
- **预期行为**:
  1. 系统验证订单状态为"已支付"且未超退款期限
  2. 调用 Stripe `RefundService.create()`，传入 `payment_intent_id` 和退款金额
  3. 创建退款记录，订单状态更新为"退款中"
  4. Webhook 收到 `charge.refunded` 后最终确认状态为"已退款"
- **边界条件**: 部分退款时金额不能超过原始支付金额；已全额退款的订单拒绝再次退款

### FR-5: 支付日志与监控
- **描述**: 所有 Stripe API 调用和 Webhook 处理记录详细日志，异常情况触发告警
- **优先级**: P1
- **触发条件**: 每次 Stripe API 调用和 Webhook 处理
- **预期行为**:
  1. 记录：请求时间、API 方法、订单号、耗时、响应状态
  2. 异常告警：签名验证失败、API 调用连续失败、Webhook 投递延迟超阈值
- **边界条件**: 日志包含敏感信息（API Key）时必须脱敏

### FR-6: 对账数据导出
- **描述**: 提供按时间范围导出 Stripe 交易数据的接口，供财务对账
- **优先级**: P2
- **触发条件**: 财务人员定期触发
- **预期行为**: 调用 Stripe API 查询指定时间段的交易记录，格式化为 CSV/Excel
- **边界条件**: 大量数据时分页查询，避免超时

## 非功能性需求

### 性能
- Checkout Session 创建接口响应时间 P99 < 1s
- Webhook 处理接口响应时间 P99 < 500ms（异步处理业务逻辑不在此时间内）
- 订单状态更新延迟（从支付完成到订单状态变更）< 30s

### 安全
- Stripe Secret Key 和 Webhook Signing Secret 通过环境变量/配置中心注入，不硬编码
- 生产环境使用 Stripe Restricted Keys（最小权限原则）
- Webhook endpoint 强制 HTTPS，必须验证签名
- 所有 Stripe API 调用携带幂等键，防止网络重试导致重复操作
- PCI 合规级别：SAQ-A（使用 Checkout Sessions 由 Stripe 承担 PCI 负担）

### 可维护性
- 统一的支付日志格式，便于排查（traceId + orderId + eventId）
- Stripe SDK 版本锁定，升级前阅读 Migration Guide
- 配置项文档化，区分必填/可选，注明获取方式
- Webhook 事件处理独立于订单业务逻辑，便于单元测试

## 影响范围

| 模块 | 影响类型 | 说明 |
|------|---------|------|
| payment/alipay/ | 修改 | 提取支付网关公共接口，AlipayService 实现该接口 |
| payment/stripe/ | 新增 | Stripe 支付实现：StripeConfig、StripeService、StripeWebhookController |
| payment/common/ | 新增 | 统一支付网关抽象层：PaymentGateway 接口、PaymentGatewayFactory、PaymentChannel 枚举 |
| order/ | 修改 | 订单创建流程增加 channel 参数；订单状态枚举增加 Stripe 相关中间状态 |
| config/ | 修改 | 新增 Stripe 配置项 |

## 依赖与前置条件

- [ ] Stripe 企业账号注册并通过认证
- [ ] 获取 Stripe API Keys（Publishable Key、Secret Key）
- [ ] 配置 Webhook endpoint：
  - 开发环境：使用 Stripe CLI + ngrok 做本地代理
  - 生产环境：公网 HTTPS endpoint（`https://<domain>/api/payment/stripe/webhook`）
- [ ] 获取 Webhook Signing Secret
- [ ] 前端配合：支付方式选择 UI、`success_url` / `cancel_url` 落地页

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| Stripe 服务不可用 | 低 | 高 | 支付渠道选择时检测 Stripe 健康状态；降级提示用户使用支付宝 |
| Webhook 延迟导致订单状态更新滞后 | 中 | 中 | 增加"支付处理中"中间状态；前端轮询订单状态作为补充 |
| API Key 泄露 | 低 | 极高 | 使用 Restricted Keys + 环境变量管理 + 定期轮换 + 日志脱敏 |
| Stripe SDK 升级不兼容 | 中 | 中 | 锁定版本号，升级前阅读 Migration Guide，CI 运行全量测试 |
| 支付宝作为 Stripe 支付方式时的重定向问题 | 中 | 低 | 非本项目控制；提供客服联系方式和帮助文档 |
| idempotency 设计不当导致重复扣款 | 低 | 高 | 使用 `ORDER_{orderId}` 稳定幂等键 + 数据库唯一约束 |
| 海外用户支付习惯差异导致转化率低 | 中 | 中 | Stripe Checkout 自动根据用户地区展示本地支付方式，无需额外配置 |

## 验收标准

- [ ] **AC-1** 海外用户选择 Stripe 支付后，能成功跳转到 Stripe 托管支付页，使用国际信用卡完成支付，订单状态正确更新为"已支付"
- [ ] **AC-2** 下单页面可正常展示支付宝和 Stripe 两种支付选项，切换后订单流程正常
- [ ] **AC-3** Webhook 签名验证 100% 覆盖：使用错误签名/过期事件/重复 event_id 的场景均正确处理
- [ ] **AC-4** 管理员可对已支付 Stripe 订单发起全额退款，订单状态正确更新为"已退款"
- [ ] **AC-5** 同一订单无法重复支付——幂等键 + 数据库约束双重保障
- [ ] **AC-6** Stripe 支付日志可完整追踪（请求时间、订单号、API 方法、响应状态、耗时）
- [ ] **AC-7** Stripe 不可用时不影响支付宝支付功能；支付宝不可用时不影响 Stripe 支付功能
- [ ] **AC-8** 所有 Stripe 配置项不硬编码，通过环境变量/配置中心注入

## 调研依据

### 技术可行性

| 调研项 | 结论 | 来源 | 可信度 |
|--------|------|------|--------|
| Stripe Java SDK 与 Spring Boot 兼容性 | 可行——Maven 依赖 `com.stripe:stripe-java`，`@Configuration` + `@PostConstruct` 初始化 | Context7 `/stripe/stripe-java` + GitHub 参考项目 | 高 |
| Checkout Session 创建与跳转 | 可行——`SessionCreateParams` 构建参数，`client.checkout().sessions().create()` 调用 | Context7 Stripe Java SDK + Stripe 官网 | 高 |
| Webhook 签名验证 | 可行——`Webhook.constructEvent(payload, sigHeader, secret)` 一键验证 | Context7 Stripe Java SDK Migration Guide v8 | 高 |
| 退款处理 | 可行——`RefundService.create(RefundCreateParams)` 支持全额/部分退款 | Context7 + Stripe 官网 | 高 |

### 业界方案参考

| 调研项 | 参考项目/文章 | 关键发现 |
|--------|-------------|---------|
| Checkout Session 集成模式 | Coding Shuttle 2025 Spring Boot Guide / GitHub: peterbokern | 最简流程：创建 Session → 返回 URL → Webhook 处理结果 |
| 生产级幂等性设计 | Monstarlab: Stripe Payment Architecture 2025 | 幂等键必须稳定（业务实体 ID），不能随机生成 |
| Webhook 可靠性架构 | DigitalApplied 2026 Guide / stripe-webhook-idempotency-guard | "Webhooks are more reliable than redirect callbacks"——官方推荐 |
| 统一支付网关抽象 | GitHub: VivekGits7/Stripe-Payment-Integration | 策略模式 + Factory 路由，支持多渠道扩展 |

### 性能/安全基准

| 调研项 | 业界基准 | 本项目目标 |
|--------|---------|-----------|
| Session 创建延迟 | Stripe API 设计目标 < 500ms | P99 < 1s |
| Webhook 投递延迟 | 通常 < 5s | 订单状态更新 < 30s |
| PCI 合规级别 | SAQ-A（Checkout）/ SAQ-D（Elements） | SAQ-A |

### 已知风险/坑点

| 风险 | 来源 | 缓解措施 |
|------|------|---------|
| Webhook at-least-once 投递导致重复处理 | Stripe 官方文档 | event_id 唯一约束 + 状态机幂等 |
| SDK 版本升级 API 变更有破坏性 | Context7 Migration Guides (v8, v9, v23, v29) | 锁定版本 + 测试覆盖 |
| success_url 不可靠（用户关闭浏览器） | Stripe 官方推荐 + DigitalApplied 2026 | 只用 Webhook 做业务状态变更 |

## 参考资料

- Context7: `/stripe/stripe-java` — Stripe Java SDK 官方文档（StripeClient、Webhook、Checkout Session、Refund Service）
- Stripe 官方文档: https://docs.stripe.com/payments/alipay（内置 Alipay 支持）, https://docs.stripe.com/payment-links/post-payment（支付完成处理）
- GitHub: https://github.com/VivekGits7/Stripe-Payment-Integration, https://github.com/peterbokern/stripe-full-integration-react-java-springboot, https://github.com/primeautomation-dev/stripe-webhook-idempotency-guard
- WebSearch: https://www.codingshuttle.com/blogs/integrating-stripe-payments-in-spring-boot-step-by-step-beginner-s-guide-2025/, https://www.digitalapplied.com/blog/stripe-payment-integration-developer-guide-2026, https://monstar-lab.com/ph/blog/stripe-payment-architecture-building-fault-tolerant-systems-with-idempotency-and-webhooks
- Stack Overflow: N/A（本次调研主要依赖官方文档和生产实践博客）
