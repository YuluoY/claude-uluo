# 订单支付回调接口并发重复处理修复方案

## 1. 问题概述

**现象：** 订单支付回调接口在高并发场景下，同一个支付通知被处理两次，导致用户余额被重复扣减。

**影响：** 用户资金损失，客服投诉增多，账务对账不平。

**紧急程度：** P0（涉及资金安全，需立即修复）

---

## 2. 根因分析

### 2.1 触发条件

支付回调服务商（微信支付/支付宝）在推送支付成功通知后，如果在超时时间内未收到业务方的 `success` 确认响应，会自动重试推送。在高并发或网络抖动场景下，两个通知几乎同时到达，或者第一个通知处理时间略长导致重试通知已到达。

### 2.2 根本原因

支付回调处理方法 **缺少幂等性保护机制**。关键代码路径存在"查询-判断-更新"的竞态条件：

```
Thread-A                           Thread-B
  |                                   |
  | select order (status=UNPAID)       |
  |                                   | select order (status=UNPAID)
  | check: UNPAID -> proceed          | check: UNPAID -> proceed
  | deduct balance (-100)             | deduct balance (-100)  <-- 重复扣减!
  | update status = PAID              | update status = PAID
  |                                   |
```

两个线程都读取到了 `UNPAID` 状态，都执行了扣款操作。

### 2.3 数据库层面分析

当前订单表 `t_order` 中 `pay_trans_id`（支付流水号）字段没有唯一约束，使得同一个支付流水号可以存在多条处理记录，无法从数据库层面阻断重复写入。

---

## 3. 修复方案

### 3.1 总体策略

采用 **"数据库行锁 + 唯一约束"** 组合方案，从三个层面保证幂等性：

| 层面 | 机制 | 作用 |
|------|------|------|
| 数据库 | `SELECT ... FOR UPDATE` | 事务内锁定订单行，串行化处理同一订单 |
| 数据库 | 唯一约束 `uk_pay_trans_id` | 防止重复插入支付记录 |
| 应用层 | 前置状态判断 + 异常捕获 | 幂等返回，避免脏数据写入 |

### 3.2 数据库变更（DDL）

**Step 1: 添加支付流水号唯一约束**

```sql
-- 确保 pay_trans_id 全局唯一，从根本上阻断重复处理
ALTER TABLE t_order ADD CONSTRAINT uk_pay_trans_id UNIQUE (pay_trans_id);
```

**Step 2: 确保订单表幂等更新条件**

```sql
-- 如果尚未添加 version 字段用于乐观锁，建议添加
ALTER TABLE t_order ADD COLUMN version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号';
```

### 3.3 MyBatis Mapper 变更

**OrderMapper.java 新增方法：**

```java
/**
 * 使用行锁查询订单，确保在当前事务内该行不被其他事务修改
 */
@Select("SELECT * FROM t_order WHERE pay_trans_id = #{payTransId} FOR UPDATE")
Order selectByPayTransIdForUpdate(@Param("payTransId") String payTransId);

/**
 * 带版本号的乐观锁更新——仅当当前版本与数据库一致时才生效
 */
@Update("UPDATE t_order SET status = #{status}, version = version + 1, update_time = NOW() "
      + "WHERE id = #{id} AND version = #{version}")
int updateStatusWithVersion(@Param("id") Long id, @Param("status") Integer status, @Param("version") Integer version);
```

### 3.4 Service 层核心逻辑改造

**PaymentCallbackService.java（修复后）：**

