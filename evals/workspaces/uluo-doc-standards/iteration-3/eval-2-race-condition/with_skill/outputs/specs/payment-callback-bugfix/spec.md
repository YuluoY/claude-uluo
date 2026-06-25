# 订单支付回调接口幂等性修复 需求规格说明

> 日期: 2026-06-25 | 作者: huyongle | 状态: 草稿

## 背景与动机

线上支付回调接口 `/api/v1/payment/callback` 在高峰期（QPS > 800）出现重复处理同一笔订单回调的现象。支付网关在 30 秒未收到 ACK 时会重试回调，叠加用户主动查询触发的补偿回调，导致同一订单在 200ms 窗口内被两个线程同时进入结算流程。由于回调处理逻辑缺乏幂等性校验和并发互斥机制，两个线程均通过了"未结算"状态检查，最终对商户发起两次结算打款。

最近 7 天监控数据显示：重复结算事件 17 起，涉及金额 ¥48,230，商户投诉 5 起，财务对账差异 3 起。问题已达到 P0 级别，必须在 2 天内修复上线。

### 根因分析

通过对 `PaymentCallbackService.handleCallback()` 方法的源码审查与线程栈 dump 分析，定位到三处缺陷：

1. **幂等性检查缺失**：回调入口仅校验签名和订单存在性，未基于 `payment_id + callback_id` 做去重。支付网关重试时 `callback_id` 不同但 `payment_id` 相同，被当作新请求处理。
2. **状态检查与状态变更非原子**：`if (order.status == PAID) return; order.setStatus(SETTLED);` 两步操作之间存在 TOCTOU（Time-of-Check to Time-of-Use）窗口，并发线程均读到 `PAID` 状态后各自推进到 `SETTLED`。
3. **结算流程无分布式锁**：结算打款操作 `SettlementService.settle(orderId)` 未对 `orderId` 加分布式锁，同一订单可被并发调用。

## 用户故事

| 编号 | 角色 | 故事 | 验收线索 |
|------|------|------|---------|
| US-1 | 商户 | 作为商户，我希望同一笔订单即使被支付网关多次回调也只结算一次，以便避免重复收款导致的对账纠纷 | FR-1, AC-1 |
| US-2 | 财务对账员 | 作为财务对账员，我希望系统能记录每次回调的处理结果，以便在出现对账差异时能追溯处理链路 | FR-3, AC-3 |
| US-3 | 运维工程师 | 作为运维工程师，我希望回调接口在并发场景下有可观测的锁竞争指标和告警，以便及时发现死锁或锁饥饿 | NFR-可维护性, AC-4 |
| US-4 | 风控审计员 | 作为风控审计员，我希望重复回调被明确拒绝并记录拒绝原因，以便审计幂等性机制是否生效 | FR-2, AC-2 |

### 目标

- 同一订单在任意并发场景下仅被结算一次（幂等性 100%）
- 回调接口 P99 延迟不超过 500ms（含锁等待）
- 重复回调被显式识别并记录，而非静默重复处理

### 非目标（明确不做的事）

- 不重构整个支付模块的架构（仅修复回调处理链路）
- 不引入消息队列做异步化改造（本次仅做同步链路的幂等修复）
- 不修改支付网关侧的重试策略（网关侧重试是正常容错机制）
- 不处理历史已重复结算的订单数据（由财务线下处理）

## 功能需求

### FR-1: 回调幂等性校验

- **描述**: 在回调处理入口基于 `payment_id` 做幂等校验，已处理过的回调直接返回成功响应，不重复执行结算
- **优先级**: P0
- **触发条件**: 收到支付网关回调请求，签名校验通过后
- **预期行为**: 查询 `payment_callback_record` 表，若该 `payment_id` 已存在 `PROCESSED` 状态记录，直接返回 `SUCCESS` 并跳过结算流程；否则继续处理
- **边界条件**: 若记录状态为 `PROCESSING` 且超过 30 秒未变更，视为前序处理超时，允许当前请求接管；若记录状态为 `FAILED`，允许重试

### FR-2: 分布式锁互斥

