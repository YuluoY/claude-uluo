# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2026-06-08

### Added
- 新增优惠券模块（coupon/），支持满减券和折扣券两种类型 (#coupon-module)
- 管理员创建优惠券活动接口 POST /api/admin/coupons，支持设置有效期、最低消费金额、优惠金额或折扣率 (#coupon-module)
- 管理员分页查询优惠券活动接口 GET /api/admin/coupons，支持按状态筛选 (#coupon-module)
- 用户获取可用优惠券列表接口 GET /api/coupons/available，按订单金额自动过滤符合条件的券 (#coupon-module)
- 下单流程集成优惠券使用，自动校验、计算优惠后金额并扣减库存 (#coupon-module)
- 优惠券库存并发扣减使用 MySQL 乐观锁（version 字段）保证零超卖 (#coupon-module)
- 订单表新增优惠券快照字段（couponId/couponType/originalAmount/discountAmount/finalAmount），保证历史订单可追溯 (#coupon-module)

### Security
- 新增 /api/admin/coupons/** 路径管理员角色权限校验，防止普通用户越权操作 (#coupon-module)

### Changed
- OrderService.createOrder 方法织入优惠券处理逻辑，可选参数 couponId (#coupon-module)
- Order Entity 新增 5 个优惠券快照相关字段 (#coupon-module)
- SecurityConfig 新增 /api/admin/coupons/** 管理员角色权限配置 (#coupon-module)
