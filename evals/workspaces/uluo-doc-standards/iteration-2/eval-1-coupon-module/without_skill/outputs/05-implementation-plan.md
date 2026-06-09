# 优惠券模块实施计划

## 1. 开发阶段总览

| 阶段 | 名称 | 预估工期 | 任务数 | 产出物 |
|------|------|----------|--------|--------|
| Phase 1 | 基础设施搭建 | 1 天 | 6 | 数据库表、实体类、Mapper、Repo |
| Phase 2 | 核心业务逻辑 | 2 天 | 6 | 四个 Service 类、优惠计算、并发控制 |
| Phase 3 | API 接口实现 | 1 天 | 4 | 管理端 4 接口 + 用户端 4 接口 |
| Phase 4 | 定时任务与集成 | 1 天 | 4 | 过期处理、状态变更、OrderService 集成 |
| Phase 5 | 测试 | 1.5 天 | 6 | 单元测试、集成测试、并发测试 |
| Phase 6 | 文档与上线 | 0.5 天 | 3 | API 文档、部署文档、代码评审 |
| **合计** | | **7 天** | **29** | |

---

## 2. Phase 1: 基础设施搭建（1 天）

### T1.1 数据库表创建

- 编写 Flyway 迁移脚本 `V2__create_coupon_tables.sql`
- 包含 `coupon_activity` 和 `user_coupon` 两张表的完整 DDL
- 在开发环境执行并通过验证

**验收**: `SHOW CREATE TABLE` 输出与设计文档一致，索引完整

### T1.2 领域实体类定义

文件清单：
- `CouponActivity.java` — 优惠券活动实体
- `UserCoupon.java` — 用户优惠券实体
- `CouponType.java` — 券类型枚举（FULL_REDUCTION, DISCOUNT）
- `ActivityStatus.java` — 活动状态枚举（NOT_STARTED, ACTIVE, ENDED, TERMINATED）
- `CouponStatus.java` — 用户券状态枚举（UNUSED, USED, EXPIRED, REFUNDED）
- `CouponDeductionResult.java` — 优惠计算结果值对象

**验收**: 编译通过，Lombok 注解正确（@Data, @Builder），枚举 displayName 包含中文

### T1.3 MyBatis Mapper XML 创建

文件清单：
- `CouponActivityMapper.xml` — 活动表 CRUD + 乐观锁扣减 + 状态变更 + 分页查询
- `UserCouponMapper.xml` — 用户券 CRUD + 乐观锁使用 + 批量过期 + 可用券查询

**关键 SQL**（必须实现）：
- `deductStock` — 带版本号、库存、状态、时间四重条件的 UPDATE
- `markAsUsed` — 带版本号的原子状态变更
- `findAvailableByUserId` — 按优惠力度排序的可用券查询

**验收**: SQL 在数据库客户端执行通过，EXPLAIN 确认走索引

### T1.4 Repository 接口实现

文件清单：
- `CouponActivityRepo.java` — 封装 CouponActivityMapper 调用
- `UserCouponRepo.java` — 封装 UserCouponMapper 调用

方法签名示例：
```java
public interface CouponActivityRepo {
    Optional<CouponActivity> findById(Long id);
    int deductStock(Long activityId, Integer version);
    int incrementStock(Long activityId, int count);
    int updateStatus(Long id, ActivityStatus current, ActivityStatus target);
    int updateStatusIfTimeReached(ActivityStatus current, ActivityStatus target);
    List<CouponActivity> findByConditions(String keyword, CouponType type,
                                           ActivityStatus status, int offset, int limit);
    long countByConditions(String keyword, CouponType type, ActivityStatus status);
    void insert(CouponActivity activity);
}
```

**验收**: Repo 方法单元测试通过

### T1.5 DTO 类定义

文件清单（`dto/request/`）：
- `CreateActivityRequest.java` — 含 @NotNull/@DecimalMin 等 JSR-303 校验注解
- `ClaimCouponRequest.java`
- `PreviewCouponRequest.java`

文件清单（`dto/response/`）：
- `ActivityDetailResponse.java`
- `ActivityListResponse.java`
- `UserCouponResponse.java`
- `AvailableCouponResponse.java`

