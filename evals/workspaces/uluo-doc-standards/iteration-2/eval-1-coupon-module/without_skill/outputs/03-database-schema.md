# 优惠券模块数据库设计文档

## 1. 数据模型概览

```
┌──────────────────────────┐              ┌──────────────────────────┐
│    coupon_activity       │              │      user_coupon         │
├──────────────────────────┤    1:N       ├──────────────────────────┤
│ id (PK)                  │──────────────│ id (PK)                  │
│ name                     │              │ user_id                  │
│ description              │              │ activity_id (FK)         │
│ coupon_type              │              │ ordinal                  │
│ total_stock              │              │ coupon_type (快照)        │
│ remaining_stock          │              │ min_order_amount (快照)   │
│ per_user_limit           │              │ discount_amount (快照)    │
│ min_order_amount         │              │ discount_rate (快照)      │
│ discount_amount          │              │ status                   │
│ discount_rate            │              │ order_id (FK→order)      │
│ start_time               │              │ used_at                  │
│ end_time                 │              │ valid_from               │
│ status                   │              │ valid_to                 │
│ version (乐观锁)          │              │ version (乐观锁)          │
│ create_time / update_time│              │ create_time / update_time│
└──────────────────────────┘              └──────────────────────────┘
```

---

## 2. 表结构定义

### 2.1 coupon_activity（优惠券活动表）

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | - | 主键 |
| name | VARCHAR(100) | NOT NULL | - | 活动名称 |
| description | VARCHAR(500) | NULL | NULL | 活动描述 |
| coupon_type | VARCHAR(20) | NOT NULL | - | 券类型: FULL_REDUCTION / DISCOUNT |
| total_stock | INT UNSIGNED | NOT NULL | - | 发行总量，> 0 |
| remaining_stock | INT UNSIGNED | NOT NULL | 0 | 剩余库存 |
| per_user_limit | INT UNSIGNED | NOT NULL | 1 | 每人限领数量 |
| min_order_amount | DECIMAL(12,2) | NOT NULL | - | 最低消费金额 |
| discount_amount | DECIMAL(12,2) | NULL | NULL | 优惠金额（满减券用） |
| discount_rate | DECIMAL(5,4) | NULL | NULL | 折扣率（折扣券用，如 0.8500） |
| start_time | DATETIME(3) | NOT NULL | - | 活动开始时间 |
| end_time | DATETIME(3) | NOT NULL | - | 活动结束时间 |
| status | VARCHAR(20) | NOT NULL | NOT_STARTED | 活动状态 |
| version | INT UNSIGNED | NOT NULL | 0 | 乐观锁版本号 |
| create_time | DATETIME(3) | NOT NULL | CURRENT_TIMESTAMP(3) | 创建时间 |
| update_time | DATETIME(3) | NOT NULL | CURRENT_TIMESTAMP(3) | 更新时间（自动更新） |

**字段约束说明**：
- `total_stock` 和 `remaining_stock` 初始值需相等，`remaining_stock <= total_stock`
- `discount_amount` 和 `discount_rate` 互斥：满减券 discount_amount NOT NULL 且 discount_rate IS NULL，折扣券反之
- `min_order_amount` 必须 > 0
- 满减券：`discount_amount < min_order_amount`
- `end_time > start_time`

**索引设计**：

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| PRIMARY | id | 主键 | - |
| idx_status_time | (status, start_time, end_time) | 普通 | 按状态+时间范围查询活动列表 |
| idx_start_end | (start_time, end_time) | 普通 | 定时任务扫描需变更状态的活动 |
| idx_coupon_type | (coupon_type) | 普通 | 按券类型筛选 |

### 2.2 user_coupon（用户优惠券表）

| 字段名 | 类型 | 约束 | 默认值 | 说明 |
|--------|------|------|--------|------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | - | 主键 |
| user_id | BIGINT UNSIGNED | NOT NULL | - | 用户ID |
| activity_id | BIGINT UNSIGNED | NOT NULL | - | 活动ID，关联 coupon_activity.id |
| ordinal | INT UNSIGNED | NOT NULL | 1 | 该用户第N次领取此活动券（从1开始） |
| coupon_type | VARCHAR(20) | NOT NULL | - | 券类型快照 |
| min_order_amount | DECIMAL(12,2) | NOT NULL | - | 最低消费金额快照 |
| discount_amount | DECIMAL(12,2) | NULL | NULL | 优惠金额快照 |
| discount_rate | DECIMAL(5,4) | NULL | NULL | 折扣率快照 |
| status | VARCHAR(20) | NOT NULL | UNUSED | UNUSED / USED / EXPIRED / REFUNDED |
| order_id | BIGINT UNSIGNED | NULL | NULL | 使用该券的订单ID |
| used_at | DATETIME(3) | NULL | NULL | 使用时间 |
| valid_from | DATETIME(3) | NOT NULL | - | 有效期起始 |
| valid_to | DATETIME(3) | NOT NULL | - | 有效期截止 |
| version | INT UNSIGNED | NOT NULL | 0 | 乐观锁版本号 |
| create_time | DATETIME(3) | NOT NULL | CURRENT_TIMESTAMP(3) | 领取时间 |
| update_time | DATETIME(3) | NOT NULL | CURRENT_TIMESTAMP(3) | 更新时间（自动更新） |

