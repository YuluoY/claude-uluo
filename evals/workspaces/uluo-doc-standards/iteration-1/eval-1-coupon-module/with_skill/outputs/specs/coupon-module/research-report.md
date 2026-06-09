# 优惠券模块 调研报告

> 日期: 2026-06-08 | 作者: AI | 关联 spec: [spec.md](./spec.md) | 状态: 已完成

## 调研目标

- 优惠券模块的数据模型如何设计，才能同时支持满减券（固定金额减免）和折扣券（百分比折扣）？
- 在并发场景下，如何保证优惠券库存扣减的正确性，防止超发？
- 优惠券使用条件（最低消费金额）的校验逻辑应该如何设计？
- Spring Boot + MyBatis 技术栈下，策略模式如何落地实现两种券类型的计算？
- 现有项目中 promotion/（满减活动）模块的设计风格是什么，新模块如何与之对齐？
- 业界同类型优惠券系统的性能基准（P99 延迟、QPS）是多少？

## 知识缺口与结论

| 缺口编号 | 知识缺口 | 调研深度 | 信息源 | 结论 | 可信度 |
|---------|---------|---------|--------|------|--------|
| KG-1 | 优惠券数据模型如何同时支持满减和折扣两种类型？ | L3 | Stack Overflow, GitHub, WebSearch | 使用单表 + type 枚举字段（fixed/reduction 和 percentage/discount），value 字段根据 type 解释；valid_from/valid_to 控制有效期；total_quantity 和 used_quantity 追踪库存 | 高 |
| KG-2 | 并发库存扣减如何防止超发？ | L3 | Medium, WebSearch, DZone | 推荐方案：MySQL 悲观锁（SELECT FOR UPDATE），事务内原子扣减。替代方案：Redis Lua 脚本原子递减。本项目选 MySQL 悲观锁——更简单，与现有技术栈一致 | 高 |
| KG-3 | 两种券类型的计算逻辑如何实现？ | L2 | GitHub, WebSearch | 策略模式（Strategy Pattern），定义 CouponCalculator 接口，分别实现 FixedAmountCalculator 和 PercentageCalculator | 高 |
| KG-4 | 现有 promotion/ 模块的设计风格 | L1 | 项目源码分析 | promotion/ 模块使用标准三层结构（controller/service/repository），Service 为接口+实现类模式。新模块应沿用此风格 | 高 |
| KG-5 | 优惠券系统性能基准 | L2 | WebSearch, Medium | 领券接口 P99 < 100ms，用券校验 P99 < 50ms（不含下单逻辑）；单表百万级数据需合理索引 | 中 |

## 技术可行性

| 调研项 | 结论 | 来源 | 可信度 | 备注 |
|--------|------|------|--------|------|
| Spring Boot + MyBatis 实现 SELECT FOR UPDATE | 可行 | MyBatis Mapper XML 支持 SELECT ... FOR UPDATE 语法 | 高 | 需要 @Transactional 确保事务边界 |
| 策略模式在 Spring Boot 中落地 | 可行 | GitHub 多个项目采用 @Service + Map 注入实现 | 高 | 通过 @Autowired Map<String, CouponCalculator> 自动注入 |
| Redis Lua 库存扣减 | 可行（备选） | Redis 官方文档 | 高 | 如未来需要更高并发，可平滑升级为 Redis 方案 |
| 与现有 OrderService 集成 | 可行 | 项目已有 promotion/ 模块提供集成参考 | 高 | 在 OrderService 中用券逻辑可与 promotion 折扣叠加计算 |

## 业界方案对比

### 对比维度：并发库存扣减方案

