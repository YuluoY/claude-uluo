# Stripe 支付网关对接技术方案评审文档

> 版本：v1.0
> 日期：2026-06-08
> 作者：技术架构组
> 状态：待评审

---

## 目录

1. [项目背景与需求分析](#1-项目背景与需求分析)
2. [Stripe 支付网关概述](#2-stripe-支付网关概述)
3. [Stripe 核心技术架构分析](#3-stripe-核心技术架构分析)
4. [与现有支付宝对接方案的对比分析](#4-与现有支付宝对接方案的对比分析)
5. [推荐技术方案](#5-推荐技术方案)
6. [系统架构设计](#6-系统架构设计)
7. [安全与合规](#7-安全与合规)
8. [风险评估与应对措施](#8-风险评估与应对措施)
9. [实施计划建议](#9-实施计划建议)
10. [总结与决策建议](#10-总结与决策建议)

---

## 1. 项目背景与需求分析

### 1.1 现状

- **技术栈**：Spring Boot + MyBatis
- **已有支付能力**：已对接支付宝（Alipay），支付模块位于 `payment/alipay/`，包含 `AlipayService`、`AlipayConfig` 等核心组件。
- **现有支付流程**：创建订单 → 跳转支付页面 → 支付回调（同步 + 异步）→ 更新订单状态。

### 1.2 需求

新增 Stripe 支付网关对接，满足以下业务需求：
- 支持国际信用卡支付（Visa、Mastercard、American Express 等）
- 覆盖海外用户支付场景
- 与现有支付宝支付通道共存，支持支付方式灵活扩展
- 保障支付安全与 PCI DSS 合规

### 1.3 目标

- 完成 Stripe 支付网关的技术对接
- 复用现有订单支付流程框架，降低改造风险
- 建立可扩展的多支付网关架构，为后续接入更多支付方式奠定基础

---

## 2. Stripe 支付网关概述

### 2.1 公司背景

Stripe 是全球领先的支付处理平台，成立于 2010 年，总部位于美国旧金山。截至 2025 年，Stripe 服务覆盖 **46+ 个国家和地区**，支持 **135+ 种货币**，是国际市场占有率最高的在线支付网关之一。

### 2.2 支持的支付方式

| 类别 | 支付方式 |
|------|---------|
| 信用卡/借记卡 | Visa、Mastercard、American Express、Discover、JCB、UnionPay 等 |
| 数字钱包 | Apple Pay、Google Pay、Microsoft Pay |
| 银行转账 | ACH（美国）、SEPA（欧洲）、Bacs（英国） |
| 先买后付（BNPL） | Klarna、Affirm、Afterpay |
| 本地支付方式 | iDEAL（荷兰）、Alipay（中国）、WeChat Pay（中国） |

### 2.3 费用结构

| 交易类型 | 费率 |
|---------|------|
| 美国国内信用卡 | 2.9% + $0.30 |
| 国际信用卡 | 3.1% + $0.30（另加 1.5% 跨境费） |
| 国际卡含货币转换 | 约 4.4% + $0.30 |
| ACH 借记 | 0.8%，上限 $5.00 |
| BNPL（Klarna 等） | 5.99% + $0.30 |
| 退款 | 无额外费用（已收手续费不退） |
| 争议/拒付 | $15.00/笔 |

---

## 3. Stripe 核心技术架构分析

### 3.1 Java SDK

**Maven 依赖**（最新稳定版 v32.2.0）：

```xml
<dependency>
    <groupId>com.stripe</groupId>
    <artifactId>stripe-java</artifactId>
    <version>32.2.0</version>
</dependency>
```

**SDK 特征**：
- 要求 JDK 1.8+
- 使用 **实例化 `StripeClient`** 模式（推荐），替代旧版静态 `Stripe.apiKey` 模式
- 通过 `client.v1().paymentIntents()`、`client.v1().customers()` 等方式调用 API
- 完善的 Builder 模式构建请求参数
- 自动 JSON 序列化/反序列化

**核心类**：

| 类名 | 用途 |
|------|------|
| `StripeClient` | 主客户端，通过 API Key 初始化 |
| `PaymentIntent` | 支付意图，管理单次支付生命周期 |
| `Session` | Checkout Session，托管结账页面 |
| `Customer` | 客户管理，支持保存支付方式 |
| `Refund` | 退款管理 |
| `Event` | Webhook 事件对象 |
| `Webhook` | 签名验证工具（`constructEvent()`） |
| `StripeException` | 异常基类（含 `CardException`、`AuthenticationException` 等子类） |

### 3.2 两种支付集成模式

#### 模式一：Stripe Checkout（托管结账页）

**流程**：
```
前端 → 后端创建 Checkout Session → 获取 Stripe 托管页面 URL → 用户跳转至 Stripe 页面
→ 用户在 Stripe 页面完成支付 → Stripe 回调 success/cancel URL → Webhook 异步通知后端
```

**优点**：
- 前端开发量极少，Stripe 托管支付页面
- Stripe 负责 PCI 合规，商户获得 **SAQ-A** 最低合规等级
- 自动支持多种支付方式、3D Secure 认证
- 内置响应式设计，适配移动端

**缺点**：
- 页面风格自定义受限
- 用户离开商户站点，体验割裂

**关键代码要点**：
```java
SessionCreateParams params = SessionCreateParams.builder()
    .setMode(SessionCreateParams.Mode.PAYMENT)
    .setSuccessUrl("https://example.com/success?session_id={CHECKOUT_SESSION_ID}")
    .setCancelUrl("https://example.com/cancel")
    .addLineItem(SessionCreateParams.LineItem.builder()
        .setQuantity(1L)
        .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
            .setCurrency("usd")
            .setUnitAmount(2000L)  // $20.00（分为单位）
            .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                .setName("商品名称")
                .build())
            .build())
        .build())
    .build();
Session session = stripeClient.v1().checkout().sessions().create(params);
String checkoutUrl = session.getUrl();
```

#### 模式二：PaymentIntent（嵌入式支付）

**流程**：
```
前端 → 后端创建 PaymentIntent → 返回 clientSecret 至前端
→ 前端使用 Stripe.js Elements/PaymentElement 渲染支付表单
→ 用户输入卡号 → 前端调用 stripe.confirmPayment() → Stripe 处理支付
→ Webhook 异步通知后端
```

**优点**：
- 完全自定义 UI，用户不离开站点
- 灵活控制支付流程各环节
- 支持保存支付方式、分期支付等高级功能

**缺点**：
- 前端开发量较大，需集成 Stripe.js
- PCI 合规等级至少为 **SAQ A-EP**，需提供额外合规文件
- 需自行处理 3D Secure 等认证流程

**关键代码要点**：
```java
PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
    .setAmount(2000L)
    .setCurrency("usd")
    .setAutomaticPaymentMethods(
        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
            .setEnabled(true)
            .build()
    )
    .build();
PaymentIntent paymentIntent = stripeClient.v1().paymentIntents().create(params);
String clientSecret = paymentIntent.getClientSecret();  // 返回给前端
```

### 3.3 Webhook 机制

Stripe 的核心异步通知机制，是生产环境 **必须实现** 的组件。

**关键事件类型**：

| 事件类型 | 说明 | 建议处理方式 |
|---------|------|------------|
| `payment_intent.succeeded` | 支付成功 | 更新订单状态为已支付，触发发货/交付流程 |
| `payment_intent.payment_failed` | 支付失败 | 记录失败原因，通知用户重试 |
| `payment_intent.canceled` | 支付取消 | 释放库存，更新订单状态 |
| `charge.refunded` | 退款已处理 | 更新退款状态，触发退款后续流程 |
| `charge.dispute.created` | 发生争议/拒付 | 告警通知，准备申诉材料 |
| `checkout.session.completed` | Checkout 完成 | 更新订单状态（使用 Checkout 模式时） |
| `radar.early_fraud_warning.created` | 欺诈预警 | 人工审核，决定是否退款 |

**签名验证**（防止伪造回调）：

```java
String payload = request.getBody();  // 必须获取原始 body，不能预解析 JSON
String sigHeader = request.getHeader("Stripe-Signature");
Event event = Webhook.constructEvent(payload, sigHeader, webhookSecret);
```

**幂等性处理**（防止重复回调）：

Stripe 保证 at-least-once 送达，Webhook 处理器必须实现幂等：
- 以 `event.id` 或 `payment_intent.id` 作为幂等键
- 处理前检查数据库中是否已存在该事件 ID
- 使用数据库唯一约束兜底

### 3.4 API 版本管理

Stripe API 采用日期版本管理（如 `2024-12-01`）。Java SDK 是强类型的，每个 SDK 版本锁定对应的 API 版本。升级 SDK 版本即升级 API 版本，需注意向后兼容性。

---

## 4. 与现有支付宝对接方案的对比分析

### 4.1 核心流程对比

| 维度 | 支付宝（Alipay） | Stripe |
|------|----------------|--------|
| **支付发起** | 构造签名参数 → 拼接 URL 跳转支付宝收银台 | 创建 Checkout Session 或 PaymentIntent |
| **同步回调** | `return_url`（GET 方式，支付完成后浏览器跳回） | `success_url` / `cancel_url`（GET 方式） |
| **异步通知** | `notify_url`（POST，XML/JSON 格式） | Webhook（POST，JSON 格式） |
| **签名算法** | RSA/RSA2 非对称加密签名 | HMAC-SHA256 签名（Webhook） |
| **签名位置** | 请求参数拼接后签名；回调参数拼接待验证 | HTTP 请求头 `Stripe-Signature` |
| **订单查询** | 主动调用 `alipay.trade.query` 接口 | `PaymentIntent.retrieve()` 或 `Session.retrieve()` |
| **退款** | 调用 `alipay.trade.refund` 接口 | `Refund.create()` |
| **对账文件** | 下载账单 CSV | Dashboard 导出或 API 获取 |

### 4.2 SDK 对比

| 维度 | alipay-sdk-java | stripe-java |
|------|----------------|-------------|
| **最新版本** | 4.x 系列 | 32.2.0 |
| **Maven 中央仓库** | 是（`com.alipay.sdk`） | 是（`com.stripe`） |
| **初始化方式** | `DefaultAlipayClient` 实例化 | `StripeClient` 实例化（推荐） |
| **API 调用风格** | 泛型 `execute(AlipayRequest<T>)` | 链式 Builder + `client.v1().resource().action()` |
| **签名工具** | `SignatureUtil.sign()` / `verify()` | `Webhook.constructEvent()` |
| **文档质量** | 中文为主，部分英文，示例较少 | 全英文，极其详尽，官方教程丰富 |
| **社区活跃度** | 国内活跃，国际较弱 | GitHub 9k+ Stars，全球社区活跃 |

### 4.3 技术架构差异分析

| 维度 | 支付宝 | Stripe | 差异影响 |
|------|--------|--------|---------|
| **SDK 成熟度** | 中等 | 非常高 | Stripe SDK 设计更现代，Builder 模式更易维护 |
| **API 一致性** | 存在多版本 API（旧版 MAPI vs 新版 Antom） | 统一 RESTful API 体系 | Stripe 接口风格一致，学习成本低 |
| **测试环境** | 沙箱环境，需单独申请配置 | 测试模式一键切换，官方 CLI 支持 | Stripe 测试体验显著优于支付宝 |
| **PCI 合规** | 支付宝承担主要合规责任 | 使用 Checkout/Elements 可获得 SAQ-A 等级 | 选择 Checkout 模式可大幅降低合规负担 |
| **国际覆盖** | 主要覆盖亚太和跨境场景 | 全球 46+ 国家，135+ 货币 | Stripe 国际化能力显著更强 |
| **支付方式** | 支付宝账户余额、花呗、银行卡 | 信用卡/借记卡、钱包、银行转账、BNPL 等 40+ 种 | Stripe 支付方式覆盖更广泛 |

### 4.4 签名机制对比（关键差异）

**支付宝签名流程**：
```
1. 将所有请求参数按 key 字母排序
2. 拼接成 key=value&key=value 格式
3. 使用商户 RSA 私钥对拼接串签名
4. 将签名加入请求参数 sign 字段
5. 回调时使用支付宝 RSA 公钥验签
```

**Stripe Webhook 签名流程**：
```
1. Stripe 使用 webhook endpoint 的 Signing Secret 对 payload 计算 HMAC-SHA256
2. 将时间戳和签名放入 Stripe-Signature 请求头
3. 商户使用 Webhook.constructEvent() 自动验证
```

**关键差异**：Stripe 的签名验证更简单（SDK 一行代码完成），不需要手动管理公私钥对。但支付宝的 RSA 签名提供了端到端的非对称加密保护。

---

## 5. 推荐技术方案

### 5.1 方案选择：Stripe Checkout（托管结账页）

**推荐采用 Stripe Checkout 模式**，理由如下：

| 评估维度 | Checkout 模式 | PaymentIntent 模式 |
|---------|-------------|-------------------|
| 开发周期 | 短（1-2 周） | 中（3-4 周） |
| 前端改造量 | 极少（仅跳转） | 大（集成 Stripe.js Elements） |
| PCI 合规等级 | SAQ-A（最低） | SAQ A-EP 或 SAQ-D |
| 多支付方式支持 | 自动 | 需手动配置 |
| 移动端适配 | 内置响应式 | 需自行适配 |
| UI 自定义程度 | 低 | 高 |
| 用户支付体验 | 跳转至 Stripe 页面 | 站内完成 |

**决策分析**：当前阶段以快速上线、安全合规为首要目标。Checkout 模式在开发效率、PCI 合规、多支付方式覆盖方面具有显著优势。UI 自定义的局限性在当前阶段可接受。

### 5.2 架构策略：策略模式 + 适配器模式

为支持多支付网关共存与未来扩展，推荐采用 **策略模式（Strategy Pattern）** 作为顶层支付服务抽象，**适配器模式（Adapter Pattern）** 将各网关差异化的 API 统一封装。

**核心接口设计**：

```java
public interface PaymentGatewayService {
    /**
     * 创建支付请求，返回支付跳转 URL 或客户端密钥
     */
    CreatePaymentResponse createPayment(CreatePaymentRequest request);

    /**
     * 处理异步回调/Webhook
     */
    PaymentCallbackResult handleCallback(Map<String, String> params, String rawBody, String signature);

    /**
     * 主动查询支付状态
     */
    PaymentQueryResult queryPaymentStatus(String outTradeNo);

    /**
     * 发起退款
     */
    RefundResponse createRefund(RefundRequest request);

    /**
     * 验证回调签名
     */
    boolean verifySignature(String rawBody, String signature);
}
```

**实现类映射**：

| 实现类 | 支付网关 | 说明 |
|-------|---------|------|
| `AlipayGatewayService` | 支付宝 | 继续使用现有 `AlipayService`，适配至统一接口 |
| `StripeGatewayService` | Stripe | 新建，实现 Stripe Checkout + Webhook 逻辑 |
| （未来）`PayPalGatewayService` | PayPal | 按需扩展 |

### 5.3 技术选型总结

| 技术项 | 选择 | 版本/说明 |
|--------|------|----------|
| Stripe SDK | stripe-java | 32.2.0 |
| 集成模式 | Stripe Checkout | 托管结账页 |
| 异步通知 | Webhook | 所有关键业务逻辑在 Webhook 中处理 |
| 架构模式 | 策略模式 + 适配器模式 | 统一支付服务接口 |
| 幂等性 | event_id 唯一约束 + 数据库分布式锁 | MySQL 唯一索引兜底 |
| API Key 管理 | 环境变量 + 配置中心 | 禁止硬编码 |

---

## 6. 系统架构设计

### 6.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                      前端（Browser）                      │
│  用户下单 → 选择支付方式 → 跳转 Stripe Checkout 页面       │
│                 ← Stripe 回调 success/cancel URL          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   API Gateway / Nginx                      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Spring Boot Application                   │
│                                                           │
│  ┌───────────────────────────────────────────────────┐   │
│  │              PaymentController                      │   │
│  │  POST /api/payment/create      → 创建支付           │   │
│  │  POST /api/payment/callback     → Stripe Webhook    │   │
│  │  GET  /api/payment/success      → 同步成功回调       │   │
│  │  GET  /api/payment/cancel       → 同步取消回调       │   │
│  │  GET  /api/payment/query/{id}   → 支付状态查询       │   │
│  │  POST /api/payment/refund       → 退款申请           │   │
│  └───────────────────────────────────────────────────┘   │
│                           │                               │
│  ┌───────────────────────────────────────────────────┐   │
│  │              PaymentGatewayRouter                   │   │
│  │        根据 paymentMethod 路由到具体网关服务           │   │
│  │  ┌──────────────┐  ┌──────────────┐                 │   │
│  │  │AlipayService │  │StripeService │  ...更多         │   │
│  │  │  (已有)       │  │  (新建)       │                 │   │
│  │  └──────────────┘  └──────────────┘                 │   │
│  └───────────────────────────────────────────────────┘   │
│                           │                               │
│  ┌───────────────────────────────────────────────────┐   │
│  │              Data Access Layer (MyBatis)             │   │
│  │  PaymentOrderMapper / PaymentRecordMapper            │   │
│  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      MySQL Database                        │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────┴──────────────────────────────┐
│                    Stripe Cloud                            │
│  Checkout Session → PaymentIntent → Webhook Events        │
└─────────────────────────────────────────────────────────┘
```

### 6.2 模块划分

```
src/main/java/com/example/payment/
├── controller/
│   └── PaymentController.java          # 统一支付控制器
├── service/
│   ├── PaymentGatewayService.java       # 支付网关顶层接口
│   ├── PaymentGatewayRouter.java        # 支付网关路由器（策略选择）
│   ├── alipay/
│   │   └── AlipayGatewayService.java    # 支付宝适配器（对已有 AlipayService 的封装）
│   └── stripe/
│       ├── StripeGatewayService.java    # Stripe 适配器（Checkout + Webhook）
│       └── StripeConfig.java            # Stripe 配置属性
├── model/
│   ├── CreatePaymentRequest.java        # 统一支付创建请求
│   ├── CreatePaymentResponse.java       # 统一支付创建响应
│   ├── PaymentCallbackResult.java       # 统一回调处理结果
│   └── stripe/
│       └── StripeWebhookEvent.java      # Stripe Webhook 事件模型
├── mapper/
│   ├── PaymentOrderMapper.java          # 已有支付订单 Mapper
│   └── PaymentRecordMapper.java         # 已有支付记录 Mapper
└── config/
    └── StripeConfiguration.java         # StripeClient Bean 配置
```

### 6.3 数据库设计（新增字段/表）

**方案一（最小改动）**：在现有支付订单表新增 Stripe 相关字段。

```sql
-- 在已有支付订单表增加字段
ALTER TABLE payment_order ADD COLUMN payment_method VARCHAR(32) DEFAULT 'ALIPAY'
    COMMENT '支付方式: ALIPAY, STRIPE';
ALTER TABLE payment_order ADD COLUMN stripe_session_id VARCHAR(128)
    COMMENT 'Stripe Checkout Session ID';
ALTER TABLE payment_order ADD COLUMN stripe_payment_intent_id VARCHAR(128)
    COMMENT 'Stripe PaymentIntent ID';
ALTER TABLE payment_order ADD COLUMN stripe_event_id VARCHAR(128)
    COMMENT '已处理的 Stripe Webhook Event ID（幂等）';
ALTER TABLE payment_order ADD COLUMN payment_currency VARCHAR(8)
    COMMENT '支付币种: USD, CNY, EUR 等';

-- 幂等性唯一索引
ALTER TABLE payment_order ADD UNIQUE INDEX idx_stripe_event_id (stripe_event_id);
ALTER TABLE payment_order ADD UNIQUE INDEX idx_stripe_session_id (stripe_session_id);
```

**方案二（更规范）**：新增独立的 Stripe 事件处理记录表。

```sql
CREATE TABLE stripe_webhook_event (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(128) NOT NULL COMMENT 'Stripe Event ID',
    event_type VARCHAR(64) NOT NULL COMMENT '事件类型',
    payment_intent_id VARCHAR(128) COMMENT '关联 PaymentIntent',
    session_id VARCHAR(128) COMMENT '关联 Checkout Session',
    raw_payload TEXT COMMENT '原始事件 JSON（审计备查）',
    status VARCHAR(32) DEFAULT 'PENDING' COMMENT '处理状态: PENDING, SUCCESS, FAILED',
    error_message TEXT COMMENT '处理错误信息',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME COMMENT '处理完成时间',
    UNIQUE KEY uk_event_id (event_id)
) COMMENT='Stripe Webhook 事件处理记录';
```

### 6.4 接口设计

#### 6.4.1 创建支付

**请求**：
```json
POST /api/payment/create
{
    "orderId": "ORDER-20260608-001",
    "paymentMethod": "STRIPE",
    "amount": 2000,
    "currency": "USD",
    "description": "Premium Membership - 1 Year",
    "successUrl": "https://example.com/payment/success?orderId=ORDER-20260608-001",
    "cancelUrl": "https://example.com/payment/cancel?orderId=ORDER-20260608-001"
}
```

**响应**：
```json
{
    "code": 200,
    "data": {
        "outTradeNo": "PAY-20260608-001",
        "paymentMethod": "STRIPE",
        "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_xxx",
        "sessionId": "cs_test_xxx",
        "status": "PENDING"
    }
}
```

#### 6.4.2 Stripe Webhook 回调

**请求**（由 Stripe 服务器发起）：
```
POST /api/payment/callback/stripe
Headers:
  Stripe-Signature: t=1681234567,v1=xxx,v0=xxx
Body: (原始 JSON，包含 Event 对象)
```

**处理要点**：
1. 获取原始 body（不可用 Spring 自动解析 JSON 后的对象）
2. 使用 `Webhook.constructEvent()` 验证签名
3. 根据事件类型路由处理逻辑
4. 幂等性检查
5. 更新订单状态
6. 立即返回 200，耗时操作异步处理

#### 6.4.3 同步回调

```
GET /api/payment/success?session_id=cs_test_xxx
GET /api/payment/cancel?session_id=cs_test_xxx
```

同步回调仅用于页面跳转引导，不处理核心业务逻辑（核心逻辑在 Webhook 中处理）。

### 6.5 StripeGatewayService 核心流程

```
createPayment(request)
    │
    ├── 1. 参数校验（金额、币种、订单是否存在）
    ├── 2. 生成内部支付流水号（out_trade_no）
    ├── 3. 构建 SessionCreateParams（LineItem、Success/Cancel URL、metadata）
    ├── 4. 调用 stripeClient.v1().checkout().sessions().create(params)
    ├── 5. 保存 stripe_session_id 到数据库
    ├── 6. 返回 checkoutUrl 给前端
    └── 7. 前端 302 跳转至 checkoutUrl

handleWebhook(payload, signature)
    │
    ├── 1. Webhook.constructEvent() 验证签名
    ├── 2. 查询 stripe_webhook_event 表，检查 event.id 是否已处理（幂等）
    ├── 3. 保存事件记录（状态 PENDING）
    ├── 4. 根据 event.type 分发处理：
    │   ├── checkout.session.completed
    │   │   └── 提取 session.getId() → 查询支付订单 →
    │   │       更新订单状态为 PAID → 触发发货/交付
    │   ├── payment_intent.succeeded
    │   │   └── 提取 paymentIntent.getId() → 更新订单状态
    │   ├── payment_intent.payment_failed
    │   │   └── 记录失败原因 → 通知用户
    │   └── charge.dispute.created
    │       └── 告警通知运营团队
    ├── 5. 更新事件记录状态为 SUCCESS
    └── 6. 返回 200 OK

queryPaymentStatus(outTradeNo)
    │
    ├── 1. 查询数据库获取 stripe_session_id
    ├── 2. 调用 session.retrieve()
    ├── 3. 根据 session.getPaymentIntent() 获取 PaymentIntent
    ├── 4. 返回支付状态（succeeded / requires_payment_method / processing / canceled）
    └── 5. 如果状态与数据库不一致，触发对账修正

createRefund(paymentIntentId, amount)
    │
    ├── 1. 查询数据库确认订单状态为 PAID
    ├── 2. 构建 RefundCreateParams
    ├── 3. 调用 stripeClient.v1().refunds().create(params)
    ├── 4. 保存退款记录
    └── 5. 返回退款状态
```

---

## 7. 安全与合规

### 7.1 PCI DSS 合规

| 集成模式 | SAQ 等级 | 要求数 | 说明 |
|---------|---------|--------|------|
| Stripe Checkout | **SAQ A** | ~22 项 | 最低要求，Stripe 托管支付页面 |
| Stripe Elements | SAQ A-EP | ~190 项 | 嵌入式表单，数据经 Stripe.js 直传 |
| 完全自建表单 | SAQ D | ~300+ 项 | 自行处理卡号，合规负担极重 |

**选择 Checkout 模式，我们的 PCI 合规责任为最低等级 SAQ A**：只需确保证书正确配置（HTTPS）、安全策略到位、完成年度自我评估问卷即可。

### 7.2 Webhook 签名验证

这是 Stripe 对接的 **安全底线**，必须实现：

```java
// 核心代码——获取原始 body（Spring 配置）
@PostMapping("/api/payment/callback/stripe")
public ResponseEntity<String> stripeWebhook(
        @RequestBody String payload,       // 原始 String，非解析后的对象
        @RequestHeader("Stripe-Signature") String sigHeader) {

    Event event;
    try {
        event = Webhook.constructEvent(payload, sigHeader, stripeConfig.getWebhookSecret());
    } catch (SignatureVerificationException e) {
        log.error("Invalid Stripe webhook signature", e);
        return ResponseEntity.status(400).body("Invalid signature");
    }

    // 异步处理，立即返回 200
    stripeGatewayService.handleWebhookEvent(event);
    return ResponseEntity.ok("OK");
}
```

**注意**：Spring Boot 默认使用 Jackson 自动反序列化 `@RequestBody`。必须确保 Webhook 端点接收的是 **原始字符串**，可使用 `@RequestBody String` 或配置跳过特定路径的 body 预解析。

### 7.3 API Key 安全管理

| 密钥类型 | 格式 | 用途 | 安全级别 |
|---------|------|------|---------|
| Publishable Key | `pk_test_xxx` / `pk_live_xxx` | 前端 Stripe.js 初始化 | 可公开 |
| Secret Key | `sk_test_xxx` / `sk_live_xxx` | 后端 API 调用 | **必须保密** |
| Webhook Signing Secret | `whsec_xxx` | Webhook 签名验证 | **必须保密** |

**管理策略**：
- Secret Key 和 Webhook Secret 禁止硬编码，禁止提交至 Git
- 使用环境变量或配置中心（如 Spring Cloud Config、Vault）
- 测试环境和生产环境使用不同的 Key 对

### 7.4 幂等性保障

| 层级 | 策略 | 实现方式 |
|------|------|---------|
| Stripe API 调用 | 请求级幂等键 | 创建 PaymentIntent/Session 时传递 `IdempotencyKey`（UUID v4） |
| Webhook 处理 | 事件级幂等 | 数据库唯一约束 `uk_event_id` |
| 订单状态更新 | 状态机 + 乐观锁 | `WHERE status = 'PENDING' AND version = ?` |

### 7.5 其他安全措施

- **HTTPS 强制**：生产环境所有端点必须使用 HTTPS
- **IP 白名单**：Webhook 端点可限制仅接受 Stripe 的 IP 段
- **请求日志**：完整记录 API 请求和 Webhook 事件用于审计
- **异常监控**：支付失败、签名验证失败、重复事件等需告警

---

## 8. 风险评估与应对措施

| 风险 | 等级 | 描述 | 应对措施 |
|------|------|------|---------|
| **Webhook 丢失** | 高 | 网络问题导致 Stripe 通知未送达 | 1. 主动查询策略：定时任务比对 pending 订单，调用 `Session.retrieve()` 确认状态<br>2. Dashboard 手动重发 Webhook |
| **重复回调** | 中 | Stripe 重试导致同一事件多次处理 | 数据库 `uk_event_id` 唯一约束 + 处理前幂等检查 |
| **签名验证失败** | 高 | Webhook Secret 泄露或配置错误 | 密钥轮换机制 + 验证失败告警 + 严格权限管控 |
| **汇率波动** | 低 | 国际支付涉及货币转换 | 在 Checkout Session 中锁定币种，展示用户确认的金额 |
| **退款争议** | 中 | 用户发起 Chargeback | 1. 在 Webhook 中监听 `charge.dispute.created`<br>2. 及时收集证据进行申诉<br>3. 建立拒付预警机制（结合 Stripe Radar） |
| **支付宝兼容** | 低 | 新架构影响现有支付宝支付 | 1. 先抽象接口，支付宝适配器封装现有 `AlipayService`<br>2. 充分回归测试<br>3. 灰度发布 |
| **SDK 兼容性** | 低 | stripe-java 依赖与现有依赖冲突 | 1. 检查依赖树（`mvn dependency:tree`）<br>2. 如遇冲突使用 `exclusions` 排除<br>3. stripe-java 自身依赖少，冲突概率低 |
| **测试环境差异** | 中 | Stripe 测试模式与生产模式行为差异 | 1. 使用 Stripe CLI 进行本地 Webhook 测试<br>2. 上线前在 Stripe 测试模式完成全流程验证<br>3. 使用测试卡号 `4242 4242 4242 4242` 覆盖各场景 |

---

## 9. 实施计划建议

### 9.1 分阶段实施

```
Phase 1：基础设施（第 1 周）
├── Stripe 账号注册与 API Key 申请
├── Maven 引入 stripe-java 32.2.0
├── StripeClient Bean 配置
├── PaymentGatewayService 统一接口定义
└── 数据库表结构变更（DDL）

Phase 2：核心功能（第 2 周）
├── StripGatewayService 实现（Checkout Session 创建）
├── PaymentGatewayRouter 路由实现
├── PaymentController 接口开发
├── 前端支付方式选择 + 跳转逻辑
└── 单元测试

Phase 3：回调与可靠保障（第 3 周）
├── Webhook 端点实现（签名验证 + 事件分发）
├── 幂等性处理（事件记录表 + 唯一约束）
├── 订单状态主动查询（补偿任务）
├── 退款功能实现
└── 集成测试 + 端到端测试

Phase 4：上线与优化（第 4 周）
├── 支付宝适配器封装（实现 PaymentGatewayService 接口）
├── 全流程回归测试
├── 灰度发布（按用户地区/支付方式分流）
├── 监控告警配置
└── 正式全量上线
```

### 9.2 测试要点

| 测试类型 | 覆盖内容 |
|---------|---------|
| 单元测试 | `StripeGatewayService` 各方法、签名验证、幂等逻辑 |
| 集成测试 | Checkout Session 创建 → Webhook 回调 → 订单状态更新（使用 Stripe 测试模式） |
| 端到端测试 | 完整支付流程：下单 → 跳转 Stripe → 支付 → 回调 → 订单完成 |
| 异常测试 | 支付失败、网络超时、重复回调、无效签名、退款争议 |
| 性能测试 | Webhook 处理吞吐量、并发支付创建 |
| 兼容测试 | 回归测试支付宝支付功能（确保未被破坏） |

### 9.3 监控与运维

- **Dashboard 监控**：Stripe Dashboard → Developers → Webhooks 页面监控送达率、响应码、延迟
- **应用监控**：Webhook 处理成功率/失败率、处理耗时 p99
- **告警规则**：
  - Webhook 处理失败率 > 1%
  - 订单 pending 超过 30 分钟未更新
  - 签名验证失败
  - 重复事件检测触发
- **日志**：完整记录每次 API 调用和 Webhook 事件（含原始 payload）

---

## 10. 总结与决策建议

### 10.1 核心结论

| 维度 | 结论 |
|------|------|
| **推荐方案** | Stripe Checkout（托管结账页） |
| **开发周期** | 约 4 周（含测试和灰度） |
| **PCI 合规** | SAQ A（最低等级，Stripe 承担核心责任） |
| **架构设计** | 策略模式 + 适配器模式，统一 `PaymentGatewayService` 接口 |
| **与支付宝共存** | 支付宝适配器封装现有逻辑，两套网关并行运行互不干扰 |
| **风险可控性** | 高——Webhook 幂等 + 主动查询补偿 + 灰度发布 |

### 10.2 关键决策点

1. **采用 Checkout 模式而非 PaymentIntent 模式**
   - 理由：快速上线、最低 PCI 合规负担、自动支持多支付方式
   - 代价：UI 自定义受限，用户需跳转至 Stripe 页面
   - 长期策略：如未来对支付体验有更高要求，可升级至 PaymentIntent 模式

2. **先抽象接口，再改造支付宝**
   - 理由：最小化对现有系统的冲击
   - 策略：新增支付统一接口 → Stripe 实现接口 → 支付宝适配器实现同一接口
   - 好处：未来接入 PayPal、微信支付等无需改动核心逻辑

3. **Webhook 为业务处理唯一可靠入口**
   - 同步回调（success_url）仅用于页面跳转，不更新订单状态
   - 所有支付结果以 Webhook 为准
   - 定时轮询作为补偿机制

### 10.3 待确认事项（需业务/产品确认）

1. 支持的币种范围（仅 USD 还是多币种？）
2. 是否需要 Stripe Radar 风控服务？
3. 是否需要订阅（Subscription）功能？
4. 是否需要保存用户支付方式（SetupIntent + Customer）？
5. Stripe 收款账户地区选择（影响费率）

---

## 附录

### A. 参考资料

| 来源 | URL |
|------|-----|
| Stripe Java SDK 官方文档 | https://docs.stripe.com/get-started/development-environment?lang=java |
| Stripe PaymentIntents API | https://docs.stripe.com/api/payment_intents |
| Stripe Checkout Session API | https://docs.stripe.com/api/checkout/sessions |
| Stripe Webhook 文档 | https://docs.stripe.com/webhooks |
| Stripe PCI 合规指南 | https://stripe.com/guides/pci-compliance |
| Stripe 定价页 | https://stripe.com/pricing |
| Stripe Java SDK Maven | https://mvnrepository.com/artifact/com.stripe/stripe-java |
| Stripe Java SDK GitHub | https://github.com/stripe/stripe-java |
| 支付宝国际 API 文档 | https://global.alipay.com/docs/ |
| 支付宝 Java SDK | https://github.com/alipay/global-open-sdk-java |
| Stripe Webhook 最佳实践 | https://www.magicbell.com/blog/stripe-webhooks-guide |

### B. Stripe 测试卡号

| 场景 | 卡号 | 说明 |
|------|------|------|
| 支付成功 | `4242 4242 4242 4242` | Visa 测试卡 |
| 支付需要 3D Secure | `4000 0025 0000 3155` | 触发 3DS 认证 |
| 支付被拒 | `4000 0000 0000 0002` | 通用拒付 |
| 支付被拒（余额不足） | `4000 0000 0000 9995` | 余额不足 |
| American Express | `3782 8224 6310 005` | Amex 测试卡 |

### C. 关键 Stripe Webhook 事件速查

| 事件 | 处理优先级 | 说明 |
|------|----------|------|
| `checkout.session.completed` | P0（必须） | Checkout 完成，主流程入口 |
| `checkout.session.async_payment_succeeded` | P0（必须） | 异步支付方法成功 |
| `payment_intent.payment_failed` | P1 | 支付失败通知 |
| `charge.refunded` | P1 | 退款通知 |
| `charge.dispute.created` | P0（告警） | 争议/拒付发生 |
| `radar.early_fraud_warning.created` | P1 | 欺诈预警 |
