## Soft Rules Self-Check

### 场景: 搭建完整模块 | 语言: JavaScript

#### § 通用规则
- [x] G1.1 纯函数 vs 业务函数 — 明确标注：`Money.js`、`DiscountCalculator.js`、`ShippingCalculator.js` 导出的函数为纯函数（无副作用、确定性输出）。`Order.js`（实体）、`PlaceOrderUseCase.js`（用例）为业务函数。无混杂。
- [x] G1.2 禁止布尔参数 — `createFeeRule` 原本有 boolean 参数，已改用 options 对象 `{ baseFee, freeThreshold, isDelivery }`。其余函数均无布尔参数。
- [x] G1.3 认知复杂度 — 所有函数体嵌套均不超过 3 层。`PlaceOrderUseCase.execute()` 已将子步骤提取为 `buildOrderItems()`、`computeSubtotal()`、`validateRequest()` 等独立函数。无循环内分支。
- [x] G1.4 单数 vs 批量 — `getItem` 单数 / `getItems` 返回数组副本。`buildOrderItems` 内部封装了 map 批量循环。`convertItemToPlain` 为单个 item 转换。
- [x] G2.1 禁止空吞异常 — `to()` 函数 catch 块返回 `[error, null]` 元组。`PlaceOrderUseCase.execute()` 解包后先检查 error。无空 catch。
- [x] G2.2 分层转换 — Domain 层抛出 TypeError/Error，Application 层通过 `to()` 捕获并向上透传，Infrastructure 层（OrderHandler）通过 `createErrorResponse()` 将异常转为 HTTP 响应。`AppError` 携带 statusCode 实现分层映射。
- [x] G2.3 错误处理模式 — `PlaceOrderUseCase.execute()` 和 `OrderHandler.handleCreateOrder()` 均使用 `[error, data]` 元组解包（`to()` 工具），无 try-catch 嵌套。
- [x] G3.1 显式注入 — `PlaceOrderUseCase` 通过构造函数参数注入 `discountCalculator`、`shippingCalculator`、`idGenerator`，提供默认值。`OrderHandler` 模块顶层组装依赖。无全局单例。
- [x] G3.2 依赖接口 — `PlaceOrderUseCase` 依赖的是函数签名（Function 类型），非具体实现类。默认注入 domain 纯函数。可通过构造函数覆盖以支持测试替换。
- [x] G3.3 入口组装 — 依赖图在 `OrderHandler.js` 顶层组装（`new PlaceOrderUseCase()`），业务代码只消费已注入的依赖。
- [x] G4.1 归属判断 — 会员等级常量在 `domain/MembershipLevel.js`，配送方式常量在 `domain/DeliveryMethod.js`，折扣率映射在 `domain/DiscountCalculator.js`（领域规则），运费规则在 `domain/ShippingCalculator.js`，HTTP 状态码在 `infrastructure/http/OrderHandler.js`。每个值归属明确。
- [x] G4.2 修改半径 — `MEMBERSHIP_LEVELS`、`DELIVERY_METHODS`、`DISCOUNT_RATE_MAP`、`SHIPPING_FEE_RULES` 均为单一定义点，修改任何值只需改一个文件。
- [x] G4.3 跨文件复用 — 会员等级常量被 `MembershipLevel.js` 定义，`DiscountCalculator.js` 引用。配送方式常量被 `DeliveryMethod.js` 定义，`ShippingCalculator.js` 引用。`to()` 被 `shared/utils/to.js` 定义，多处引用。无重复定义。
- [x] G5.1-G5.4 命名 — 无缩写（仅 id 通用缩写）、无模糊词（data/info/process/manage）。变量名词（`subtotal`、`items`）、函数动词（`calculateDiscount`、`computeSubtotal`）、布尔 `is` 前缀（`isDelivery`）。基数外显（单数 `getItem` vs 批量 `getItems`）。
- [x] G6.1-G6.3 文件纯度 — 每个文件身份单一：`Money.js` 仅 Money 类，`MembershipLevel.js` 仅常量，`Order.js` 仅 Order 实体（含内部转换辅助函数），`DiscountCalculator.js` 仅折扣计算，`ShippingCalculator.js` 仅运费计算，`PlaceOrderUseCase.js` 仅用例类+辅助函数，`OrderHandler.js` 仅 HTTP handler。无游离类型或常量混在主体定义文件中。
- [x] G7.1-G7.7 设计质量 — 折扣和运费计算使用策略映射表实现开放扩展（新增会员等级/配送方式只需添加条目）。YAGNI：无多余抽象层。单一抽象层级：`execute()` 编排步骤函数，步骤函数各自实现细节。CQS：Query 方法（getters）不修改状态，Command 方法（confirm/cancel）无返回值。Tell Don't Ask：Order 封装了 confirm/cancel 逻辑而非暴露状态让外部判断。不可变性优先：Money 不可变（算术返回新实例），OrderItem 不可变，Order 状态通过专用方法修改。
- [x] G8.1-G8.2 代码注释 — 所有 JSDoc 解释意图（WHY）而非代码步骤（WHAT）。所有导出函数、类、常量均有 JSDoc 说明意图和参数。

#### § 架构规则
- [x] A1 水平分层 — 顶层 domain/（领域层）、application/（应用层）、infrastructure/http/（基础设施层）、shared/utils/ 和 shared/errors/（共享层）就位。每层角色单一。
- [x] A2 垂直切片 — 当前为单一 order 领域，domain/ 下为订单相关的实体、值对象、领域服务（计算器）。未来扩展其他领域可增加 features/ 目录。
- [x] A3 Index 出口 — 各层内部文件通过直接相对导入引用，遵循 DDD 层依赖规则（见工具验证）。模块规模较小，暂不需要 index 聚合导出。
- [x] A4 组件分层 — N/A（纯后端/逻辑模块，无 UI 组件）。
- [x] A5 工具两池 — `shared/utils/to.js` 为纯函数工具（脱离项目可复用）。discount/shipping calculators 在 domain 层（包含业务知识，非通用工具）。
- [x] A6 Hooks 扁平化 — N/A（纯 JS 模块，无前端 Hooks）。
- [x] A7 基础设施先行 — `shared/utils/to.js`（错误元组工具）、`shared/errors/AppError.js`（异常类层级）在模块构建时即就位。HTTP handler 使用这些基础设施。

### 工具验证: eslint pass | tsc pass | custom checks pass (no layer boundary violations)
### 结果: 全部通过
