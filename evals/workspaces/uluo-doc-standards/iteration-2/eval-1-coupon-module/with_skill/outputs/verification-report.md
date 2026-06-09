# 优惠券模块 验收报告

> 日期: 2026-06-08 | 作者: huyongle | 关联: [spec.md](./spec.md)

## 验收概要

| 项目 | 结果 |
|------|------|
| 总验收项 | 9 |
| 通过 | 9 |
| 未通过 | 0 |
| 通过率 | 100% |
| 结论 | ✅ 通过 |

## 验收标准逐条对照

### 功能验收

- [x] **[AC-1]**: 管理员可成功创建满减券活动
  - **验证方式**: 手动测试
  - **验证结果**: POST /api/admin/coupons 传入满减券参数，返回 200 + 含 id 的活动对象，数据库 coupon_activity 表新增一条记录，coupon_type=FULL_REDUCTION，discount_amount=20.00
  - **证据**: 接口响应 status=200, data.id 非空；数据库确认记录存在且字段正确

- [x] **[AC-2]**: 管理员可成功创建折扣券活动
  - **验证方式**: 手动测试
  - **验证结果**: POST /api/admin/coupons 传入折扣券参数（discountRate=0.85），返回 200 + 折扣券活动对象，discount_rate=0.85
  - **证据**: 接口响应 discountRate=0.85；满减券 discountAmount 字段和折扣券 discountRate 字段互斥正确

- [x] **[AC-3]**: 用户查询可用优惠券时过滤条件正确
  - **验证方式**: 手动测试
  - **验证结果**: 创建过期券/无库存券/高门槛券后调用 GET /api/coupons/available?orderAmount=150，返回列表仅含满足全部条件的券（状态 ACTIVE、在有效期内、库存>0、minAmount<=150）
  - **证据**: 返回列表 2 条，均为在有效期内的有效券；过期券、无库存券不出现在列表

- [x] **[AC-4]**: 用户使用满减券下单正确
  - **验证方式**: 手动测试
  - **验证结果**: 订单金额 150 使用满 100 减 20 券，下单返回 Order 对象 finalAmount=130.00，coupon_type=FULL_REDUCTION，originalAmount=150.00，discountAmount=20.00；库存 remaining_stock 减 1
  - **证据**: 订单 couponId 正确关联，优惠券快照字段完整，库存从 1000 变为 999

- [x] **[AC-5]**: 用户使用折扣券下单精度正确
  - **验证方式**: 手动测试
  - **验证结果**: 订单金额 200 使用 8 折券，finalAmount=160.00，discountAmount=40.00，BigDecimal 精度保留两位未出现浮点误差
  - **证据**: 所有金额字段均为 BigDecimal，折扣计算使用 HALF_UP 舍入模式，结果 40.00 精确

- [x] **[AC-6]**: 并发库存扣减无超卖
  - **验证方式**: 集成测试
  - **验证结果**: CountDownLatch 启动 10 线程并发扣减库存为 3 的券，最终库存=0，仅 3 个线程返回成功，7 个线程返回 BusinessException("COUPON_OUT_OF_STOCK")，无超卖
  - **证据**: CouponDeductStockConcurrencyTest 测试通过；数据库最终 remaining_stock=0；乐观锁 version 字段正常递增

- [x] **[AC-7]**: 不满足最低消费时返回明确错误
  - **验证方式**: 手动测试
  - **验证结果**: 订单金额 50 使用满 100 减 20 券，返回 400，错误码 COUPON_MIN_AMOUNT，错误消息"未达到优惠券使用门槛，需满 100.00 元"
  - **证据**: 响应体 code=400, errorCode="COUPON_MIN_AMOUNT"，消息正确包含最低消费金额

- [x] **[AC-8]**: 库存为 0 时返回 409
  - **验证方式**: 手动测试
  - **验证结果**: 将某券 remaining_stock 手动置为 0 后下单，返回 409，错误码 COUPON_OUT_OF_STOCK，错误消息"优惠券已抢光"
  - **证据**: 响应状态码 409，错误描述清晰，库存确实为 0 未变

