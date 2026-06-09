# 优惠券模块 验收报告

> 日期: 2026-06-08 | 作者: AI | 关联: [spec.md](./spec.md) | [CHANGELOG](../../CHANGELOG.md)

## 验收概要

| 项目 | 结果 |
|------|------|
| 总验收项 | 12 |
| 通过 | 0 |
| 未通过 | 0 |
| 待验证 | 12 |
| 通过率 | N/A (代码未实现) |
| 结论 | ⏳ 待代码实现后重新验收 |

> 本报告在代码实现前产出，作为验收清单的预置版本。所有 AC 将在 Phase 4 代码完成后逐条验证并更新。

## 验收标准逐条对照

### 功能验收

- [ ] **[AC-1]**: 管理员可以成功创建满减券活动（POST /api/admin/coupons，type=FIXED），返回 200 并包含完整信息
  - **验证方式**: 集成测试 (CouponAdminControllerTest)
  - **测试用例**: 提交 type=FIXED, value=1000, minAmount=5000, totalQuantity=100 的创建请求
  - **预期结果**: HTTP 200, 返回 JSON 包含 id/name/type=FIXED/value=1000/status=ACTIVE
  - **证据**: 待 T4.1 执行后补充

- [ ] **[AC-2]**: 管理员可以成功创建折扣券活动（POST /api/admin/coupons，type=PERCENTAGE），返回 200 并包含完整信息
  - **验证方式**: 集成测试 (CouponAdminControllerTest)
  - **测试用例**: 提交 type=PERCENTAGE, value=80, minAmount=5000, totalQuantity=100, discountCeiling=2000
  - **预期结果**: HTTP 200, 返回 JSON 包含 type=PERCENTAGE/value=80/discountCeiling=2000
  - **证据**: 待 T4.1 执行后补充

- [ ] **[AC-3]**: 管理员可以分页查看优惠券列表（GET /api/admin/coupons），支持按状态筛选
  - **验证方式**: 集成测试 (CouponAdminControllerTest)
  - **测试用例**: 先创建若干不同状态的券，分别按 PENDING/ACTIVE/ENDED 筛选查询
  - **预期结果**: 筛选结果与预期一致，分页参数生效
  - **证据**: 待 T4.1 执行后补充

- [ ] **[AC-4]**: 管理员可以终止进行中的活动（PUT /api/admin/coupons/{id}/terminate），状态变更即时生效
  - **验证方式**: 集成测试 (CouponAdminControllerTest)
  - **测试用例**: 创建 ACTIVE 活动 → 调用 terminate → 查询验证 status=TERMINATED
  - **预期结果**: 返回 200，再次查询确认状态变更
  - **证据**: 待 T4.1 执行后补充

- [ ] **[AC-5]**: 用户可以查看自己持有的可用优惠券（GET /api/coupons/available）
  - **验证方式**: 集成测试 (CouponControllerTest)
  - **测试用例**: 给用户发放券 → 查询可用券列表 → 验证返回该券
  - **预期结果**: 返回列表中包含该券，不包含已过期/已使用的券
  - **证据**: 待 T4.1 执行后补充

- [ ] **[AC-6]**: 用户下单时选用满减券成功（订单金额 10000分，满减券满 8000 减 1000，实际支付 9000）
  - **验证方式**: 集成测试 (OrderServiceCouponTest)
  - **测试用例**: 创建 10.00 元订单 + 满 8.00 减 1.00 券 → 调用 placeOrder
  - **预期结果**: 订单最终金额 = 9.00 元，优惠金额 = 1.00 元
  - **证据**: 待 T4.1 执行后补充

- [ ] **[AC-7]**: 用户下单时选用折扣券成功（订单金额 10000分，8折券，实际支付 8000）
  - **验证方式**: 集成测试 (OrderServiceCouponTest)
  - **测试用例**: 创建 100.00 元订单 + 8折券（无 ceiling）→ 调用 placeOrder
  - **预期结果**: 订单最终金额 = 80.00 元，优惠金额 = 20.00 元
  - **证据**: 待 T4.1 执行后补充

- [ ] **[AC-8]**: 并发测试：100 线程同时用库存为 1 的券，仅 1 成功
  - **验证方式**: 并发测试 (CouponServiceConcurrencyTest)
  - **测试用例**: 100 线程并发调用 validateAndDeduct，券库存=1
  - **预期结果**: success=true 的计数 == 1；coupons.used_quantity == 1；重复 5 次结果一致
  - **证据**: 待 T4.2 执行后补充

