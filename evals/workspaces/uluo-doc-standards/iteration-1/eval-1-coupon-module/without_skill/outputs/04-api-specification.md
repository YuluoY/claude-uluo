# 优惠券模块 API 接口规范

## 1. 通用约定

### 1.1 基础路径

- 管理端：`/api/admin/coupons`
- 用户端：`/api/user/coupons`

### 1.2 通用响应格式

```json
{
    "code": 200,
    "message": "success",
    "data": { }
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

### 1.3 认证

所有接口需携带 Authorization header（Bearer Token），管理端接口需管理员角色。

---

## 2. 管理端 API

### 2.1 创建优惠券活动

**POST** `/api/admin/coupons/activities`

**Request Body**:

```json
{
    "name": "618满100减20",
    "description": "618年中大促满减券",
    "couponType": "FULL_REDUCTION",
    "totalStock": 10000,
    "perUserLimit": 1,
    "minOrderAmount": 100.00,
    "discountAmount": 20.00,
    "startTime": "2025-06-18T00:00:00",
    "endTime": "2025-06-20T23:59:59"
}
```

满减券示例与折扣券示例：

```json
{
    "name": "全场85折",
    "description": "新用户专享折扣",
    "couponType": "DISCOUNT",
    "totalStock": 5000,
    "perUserLimit": 1,
    "minOrderAmount": 50.00,
    "discountRate": 0.85,
    "startTime": "2025-06-18T00:00:00",
    "endTime": "2025-06-30T23:59:59"
}
```

**字段说明**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | String | 是 | 活动名称，最长100字符 |
| description | String | 否 | 活动描述，最长500字符 |
| couponType | String | 是 | FULL_REDUCTION 或 DISCOUNT |
| totalStock | Integer | 是 | 发行总量，> 0 |
| perUserLimit | Integer | 否 | 每人限领数量，默认1 |
| minOrderAmount | BigDecimal | 是 | 最低消费金额，> 0 |
| discountAmount | BigDecimal | 条件必填 | 满减优惠金额（couponType=FULL_REDUCTION时必填） |
| discountRate | BigDecimal | 条件必填 | 折扣率（couponType=DISCOUNT时必填），0~1之间 |
| startTime | String | 是 | 活动开始时间 ISO 8601 |
| endTime | String | 是 | 活动结束时间 ISO 8601，必须晚于 startTime |

**校验规则**:
- 满减券：`discountAmount` 必填且 < `minOrderAmount`
- 折扣券：`discountRate` 必填且 0 < `discountRate` < 1
- `endTime` > `startTime`
- `totalStock` > 0

**Response** (200):

```json
{
    "code": 200,
    "message": "创建成功",
    "data": {
        "id": 1,
        "name": "618满100减20",
        "couponType": "FULL_REDUCTION",
        "totalStock": 10000,
        "remainingStock": 10000,
        "status": "NOT_STARTED",
        "startTime": "2025-06-18T00:00:00",
        "endTime": "2025-06-20T23:59:59",
        "createTime": "2025-06-08T15:30:00"
    }
}
```

---

### 2.2 查询活动列表

**GET** `/api/admin/coupons/activities`

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keyword | String | 否 | 活动名称模糊搜索 |
| couponType | String | 否 | 券类型筛选 |
| status | String | 否 | 状态筛选：NOT_STARTED/ACTIVE/ENDED/TERMINATED |
| page | Integer | 否 | 页码，默认1 |
| size | Integer | 否 | 每页条数，默认20，最大100 |

**Response** (200):

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "content": [
            {
                "id": 1,
                "name": "618满100减20",
                "couponType": "FULL_REDUCTION",
                "totalStock": 10000,
                "remainingStock": 8523,
                "perUserLimit": 1,
                "minOrderAmount": 100.00,
                "discountAmount": 20.00,
                "status": "ACTIVE",
                "startTime": "2025-06-18T00:00:00",
                "endTime": "2025-06-20T23:59:59",
                "createTime": "2025-06-08T15:30:00"
            }
        ],
        "totalElements": 1,
        "totalPages": 1,
        "number": 0,
        "size": 20
    }
}
```

---

### 2.3 查询活动详情

**GET** `/api/admin/coupons/activities/{activityId}`

