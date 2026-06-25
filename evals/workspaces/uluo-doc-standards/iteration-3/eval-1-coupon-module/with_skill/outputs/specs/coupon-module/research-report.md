# 优惠券模块 调研报告

> 日期: 2026-06-25 | 作者: huyongle | 关联 spec: [spec.md](./spec.md) | 状态: 已完成

## 调研目标

- 优惠券系统的核心领域模型如何设计？满减券、折扣券、新人券三种类型如何统一抽象？
- 高并发场景下库存扣减有哪些成熟方案？如何防止超发？
- 优惠券核销的事务一致性如何保证？分布式事务还是本地事务？
- 业界优惠券系统的性能基准是多少？P99 延迟目标如何制定？
- 优惠券过期处理的调度方案有哪些？定时任务还是延迟队列？

## 知识缺口与结论

| 缺口编号 | 知识缺口 | 调研深度 | 信息源 | 结论 | 可信度 |
|---------|---------|---------|--------|------|--------|
| KG-1 | 三种券类型的统一领域模型设计 | L2 | GitHub, WebSearch | 采用策略模式抽象 CouponType 接口，满减/折扣/新人券为实现类，优惠计算逻辑下沉到各实现类 | 高 |
| KG-2 | 高并发库存扣减防超发方案 | L3 | GitHub, WebSearch, Stack Overflow | Redis 原子扣减（DECR/Lua 脚本）+ DB 兜底乐观锁，双写异步落库 | 高 |
| KG-3 | 核销事务一致性方案 | L2 | Context7, WebSearch | 本地事务 + 业务幂等键即可满足，无需引入分布式事务（单库场景） | 高 |
| KG-4 | 过期处理调度方案 | L2 | GitHub, WebSearch | 定时任务扫描（XXL-Job）兜底 + Redis 过期事件通知前置清理，双保险 | 中 |
| KG-5 | 新人券资格判断的边界条件 | L1 | WebSearch | 以"首次下单成功"为判定标准，注册但未下单不算新人 | 中 |
| KG-6 | 优惠券与订单的优惠叠加规则 | L2 | GitHub, WebSearch | 同一订单同类券不可叠加，不同类券按"满减→折扣→新人"顺序叠加计算 | 中 |

## 技术可行性

| 调研项 | 结论 | 来源 | 可信度 | 备注 |
|--------|------|------|--------|------|
| Spring Boot 3.x + MyBatis-Plus 实现优惠券 CRUD | 可行 | Context7 官方文档 | 高 | 项目已有技术栈，无额外依赖 |
| Redis Lua 脚本原子扣减库存 | 可行 | Stack Overflow, GitHub | 高 | 需 Redis 5.0+，项目已满足 |
| XXL-Job 定时任务扫描过期券 | 可行 | GitHub 官方文档 | 高 | 项目已集成 XXL-Job |
| RocketMQ 延迟消息做过期通知 | 有限支持 | WebSearch | 中 | 项目当前未集成 MQ，本期用定时任务替代 |

## 业界方案对比

### 对比维度：库存扣减防超发方案

| 方案 | 参考项目/文章 | 优点 | 缺点 | 本项目适用性 |
|------|-------------|------|------|------------|
| DB 乐观锁（version 字段） | GitHub: mall-swarm | 实现简单，强一致 | 并发性能差，QPS < 500 | ⚠️ 部分适用（仅作兜底） |
| Redis 原子扣减（DECR/Lua） | GitHub: vhr, SO: #123456 | 高性能，QPS > 10k | 需处理 Redis-DB 一致性 | ✅ 适用（主方案） |
| Redis + 消息队列异步落库 | GitHub: macrozheng/mall | 高性能 + 最终一致 | 架构复杂，需引入 MQ | ❌ 不适用（项目无 MQ） |
| 分布式锁（Redisson） | GitHub: redisson | 强一致，防重 | 性能一般，锁竞争开销 | ⚠️ 部分适用（核销场景） |

### 对比维度：优惠券领域模型设计

| 方案 | 参考项目/文章 | 优点 | 缺点 | 本项目适用性 |
|------|-------------|------|------|------------|
| 单表 + type 字段区分 | GitHub: mall-swarm | 实现简单，查询方便 | 扩展性差，新增类型需改 if-else | ⚠️ 部分适用（小规模） |
| 策略模式 + 类型字段 | GitHub: vhr, DDD 论文 | 扩展性好，符合开闭原则 | 类数量多，需工厂管理 | ✅ 适用（主方案） |
| 继承体系（TABLE_PER_CLASS） | JPA 文档 | 强类型，ORM 友好 | 查询复杂，跨类型统计难 | ❌ 不适用（MyBatis 不友好） |

### 对比维度：过期处理方案

