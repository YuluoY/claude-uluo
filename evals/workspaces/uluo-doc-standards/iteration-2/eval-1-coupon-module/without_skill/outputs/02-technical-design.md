# 优惠券模块技术设计文档

## 1. 模块架构

### 1.1 分层架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      Controller Layer                           │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │ CouponAdminController│  │ CouponUserController │            │
│  │  /api/admin/coupons   │  │  /api/user/coupons    │            │
│  └──────────┬───────────┘  └──────────┬───────────┘            │
├─────────────┼─────────────────────────┼─────────────────────────┤
│             │       Service Layer      │                         │
│  ┌──────────▼─────────────────────────▼───────────┐            │
│  │  CouponActivityService     CouponService        │            │
│  │  UserCouponService         CouponDeductionService│            │
│  └──────────┬─────────────────────────────────────┘            │
├─────────────┼───────────────────────────────────────────────────┤
│             │          Repository Layer                         │
│  ┌──────────▼─────────────────────────────────────┐            │
│  │  CouponActivityRepo     UserCouponRepo          │            │
│  │  (封装 MyBatis Mapper 调用)                      │            │
│  └──────────┬─────────────────────────────────────┘            │
├─────────────┼───────────────────────────────────────────────────┤
│             │          Infrastructure Layer                     │
│  ┌──────────▼─────────────────────────────────────┐            │
│  │  MyBatis Mapper XML      MySQL 8.0              │            │
│  │  CouponExpireScheduler   @Scheduled             │            │
│  └────────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                          Domain Model
  ┌──────────────────────────────────────────────────────────────┐
  │  CouponActivity  UserCoupon  CouponType  CouponStatus        │
  │  ActivityStatus   CouponDeductionResult                      │
  └──────────────────────────────────────────────────────────────┘
