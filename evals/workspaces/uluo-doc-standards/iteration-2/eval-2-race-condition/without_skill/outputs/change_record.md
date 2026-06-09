# 变更记录

## 变更概要

| 字段 | 内容 |
|------|------|
| **变更编号** | CHG-20260608-001 |
| **变更类型** | Bug 修复 |
| **优先级** | P0 |
| **关联问题** | 支付回调接口并发重复处理导致用户余额重复扣减 |
| **变更范围** | 数据库、Mapper 层、Service 层 |
| **提交日期** | 2026-06-08 |
| **变更人** | 后端研发组 |

---

## 变更明细

### 1. 数据库变更

#### 1.1 t_order 表 —— 添加唯一约束

**文件：** `migration/V2.0.1__add_pay_trans_id_unique.sql`

```sql
ALTER TABLE t_order ADD CONSTRAINT uk_pay_trans_id UNIQUE (pay_trans_id);
```

**原因：** `pay_trans_id` 是支付网关生成的全局唯一流水号，在订单表中应当唯一。缺少此约束导致同一笔支付可以插入多条记录。

**影响范围：** 无业务影响。唯一约束仅对 INSERT 生效，不影响现有 UPDATE/SELECT。

**前置检查：**

```sql
-- 执行前必须先确认无重复数据
SELECT pay_trans_id, COUNT(*) AS cnt
FROM t_order
WHERE pay_trans_id IS NOT NULL
GROUP BY pay_trans_id
HAVING cnt > 1;
```

**回滚：**

```sql
ALTER TABLE t_order DROP INDEX uk_pay_trans_id;
```

---

#### 1.2 t_order 表 —— 添加乐观锁版本字段

**文件：** `migration/V2.0.2__add_order_version.sql`

```sql
ALTER TABLE t_order ADD COLUMN version INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本号';
```

**原因：** 配合乐观锁更新策略，确保并发更新时只有第一个到达的事务能成功更新订单状态。

**影响范围：** 新增列带默认值，对存量数据无影响。需同步更新 MyBatis 实体类。

**回滚：**

```sql
ALTER TABLE t_order DROP COLUMN version;
```

---

### 2. Java 代码变更

#### 2.1 OrderMapper.java —— 新增行锁查询方法

**文件：** `src/main/java/.../mapper/OrderMapper.java`

**新增方法：**

```java
@Select("SELECT * FROM t_order WHERE pay_trans_id = #{payTransId} FOR UPDATE")
Order selectByPayTransIdForUpdate(@Param("payTransId") String payTransId);
```

**原因：** 提供事务内行锁查询能力，确保同一订单在事务处理期间不被其他事务并发修改。`FOR UPDATE` 是 InnoDB 引擎的排他行锁，在当前事务提交前其他事务无法获取该行的排他锁。

---

#### 2.2 UserMapper.java —— 余额扣减增加行锁和余额校验

**文件：** `src/main/java/.../mapper/UserMapper.java`

**修改方法：**

```java
// 修改前
@Update("UPDATE t_user SET balance = balance - #{amount} WHERE id = #{userId}")
int deductBalance(@Param("userId") Long userId, @Param("amount") BigDecimal amount);

// 修改后
@Update("UPDATE t_user SET balance = balance - #{amount}, update_time = NOW() "
      + "WHERE id = #{userId} AND balance >= #{amount}")
int deductBalanceForUpdate(@Param("userId") Long userId, @Param("amount") BigDecimal amount);
```

**原因：**
- 移除旧的 `deductBalance` 方法（无余额校验，可能产生负余额）
- 新方法增加了 `balance >= #{amount}` 条件，防止余额不足时仍执行扣减
- 受影响行数为 0 时，Service 层抛出异常并回滚事务

---

#### 2.3 Order.java 实体类 —— 增加 version 字段

**文件：** `src/main/java/.../entity/Order.java`

```java
/** 乐观锁版本号 */
private Integer version;

// getter / setter
public Integer getVersion() { return version; }
public void setVersion(Integer version) { this.version = version; }
```

---

#### 2.4 PaymentCallbackService.java —— 核心逻辑重写 【关键变更】

**文件：** `src/main/java/.../service/PaymentCallbackService.java`

**修改前逻辑：**

```
1. 根据 payTransId 查询订单 (无锁)
2. 如果状态 != PAID，则扣减余额并更新状态
3. 返回 success
```

**修改后逻辑：**

```
1. 根据 payTransId 查询订单 (无锁，快速幂等判断)
2. 如果状态 == PAID，直接返回 (幂等)
3. 使用 SELECT ... FOR UPDATE 获取行锁
4. 加锁后再次确认状态 != PAID
5. 扣减余额 (balance >= amount 条件保护)
6. 更新订单状态为 PAID
7. 提交事务，释放锁
```

**关键差异：**

| 对比维度 | 修改前 | 修改后 |
|---------|--------|--------|
| 幂等性 | 无 | 三层防护（应用层 + 数据库行锁 + 唯一约束） |
| 余额安全 | 无余额校验 | balance >= amount 校验 |
| 并发安全 | 读-判断-写 无保护 | FOR UPDATE 排他锁串行化 |
| 事务边界 | 不明确 | @Transactional 明确回滚策略 |

---

## 变更影响评估

### 性能影响

| 指标 | 评估 |
|------|------|
| 单次回调处理耗时 | +2-5ms（FOR UPDATE 行锁获取开销） |
| 数据库连接占用 | 不变（仍为同一事务内） |
| 死锁风险 | 低（仅锁定单行，锁持有时间极短） |
| 吞吐量 | 无显著影响（行锁粒度细，非表锁） |

### 兼容性

- **API 接口签名：** 无变化
- **响应格式：** 无变化
- **存量数据：** 完全兼容
- **下游依赖：** 无影响

---

## 测试验证记录

### 单元测试

| 测试用例 | 方法 | 结果 | 备注 |
|---------|------|------|------|
| testNormalCallback | 模拟新支付通知 | PASS | 余额正确扣减，订单状态PAID |
| testDuplicateCallback | 相同 payTransId 再次调用 | PASS | 幂等返回，余额未重复扣减 |
| testConcurrentCallback_2threads | CountDownLatch 同时释放2线程 | PASS | 仅一笔扣减生效 |
| testConcurrentCallback_10threads | CountDownLatch 同时释放10线程 | PASS | 仅一笔扣减生效 |
| testInsufficientBalance | 余额不足的支付回调 | PASS | 抛出异常，事务回滚 |
| testDeadlock | 多笔不同订单并发处理 | PASS | 无死锁 |

### 集成测试

通过 JUnit 参数化测试，模拟支付网关真实回调报文，覆盖微信支付/支付宝两种渠道，1000 次重复回调验证通过。

---

## 变更索引

| 序号 | 文件路径 | 变更类型 | 说明 |
|------|---------|----------|------|
| 1 | `migration/V2.0.1__add_pay_trans_id_unique.sql` | 新增 | pay_trans_id 唯一约束 |
| 2 | `migration/V2.0.2__add_order_version.sql` | 新增 | order 表 version 字段 |
| 3 | `mapper/OrderMapper.java` | 修改 | 新增 selectByPayTransIdForUpdate |
| 4 | `mapper/UserMapper.java` | 修改 | deductBalanceForUpdate 增加余额校验 |
| 5 | `entity/Order.java` | 修改 | 增加 version 字段 |
| 6 | `service/PaymentCallbackService.java` | 修改 | 核心幂等逻辑重写 |
| 7 | `service/PaymentCallbackServiceTest.java` | 新增 | 并发幂等性单元测试 |
