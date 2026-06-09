# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-06-08

### Fixed
- 修复支付回调高并发下的竞态条件——同一支付通知被重复处理导致用户余额重复扣减。通过三层防护解决：`SELECT ... FOR UPDATE` 行级悲观锁 + 支付交易号幂等检查 + `payment_records.transaction_id` 唯一约束 (#payment-callback-fix)
