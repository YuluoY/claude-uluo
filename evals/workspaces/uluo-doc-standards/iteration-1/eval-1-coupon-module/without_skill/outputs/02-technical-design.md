# 优惠券模块技术设计文档

## 1. 模块架构

### 1.1 整体分层

```
┌─────────────────────────────────────────────┐
│              Controller Layer                │
│  CouponAdminController  CouponUserController │
├─────────────────────────────────────────────┤
│               Service Layer                  │
│  CouponActivityService   CouponService       │
│  UserCouponService       CouponDeductionService │
├─────────────────────────────────────────────┤
│             Repository Layer                 │
│  CouponActivityRepo  CouponRepo  UserCouponRepo │
├─────────────────────────────────────────────┤
│               Domain Layer                   │
│  CouponActivity  Coupon  UserCoupon          │
│  CouponType  CouponStatus  ActivityStatus    │
├─────────────────────────────────────────────┤
│            Infrastructure Layer              │
│  MyBatis Mapper  DB  Scheduler              │
└─────────────────────────────────────────────┘
```

### 1.2 新增包结构

```
src/main/java/com/shop/
├── coupon/
│   ├── controller/
│   │   ├── CouponAdminController.java    # 管理端接口
│   │   └── CouponUserController.java     # 用户端接口
│   ├── service/
│   │   ├── CouponActivityService.java    # 优惠券活动管理
│   │   ├── CouponService.java            # 优惠券领取与校验
│   │   ├── UserCouponService.java        # 用户优惠券管理
│   │   └── CouponDeductionService.java   # 优惠扣减计算
│   ├── repository/
│   │   ├── CouponActivityRepo.java       # 活动数据访问
│   │   ├── UserCouponRepo.java           # 用户优惠券数据访问
│   │   └── CouponUsageLockRepo.java      # 并发控制
│   ├── domain/
│   │   ├── CouponActivity.java           # 优惠券活动实体
│   │   ├── UserCoupon.java              # 用户优惠券实体
│   │   ├── CouponType.java              # 券类型枚举
│   │   ├── CouponStatus.java            # 用户券状态枚举
│   │   ├── ActivityStatus.java          # 活动状态枚举
│   │   └── CouponDeductionResult.java   # 优惠计算结果
│   ├── dto/
│   │   ├── CreateActivityRequest.java
│   │   ├── ApplyCouponRequest.java
│   │   ├── ApplyCouponResponse.java
│   │   └── UserCouponDTO.java
│   └── scheduler/
│       └── CouponExpireScheduler.java   # 过期处理定时任务
```

## 2. 核心类设计

### 2.1 领域实体

#### CouponActivity（优惠券活动）

```java
public class CouponActivity {
    private Long id;                    // 主键
    private String name;                // 活动名称
    private String description;         // 活动描述
    private CouponType couponType;      // 券类型
    private Integer totalStock;         // 发行总量
    private Integer remainingStock;     // 剩余库存（关键并发字段）
    private Integer perUserLimit;       // 每人限领数量
    private BigDecimal minOrderAmount;  // 最低消费金额
    private BigDecimal discountAmount;  // 优惠金额（满减券用）
    private BigDecimal discountRate;    // 折扣率（折扣券用）
    private LocalDateTime startTime;    // 生效时间
    private LocalDateTime endTime;      // 失效时间
    private ActivityStatus status;      // 活动状态
    private Integer version;            // 乐观锁版本号
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
```

#### UserCoupon（用户优惠券）

```java
public class UserCoupon {
    private Long id;                    // 主键
    private Long userId;                // 用户ID
    private Long activityId;            // 活动ID
    private CouponType couponType;      // 券类型（冗余，方便查询）
    private BigDecimal minOrderAmount;  // 最低消费金额（冗余快照）
    private BigDecimal discountAmount;  // 优惠金额（冗余快照）
    private BigDecimal discountRate;    // 折扣率（冗余快照）
    private CouponStatus status;        // 状态
    private Long orderId;               // 使用的订单ID（使用后回填）
    private LocalDateTime usedAt;       // 使用时间
    private LocalDateTime validFrom;    // 有效期起始
    private LocalDateTime validTo;      // 有效期截止
    private Integer version;            // 乐观锁版本号
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
```

