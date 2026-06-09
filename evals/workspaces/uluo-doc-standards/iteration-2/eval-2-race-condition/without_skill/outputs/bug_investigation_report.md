# 支付回调重复扣减 Bug 排查报告

## 1. 问题发现

**发现时间：** 2026-06-08 10:30

**发现途径：** 用户投诉反馈余额异常减少 + 对账系统发现当日支付流水与余额变动不匹配

**影响范围：** 高并发支付时段（每日 12:00-13:00, 18:00-20:00）受影响订单约占该时段总订单的 3%-5%

---

## 2. 排查过程

### 2.1 日志排查

查看应用日志，发现同一 `pay_trans_id` 出现了两条处理成功的记录：

```
2026-06-08 12:15:30.123 [http-nio-8080-exec-47] INFO  PaymentCallbackService - 处理支付回调 payTransId=wx20260608121500123
2026-06-08 12:15:30.124 [http-nio-8080-exec-48] INFO  PaymentCallbackService - 处理支付回调 payTransId=wx20260608121500123
2026-06-08 12:15:30.156 [http-nio-8080-exec-47] INFO  PaymentCallbackService - 扣减余额 userId=10001 amount=99.00
2026-06-08 12:15:30.158 [http-nio-8080-exec-48] INFO  PaymentCallbackService - 扣减余额 userId=10001 amount=99.00  <-- 重复!
```

两条日志时间戳间隔仅 1ms，分属不同线程（exec-47 和 exec-48），说明是并发请求。

### 2.2 代码审查

定位到 `PaymentCallbackService.handlePaymentCallback()` 方法，发现存在经典的 **TOCTOU（Time-of-Check to Time-of-Use）** 竞态条件：

```java
// 问题代码
public void handlePaymentCallback(PaymentNotify notify) {
    Order order = orderMapper.selectByPayTransId(notify.getTransactionId());
    
    if (order.getStatus() == OrderStatus.PAID) {  // ← 检查时刻
        return;
    }
    
    userMapper.deductBalance(order.getUserId(), order.getAmount());   // ← 扣减
    order.setStatus(OrderStatus.PAID);
    orderMapper.updateById(order);                                    // ← 使用时刻（更新）
}
```

**漏洞链条：**

```
Step 1: Thread-A 查询订单 -> status=UNPAID
Step 2: Thread-B 查询订单 -> status=UNPAID  (A 尚未更新)
Step 3: Thread-A 判断 UNPAID -> 执行扣减
Step 4: Thread-B 判断 UNPAID -> 执行扣减  (竞态窗口)
Step 5: Thread-A 更新 status=PAID
Step 6: Thread-B 更新 status=PAID  (覆盖，但扣减已重复)
```

### 2.3 数据库确认

```sql
-- 查询重复处理的支付流水号
SELECT pay_trans_id, COUNT(*) as cnt, SUM(amount) as total_deducted
FROM t_payment_record
WHERE create_time >= '2026-06-08 00:00:00'
GROUP BY pay_trans_id
HAVING cnt > 1;
```

确认存在 47 条重复记录，涉及金额合计 4,653 元。

### 2.4 直接原因总结

| 编号 | 原因 | 严重程度 |
|------|------|---------|
| R1 | `selectByPayTransId` 无锁查询，不阻止并发读取 | 严重 |
| R2 | 状态判断和业务操作不在同一原子上下文中 | 严重 |
| R3 | `pay_trans_id` 字段缺少唯一约束 | 严重 |
| R4 | 缺少事务管理注解 `@Transactional` | 中等 |
| R5 | 扣减余额 SQL 无 `balance >= amount` 条件 | 中等 |

---

## 3. 根本原因

**架构设计缺陷：** 支付回调接口作为资金流转的关键节点，未按"接口幂等性"标准进行设计。在对"最多执行一次"语义有强要求的场景下，使用了"读-判断-写"的非原子操作模式。

---

## 4. 线上止损措施

在修复代码上线前，采取的临时止损措施：

1. **Nginx 层限流：** 对 `/payment/callback` 接口按 `pay_trans_id` 做去重（基于 Lua 脚本 + 共享内存），同一流水号 30 秒内只放行一次
2. **监控告警：** 配置 Prometheus 指标，对同一 `pay_trans_id` 的重复处理实时告警
3. **手动对账：** 临时启动 CronJob，每 5 分钟扫描重复记录并生成退款清单，人工审核后退还

---

## 5. 修复方案

详见 [fix_plan.md](./fix_plan.md)