**索引设计**：

| 索引名 | 字段 | 类型 | 说明 |
|--------|------|------|------|
| PRIMARY | id | 主键 | - |
| uk_user_activity_ordinal | (user_id, activity_id, ordinal) | 唯一 | 防超领：同一用户同一活动 ordinal 唯一 |
| idx_user_status | (user_id, status) | 普通 | 用户券列表查询（按状态） |
| idx_user_available | (user_id, status, valid_from, valid_to) | 普通 | 可用券查询（结算页） |
| idx_order_id | (order_id) | 普通 | 通过订单ID反查优惠券（退款退券用） |
| idx_status_valid_to | (status, valid_to) | 普通 | 过期券定时扫描 |
| idx_activity_id | (activity_id) | 普通 | 按活动统计领取量 |

---

## 3. DDL 语句

### 3.1 创建 coupon_activity 表

```sql
CREATE TABLE IF NOT EXISTS coupon_activity (
    id                BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name              VARCHAR(100)     NOT NULL COMMENT '活动名称',
    description       VARCHAR(500)     NULL COMMENT '活动描述',
    coupon_type       VARCHAR(20)      NOT NULL COMMENT '券类型: FULL_REDUCTION/DISCOUNT',
    total_stock       INT UNSIGNED     NOT NULL COMMENT '发行总量',
    remaining_stock   INT UNSIGNED     NOT NULL DEFAULT 0 COMMENT '剩余库存',
    per_user_limit    INT UNSIGNED     NOT NULL DEFAULT 1 COMMENT '每人限领数量',
    min_order_amount  DECIMAL(12,2)    NOT NULL COMMENT '最低消费金额',
    discount_amount   DECIMAL(12,2)    NULL COMMENT '优惠金额(满减券)',
    discount_rate     DECIMAL(5,4)     NULL COMMENT '折扣率(折扣券, 如0.8500)',
    start_time        DATETIME(3)      NOT NULL COMMENT '活动开始时间',
    end_time          DATETIME(3)      NOT NULL COMMENT '活动结束时间',
    status            VARCHAR(20)      NOT NULL DEFAULT 'NOT_STARTED' COMMENT '活动状态',
    version           INT UNSIGNED     NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    create_time       DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
    update_time       DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',

    INDEX idx_status_time   (status, start_time, end_time),
    INDEX idx_start_end     (start_time, end_time),
    INDEX idx_coupon_type   (coupon_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='优惠券活动表';
```

### 3.2 创建 user_coupon 表

```sql
CREATE TABLE IF NOT EXISTS user_coupon (
    id                BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id           BIGINT UNSIGNED  NOT NULL COMMENT '用户ID',
    activity_id       BIGINT UNSIGNED  NOT NULL COMMENT '活动ID',
    ordinal           INT UNSIGNED     NOT NULL DEFAULT 1 COMMENT '该用户第N次领取(从1开始)',
    coupon_type       VARCHAR(20)      NOT NULL COMMENT '券类型快照',
    min_order_amount  DECIMAL(12,2)    NOT NULL COMMENT '最低消费金额快照',
    discount_amount   DECIMAL(12,2)    NULL COMMENT '优惠金额快照(满减券)',
    discount_rate     DECIMAL(5,4)     NULL COMMENT '折扣率快照(折扣券)',
    status            VARCHAR(20)      NOT NULL DEFAULT 'UNUSED' COMMENT '状态: UNUSED/USED/EXPIRED/REFUNDED',
    order_id          BIGINT UNSIGNED  NULL COMMENT '使用的订单ID',
    used_at           DATETIME(3)      NULL COMMENT '使用时间',
    valid_from        DATETIME(3)      NOT NULL COMMENT '有效期起始',
    valid_to          DATETIME(3)      NOT NULL COMMENT '有效期截止',
    version           INT UNSIGNED     NOT NULL DEFAULT 0 COMMENT '乐观锁版本号',
    create_time       DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '领取时间',
    update_time       DATETIME(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3) COMMENT '更新时间',

    UNIQUE KEY uk_user_activity_ordinal (user_id, activity_id, ordinal),
    INDEX      idx_user_status          (user_id, status),
    INDEX      idx_user_available       (user_id, status, valid_from, valid_to),
    INDEX      idx_order_id             (order_id),
    INDEX      idx_status_valid_to      (status, valid_to),
    INDEX      idx_activity_id          (activity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户优惠券表';
```

