# Changelog

All notable changes to this project will be documented in this file.

## [1.0.1] - 2026-06-08

### Fixed
- 修复支付回调竞态条件导致用户余额重复扣减：在 PaymentService.processCallback() 中引入数据库唯一约束（uk_transaction_id）+ SELECT FOR UPDATE 行级锁，确保同一 transaction_id 仅处理一次 (#101)

## [1.0.0] - 2026-01-01

### Added
- 初始版本发布：支付模块核心功能 (#1)

### Changed
- N/A

### Security
- N/A