### 2.2 枚举定义

```java
public enum CouponType {
    FULL_REDUCTION("满减券"),
    DISCOUNT("折扣券");
}

public enum ActivityStatus {
    NOT_STARTED("未开始"),
    ACTIVE("进行中"),
    ENDED("已结束"),
    TERMINATED("已终止");
}

public enum CouponStatus {
    UNUSED("未使用"),
    USED("已使用"),
    EXPIRED("已过期"),
    REFUNDED("已退回");
}
```

### 2.3 优惠计算服务

```java
@Service
public class CouponDeductionService {

    /**
     * 计算优惠后金额
     */
    public CouponDeductionResult calculate(UserCoupon coupon, BigDecimal orderAmount) {
        if (orderAmount.compareTo(coupon.getMinOrderAmount()) < 0) {
            throw new CouponNotApplicableException("订单金额不满足最低消费条件");
        }

        BigDecimal finalAmount;
        BigDecimal discountValue;

        switch (coupon.getCouponType()) {
            case FULL_REDUCTION:
                discountValue = coupon.getDiscountAmount();
                finalAmount = orderAmount.subtract(discountValue);
                break;
            case DISCOUNT:
                finalAmount = orderAmount.multiply(coupon.getDiscountRate());
                discountValue = orderAmount.subtract(finalAmount);
                break;
            default:
                throw new IllegalArgumentException("未知券类型");
        }

        // 最终金额不得小于 0.01
        if (finalAmount.compareTo(BigDecimal.ZERO) <= 0) {
            finalAmount = new BigDecimal("0.01");
            discountValue = orderAmount.subtract(finalAmount);
        }

        return new CouponDeductionResult(orderAmount, finalAmount, discountValue);
    }
}
```

## 3. 并发安全设计

### 3.1 库存扣减（乐观锁方案）

使用版本号实现乐观锁，避免 `SELECT ... FOR UPDATE` 带来的锁等待开销。

```java
// MyBatis Mapper XML 中的 SQL
// UPDATE coupon_activity
// SET remaining_stock = remaining_stock - 1,
//     version = version + 1,
//     update_time = NOW()
// WHERE id = #{activityId}
//   AND remaining_stock > 0
//   AND version = #{version}
//   AND status = 'ACTIVE'
//   AND start_time <= NOW()
//   AND end_time >= NOW()
```

关键点：
- 同时校验 `remaining_stock > 0`、版本号、活动状态、有效期
- 若 `affected rows == 0`，则扣减失败，抛出并发异常由调用方重试
- Service 层实现重试逻辑（最多重试 3 次，间隔 50ms 递增）

### 3.2 用户限领控制（数据库唯一约束）

```sql
-- 唯一索引保证同一用户同一活动不会超领
CREATE UNIQUE INDEX uk_user_activity_ordinal
ON user_coupon(user_id, activity_id, ordinal);

-- ordinal 字段为用户第 N 次领取的序号
-- 领取前查询 COUNT(*) 确定是否达到 perUserLimit
-- 若 COUNT(*) < perUserLimit，则 INSERT 时 ordinal = COUNT(*) + 1
```

并发场景下，在 `REPEATABLE READ` 隔离级别下，COUNT(*) + INSERT 可能存在幻读。解决方案：
- 方案 A（推荐）：使用 `INSERT ... WHERE (SELECT COUNT(*) ...) < perUserLimit` 单条 SQL 在事务内执行
- 方案 B：在 Service 层加分布式锁（Redis），但增加复杂度
- 方案 C：使用唯一约束 + `uk_user_activity_ordinal`，令 ordinal 的最大值等于 perUserLimit，INSERT 冲突即表示超限

### 3.3 优惠券使用（乐观锁）

```java
// 使用优惠券时，更新 user_coupon 表
// UPDATE user_coupon
// SET status = 'USED',
//     order_id = #{orderId},
//     used_at = NOW(),
//     version = version + 1
// WHERE id = #{id}
//   AND user_id = #{userId}
//   AND status = 'UNUSED'
//   AND version = #{version}
//   AND valid_from <= NOW()
//   AND valid_to >= NOW()
```

### 3.4 订单回滚时的优惠券状态回退

