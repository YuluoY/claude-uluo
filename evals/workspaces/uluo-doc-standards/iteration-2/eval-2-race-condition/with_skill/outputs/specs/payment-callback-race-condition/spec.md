# 支付回调重复处理竞态条件修复 需求规格说明

> 日期: 2026-06-08 | 作者: AI | 状态: 已确认

## 背景与动机

当前支付回调接口 `PaymentController.receiveCallback()` 在高并发场景下存在竞态条件：同一个支付平台的回调通知（相同 transaction_id）被 `PaymentService.processCallback()` 重复处理两次，导致用户余额被重复扣减。根因是回调处理流程缺少幂等性保护——两个并发请求同时通过"是否已处理"检查后各自执行扣款操作。该问题在支付高峰期（如促销活动）触发概率显著升高，直接影响资金安全。

## 用户故事

| 编号 | 角色 | 故事 | 验收线索 |
|------|------|------|---------|
| US-1 | 普通用户 | 作为普通用户，我希望同一笔支付只被扣款一次，以便我的账户余额准确无误 | FR-1, AC-1 |
| US-2 | 运维人员 | 作为运维人员，我希望系统能够自动拦截重复的回调通知，以便在支付平台重试或重复推送时不会造成资金损失 | FR-2, AC-2 |
| US-3 | 财务审计员 | 作为财务审计员，我希望每笔支付都有唯一的回调处理记录，以便对账时能够追踪每一笔资金的变动来源 | FR-3, AC-3 |
| US-4 | 外部支付平台 | 作为外部支付平台调用方，我希望回调接口支持幂等重试，以便在网络超时等场景下安全重发通知 | FR-1, AC-1 |

### 目标
- 消除支付回调重复处理的竞态条件，确保同一 transaction_id 只被处理一次
- 实现幂等性保护，使其在数据库层面有强一致性保证
- 保证修复后对现有支付流程的吞吐量影响小于 5%

### 非目标（明确不做的事）
- 不引入 Redis 等新的中间件依赖（纯数据库方案）
- 不修改支付平台回调接口的外部契约
- 不处理历史已重复扣款的数据修复（由单独的修复脚本处理）
- 不改变回调接口的响应格式

## 功能需求

### FR-1: 回调幂等性保护
- **描述**: 在 `PaymentService.processCallback()` 中增加幂等性校验，基于 transaction_id 确保同一笔支付通知只被处理一次
- **优先级**: P0
- **触发条件**: 收到支付平台回调通知时
- **预期行为**:
  1. 在处理回调前，先尝试插入回调处理记录（利用唯一约束防重）
  2. 若插入成功（首次处理），继续执行余额扣减
  3. 若插入失败（重复通知），捕获 DuplicateKeyException 转为幂等返回，不执行任何扣款
- **边界条件**:
  - 并发请求同时到达时，数据库唯一约束保证只有一个请求成功插入处理记录
  - 扣款失败时，处理记录需跟随事务回滚，允许后续重试
  - transaction_id 为空或 null 时，拒绝处理并记录告警日志

### FR-2: 数据库唯一约束
- **描述**: 在支付回调处理记录表 `payment_callback_log` 上增加 transaction_id 唯一索引
- **优先级**: P0
- **触发条件**: 数据库迁移脚本执行时
- **预期行为**:
  1. 新增唯一索引 `uk_transaction_id` 到 `payment_callback_log.transaction_id` 列
  2. 插入重复 transaction_id 时数据库抛出 `DuplicateKeyException`
  3. 应用层在 Service 层捕获该异常并转换为幂等返回
- **边界条件**:
  - 历史数据中若存在重复 transaction_id，迁移前需执行去重脚本保留最早记录
  - 若 transaction_id 字段允许 NULL，MySQL 唯一索引对 NULL 值不做唯一约束，需在应用层额外拒收 null 值

### FR-3: 处理记录与扣款事务合并
- **描述**: 将处理记录插入和余额扣减放入同一个数据库事务，利用 `SELECT ... FOR UPDATE` 锁定用户余额行
- **优先级**: P0
- **触发条件**: 确认回调为首次处理后执行扣款时
- **预期行为**:
  1. 开启事务 → 插入处理记录 → SELECT ... FOR UPDATE 锁定余额行 → 更新余额 → 提交事务
  2. 若余额不足，回滚事务（包括处理记录），返回扣款失败并允许后续重试
  3. 事务隔离级别为 READ_COMMITTED
- **边界条件**:
  - `SELECT ... FOR UPDATE` 等待锁超时时返回错误，不无限阻塞
  - 事务中任何一步失败都整体回滚

## 非功能性需求

### 性能
- 修复后回调处理 P99 延迟不超过 500ms（当前基线约 200ms）
- 支持 QPS 不低于 100（单实例）
- 数据库唯一索引对写入性能的影响可忽略（B+Tree 索引开销约 5%）

### 安全
- 余额扣减必须与处理记录在同一事务中，防止"记录成功但扣款失败"或"扣款成功但未记录"的不一致状态
- transaction_id 需做长度校验，防止超长字符串导致索引失效

### 可维护性
- 捕获 `DuplicateKeyException` 时记录 INFO 级别日志（含 transaction_id），方便排查重试来源
- 回调处理增加耗时监控（Metrics），区分"新处理"和"幂等返回"两种情况的耗时和比例