**验收**: 编译通过，校验注解覆盖所有必填字段

### T1.6 异常类定义

文件清单（`exception/`）：
- `CouponNotFoundException.java` (extends RuntimeException)
- `CouponStockExhaustedException.java`
- `CouponExpiredException.java`
- `CouponNotApplicableException.java`
- `CouponAlreadyUsedException.java`
- `CouponPerUserLimitException.java`
- `CouponConcurrentException.java`
- `CouponExceptionHandler.java` — 全局异常处理器

每个异常类包含对应的业务码字段。

**验收**: 编译通过，异常处理器正确映射 HTTP 状态码

---

## 3. Phase 2: 核心业务逻辑（2 天）

### T2.1 CouponActivityService 实现

实现方法：
- `createActivity(CreateActivityRequest)` — 含业务规则校验（满减券 vs 折扣券的参数互斥、discountAmount < minOrderAmount 等）
- `listActivities(...)` — 分页 + 多条件筛选
- `getActivityDetail(Long)` — 含统计数据（领取量、使用量、领取率、核销率）
- `updateActivity(Long, UpdateActivityRequest)` — 仅限 NOT_STARTED 状态
- `terminateActivity(Long)` — 仅限 ACTIVE 状态

**验收**: 创建满减券和折扣券均通过校验；非法参数被拦截

### T2.2 CouponService 实现（领取 + 使用）

核心方法：
- `claimCoupon(Long userId, Long activityId)` — 完整领取流程
  - 校验活动状态（ACTIVE + 在有效期内）
  - 校验用户领取上限（COUNT < perUserLimit）
  - 乐观锁扣减库存（最多重试 3 次，间隔 50ms/100ms/150ms）
  - 事务内创建用户优惠券记录
- `validateAndLock(...)` — 下单时校验并锁定
- `confirmUse(...)` — 回填 orderId
- `refundByOrderId(...)` — 退券 + 恢复库存

**验收**:
- 正常领取流程通顺
- 库存耗尽后领取返回 409 错误
- 超过领取上限返回 409 错误

### T2.3 UserCouponService 实现

实现方法：
- `listMyCoupons(userId, status, page, size)` — 分页查询
- `getAvailableCoupons(userId, orderAmount)` — 按优惠力度排序
- `preview(couponId, userId, orderAmount)` — 试算（不锁定券）
- `getCouponDetail(couponId, userId)` — 券详情

**验收**: 可用券正确过滤过期/已使用/不满足门槛的券

### T2.4 CouponDeductionService 实现

实现方法：
- `calculate(UserCoupon, BigDecimal orderAmount)` — 核心计算逻辑
  - FULL_REDUCTION: finalAmount = orderAmount - discountAmount
  - DISCOUNT: finalAmount = orderAmount * discountRate (HALF_UP 舍入)
  - 兜底: finalAmount >= 0.01
  - 返回 CouponDeductionResult

**验收**: 覆盖以下用例

| 用例 | 预期结果 |
|------|----------|
| 满100减20, 订单150 | 实付130.00, 优惠20.00 |
| 满100减20, 订单80 | 抛 CouponNotApplicableException |
| 85折, 订单150 | 实付127.50, 优惠22.50 |
| 85折, 订单1.00 | 实付0.85, 优惠0.15 |
| 满10减25, 订单20 | 实付0.01（兜底）, 优惠19.99 |

### T2.5 乐观锁重试机制实现

在 `CouponService` 中封装 `deductStockWithRetry` 方法：
- 最多 3 次尝试
- 每次失败后重新查询最新 version
- 重试间隔递增（50ms -> 100ms -> 150ms）
- 仍失败则抛出 CouponConcurrentException

**验收**: 单元测试模拟 version 冲突，验证重试次数和最终结果

### T2.6 订单服务集成适配

修改 `OrderService.createOrder()`：
- 新增 couponId 参数处理
- 调用 couponService.validateAndLock 获取优惠结果
- 以 finalAmount 创建订单
- 成功后调用 couponService.confirmUse
- 失败时事务回滚自动回退券状态