```

### 1.2 包结构设计

```
src/main/java/com/shop/
├── coupon/
│   ├── controller/
│   │   ├── CouponAdminController.java       # 管理端 REST 接口
│   │   └── CouponUserController.java        # 用户端 REST 接口
│   │
│   ├── service/
│   │   ├── CouponActivityService.java       # 活动生命周期管理
│   │   ├── CouponService.java               # 领取/锁定/使用/退券
│   │   ├── UserCouponService.java           # 用户券查询/预览
│   │   └── CouponDeductionService.java      # 优惠金额计算引擎
│   │
│   ├── repository/
│   │   ├── CouponActivityRepo.java          # 活动数据访问
│   │   └── UserCouponRepo.java              # 用户券数据访问
│   │
│   ├── domain/
│   │   ├── CouponActivity.java              # 优惠券活动实体
│   │   ├── UserCoupon.java                  # 用户优惠券实体
│   │   ├── CouponType.java                  # 券类型枚举
│   │   ├── CouponStatus.java                # 用户券状态枚举
│   │   ├── ActivityStatus.java              # 活动状态枚举
│   │   └── CouponDeductionResult.java       # 优惠计算结果 VO
│   │
│   ├── dto/
│   │   ├── request/
│   │   │   ├── CreateActivityRequest.java
│   │   │   ├── ClaimCouponRequest.java
│   │   │   └── PreviewCouponRequest.java
│   │   └── response/
│   │       ├── ActivityDetailResponse.java
│   │       ├── ActivityListResponse.java
│   │       ├── UserCouponResponse.java
│   │       └── AvailableCouponResponse.java
│   │
│   ├── exception/
│   │   ├── CouponNotFoundException.java
│   │   ├── CouponStockExhaustedException.java
│   │   ├── CouponExpiredException.java
│   │   ├── CouponNotApplicableException.java
│   │   ├── CouponAlreadyUsedException.java
│   │   ├── CouponPerUserLimitException.java
│   │   └── CouponConcurrentException.java
│   │
│   └── scheduler/
│       ├── CouponExpireScheduler.java       # 过期券处理
│       └── ActivityStatusScheduler.java     # 活动状态自动变更
```

---

## 2. 核心领域模型

### 2.1 CouponActivity（优惠券活动）

```java
public class CouponActivity {
    private Long id;                    // 主键，自增
    private String name;                // 活动名称，最长100
    private String description;         // 活动描述，最长500
    private CouponType couponType;      // 券类型枚举
    private Integer totalStock;         // 发行总量
    private Integer remainingStock;     // 剩余库存（并发敏感字段）
    private Integer perUserLimit;       // 每人限领数量，默认1
    private BigDecimal minOrderAmount;  // 最低消费金额
    private BigDecimal discountAmount;  // 优惠金额（满减券专用）
    private BigDecimal discountRate;    // 折扣率（折扣券专用，0~1）
    private LocalDateTime startTime;    // 生效时间
    private LocalDateTime endTime;      // 失效时间
    private ActivityStatus status;      // 活动状态
    private Integer version;            // 乐观锁版本号
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
```

**字段约束**：
- 满减券时 `discountAmount` 不为 null 且 `discountRate` 为 null
- 折扣券时 `discountRate` 不为 null 且 `discountAmount` 为 null
- `minOrderAmount` 必须大于 0
- 满减券须满足 `discountAmount < minOrderAmount`

### 2.2 UserCoupon（用户优惠券）

```java
public class UserCoupon {
    private Long id;                    // 主键，自增
    private Long userId;                // 用户ID（外键）
    private Long activityId;            // 活动ID（外键）
    private Integer ordinal;            // 该用户第N次领取（限领控制用）
    private CouponType couponType;      // 券类型（冗余快照）
    private BigDecimal minOrderAmount;  // 最低消费金额（冗余快照）
    private BigDecimal discountAmount;  // 优惠金额（冗余快照）
    private BigDecimal discountRate;    // 折扣率（冗余快照）
    private CouponStatus status;        // 券状态
    private Long orderId;               // 使用该券的订单ID
    private LocalDateTime usedAt;       // 使用时间
    private LocalDateTime validFrom;    // 有效期起始
    private LocalDateTime validTo;      // 有效期截止
    private Integer version;            // 乐观锁版本号
    private LocalDateTime createTime;   // 领取时间
    private LocalDateTime updateTime;
}
```

**设计说明**：
- `couponType`、`minOrderAmount`、`discountAmount`、`discountRate` 四个字段从活动表冗余复制过来，作为快照。即使后续活动被修改，已领取的优惠券规则不变。
- `ordinal` 字段配合 `uk_user_activity_ordinal` 唯一索引实现限领控制。

### 2.3 枚举定义

```java
public enum CouponType {
    FULL_REDUCTION("满减券"),
    DISCOUNT("折扣券");

    private final String displayName;
}

public enum ActivityStatus {
    NOT_STARTED("未开始"),
    ACTIVE("进行中"),
    ENDED("已结束"),
    TERMINATED("已终止");

    private final String displayName;
}

public enum CouponStatus {
    UNUSED("未使用"),
    USED("已使用"),
    EXPIRED("已过期"),
    REFUNDED("已退回");

    private final String displayName;
}
```

### 2.4 CouponDeductionResult（计算结果）

```java
public class CouponDeductionResult {
    private BigDecimal originalAmount;   // 订单原始金额
    private BigDecimal discountValue;    // 优惠减免金额
    private BigDecimal finalAmount;      // 优惠后实付金额
    private CouponType couponType;       // 使用的券类型
}
```

---

## 3. 服务层设计

### 3.1 CouponDeductionService（计算引擎）

```java
@Service
public class CouponDeductionService {

    private static final BigDecimal MIN_AMOUNT = new BigDecimal("0.01");