**Response** (200):

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "id": 1,
        "name": "618满100减20",
        "description": "618年中大促满减券",
        "couponType": "FULL_REDUCTION",
        "totalStock": 10000,
        "remainingStock": 8523,
        "perUserLimit": 1,
        "minOrderAmount": 100.00,
        "discountAmount": 20.00,
        "discountRate": null,
        "status": "ACTIVE",
        "startTime": "2025-06-18T00:00:00",
        "endTime": "2025-06-20T23:59:59",
        "createTime": "2025-06-08T15:30:00",
        "updateTime": "2025-06-18T10:25:00",
        "statistics": {
            "claimedCount": 1477,
            "usedCount": 892,
            "claimRate": 0.1477
        }
    }
}
```

---

### 2.4 终止活动

**PUT** `/api/admin/coupons/activities/{activityId}/terminate`

**Response** (200):

```json
{
    "code": 200,
    "message": "活动已终止",
    "data": {
        "id": 1,
        "status": "TERMINATED"
    }
}
```

说明：终止后，用户已领取的优惠券在有效期内仍可使用，但不可再领取。

---

## 3. 用户端 API

### 3.1 领取优惠券

**POST** `/api/user/coupons/claim`

**Request Body**:

```json
{
    "activityId": 1
}
```

**Response** (200):

```json
{
    "code": 200,
    "message": "领取成功",
    "data": {
        "id": 1001,
        "activityId": 1,
        "couponType": "FULL_REDUCTION",
        "couponTypeName": "满减券",
        "minOrderAmount": 100.00,
        "discountAmount": 20.00,
        "status": "UNUSED",
        "statusName": "未使用",
        "validFrom": "2025-06-18T00:00:00",
        "validTo": "2025-06-20T23:59:59",
        "createTime": "2025-06-18T10:30:00"
    }
}
```

**错误场景**:

| 状态码 | 消息 | 说明 |
|--------|------|------|
| 404 | 活动不存在 | activityId 无效 |
| 400 | 活动未开始/已结束 | 活动状态不是 ACTIVE |
| 409 | 库存不足 | remaining_stock == 0 |
| 409 | 已达领取上限 | 该用户已领取 perUserLimit 张 |
| 409 | 领取失败，请重试 | 并发冲突，重试 |
| 409 | 活动已终止 | 管理员已终止活动 |

---

### 3.2 查询我的优惠券

**GET** `/api/user/coupons`

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | String | 否 | UNUSED/USED/EXPIRED/REFUNDED，默认全部 |
| page | Integer | 否 | 页码，默认1 |
| size | Integer | 否 | 每页条数，默认20 |

**Response** (200):

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "content": [
            {
                "id": 1001,
                "activityId": 1,
                "activityName": "618满100减20",
                "couponType": "FULL_REDUCTION",
                "couponTypeName": "满减券",
                "minOrderAmount": 100.00,
                "discountAmount": 20.00,
                "discountRate": null,
                "status": "UNUSED",
                "statusName": "未使用",
                "validFrom": "2025-06-18T00:00:00",
                "validTo": "2025-06-20T23:59:59",
                "createTime": "2025-06-18T10:30:00"
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

### 3.3 查询下单可用优惠券

**GET** `/api/user/coupons/available`

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderAmount | BigDecimal | 否 | 订单当前总金额，用于过滤不满足门槛的券 |

**Response** (200):

```json
{
    "code": 200,
    "message": "success",
    "data": [
        {
            "id": 1001,
            "activityName": "618满100减20",
            "couponType": "FULL_REDUCTION",
            "couponTypeName": "满减券",
            "minOrderAmount": 100.00,
            "discountAmount": 20.00,
            "hint": "满100元减20元",
            "validTo": "2025-06-20T23:59:59"
        },
        {
            "id": 1002,
            "activityName": "全场85折",
            "couponType": "DISCOUNT",
            "couponTypeName": "折扣券",
            "minOrderAmount": 50.00,
            "discountRate": 0.85,
            "hint": "满50元打85折",
            "validTo": "2025-06-30T23:59:59"
        }
    ]
}
```

返回结果按优惠力度从大到小排序（系统智能推荐）。

---

### 3.4 预览优惠（试算）

**POST** `/api/user/coupons/preview`

**Request Body**:

```json
{
    "couponId": 1001,
    "orderAmount": 150.00
}
```

**Response** (200):

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "originalAmount": 150.00,
        "discountValue": 20.00,
        "finalAmount": 130.00
    }
}
```

折扣券示例：

```json
{
    "code": 200,
    "message": "success",
    "data": {
        "originalAmount": 150.00,
        "discountValue": 22.50,
        "finalAmount": 127.50
    }
}
```

---

## 4. 内部服务接口（供 OrderService 调用）

以下接口不直接暴露 HTTP，而是通过 Service 层 Java 方法调用。

### 4.1 校验并锁定优惠券

```java
/**
 * 校验优惠券可用性并锁定
 * @return 优惠计算结果
 * @throws CouponNotApplicableException 不满足使用条件
 * @throws CouponConcurrentException 并发冲突
 */
CouponDeductionResult validateAndLock(Long userId, Long couponId, BigDecimal orderAmount);
```

### 4.2 确认使用优惠券

```java
/**
 * 订单创建成功后，确认使用（回填 orderId）
 */
void confirmUse(Long couponId, Long orderId);
```

### 4.3 释放优惠券

```java
/**
 * 订单创建失败时，释放已锁定的优惠券（回退状态）
 */
void releaseLock(Long couponId);
```

### 4.4 退券（订单退款时）

```java
/**
 * 订单退款时退回优惠券
 */
void refundByOrderId(Long orderId);
```

---

## 5. 状态码汇总

| 业务码 | HTTP | 说明 |
|--------|------|------|
| 200 | 200 | 成功 |
| 400 | 400 | 参数校验失败 |
| 401 | 401 | 未登录 |
| 403 | 403 | 无权限 |
| 404 | 404 | 资源不存在 |
| COUPON_STOCK_EXHAUSTED | 409 | 库存不足 |
| COUPON_EXPIRED | 400 | 优惠券已过期 |
| COUPON_NOT_APPLICABLE | 400 | 不满足使用条件 |
| COUPON_ALREADY_USED | 409 | 优惠券已使用 |
| COUPON_LIMIT_EXCEEDED | 409 | 超过领取上限 |
| COUPON_CONCURRENT | 409 | 并发冲突，请重试 |
| ACTIVITY_NOT_ACTIVE | 400 | 活动不可用 |