- **描述**: 对同一 `payment_id` 的回调处理加 Redis 分布式锁，确保同一时刻仅一个线程执行结算
- **优先级**: P0
- **触发条件**: 幂等校验通过后，进入结算流程前
- **预期行为**: 使用 `SET payment:lock:{payment_id} {thread_id} NX EX 10` 获取锁；获取失败则自旋等待最多 3 秒，仍失败则返回 `RETRY_LATER`；处理完成后释放锁
- **边界条件**: 锁持有进程崩溃时，TTL 到期自动释放；锁误释放通过 token（thread_id + uuid）校验防止

### FR-3: 回调处理记录表

- **描述**: 新增 `payment_callback_record` 表，记录每次回调的处理状态、处理线程、时间戳，作为幂等判断和审计依据
- **优先级**: P0
- **触发条件**: 每次收到回调请求时插入或更新记录
- **预期行为**: 字段包含 `payment_id`（唯一索引）、`callback_id`、`status`（PENDING/PROCESSING/PROCESSED/FAILED）、`process_thread`、`created_at`、`updated_at`；通过 `INSERT ... ON DUPLICATE KEY UPDATE` 保证并发写入安全
- **边界条件**: 表写入失败时回调整体失败，不允许进入结算流程（fail-safe）

## 非功能性需求

### 性能

- 回调接口 P99 延迟 ≤ 500ms（含 Redis 锁获取 + DB 记录写入）
- 幂等查询走唯一索引，单次 RT < 5ms
- Redis 锁获取超时时间 3 秒，避免线程长时间阻塞

### 安全

- 分布式锁 token 包含线程 ID + UUID，防止误释放其他线程的锁
- 回调记录表不存储敏感支付信息（卡号、CVV 等），仅存 `payment_id` 和处理状态
- 锁操作使用 Lua 脚本保证原子性

### 可维护性

- 锁竞争次数、平均等待时间通过 Micrometer 暴露为 Prometheus 指标
- 重复回调事件触发钉钉告警（阈值：单订单 5 分钟内重复回调 ≥ 3 次）
- 幂等命中率和锁等待时间接入 Grafana 看板

## 影响范围

| 模块 | 影响类型 | 说明 |
|------|---------|------|
| `payment/callback/PaymentCallbackService.java` | 修改 | 新增幂等校验和锁获取逻辑 |
| `payment/callback/PaymentCallbackController.java` | 修改 | 返回值新增 `RETRY_LATER` 状态码 |
| `payment/settlement/SettlementService.java` | 修改 | `settle()` 方法增加幂等断言 |
| `payment/domain/PaymentCallbackRecord.java` | 新增 | 回调记录实体 |
| `payment/repository/PaymentCallbackRecordRepository.java` | 新增 | 记录表 DAO |
| DB schema | 新增 | `payment_callback_record` 表 |
| `config/RedisConfig.java` | 修改 | 新增分布式锁 Bean 配置 |

## 依赖与前置条件

- Redis 集群可用（已有，订单服务依赖）
- MySQL 主库可执行 DDL（需 DBA 审批窗口）
- `SettlementService.settle()` 方法已有单元测试覆盖（回归基准）

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| Redis 锁服务不可用导致回调全部失败 | 低 | 高 | 锁获取失败时降级为 DB 行锁（`SELECT ... FOR UPDATE`），并触发告警 |
| `payment_callback_record` 表写入成为性能瓶颈 | 中 | 中 | 使用唯一索引 + `INSERT ON DUPLICATE KEY UPDATE`，单行写入 RT < 5ms；必要时分表 |
| 锁持有时间超过 TTL 导致并发执行 | 低 | 高 | 锁 TTL 设为 10 秒，结算流程正常 < 2 秒；增加看门狗续期机制（可选） |
| 历史脏数据导致幂等判断错误 | 低 | 中 | 上线前执行数据修复脚本，将已结算订单的回调记录补齐为 `PROCESSED` |

## 验收标准