    /**
     * 计算优惠后金额。仅做数学计算，不修改数据库状态。
     *
     * @param coupon      用户优惠券（含快照的规则参数）
     * @param orderAmount 订单当前总金额
     * @return 优惠计算结果
     * @throws CouponNotApplicableException 订单金额不满足最低消费
     */
    public CouponDeductionResult calculate(UserCoupon coupon, BigDecimal orderAmount) {
        // 1. 校验最低消费
        if (orderAmount.compareTo(coupon.getMinOrderAmount()) < 0) {
            throw new CouponNotApplicableException(
                String.format("订单金额 %.2f 不满足最低消费 %.2f",
                    orderAmount, coupon.getMinOrderAmount()));
        }

        // 2. 根据券类型计算
        BigDecimal finalAmount;
        BigDecimal discountValue;

        switch (coupon.getCouponType()) {
            case FULL_REDUCTION:
                discountValue = coupon.getDiscountAmount();
                finalAmount = orderAmount.subtract(discountValue);
                break;

            case DISCOUNT:
                finalAmount = orderAmount.multiply(coupon.getDiscountRate())
                    .setScale(2, RoundingMode.HALF_UP);
                discountValue = orderAmount.subtract(finalAmount);
                break;

            default:
                throw new IllegalArgumentException("不支持的券类型: " + coupon.getCouponType());
        }

        // 3. 兜底保护：最终金额不低于 0.01
        if (finalAmount.compareTo(MIN_AMOUNT) < 0) {
            finalAmount = MIN_AMOUNT;
            discountValue = orderAmount.subtract(finalAmount);
        }

        return new CouponDeductionResult(orderAmount, discountValue, finalAmount,
            coupon.getCouponType());
    }
}
```

**计算示例**：

| 场景 | 券类型 | 订单金额 | 参数 | 优惠金额 | 实付金额 |
|------|--------|----------|------|----------|----------|
| 满减正常 | FULL_REDUCTION | 150.00 | 满100减20 | 20.00 | 130.00 |
| 满减不足 | FULL_REDUCTION | 80.00 | 满100减20 | 抛异常 | - |
| 折扣正常 | DISCOUNT | 150.00 | 85折 | 22.50 | 127.50 |
| 折扣边界 | DISCOUNT | 50.00 | 9折 | 5.00 | 45.00 |
| 兜底保护 | FULL_REDUCTION | 20.00 | 满10减25 | 19.99 | 0.01 |

### 3.2 CouponService（领取与使用）

这是模块核心服务，承担领取、锁定、确认使用、释放、退券五个关键职责。

#### 3.2.1 领取优惠券（带乐观锁重试）

```java
@Service
public class CouponService {

    private static final int MAX_RETRY = 3;
    private static final long RETRY_BASE_DELAY_MS = 50;

    private final CouponActivityRepo activityRepo;
    private final UserCouponRepo userCouponRepo;

    @Transactional(rollbackFor = Exception.class)
    public UserCouponResponse claimCoupon(Long userId, Long activityId) {
        // Step 1: 查询活动，校验状态
        CouponActivity activity = activityRepo.findById(activityId)
            .orElseThrow(() -> new CouponNotFoundException("活动不存在, id=" + activityId));

        validateActivityAvailability(activity);

        // Step 2: 校验用户领取限额
        int alreadyClaimed = userCouponRepo.countByUserAndActivity(userId, activityId);
        if (alreadyClaimed >= activity.getPerUserLimit()) {
            throw new CouponPerUserLimitException(
                String.format("已达领取上限 %d 张", activity.getPerUserLimit()));
        }

        // Step 3: 乐观锁扣减库存（带重试）
        boolean deducted = deductStockWithRetry(activity);
        if (!deducted) {
            throw new CouponStockExhaustedException("库存不足，领取失败");
        }

        // Step 4: 创建用户优惠券记录
        UserCoupon userCoupon = buildUserCoupon(userId, activity, alreadyClaimed + 1);
        userCouponRepo.insert(userCoupon);

        return UserCouponResponse.from(userCoupon);
    }

    private void validateActivityAvailability(CouponActivity activity) {
        LocalDateTime now = LocalDateTime.now();

        if (activity.getStatus() == ActivityStatus.TERMINATED) {
            throw new CouponNotApplicableException("活动已被终止");
        }
        if (activity.getStatus() != ActivityStatus.ACTIVE) {
            throw new CouponNotApplicableException("活动当前状态不可领取: " + activity.getStatus());
        }
        if (now.isBefore(activity.getStartTime())) {
            throw new CouponNotApplicableException("活动尚未开始");
        }
        if (now.isAfter(activity.getEndTime())) {
            throw new CouponNotApplicableException("活动已结束");
        }
    }