**验收**: 带券下单流程通过集成测试

---

## 4. Phase 3: API 接口实现（1 天）

### T3.1 CouponAdminController 实现

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/admin/coupons/activities | 创建活动 |
| GET | /api/admin/coupons/activities | 活动列表（分页+筛选） |
| GET | /api/admin/coupons/activities/{id} | 活动详情+统计 |
| PUT | /api/admin/coupons/activities/{id} | 修改活动（限 NOT_STARTED） |
| PUT | /api/admin/coupons/activities/{id}/terminate | 终止活动 |

所有接口添加 `@PreAuthorize("hasRole('ADMIN')")` 权限控制。

**验收**: Postman/curl 测试所有接口

### T3.2 CouponUserController 实现

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/user/coupons/activities | 浏览可用活动 |
| POST | /api/user/coupons/claim | 领取优惠券 |
| GET | /api/user/coupons | 我的优惠券列表 |
| GET | /api/user/coupons/available?orderAmount= | 下单可用券 |
| POST | /api/user/coupons/preview | 试算优惠 |

userId 从 `SecurityContextHolder` 获取，不从请求参数获取。

**验收**: 领取成功后可在"我的优惠券"列表查到

### T3.3 参数校验完善

- 使用 `@Valid` + `@Validated` 注解
- 自定义校验器 `@ValidCouponRule` 用于满减/折扣参数互斥校验
- 校验失败返回统一格式错误信息

```java
@Constraint(validatedBy = CouponRuleValidator.class)
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidCouponRule {
    String message() default "优惠券规则不合法";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
```

### T3.4 API 文档生成

- 集成 SpringDoc OpenAPI (Swagger 3)
- 为每个接口添加 `@Operation` 和 `@Schema` 注解
- 确保 Swagger UI 可正确展示所有接口

**验收**: 访问 `/swagger-ui.html` 可查看完整 API 文档

---

## 5. Phase 4: 定时任务与集成（1 天）

### T5.1 过期券定时处理

实现 `CouponExpireScheduler`:
- `@Scheduled(cron = "0 0 2 * * ?")` 每天凌晨 2:00
- 分批查询过期未使用券（每次 500 条）
- 批量 UPDATE 标记为 EXPIRED
- 记录处理日志（总数 + 每批数量）

**验收**: 手动插入一条 valid_to 为过去的 UNUSED 记录，手动触发定时任务后验证其变为 EXPIRED

### T5.2 活动状态自动变更

实现 `ActivityStatusScheduler`:
- `@Scheduled(cron = "0 */5 * * * ?")` 每 5 分钟
- NOT_STARTED -> ACTIVE: start_time <= NOW() 且 status = NOT_STARTED
- ACTIVE -> ENDED: end_time <= NOW() 且 status = ACTIVE

**验收**: 设置 start_time 为当前时间 + 1 分钟，等待后验证自动变为 ACTIVE

### T5.3 OrderService 集成

在 `OrderService.createOrder()` 中：
1. 若 request 含 couponId，调用 `couponService.validateAndLock()` 锁定
2. 创建订单时保存 couponId 和 finalAmount
3. 订单创建成功后调用 `couponService.confirmUse()` 回填

**关键**: 使用 `@Transactional` 保证订单创建与券使用的原子性。

### T5.4 退款退券集成

在 `RefundService` 或 `OrderService.cancelOrder()` 中：
- 处理退款后调用 `couponService.refundByOrderId(orderId)`
- 退券在同一事务内，异常时回滚

**验收**: 集成测试：下单(使用券) -> 退款 -> 验证券状态变为 REFUNDED，库存恢复

---

## 6. Phase 5: 测试（1.5 天）

### T6.1 CouponDeductionService 单元测试

覆盖场景：
- 满减券正常计算
- 满减券不满足门槛抛异常
- 折扣券正常计算（含精度验证）
- 折扣券不满足门槛抛异常
- 满减兜底（订单金额极小时）
- null 参数异常

测试框架: JUnit 5 + AssertJ

### T6.2 Repository 乐观锁集成测试

