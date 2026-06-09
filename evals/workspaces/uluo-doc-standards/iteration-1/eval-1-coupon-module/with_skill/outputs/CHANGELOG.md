# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-06-08

### Added
- 新增优惠券模块（coupon/），支持满减券（FIXED）和折扣券（PERCENTAGE）两种类型
- 管理端 API：创建优惠券活动、分页查询活动列表、终止活动、向用户发放优惠券 (#coupon-admin)
- 用户端 API：查看可用优惠券列表 (#coupon-user)
- 优惠券计算策略（策略模式）：FixedAmountCalculator（固定金额减免）、PercentageCalculator（百分比折扣，支持优惠上限）
- 并发库存扣减：基于 MySQL SELECT FOR UPDATE 悲观锁 + @Transactional 事务，保证库存不超发 (#coupon-concurrency)
- 下单用券集成：OrderService.placeOrder() 支持传入 couponId 参数，自动校验和计算优惠
- 优惠券过期自动任务：@Scheduled 定时将已过期券活动标记为 ENDED，用户券标记为 EXPIRED
- 新增数据表：coupons（优惠券活动）、user_coupons（用户持有券）、order_coupons（订单用券记录）
- orders 表新增 coupon_id 字段（BIGINT NULL）
- 新增优惠券错误码：COUPON_NOT_FOUND, COUPON_EXPIRED, COUPON_MIN_AMOUNT_NOT_MET, COUPON_OUT_OF_STOCK, COUPON_ALREADY_USED, COUPON_NOT_OWNED

### Changed
- OrderService.placeOrder() 新增 couponId 参数（nullable），不影响无券下单的原有流程
- 折扣计算流程调整为：先满减活动优惠 → 再优惠券优惠 → 兜底 max(1, ...)

### Security
- 管理端优惠券 API（/api/admin/coupons/**）需管理员权限认证
- 用券校验确保用户只能使用自己持有的优惠券