## 影响范围

| 模块 | 影响类型 | 说明 |
|------|---------|------|
| PaymentController | 修改 | receiveCallback() 增加幂等返回的日志输出 |
| PaymentService | 修改 | processCallback() 核心逻辑重构：幂等检查 + 事务合并 |
| PaymentCallbackLogMapper | 新增 | 回调处理记录表的 MyBatis Mapper 接口 |
| payment_callback_log 表 | 修改 | 增加 uk_transaction_id 唯一索引 |
| UserBalanceMapper | 修改 | 增加 selectForUpdate 方法 |

## 依赖与前置条件

- 依赖 payment_callback_log 表已存在（若不存在需新建）
- 依赖 Spring 事务管理（@Transactional）正常工作
- 依赖 MyBatis 的 @Insert 注解或 XML 映射
- 依赖数据库为 MySQL 5.7+ 或同等支持行级锁和唯一索引的 RDBMS

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 历史数据中存在重复 transaction_id 导致建唯一索引失败 | 中 | 高 | 迁移前执行去重脚本，保留最早记录 |
| 唯一索引导致正常重试也被拦截 | 低 | 低 | 幂等返回的是上次处理结果，合法重试得到一致结果 |
| SELECT FOR UPDATE 死锁 | 低 | 中 | 统一加锁顺序：先插入处理记录再锁定余额行，避免循环等待 |
| 数据库主从延迟导致读旧数据 | 低 | 中 | 回调处理强制走主库读取 |

## 验收标准

- [ ] 并发发送 10 个相同 transaction_id 的回调请求，用户余额只被扣减一次，且最终余额正确
- [ ] 发送已处理过的 transaction_id 的回调请求，返回幂等结果且不触发任何扣款操作
- [ ] transaction_id 为 null 或空字符串时，接口返回明确错误且不执行任何持久化操作
- [ ] 扣款过程中模拟数据库异常（如余额不足），处理记录跟随事务回滚，事务完整性验证通过
- [ ] 新增唯一索引后，重复插入 transaction_id 触发 DuplicateKeyException，应用层正确捕获并返回幂等结果
- [ ] 回调处理 P99 延迟不超过 500ms，QPS 不低于 100（单实例压测）

## 调研依据

### 技术可行性

| 调研项 | 结论 | 来源 | 可信度 |
|--------|------|------|--------|
| MySQL 唯一索引处理并发插入 | INSERT 失败的一方会收到 DuplicateKeyException，可安全用于幂等保护 | Context7 / MySQL 官方文档 | 高 |
| Spring @Transactional 与 MyBatis 事务整合 | MyBatis 自动参与 Spring 管理的事务，无需额外配置 | Context7 / Spring 官方文档 | 高 |
| SELECT ... FOR UPDATE 行级锁 | 锁定查询返回的行，其他事务的 FOR UPDATE 会等待，适用于余额扣减场景 | Context7 / MySQL 官方文档 | 高 |
| MyBatis 异常处理机制 | Spring 将 SQLException 包装为 DuplicateKeyException，可直接 catch | Context7 / Spring 官方文档 | 高 |

### 业界方案参考

| 调研项 | 参考项目/文章 | 关键发现 |
|--------|-------------|---------|
| 支付回调幂等处理 | 美团支付系统技术博客 | 业界普遍采用"数据库唯一约束 + 应用层幂等返回"方案 |
| 分布式锁 vs 数据库唯一索引 | Uber payments idempotency design | 数据库唯一索引是最简单的强一致性方案，无额外基础设施依赖 |
| MyBatis 行锁使用 | MyBatis 官方文档 | 使用 @Select 注解配合 FOR UPDATE 即可实现行级锁 |

### 性能/安全基准

| 调研项 | 业界基准 | 本项目目标 |
|--------|---------|-----------|
| 支付回调 P99 延迟 | 500ms（行业标准） | ≤ 500ms |
| 唯一索引写入开销 | +5-10% | ≤ 5% |
| 幂等检查 QPS | 1000+（MySQL 单表） | ≥ 100 |

### 已知风险/坑点

| 风险 | 来源 | 缓解措施 |
|------|------|---------|
| MySQL 唯一索引对 NULL 值的处理：多个 NULL 不冲突 | MySQL 官方文档 | 应用层在 transaction_id 为 null 时提前拒绝 |
| FOR UPDATE 在事务外无效 | MySQL 官方文档 | 确保在 @Transactional 方法内调用 |
| MyBatis 的 DuplicateKeyException 在不同数据库驱动中异常类型不同 | GitHub Issues / Stack Overflow | 统一 catch DataIntegrityViolationException 父类 |

## 参考资料

### Context7
- Spring Transaction Management 官方文档
- MyBatis-Spring 整合文档
- MySQL 8.0 Reference Manual - InnoDB Locking

### GitHub
- mybatis/mybatis-3: 官方代码库
- spring-projects/spring-framework: 事务管理参考

### WebSearch
- 美团技术博客：分布式支付系统中的幂等性设计
- Uber Engineering: Designing Idempotent Payment APIs

### Stack Overflow
- "How to handle duplicate INSERT in MySQL with Spring Boot"
- "MyBatis SELECT FOR UPDATE example"
