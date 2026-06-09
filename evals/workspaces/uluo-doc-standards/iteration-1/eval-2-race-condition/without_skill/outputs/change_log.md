# 变更记录

## 变更概要

- **变更类型**: Bug 修复
- **严重级别**: P0 (Critical) — 涉及资金安全，用户余额被重复扣减
- **影响模块**: 支付回调处理
- **变更日期**: 2026-06-08
- **修复人**: 后端开发组

---

## 变更清单

### 1. 数据库变更

| 序号 | 变更对象 | 变更类型 | 说明 |
|------|----------|----------|------|
| 1 | t_payment_record | 新增唯一索引 | transaction_id 字段添加 UNIQUE INDEX uk_transaction_id |
| 2 | t_user | 新增字段 | 添加 version INT NOT NULL DEFAULT 0 乐观锁版本号 |

**执行脚本**: `migration_fix_race_condition.sql`

---

### 2. 代码变更

| 序号 | 文件路径 | 变更类型 | 变更内容 |
|------|----------|----------|----------|
| 1 | `repository/OrderRepo.java` | 修改 | 新增 `findByOrderNoForUpdate()` 方法，使用 SELECT ... FOR UPDATE 加排他行锁 |
| 2 | `repository/PaymentRepo.java` | 修改 | 新增 `countByTransactionId()` 和 `findByTransactionId()` 方法，用于幂等校验 |
| 3 | `repository/UserRepo.java` | 修改 | `deductBalance()` 方法增加 version 参数，使用乐观锁防止并发扣减 |
| 4 | `service/PaymentService.java` | 修改 | `processCallback()` 重构：增加幂等校验、使用 FOR UPDATE 查询、捕获 DuplicateKeyException |
| 5 | `controller/PaymentController.java` | 修改 | 增加 Redis 分布式锁注释代码，供多实例部署参考 |

---

### 3. 核心逻辑变更 diff

#### PaymentService.processCallback() 变更

**修复前**:
```java
@Transactional
public void processCallback(...) {
    Order order = orderRepo.findByOrderNo(orderNo);  // 无锁
    if ("PAID".equals(order.getStatus())) return;     // 可被绕过
    paymentRepo.insert(record);                        // 无幂等
    userRepo.deductBalance(userId, amount);            // 无乐观锁
    orderRepo.updateStatus(orderId, "PAID", txId);
}
```

**修复后**:
```java
@Transactional
public void processCallback(...) {
    // [新增] 幂等校验
    if (paymentRepo.countByTransactionId(transactionId) > 0) return;

    // [修改] FOR UPDATE 行锁
    Order order = orderRepo.findByOrderNoForUpdate(orderNo);

    // 状态检查（锁保护下安全）
    if ("PAID".equals(order.getStatus())) return;

    // [新增] 捕获唯一约束冲突
    try {
        paymentRepo.insert(record);
    } catch (DuplicateKeyException e) { return; }

    // [修改] 乐观锁扣减
    userRepo.deductBalance(userId, amount, version);

    orderRepo.updateStatus(orderId, "PAID", txId);
}
```

---

### 4. 风险评估

| 风险项 | 风险等级 | 应对措施 |
|--------|----------|----------|
| FOR UPDATE 锁等待导致超时 | 中 | 确保 order_no 有索引；事务逻辑精简，快速提交 |
| 唯一索引创建时表锁阻塞写入 | 低 | 使用 pt-online-schema-change 或低峰期执行 |
| version 字段默认值兼容性 | 低 | 默认值为 0，旧数据自动兼容 |
| DuplicateKeyException 被吞掉掩盖真实错误 | 低 | 日志中打印 WARN 级别，监控平台告警 |

---

### 5. 回滚方案

如果修复后出现异常，执行以下回滚步骤：

1. **代码回滚**: 部署修复前的代码版本
2. **数据库回滚** (可选，不影响旧代码运行):
   ```sql
   ALTER TABLE t_payment_record DROP INDEX uk_transaction_id;
   ALTER TABLE t_user DROP COLUMN version;
   ```
3. 注意: 唯一索引和 version 字段不影响旧代码逻辑，不回滚数据库也可以正常运行

---

### 6. 验证清单

- [ ] 同一订单号并发 10 个回调请求，最终只产生 1 条 payment_record
- [ ] 用户余额只扣减 1 次，金额正确
- [ ] 订单状态最终为 PAID
- [ ] 重复回调接口返回 SUCCESS（幂等）
- [ ] 日志中出现 "已处理，跳过" 或 "被阻止" 字样
- [ ] 无服务端 500 错误
- [ ] 回调接口 p99 响应时间 < 500ms
