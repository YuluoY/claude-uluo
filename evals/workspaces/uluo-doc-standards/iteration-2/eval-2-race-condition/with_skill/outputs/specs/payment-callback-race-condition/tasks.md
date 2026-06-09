# 支付回调重复处理竞态条件修复 任务分解

> 日期: 2026-06-08 | 作者: AI | 关联: [spec.md](./spec.md)

## Phase 1: 幂等保护基础设施

- [ ] **T1.1**: 创建回调处理记录表唯一索引迁移脚本
  - **描述**: 为 payment_callback_log 表的 transaction_id 列新增唯一索引 uk_transaction_id；若表不存在则先创建表结构；若历史数据存在重复 transaction_id 则先执行去重
  - **产出物**: `src/main/resources/db/migration/V1.0.1__add_callback_log_uk.sql`（新增）
  - **参考**: 遵循项目现有数据库迁移脚本的命名规范和 SQL 风格
  - **复用**: 使用项目已有数据库迁移工具（Flyway / Liquibase）
  - **验收**: 执行迁移后 `SHOW INDEX FROM payment_callback_log` 包含 uk_transaction_id；插入重复 transaction_id 触发唯一约束错误
  - **预估**: 1h
  - **依赖**: 无

- [ ] **T1.2**: 创建 PaymentCallbackLogMapper 接口
  - **描述**: 创建 MyBatis Mapper 接口，包含 insert 和 findByTransactionId 方法；若已有 Mapper 则按需新增方法
  - **产出物**: `src/main/java/com/example/payment/mapper/PaymentCallbackLogMapper.java`（新增/修改）
  - **参考**: 遵循 `src/main/java/com/example/payment/mapper/PaymentMapper.java` 的接口定义和注解风格
  - **复用**: 使用 MyBatis @Insert / @Select 注解，复用了项目已有数据源配置
  - **验收**: 单元测试验证 insert 成功返回自增 ID，findByTransactionId 返回正确记录，重复 insert 抛出 DuplicateKeyException
  - **预估**: 1.5h
  - **依赖**: T1.1

- [ ] **T1.3**: 创建 PaymentCallbackLog 实体类
  - **描述**: 创建回调处理记录的 POJO 实体，包含 id, transactionId, status, result, createdAt 字段
  - **产出物**: `src/main/java/com/example/payment/entity/PaymentCallbackLog.java`（新增）
  - **参考**: 遵循 `src/main/java/com/example/payment/entity/Payment.java` 的字段命名和 Lombok 注解风格
  - **复用**: 使用项目已有的 Lombok @Data 和 @Builder 注解
  - **验收**: 实体字段名与数据库列名映射一致，序列化/反序列化测试通过
  - **预估**: 0.5h
  - **依赖**: T1.1

## Phase 2: 核心幂等逻辑与测试收尾

- [ ] **T2.1**: 为 UserBalanceMapper 增加 selectForUpdate 方法
  - **描述**: 在现有 UserBalanceMapper 中新增 selectForUpdate(Long userId) 方法，执行 SELECT ... FOR UPDATE 锁定用户余额行
  - **产出物**: `src/main/java/com/example/payment/mapper/UserBalanceMapper.java`（修改）
  - **参考**: 遵循同文件现有查询方法的注解风格和参数绑定方式
  - **复用**: 复用了已有 UserBalance 实体类和 MyBatis SqlSessionTemplate
  - **验收**: 在事务中调用 selectForUpdate 后，另一事务对同一余额行的更新被阻塞直至当前事务提交
  - **预估**: 1h
  - **依赖**: 无（可与 T1.2/T1.3 并行）

- [ ] **T2.2**: 重构 PaymentService.processCallback() 增加幂等保护
  - **描述**: 修改 processCallback 方法核心流程：1) 校验 transaction_id 非空；2) 尝试插入回调处理记录；3) 捕获 DuplicateKeyException 转为幂等返回并记录 INFO 日志；4) 插入成功后用 SELECT FOR UPDATE 锁定余额行并扣款；5) 整个过程用 @Transactional 保证原子性
  - **产出物**: `src/main/java/com/example/payment/service/PaymentService.java`（修改）
  - **参考**: 遵循同文件现有方法的事务注解用法和异常处理风格
  - **复用**: 直接调用 PaymentCallbackLogMapper.insert()、UserBalanceMapper.selectForUpdate()、UserBalanceMapper.update()（已有方法）
  - **验收**: 单元测试验证并发场景下同一 transaction_id 只被处理一次；DuplicateKeyException 被正确捕获并转为幂等返回；余额扣减与记录插入在同一事务中原子执行
  - **预估**: 3h
  - **依赖**: T1.2, T1.3, T2.1

- [ ] **T2.3**: 编写并发场景测试用例
  - **描述**: 编写集成测试覆盖幂等保护的关键路径：1) 单线程重复调用返回幂等结果；2) 多线程并发调用同一 transaction_id 只处理一次（使用 CountDownLatch）；3) 余额不足时事务回滚且允许重试；4) transaction_id 为 null 时被拒绝
  - **产出物**: `src/test/java/com/example/payment/service/PaymentServiceCallbackTest.java`（新增）
  - **参考**: 遵循 `src/test/java/com/example/payment/service/PaymentServiceTest.java` 的测试框架和断言风格
  - **复用**: 使用项目已有的 JUnit 5 + Mockito + Spring Boot Test 基础设施和测试基类
  - **验收**: 所有 4 个测试场景均通过，并发测试使用 CountDownLatch 验证线程安全性无数据错乱
  - **预估**: 2h
  - **依赖**: T2.2

- [ ] **T2.4**: 追加 CHANGELOG 变更记录
  - **描述**: 在项目根 CHANGELOG.md 中追加本次修复的变更条目（Fixed 分类），描述竞态条件修复内容和影响范围
  - **产出物**: `CHANGELOG.md`（修改）
  - **参考**: 遵循 Keep a Changelog 规范和项目已有 CHANGELOG 条目的书写风格
  - **复用**: N/A（追加到已有文件）
  - **验收**: CHANGELOG 包含 ## [1.0.1] 版本条目，Fixed 分类下有关于支付回调重复扣款修复的清晰描述
  - **预估**: 0.5h
  - **依赖**: T2.2