| 方案 | 参考项目/文章 | 优点 | 缺点 | 本项目适用性 |
|------|-------------|------|------|------------|
| MySQL 悲观锁 (SELECT FOR UPDATE) | Medium: "Preventing Double Stock Deduction" | 简单可靠，事务内原子，无额外依赖 | 高并发下锁等待，性能瓶颈 | ✅ 适用——技术栈一致，实现简单 |
| MySQL 乐观锁 (version 字段) | DZone: "Pessimistic vs Optimistic Locking" | 无锁等待，读多写少场景性能好 | 冲突时需重试，用户体验差（409 重试） | ⚠️ 部分适用——可作补充方案 |
| Redis Lua 脚本 | Redis 官方文档, Medium: "Never Oversell Your Coupons" | 高性能，真正的原子操作 | 需要 Redis 基础设施，增加系统复杂度 | ❌ 暂不采用——项目未引入 Redis，过度设计 |
| 库存独立服务（TCC） | 分布式事务方案 | 最终一致性，高可用 | 实现复杂，需要消息队列和补偿 | ❌ 不适用——本项目为单体架构 |

### 对比维度：优惠券数据建模

| 方案 | 参考项目/文章 | 优点 | 缺点 | 本项目适用性 |
|------|-------------|------|------|------|
| 单表 + type 枚举 | Stack Overflow: "Coupon database design" | 简单直接，查询高效，与 promotion 模块风格一致 | 不同类型无法使用专门的约束字段（但可控制 NULL） | ✅ 适用——优惠券类型少，字段差异不大 |
| 多态关联（优惠券基表 + 类型子表） | 软件工程 StackExchange | 扩展性强，类型字段独立 | 查询复杂（JOIN），代码量增加 | ❌ 不适用——仅有两种类型，过度设计 |
| JSON 字段存储类型相关参数 | Medium: "Scalable Coupon Management" | 灵活，新增类型无需改表 | 数据库约束弱，MyBatis 映射复杂 | ⚠️ 部分适用——不适合本项目 MyBatis 风格 |

### 对比维度：优惠券计算策略

| 方案 | 参考项目/文章 | 优点 | 缺点 | 本项目适用性 |
|------|-------------|------|------|------|
| 策略模式 + Spring 依赖注入 | GitHub UVgur/Coupon-Management-System, Medium CodeX | 符合开闭原则，易扩展，Spring 原生支持 | 类型多时 Map 注入键管理复杂 | ✅ 适用——领域清晰，与项目现有模式匹配 |
| 工厂模式 | 常见设计模式实现 | 简单直观 | 新增类型需修改工厂类（违反开闭原则） | ⚠️ 次选 |
| if-else 分支 | 最简单实现 | 零学习成本 | 可维护性差，代码膨胀 | ❌ 不适用——需保证可扩展性 |

## 性能/安全基准

| 指标 | 调研项 | 业界基准 | 来源 | 本项目目标 | 依据 |
|------|--------|---------|------|-----------|------|
| 性能 | 领券接口 P99 延迟 | < 100ms | Medium 同类型系统 | < 200ms（含数据库操作） | 单体架构，单次 INSERT |
| 性能 | 用券校验 P99 延迟 | < 50ms | Medium 同类型系统 | < 100ms（含 SELECT FOR UPDATE） | 悲观锁增加等待时间 |
| 性能 | 并发领券 QPS | 500-1000 | WebSearch 单体架构评估 | 300（初期） | 初期用户量预估 |
| 性能 | 优惠券列表查询 P99 | < 200ms | 常见后台系统 | < 300ms | 带分页 + 条件过滤 |
| 安全 | 权限控制 | 管理员 vs 用户角色分离 | OWASP | 管理员接口需认证，用户只能查自己的券 | 沿用项目已有认证体系 |
| 安全 | 券码防暴力破解 | 随机码 + 速率限制 | OWASP | 8 位随机字母数字码，同一 IP 领券频率限制 | 基本安全措施 |

## 已知风险与坑点