```java
@Service
public class PaymentCallbackService {

    @Autowired
    private OrderMapper orderMapper;
    @Autowired
    private UserMapper userMapper;
    @Autowired
    private RedisLock redisLock;  // 可选的分布式锁

    @Transactional(rollbackFor = Exception.class)
    public void handlePaymentCallback(PaymentNotify notify) {
        String payTransId = notify.getTransactionId();

        // ===== Layer 1: 应用层幂等性判断（无锁快速返回） =====
        Order order = orderMapper.selectByPayTransId(payTransId);
        if (order != null && order.getStatus() == OrderStatus.PAID) {
            log.info("订单已处理，幂等返回。payTransId={}", payTransId);
            return;
        }

        // ===== Layer 2: 数据库行锁保证串行处理 =====
        // 在同一个事务中，FOR UPDATE 锁定该行，阻止其他事务并发修改
        try {
            order = orderMapper.selectByPayTransIdForUpdate(payTransId);
        } catch (Exception e) {
            // 如果 pay_trans_id 唯一约束冲突，说明另一个事务已经先完成处理
            log.info("并发冲突，幂等返回。payTransId={}", payTransId);
            return;
        }

        if (order == null) {
            throw new BusinessException("订单不存在: " + payTransId);
        }

        // 二次确认状态（持有行锁后再次检查）
        if (order.getStatus() == OrderStatus.PAID) {
            log.info("订单状态已为PAID，跳过处理。payTransId={}", payTransId);
            return;
        }

        // ===== Layer 3: 执行业务逻辑 =====
        // 扣减用户余额（带行锁保护，user_id 对应的用户余额行）
        int affected = userMapper.deductBalanceForUpdate(order.getUserId(), order.getAmount());
        if (affected == 0) {
            throw new BusinessException("余额不足或用户不存在");
        }

        // 更新订单状态为已支付
        order.setStatus(OrderStatus.PAID);
        orderMapper.updateById(order);

        // 记录流水
        saveTransactionRecord(order);

        log.info("支付回调处理成功。payTransId={}, orderId={}", payTransId, order.getId());
    }
}
```

### 3.5 UserMapper 余额扣减改进

```java
/**
 * 使用行锁扣减余额，确保原子性，且余额不为负
 */
@Update("UPDATE t_user SET balance = balance - #{amount}, update_time = NOW() "
      + "WHERE id = #{userId} AND balance >= #{amount}")
int deductBalanceForUpdate(@Param("userId") Long userId, @Param("amount") BigDecimal amount);
```

**关键点：** `balance >= #{amount}` 条件确保余额不为负，`affectedRows = 0` 表示余额不足。

### 3.6 可选增强：Redis 分布式锁

如果部署了多个应用实例且数据库行锁性能不足，可增加 Redis 分布式锁作为前置过滤：

```java
String lockKey = "payment:callback:" + payTransId;
boolean locked = redisLock.tryLock(lockKey, 30, TimeUnit.SECONDS);
if (!locked) {
    log.info("获取分布式锁失败，幂等返回。payTransId={}", payTransId);
    return;
}
try {
    handlePaymentCallbackInternal(notify);
} finally {
    redisLock.unlock(lockKey);
}
```

> **注意：** Redis 分布式锁仅用作性能优化（减少无效数据库查询），核心保障仍依赖数据库层面的行锁和唯一约束。不能仅依赖 Redis 锁（Redis 可能宕机、主从切换丢锁）。

---

## 4. 修复验证

### 4.1 单元测试场景

| 场景 | 输入 | 期望结果 |
|------|------|----------|
| 正常支付回调 | 新支付通知 | 余额扣减一次，订单状态PAID |
| 重复支付回调 | 相同 payTransId 再次通知 | 余额不重复扣减，幂等返回 |
| 并发回调（2线程） | 两个线程同时处理同一 payTransId | 余额仅扣减一次 |
| 并发回调（10线程） | 十个线程同时处理同一 payTransId | 余额仅扣减一次 |
| 余额不足 | 支付回调时用户余额不足 | 抛出异常，事务回滚 |

### 4.2 压测验证

使用 JMeter 模拟 100 TPS 的支付回调请求，其中 20% 为重复通知，在 5 分钟内验证：

- 用户余额总额变动 = 实际成功支付笔数 * 单笔金额（无重复扣减）
- 订单表 `pay_trans_id` 无重复记录
- 无死锁日志

---

## 5. 上线计划

1. **数据库 DDL 变更：** 在低峰期执行（执行前检查 `pay_trans_id` 是否已有重复数据并清理）
2. **代码部署：** 灰度发布，先 10% 流量观察 30 分钟
3. **监控指标：** 关注支付回调处理成功率、平均耗时、余额扣减异常告警
4. **回滚方案：** 代码回滚到上一版本；数据库唯一约束可保留（不影响旧逻辑）

---

## 6. 总结

本次修复通过"数据库行锁 + 唯一约束 + 应用层状态判断"三层防护，从根本上解决了支付回调的幂等性问题。即使在极端并发场景下，数据库的行锁机制和唯一约束也能保证同一笔支付通知只被处理一次，确保用户资金安全。
