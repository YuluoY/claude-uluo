# Code Review: domain/order/order.entity.ts

## 场景: Review | 语言: TypeScript | 权重: MEDIUM

---

## 问题清单

### 问题 1: domain 层 import 了 infrastructure 层 (MUST)

**违反规则:**
- A5: 水平分层 — Domain MUST NOT import from infrastructure layer (architecture.md)
- DDD 层边界: domain 是核心业务层，不能依赖基础设施实现细节

**代码表现:**
```typescript
import { OrderRepositoryImpl } from '../infrastructure/order.repository.impl'
```

**严重程度:** 阻断级。污染了领域模型的纯净性，让 domain entity 与具体技术实现（数据库、ORM）耦合。

**修复方向:**
1. 删除该 import 语句。
2. 在 domain 层定义仓储接口 `domain/order/order.repository.ts`:
```typescript
export interface OrderRepository {
  save(order: Order): Promise<void>
  findById(id: string): Promise<Order | undefined>
}
```
3. entity 通过构造函数参数接收 `OrderRepository` 接口（依赖倒置），而非直接 import 实现:
```typescript
export class Order {
  constructor(private readonly orderRepo: OrderRepository) {}
}
```
4. infrastructure 层的 `OrderRepositoryImpl` implements `OrderRepository`，在程序入口（如 main.ts / setup.ts）组装依赖图。

---

### 问题 2: 实体方法里直接 new 数据库仓储实例 (MUST)

**违反规则:**
- G3.1 (显式注入): 依赖通过构造函数参数或函数参数显式传入，无全局单例引用
- G3.2 (依赖接口): 依赖的是抽象接口还是具体实现？业务代码中有 `new XxxRepository()` 这类直接构造吗
- G3.3 (入口组装): 依赖图是否在程序入口组装，业务代码只消费已注入的依赖
- G7.7 (不可变性优先): 实体内部构造外部依赖，破坏了实体的内聚性和可测试性

**代码表现:**
```typescript
// 在 entity 方法内部
const repo = new OrderRepositoryImpl()
await repo.save(this)
```

**严重程度:** 阻断级。实体失去可测试性（单元测试被迫连接真实数据库），违反依赖倒置原则。

**修复方向:**
1. 从 entity 方法中删除所有 `new XxxRepositoryImpl()` 调用。
2. 仓储实例通过构造函数注入 entity（见问题 1 修复）。
3. 或者，如果该操作属于领域服务（跨聚合操作），可抽取到 `domain/order/order.service.ts`，服务接收注入的仓储:
```typescript
export class OrderDomainService {
  constructor(private readonly orderRepo: OrderRepository) {}
  async placeOrder(order: Order): Promise<void> {
    // 领域逻辑在此
    await this.orderRepo.save(order)
  }
}
```
4. 依赖图在程序入口组装:
```typescript
// main.ts / setup.ts
const orderRepo = new OrderRepositoryImpl(dbConnection)
const orderService = new OrderDomainService(orderRepo)
```

---

### 问题 3: 空 catch (e) {} 块吞掉异常 (MUST)

**违反规则:**
- G2.1 (禁止空吞异常): 每个 catch 块是否至少做了日志记录或转换重抛

**代码表现:**
```typescript
try {
  await this.orderRepo.save(this)
} catch (e) {}
```

**严重程度:** 阻断级。异常被静默吞掉，调用方不知道操作失败，数据不一致无法排查。

**修复方向:**
1. 最低限度：记录日志:
```typescript
catch (error) {
  logger.error('Failed to save order', { orderId: this.id, error })
  throw error // 或转换为领域异常后重抛
}
```
2. 推荐：使用 await-to-js 模式（`[error, data]` 元组）替代 try-catch 嵌套:
```typescript
import { to } from '@/shared/utils/to'

const [saveError] = await to(this.orderRepo.save(this))
if (saveError) {
  throw new OrderPersistenceError('Failed to save order', { cause: saveError })
}
```
3. 异常应在 domain -> application -> interface 逐层转换，不向上泄漏第三方原始异常（见 G2.2）。

---

### 问题 4: 使用 any 类型标注 (MUST)

**违反规则:**
- TypeScript 禁令清单: `any` 零容忍 (typescript.md)
- G5.2 (禁止模糊词): any 本质上是"放弃类型约束"

**代码表现:**
```typescript
function parse(data: any): any { ... }
// 或
const result: any = someOperation()
```

**严重程度:** 阻断级。`any` 使 TypeScript 类型系统完全失效，无法在编译期发现类型错误。

**修复方向:**
1. 输入参数用泛型约束:
```typescript
function parse<T>(data: string): T {
  return JSON.parse(data) as T
}
```
2. 如果确实需要表示"不确定类型"，用 `unknown` 并配合类型守卫窄化:
```typescript
function process(input: unknown): void {
  if (typeof input === 'string') {
    // input 在此分支被窄化为 string
  }
}
```
3. 如果是外部 API 返回的未知结构，定义明确的接口并用 `zod` / `yup` 等 schema 库校验。

---

## Soft Rules Self-Check

### 场景: Review | 语言: TypeScript

#### 通用规则

