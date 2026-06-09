# 优惠券模块 API 接口规范

## 1. 通用约定

### 1.1 基础路径

| 端 | 路径前缀 | 说明 |
|----|----------|------|
| 管理端 | `/api/admin/coupons` | 需管理员角色 |
| 用户端 | `/api/user/coupons` | 需登录态 (Bearer Token) |

### 1.2 通用响应格式

成功响应：

```json
{
    "code": 200,
    "message": "success",
    "data": { }
}
```

分页响应：

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "content": [ ],
        "totalElements": 100,
        "totalPages": 10,
        "number": 0,
        "size": 10
    }
}
```

错误响应：

```json
{
    "code": 400,
    "message": "优惠券已过期",
    "data": null
}
```

### 1.3 认证与鉴权

- 所有接口需携带 `Authorization: Bearer <token>` 请求头
- 管理端接口 (`/api/admin/*`) 需管理员角色，由 Spring Security 拦截器校验
- 用户端接口 (`/api/user/*`) 需普通用户角色，userId 从 token 中解析

### 1.4 枚举值说明

| 枚举 | 可选值 | 说明 |
|------|--------|------|
| couponType | FULL_REDUCTION, DISCOUNT | 满减券 / 折扣券 |
| activityStatus | NOT_STARTED, ACTIVE, ENDED, TERMINATED | 未开始 / 进行中 / 已结束 / 已终止 |
| couponStatus | UNUSED, USED, EXPIRED, REFUNDED | 未使用 / 已使用 / 已过期 / 已退回 |

---

## 2. 管理端 API

### 2.1 创建优惠券活动

**POST** `/api/admin/coupons/activities`

**满减券请求示例**：

```json
{
    "name": "618年中大促满100减20",
    "description": "全场通用，每人限领1张",
    "couponType": "FULL_REDUCTION",
    "totalStock": 10000,
    "perUserLimit": 1,
    "minOrderAmount": 100.00,
    "discountAmount": 20.00,
    "startTime": "2025-06-18T00:00:00",
    "endTime": "2025-06-20T23:59:59"
}
```

**折扣券请求示例**：

```json
{
    "name": "新用户专享85折",
    "description": "仅限新用户领取",
    "couponType": "DISCOUNT",
    "totalStock": 5000,
    "perUserLimit": 1,
    "minOrderAmount": 50.00,
    "discountRate": 0.85,
    "startTime": "2025-06-01T00:00:00",
    "endTime": "2025-06-30T23:59:59"
}
```

**请求参数说明**：

| 字段 | 类型 | 必填 | 校验规则 |
|------|------|------|----------|
| name | String | 是 | 1-100 字符 |
| description | String | 否 | 0-500 字符 |
| couponType | String | 是 | FULL_REDUCTION 或 DISCOUNT |
| totalStock | Integer | 是 | > 0 |
| perUserLimit | Integer | 否 | >= 1，默认 1 |
| minOrderAmount | BigDecimal | 是 | > 0 |
| discountAmount | BigDecimal | 条件必填 | couponType=FULL_REDUCTION 时必填，且 < minOrderAmount |
| discountRate | BigDecimal | 条件必填 | couponType=DISCOUNT 时必填，0 < 值 < 1 |
| startTime | String (ISO 8601) | 是 | 格式 yyyy-MM-ddTHH:mm:ss |
| endTime | String (ISO 8601) | 是 | 格式 yyyy-MM-ddTHH:mm:ss，> startTime |

**成功响应** (201 Created)：

```json
{
    "code": 201,
    "message": "创建成功",
    "data": {
        "id": 1,
        "name": "618年中大促满100减20",
        "couponType": "FULL_REDUCTION",
        "couponTypeName": "满减券",
        "totalStock": 10000,
        "remainingStock": 10000,
        "perUserLimit": 1,
        "minOrderAmount": 100.00,
        "discountAmount": 20.00,
        "discountRate": null,
        "status": "NOT_STARTED",
        "statusName": "未开始",
        "startTime": "2025-06-18T00:00:00",
        "endTime": "2025-06-20T23:59:59",
        "createTime": "2025-05-20T15:30:00"
    }
}
```

**错误场景**：

| HTTP | 业务码 | 说明 |
|------|--------|------|
| 400 | PARAM_INVALID | 参数校验失败（如 discountRate=1.5） |
| 400 | COUPON_RULE_INVALID | 业务规则不满足（如 discountAmount >= minOrderAmount） |

---

### 2.2 查询活动列表

**GET** `/api/admin/coupons/activities`

**Query Parameters**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| keyword | String | 否 | - | 活动名称模糊搜索 |
| couponType | String | 否 | - | 券类型筛选：FULL_REDUCTION / DISCOUNT |
| status | String | 否 | - | 状态筛选：NOT_STARTED / ACTIVE / ENDED / TERMINATED |
| page | Integer | 否 | 1 | 页码，>= 1 |
| size | Integer | 否 | 20 | 每页条数，1-100 |

**成功响应** (200)：

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "content": [
            {
                "id": 1,
                "name": "618年中大促满100减20",
                "couponType": "FULL_REDUCTION",
                "couponTypeName": "满减券",
                "totalStock": 10000,
                "remainingStock": 8523,
                "perUserLimit": 1,
                "minOrderAmount": 100.00,
                "discountAmount": 20.00,
                "status": "ACTIVE",
                "statusName": "进行中",
                "startTime": "2025-06-18T00:00:00",
                "endTime": "2025-06-20T23:59:59",
                "createTime": "2025-05-20T15:30:00"
            },
            {
                "id": 2,
                "name": "新用户专享85折",
                "couponType": "DISCOUNT",
                "couponTypeName": "折扣券",
                "totalStock": 5000,
                "remainingStock": 3150,
                "perUserLimit": 1,
                "minOrderAmount": 50.00,
                "discountRate": 0.85,
                "status": "ACTIVE",
                "statusName": "进行中",
                "startTime": "2025-06-01T00:00:00",
                "endTime": "2025-06-30T23:59:59",
                "createTime": "2025-05-20T16:00:00"
            }
        ],
        "totalElements": 2,
        "totalPages": 1,
        "number": 0,
        "size": 20
    }
}
```

---

### 2.3 查询活动详情

**GET** `/api/admin/coupons/activities/{activityId}`

**Path Parameters**：

| 参数 | 类型 | 说明 |
|------|------|------|
| activityId | Long | 活动ID |

**成功响应** (200)：

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "id": 1,
        "name": "618年中大促满100减20",
        "description": "全场通用，每人限领1张",
        "couponType": "FULL_REDUCTION",
        "couponTypeName": "满减券",
        "totalStock": 10000,
        "remainingStock": 8523,
        "perUserLimit": 1,
        "minOrderAmount": 100.00,
        "discountAmount": 20.00,
        "discountRate": null,
        "status": "ACTIVE",
        "statusName": "进行中",
        "startTime": "2025-06-18T00:00:00",
        "endTime": "2025-06-20T23:59:59",
        "createTime": "2025-05-20T15:30:00",
        "updateTime": "2025-06-18T10:25:00",
        "statistics": {
            "claimedCount": 1477,
            "usedCount": 892,
            "claimRate": 0.1477,
            "usageRate": 0.6039
        }
    }
}
```

**统计字段说明**：

| 字段 | 说明 |
|------|------|
| claimedCount | 已领取总数（不含已退回的） |
| usedCount | 已使用总数 |
| claimRate | 领取率 = claimedCount / totalStock |
| usageRate | 核销率 = usedCount / claimedCount |

**错误响应** (404)：

```json
{
    "code": 404,
    "message": "活动不存在",
    "data": null
}
```

---

### 2.4 终止活动

**PUT** `/api/admin/coupons/activities/{activityId}/terminate`

**成功响应** (200)：

```json
{
    "code": 200,
    "message": "活动已终止",
    "data": {
        "id": 1,
        "status": "TERMINATED",
        "statusName": "已终止"
    }
}
```

**说明**：
- 只能终止状态为 ACTIVE 的活动
- 终止后用户无法再领取新券
- 已领取的优惠券在有效期内仍可正常使用

**错误场景**：

| HTTP | 业务码 | 说明 |
|------|--------|------|
| 404 | COUPON_NOT_FOUND | 活动不存在 |
| 400 | COUPON_NOT_APPLICABLE | 活动状态不是 ACTIVE（如已结束） |

---

### 2.5 修改活动（仅限 NOT_STARTED 状态）

**PUT** `/api/admin/coupons/activities/{activityId}`

**Request Body** 同 2.1 创建接口（所有字段均可选填，只更新提交的字段）。

**成功响应** (200)：

```json
{
    "code": 200,
    "message": "修改成功",
    "data": {
        "id": 1,
        "name": "618年中大促满100减30（更新后）",
        "...": "..."
    }
}
```

**错误场景**：

| HTTP | 业务码 | 说明 |
|------|--------|------|
| 400 | COUPON_NOT_APPLICABLE | 活动不是 NOT_STARTED 状态，不可修改 |

---

## 3. 用户端 API

### 3.1 浏览可用活动

**GET** `/api/user/coupons/activities`

用户可浏览当前可领取的活动列表（系统自动过滤未开始、已结束、已终止的活动）。

**Query Parameters**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | Integer | 否 | 1 | 页码 |
| size | Integer | 否 | 20 | 每页条数 |

**成功响应** (200)：

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "content": [
            {
                "id": 1,
                "name": "618年中大促满100减20",
                "description": "全场通用，每人限领1张",
                "couponType": "FULL_REDUCTION",
                "couponTypeName": "满减券",
                "minOrderAmount": 100.00,
                "discountAmount": 20.00,
                "hint": "满100元减20元",
                "remainingStock": 8523,
                "perUserLimit": 1,
                "userClaimedCount": 0,
                "canClaim": true,
                "endTime": "2025-06-20T23:59:59"
            }
        ],
        "totalElements": 5,
        "totalPages": 1,
        "number": 0,
        "size": 20
    }
}
```

**字段说明**：

| 字段 | 说明 |
|------|------|
| hint | 前端可直接展示的文案 |
| userClaimedCount | 当前用户已领取该活动的券数 |
| canClaim | 当前用户是否还能领取（userClaimedCount < perUserLimit 且库存 > 0） |

---

### 3.2 领取优惠券

**POST** `/api/user/coupons/claim`

**Request Body**：

```json
{
    "activityId": 1
}
```

**成功响应** (200)：

```json
{
    "code": 200,
    "message": "领取成功",
    "data": {
        "id": 10001,
        "activityId": 1,
        "activityName": "618年中大促满100减20",
        "couponType": "FULL_REDUCTION",
        "couponTypeName": "满减券",
        "minOrderAmount": 100.00,
        "discountAmount": 20.00,
        "discountRate": null,
        "status": "UNUSED",
        "statusName": "未使用",
        "hint": "满100元减20元",
        "validFrom": "2025-06-18T00:00:00",
        "validTo": "2025-06-20T23:59:59",
        "createTime": "2025-06-18T10:30:00"
    }
}
```

**错误场景**：

| HTTP | 业务码 | 说明 |
|------|--------|------|
| 404 | COUPON_NOT_FOUND | 活动不存在 |
| 400 | COUPON_NOT_APPLICABLE | 活动不可领取（未开始/已结束/已终止） |
| 409 | COUPON_STOCK_EXHAUSTED | 库存已耗尽 |
| 409 | COUPON_LIMIT_EXCEEDED | 已达个人领取上限 |
| 409 | COUPON_CONCURRENT | 并发冲突，请稍后重试 |

---

### 3.3 查询我的优惠券

**GET** `/api/user/coupons`

**Query Parameters**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| status | String | 否 | - | 状态筛选：UNUSED / USED / EXPIRED / REFUNDED，为空表示全部 |
| page | Integer | 否 | 1 | 页码 |
| size | Integer | 否 | 20 | 每页条数 |

**成功响应** (200)：

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "content": [
            {
                "id": 10001,
                "activityId": 1,
                "activityName": "618年中大促满100减20",
                "couponType": "FULL_REDUCTION",
                "couponTypeName": "满减券",
                "minOrderAmount": 100.00,
                "discountAmount": 20.00,
                "discountRate": null,
                "status": "UNUSED",
                "statusName": "未使用",
                "hint": "满100元减20元",
                "validFrom": "2025-06-18T00:00:00",
                "validTo": "2025-06-20T23:59:59",
                "createTime": "2025-06-18T10:30:00"
            },
            {
                "id": 10002,
                "activityId": 2,
                "activityName": "新用户专享85折",
                "couponType": "DISCOUNT",
                "couponTypeName": "折扣券",
                "minOrderAmount": 50.00,
                "discountAmount": null,
                "discountRate": 0.85,
                "status": "USED",
                "statusName": "已使用",
                "hint": "满50元打85折",
                "usedAt": "2025-06-15T14:22:00",
                "orderId": 5001,
                "validFrom": "2025-06-01T00:00:00",
                "validTo": "2025-06-30T23:59:59",
                "createTime": "2025-06-10T09:15:00"
            }
        ],
        "totalElements": 45,
        "totalPages": 3,
        "number": 0,
        "size": 20
    }
}
```

---

### 3.4 查询下单可用优惠券

**GET** `/api/user/coupons/available`

在结算页面展示可用优惠券列表，系统自动过滤不满足条件的券，按优惠力度从大到小排序。

**Query Parameters**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderAmount | BigDecimal | 是 | 订单当前总金额，用于过滤不满足门槛的券 |

**成功响应** (200)：

```json
{
    "code": 200,
    "message": "success",
    "data": [
        {
            "id": 10001,
            "activityName": "618年中大促满100减20",
            "couponType": "FULL_REDUCTION",
            "couponTypeName": "满减券",
            "minOrderAmount": 100.00,
            "discountAmount": 20.00,
            "discountRate": null,
            "hint": "满100元减20元",
            "saveAmount": 20.00,
            "validTo": "2025-06-20T23:59:59",
            "expiresSoon": false
        },
        {
            "id": 10002,
            "activityName": "新用户专享85折",
            "couponType": "DISCOUNT",
            "couponTypeName": "折扣券",
            "minOrderAmount": 50.00,
            "discountAmount": null,
            "discountRate": 0.85,
            "hint": "满50元打85折",
            "saveAmount": 22.50,
            "validTo": "2025-06-30T23:59:59",
            "expiresSoon": false
        }
    ]
}
```

**字段说明**：

| 字段 | 说明 |
|------|------|
| saveAmount | 使用该券可节省的金额（预计算值，排序依据） |
| expiresSoon | 是否即将过期（validTo 距现在 < 24h 时为 true） |

排序规则：先按 saveAmount 降序，再按 validTo 升序（快过期的优先）。

---

### 3.5 预览优惠（试算）

**POST** `/api/user/coupons/preview`

使用指定的优惠券和订单金额做试算，不影响券的状态。用户可在选择券时实时查看优惠后金额。

**Request Body**：

```json
{
    "couponId": 10001,
    "orderAmount": 150.00
}
```

**满减券响应示例** (200)：

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "couponId": 10001,
        "couponType": "FULL_REDUCTION",
        "couponTypeName": "满减券",
        "originalAmount": 150.00,
        "discountValue": 20.00,
        "finalAmount": 130.00
    }
}
```

**折扣券响应示例** (200)：

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "couponId": 10002,
        "couponType": "DISCOUNT",
        "couponTypeName": "折扣券",
        "originalAmount": 150.00,
        "discountValue": 22.50,
        "finalAmount": 127.50
    }
}
```

**不满足条件响应** (400)：

```json
{
    "code": 400,
    "message": "订单金额 80.00 不满足最低消费 100.00",
    "data": null
}
```

---

## 4. 内部服务方法（供 OrderService 调用）

以下接口不暴露为 HTTP API，而是作为 Service 层的 Java 方法供订单模块调用。所有方法需在事务内调用（propagation = MANDATORY）。

### 4.1 validateAndLock

```java
/**
 * 校验优惠券可用性并在数据库层面原子锁定。
 * 锁定成功后券状态变为 USED，直至订单创建完成或回滚。
 *
 * @param userId      用户ID
 * @param couponId    优惠券ID
 * @param orderAmount 订单金额
 * @return 优惠计算结果（含实付金额）
 * @throws CouponNotFoundException   券不存在
 * @throws CouponNotApplicableException 不满足使用条件
 * @throws CouponExpiredException    券已过期
 * @throws CouponConcurrentException 并发冲突
 */
