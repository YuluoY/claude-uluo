# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-06-25

### Added

- 新增优惠券模块，支持满减券、折扣券、新人券三种类型创建（FR-1）
- 新增优惠券批量发放功能，支持按用户标签筛选目标用户（FR-2）
- 新增用户领券接口，支持 Redis 原子扣减库存防超发（FR-3）
- 新增优惠券核销功能，集成订单下单流程自动计算优惠（FR-4）
- 新增优惠券过期定时处理任务，每 5 分钟扫描失效券（FR-5）
- 新增优惠券记录查询接口，支持客服按用户 ID 查询领取与核销记录（FR-6）
- 新增优惠券库存对账任务，每小时校验 Redis 与 DB 库存一致性
- 新增优惠券相关错误码枚举（COUPON_OUT_OF_STOCK、COUPON_EXPIRED 等）

### Changed

- 修改 OrderService.createOrder() 方法，集成优惠券核销逻辑（同事务）
- 修改 OrderRefundService.refund() 方法，新增优惠券回退逻辑（未过期券回退为未使用）
- order 表新增 coupon_id、discount_amount 字段，支持订单关联优惠券

### Fixed

- 修复新人券并发领取导致一人多领问题（用户维度分布式锁 + 唯一索引兜底）
- 修复优惠券核销后退款未回退券状态问题（退款流程显式调用回退接口）

### Security

- 优惠券创建与发放接口新增 RBAC 鉴权，仅运营角色可操作
- 领券接口新增限流（单用户 10 次/分钟，单 IP 100 次/分钟）与设备指纹识别