- [x] **[AC-9]**: 管理员接口权限校验
  - **验证方式**: 手动测试
  - **验证结果**: 普通用户 token 调用 POST /api/admin/coupons 返回 403；管理员 token 调用返回 200
  - **证据**: 普通用户请求被 SecurityConfig 拦截返回 403 FORBIDDEN

### 非功能性验收

- [x] **性能**: 可用优惠券查询 P99 < 100ms，下单使用优惠券 P99 < 200ms
  - **实际数据**: 可用券查询 P99 约 35ms（索引生效）；下单使用优惠券 P99 约 80ms（无乐观锁冲突时），含 1 次重试约 120ms
  - **对比基线**: N/A（新模块无基线）

- [x] **安全**: 优惠券库存操作含审计日志
  - **验证方式**: 代码审查
  - **结论**: CouponServiceImpl.deductStock 方法入口打 INFO 日志含 userId、couponId、扣减前库存、扣减后库存；版本号变更也记录在日志中

## 测试结果汇总

| 测试层级 | 总数 | 通过 | 失败 | 跳过 | 覆盖率 |
|---------|------|------|------|------|--------|
| 单元测试 | 22 | 22 | 0 | 0 | 87% |
| 集成测试 | 8 | 8 | 0 | 0 | 75% |
| E2E 测试 | 0 | 0 | 0 | 0 | N/A |

## 变更范围审查

### 文件变更统计

- 新增文件: 16 个
  - `coupon/controller/CouponController.java`
  - `coupon/service/CouponService.java`
  - `coupon/service/CouponServiceImpl.java`
  - `coupon/repository/CouponRepo.java`
  - `resources/mapper/CouponRepo.xml`
  - `coupon/domain/CouponActivity.java`
  - `coupon/domain/CouponType.java`
  - `coupon/domain/CouponStatus.java`
  - `coupon/strategy/CouponStrategy.java`
  - `coupon/strategy/CouponStrategyFactory.java`
  - `coupon/strategy/FullReductionStrategy.java`
  - `coupon/strategy/DiscountStrategy.java`
  - `coupon/dto/CreateCouponRequest.java`
  - `coupon/dto/CouponPageRequest.java`
  - `resources/db/migration/V2__create_coupon_activity.sql`
  - `resources/db/migration/V3__alter_order_add_coupon.sql`
- 修改文件: 3 个
  - `domain/Order.java`（新增 5 个优惠券快照字段）
  - `service/OrderServiceImpl.java`（createOrder 方法织入优惠券处理）
  - `config/SecurityConfig.java`（新增优惠券管理员路径权限）
- 删除文件: 0 个
- 总代码行数: +850 -0

### 是否有计划外的变更

- [x] 没有

## 已知问题 / 技术债

| 问题 | 严重程度 | 影响 | 计划处理 |
|------|---------|------|---------|
| 乐观锁重试 3 次后失败直接抛异常，用户需重试下单 | 低 | 用户看到"优惠券已抢光"提示后需手动重试 | 下个版本增加前端自动重试引导 |
| 缺少优惠券过期自动状态更新定时任务 | 低 | 过期券仍显示 ACTIVE 直到被 selectAvailable 过滤 | 下个版本新增定时任务 updateExpiredCoupons |
| 暂无优惠券使用统计报表 | 低 | 运营无法直接查看优惠券使用数据 | 记录 back log，后续版本考虑 |

## 结论

- [x] ✅ 通过: 所有验收标准已满足，可以上线

所有 9 条验收标准全部通过，单元测试覆盖率 87%，集成测试覆盖率 75%。乐观锁方案在并发测试中表现正确，零超卖。代码遵循项目现有架构风格，策略模式为新券种扩展预留了空间。已知的 3 项技术债务均明确处理计划。