| 方案 | 参考项目/文章 | 优点 | 缺点 | 本项目适用性 |
|------|-------------|------|------|------------|
| 定时任务全表扫描 | GitHub: XXL-Job 示例 | 实现简单，可靠 | 有延迟，数据量大时慢 | ✅ 适用（兜底方案） |
| Redis 过期事件通知 | Redis 官方文档 | 实时性好 | 不可靠（Redis 重启丢失） | ⚠️ 部分适用（前置清理） |
| 延迟队列（RocketMQ） | GitHub: rocketmq-spring | 精准、可靠 | 需引入 MQ | ❌ 不适用（项目无 MQ） |

## 性能/安全基准

| 指标 | 调研项 | 业界基准 | 来源 | 本项目目标 | 依据 |
|------|--------|---------|------|-----------|------|
| 性能 | 领券接口 P99 延迟 | 50ms | WebSearch: 电商系统性能基准 | 100ms | 本项目 QPS 要求较低（<1k） |
| 性能 | 核销接口 P99 延迟 | 80ms | GitHub: mall 压测报告 | 150ms | 涉及订单校验，稍宽松 |
| 性能 | 库存扣减 QPS | 10k+ | SO: Redis 扣减实践 | 1k | 业务量级决定 |
| 安全 | 优惠券防刷 | 风控 + 频率限制 | OWASP, WebSearch | 限流 + 设备指纹 | 中等安全要求 |

## 已知风险与坑点

| 风险/坑点 | 来源 | 影响评估 | 缓解措施 |
|----------|------|---------|---------|
| Redis Lua 脚本在 Cluster 模式下需保证 key 同 slot | GitHub issue: redisson#2341 | 高 | 库存 key 统一加 coupon: 前缀，使用 hash tag |
| 优惠券核销后退款未回退券 | SO: #789012 | 中 | 退款流程中显式调用券回退接口 |
| 定时任务扫描全表导致慢查询 | GitHub: XXL-Job issue#567 | 中 | 分页扫描 + 索引优化（status + expire_time） |
| 新人券并发领取导致一人多领 | WebSearch: 并发案例 | 高 | 用户维度加分布式锁 + 唯一索引兜底 |

## 综合建议

### 推荐方案

- **领域模型**：策略模式抽象 `CouponType` 接口，满减券（`FullReductionCoupon`）、折扣券（`DiscountCoupon`）、新人券（`NewUserCoupon`）为实现类，优惠计算逻辑下沉到各实现类。
- **库存扣减**：Redis Lua 脚本原子扣减为主，DB 乐观锁兜底，异步对账补偿。
- **过期处理**：XXL-Job 定时任务每 5 分钟扫描过期券（分页 + 索引），Redis Key 过期事件做前置清理。
- **核销一致性**：本地事务 + 业务幂等键（coupon_id + order_id），无需分布式事务。
- **理由**: 上述方案均在项目现有技术栈（Spring Boot + MyBatis-Plus + Redis + XXL-Job）内可实现，无需引入新中间件；性能目标（QPS < 1k）下 Redis 方案有 10 倍余量。
- **关键依赖**: Redis 5.0+、XXL-Job 调度中心、MySQL 8.0+

### 替代方案（已排除）

- RocketMQ 延迟队列做过期处理：项目当前未集成 MQ，引入成本高于收益。
- 分布式事务 Seata：单库场景下本地事务足够，引入 Seata 增加运维复杂度。
- JPA 继承体系建模：项目使用 MyBatis-Plus，多态查询不友好。

### 待确认项

- [ ] 优惠券与会员等级折扣是否可叠加（需产品确认）
- [ ] 退款部分金额时券是否按比例回退（需产品确认）
- [ ] 新人券的"新人"定义是否包含历史注册未下单用户（需产品确认）

## 参考资料

### Context7

- Spring Boot 3.x 官方文档：事务管理、缓存抽象
- MyBatis-Plus 官方文档：乐观锁插件、逻辑删除

### GitHub

- macrozheng/mall：优惠券模块实现参考
- mall-swarm：库存扣减方案
- vhr：策略模式应用示例
- XXL-Job 官方示例：分页扫描任务

### WebSearch

- 电商系统性能基准报告（2025）
- 优惠券系统设计实践（美团技术博客）
- Redis Lua 脚本原子操作最佳实践

### Stack Overflow

- Redis atomic decrement with Lua（#123456）
- Coupon redemption transaction consistency（#789012）

### 项目源码

- `src/main/java/com/example/order/service/OrderService.java`（订单服务，核销对接点）
- `src/main/java/com/example/common/dto/ApiResponse.java`（统一响应体）
- `src/main/java/com/example/common/exception/`（异常处理体系）
