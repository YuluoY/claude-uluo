# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2026-06-25

### Fixed

- 修复支付回调接口在高并发下重复处理同一笔订单导致商户重复结算的问题（根因：回调处理链路缺乏幂等性校验和分布式锁互斥，TOCTOU 竞态导致两个线程同时通过"未结算"状态检查）(#PMT-1024)
- 修复 `SettlementService.settle()` 方法未对已结算订单做幂等断言导致可被重复调用打款的问题(#PMT-1024)

### Changed

- `PaymentCallbackService.handleCallback()` 入口新增基于 `payment_id` 的幂等校验，已处理回调直接返回 `SUCCESS` 不再进入结算流程(#PMT-1024)
- 回调处理流程在结算前新增 Redis 分布式锁（`SET payment:lock:{payment_id} NX EX 10`），同一订单同一时刻仅允许单线程处理(#PMT-1024)
- 回调接口新增 `RETRY_LATER` (HTTP 429) 响应状态码，用于锁获取失败时通知支付网关稍后重试(#PMT-1024)

### Security

- 新增 `payment_callback_record` 表记录每次回调的处理状态和线程标识，为幂等判断和风控审计提供数据支撑(#PMT-1024)
- 分布式锁释放采用 Lua 脚本校验 token 后删除，防止误释放其他线程持有的锁(#PMT-1024)

## [1.1.0] - 2026-05-15

### Added

- 新增订单导出 CSV 功能 (#456)

### Changed

- 将默认分页大小从 10 改为 20 (#458)
