# 优惠券模块实施计划

## 1. 开发任务拆解

### Phase 1: 基础设施 (预计 1 天)

| 任务ID | 任务 | 产出 | 优先级 |
|--------|------|------|--------|
| T1.1 | 创建数据库表 DDL 并执行 | coupon_activity, user_coupon 表 | P0 |
| T1.2 | 定义领域实体类 | CouponActivity, UserCoupon, 枚举类 | P0 |
| T1.3 | 创建 MyBatis Mapper XML | CouponActivityMapper.xml, UserCouponMapper.xml | P0 |
| T1.4 | 创建 Repository 接口 | CouponActivityRepo, UserCouponRepo | P0 |
| T1.5 | 定义 DTO 请求/响应类 | CreateActivityRequest 等 | P0 |
| T1.6 | 定义异常类 | CouponNotFoundException 等 7 个异常 | P0 |

### Phase 2: 核心业务逻辑 (预计 2 天)

| 任务ID | 任务 | 产出 | 优先级 |
|--------|------|------|--------|
| T2.1 | 实现 CouponActivityService | 创建活动、查询列表、查询详情、终止活动 | P0 |
| T2.2 | 实现 CouponService | 领取优惠券（含库存扣减+限领控制） | P0 |
| T2.3 | 实现 UserCouponService | 查询我的优惠券、查询可用券、预览优惠 | P0 |
| T2.4 | 实现 CouponDeductionService | 满减/折扣计算逻辑 | P0 |
| T2.5 | 实现优惠券使用流程 | 锁定、确认使用、释放、退券 | P0 |
| T2.6 | 在 OrderService 中集成优惠券 | 修改 createOrder 流程 | P1 |

### Phase 3: 管理端接口 (预计 0.5 天)

| 任务ID | 任务 | 产出 | 优先级 |
|--------|------|------|--------|
| T3.1 | 实现 CouponAdminController | 管理端 4 个 REST 接口 | P0 |
| T3.2 | 添加参数校验注解 | @Valid, 自定义校验器 | P0 |

### Phase 4: 用户端接口 (预计 0.5 天)

| 任务ID | 任务 | 产出 | 优先级 |
|--------|------|------|--------|
| T4.1 | 实现 CouponUserController | 用户端 4 个 REST 接口 | P0 |

### Phase 5: 定时任务与集成 (预计 0.5 天)

| 任务ID | 任务 | 产出 | 优先级 |
|--------|------|------|--------|
| T5.1 | 实现 CouponExpireScheduler | 过期优惠券定时处理 | P1 |
| T5.2 | 活动状态自动变更定时任务 | NOT_STARTED -> ACTIVE, ACTIVE -> ENDED | P1 |
| T5.3 | 与现有 promotion 模块协调说明 | 文档/PromotionRuleEngine 接口 | P2 |

### Phase 6: 测试 (预计 1.5 天)

| 任务ID | 任务 | 产出 | 优先级 |
|--------|------|------|--------|
| T6.1 | CouponDeductionService 单元测试 | 覆盖满减/折扣/边界 | P0 |
| T6.2 | Repository 乐观锁集成测试 | 库存扣减并发测试 | P0 |
| T6.3 | Service 层事务测试 | 领取流程、使用流程 | P0 |
| T6.4 | Controller 层接口测试 | MockMvc 测试 | P1 |
| T6.5 | 并发场景压力测试 | JMeter/多线程测试 | P1 |

## 2. 关键实现细节

### 2.1 库存扣减（带重试）