    private boolean deductStockWithRetry(CouponActivity activity) {
        for (int i = 0; i < MAX_RETRY; i++) {
            int affectedRows = activityRepo.deductStock(
                activity.getId(), activity.getVersion());
            if (affectedRows > 0) {
                return true;
            }

            // 重新获取最新版本
            activity = activityRepo.findById(activity.getId()).orElse(null);
            if (activity == null || activity.getRemainingStock() <= 0) {
                return false;
            }

            if (i < MAX_RETRY - 1) {
                sleep(RETRY_BASE_DELAY_MS * (i + 1));
            }
        }
        return false;
    }

    private UserCoupon buildUserCoupon(Long userId, CouponActivity activity, int ordinal) {
        UserCoupon uc = new UserCoupon();
        uc.setUserId(userId);
        uc.setActivityId(activity.getId());
        uc.setOrdinal(ordinal);
        // 冗余快照
        uc.setCouponType(activity.getCouponType());
        uc.setMinOrderAmount(activity.getMinOrderAmount());
        uc.setDiscountAmount(activity.getDiscountAmount());
        uc.setDiscountRate(activity.getDiscountRate());
        uc.setStatus(CouponStatus.UNUSED);
        uc.setValidFrom(activity.getStartTime());
        uc.setValidTo(activity.getEndTime());
        return uc;
    }
}
```

#### 3.2.2 优惠券使用流程（与订单服务协作）

优惠券使用分为两个阶段：**锁定**（下单时）和**确认**（订单创建成功后）。这种两阶段设计避免了长期持有锁。

```
createOrder()
    │
    ├─① validateAndLock(couponId)     // 原子校验+锁定（UPDATE ... status='USED'）
    │    └─ 乐观锁防并发，失败抛异常
    │
    ├─② 创建订单（插入 order 记录）
    │    └─ 若失败 → 事务回滚 → 优惠券状态回退
    │
    └─③ confirmUse(couponId, orderId) // 回填 orderId（已在锁定步骤完成状态变更）
```

```java
/**
 * 校验优惠券可用性并锁定。
 * 该方法在数据库层面做原子状态变更。
 */
@Transactional(propagation = Propagation.MANDATORY)
public CouponDeductionResult validateAndLock(Long userId, Long couponId,
                                             BigDecimal orderAmount) {
    UserCoupon coupon = userCouponRepo.findById(couponId)
        .orElseThrow(() -> new CouponNotFoundException("优惠券不存在"));

    // 校验归属
    if (!coupon.getUserId().equals(userId)) {
        throw new CouponNotApplicableException("优惠券不属于当前用户");
    }

    // 校验状态
    if (coupon.getStatus() != CouponStatus.UNUSED) {
        throw new CouponNotApplicableException("优惠券状态不可用: " + coupon.getStatus());
    }

    // 校验有效期
    LocalDateTime now = LocalDateTime.now();
    if (now.isBefore(coupon.getValidFrom()) || now.isAfter(coupon.getValidTo())) {
        throw new CouponExpiredException("优惠券不在有效期内");
    }

    // 计算优惠
    CouponDeductionResult result = deductionService.calculate(coupon, orderAmount);

    // 原子锁定（乐观锁）
    int rows = userCouponRepo.markAsUsed(
        coupon.getId(), userId, coupon.getVersion(), null);
    if (rows == 0) {
        throw new CouponConcurrentException("优惠券已被使用或发生并发冲突");
    }

    return result;
}

/**
 * 确认使用（订单创建成功后调用，回填 orderId）
 */
@Transactional(propagation = Propagation.MANDATORY)
public void confirmUse(Long couponId, Long orderId) {
    userCouponRepo.updateOrderId(couponId, orderId);
}

/**
 * 退券（订单退款时调用）
 */
@Transactional(rollbackFor = Exception.class)
public void refundByOrderId(Long orderId) {
    UserCoupon coupon = userCouponRepo.findByOrderId(orderId);
    if (coupon == null || coupon.getStatus() != CouponStatus.USED) {
        return;
    }
    int rows = userCouponRepo.updateStatus(
        coupon.getId(), CouponStatus.USED, CouponStatus.REFUNDED, coupon.getVersion());
    if (rows == 0) {
        throw new CouponConcurrentException("退券失败，优惠券状态已变更");
    }
    // 恢复活动库存
    activityRepo.incrementStock(coupon.getActivityId(), 1);
}
```

### 3.3 CouponActivityService（活动管理）

```java
@Service
public class CouponActivityService {

