# 支付回调竞态条件修复 需求规格说明

> 日期: 2026-06-08 | 作者: AI Assistant | 状态: 已确认

## 背景与动机

当前支付回调接口 `PaymentController.receiveCallback()` 在高并发场景下存在竞态条件：同一个支付通知被并发线程同时处理，两线程均通过订单状态检查（`processCallback()` 中的状态判断），随后各自执行余额扣减，导致用户余额被重复扣减。根因是订单状态查询与余额扣减之间缺乏原子性保障——`@Transactional` 的默认 `READ_COMMITTED` 隔离级别无法阻止并发线程同时读取到"未支付"状态，形成典型的 TOCTOU（Time-of-Check-Time-of-Use）竞态条件。

不改的后果：支付回调重试或多通道并发通知场景下，用户资金存在被重复扣减的风险，属于 P0 级别的资金安全缺陷。

## 用户故事

| 编号 | 角色 | 故事 | 验收线索 |
|------|------|------|---------|
| US-1 | 支付用户 | 作为支付用户，我希望同一笔订单只被扣款一次，以便我的账户余额不会被错误地重复扣减 | FR-1, AC-1, AC-2 |
| US-2 | 系统运维 | 作为系统运维，我希望支付回调具备幂等性，以便在高并发或通知重试场景下系统的资金数据保持一致 | FR-1, FR-2, AC-3 |
| US-3 | 财务对账 | 作为财务人员，我希望每笔支付通知与扣款记录一一对应，以便对账时不会出现资金差异 | FR-2, AC-4 |

### 目标
- 消除支付回调的竞态条件，同一笔支付通知只处理一次
- 在高并发（模拟 100 QPS 重复通知）下，用户余额扣减次数严格等于 1
- 提供数据库层面的唯一性约束作为最后防线

### 非目标（明确不做的事）
- 不引入分布式锁中间件（Redis/ZooKeeper）——影响模块数已超过 2，不作为本次修复范围
- 不修改支付网关侧的回调重试策略
- 不重构整个支付模块架构

## 功能需求

### FR-1: 订单行级悲观锁
- **描述**: 在 `PaymentService.processCallback()` 中，对订单状态查询使用 `SELECT ... FOR UPDATE` 行级悲观锁，确保同一订单行在同一时刻只能被一个事务持有锁
- **优先级**: P0
- **触发条件**: 支付回调到达时，进入事务后首先对目标订单执行加锁查询
- **预期行为**: 第一个事务获取订单行锁后，第二个事务在查询阶段即被阻塞，直至第一个事务提交释放锁；第二个事务重新读取到"已支付"状态后跳过业务处理
- **边界条件**: 锁等待超时（MySQL `innodb_lock_wait_timeout` 默认 50s）后抛出 `LockAcquisitionException`，统一返回 200 给支付网关（网关会根据响应状态码决定是否重试）

### FR-2: 支付通知幂等检查
- **描述**: 在 `PaymentRepo` 中新增基于 `transactionId`（支付网关交易号）的幂等记录查询；处理回调前先检查该 `transactionId` 是否已处理
- **优先级**: P1
- **触发条件**: 每次支付回调到达时
- **预期行为**: 若 `transactionId` 已存在处理记录，直接返回成功（幂等响应）；若不存在，执行正常扣款流程并在同一事务中写入幂等记录
- **边界条件**: 幂等记录插入失败（如唯一约束冲突）时捕获异常并返回成功——说明并发中已被另一事务先处理

### FR-3: 数据库唯一约束
- **描述**: 在支付记录表 `payment_records` 的 `transaction_id` 列上添加唯一索引
- **优先级**: P1
- **触发条件**: DDL 变更，运行时自动生效
- **预期行为**: 任何尝试重复插入相同 `transaction_id` 的操作将被数据库拒绝
- **边界条件**: 历史数据中可能存在 `transaction_id` 为 NULL 的记录（非支付回调产生的记录），唯一索引需允许 NULL 值重复（MySQL 默认行为已满足）

## 非功能性需求

### 性能
- 悲观锁引入后，单次回调处理延迟增加预计 < 5ms（行级锁竞争极短）
- 在 100 QPS 重复通知场景下，系统吞吐量不应下降超过 10%
- 锁持有时间控制在 100ms 以内（仅覆盖订单查询+余额扣减+幂等记录写入）

### 安全
- 涉及用户余额的资金操作，修复后需通过资金安全回归测试
- 锁超时后不泄露用户数据（事务回滚）

### 可维护性
- 新增日志：记录锁获取、锁超时、幂等命中、重复通知拦截等关键事件（INFO/WARN 级别）
- 幂等记录表需配置数据保留策略（建议 TTL 90 天）

## 影响范围