- [ ] AC-1: 使用 JMeter 模拟 100 并发对同一 `payment_id` 发起回调，仅 1 次进入结算流程，其余 99 次返回 `SUCCESS` 且不重复打款
- [ ] AC-2: 重复回调在 `payment_callback_record` 表中可查到 `PROCESSED` 状态记录，拒绝日志包含 `payment_id` 和 `callback_id`
- [ ] AC-3: 回调处理记录表写入 `payment_id`、`callback_id`、`status`、`process_thread`、`created_at` 字段，可通过 `payment_id` 查询完整处理链路
- [ ] AC-4: Prometheus 指标 `payment_callback_lock_wait_seconds` 和 `payment_callback_idempotent_hit_total` 可在 Grafana 查询到数据
- [ ] AC-5: 回调接口 P99 延迟 ≤ 500ms（压测 800 QPS 持续 5 分钟）
- [ ] AC-6: 锁获取失败时返回 HTTP 429 + `RETRY_LATER`，支付网关可在 5 秒后重试成功

## 调研依据

### 技术可行性

| 调研项 | 结论 | 来源 | 可信度 |
|--------|------|------|--------|
| Redis SET NX EX 原子性 | `SET key value NX EX seconds` 是单条命令，原子性由 Redis 单线程保证 | Context7 Redis 命令文档 | 高 |
| Redis 分布式锁误释放问题 | 释放锁需校验 token，必须用 Lua 脚本保证"读取+比对+删除"原子性 | GitHub: redisson/redisson Wiki | 高 |
| MySQL INSERT ON DUPLICATE KEY UPDATE 并发安全 | 基于唯一索引的 upsert 是原子操作，并发写入不会产生重复行 | Stack Overflow: mysql-on-duplicate-key-update-concurrency | 中 |

### 业界方案参考

| 调研项 | 参考项目/文章 | 关键发现 |
|--------|-------------|---------|
| 支付回调幂等方案 | GitHub: apache/shardingsphere-elasticjob 幂等实现 | 使用 DB 唯一索引 + 状态机做幂等，锁仅做并发互斥 |
| 分布式锁实现选型 | GitHub: redisson/redisson | Redisson 的 RLock 内置看门狗续期，但引入重依赖；本次用 Spring Data Redis 手写轻量锁 |
| 支付宝回调幂等规范 | WebSearch: 支付宝开放平台异步回调文档 | 官方要求商户系统对同一 `notify_id` 做幂等，重试间隔 2m/10m/10m/1h/6h/15h |

### 性能/安全基准

| 调研项 | 业界基准 | 本项目目标 |
|--------|---------|-----------|
| 支付回调 P99 延迟 | 支付宝 < 200ms，微信 < 300ms（官方 SLA） | ≤ 500ms（含锁等待，留 2x 余量） |
| Redis 锁获取 RT | 单节点 < 1ms，集群 < 3ms（Redis 官方 benchmark） | < 5ms |
| 幂等查询 RT | MySQL 唯一索引查询 < 2ms | < 5ms |

### 已知风险/坑点

| 风险 | 来源 | 缓解措施 |
|------|------|---------|
| Redis 主从切换时锁可能丢失 | GitHub: redisson/redisson issue #2628 | 接受极低概率的锁丢失，叠加 DB 唯一索引兜底 |
| `INSERT ON DUPLICATE KEY UPDATE` 在高并发下可能死锁 | Stack Overflow: mysql-deadlock-on-duplicate-key | 使用 `INSERT IGNORE` + 二次查询的降级方案 |

## 参考资料

### 官方文档

- Redis SET 命令: https://redis.io/commands/set/
- Spring Data Redis 文档: https://docs.spring.io/spring-data/redis/reference/
- MySQL INSERT ... ON DUPLICATE KEY UPDATE: https://dev.mysql.com/doc/refman/8.0/en/insert-on-duplicate.html

### 开源项目参考

- Redisson 分布式锁实现: https://github.com/redisson/redisson/wiki/8.-distributed-locks-and-synchronizers
- Apache ShardingSphere 幂等设计: https://github.com/apache/shardingsphere

### 技术文章

- 支付宝异步回调幂等规范: https://opendocs.alipay.com/open/204/105301
- 微信支付回调重试机制: https://pay.weixin.qq.com/wiki/doc/api/jsapi.php?chapter=23_9

### 社区讨论

- Stack Overflow: Redis distributed lock release atomicity: https://stackoverflow.com/questions/36460688
- Stack Overflow: MySQL concurrent insert on duplicate key: https://stackoverflow.com/questions/2888456