---

## 4. 核心 SQL（MyBatis Mapper XML 参考实现）

### 4.1 CouponActivityMapper.xml

#### 4.1.1 乐观锁扣减库存

```xml
<update id="deductStock">
    UPDATE coupon_activity
    SET remaining_stock = remaining_stock - 1,
        version         = version + 1,
        update_time     = NOW(3)
    WHERE id              = #{activityId}
      AND remaining_stock > 0
      AND version         = #{version}
      AND status          = 'ACTIVE'
      AND start_time     &lt;= NOW(3)
      AND end_time       &gt;= NOW(3)
</update>
```

**关键点**：所有校验条件放在 WHERE 子句中，利用数据库的原子性保证并发安全。
- `remaining_stock > 0` 防止库存超发
- `version = #{version}` 乐观锁，防止并发覆盖
- `status = 'ACTIVE'` 防止对非活跃活动操作
- `start_time <= NOW() AND end_time >= NOW()` 防止在有效期外扣减

#### 4.1.2 恢复库存（退券时）

```xml
<update id="incrementStock">
    UPDATE coupon_activity
    SET remaining_stock = remaining_stock + #{count},
        update_time     = NOW(3)
    WHERE id = #{activityId}
</update>
```

#### 4.1.3 更新活动状态（定时任务）

```xml
<update id="updateStatusIfTimeReached">
    UPDATE coupon_activity
    SET status     = #{newStatus},
        version    = version + 1,
        update_time = NOW(3)
    WHERE status    = #{currentStatus}
      AND (
          (#{newStatus} = 'ACTIVE' AND start_time &lt;= NOW(3))
          OR
          (#{newStatus} = 'ENDED' AND end_time &lt;= NOW(3))
      )
</update>
```

#### 4.1.4 终止活动

```xml
<update id="terminateActivity">
    UPDATE coupon_activity
    SET status     = 'TERMINATED',
        version    = version + 1,
        update_time = NOW(3)
    WHERE id     = #{activityId}
      AND status = 'ACTIVE'
</update>
```

#### 4.1.5 分页查询活动列表（动态SQL）

```xml
<select id="findByConditions" resultType="CouponActivity">
    SELECT *
    FROM coupon_activity
    <where>
        <if test="keyword != null and keyword != ''">
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
    LIMIT #{offset}, #{limit}
</select>

<select id="countByConditions" resultType="long">
    SELECT COUNT(*)
    FROM coupon_activity
    <where>
        <if test="keyword != null and keyword != ''">
            AND name LIKE CONCAT('%', #{keyword}, '%')
        </if>
        <if test="couponType != null">
            AND coupon_type = #{couponType}
        </if>
        <if test="status != null">
            AND status = #{status}
        </if>
    </where>
</select>
```

### 4.2 UserCouponMapper.xml

#### 4.2.1 插入用户优惠券

```xml
<insert id="insert" useGeneratedKeys="true" keyProperty="id">
    INSERT INTO user_coupon (
        user_id, activity_id, ordinal,
        coupon_type, min_order_amount, discount_amount, discount_rate,
        status, valid_from, valid_to
    ) VALUES (
        #{userId}, #{activityId}, #{ordinal},
        #{couponType}, #{minOrderAmount}, #{discountAmount}, #{discountRate},
        'UNUSED', #{validFrom}, #{validTo}
    )
</insert>
```

#### 4.2.2 标记优惠券为已使用（乐观锁）

```xml
<update id="markAsUsed">
    UPDATE user_coupon
    SET status     = 'USED',
        order_id   = #{orderId},
        used_at    = NOW(3),
        version    = version + 1,
        update_time = NOW(3)
    WHERE id       = #{id}
      AND user_id  = #{userId}
      AND status   = 'UNUSED'
      AND version  = #{version}
      AND valid_from &lt;= NOW(3)
      AND valid_to   &gt;= NOW(3)
</update>
```

#### 4.2.3 回填订单ID（确认使用）

```xml
<update id="updateOrderId">
    UPDATE user_coupon
    SET order_id   = #{orderId},
        update_time = NOW(3)
    WHERE id       = #{id}
      AND status   = 'USED'
</update>
```

#### 4.2.4 退券（回退状态）