| 模块 | 影响类型 | 说明 |
|------|---------|------|
| `service/PaymentService.java` | 修改 | `processCallback()` 增加加锁查询和幂等检查逻辑 |
| `repository/OrderRepo.java` | 修改 | 新增 `findByIdForUpdate()` 加锁查询方法 |
| `repository/PaymentRepo.java` | 修改 | 新增 `existsByTransactionId()` 和 `saveIdempotentRecord()` 方法 |
| `payment_records` 表 | 修改 | 新增 `transaction_id` 列唯一索引 |
| `controller/PaymentController.java` | 不变 | 无需修改 Controller 层 |

## 依赖与前置条件

- MySQL 数据库支持行级锁（InnoDB 引擎，项目已在使用）
- `payment_records` 表存在或可新建幂等记录表
- `transactionId`（支付网关交易号）在回调参数中可获取

## 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 悲观锁导致死锁 | 低 | 高 | 统一加锁顺序（先锁订单再锁账户）；设置合理的 `innodb_lock_wait_timeout` |
| 幂等记录表膨胀 | 中 | 低 | 配置定时清理任务（90 天 TTL）；评估后可按月分表 |
| 历史数据中 `transaction_id` 为空导致唯一索引创建失败 | 低 | 中 | 创建索引前排除 NULL 值（MySQL 唯一索引默认允许 NULL 重复）；如有空字符串则先清洗 |
| 锁等待超时被支付网关判为重试失败 | 中 | 中 | 返回 HTTP 200 + 特定业务码告知网关"处理中"，网关按正常间隔重试 |

## 验收标准

- [ ] AC-1: 并发模拟测试——使用 JMeter/ab 以 100 并发线程发送相同 `transactionId` 的回调请求，验证余额只被扣减一次
- [ ] AC-2: 幂等性验证——连续两次发送相同 `transactionId` 的回调请求，第二次请求日志输出"重复通知已拦截"，余额不变
- [ ] AC-3: 锁超时验证——模拟长时间锁持有，验证超时后事务回滚、余额不变，且错误日志正确记录
- [ ] AC-4: 唯一约束验证——直接向 `payment_records` 表插入重复 `transaction_id`，验证数据库拒绝写入
- [ ] AC-5: 正常流程不受影响——非并发场景下，正常支付回调流程端到端通过

## 调研依据

### 技术可行性

| 调研项 | 结论 | 来源 | 可信度 |
|--------|------|------|--------|
| MySQL `SELECT ... FOR UPDATE` 在 Spring Boot + MyBatis 中的集成 | MyBatis 支持在 `@Select` 注解或 XML Mapper 中直接写 `FOR UPDATE`，与 `@Transactional` 配合使用即可实现行级悲观锁 | Context7: MyBatis/Spring Boot 官方文档 | 高 |
| Spring `@Transactional` 默认隔离级别对并发的影响 | 默认 `READ_COMMITTED` 无法防止幻读和不可重复读，更无法阻止并发写——必须引入显示锁或乐观锁 | Context7: Spring Framework 文档 | 高 |
| `SELECT ... FOR UPDATE` 性能影响 | 行级锁仅在事务持有期间生效（通常 < 100ms），对吞吐量影响极小；死锁风险可通过统一加锁顺序规避 | Context7: MySQL 官方文档 | 高 |

### 业界方案参考

| 调研项 | 参考项目/文章 | 关键发现 |
|--------|-------------|---------|
| 支付回调幂等处理方案 | 支付宝/微信支付官方文档 + Stack Overflow | 业界标准做法：幂等键 + DB 唯一约束；`SELECT FOR UPDATE` 是纯 DB 层最轻量的并发控制手段 |
| 资金防重扣减方案 | GitHub: 多个电商开源项目（如 RuoYi、Mall） | 常见三层防护：应用层幂等检查 → 数据库悲观锁/乐观锁 → 数据库唯一约束 |

### 已知风险/坑点

| 风险 | 来源 | 缓解措施 |
|------|------|---------|
| `FOR UPDATE` 在未命中索引时锁全表 | MySQL 官方文档 | 确保 `order_id` 上有唯一索引（主键查询自动命中） |
| Spring 事务代理失效（同类方法调用不走代理） | Stack Overflow | `processCallback()` 是 public 方法，由 Controller 跨类调用，可正常触发事务代理 |

## 参考资料

- Context7: MyBatis Spring Boot Starter 文档 — `@Select` 注解用法及事务集成
- Context7: Spring Framework Transaction Management — `@Transactional` 隔离级别与传播行为
- Context7: MySQL 8.0 Reference Manual — `SELECT ... FOR UPDATE` 与 InnoDB 行级锁
- WebSearch: 支付宝异步通知接入文档 — 幂等处理最佳实践
- Stack Overflow: "Spring Boot @Transactional SELECT FOR UPDATE example"
- GitHub: Mall 电商项目 — `OrderService` 并发扣减实现参考