- [ ] **[AC-9]**: 不满足最低消费时用券返回明确错误码 COUPON_MIN_AMOUNT_NOT_MET
  - **验证方式**: 单元测试 (CouponServiceTest)
  - **测试用例**: 订单金额 500分 + 满 1000分 的券 → validateAndDeduct
  - **预期结果**: DeductResult.success=false, errorCode=COUPON_MIN_AMOUNT_NOT_MET
  - **证据**: 待 T4.1 执行后补充

- [ ] **[AC-10]**: 优惠券已过期时用券返回错误码 COUPON_EXPIRED
  - **验证方式**: 单元测试 (CouponServiceTest)
  - **测试用例**: 创建已过期的券 → validateAndDeduct
  - **预期结果**: DeductResult.success=false, errorCode=COUPON_EXPIRED
  - **证据**: 待 T4.1 执行后补充

- [ ] **[AC-11]**: 优惠券已使用时用券返回错误码 COUPON_ALREADY_USED
  - **验证方式**: 单元测试 (CouponServiceTest)
  - **测试用例**: 同一张券连续调用两次 validateAndDeduct
  - **预期结果**: 第一次 success=true，第二次 success=false, errorCode=COUPON_ALREADY_USED
  - **证据**: 待 T4.1 执行后补充

- [ ] **[AC-12]**: 折扣券计算结果精确到分（小数点后两位），向上取整保证商家利益
  - **验证方式**: 单元测试 (CouponCalculatorTest)
  - **测试用例**: 订单金额 9999分 × 85% 折扣率 → 计算优惠金额
  - **预期结果**: 优惠金额 = CEILING(9999 × 0.15) = 1500（实际支付 8499）
  - **证据**: 待 T4.1 执行后补充

### 非功能性验收

- [ ] **性能: 用券校验+扣减 P99 < 200ms**
  - **验证方式**: 压力测试 (JMeter / 或代码内 System.currentTimeMillis 埋点)
  - **预期结果**: 100 次用券请求，P99 延迟 < 200ms
  - **证据**: 待性能测试后补充

- [ ] **安全: 管理端接口需管理员权限**
  - **验证方式**: 集成测试——无权限用户调用 POST /api/admin/coupons
  - **预期结果**: 返回 401 或 403
  - **证据**: 待与认证框架集成后验证

- [ ] **安全: 用户不能越权使用他人券**
  - **验证方式**: 集成测试——用户 A 尝试使用用户 B 的 user_coupon ID
  - **预期结果**: 返回 COUPON_NOT_OWNED 错误
  - **证据**: 待 T4.1 执行后补充

## 测试结果汇总

| 测试层级 | 总数 | 通过 | 失败 | 跳过 | 覆盖率 |
|---------|------|------|------|------|--------|
| 单元测试 (Calculator) | 待执行 | 0 | 0 | 0 | N/A |
| 单元测试 (Service) | 待执行 | 0 | 0 | 0 | N/A |
| 集成测试 (Controller) | 待执行 | 0 | 0 | 0 | N/A |
| 集成测试 (OrderService) | 待执行 | 0 | 0 | 0 | N/A |
| 并发测试 | 待执行 | 0 | 0 | 0 | N/A |

> 代码实现后更新此表。

## 变更范围审查

### 文件变更统计

- 新增文件: ~20 个（Java 类、Mapper XML、DDL）
- 修改文件: ~3 个（OrderService.java, Order.java, CHANGELOG.md）
- 删除文件: 0 个
- 预估代码行数: +1500 ~ +2000

### 是否有计划外的变更

- [ ] 没有
- [x] 待确认: 代码实现阶段可能发现额外的集成点需要调整

## 已知问题 / 技术债

| 问题 | 严重程度 | 影响 | 计划处理 |
|------|---------|------|---------|
| 悲观锁在高并发下可能成为瓶颈 | 中 | QPS 超过 500 时性能下降明显 | 监控 DB 慢查询；如需扩容，迁移到 Redis Lua 方案 |
| 用户自助领券未实现 | 低 | 运营需手动发放 | 下个迭代实现自助领券接口 |
| 优惠券与满减活动叠加规则未穷举所有边界情况 | 低 | 极端叠加可能出现 0 元订单 | 代码中有兜底 max(1, ...)，暂可接受 |

## 结论

- [ ] ✅ 通过: 所有验收标准已满足，可以上线
- [ ] ⚠️ 有条件通过: 本报告为验收清单预置版本，所有 AC 待 Phase 4 代码实现完成后逐条验证
- [x] ❌ 不通过: 代码尚未实现，所有验收标准待验证。本报告作为验收清单模板，代码实现后需重新验收并更新结论