```xml
<update id="updateStatus">
    UPDATE user_coupon
    SET status     = #{newStatus},
        version    = version + 1,
        update_time = NOW(3)
    WHERE id       = #{id}
      AND status   = #{currentStatus}
      AND version  = #{version}
</update>
```

#### 4.2.5 查询用户可用优惠券（结算页，按优惠力度排序）

```xml
<select id="findAvailableByUserId" resultType="UserCoupon">
    SELECT uc.*
    FROM user_coupon uc
    WHERE uc.user_id  = #{userId}
      AND uc.status   = 'UNUSED'
      AND uc.valid_from &lt;= NOW(3)
      AND uc.valid_to   &gt;= NOW(3)
      AND uc.min_order_amount &lt;= #{orderAmount}
    ORDER BY
        CASE uc.coupon_type
            WHEN 'FULL_REDUCTION' THEN uc.discount_amount
            WHEN 'DISCOUNT' THEN (1 - uc.discount_rate) * #{orderAmount}
        END DESC,
        uc.valid_to ASC
</select>
```

排序逻辑：先按优惠金额从大到小（用户倾向看到最划算的券），再按到期时间从近到远（快过期的优先展示）。

#### 4.2.6 统计用户已领取数量（排除已退回的）

```xml
<select id="countByUserAndActivity" resultType="int">
    SELECT COUNT(*)
    FROM user_coupon
    WHERE user_id    = #{userId}
      AND activity_id = #{activityId}
      AND status     != 'REFUNDED'
</select>
```

#### 4.2.7 查询过期未使用的券ID（分批）

```xml
<select id="findExpiredUnusedIds" resultType="long">
    SELECT id
    FROM user_coupon
    WHERE status   = 'UNUSED'
      AND valid_to &lt; #{now}
    ORDER BY id ASC
    LIMIT #{limit}
</select>
```

#### 4.2.8 批量标记过期

```xml
<update id="batchMarkAsExpired">
    UPDATE user_coupon
    SET status      = 'EXPIRED',
        version     = version + 1,
        update_time = NOW(3)
    WHERE id IN
    <foreach collection="ids" item="id" open="(" separator="," close=")">
        #{id}
    </foreach>
      AND status   = 'UNUSED'
      AND valid_to &lt; NOW(3)
</update>
```

#### 4.2.9 通过订单ID查询优惠券

```xml
<select id="findByOrderId" resultType="UserCoupon">
    SELECT *
    FROM user_coupon
    WHERE order_id = #{orderId}
    LIMIT 1
</select>
```

---

## 5. 数据迁移与版本管理

建议使用 Flyway 或 Liquibase 管理数据库版本。

```sql
-- V2__create_coupon_tables.sql

-- ... (上述 DDL 语句) ...
```

回滚脚本（谨慎使用）：

```sql
-- V2__rollback.sql
DROP TABLE IF EXISTS user_coupon;
DROP TABLE IF EXISTS coupon_activity;
```

---

## 6. 容量与性能评估

| 指标 | 评估值 | 说明 |
|------|--------|------|
| coupon_activity 表预估行数 | < 10万 | 活动记录有限 |
| user_coupon 表预估行数 | 100万 ~ 5000万 | 用户数 * 平均领券数 |
| 单表安全线 | < 2000万 | 超过后建议分表 |
| 热点活动查询延迟 | < 10ms | 走索引 idx_status_time |
| 结算页可用券查询 | < 30ms | 走复合索引 idx_user_available |
| 过期扫描效率 | 500条/批 < 100ms | 走 idx_status_valid_to |

**分表策略（远期规划）**：
- user_coupon 按 `user_id` 哈希取模，分 16 张表
- 路由逻辑在 Repo 层封装，Service 层无感知
- 唯一索引 `uk_user_activity_ordinal` 变更为分表局部唯一（无需跨表）

---

## 7. 数据类型选择说明

| 选择 | 理由 |
|------|------|
| BIGINT UNSIGNED 作为主键 | 支持 > 42亿行，无符号充分利用范围 |
| DECIMAL(12,2) 存储金额 | 避免浮点数精度问题，12位整数部分支持到千亿级别 |
| DECIMAL(5,4) 存储折扣率 | 例如 0.8500，精确到万分之一 |
| DATETIME(3) 毫秒精度 | 满足并发场景的时间排序需求 |
| INT UNSIGNED 库存字段 | 库存不会为负，无符号类型天然保证 |
| utf8mb4_unicode_ci 字符集 | 支持 emoji 等特殊字符，unicode_ci 排序更准确 |
| InnoDB 引擎 | 支持事务、行级锁、外键约束 |