CouponDeductionResult validateAndLock(Long userId, Long couponId, BigDecimal orderAmount);
```

### 4.2 confirmUse

```java
/**
 * 订单创建成功后，回填订单ID到优惠券记录。
 * 必须在 validateAndLock 成功后、同一事务内调用。
 *
 * @param couponId 优惠券ID
 * @param orderId  订单ID
 */
void confirmUse(Long couponId, Long orderId);
```

### 4.3 refundByOrderId

```java
/**
 * 订单退款时，退回到期的优惠券。
 * 券状态从 USED 变为 REFUNDED，同时恢复活动库存。
 *
 * @param orderId 退款订单ID
 * @throws CouponConcurrentException 并发冲突
 */
void refundByOrderId(Long orderId);
```

---

## 5. 错误码汇总

| 业务码 | HTTP | 中文说明 | 英文说明 |
|--------|------|----------|----------|
| SUCCESS | 200 | 成功 | Success |
| PARAM_INVALID | 400 | 参数校验失败 | Invalid parameters |
| UNAUTHORIZED | 401 | 未登录 | Unauthorized |
| FORBIDDEN | 403 | 无权限 | Forbidden |
| COUPON_NOT_FOUND | 404 | 优惠券/活动不存在 | Coupon not found |
| COUPON_RULE_INVALID | 400 | 优惠券规则不合法 | Invalid coupon rules |
| COUPON_EXPIRED | 400 | 优惠券已过期 | Coupon expired |
| COUPON_NOT_APPLICABLE | 400 | 不满足使用条件 | Coupon not applicable |
| COUPON_STOCK_EXHAUSTED | 409 | 库存不足 | Stock exhausted |
| COUPON_ALREADY_USED | 409 | 优惠券已使用 | Coupon already used |
| COUPON_LIMIT_EXCEEDED | 409 | 超过领取上限 | Claim limit exceeded |
| COUPON_CONCURRENT | 409 | 并发冲突，请重试 | Concurrent conflict, please retry |
| ACTIVITY_NOT_ACTIVE | 400 | 活动不可用 | Activity not active |

---

## 6. API 调用时序

### 6.1 下单使用优惠券完整流程

```
用户端              CouponController      OrderService        CouponService        数据库
  │                      │                     │                    │                  │
  │  GET /available      │                     │                    │                  │
  │   ?orderAmount=150   │                     │                    │                  │
  │─────────────────────>│                     │                    │                  │
  │                      │ findAvailable()     │                    │                  │
  │                      │────────────────────────────────────────>│                  │
  │                      │                     │                    │ SELECT ...       │
  │                      │                     │                    │───────────────>│
  │                      │                     │                    │ <─ 可用券列表 ───│
  │                      │ <─ List<Coupon> ────│                    │                  │
  │  <── 可用券列表 ──────│                     │                    │                  │
  │                      │                     │                    │                  │
  │  POST /preview       │                     │                    │                  │
  │  {couponId, amount}  │                     │                    │                  │
  │─────────────────────>│                     │                    │                  │
  │                      │ preview()           │                    │                  │
  │                      │────────────────────────────────────────>│                  │
  │                      │                     │                    │ calculate()      │
  │                      │ <─ DeductionResult ──│                    │                  │
  │  <── 试算结果 ───────│                     │                    │                  │
  │                      │                     │                    │                  │
  │  POST /orders        │                     │                    │                  │
  │  {couponId, ...}     │                     │                    │                  │
  │───────────────────────────────────────────>│                    │                  │
  │                      │                     │ validateAndLock() │                  │
  │                      │                     │──────────────────>│                  │
  │                      │                     │                    │ UPDATE ...       │
  │                      │                     │                    │ WHERE version=?  │
  │                      │                     │                    │───────────────>│
  │                      │                     │                    │ <─ affected=1 ───│
  │                      │                     │ <─ DeductionResult─│                  │
  │                      │                     │                    │                  │
  │                      │                     │ INSERT INTO order │                  │
  │                      │                     │───────────────────────────────────>│
  │                      │                     │ <─ order.id ──────────────────────│
  │                      │                     │                    │                  │
  │                      │                     │ confirmUse()       │                  │
  │                      │                     │──────────────────>│                  │
  │                      │                     │                    │ UPDATE order_id  │
  │                      │                     │                    │───────────────>│
  │                      │                     │                    │                  │
  │  <── 订单创建成功 ──────────────────────────│                    │                  │
```

---

## 7. 性能与限流建议

| 接口 | 建议限流 | 缓存建议 |
|------|----------|----------|
| GET /admin/activities | 100次/分钟/IP | Redis 缓存 1 分钟 |
| GET /admin/activities/{id} | 无限制 | - |
| POST /admin/activities | 10次/分钟/IP | - |
| GET /user/activities | 100次/分钟/用户 | Redis 缓存 30 秒 |
| POST /user/claim | 30次/分钟/用户 | - |
| GET /user/coupons | 60次/分钟/用户 | - |
| GET /user/available | 120次/分钟/用户 | - |
| POST /user/preview | 60次/分钟/用户 | - |
