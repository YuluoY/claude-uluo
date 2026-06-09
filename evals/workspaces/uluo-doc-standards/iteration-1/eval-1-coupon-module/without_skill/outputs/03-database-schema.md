# 优惠券模块数据库设计

## 1. 新增表

### 1.1 coupon_activity（优惠券活动表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 主键 |
| name | VARCHAR(100) | NOT NULL | 活动名称 |
| description | VARCHAR(500) | | 活动描述 |
| coupon_type | VARCHAR(20) | NOT NULL | 券类型：FULL_REDUCTION / DISCOUNT |
| total_stock | INT | NOT NULL, CHECK > 0 | 发行总量 |
| remaining_stock | INT | NOT NULL, DEFAULT 0 | 剩余库存 |
| per_user_limit | INT | NOT NULL, DEFAULT 1 | 每人限领数量 |
| min_order_amount | DECIMAL(10,2) | NOT NULL | 最低消费金额 |
| discount_amount | DECIMAL(10,2) | | 优惠金额（满减券时必填） |
| discount_rate | DECIMAL(5,4) | | 折扣率（折扣券时必填，如 0.8500） |
| start_time | DATETIME | NOT NULL | 活动开始时间 |
| end_time | DATETIME | NOT NULL | 活动结束时间 |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'NOT_STARTED' | 活动状态 |
| version | INT | NOT NULL, DEFAULT 0 | 乐观锁版本号 |
| create_time | DATETIME | NOT NULL, DEFAULT NOW() | 创建时间 |
| update_time | DATETIME | NOT NULL, DEFAULT NOW() ON UPDATE | 更新时间 |

**索引**：
- `idx_status_start_end` (status, start_time, end_time) — 按状态和时间查询活动列表
- `idx_start_end` (start_time, end_time) — 定时任务检查活动状态变更

### 1.2 user_coupon（用户优惠券表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 主键 |
| user_id | BIGINT | NOT NULL | 用户ID |
| activity_id | BIGINT | NOT NULL, FK -> coupon_activity(id) | 活动ID |
| ordinal | INT | NOT NULL, DEFAULT 1 | 该用户第N次领取此活动 |
| coupon_type | VARCHAR(20) | NOT NULL | 券类型（冗余快照） |
| min_order_amount | DECIMAL(10,2) | NOT NULL | 最低消费金额（冗余快照） |
| discount_amount | DECIMAL(10,2) | | 优惠金额（冗余快照） |
| discount_rate | DECIMAL(5,4) | | 折扣率（冗余快照） |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'UNUSED' | 状态 |
| order_id | BIGINT | | 使用的订单ID |
| used_at | DATETIME | | 使用时间 |
| valid_from | DATETIME | NOT NULL | 有效期起始 |
| valid_to | DATETIME | NOT NULL | 有效期截止 |
| version | INT | NOT NULL, DEFAULT 0 | 乐观锁版本号 |
| create_time | DATETIME | NOT NULL, DEFAULT NOW() | 领取时间 |
| update_time | DATETIME | NOT NULL, DEFAULT NOW() ON UPDATE | 更新时间 |

**索引**：
- `idx_user_status` (user_id, status) — 查询用户优惠券列表
- `idx_user_valid` (user_id, status, valid_to) — 查询可用优惠券
- `idx_order_id` (order_id) — 通过订单ID反查优惠券
- `uk_user_activity_ordinal` UNIQUE (user_id, activity_id, ordinal) — 保证领取序号唯一（限领控制）

## 2. DDL 语句

### 2.1 创建 coupon_activity 表

```sql
CREATE TABLE coupon_activity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '活动名称',
    description VARCHAR(500) COMMENT '活动描述',
    coupon_type VARCHAR(20) NOT NULL COMMENT '券类型：FULL_REDUCTION/DISCOUNT',
    total_stock INT NOT NULL COMMENT '发行总量',
    remaining_stock INT NOT NULL DEFAULT 0 COMMENT '剩余库存',
    per_user_limit INT NOT NULL DEFAULT 1 COMMENT '每人限领数量',
    min_order_amount DECIMAL(10,2) NOT NULL COMMENT '最低消费金额',
    discount_amount DECIMAL(10,2) COMMENT '优惠金额(满减券)',
    discount_rate DECIMAL(5,4) COMMENT '折扣率(折扣券)',
    start_time DATETIME NOT NULL COMMENT '活动开始时间',
    end_time DATETIME NOT NULL COMMENT '活动结束时间',
    status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED' COMMENT '活动状态',
    version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status_start_end (status, start_time, end_time),
    INDEX idx_start_end (start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='优惠券活动表';
```

### 2.2 创建 user_coupon 表

```sql
CREATE TABLE user_coupon (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL COMMENT '用户ID',
    activity_id BIGINT NOT NULL COMMENT '活动ID',
    ordinal INT NOT NULL DEFAULT 1 COMMENT '该用户第N次领取',
    coupon_type VARCHAR(20) NOT NULL COMMENT '券类型(冗余)',
    min_order_amount DECIMAL(10,2) NOT NULL COMMENT '最低消费金额(冗余)',
    discount_amount DECIMAL(10,2) COMMENT '优惠金额(冗余)',
    discount_rate DECIMAL(5,4) COMMENT '折扣率(冗余)',
    status VARCHAR(20) NOT NULL DEFAULT 'UNUSED' COMMENT '状态',
    order_id BIGINT COMMENT '使用的订单ID',
    used_at DATETIME COMMENT '使用时间',
    valid_from DATETIME NOT NULL COMMENT '有效期起始',
    valid_to DATETIME NOT NULL COMMENT '有效期截止',
    version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '领取时间',
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_status (user_id, status),
    INDEX idx_user_valid (user_id, status, valid_to),
    INDEX idx_order_id (order_id),
    UNIQUE KEY uk_user_activity_ordinal (user_id, activity_id, ordinal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户优惠券表';
```