- [ ] **G1.1 纯函数 vs 业务函数** — entity 文件包含了基础设施构造（new 仓储实例），身份混杂，需要拆分
- [ ] **G1.2 禁止布尔参数** — 无法从描述判断，需看具体参数列表
- [ ] **G1.3 认知复杂度** — 无法从描述判断，需看具体函数体
- [ ] **G1.4 单数 vs 批量** — 无法从描述判断
- [x] **G2.1 禁止空吞异常** — 违反: 存在空 `catch (e) {}` 块
- [x] **G2.2 分层转换** — 违反: entity 直接调用 infrastructure 层，异常没有分层转换机制
- [x] **G2.3 错误处理模式** — 违反: 使用 try-catch 嵌套而非 `[error, data]` 元组解包
- [x] **G3.1 显式注入** — 违反: 在 entity 方法内直接 `new OrderRepositoryImpl()`，依赖不是通过参数显式传入
- [x] **G3.2 依赖接口** — 违反: 依赖具体实现 `OrderRepositoryImpl` 而非抽象接口 `OrderRepository`
- [x] **G3.3 入口组装** — 违反: 依赖图在 entity 内部构造，未在程序入口组装
- [ ] **G4.1 归属判断** — 无法从描述判断
- [ ] **G4.2 修改半径** — 无法从描述判断
- [ ] **G4.3 跨文件复用** — 无法从描述判断
- [ ] **G5.1-G5.4 命名** — 需看具体标识符，`order.entity.ts` 文件名本身符合 camelCase 规范
- [x] **G6.1 文件纯度** — 违反: entity 文件混合了实体定义 + 基础设施构造 + 持久化逻辑，身份不单一
- [ ] **G6.2 游离物抽出** — 无法从描述判断
- [ ] **G6.3 工具函数集中** — 无法从描述判断
- [ ] **G7.1-G7.7 设计质量** — G7.5 (Command-Query 分离): 如果 save 方法同时修改状态和返回数据则违反；G7.6 (Tell Don't Ask): entity 不应主动构造外部依赖
- [ ] **G8.1-G8.2 代码注释** — 无法从描述判断

#### Review 专项规则

- [x] **RV1 规则违反** — 已逐条列出: G2.1/G2.2/G2.3/G3.1/G3.2/G3.3/G6.1 + TS any 禁令 + DDD 层边界
- [x] **RV2 场景匹配** — 当前为 MEDIUM Review 场景，匹配正确
- [ ] **RV3 重复识别** — 无法从描述判断是否有重复逻辑
- [ ] **RV4 过度工程** — 无法从描述判断
- [ ] **RV5 项目风格** — 无法从描述判断

---

## validate-rules.js 各步骤能捕获的问题

| 步骤 | 检查内容 | 能捕获的问题 | 不能捕获的问题 |
|------|---------|-------------|---------------|
| **Step 1: stylelint --fix** | SCSS 自动修复 | 不适用（本文件为 .ts） | — |
| **Step 2: stylelint** | SCSS 审查 | 不适用（本文件为 .ts） | — |
| **Step 3: eslint** | JS/TS 代码质量 + 格式 + 命名 | **问题 3** (空 catch): `no-empty` 规则 `allowEmptyCatch: false` 直接阻断。**问题 4** (any): `@typescript-eslint/no-explicit-any: error` 直接阻断。此外还会检查命名规范 (`@typescript-eslint/naming-convention`)、禁止 enum (`no-restricted-syntax`)、禁止 console (`no-console`)、最大行数 (`max-lines`) 等。 | **问题 1** (跨层 import): eslint 不理解 DDD 语义，`import` 语句本身合法。**问题 2** (new 仓储实例): eslint 无法判断 `new XxxRepositoryImpl()` 是否在正确的上下文中。 |
| **Step 4: tsc --noEmit** | TypeScript 类型检查 | 类型不匹配、缺少返回类型标注（若启用 `noImplicitReturns`）等类型层面的问题。但 `any` 不会触发 tsc 报错（any 是故意绕过类型系统）。 | **问题 1/2/3/4**: 空 catch 是合法的 JS/TS 语法，`any` 是 TS 内置类型（有意绕过检查），跨层 import 的类型可能完全正确，`new` 也是合法语法。tsc 无法发现这些问题。 |
| **Step 5: 自定义检查 (DDD 层边界)** | domain 不能 import infrastructure/application | **问题 1** (跨层 import): `checkLayerBoundary` 检测 `domain/` 目录下的文件是否包含 `from '.../infrastructure/...'` 的 import 语句，正则匹配: `/from\s+['\"][^'\"]*/infrastructure(/|['\"])/`。`../infrastructure/order.repository.impl` 会被精确命中。 | **问题 2** (new 仓储实例): 只检查 import 路径，不检查运行时代码模式（正则无法理解 `new XxxRepositoryImpl()` 的架构含义）。**问题 3** (空 catch): 不检查。**问题 4** (any): 不检查。 |

### 捕获矩阵总结

| 问题 | eslint | tsc | 自定义检查 | 模型自检 |
|------|--------|-----|-----------|---------|
| 1. domain import infrastructure | - | - | YES | YES (G3.2/G3.3 + DDD 边界) |
| 2. entity 内 new 仓储实例 | - | - | - | YES (G3.1/G3.2/G3.3) |
| 3. 空 catch (e) {} | YES | - | - | YES (G2.1) |
| 4. any 类型标注 | YES | - | - | YES (TS 禁令清单) |

### 关键发现

问题 2（entity 内直接 new 仓储实例）是**工具链盲区**——eslint、tsc、自定义检查都无法自动发现。它必须依靠代码 Review 时的模型自检（对照 `soft-rules.md` G3.1/G3.2/G3.3）来拦截。这体现了该 Skill "软规则自检清单"的设计价值：eslint/tsc/自定义检查覆盖约 75% 的问题（问题 1/3/4），剩余 25% 的架构耦合问题（问题 2）依靠人工审查。

### 工具验证: stylelint N/A | eslint FAIL (问题 3, 问题 4) | tsc UNKNOWN (取决于是否还有其他类型错误) | custom checks FAIL (问题 1)

### 结果: 4 个 MUST 级违规，全部需要修复