```java
@Service
public class CouponService {

    private static final int MAX_RETRY = 3;
    private static final long RETRY_BASE_DELAY_MS = 50;

    @Transactional(rollbackFor = Exception.class)
    public UserCouponDTO claimCoupon(Long userId, Long activityId) {
        // Step 1: 查询活动，校验状态
        CouponActivity activity = activityRepo.findById(activityId)
            .orElseThrow(() -> new CouponNotFoundException("活动不存在"));

        if (activity.getStatus() != ActivityStatus.ACTIVE) {
            throw new CouponNotApplicableException("活动不可用，当前状态：" + activity.getStatus());
        }

        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(activity.getStartTime()) || now.isAfter(activity.getEndTime())) {
            throw new CouponNotApplicableException("活动不在有效期内");
        }

        // Step 2: 校验用户限领
        int claimedCount = userCouponRepo.countByUserAndActivity(userId, activityId);
        if (claimedCount >= activity.getPerUserLimit()) {
            throw new CouponPerUserLimitException("已达领取上限：" + activity.getPerUserLimit());
        }

        // Step 3: 乐观锁扣减库存（带重试）
        boolean deducted = deductStockWithRetry(activity);

        if (!deducted) {
            throw new CouponStockExhaustedException("库存不足或并发冲突");
        }

        // Step 4: 创建用户优惠券记录
        UserCoupon userCoupon = buildUserCoupon(userId, activity, claimedCount + 1);
        userCouponRepo.save(userCoupon);

        return UserCouponDTO.from(userCoupon);
    }

    private boolean deductStockWithRetry(CouponActivity activity) {
        for (int i = 0; i < MAX_RETRY; i++) {
            int rows = activityRepo.deductStock(activity.getId(), activity.getVersion());
            if (rows > 0) {
                return true;
            }
            // 重新查询最新版本号
            activity = activityRepo.findById(activity.getId()).orElse(null);
            if (activity == null || activity.getRemainingStock() <= 0) {
                return false;
            }
            if (i < MAX_RETRY - 1) {
                try {
                    Thread.sleep(RETRY_BASE_DELAY_MS * (i + 1));
                } catch (InterruptedException ignored) {
                    Thread.currentThread().interrupt();
                    return false;
                }
            }
        }
        return false;
    }
}
```

### 2.2 优惠券使用（乐观锁 + 事务协调）

```java
/**
 * 在 OrderService 中使用优惠券的完整流程
 */
@Transactional(rollbackFor = Exception.class)
public Order createOrder(CreateOrderRequest request) {
    // ... 业务校验 ...

    BigDecimal finalAmount = request.getTotalAmount();
    Long couponId = request.getCouponId();
    CouponDeductionResult deduction = null;

    if (couponId != null) {
        deduction = couponService.validateAndLock(
            request.getUserId(), couponId, request.getTotalAmount());
        finalAmount = deduction.getFinalAmount();
    }

    // 创建订单
    Order order = buildOrder(request, finalAmount);
    orderRepo.save(order);

    // 确认优惠券使用
    if (couponId != null) {
        couponService.confirmUse(couponId, order.getId());
    }

    return order;
}
```

### 2.3 定时任务配置

```java
@Component
@EnableScheduling
public class CouponExpireScheduler {

    private static final int BATCH_SIZE = 500;

    @Scheduled(cron = "0 0 2 * * ?")
    public void expireUserCoupons() {
        log.info("开始执行优惠券过期处理");

        List<Long> expiredIds;
        int totalProcessed = 0;
        do {
            expiredIds = userCouponRepo.findExpiredUnusedIds(
                LocalDateTime.now(), BATCH_SIZE);
            if (!expiredIds.isEmpty()) {
                int rows = userCouponRepo.batchMarkAsExpired(expiredIds);
                totalProcessed += rows;
                log.info("处理过期优惠券批次: {} 条", rows);
            }
        } while (expiredIds.size() == BATCH_SIZE);

        log.info("优惠券过期处理完成，总计: {} 条", totalProcessed);
    }

    @Scheduled(cron = "0 */5 * * * ?")
    public void updateActivityStatus() {
        // NOT_STARTED -> ACTIVE
        int started = activityRepo.updateStatusIfReachedStartTime(
            ActivityStatus.NOT_STARTED, ActivityStatus.ACTIVE);
        if (started > 0) log.info("活动自动开始: {} 个", started);

        // ACTIVE -> ENDED
        int ended = activityRepo.updateStatusIfPassedEndTime(
            ActivityStatus.ACTIVE, ActivityStatus.ENDED);
        if (ended > 0) log.info("活动自动结束: {} 个", ended);
    }
}
```