    /**
     * 创建优惠券活动
     */
    @Transactional
    public CouponActivity createActivity(CreateActivityRequest request) {
        validateRequest(request);
        CouponActivity activity = buildActivity(request);
        activityRepo.insert(activity);
        return activity;
    }

    private void validateRequest(CreateActivityRequest request) {
        if (request.getCouponType() == CouponType.FULL_REDUCTION) {
            Preconditions.checkNotNull(request.getDiscountAmount(), "满减券必须指定优惠金额");
            Preconditions.checkArgument(
                request.getDiscountAmount().compareTo(request.getMinOrderAmount()) < 0,
                "优惠金额必须小于最低消费金额");
        } else if (request.getCouponType() == CouponType.DISCOUNT) {
            Preconditions.checkNotNull(request.getDiscountRate(), "折扣券必须指定折扣率");
            Preconditions.checkArgument(
                request.getDiscountRate().compareTo(BigDecimal.ZERO) > 0
                    && request.getDiscountRate().compareTo(BigDecimal.ONE) < 0,
                "折扣率必须在 0 到 1 之间");
        }
        Preconditions.checkArgument(
            request.getEndTime().isAfter(request.getStartTime()),
            "结束时间必须晚于开始时间");
        Preconditions.checkArgument(request.getTotalStock() > 0, "发行总量必须大于0");
    }

    /**
     * 查询活动列表（分页，支持筛选）
     */
    public Page<CouponActivity> listActivities(String keyword, CouponType couponType,
                                                ActivityStatus status, int page, int size) {
        return activityRepo.findByConditions(keyword, couponType, status,
            PageRequest.of(page, size));
    }

    /**
     * 终止活动
     */
    @Transactional
    public void terminateActivity(Long activityId) {
        int rows = activityRepo.updateStatus(
            activityId, ActivityStatus.ACTIVE, ActivityStatus.TERMINATED);
        if (rows == 0) {
            throw new CouponNotApplicableException("只能终止进行中的活动");
        }
    }
}
```

---

## 4. 与已有模块的集成

### 4.1 OrderService 集成点

```
OrderService.createOrder(request)
    │
    ├─ 1. 如果 request.couponId != null:
    │      deduction = couponService.validateAndLock(userId, couponId, totalAmount)
    │      finalAmount = deduction.finalAmount
    │
    ├─ 2. order = buildOrder(request, finalAmount)
    │      orderRepo.save(order)
    │
    └─ 3. 如果 request.couponId != null:
           couponService.confirmUse(couponId, order.id)
```

### 4.2 退款流程集成

```
RefundService.processRefund(orderId)
    │
    ├─ 1. 处理退款业务逻辑
    │
    └─ 2. couponService.refundByOrderId(orderId)
           (在同一事务内)
```

### 4.3 促销叠加规则

预留接口，当前版本返回 false（禁止叠加）：

```java
public interface PromotionRuleEngine {
    /**
     * 判断优惠券是否可以与指定促销类型叠加使用
     */
    boolean canCombine(CouponType couponType, PromotionType promotionType);
}
```

---

## 5. 定时任务设计

### 5.1 过期券处理

```java
@Component
public class CouponExpireScheduler {

    private static final int BATCH_SIZE = 500;