## 3. 核心 SQL

### 3.1 库存扣减（乐观锁）

```sql
-- MyBatis Mapper: CouponActivityMapper.xml
<update id="deductStock">
    UPDATE coupon_activity
    SET remaining_stock = remaining_stock - 1,
        version = version + 1,
        update_time = NOW()
    WHERE id = #{activityId}
      AND remaining_stock > 0
      AND version = #{version}
      AND status = 'ACTIVE'
      AND start_time &lt;= NOW()
      AND end_time &gt;= NOW()
</update>
```

### 3.2 查询活动（含状态计算）

```sql
<select id="findActivities" resultType="CouponActivity">
    SELECT *,
        CASE
            WHEN status = 'TERMINATED' THEN 'TERMINATED'
            WHEN NOW() &lt; start_time THEN 'NOT_STARTED'
            WHEN NOW() BETWEEN start_time AND end_time THEN
                CASE WHEN status = 'ENDED' THEN 'ENDED' ELSE 'ACTIVE' END
            ELSE 'ENDED'
        END AS computed_status
    FROM coupon_activity
    <where>
        <if test="keyword != null">
            AND name LIKE CONCAT('%', #{keyword}, '%')
        </if>
        <if test="couponType != null">
            AND coupon_type = #{couponType}
        </if>
        <if test="status != null">
            AND status = #{status}
        </if>
    </where>
    ORDER BY create_time DESC
</select>
```

### 3.3 查询用户可用优惠券（下单时）

```sql
<select id="findAvailableByUserId" resultType="UserCoupon">
    SELECT uc.*
    FROM user_coupon uc
    JOIN coupon_activity ca ON uc.activity_id = ca.id
    WHERE uc.user_id = #{userId}
      AND uc.status = 'UNUSED'
      AND uc.valid_from &lt;= NOW()
      AND uc.valid_to &gt;= NOW()
      AND uc.min_order_amount &lt;= #{orderAmount}
      AND ca.status IN ('ACTIVE', 'ENDED')
    ORDER BY
        CASE uc.coupon_type
            WHEN 'FULL_REDUCTION' THEN uc.discount_amount
            WHEN 'DISCOUNT' THEN (1 - uc.discount_rate) * #{orderAmount}
        END DESC
</select>
```

按优惠力度从大到小排序，用户更容易找到最划算的券。

### 3.4 锁定优惠券（标记已使用）

```sql
<update id="markAsUsed">
    UPDATE user_coupon
    SET status = 'USED',
        order_id = #{orderId},
        used_at = NOW(),
        version = version + 1
    WHERE id = #{id}
      AND user_id = #{userId}
      AND status = 'UNUSED'
      AND version = #{version}
      AND valid_from &lt;= NOW()
      AND valid_to &gt;= NOW()
</update>
```

### 3.5 过期优惠券批量处理

```sql
<update id="batchExpire">
    UPDATE user_coupon
    SET status = 'EXPIRED',
        version = version + 1
    WHERE id IN
    <foreach collection="ids" item="id" open="(" separator="," close=")">
        #{id}
    </foreach>
    AND status = 'UNUSED'
    AND valid_to &lt; NOW()
</update>
```

### 3.6 统计用户已领取数量

```sql
<select id="countByUserAndActivity" resultType="int">
    SELECT COUNT(*)
    FROM user_coupon
    WHERE user_id = #{userId}
      AND activity_id = #{activityId}
      AND status != 'REFUNDED'
</select>
```

## 4. ER 关系图

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│   coupon_activity │         │    user_coupon   │         │      order       │
├──────────────────┤         ├──────────────────┤         ├──────────────────┤
│ id (PK)          │──1:N──→│ id (PK)          │         │ id (PK)          │
│ name             │         │ user_id          │         │ user_id          │
│ coupon_type      │         │ activity_id (FK) │         │ total_amount     │
│ total_stock      │         │ ordinal          │←──N:1──│ final_amount     │
│ remaining_stock  │         │ coupon_type      │         │ coupon_id (FK)   │←── N:1
│ per_user_limit   │         │ min_order_amount │         │ status           │
│ min_order_amount │         │ discount_amount  │         │ create_time      │
│ discount_amount  │         │ discount_rate    │         └──────────────────┘
│ discount_rate    │         │ status           │
│ start_time       │         │ order_id (FK)    │──N:1──→
│ end_time         │         │ used_at          │
│ status           │         │ valid_from       │
│ version          │         │ valid_to         │
│ create_time      │         │ version          │
│ update_time      │         │ create_time      │
└──────────────────┘         │ update_time      │
                             └──────────────────┘
```

## 5. 数据量估算

| 表 | 预估数据量 | 说明 |
|----|-----------|------|
| coupon_activity | < 10 万 | 活动数量有限 |
| user_coupon | 500 万 ~ 5000 万 | 用户*活动，建议后续按 user_id 分表 |

初期无需分表，user_coupon 的索引设计已覆盖核心查询场景。当单表超过 2000 万条时，可考虑按 user_id 取模分 16 张表。
