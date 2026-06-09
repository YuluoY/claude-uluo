# Stripe 支付网关对接 -- 技术方案评审文档

> 版本：v2.0 | 日期：2026-06-08 | 作者：技术架构组 | 状态：待评审

---

## 目录

1. [项目背景与需求分析](#1-项目背景与需求分析)
2. [Stripe 支付网关深度分析](#2-stripe-支付网关深度分析)
3. [与现有支付宝架构的对比分析](#3-与现有支付宝架构的对比分析)
4. [推荐技术方案](#4-推荐技术方案)
5. [系统架构设计](#5-系统架构设计)
6. [数据库设计](#6-数据库设计)
7. [接口详细设计](#7-接口详细设计)
8. [安全与合规](#8-安全与合规)
9. [风险评估与应对措施](#9-风险评估与应对措施)
10. [测试策略](#10-测试策略)
11. [可观测性与运维](#11-可观测性与运维)
12. [实施计划](#12-实施计划)
13. [成本模型](#13-成本模型)
14. [决策建议与待确认事项](#14-决策建议与待确认事项)
15. [附录](#15-附录)

---

## 1. 项目背景与需求分析

### 1.1 现状梳理

**技术栈**：
- 后端框架：Spring Boot + MyBatis
- 现有支付能力：已对接支付宝（Alipay），支付模块位于 `payment/alipay/`
- 核心组件：`AlipayService`、`AlipayConfig`、回调处理 Controller
- 现有支付流程：创建订单 -> 跳转支付页面 -> 支付回调（同步 + 异步）-> 更新订单状态
- 订单状态机：PENDING -> PAID / EXPIRED / REFUNDED

**现有架构特征**：
- 支付宝作为唯一支付网关，支付逻辑与订单系统耦合度中等
- 签名验证使用支付宝 RSA/RSA2 非对称加密
- 双通道通知：同步 `return_url`（GET） + 异步 `notify_url`（POST）
- 配置通过 `application.yml` + 环境变量管理

### 1.2 业务需求

| 需求编号 | 需求描述 | 优先级 |
|---------|---------|--------|
| BR-1 | 支持国际信用卡支付（Visa、Mastercard、AmEx 等） | P0 |
| BR-2 | 覆盖海外用户支付场景，支持多币种结算 | P0 |
| BR-3 | 与现有支付宝支付通道共存，用户可自主选择 | P0 |
| BR-4 | 支付流程体验与支付宝基本一致，不增加学习成本 | P1 |
| BR-5 | 支持退款操作（全额/部分） | P1 |
| BR-6 | 提供支付对账数据导出能力 | P2 |
| BR-7 | Stripe 支付异常时不影响支付宝支付功能 | P0 |

### 1.3 非目标（明确不做）

- 不替换或下线现有支付宝支付功能
- 不实现 Stripe Subscription（订阅）功能
- 不实现 Stripe Connect（平台分账）
- 不实现前端内嵌 Stripe Elements（首期使用 Checkout 跳转模式）
- 不处理 Stripe Tax（税务计算）
- 不实现线下刷卡（Stripe Terminal）

### 1.4 目标

- 完成 Stripe 支付网关的技术对接，支持 Checkout Session 跳转支付
- 建立 `PaymentGatewayService` 统一支付网关抽象层，利于未来扩展
- 复用现有订单支付流程框架，最小化对现有系统的冲击
- 保障支付安全与 PCI DSS SAQ-A 等级合规
- 完整的 Webhook 回调处理 + 幂等性保障 + 主动查询补偿机制

---

## 2. Stripe 支付网关深度分析

### 2.1 公司背景与市场地位

Stripe 是全球最大的在线支付处理平台之一，2026 年最新市场数据：

| 指标 | 数据 |
|------|------|
| 覆盖国家/地区 | 46+ |
| 支持货币 | 135+ |
| 支持支付方式 | 40+ 种（含 Alipay、WeChat Pay） |
| 市场份额（全球在线支付） | 约 18%，仅次于 PayPal |
| API 响应时间（P99） | < 500ms |
| 服务可用性 SLA | 99.95%+ |

### 2.2 核心支付方式覆盖

| 类别 | 支付方式 | 覆盖地区 |
|------|---------|---------|
| 信用卡/借记卡 | Visa、Mastercard、American Express、Discover、JCB、UnionPay | 全球 |
| 数字钱包 | Apple Pay、Google Pay、Microsoft Pay、Link | 全球 |
| 银行转账 | ACH（美国）、SEPA（欧洲）、Bacs（英国）、BECS（澳洲） | 区域 |
| 先买后付（BNPL） | Klarna、Affirm、Afterpay、Clearpay | 区域 |
| 本地支付方式 | iDEAL（荷兰）、Sofort（德国）、Alipay（中国）、WeChat Pay（中国）、GrabPay（东南亚） | 区域 |

> **关键发现**：Stripe 已将 Alipay 作为内置支付方式，这意味着理论上 Stripe Checklist 页面即可支持海外用户使用支付宝付款，无需维护两套独立集成。

### 2.3 费用结构（2026 年最新）

| 交易类型 | 费率 | 备注 |
|---------|------|------|
| 美国国内信用卡 | 2.9% + $0.30 | 基准费率 |
| 国际信用卡 | 3.1% + $0.30 | 另加 1.5% 跨境费 |
| 国际卡含货币转换 | 约 4.4% + $0.30 | 包含换汇手续费 |
| ACH 借记 | 0.8%，上限 $5.00 | 仅限美国 |
| SEPA 借记 | 0.8%，上限 EUR5.00 | 仅限欧洲 |
| BNPL（Klarna 等） | 5.99% + $0.30 | |
| 退款 | 无额外费用 | 已收手续费不退 |
| 争议/拒付 | $15.00/笔 | 申诉成功可退 |
| 货币转换费 | +1% | 在 Stripe 账户内进行 |

### 2.4 Java SDK 技术分析

#### 2.4.1 基本信息

| 属性 | 值 |
|------|-----|
| Maven GroupId | `com.stripe` |
| ArtifactId | `stripe-java` |
| 最新稳定版 | **32.2.0** |
| 锁定 API 版本 | **2026-04-22** (dahlia) |
| 最低 JDK | 1.8+ |
| GitHub Stars | 9k+ |
| 许可证 | MIT |
| 依赖项数量 | 极少（主要依赖 gson） |

#### 2.4.2 Maven 依赖

```xml
<dependency>
    <groupId>com.stripe</groupId>
    <artifactId>stripe-java</artifactId>
    <version>32.2.0</version>
</dependency>
```

#### 2.4.3 SDK 初始化方式

**推荐模式（v23+）**：实例化 `StripeClient`

```java
// StripeClient 实例化（线程安全，建议单例）
StripeClient stripeClient = new StripeClient("sk_test_xxx");
```

> 注意：新版 SDK 废弃了旧版静态 `Stripe.apiKey = "..."` 模式。`StripeClient` 线程安全，应注入为 Spring Bean（单例）。

#### 2.4.4 核心 API 类

| 类名 | 用途 | 所属模块 |
|------|------|---------|
| `StripeClient` | 主客户端，管理 API 认证和请求 | 核心 |
| `Session` / `SessionCreateParams` | Checkout Session 创建与查询 | `client.v1().checkout().sessions()` |
| `PaymentIntent` / `PaymentIntentCreateParams` | 支付意图管理 | `client.v1().paymentIntents()` |
| `Customer` / `CustomerCreateParams` | 客户管理 | `client.v1().customers()` |
| `Refund` / `RefundCreateParams` | 退款 | `client.v1().refunds()` |
| `Event` / `EventDataObjectDeserializer` | Webhook 事件解析 | `Webhook.constructEvent()` |
| `StripeException` | 异常基类 | 含 `CardException`、`AuthenticationException` 等子类 |

### 2.5 两种核心集成模式深入对比

#### 2.5.1 Stripe Checkout（托管结账页）

**流程**：
```
用户下单 -> 后端创建 Checkout Session -> 返回 Stripe 托管页 URL
-> 用户跳转至 Stripe 页面 -> 输入支付信息
-> Stripe 处理支付 -> 重定向到 success_url/cancel_url
-> Stripe 同时异步推 Webhook 事件到后端 -> 后端更新订单状态
```

**优点**：
- 前端开发量极少（仅需一个 URL 跳转）
- Stripe 承担 PCI 合规责任 -> 商户获得 **SAQ-A** 最低合规等级
- 自动支持 40+ 支付方式，自动适配移动端
- 内置 3D Secure 2 强客户认证（SCA）
- Stripe 持续优化转化率（A/B 测试支付页面布局）

**缺点**：
- 用户跳出本站，品牌体验不连贯
- 页面风格自定义仅限 logo、品牌色、域名
- Checkout Session 24 小时后过期

**关键代码**：
```java
SessionCreateParams params = SessionCreateParams.builder()
    .setMode(SessionCreateParams.Mode.PAYMENT)
    .setSuccessUrl("https://example.com/payment/success?session_id={CHECKOUT_SESSION_ID}")
    .setCancelUrl("https://example.com/payment/cancel")
    .setClientReferenceId(orderId)  // 关联内部订单号
    .addLineItem(SessionCreateParams.LineItem.builder()
        .setQuantity(1L)
        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
            .setCurrency("usd")
            .setUnitAmount(2000L)  // $20.00（分为单位）
            .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                .setName("Premium Membership - 1 Year")
                .build())
            .build())
        .build())
    .putMetadata("order_id", orderId)
    .build();
Session session = stripeClient.v1().checkout().sessions().create(params);
return session.getUrl();  // 返回给前端进行 302 跳转
```

#### 2.5.2 PaymentIntent（嵌入式支付）

**流程**：
```
用户下单 -> 后端创建 PaymentIntent -> 返回 clientSecret
-> 前端 Stripe.js Elements 渲染支付表单 -> 用户输入卡号
-> stripe.confirmPayment() -> Stripe 处理 -> Webhook 通知后端
```

**优点**：
- 完全自定义 UI，用户不离开本站
- 灵活控制支付流程各环节
- 支持保存支付方式（SetupIntent）、分期支付等高级功能

**缺点**：
- 前端开发量大（集成 Stripe.js + webhook 状态监听）
- PCI 合规等级至少 **SAQ A-EP**（~190 项要求）
- 需自行处理 3D Secure 认证流程
- Mobile 端需额外集成 Stripe iOS/Android SDK

### 2.6 Webhook 机制详解

Webhook 是 Stripe 集成的**安全基石和业务处理的唯一可靠入口**。

#### 2.6.1 投递语义

- **投递保障**：at-least-once（至少一次送达）
- **重试策略**：投递失败后按指数退避重试（最长持续 3 天）
- **超时时间**：Webhook 端点需在 **10s** 内返回 2xx 状态码

#### 2.6.2 关键事件类型

| 事件类型 | 触发时机 | 处理优先级 | 业务含义 |
|---------|---------|----------|---------|
| `checkout.session.completed` | Checkout 支付完成 | **P0** | 主流程入口，订单状态更新为 PAID |
| `checkout.session.async_payment_succeeded` | 异步支付方式（如银行转账）到账 | **P0** | 补充确认某些延迟到账的支付 |
| `checkout.session.expired` | Session 超过 24h 未支付 | P1 | 订单标记为 EXPIRED，释放库存 |
| `payment_intent.succeeded` | PaymentIntent 支付成功 | **P0** | 使用 PaymentIntent 模式时主入口 |
| `payment_intent.payment_failed` | 支付失败 | P1 | 记录失败原因，通知用户 |
| `payment_intent.canceled` | 用户主动取消 | P1 | 释放库存 |
| `charge.refunded` | 退款处理完成 | **P0** | 更新订单退款状态 |
| `charge.dispute.created` | 发生争议/拒付 | **P0** | 立即告警，准备申诉 |
| `charge.dispute.closed` | 争议处理结束 | P1 | 更新争议结果 |
| `charge.dispute.funds_reinstated` | 争议胜诉资金退回 | P1 | 资金退回确认 |
| `radar.early_fraud_warning.created` | 欺诈预警 | P1 | 人工审核 |

#### 2.6.3 签名验证（安全底线）

```java
@PostMapping("/api/payment/callback/stripe")
public ResponseEntity<String> handleStripeWebhook(
        @RequestBody String payload,       // 必须是原始 String
        @RequestHeader("Stripe-Signature") String sigHeader) {
    Event event;
    try {
        event = Webhook.constructEvent(
            payload, sigHeader, stripeConfig.getWebhookSecret()
        );
    } catch (SignatureVerificationException e) {
        log.error("Stripe webhook signature verification failed", e);
        return ResponseEntity.status(400).body("Invalid signature");
    }

    // 异步处理业务逻辑，立即返回 200（Stripe 要求 10s 内响应）
    eventProcessor.processAsync(event);
    return ResponseEntity.ok("OK");
}
```

**注意事项**：
- Spring 需配置跳过 Webhook 路径的 body 预解析（否则 Jackson 自动反序列化会破坏 payload）
- 签名头格式：`t=timestamp,v1=hmac_sha256_signature[,v0=raw_signature]`
- Webhook Secret（`whsec_xxx`）必须与 API Secret Key 分离管理

#### 2.6.4 幂等性设计

Stripe Webhook 可能投递同一事件多次。必须实现两层幂等：

**第一层：事件级去重**
```sql
-- 数据库唯一约束
ALTER TABLE stripe_webhook_event ADD UNIQUE KEY uk_event_id (event_id);
```

```java
// 处理前检查
if (stripeWebhookEventMapper.existsByEventId(event.getId())) {
    log.info("Duplicate webhook event, skipped: eventId={}", event.getId());
    return;  // 已处理，幂等返回
}
```

**第二层：状态机保护**
```java
// 订单状态机：只有 PENDING 状态才能转为 PAID
int affected = paymentOrderMapper.updateStatus(
    orderId, "PAID", "PENDING", eventId
);
if (affected == 0) {
    log.warn("Order status already updated or order not found: orderId={}", orderId);
}
```

---

## 3. 与现有支付宝架构的对比分析

### 3.1 支付流程对比

| 维度 | 支付宝（Alipay） | Stripe（Checkout） | 差异关键点 |
|------|----------------|-------------------|----------|
| 支付发起 | 构造签名参数 + 拼接 URL 跳转支付宝收银台 | 创建 Checkout Session + 返回 Stripe URL | 流程相似，均需后端生成支付参数后跳转 |
| 支付页面 | 支付宝收银台（托管） | Stripe Checkout 页面（托管） | 均为托管页面，商户端无需自建 |
| 同步回调 | `return_url`（GET，支付完成后浏览器跳回） | `success_url` / `cancel_url`（GET） | 机制相同，参数不同 |
| 异步通知 | `notify_url`（POST，XML/JSON） | Webhook（POST，JSON） | Webhook 设计更现代，但需注意原始 body 获取 |
| 签名算法 | RSA/RSA2 非对称加密 | HMAC-SHA256 对称签名 | Stripe 验证更简单（一行代码） |
| 签名验证 | 手动拼接参数串 + 验证签名 | `Webhook.constructEvent()` 一行验证 | Stripe 开发体验显著更优 |
| 订单查询 | 调用 `alipay.trade.query` | `Session.retrieve()` 或 `PaymentIntent.retrieve()` | 均需主动查询作为补偿 |
| 退款 | 调用 `alipay.trade.refund` | `Refund.create()` | API 风格不同，功能等价 |
| 对账 | 下载账单 CSV | Dashboard 导出或 API 拉取 | 均可实现 |

### 3.2 SDK 对比

| 维度 | alipay-sdk-java | stripe-java (32.2.0) |
|------|----------------|---------------------|
| 初始化方式 | `DefaultAlipayClient` 实例化 | `StripeClient` 实例化（推荐） |
| API 调用风格 | 泛型 `execute(request)` | 链式 Builder + `client.v1().resource().action()` |
| 签名工具 | 手动 `SignatureUtil.sign()` / `verify()` | `Webhook.constructEvent()` 自动验证 |
| 文档质量 | 中文为主，部分英文，示例少 | 全英文，极其详尽，官方教程和视频丰富 |
| 社区活跃度 | 国内活跃，国际弱 | GitHub 9k+ Stars，全球社区活跃 |
| 测试工具 | 沙箱环境 | 测试模式一键切换 + Stripe CLI 本地测试 |
| 版本管理 | 按数字版本 | 按日期版本（2026-04-22）强类型锁定 |

### 3.3 可靠性模型对比（核心差异）

| 维度 | 支付宝 | Stripe |
|------|--------|--------|
| 通知可靠性 | 双通道（return_url + notify_url）| 主通道 Webhook + 辅助 success_url |
| 重试机制 | notify_url 有重试 | Webhook 指数退避重试（最长 3 天） |
| 补偿机制 | 需自行实现 | API 查询 + Dashboard 手动重发 |
| 幂等保障 | 需自行实现 | Stripe API 层支持 Idempotency-Key |

> 支付宝的双通道通知在体验上更友好（同步给用户反馈，异步给服务端确认），但 architecture 上更复杂。Stripe 强烈推荐以 Webhook 为唯一可靠来源，success_url 仅用于 UI 展示。

### 3.4 架构差异总结

| 维度 | 支付宝 | Stripe | 对统一架构的影响 |
|------|--------|--------|----------------|
| SDK 成熟度 | 中等 | 非常高 | 设计统一接口时应参考 Stripe 更现代的设计 |
| API 一致性 | 多种 API 版本并存 | 统一 RESTful API | Stripe 模式更适合作为抽象层的参考基准 |
| PCI 合规 | 支付宝承担主要责任 | SAQ-A（Checkout 模式） | 选择 Checkout 大幅降低合规负担 |
| 国际化 | 亚太 + 跨境 | 全球 46+ 国家 | Stripe 显著更强 |
| 支付方式 | 支付宝账户、花呗、银行卡 | 40+ 种（含 Alipay） | Stripe 覆盖面更广 |

---

## 4. 推荐技术方案

### 4.1 集成模式选择：Stripe Checkout

**推荐采用 Stripe Checkout（托管结账页）模式**。

| 评估维度 | Checkout 模式 | PaymentIntent 模式 | 权重 |
|---------|:---:|:---:|:---:|
| 开发周期 | 1-2 周 | 3-4 周 | 高 |
| 前端改造量 | 极少（仅跳转） | 大（集成 Stripe.js） | 高 |
| PCI 合规等级 | SAQ-A（~22 项） | SAQ A-EP（~190 项） | 极高 |
| 与现有支付宝流程一致性 | 高（均为跳转） | 低（站内嵌入） | 中 |
| 多支付方式支持 | 自动支持 | 需手动配置 | 中 |
| 移动端适配 | 内置响应式 | 需自行适配 | 中 |
| UI 自定义 | 低 | 高 | 低（首期） |
| 用户学习成本 | 低（类似支付宝） | 需要适应 | 低 |

**决策分析**：当前阶段以快速上线、安全合规、流程一致为最高优先级。Checkout 模式与现有支付宝跳转流程最接近，能最大化复用现有架构。

### 4.2 架构模式：策略模式 + 适配器模式

**统一支付网关接口**：

```java
/**
 * 统一支付网关服务接口。
 * 所有支付渠道（支付宝、Stripe、未来 PayPal 等）均实现此接口。
 */
public interface PaymentGatewayService {

    /**
     * 创建支付请求。
     * @return 包含跳转 URL 或客户端密钥的响应
     */
    CreatePaymentResponse createPayment(CreatePaymentRequest request);

    /**
     * 处理异步回调/Webhook。
     * @param rawBody 原始请求体（用于签名验证）
     * @param headers 请求头信息
     * @return 回调处理结果
     */
    PaymentCallbackResult handleCallback(String rawBody, Map<String, String> headers);

    /**
     * 主动查询支付状态。
     */
    PaymentQueryResult queryPaymentStatus(String outTradeNo);

    /**
     * 发起退款。
     */
    RefundResponse createRefund(RefundRequest request);

    /**
     * 验证回调签名是否合法。
     */
    boolean verifySignature(String rawBody, String signature);

    /**
     * 返回此网关支持的支付渠道标识。
     */
    PaymentChannel getChannel();
}
```

**实现类映射**：

| 实现类 | 支付网关 | 说明 |
|-------|---------|------|
| `AlipayGatewayService` | 支付宝 | 封装现有 `AlipayService`，适配至统一接口 |
| `StripeGatewayService` | Stripe | 新建，实现 Checkout Session + Webhook |
| `PaymentGatewayRouter` | - | 路由类，根据 `channel` 参数选择具体实现 |

### 4.3 技术选型总结

| 技术项 | 选型 | 版本/说明 |
|--------|------|----------|
| Stripe SDK | stripe-java | 32.2.0（API 版本 2026-04-22） |
| 集成模式 | Stripe Checkout | 托管结账页，对标支付宝跳转 |
| 异步通知 | Webhook | 所有关键业务逻辑在 Webhook 中处理 |
| 同步回调 | success_url | 仅用于前端页面跳转，不做业务状态变更 |
| 架构模式 | 策略 + 适配器 | `PaymentGatewayService` 统一接口 |
| 幂等性 | 数据库唯一约束 + 状态机 | event_id 唯一索引 + 乐观锁 |
| API Key 管理 | 环境变量 + 配置中心 | 测试/生产使用不同 Key 对 |
| Webhook 测试 | Stripe CLI | 本地开发 + CI 集成测试 |

---

## 5. 系统架构设计

### 5.1 整体架构图

```
                          ┌──────────────────────────┐
                          │       前端 (Browser)       │
                          │  支付方式选择: [Alipay]    │
                          │               [Stripe]    │
                          │  选择后 302 -> Stripe URL   │
                          └────────────┬─────────────┘
                                       │
                              HTTPS    │
                                       ▼
                          ┌──────────────────────────┐
                          │    API Gateway / Nginx     │
                          │  /api/payment/**           │
                          └────────────┬─────────────┘
                                       │
                         ┌─────────────┴──────────────┐
                         │                            │
                         ▼                            ▼
          ┌──────────────────────────┐  ┌──────────────────────────┐
          │   PaymentController      │  │  StripeWebhookController │
          │  POST /api/payment/create │  │  POST /api/payment/      │
          │  GET  /api/payment/success│  │       callback/stripe    │
          │  GET  /api/payment/cancel │  │  POST /api/payment/      │
          │  POST /api/payment/refund │  │       callback/alipay    │
          │  GET  /api/payment/query  │  │                          │
          └────────────┬─────────────┘  └────────────┬─────────────┘
                       │                             │
                       ▼                             │
          ┌──────────────────────────────────────────┴──┐
          │          PaymentGatewayRouter                │
          │  channel=ALIPAY  -> AlipayGatewayService     │
          │  channel=STRIPE  -> StripeGatewayService     │
          │  channel=PAYPAL  -> (future)                 │
          └────────────┬─────────────────────────────────┘
                       │
         ┌─────────────┴──────────────┐
         │                            │
         ▼                            ▼
┌──────────────────┐    ┌──────────────────────────┐
│ AlipayGatewayService│  │  StripeGatewayService    │
│ (封装已有 Alipay  │    │  ├─ createPayment()      │
│  Service 逻辑)    │    │  ├─ handleWebhook()      │
│                  │    │  ├─ queryPaymentStatus()  │
│                  │    │  └─ createRefund()        │
└────────┬─────────┘    └──────────┬───────────────┘
         │                         │
         └──────────┬──────────────┘
                    │
                    ▼
         ┌──────────────────┐
         │  Data Access Layer│
         │  (MyBatis Mapper) │
         │  PaymentOrderMapper│
         │  PaymentRecordMapper│
         │  StripeEventMapper │
         └────────┬─────────┘
                  │
                  ▼
         ┌──────────────────┐
         │   MySQL Database  │
         └──────────────────┘
                  │
                  ▼
         ┌──────────────────────────┐
         │      Stripe Cloud         │
         │  Checkout Session         │
         │  -> PaymentIntent         │
         │  -> Webhook Events        │
         └──────────────────────────┘
```

### 5.2 模块划分

```
src/main/java/com/example/payment/
├── controller/
│   ├── PaymentController.java              // 统一支付控制器（用户侧）
│   └── PaymentWebhookController.java       // 支付回调控制器（网关侧）
├── service/
│   ├── PaymentGatewayService.java          // 支付网关顶层接口（策略）
│   ├── PaymentGatewayRouter.java           // 支付网关路由器
│   ├── PaymentBusinessService.java         // 支付业务服务（订单关联逻辑）
│   ├── alipay/
│   │   └── AlipayGatewayService.java       // 支付宝适配器
│   └── stripe/
│       ├── StripeGatewayService.java       // Stripe 适配器
│       ├── StripeWebhookProcessor.java     // Webhook 事件分发处理器
│       └── StripeConfig.java              // Stripe 配置属性
├── model/
│   ├── CreatePaymentRequest.java           // 统一支付创建请求
│   ├── CreatePaymentResponse.java          // 统一支付创建响应
│   ├── PaymentCallbackResult.java          // 统一回调处理结果
│   ├── PaymentQueryResult.java             // 支付查询结果
│   ├── RefundRequest.java                  // 退款请求
│   ├── RefundResponse.java                 // 退款响应
│   ├── PaymentChannel.java                 // 支付渠道枚举
│   └── stripe/
│       └── StripeWebhookEventRecord.java   // Stripe Webhook 事件记录 Entity
├── mapper/
│   ├── PaymentOrderMapper.java             // 已有
│   ├── PaymentRecordMapper.java            // 已有
│   └── StripeWebhookEventMapper.java       // 新增
├── config/
│   ├── StripeConfiguration.java            // StripeClient Bean 配置
│   └── PaymentGatewayConfiguration.java    // 支付网关自动装配
└── util/
    └── IdempotencyKeyGenerator.java        // 幂等键生成工具
```

### 5.3 StripeGatewayService 核心逻辑

```
createPayment(request)
    │
    ├── 1. 参数校验：金额 > 0、币种合法、订单存在且状态为 PENDING
    ├── 2. 生成内部支付流水号 (out_trade_no) + 幂等键 (ORDER_{orderId})
    ├── 3. 构建 SessionCreateParams：
    │     ├── Mode: PAYMENT
    │     ├── LineItem: quantity × unit_price
    │     ├── Success/Cancel URL (含 {CHECKOUT_SESSION_ID} 占位符)
    │     ├── client_reference_id: 内部订单号
    │     └── metadata: {order_id, platform, version}
    ├── 4. 调用 stripeClient.v1().checkout().sessions().create(params)
    │     (带 Idempotency-Key 头)
    ├── 5. 保存 stripe_session_id 到 payment_order 表
    ├── 6. 记录支付创建日志 (traceId + orderId + sessionId)
    └── 7. 返回 checkoutUrl 给前端

handleWebhook(payload, signatureHeader)
    │
    ├── 1. Webhook.constructEvent() 验证签名
    │     └── 失败: 记录告警日志 + 返回 400
    ├── 2. 幂等检查: 查询 stripe_webhook_event 表是否存在 event.id
    │     └── 存在: 记录日志 + 直接返回 200 (幂等)
    ├── 3. 保存事件记录 (状态: PENDING, 原始 payload 备查)
    ├── 4. 根据 event.type 分发处理:
    │     ├── checkout.session.completed:
    │     │   ├── 提取 session_id + payment_intent_id
    │     │   ├── 查询 payment_order (通过 stripe_session_id)
    │     │   ├── 状态机检查: PENDING -> PAID
    │     │   ├── 更新订单状态 + 记录支付金额/时间
    │     │   └── 触发后续流程: 发货/交付通知
    │     ├── checkout.session.expired:
    │     │   └── PENDING -> EXPIRED (释放库存)
    │     ├── charge.refunded:
    │     │   ├── 提取 payment_intent_id + 退款金额
    │     │   ├── 更新订单状态 PAID -> REFUNDED (或 PARTIAL_REFUND)
    │     │   └── 更新退款记录
    │     └── charge.dispute.created:
    │         ├── 记录争议信息
    │         └── 发送告警 (钉钉/邮件/企微)
    ├── 5. 更新事件记录状态为 SUCCESS
    └── 6. 返回 200 OK

queryPaymentStatus(outTradeNo)
    │
    ├── 1. 查询数据库获取 stripe_session_id
    ├── 2. session.retrieve() 获取 Session 状态
    ├── 3. 通过 session.getPaymentIntent() 获取 PaymentIntent 详情
    ├── 4. 如状态与数据库不一致 -> 触发对账修正
    └── 5. 返回统一 QueryResult

createRefund(outTradeNo, amount)
    │
    ├── 1. 查询数据库: 订单存在 && 状态为 PAID
    ├── 2. 验证退款金额 <= 已支付金额 - 已退款金额
    ├── 3. RefundCreateParams: payment_intent + amount
    ├── 4. 调用 stripeClient.v1().refunds().create(params)
    ├── 5. 保存退款记录 (状态: PROCESSING)
    └── 6. 最终状态由 Webhook (charge.refunded) 确认
```

### 5.4 订单补偿机制（定时任务）

为应对 Webhook 丢失或延迟的极端情况，增加定时补偿扫描：

```java
@Scheduled(fixedDelay = 5 * 60 * 1000)  // 每 5 分钟
public void compensatePendingOrders() {
    // 查询创建超过 30 分钟仍为 PENDING 的 Stripe 订单
    List<PaymentOrder> pendingOrders = paymentOrderMapper
        .findStripePendingOrders(LocalDateTime.now().minusMinutes(30));

    for (PaymentOrder order : pendingOrders) {
        PaymentQueryResult result = stripeGatewayService
            .queryPaymentStatus(order.getOutTradeNo());
        if ("PAID".equals(result.getStatus())) {
            // 补偿更新
            paymentBusinessService.confirmPayment(order.getId(),
                result.getTransactionId());
        } else if ("EXPIRED".equals(result.getStatus())) {
            paymentBusinessService.expireOrder(order.getId());
        }
    }
}
```

---

## 6. 数据库设计

### 6.1 方案选择：扩展已有表 + 新增独立事件表

综合考虑数据一致性和最小改动，采用混合策略：
- 在已有支付订单表新增 Stripe 相关字段（最小改动）
- 新增独立的 Stripe Webhook 事件记录表（审计 + 幂等）

### 6.2 DDL 变更

#### 6.2.1 已有表扩展

```sql
-- === payment_order 表新增字段 ===

ALTER TABLE payment_order ADD COLUMN payment_method VARCHAR(32) NOT NULL DEFAULT 'ALIPAY'
    COMMENT '支付方式: ALIPAY, STRIPE';

ALTER TABLE payment_order ADD COLUMN stripe_session_id VARCHAR(128)
    COMMENT 'Stripe Checkout Session ID';

ALTER TABLE payment_order ADD COLUMN stripe_payment_intent_id VARCHAR(128)
    COMMENT 'Stripe PaymentIntent ID';

ALTER TABLE payment_order ADD COLUMN payment_currency VARCHAR(8) DEFAULT 'CNY'
    COMMENT '支付币种: USD, CNY, EUR 等 (ISO 4217)';

ALTER TABLE payment_order ADD COLUMN payment_amount_original DECIMAL(12,2)
    COMMENT '原始币种支付金额（当币种非本位币时）';

ALTER TABLE payment_order ADD COLUMN settle_currency VARCHAR(8)
    COMMENT '结算币种';

ALTER TABLE payment_order ADD COLUMN settle_amount DECIMAL(12,2)
    COMMENT '结算金额（本位币）';

-- === 索引 ===

ALTER TABLE payment_order ADD UNIQUE INDEX uk_stripe_session_id (stripe_session_id);
ALTER TABLE payment_order ADD UNIQUE INDEX uk_stripe_payment_intent (stripe_payment_intent_id);
ALTER TABLE payment_order ADD INDEX idx_payment_method_status (payment_method, status);
ALTER TABLE payment_order ADD INDEX idx_created_status (created_at, status);
```

#### 6.2.2 新增 Stripe Webhook 事件表

```sql
CREATE TABLE stripe_webhook_event (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(128) NOT NULL COMMENT 'Stripe Event ID (evt_xxx)',
    event_type VARCHAR(64) NOT NULL COMMENT '事件类型: checkout.session.completed 等',
    api_version VARCHAR(32) COMMENT 'Stripe API 版本号',
    payment_intent_id VARCHAR(128) COMMENT '关联 PaymentIntent ID',
    session_id VARCHAR(128) COMMENT '关联 Checkout Session ID',
    charge_id VARCHAR(128) COMMENT '关联 Charge ID',
    customer_id VARCHAR(128) COMMENT '关联 Customer ID',
    order_id BIGINT COMMENT '关联内部订单 ID',
    raw_payload MEDIUMTEXT COMMENT '原始事件 JSON (审计备查)',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING'
        COMMENT '处理状态: PENDING, PROCESSING, SUCCESS, FAILED, IGNORED',
    retry_count INT DEFAULT 0 COMMENT '重试次数',
    error_message TEXT COMMENT '处理错误信息',
    external_created_at DATETIME COMMENT 'Stripe 事件创建时间 (event.created)',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME COMMENT '处理完成时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_event_id (event_id),
    INDEX idx_event_type (event_type),
    INDEX idx_status (status),
    INDEX idx_order_id (order_id),
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Stripe Webhook 事件处理记录';

-- === 数据归档策略 ===
-- 建议 90 天后将 SUCCESS/IGNORED 状态记录归档至历史表
```

#### 6.2.3 新增退款记录表

```sql
CREATE TABLE payment_refund (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL COMMENT '关联订单 ID',
    out_refund_no VARCHAR(64) NOT NULL COMMENT '商户退款单号',
    stripe_refund_id VARCHAR(128) COMMENT 'Stripe Refund ID (re_xxx)',
    refund_amount DECIMAL(12,2) NOT NULL COMMENT '退款金额',
    refund_currency VARCHAR(8) NOT NULL COMMENT '退款币种',
    refund_reason VARCHAR(256) COMMENT '退款原因',
    refund_type VARCHAR(32) NOT NULL COMMENT '退款类型: FULL, PARTIAL',
    status VARCHAR(32) NOT NULL DEFAULT 'PROCESSING'
        COMMENT '退款状态: PROCESSING, SUCCEEDED, FAILED',
    operator_id BIGINT COMMENT '操作人 ID',
    operator_name VARCHAR(64) COMMENT '操作人姓名',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME COMMENT '退款完成时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_out_refund_no (out_refund_no),
    UNIQUE KEY uk_stripe_refund_id (stripe_refund_id),
    INDEX idx_order_id (order_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付退款记录';
```

### 6.3 数据生命周期

| 数据类型 | 保留策略 | 说明 |
|---------|---------|------|
| Stripe Webhook 事件 | 90 天热数据 + 归档 | SUCCESS/IGNORED 事件 90 天后归档 |
| 支付订单 | 永久保留 | 核心业务数据 |
| 退款记录 | 永久保留 | 财务审计需要 |
| API 调用日志 | 30 天 | 通过日志系统管理 |

---

## 7. 接口详细设计

### 7.1 支付创建接口

```
POST /api/payment/create

Request:
{
    "orderId": "ORD-20260608-001",
    "paymentMethod": "STRIPE",
    "amount": 2000,                    // 单位：分（Stripe 最小单位）
    "currency": "USD",                 // ISO 4217 货币代码
    "description": "Premium Membership - 1 Year",
    "successUrl": "https://example.com/payment/success?orderId=ORD-20260608-001",
    "cancelUrl": "https://example.com/payment/cancel?orderId=ORD-20260608-001",
    "metadata": {                      // 可选：透传业务数据
        "userId": "12345",
        "planId": "premium_yearly"
    }
}

Response (200):
{
    "code": 200,
    "message": "success",
    "data": {
        "outTradeNo": "PAY-20260608-001",
        "paymentMethod": "STRIPE",
        "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_xxx",
        "sessionId": "cs_test_xxx",
        "status": "PENDING",
        "expireTime": "2026-06-09T10:30:00Z"   // Session 过期时间
    },
    "timestamp": 1717843200
}

错误响应:
- 400: 参数校验失败（金额非法、币种不支持、订单不存在）
- 409: 订单已支付或已过期
- 503: Stripe 服务不可用（降级提示用户使用支付宝）
```

### 7.2 Stripe Webhook 回调接口

```
POST /api/payment/callback/stripe

Headers:
  stripe-signature: t=1717843200,v1=2b3c4d...,v0=1a2b3c...

Body: (由 Stripe 服务器推送，原始 JSON)
{
    "id": "evt_1AbCdEfGhIjKlMnOpQrStUv",
    "object": "event",
    "api_version": "2026-04-22",
    "created": 1717843200,
    "data": {
        "object": {
            "id": "cs_test_xxx",
            "object": "checkout.session",
            "payment_intent": "pi_xxx",
            "payment_status": "paid",
            "client_reference_id": "ORD-20260608-001",
            ...
        }
    },
    "type": "checkout.session.completed"
}

Response:
- 200: 处理成功（含幂等跳过）
- 400: 签名验证失败
- 500: 处理异常（Stripe 将重试）

注意事项:
1. Spring 必须配置此端点不预解析 body（使用 @RequestBody String 或 RawBodyReader Filter）
2. 必须在 10 秒内返回 2xx
3. 复杂业务逻辑异步处理（@Async 或消息队列）
```

### 7.3 同步回调接口（仅页面跳转）

```
GET /api/payment/success?session_id={CHECKOUT_SESSION_ID}

逻辑:
1. 通过 session_id 查询订单状态（已在 Webhook 中更新）
2. 若订单已 PAYMENT，返回成功页面 / 跳转订单详情
3. 若订单仍 PENDING（Webhook 尚未到达），展示"支付处理中"页面 + 前端轮询
```

### 7.4 支付查询接口

```
GET /api/payment/query/{outTradeNo}

Response (200):
{
    "code": 200,
    "data": {
        "outTradeNo": "PAY-20260608-001",
        "paymentMethod": "STRIPE",
        "status": "PAID",                  // PENDING / PAID / EXPIRED / REFUNDED
        "transactionId": "pi_xxx",         // Stripe PaymentIntent ID
        "paidAmount": 2000,
        "currency": "USD",
        "paidAt": "2026-06-08T10:30:05Z"
    }
}
```

### 7.5 退款接口

```
POST /api/payment/refund

Request:
{
    "orderId": "ORD-20260608-001",
    "refundAmount": 1000,                // 部分退款金额（分），不传则全额退款
    "reason": "用户申请退款 - 商品不满意"
}

Response (200):
{
    "code": 200,
    "data": {
        "outRefundNo": "REF-20260608-001",
        "stripeRefundId": "re_xxx",
        "refundAmount": 1000,
        "status": "PROCESSING"           // 最终状态由 Webhook 确认
    }
}
```

---

## 8. 安全与合规

### 8.1 PCI DSS 合规分析

| 集成模式 | SAQ 等级 | 要求项数 | 适用场景 | 本项目 |
|---------|---------|---------|---------|:---:|
| Stripe Checkout / Payment Links | SAQ A | ~22 项 | Stripe 托管支付页面，用户卡数据不经过商户服务器 | 是 |
| Stripe Elements / Mobile SDK | SAQ A-EP | ~190 项 | 支付表单嵌入商户页面，卡数据经 Stripe.js 直传 Stripe | 否 |
| 完全自建支付表单 | SAQ D | ~300+ 项 | 自行处理卡号数据 | 否 |

**本项目使用 Stripe Checkout 模式，合规等级为最低的 SAQ A**。

合规要求清单（SAQ A 核心）：
- [ ] 所有页面使用 HTTPS（TLS 1.2+）
- [ ] 完成年度 PCI DSS 自我评估问卷（SAQ A）
- [ ] 确保证书配置正确且未过期
- [ ] 实施访问控制策略，限制对持卡人数据环境的访问
- [ ] 维护信息安全策略文档

### 8.2 Webhook 签名验证

这是 Stripe 安全对接的**底线**，必须 100% 验证：

```java
@Configuration
public class StripeConfiguration {

    @Value("${stripe.secret-key}")
    private String secretKey;

    @Value("${stripe.webhook-secret}")
    private String webhookSecret;

    @Bean
    public StripeClient stripeClient() {
        return new StripeClient(secretKey);
    }

    @Bean
    public StripeConfig stripeConfig() {
        return new StripeConfig(secretKey, webhookSecret);
    }
}
```

**验证流程**：
1. 获取原始 HTTP 请求体（未经 Jackson 预解析的字符串）
2. 获取 `Stripe-Signature` 请求头
3. 使用 `Webhook.constructEvent(payload, sigHeader, webhookSecret)` 一键验证
4. 验证失败时：记录告警、返回 400、触发安全通知
5. Webhook Secret 须与 API Secret Key 分离管理

### 8.3 API Key 安全管理

| 密钥类型 | 格式 | 用途 | 安全级别 |
|---------|------|------|---------|
| Publishable Key | `pk_test_xxx` / `pk_live_xxx` | 前端 Stripe.js 初始化 | 可公开（前端） |
| Secret Key | `sk_test_xxx` / `sk_live_xxx` | 后端 API 调用 | **绝密** |
| Webhook Signing Secret | `whsec_xxx` | Webhook 签名验证 | **绝密** |
| Restricted Key | `rk_test_xxx` / `rk_live_xxx` | 生产环境推荐替代 Secret Key | **绝密** |

**管理策略**：
- 禁止硬编码，禁止提交至 Git 仓库
- 使用环境变量或配置中心（Spring Cloud Config / Vault）
- 生产环境使用 Restricted Keys（最小权限原则）
- 测试环境和生产环境使用不同的 Key 对
- Secret Key 和 Webhook Secret 分离存储
- 日志输出时自动脱敏（`sk_***...***xxx`）
- 定期轮换（建议每 90 天）

### 8.4 幂等性保障体系

| 层级 | 策略 | 实现方式 | 覆盖场景 |
|------|------|---------|---------|
| Stripe API 调用 | 请求级幂等键 | `Idempotency-Key: ORDER_{orderId}` | 创建 Session/PaymentIntent 时的网络重试 |
| Webhook 处理 | 事件级幂等 | 数据库 `uk_event_id` 唯一约束 | Stripe 重试的 Webhook 事件 |
| 订单状态更新 | 状态机 + 乐观锁 | `UPDATE ... WHERE status = 'PENDING' AND version = ?` | 并发回调导致的重复更新 |
| 退款请求 | 请求级幂等键 | `Idempotency-Key: REFUND_{refundNo}` | 退款请求网络重试 |

### 8.5 其他安全措施

- **HTTPS 强制**：所有端点必须使用 HTTPS，HTTP 请求通过 301 重定向或直接拒绝
- **请求日志**：完整记录 API 请求和 Webhook 事件用于审计，敏感字段脱敏
- **限流保护**：Webhook 端点配置合理的并发限制（如 100 req/s），防止恶意利用
- **请求来源校验**：Webhook 端点可配置仅接收 Stripe IP 段（非必须，签名验证已足够）
- **异常监控与告警**：签名验证失败、连续 API 调用失败、异常退款需立即告警
- **Stripe Radar**：可选开通 Stripe Radar 风控服务，自动检测和阻止欺诈交易

---

## 9. 风险评估与应对措施

### 9.1 风险矩阵

| 风险编号 | 风险描述 | 概率 | 影响 | 风险等级 | 应对措施 |
|---------|---------|:---:|:---:|:---:|---------|
| R-1 | Webhook 丢失/延迟导致订单状态不更新 | 低 | 高 | **高** | 1. 定时补偿任务（每 5 分钟扫描 pending 订单）<br>2. Stripe Dashboard 手动重发 Webhook<br>3. 前端轮询订单状态作为辅助 |
| R-2 | Webhook 重复投递导致重复处理 | 中 | 高 | **高** | 1. 数据库 `uk_event_id` 唯一约束<br>2. 状态机保护（PENDING -> PAID 仅一次）<br>3. 处理前先查询事件是否已存在 |
| R-3 | Secret Key / Webhook Secret 泄露 | 低 | 极高 | **高** | 1. 环境变量/配置中心管理<br>2. 使用 Restricted Keys<br>3. 定期轮换<br>4. Git pre-commit hook 检测密钥模式 |
| R-4 | Stripe API 服务不可用 | 低 | 高 | **中** | 1. 支付渠道选择时检测 Stripe 可用性<br>2. 降级提示用户使用支付宝<br>3. 熔断机制（如 Resilience4j Circuit Breaker） |
| R-5 | 签名验证失败（Webhook Secret 配置错误） | 低 | 高 | **中** | 1. 部署后第一件事验证 Webhook 签名<br>2. 验证失败告警<br>3. Dashboard 发送测试 Webhook |
| R-6 | 汇率波动导致实际结算金额与预期不符 | 低 | 低 | **低** | 1. Checkout Session 锁定币种<br>2. 展示用户确认的金额<br>3. 记录原始币种和结算币种金额 |
| R-7 | 退款争议（Chargeback） | 中 | 中 | **中** | 1. Webhook 监听 `charge.dispute.created`<br>2. 建立争议处理 SOP<br>3. 收集证据及时申诉<br>4. 结合 Stripe Radar 预警 |
| R-8 | 新架构影响现有支付宝支付 | 低 | 高 | **中** | 1. 先抽象接口，支付宝适配器封装现有逻辑<br>2. 充分回归测试<br>3. 灰度发布，按支付方式分流 |
| R-9 | stripe-java 依赖与现有依赖冲突 | 低 | 低 | **低** | 1. `mvn dependency:tree` 检查<br>2. stripe-java 自身依赖极少（gson），冲突概率低 |
| R-10 | Stripe 沙箱与生产环境行为差异 | 中 | 中 | **中** | 1. Stripe CLI 本地验证 Webhook 流程<br>2. 上线前全流程端到端测试<br>3. 使用 Stripe 测试卡号覆盖各场景 |
| R-11 | 订单幂等键设计不当导致无法重新支付 | 低 | 高 | **中** | 1. 幂等键设计：`ORDER_{orderId}_ATTEMPT_{timestamp}`<br>2. Session 过期后允许生成新 Session（新幂等键）<br>3. 幂等键冲突场景写测试用例 |

### 9.2 故障应对方案

| 故障场景 | 发现手段 | 影响 | 恢复方案 | 恢复时间目标 |
|---------|---------|------|---------|:---:|
| Stripe API 不可用 | 健康检查 + 告警 | Stripe 支付不可用 | 1. 切换至支付宝（用户侧）<br>2. 待 Stripe 恢复后补偿查询 | < 5 min（降级） |
| Webhook 延迟 > 5 min | 监控 Dashboard | 订单状态滞后 | 补偿定时任务主动查询 | < 10 min |
| Webhook Secret 泄露 | 安全监控告警 | 回调可能被伪造 | 1. 立即在 Dashboard 轮换 Secret<br>2. 检查最近事件日志<br>3. 通知安全团队 | < 15 min |
| 数据库唯一约束冲突 | 应用日志告警 | Webhook 处理中断 | 1. 人工确认事件处理状态<br>2. 手动更新订单 | < 30 min |
| 并发退款/支付冲突 | 状态机异常日志 | 订单状态不一致 | 1. DSL 查询异常订单<br>2. 人工介入修复 | < 60 min |

---

## 10. 测试策略

### 10.1 测试分层

```
                    ┌──────────────────────┐
                    │   E2E Tests (Manual)  │  ← 手动端到端验证完整流程
                    ├──────────────────────┤
                    │  Integration Tests    │  ← Stripe 测试模式 + Stripe CLI
                    ├──────────────────────┤
                    │  Unit Tests           │  ← Mock StripeClient，验证业务逻辑
                    └──────────────────────┘
```

### 10.2 单元测试覆盖

| 测试对象 | 测试内容 |
|---------|---------|
| `StripeGatewayService` | 正常创建支付、Session 过期处理、异常场景 |
| Webhook 签名验证 | 正确签名通过、错误签名拒绝、过期时间戳拒绝 |
| 幂等逻辑 | 重复 event_id 直接返回 200、重复支付创建返回已有 URL |
| `PaymentGatewayRouter` | channel=STRIPE 正确路由、未知 channel 正确处理 |
| 退款逻辑 | 全额退款、部分退款、超额退款拒绝、未支付订单拒绝 |
| StripeConfig | 配置项缺失时的启动行为 |

### 10.3 集成测试

**工具**：Stripe CLI (官方命令行工具)

```bash
# 安装 Stripe CLI
brew install stripe/stripe-cli/stripe

# 登录并连接
stripe login
stripe listen --forward-to localhost:8080/api/payment/callback/stripe

# 触发测试事件
stripe trigger checkout.session.completed
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
stripe trigger charge.dispute.created
```

**测试场景清单**：

| 编号 | 场景 | 输入 | 期望结果 |
|:---:|------|------|---------|
| IT-1 | 正常支付流程 | 创建订单 -> Stripe 测试卡 4242... -> 支付 | Webhook 收到 -> 订单状态 PAID |
| IT-2 | 支付失败 | 使用测试卡 4000...0002 | Webhook 收到 payment_failed -> 订单仍 PENDING |
| IT-3 | 3D Secure 认证 | 使用测试卡 4000...3155 | 跳转 3DS 验证 -> 完成后回调 |
| IT-4 | 退款 | 对已支付订单发起退款 | Refund API 成功 -> Webhook 确认 REFUNDED |
| IT-5 | 无效签名 | 使用错误的 Webhook Secret | 返回 400，事件不被处理 |
| IT-6 | 重复 Webhook | 同一 event_id 发送两次 | 第一次正常处理，第二次 200 幂等跳过 |
| IT-7 | 支付宝回归 | 完整支付宝支付流程 | 功能不受影响 |

### 10.4 端到端测试

使用 Stripe 测试模式完成全流程验证：
1. 用户注册/登录 -> 创建订单 -> 选择 Stripe -> 跳转 Stripe Checkout
2. 输入测试卡号 4242 4242 4242 4242 -> 完成支付 -> 跳回 success_url
3. 验证订单状态：PAID
4. 验证通知：用户收到支付成功通知
5. 管理后台发起退款 -> 验证退款状态

### 10.5 Stripe 测试卡号速查

| 场景 | 卡号 | CVV | 有效期 |
|------|------|-----|--------|
| 支付成功 | `4242 4242 4242 4242` | 任意 3 位 | 任意未来日期 |
| 需要 3D Secure 验证 | `4000 0025 0000 3155` | 任意 3 位 | 任意未来日期 |
| 支付被拒（通用） | `4000 0000 0000 0002` | 任意 3 位 | 任意未来日期 |
| 余额不足 | `4000 0000 0000 9995` | 任意 3 位 | 任意未来日期 |
| 卡被盗用 | `4000 0000 0000 9979` | 任意 3 位 | 任意未来日期 |
| 卡过期 | `4000 0000 0000 0069` | 任意 3 位 | 任意未来日期 |
| American Express | `3782 8224 6310 005` | 任意 4 位 | 任意未来日期 |

---

## 11. 可观测性与运维

### 11.1 日志规范

**日志格式**（建议使用 JSON 结构化日志）：

```json
{
    "timestamp": "2026-06-08T10:30:05.123Z",
    "level": "INFO",
    "traceId": "a1b2c3d4e5f6",
    "spanId": "x1y2z3",
    "service": "payment-gateway",
    "module": "StripeGatewayService",
    "action": "createPayment",
    "orderId": "ORD-20260608-001",
    "sessionId": "cs_test_xxx",
    "duration_ms": 320,
    "message": "Stripe checkout session created successfully"
}
```

**关键日志埋点**：

| 埋点位置 | 日志内容 | 级别 |
|---------|---------|:---:|
| API 调用开始 | traceId + orderId + API 方法 | INFO |
| API 调用成功 | traceId + orderId + Session ID + 耗时 | INFO |
| API 调用失败 | traceId + orderId + 错误码 + 错误信息 | ERROR |
| Webhook 接收 | eventId + eventType + 签名验证结果 | INFO |
| Webhook 处理完成 | eventId + orderId + 处理结果 + 耗时 | INFO |
| 签名验证失败 | eventId + 原因 | WARN |
| 幂等跳过 | eventId | INFO |
| 状态机冲突 | orderId + 当前状态 + 目标状态 | WARN |
| 补偿任务执行 | 扫描范围 + 修正订单数 | INFO |

### 11.2 监控指标

| 指标 | 类型 | 告警阈值 | 告警级别 |
|------|:---:|---------|:---:|
| 支付创建成功率 | Counter | < 99% (5min 窗口) | P1 |
| 支付创建延迟 P99 | Histogram | > 2s | P2 |
| Webhook 处理成功率 | Counter | < 99.5% (5min 窗口) | P1 |
| Webhook 签名验证失败率 | Counter | > 0 | P1 |
| 订单状态补偿修正数 | Gauge | > 5 次/小时 | P2 |
| Stripe API 调用异常率 | Counter | > 1% (5min 窗口) | P1 |
| Pending 订单滞留数（> 30min） | Gauge | > 10 | P2 |
| 退款处理延迟 | Histogram | > 1min | P3 |

### 11.3 Stripe Dashboard 监控

- **Developers > Webhooks** 页面：监控 Webhook 送达率、响应码分布、延迟百分位
- **Payments** 页面：监控支付成功率、拒付率、争议率
- **Events** 页面：查看所有事件日志，支持筛选和重发

### 11.4 告警规则

| 规则 | 条件 | 通知方式 | 响应人 |
|------|------|---------|--------|
| Webhook 签名验证失败 | 任何失败 | 钉钉 + 邮件 | 值班开发 + 安全 |
| Stripe API 连续失败 | 5 分钟内 > 10 次 | 钉钉 | 值班开发 |
| Pending 订单超时 | 滞留 > 1h | 钉钉 | 值班开发 |
| 退款争议发生 | `charge.dispute.created` | 钉钉 + 邮件 | 客服 + 财务 |
| 数据库唯一约束冲突 | 任何冲突 | 钉钉 | 值班开发 |

---

## 12. 实施计划

### 12.1 分阶段实施

```
Phase 1：基础设施搭建（第 1 周）
├── Stripe 企业账号注册与认证
├── 获取 API Keys（Publishable Key + Secret Key）
├── 配置 Stripe CLI 本地开发环境
├── Maven 引入 stripe-java 32.2.0
├── StripeClient Bean 配置 (Spring @Configuration)
├── 数据库 DDL 变更 + 索引创建
├── PaymentGatewayService 统一接口定义
└── PaymentChannel 枚举 + PaymentGatewayRouter 初始实现

Phase 2：核心支付功能（第 2 周）
├── StripeGatewayService.createPayment() 实现
├── PaymentController 创建支付接口
├── 前端支付方式选择 + Stripe URL 跳转
├── StripeConfig 配置属性类
├── 单元测试（Mock StripeClient）
└── 集成测试（Stripe 测试模式）

Phase 3：回调与可靠保障（第 3 周）
├── StripeWebhookController（签名验证 + 事件分发）
├── StripeWebhookProcessor（事件类型路由）
├── 幂等性处理（StripeWebhookEventMapper + 状态机）
├── 订单补偿定时任务
├── 退款功能 + 退款 Webhook 处理
├── 支付宝 AlipayGatewayService 适配器封装
├── 全流程集成测试（Stripe CLI + 测试卡号）
└── 异常场景测试（签名错误、重复事件、超时等）

Phase 4：上线与优化（第 4 周）
├── 生产环境 Stripe 配置（Restricted Keys + Webhook endpoint）
├── 监控告警配置（Prometheus metrics + Grafana dashboard）
├── 日志脱敏配置
├── 灰度发布计划：
│   ├── Day 1-2: 内部测试用户（Stripe 测试模式）
│   ├── Day 3-5: 1% 海外用户
│   ├── Day 6-7: 10% 海外用户
│   └── Day 8+: 全量海外用户
├── 支付宝回归测试
└── 上线检查清单确认
```

### 12.2 上线检查清单

- [ ] Stripe Dashboard 已从测试模式切换至生产模式
- [ ] 生产环境 Webhook endpoint 已配置（HTTPS 公网可达）
- [ ] Webhook Secret 已配置且与测试环境不同
- [ ] Restricted Keys 已创建（仅包含所需权限）替换全权限 Secret Key
- [ ] 监控告警已配置并验证
- [ ] 日志脱敏规则已生效
- [ ] 支付宝支付流程回归测试通过
- [ ] Stripe 端到端测试（生产测试模式）通过
- [ ] 回滚方案已确认
- [ ] 值班人员已培训

### 12.3 回滚方案

如上线后出现严重问题（如 Stripe 支付大面积失败、Webhook 处理异常）：

1. **代码回滚**：回滚至上一个稳定版本，不影响支付宝支付
2. **功能降级**：通过配置中心关闭 Stripe 支付选项，不展示给用户
3. **数据修复**：已产生的 Stripe 订单通过手动补偿修复状态
4. **回滚决策条件**：
   - Stripe 支付成功率 < 95%
   - Webhook 处理成功率 < 99%
   - 支付宝支付功能异常

---

## 13. 成本模型

### 13.1 Stripe 交易费用估算

假设月交易额为 $100,000，其中美国卡占 60%、国际卡占 40%：

| 交易类型 | 月交易额 | 费率 | 月费用 |
|---------|---------|------|--------|
| 美国国内卡 | $60,000 | 2.9% + $0.30 | $1,740 + 按笔数 |
| 国际卡 | $40,000 | 3.1% + $0.30 + 1.5% | $1,840 + 按笔数 |
| 争议/拒付（假设 0.5%） | 2.5 笔 | $15.00 | $37.50 |
| **合计（不含固定费用）** | | | ~$3,617.50/月 |

按单笔 $50 计算，月交易 2,000 笔：额外固定费用约 $600 -> **月总费用约 $4,200**

### 13.2 开发成本

| 阶段 | 人力 | 工期 | 人天 |
|------|:---:|:---:|:---:|
| Phase 1: 基础设施 | 1 后端 | 1 周 | 5 |
| Phase 2: 核心支付 | 1 后端 + 1 前端 | 1 周 | 10 |
| Phase 3: 回调与保障 | 1 后端 | 1 周 | 5 |
| Phase 4: 上线与监控 | 1 后端 + 1 运维 | 1 周 | 5 |
| **合计** | | | **25 人天** |

### 13.3 维护成本

- 月度：监控+告警处理（约 0.5 人天/月）
- 季度：SDK 版本升级评估（约 1 人天/季度）
- 年度：PCI 合规 SAQ A 问卷（约 2 人天/年）

---

## 14. 决策建议与待确认事项

### 14.1 核心结论

| 维度 | 结论 |
|------|------|
| **推荐方案** | Stripe Checkout（托管结账页） |
| **架构模式** | 策略模式 + 适配器模式，统一 `PaymentGatewayService` 接口 |
| **开发周期** | 约 4 周（含测试和灰度） |
| **PCI 合规** | SAQ-A（最低等级，Stripe 承担核心合规责任） |
| **与支付宝共存** | 支付宝适配器封装现有逻辑，两套网关并行，互不干扰 |
| **风险可控性** | 高--Webhook 幂等 + 主动查询补偿 + 灰度发布 + 回滚方案 |
| **月交易成本** | 约费率 2.9%-4.4% + $0.30/笔，估算 $4,200/月（$100k 交易额） |

### 14.2 关键决策点

1. **采用 Checkout 而非 PaymentIntent**
   - 理由：快速上线、最低 PCI 合规负担、与现有支付宝流程一致、自动支持多支付方式
   - 代价：UI 自定义受限，用户需跳转至 Stripe 页面
   - 长期策略：如未来对支付体验有更高要求，可平滑升级至 PaymentIntent 模式（架构已通过抽象解耦）

2. **先抽象接口，后改造支付宝**
   - 理由：最小化对现有系统的冲击
   - 策略：新增 `PaymentGatewayService` -> Stripe 实现 -> 支付宝适配器
   - 长期价值：未来接入 PayPal、微信支付、银联等只需新增实现类

3. **Webhook 为业务处理唯一可靠入口**
   - 同步回调（success_url）仅用于页面跳转，不更新订单状态
   - 所有支付结果以 Webhook 为准
   - 定时轮询作为补偿机制

4. **Stripe 内置 Alipay 支持的战略价值**
   - Stripe 已将 Alipay 作为内置支付方式，Checkout 页面自动展示
   - 长期来看，海外用户的 Alipay 支付可通过 Stripe 统一处理，但近期仍保留独立 Alipay 网关

### 14.3 待确认事项

| 编号 | 事项 | 确认方 | 优先级 | 影响 |
|:---:|------|:---:|:---:|------|
| Q-1 | 支持的币种范围（仅 USD 还是多币种？） | 产品/业务 | P0 | 接口设计和金额校验逻辑 |
| Q-2 | Stripe 企业账号认证所需资质和审核周期？ | 财务/法务 | P0 | 上线时间 |
| Q-3 | 是否需要开通 Stripe Radar 风控服务？ | 业务/风控 | P1 | 额外费用和风险模型 |
| Q-4 | 是否需要保存用户支付方式（Customer + SetupIntent）？ | 产品 | P2 | 数据模型设计 |
| Q-5 | Stripe 收款账户开设地区选择（美国 vs 其他）？ | 财务 | P0 | 费率结构和资金流转 |
| Q-6 | 是否后续需要 Subscription（订阅）功能？ | 产品 | P2 | 架构预留设计 |
| Q-7 | 对账周期和格式要求？ | 财务 | P2 | 对账功能设计 |
| Q-8 | 退款审批流程（自动/手动）？ | 业务 | P1 | 退款接口权限设计 |

---

## 15. 附录

### A. 参考资料

| 来源 | URL | 说明 |
|------|-----|------|
| Stripe Java SDK GitHub | https://github.com/stripe/stripe-java | 官方 SDK 源码和文档 |
| Stripe Java SDK Maven | https://mvnrepository.com/artifact/com.stripe/stripe-java | Maven 坐标 |
| Stripe API 参考 | https://docs.stripe.com/api | 官方 API 文档 |
| Stripe Checkout 文档 | https://docs.stripe.com/payments/checkout | Checkout Session 使用指南 |
| Stripe Webhook 文档 | https://docs.stripe.com/webhooks | Webhook 最佳实践 |
| Stripe PCI 合规 | https://stripe.com/guides/pci-compliance | PCI DSS 合规指南 |
| Stripe 定价 | https://stripe.com/pricing | 最新费率 |
| Stripe CLI | https://docs.stripe.com/stripe-cli | 命令行测试工具 |
| Stripe SDK Migration Guide v23 | https://github.com/stripe/stripe-java/wiki/Migration-guide-for-v23 | StripeClient 模式迁移 |
| Stripe SDK Migration Guide v8 | https://github.com/stripe/stripe-java/wiki/Migration-guide-for-v8 | Webhook 事件反序列化变更 |
| Context7 Stripe Java | /stripe/stripe-java | Context7 聚合文档（244 代码片段） |
| Spring Boot 集成参考 | https://www.codingshuttle.com/blogs/integrating-stripe-payments-in-spring-boot-step-by-step-beginner-s-guide-2025/ | 2025 年 Spring Boot 集成教程 |
| Stripe 生产架构设计 | https://monstar-lab.com/ph/blog/stripe-payment-architecture-building-fault-tolerant-systems-with-idempotency-and-webhooks | 幂等性与 Webhook 容错架构 |
| Webhook 幂等性参考 | https://github.com/primeautomation-dev/stripe-webhook-idempotency-guard | 生产级 Webhook 幂等实现 |
| 支付宝国际文档 | https://global.alipay.com/docs/ | 现有支付宝对接参考 |

### B. 关键代码骨架

#### B.1 StripeConfiguration.java

```java
@Configuration
@ConfigurationProperties(prefix = "stripe")
public class StripeConfiguration {

    private String secretKey;
    private String webhookSecret;
    private String publishableKey;

    @Bean
    public StripeClient stripeClient() {
        return new StripeClient(secretKey);
    }
    // getters/setters ...
}
```

#### B.2 PaymentGatewayRouter.java

```java
@Component
public class PaymentGatewayRouter {

    private final Map<PaymentChannel, PaymentGatewayService> gatewayMap;

    public PaymentGatewayRouter(List<PaymentGatewayService> gateways) {
        this.gatewayMap = gateways.stream()
            .collect(Collectors.toMap(
                PaymentGatewayService::getChannel,
                Function.identity()
            ));
    }

    public PaymentGatewayService getGateway(PaymentChannel channel) {
        PaymentGatewayService gateway = gatewayMap.get(channel);
        if (gateway == null) {
            throw new UnsupportedPaymentChannelException(channel);
        }
        return gateway;
    }
}
```

#### B.3 application.yml 配置

```yaml
stripe:
  publishable-key: ${STRIPE_PUBLISHABLE_KEY:}
  secret-key: ${STRIPE_SECRET_KEY:}
  webhook-secret: ${STRIPE_WEBHOOK_SECRET:}
  connect-timeout: 30s
  read-timeout: 80s
  max-network-retries: 3
```

### C. 术语表

| 术语 | 全称 | 说明 |
|------|------|------|
| PCI DSS | Payment Card Industry Data Security Standard | 支付卡行业数据安全标准 |
| SAQ | Self-Assessment Questionnaire | PCI 自我评估问卷 |
| SCA | Strong Customer Authentication | 强客户认证（如 3D Secure 2） |
| BNPL | Buy Now, Pay Later | 先买后付 |
| ACH | Automated Clearing House | 美国自动清算系统 |
| SEPA | Single Euro Payments Area | 单一欧元支付区 |
| Idempotency | - | 幂等性：同一操作多次执行结果相同 |
| HMAC | Hash-based Message Authentication Code | 基于哈希的消息认证码 |
| SDK | Software Development Kit | 软件开发工具包 |
| Restricted Key | - | Stripe 受限 API Key（最小权限） |