使用 H2 内存数据库或 Testcontainers MySQL：
- 两个线程同时扣减库存，验证只有一次成功
- 库存为 0 时扣减失败
- 版本号不匹配时扣减失败

### T6.3 Service 层事务测试

- 领取优惠券完整流程（成功场景）
- 库存耗尽领取失败
- 超过限领次数领取失败
- 活动状态校验（未开始、已结束、已终止）
- 优惠券使用流程：锁定 -> 确认 -> 使用
- 优惠券使用冲突（同一券并发使用）

### T6.4 Controller 层接口测试

使用 MockMvc + Mockito：
- 管理端 CRUD 接口测试
- 用户端领取/查询/预览接口测试
- 参数校验错误响应格式验证
- 权限拦截验证

### T6.5 并发压力测试

工具: JMeter 或 Java 多线程测试：

**场景 1: 库存超发测试**
- 100 张库存，200 线程并发领取
- 验证：最终领取成功数 <= 100，remaining_stock >= 0

**场景 2: 用户限领测试**
- perUserLimit = 1，同一用户 50 线程并发领取
- 验证：该用户最终只获得 1 张券

**场景 3: 券使用并发测试**
- 同一张券，10 线程同时尝试使用
- 验证：最多 1 次成功

### T6.6 回归测试

- 确保现有功能不受影响
- 运行项目全部已有测试套件
- 订单创建流程（带券和不带券）均可正常执行

---

## 7. Phase 6: 文档与上线（0.5 天）

### T7.1 代码评审准备

- 确保代码符合团队编码规范（命名、注释、异常处理）
- 核心逻辑添加必要的行内注释
- 清理调试代码和 System.out.println
- Checkstyle / SonarLint 检查通过

### T7.2 部署准备

- Flyway 迁移脚本放入 `src/main/resources/db/migration/`
- 确保脚本命名符合 Flyway 规范（V2__xxx.sql）
- 确认回滚方案可执行

### T7.3 上线验证清单

- [ ] 管理端创建满减券活动成功
- [ ] 管理端创建折扣券活动成功
- [ ] 用户可浏览可用活动
- [ ] 用户领取优惠券成功
- [ ] 用户查看"我的优惠券"正确
- [ ] 结算页可用券列表正确（过滤+排序）
- [ ] 试算接口返回正确计算结果
- [ ] 下单使用满减券，实付金额正确
- [ ] 下单使用折扣券，实付金额正确
- [ ] 订单退款后券状态恢复为 REFUNDED
- [ ] 活动终止后不可再领取
- [ ] 过期券被定时任务正确标记

---

## 8. 完整文件清单

### 新增文件（共 35+ 个）

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
│   ├── request/
│   │   ├── CreateActivityRequest.java
│   │   ├── UpdateActivityRequest.java
│   │   ├── ClaimCouponRequest.java
│   │   └── PreviewCouponRequest.java
│   └── response/
│       ├── ActivityDetailResponse.java
│       ├── ActivityListResponse.java
│       ├── UserCouponResponse.java
│       ├── AvailableCouponResponse.java
│       └── PreviewResponse.java
├── exception/
│   ├── CouponNotFoundException.java
│   ├── CouponStockExhaustedException.java
│   ├── CouponExpiredException.java
│   ├── CouponNotApplicableException.java
│   ├── CouponAlreadyUsedException.java
│   ├── CouponPerUserLimitException.java
│   ├── CouponConcurrentException.java
│   └── CouponExceptionHandler.java
├── scheduler/
│   ├── CouponExpireScheduler.java
│   └── ActivityStatusScheduler.java
└── validation/
    ├── ValidCouponRule.java
    └── CouponRuleValidator.java

src/main/resources/
├── mapper/
│   ├── CouponActivityMapper.xml
│   └── UserCouponMapper.xml
└── db/migration/
    └── V2__create_coupon_tables.sql

src/test/java/com/shop/coupon/
├── service/
│   ├── CouponDeductionServiceTest.java
│   ├── CouponServiceTest.java
│   └── CouponActivityServiceTest.java
├── repository/
│   ├── CouponActivityRepoTest.java
│   └── UserCouponRepoTest.java
├── controller/
│   ├── CouponAdminControllerTest.java
│   └── CouponUserControllerTest.java
└── concurrency/
    ├── StockDeductionConcurrencyTest.java
    ├── UserClaimLimitConcurrencyTest.java
    └── CouponUsageConcurrencyTest.java