    @Scheduled(cron = "0 0 2 * * ?")  // 每天凌晨2点
    public void expireUnusedCoupons() {
        log.info("过期券处理开始");
        int total = 0;
        List<Long> ids;
        do {
            ids = userCouponRepo.findExpiredUnusedIds(LocalDateTime.now(), BATCH_SIZE);
            if (!ids.isEmpty()) {
                total += userCouponRepo.batchMarkAsExpired(ids);
                log.debug("处理过期券批次: {} 条", ids.size());
            }
        } while (ids.size() == BATCH_SIZE);
        log.info("过期券处理结束，总计: {} 条", total);
    }
}
```

### 5.2 活动状态自动变更

```java
@Component
public class ActivityStatusScheduler {

    @Scheduled(cron = "0 */5 * * * ?")  // 每5分钟
    public void autoUpdateStatus() {
        int started = activityRepo.updateStatusIfTimeReached(
            ActivityStatus.NOT_STARTED, ActivityStatus.ACTIVE);
        if (started > 0) log.info("活动自动开始: {} 个", started);

        int ended = activityRepo.updateStatusIfTimeReached(
            ActivityStatus.ACTIVE, ActivityStatus.ENDED);
        if (ended > 0) log.info("活动自动结束: {} 个", ended);
    }
}
```

---

## 6. 异常处理策略

| 异常类型 | 继承 | HTTP | 业务码 | 说明 |
|----------|------|------|--------|------|
| CouponNotFoundException | RuntimeException | 404 | COUPON_NOT_FOUND | 优惠券/活动不存在 |
| CouponStockExhaustedException | RuntimeException | 409 | COUPON_STOCK_EXHAUSTED | 库存不足 |
| CouponExpiredException | RuntimeException | 400 | COUPON_EXPIRED | 已过期 |
| CouponNotApplicableException | RuntimeException | 400 | COUPON_NOT_APPLICABLE | 不满足使用条件 |
| CouponAlreadyUsedException | RuntimeException | 409 | COUPON_ALREADY_USED | 已使用 |
| CouponPerUserLimitException | RuntimeException | 409 | COUPON_LIMIT_EXCEEDED | 超过领取上限 |
| CouponConcurrentException | RuntimeException | 409 | COUPON_CONCURRENT | 并发冲突 |

全局异常处理器：

```java
@RestControllerAdvice(assignableTypes = {CouponAdminController.class, CouponUserController.class})
public class CouponExceptionHandler {

    @ExceptionHandler(CouponNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(CouponNotFoundException e) {
        return ResponseEntity.status(404)
            .body(ApiResponse.error("COUPON_NOT_FOUND", e.getMessage()));
    }

    @ExceptionHandler({CouponStockExhaustedException.class, CouponAlreadyUsedException.class,
                        CouponPerUserLimitException.class, CouponConcurrentException.class})
    public ResponseEntity<ApiResponse<Void>> handleConflict(RuntimeException e) {
        return ResponseEntity.status(409)
            .body(ApiResponse.error(extractCode(e), e.getMessage()));
    }

    @ExceptionHandler({CouponExpiredException.class, CouponNotApplicableException.class})
    public ResponseEntity<ApiResponse<Void>> handleBadRequest(RuntimeException e) {
        return ResponseEntity.status(400)
            .body(ApiResponse.error(extractCode(e), e.getMessage()));
    }
}
```

---

## 7. 测试策略

### 7.1 单元测试

- `CouponDeductionServiceTest`：覆盖满减正常、满减不足门槛、折扣正常、折扣边界、兜底保护、异常分支
- 枚举值映射测试
- DTO 转换测试

### 7.2 集成测试

- `CouponActivityRepoTest`：乐观锁扣减、条件查询
- `UserCouponRepoTest`：插入、状态更新、并发冲突
- `CouponServiceTest`（使用 H2/Testcontainers）：领券、使用、退券完整流程
- 事务回滚验证

### 7.3 并发测试

- 多线程库存扣减：验证乐观锁防超发
- 同一用户并发领取：验证唯一索引防超领
- 同一优惠券并发使用：验证乐观锁防重复使用

### 7.4 API 测试

- MockMvc 测试 Controller 层
- Postman / REST Client 手动验证