## 3. 文件清单

实施完成后新增/修改的文件：

### 新增文件

```
src/main/java/com/shop/coupon/
├── controller/
│   ├── CouponAdminController.java
│   └── CouponUserController.java
├── service/
│   ├── CouponActivityService.java
│   ├── CouponService.java
│   ├── UserCouponService.java
│   └── CouponDeductionService.java
├── repository/
│   ├── CouponActivityRepo.java
│   └── UserCouponRepo.java
├── domain/
│   ├── CouponActivity.java
│   ├── UserCoupon.java
│   ├── CouponType.java
│   ├── CouponStatus.java
│   ├── ActivityStatus.java
│   └── CouponDeductionResult.java
├── dto/
│   ├── CreateActivityRequest.java
│   ├── ApplyCouponRequest.java
│   ├── ApplyCouponResponse.java
│   └── UserCouponDTO.java
├── exception/
│   ├── CouponNotFoundException.java
│   ├── CouponStockExhaustedException.java
│   ├── CouponExpiredException.java
│   ├── CouponNotApplicableException.java
│   ├── CouponAlreadyUsedException.java
│   ├── CouponPerUserLimitException.java
│   └── CouponConcurrentException.java
└── scheduler/
    └── CouponExpireScheduler.java

src/main/resources/mapper/
├── CouponActivityMapper.xml
└── UserCouponMapper.xml

src/main/resources/db/migration/
└── V2__create_coupon_tables.sql
```

### 修改文件

```
src/main/java/com/shop/service/OrderService.java
    - createOrder() 方法中集成优惠券校验和使用逻辑

src/main/java/com/shop/domain/Order.java
    - 新增 couponId 字段（可为 null）

src/main/java/com/shop/common/ApiResponse.java
    - 无需修改，复用现有通用响应类
```

## 4. 实施里程碑

| 里程碑 | 预计完成 | 验收标准 |
|--------|----------|----------|
| M1: 基础设施完成 | Day 1 | DDL 建表成功，实体类和 Mapper 通过编译 |
| M2: 核心业务完成 | Day 3 | 管理员可创建活动，用户可领取优惠券 |
| M3: 接口联调完成 | Day 4 | 所有 REST 接口通过 Postman 验证 |
| M4: 集成完成 | Day 5 | 下单流程可正常使用优惠券计算优惠 |
| M5: 测试完成 | Day 6.5 | 单元测试覆盖率 > 80%，并发测试通过 |
| M6: 上线 | Day 7 | 代码评审通过，部署到测试环境验证 |

## 5. 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 库存超发 | 高 | 乐观锁 + 数据库条件 UPDATE + 重试机制 |
| 同一券重复使用 | 高 | 版本号乐观锁，status + version 双重校验 |
| 优惠券与现有促销冲突 | 中 | 初期禁止叠加，预留 PromotionRuleEngine 扩展 |
| 用户大量领取后不使用 | 中 | perUserLimit 控制，后续可增加领取后N小时未使用自动退回 |
| 大促期间高并发 | 中 | 乐观锁重试，必要时引入 Redis 预扣库存 |
| user_coupon 表数据增长 | 低 | 单表 2000 万行前无需分表，后续按 user_id 分表 |

## 6. 后续优化方向

1. **Redis 库存预扣**：将热点活动的库存缓存到 Redis，减少数据库压力，定期同步
2. **优惠券分发策略**：支持定向发放（指定用户群体）、主动推送
3. **叠加规则引擎**：实现复杂的优惠券与促销叠加计算规则
4. **优惠券使用分析**：统计转化率、核销率等数据指标
5. **防刷机制**：接入风控系统，识别异常领取行为