```

### 修改文件（3 个）

```
src/main/java/com/shop/service/OrderService.java
    - createOrder() 方法中集成优惠券校验和使用逻辑
    - cancelOrder()/refundOrder() 方法中集成退券逻辑

src/main/java/com/shop/domain/Order.java
    - 新增 couponId 字段（BIGINT, nullable）
    - 新增 discountAmount 字段（DECIMAL, 优惠金额快照）

src/main/java/com/shop/config/SecurityConfig.java
    - 新增 /api/admin/coupons/** 路径的 ADMIN 角色鉴权
    - 新增 /api/user/coupons/** 路径的 USER 角色鉴权
```

---

## 9. 里程碑与交付节点

| 里程碑 | 时间点 | 验收标准 |
|--------|--------|----------|
| M1: 基础设施就绪 | Day 1 结束 | DDL 执行成功，实体类编译通过，Mapper XML 在数据库客户端验证通过 |
| M2: 核心业务完成 | Day 3 结束 | 管理员可创建活动，用户可领取优惠券，优惠计算逻辑通过单元测试 |
| M3: 接口联调完成 | Day 4 结束 | 所有 REST 接口通过 Postman/curl 验证，Swagger 文档可访问 |
| M4: 集成完成 | Day 5 结束 | 下单流程可正常使用优惠券，退款可正常退券 |
| M5: 测试完成 | Day 6.5 结束 | 单元测试覆盖率 > 80%，并发测试全部通过 |
| M6: 上线 | Day 7 结束 | 代码评审通过，部署到预发布环境验证通过 |

---

## 10. 风险与应对措施

| 风险 | 概率 | 影响 | 应对措施 | 负责人 |
|------|------|------|----------|--------|
| 库存超发 | 中 | 高 | 乐观锁 + 数据库条件 UPDATE + Service 重试机制 | 后端 |
| 同一券重复使用 | 中 | 高 | 版本号 + status 双重条件 UPDATE | 后端 |
| 乐观锁重试导致长等待 | 低 | 中 | 最多重试 3 次，间隔递增；必要时引入 Redis 信号量 | 后端 |
| 优惠券与现有促销冲突 | 中 | 中 | 当前版本禁止叠加，预留 PromotionRuleEngine 扩展接口 | 产品+后端 |
| 大促高并发瓶颈 | 中 | 中 | 初期乐观锁 + 3 次重试足矣；后续引入 Redis 预扣库存方案 | 后端+运维 |
| user_coupon 表数据膨胀 | 低 | 低 | 索引覆盖核心查询，2000 万行后按 user_id 分表 | DBA |
| 定时任务漏执行 | 低 | 低 | 记录执行日志，监控任务执行时间；必要时增加手动补偿接口 | 后端 |
| 参数校验遗漏 | 低 | 中 | JSR-303 + 自定义校验器 + 业务层二次校验 | 后端+测试 |

---

## 11. 后续优化方向（Backlog）

1. **Redis 库存预扣**：将热点活动库存缓存至 Redis，实现库存预扣 + 异步同步，降低数据库压力，支撑大促高并发
2. **分布式锁方案**：对于极高并发场景，引入 Redis 分布式锁替代乐观锁重试，减少无效重试
3. **叠加规则引擎**：实现 `PromotionRuleEngine` 接口，支持优惠券与满减活动、秒杀等促销的复杂叠加规则
4. **定向发放**：支持按用户标签（新用户、VIP、高价值用户等）定向发放优惠券
5. **数据分析**：统计优惠券转化率、核销率、ROI 等指标，辅助运营决策
6. **防刷机制**：接入风控系统，基于用户行为识别异常领取（如短时间内大量领取）
7. **优惠券分享**：支持用户分享优惠券给好友（需增加 share_id 字段和流转记录）
8. **动态有效期**：支持"领取后 N 小时内有效"类型（目前仅支持固定时间段）