在订单取消/退款流程中，通过 OrderService 回调 CouponService 的方法：

```java
@Transactional(rollbackFor = Exception.class)
public void refundCoupon(Long orderId) {
    UserCoupon coupon = userCouponRepo.findByOrderId(orderId);
    if (coupon == null) return;
    
    int rows = userCouponRepo.updateStatus(
        coupon.getId(), CouponStatus.USED, CouponStatus.REFUNDED, coupon.getVersion());
    if (rows == 0) {
        throw new ConcurrentModificationException("优惠券状态回退失败");
    }
}
```

## 4. 关键流程

### 4.1 优惠券领取流程

```
用户请求领取
    │
    ▼
校验活动是否存在、状态是否为 ACTIVE
    │
    ▼
校验用户是否已达到领取上限 (COUNT < perUserLimit)
    │
    ▼
乐观锁扣减库存 (UPDATE ... WHERE version = ?)
    │ retry if affected rows == 0
    ▼
插入用户优惠券记录
    │
    ▼
返回领取成功
```

### 4.2 下单使用优惠券流程

```
用户提交订单（附带 couponId）
    │
    ▼
OrderService 调用 CouponService.useCoupon(userId, couponId, orderAmount)
    │
    ▼
校验优惠券归属、状态、有效期
    │
    ▼
校验订单金额是否满足最低消费
    │
    ▼
计算优惠后金额
    │
    ▼
乐观锁标记优惠券为已使用（绑定 orderId）
    │ retry if affected rows == 0
    ▼
返回优惠后金额
    │
    ▼
OrderService 以优惠后金额创建订单
```

### 4.3 过期处理定时任务

```
@Scheduled(cron = "0 0 2 * * ?")  # 每天凌晨2点执行
    │
    ▼
分批（每批 500 条）查询已过期但状态为 UNUSED 的优惠券
    │
    ▼
for each batch:
    UPDATE user_coupon SET status = 'EXPIRED' WHERE id IN (...)
    AND status = 'UNUSED' AND valid_to < NOW()
    │
    ▼
日志记录处理总数
```

## 5. 异常处理

| 异常类 | 场景 | HTTP 状态码 |
|--------|------|-------------|
| `CouponNotFoundException` | 优惠券不存在 | 404 |
| `CouponStockExhaustedException` | 库存不足 | 409 |
| `CouponExpiredException` | 优惠券已过期 | 400 |
| `CouponNotApplicableException` | 不满足使用条件 | 400 |
| `CouponAlreadyUsedException` | 优惠券已使用 | 409 |
| `CouponPerUserLimitException` | 超过领取上限 | 409 |
| `CouponConcurrentException` | 并发冲突（重试后仍失败） | 409 |

## 6. 与现有模块的集成点

### 6.1 OrderService 集成

在 `OrderService.createOrder()` 中：
1. 如果 request 中包含 `couponId`，先调用 `CouponService.validateAndLock(userId, couponId, totalAmount)`
2. 得到优惠后实付金额 `finalAmount`
3. 以 `finalAmount` 作为订单金额创建订单
4. 订单创建成功后，调用 `CouponService.confirmUse(couponId, orderId)`
5. 订单创建失败时，调用 `CouponService.releaseLock(couponId)` 释放券

### 6.2 现有 promotion 满减活动模块的协调

- 已有的 promotion 满减活动可能会与优惠券叠加
- 当前版本暂不处理叠加，优惠券使用规则中明确规定"不可与其他促销叠加"
- 预留 `PromotionRuleEngine` 接口，后续可扩展叠加规则

```java
public interface PromotionRuleEngine {
    boolean canCombine(CouponType couponType, PromotionType promoType);
}
```

## 7. 测试策略

### 7.1 单元测试
- `CouponDeductionService` 计算逻辑测试（满减、折扣、边界值）
- 枚举和实体字段验证
- DTO 转换测试

### 7.2 集成测试
- Repository 层乐观锁更新测试
- Service 层事务回滚测试
- Controller 层 API 请求/响应测试

### 7.3 并发测试
- 多线程库存扣减超发测试（验证乐观锁）
- 同一用户并发领取限上限测试（验证唯一约束）
- 同一优惠券并发使用测试