| 风险/坑点 | 来源 | 影响评估 | 缓解措施 |
|----------|------|---------|---------|
| SELECT FOR UPDATE 在大事务中导致锁等待过长 | Medium: "Preventing Double Stock Deduction" | 中 | 用券逻辑保持事务尽可能小——先校验，最后扣库存；设置锁超时 |
| 优惠券到期时间与服务器时区不一致 | Stack Overflow 多个 Q&A | 低 | 统一使用 UTC 时间存储，服务层统一转换 |
| 同一订单重复用券 | 业务逻辑 | 中 | 在订单-优惠券关联表中加唯一约束 (order_id) |
| MyBatis Mapper XML 中 FOR UPDATE 语法兼容性 | MyBatis 文档, SO | 低 | MySQL 完全支持，项目中需确认数据库版本 ≥ 5.7 |

## 综合建议

### 推荐方案

**推荐采用"单表 + MySQL 悲观锁 + 策略模式"组合方案。**

- **数据模型**: 单表 `coupons`（type 枚举字段 + value 通用金额字段）+ 关联表 `user_coupons`（用户持有的券）+ 关联表 `order_coupons`（订单使用记录）
- **并发扣减**: MySQL 悲观锁 `SELECT ... FOR UPDATE` 在事务中原子扣减 `used_quantity` 字段，事务尽可能短
- **计算策略**: 策略模式，`CouponCalculator` 接口 + `FixedAmountCalculator` + `PercentageCalculator`
- **集成方式**: 新增 `CouponService`，在 `OrderService.placeOrder()` 中注入调用

- **理由**: 
  1. 与项目现有 promotion 模块的技术栈和代码风格一致，降低认知负担
  2. MySQL 悲观锁足够应对初期并发量，无需引入 Redis
  3. 策略模式天然支持两种券类型的计算逻辑分离，未来可扩展

- **关键依赖**: 
  - MySQL InnoDB 引擎（支持行级锁）
  - @Transactional 事务管理正常工作
  - 数据库字段 NOT NULL 约束确保数据完整性

### 替代方案（已排除）
- **Redis 库存扣减**: 当前未引入 Redis，初期过度设计，可留为后期优化方向
- **独立库存服务**: 项目为单体架构，不符合微服务拆分条件
- **JSON 多态字段**: 与 MyBatis 映射风格不一致，不利于 SQL 查询和索引优化

### 待确认项
- [ ] 项目是否已有认证模块可以复用（管理员/用户角色区分）
- [ ] 优惠券是否支持"每人限领一张"的规则（如需要，加 user_coupons 的 UNIQUE KEY）
- [ ] 满减券和折扣券是否允许设置使用上限（如"最多减 50 元"）
- [ ] 优惠券库存是否需要预加载到缓存（如 Redis）——初期建议不加

## 参考资料

### WebSearch
- Stack Overflow: "How can I deal with Coupon database design?" - 优惠券 DB 设计参考
- Software Engineering StackExchange: "Design for an e-commerce site supporting discount coupons" - 电商优惠券架构设计
- Medium (Mustafa Mustafayev): "Never Oversell Your Coupons: Redis & Spring Boot" - 高并发优惠券方案
- Medium (Arif Rahman): "Preventing Double Stock Deduction: A Spring Boot Warehouse Management System" - 并发库存扣减实战
- DZone: "Pessimistic and Optimistic Locking With MySQL" - 悲观锁 vs 乐观锁对比
- Redis 官方文档: "Reserve inventory in real time with Redis" - Redis 库存方案
- Medium (Goutham): "Implementing the Strategy Design Pattern in Spring Boot" - Spring Boot 策略模式落地

### GitHub
- UVgur/Coupon-Management-System - Spring Boot + Angular 优惠券管理系统
- XZizeR/CouponRest - Java Spring Boot 优惠券 REST API
- noyTalker/CouponSystem-SpringBootProject - 优惠券系统后端

### 项目源码
- `src/main/java/com/shop/promotion/` - 满减活动模块（锚点模块）
- `src/main/java/com/shop/controller/OrderController.java` - 订单接口
- `src/main/java/com/shop/service/OrderService.java` - 订单服务
- `src/main/java/com/shop/domain/Order.java` - 订单实体
- `src/main/java/com/shop/common/ApiResponse.java` - 统一响应体
