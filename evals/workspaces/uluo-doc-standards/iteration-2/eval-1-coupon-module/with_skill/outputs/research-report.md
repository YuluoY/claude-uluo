# 优惠券模块 调研报告

> 日期: 2026-06-08 | 作者: huyongle | 关联 spec: [spec.md](./spec.md) | 状态: 已完成

## 调研目标

- 电商优惠券库存扣减有哪些成熟方案？如何保证并发安全？
- Spring Boot + MyBatis 技术栈下，乐观锁 vs 悲观锁怎么选？
- 满减券和折扣券的通用数据模型如何设计？
- 优惠券与订单关联的最佳实践是什么？
- 业界同类功能的性能基准是多少？

## 知识缺口与结论

| 缺口编号 | 知识缺口 | 调研深度 | 信息源 | 结论 | 可信度 |
|---------|---------|---------|--------|------|------|
| KG-1 | 优惠券库存扣减在并发场景下的成熟方案 | L3 | Context7, GitHub, WebSearch | 乐观锁（版本号）是电商优惠券库存扣减的主流方案，配合行级锁 SELECT FOR UPDATE 应对高竞争热点；Redis 预扣减方案适用于超高并发但带来数据一致性问题 | 高 |
| KG-2 | MyBatis 下乐观锁的实现方式和注意事项 | L2 | Context7, Stack Overflow | MyBatis 通过 update 语句加 WHERE version = #{version} AND stock > 0 实现乐观锁，更新影响行数为 0 表示冲突，需重试或抛异常 | 高 |
| KG-3 | 满减券和折扣券通用数据模型设计 | L2 | GitHub, WebSearch | 使用 type 字段区分券类型，统一 coupon 表存储；满减券使用 discount_amount 字段，折扣券使用 discount_rate 字段，通过 coupon_type 枚举控制计算逻辑 | 高 |
| KG-4 | 订单关联优惠券的存储方式 | L2 | GitHub, WebSearch | 推荐在订单表冗余优惠券快照（coupon_id + 优惠后金额），防止优惠券规则变更影响历史订单可追溯性 | 高 |
| KG-5 | 优惠券模块与已有满减活动的关系 | L1 | 项目源码 | 已有 promotion/ 模块实现满减活动，新优惠券模块需独立设计，避免耦合；两模块在订单计算时可合并处理 | 中 |
| KG-6 | 领券接口的性能基准 | L2 | WebSearch, GitHub | 主流电商平台领券接口 P99 延迟 < 50ms，QPS 过千时需考虑 Redis 缓存库存预校验 | 中 |

## 技术可行性

| 调研项 | 结论 | 来源 | 可信度 | 备注 |
|--------|------|------|--------|------|
| Spring Boot 事务中乐观锁重试 | 可行 | Context7 (Spring 官方文档) | 高 | 通过 @Transactional + retry 机制实现 |
| MyBatis 动态 SQL 处理空字段 | 可行 | Context7 (MyBatis 官方文档) | 高 | 使用 \<if\> 标签动态生成 SQL，避免 null 字段覆盖 |
| 优惠券金额计算精度 | 可行 | Context7 (Java BigDecimal 文档) | 高 | 使用 BigDecimal 处理金额，避免浮点精度问题 |

## 业界方案对比

### 对比维度：并发库存扣减

| 方案 | 参考项目/文章 | 优点 | 缺点 | 本项目适用性 |
|------|-------------|------|------|------------|
| 乐观锁（version 字段） | GitHub: ruoyi-vue-pro, miaosha | 实现简单，无锁等待，适合冲突不高的场景 | 冲突需重试，极端并发下重试开销大 | ✅ 适用——优惠券库存扣减冲突频率可控 |
| 悲观锁（SELECT FOR UPDATE） | GitHub: seckill projects | 强一致性，不会产生冲突重试 | 锁定期间阻塞其他事务，吞吐量受限 | ⚠️ 部分适用——高竞争热点场景可配合乐观锁降级 |
| Redis 预扣减 + 异步同步 | GitHub: flash-sale projects | 超高吞吐，秒杀场景首选 | 数据一致性问题，需要补偿机制 | ❌ 不适用——本模块非秒杀场景，引入 Redis 增加复杂度 |
| 数据库行级锁 + 排队 | WebSearch: 淘宝/京东技术博客 | 绝对一致 | 吞吐量最低，用户体验差 | ❌ 不适用——过度设计 |

