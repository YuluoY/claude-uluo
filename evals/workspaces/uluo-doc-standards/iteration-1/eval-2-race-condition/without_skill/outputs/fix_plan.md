# 支付回调竞态条件修复方案

## 1. 问题描述

**现象**: 订单支付回调接口在高并发下出现重复处理，同一个支付通知被处理了两次，导致用户余额被重复扣减。

**影响范围**:
- 用户余额被重复扣减，造成资金损失
- 同一订单关联多条支付记录，数据不一致
- 支付平台对账异常

**触发条件**:
- 支付平台因网络超时重发回调通知
- 消息队列 at-least-once 语义导致重复投递
- 网关/反向代理自动重试
- 短时间内同一订单被多次触发回调

## 2. 根因分析

### 2.1 竞态条件时序图

```
时间线   线程A                          线程B                     数据库
----------------------------------------------------------------------
T1      processCallback(orderNo)       processCallback(orderNo)
T2      SELECT * FROM t_order          SELECT * FROM t_order
        WHERE order_no='X'             WHERE order_no='X'
T3      → status=PENDING ✓            → status=PENDING ✓      两条查询都返回 PENDING
T4      INSERT t_payment_record        INSERT t_payment_record
T5      UPDATE t_user SET              UPDATE t_user SET
        balance=balance-100            balance=balance-100     余额被扣了两次！
T6      UPDATE t_order SET             UPDATE t_order SET
        status='PAID'                  status='PAID'           最终状态是 PAID 但扣了两次
```

### 2.2 根本原因

| 问题点 | 代码位置 | 说明 |
|--------|----------|------|
| 无行锁 | OrderRepo.findByOrderNo() | 普通 SELECT 不加锁，两个事务可同时读到 PENDING |
| 无幂等校验 | PaymentService.processCallback() | 没有检查 transactionId 是否已处理过 |
| 无唯一约束 | t_payment_record 表 | transaction_id 字段无唯一索引，可重复插入 |
| 无乐观锁 | UserRepo.deductBalance() | 直接 SET balance = balance - amount，无版本控制 |

核心矛盾: `@Transactional` 只保证单个事务的 ACID，但无法阻止两个并发事务各自读到相同的初始状态。默认 READ_COMMITTED 隔离级别下，事务A读到 PENDING 后事务B也能读到 PENDING。

## 3. 修复方案（三层防护）

### 3.1 第一层: 业务层幂等校验

在 `PaymentService.processCallback()` 入口处，先查询 `t_payment_record` 表检查 `transactionId` 是否已存在。已存在则直接返回，不再继续处理。

**变更文件**: `service/PaymentService.java`
**新增方法**: `PaymentRepo.countByTransactionId()`

### 3.2 第二层: 数据库行锁 (FOR UPDATE)

将 `OrderRepo.findByOrderNo()` 改为 `findByOrderNoForUpdate()`，使用 `SELECT ... FOR UPDATE` 对订单行加排他锁。当线程A的事务持有该行锁时，线程B的 FOR UPDATE 查询会被阻塞，直到线程A的事务提交。线程B读到更新后的 status=PAID，直接跳过。

**变更文件**: `repository/OrderRepo.java`
**新增方法**: `findByOrderNoForUpdate(String orderNo)`

### 3.3 第三层: 数据库唯一约束

在 `t_payment_record.transaction_id` 上添加 UNIQUE 索引。即使前两层防护在极端情况下被绕过，数据库层面也会拒绝重复插入（抛出 DuplicateKeyException），Service 层捕获后做幂等返回。

**变更文件**: `migration_fix_race_condition.sql`
**变更内容**: `ALTER TABLE t_payment_record ADD UNIQUE INDEX uk_transaction_id (transaction_id);`

### 3.4 辅助修复: 余额乐观锁

`UserRepo.deductBalance()` 增加 `version` 字段做乐观锁校验。UPDATE 语句增加 `WHERE version = #{version}` 条件，并发扣减时只有一个事务能成功。

**变更文件**: `repository/UserRepo.java`, `migration_fix_race_condition.sql`
**变更内容**: t_user 表增加 version 列，deductBalance 方法增加 version 参数

### 3.5 可选增强: Redis 分布式锁

如果系统是多实例部署，在 Controller 层增加 Redis 分布式锁作为第一道防线，减少无效的数据库锁竞争。

**变更文件**: `controller/PaymentController.java`（注释中给出示例代码）

## 4. 修复后流程

```
时间线   线程A                          线程B                     数据库
----------------------------------------------------------------------
T1      processCallback(orderNo)       processCallback(orderNo)
T2      幂等校验: countByTxId → 0      幂等校验: countByTxId → 0
T3      SELECT ... FOR UPDATE          SELECT ... FOR UPDATE
        获得行锁 ✓                      等待行锁... ⏳
T4      状态检查 → PENDING ✓
T5      INSERT payment_record (成功)
T6      UPDATE user balance (成功)
T7      UPDATE order status='PAID'
T8      COMMIT (释放行锁)
T9                                     获得行锁 ✓
T10                                    状态检查 → PAID → 跳过 ✓
```

## 5. 测试建议

### 5.1 单元测试
- 模拟同一订单号的并发回调请求
- 验证最终只产生一条 payment_record
- 验证余额只扣减一次
- 验证订单状态正确为 PAID

### 5.2 集成测试
- 使用线程池同时发起 10 个同订单回调请求
- 验证 DuplicateKeyException 被正确处理
- 验证 FOR UPDATE 锁等待超时场景

### 5.3 性能测试
- 吞吐量: 不低于修复前水平的 90%
- FOR UPDATE 锁等待时间: p99 < 100ms
- 对比修复前后 TPS 变化

## 6. 上线步骤

1. **先执行 DDL**: 执行 `migration_fix_race_condition.sql`（添加唯一索引和 version 字段）
2. **灰度部署**: 选择 1-2 台机器先上线新代码
3. **监控观察**: 关注 callback 接口的错误率、响应时间、DuplicateKeyException 日志
4. **全量发布**: 确认无异常后全量上线
5. **回滚方案**: 新代码兼容旧表结构（version 默认 0），可直接回滚代码