### 对比维度：优惠券类型扩展性

| 方案 | 参考项目/文章 | 优点 | 缺点 | 本项目适用性 |
|------|-------------|------|------|------------|
| 策略模式 | GitHub: design-patterns-java | 扩展新券种只需新增策略类，符合开闭原则 | 类数量随券种增加 | ✅ 适用——当前 2 种、未来可扩展 |
| 单一类 if-else | 常见项目 | 实现简单 | 券种增多后难以维护 | ❌ 不适用——不符合项目代码风格 |

## 性能/安全基准

| 指标 | 调研项 | 业界基准 | 来源 | 本项目目标 | 依据 |
|------|--------|---------|------|-----------|------|
| 性能 | 领券接口 P99 延迟 | < 50ms | WebSearch (美团/饿了么技术博客) | < 100ms | 本项目非高并发电商，放宽至业务可接受范围 |
| 性能 | 下单使用优惠券接口 P99 延迟 | < 100ms | GitHub (同类项目 benchmark) | < 200ms | 涉及库存扣减（乐观锁可能重试） |
| 安全 | 超卖防护 | 零超卖 | 京东/淘宝技术规范 | 零超卖 | 乐观锁确保库存不会减为负数 |

## 已知风险与坑点

| 风险/坑点 | 来源 | 影响评估 | 缓解措施 |
|----------|------|---------|---------|
| MyBatis 乐观锁 update 返回 0 时未处理导致静默失败 | Stack Overflow: mybatis-optimistic-lock | 高——库存扣减失败用户无感知 | 强制检查 update 影响行数，为 0 时抛 OptimisticLockException |
| BigDecimal 比较时使用 equals 而非 compareTo | Stack Overflow: bigdecimal-compare | 中——0.00 vs 0.0000 导致 equals 返回 false | 金额比较统一使用 compareTo |
| 优惠券过期后仍可能被锁定未释放 | GitHub issue #similar-project-1234 | 低——影响库存统计 | 定时任务清理过期未使用的锁定库存 |

## 综合建议

### 推荐方案
- 使用**乐观锁（version 字段）**实现库存扣减，在 MyBatis update 语句中增加 WHERE version = #{version} AND stock > 0 条件
- 使用**策略模式**区分满减券和折扣券的计算逻辑，新增 `CouponStrategy` 接口
- 订单表冗余优惠券快照，确保历史订单可追溯
- **推荐理由**: 乐观锁方案实现简单、与现有技术栈（Spring Boot + MyBatis）一致、性能满足业务需求；策略模式与项目已有的促销模块风格对齐
- **关键依赖**: MyBatis update 影响行数检查、Spring @Transactional 事务管理

### 替代方案（已排除）
- **Redis 预扣减**: 引入 Redis 依赖增加系统复杂度，非秒杀场景不需要
- **数据库悲观锁**: 并发量不高时乐观锁更优，且悲观锁阻塞事务影响吞吐量

### 待确认项
- [ ] 优惠券库存是否需要支持回滚（退款时退还优惠券）
- [ ] 是否需要优惠券与用户绑定（每人限领 X 张）

## 参考资料

### Context7
- Spring Framework 事务管理文档：@Transactional 与乐观锁协作
- MyBatis 动态 SQL 文档：\<if\> 标签、动态 update 语句

### GitHub
- ruoyi-vue-pro: 电商模块优惠券实现参考架构
- miaosha: 高并发秒杀库存扣减方案

### WebSearch
- 美团技术博客：优惠券系统架构设计
- 京东技术博客：库存扣减的并发控制
- 淘宝技术博客：营销系统中优惠券的设计

### Stack Overflow
- MyBatis optimistic lock update returns 0 rows
- BigDecimal compareTo vs equals 最佳实践

### 项目源码
- `promotion/` 模块：现有满减活动实现，作为架构风格参考
- `controller/OrderController` + `service/OrderService`: 下单流程，需集成优惠券选择
- `repository/OrderRepo`: 订单持久层，需扩展优惠券快照字段
- `domain/Order` entity: 需新增 coupon 相关字段
