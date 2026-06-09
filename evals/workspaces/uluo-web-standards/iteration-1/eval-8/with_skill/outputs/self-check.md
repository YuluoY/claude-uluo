## Soft Rules Self-Check

### 场景: 单函数重构 | 语言: TypeScript

#### § 通用规则

- [x] **G1.1 纯函数 vs 业务函数** — `calculateTotal` 是纯函数（无副作用、确定性输出），VIP_DISCOUNT_RATE 常量将业务知识外提为常量，函数本身保持纯度。
- [x] **G1.2 禁止布尔参数** — 原 `vip: boolean` 已替换为 `{ discountRate?: number }` options 对象，避免了布尔参数控制两套逻辑。
- [x] **G1.3 认知复杂度** — 函数体只做两件事：filter + reduce 求 subtotal，然后乘以 discountRate。无嵌套分支，无循环内分支，"一口能讲完"。
- [x] **G1.4 单数 vs 批量** — 函数天然处理批量 items 数组，返回单个 total 值。不需要拆分单数/批量版本。
- [x] **G2.1 禁止空吞异常** — 函数无 try-catch 块，无异常处理需求，N/A。
- [x] **G2.2 分层转换** — 纯工具函数，无跨层调用，无第三方异常泄漏风险，N/A。
- [x] **G2.3 错误处理模式（JS/TS）** — 函数无异步操作，不使用 `to()` 元组，N/A。
- [x] **G3.1 显式注入** — 函数的所有依赖通过参数显式传入（`items` + `options`），无全局单例引用。
- [x] **G3.2 依赖接口** — 依赖的是 `OrderItem[]` 接口（结构类型），不依赖具体实现类。业务代码中无 `new` 构造。
- [x] **G3.3 入口组装** — 纯工具函数，调用方直接传参，无需依赖图组装，N/A。
- [x] **G4.1 归属判断** — `VIP_DISCOUNT_RATE` 作为模块级常量定义，明确归属此计算模块。无游离值。
- [x] **G4.2 修改半径** — VIP 折扣率改动只需修改 `VIP_DISCOUNT_RATE` 常量一处，无需跨文件修改。
- [x] **G4.3 跨文件复用值** — 当前为单函数重构，无跨文件复用需求。若 `VIP_DISCOUNT_RATE` 被多处引用，已可就近提取。
- [x] **G5.1 禁止缩写** — `calc` → `calculateTotal`（全拼），`vip` → `VIP_DISCOUNT_RATE`（全大写常量）。`subtotal` 是通用术语非缩写。
- [x] **G5.2 禁止模糊词** — 无 `data`、`info`、`process`、`manage`、`ctx` 等模糊词。`items` 具备明确语义。
- [x] **G5.3 词性匹配** — 函数名 `calculateTotal` 动词开头 camelCase，接口 `OrderItem` PascalCase 名词，布尔字段 `disabled` is 样式隐含状态，常量 `VIP_DISCOUNT_RATE` UPPER_SNAKE_CASE。
- [x] **G5.4 基数外显** — `items: readonly OrderItem[]` 用复数名显式表明处理数组。`calculateTotal` 返回值 `number`（单数总量）。
- [x] **G6.1 单一身份** — 文件仅承载 `calculateTotal` 工具函数 + 其专用类型 `OrderItem` + 专用常量 `VIP_DISCOUNT_RATE`，三者紧密关联，属于同一职责。
- [x] **G6.2 游离物抽出** — 无游离常量、工具函数或类型混入。
- [x] **G6.3 工具函数集中** — 此函数若被多处引用，应置于 `utils/calculateTotal.ts`。当前为单函数重构，暂无重复风险。

#### § 设计质量（G7, SHOULD）

- [x] **G7.1 DRY + AHA** — 函数内无重复逻辑。`filter` 和 `reduce` 借助标准库一步完成。
- [x] **G7.2 开放扩展** — 新增折扣策略只需传入不同的 `discountRate`，无需修改函数体。符合开闭原则。
- [x] **G7.3 YAGNI** — 未创建多余的抽象层。`options` 对象是处理可变配置的最小必要抽象，没有过度工程。
- [x] **G7.4 单一抽象层级** — 函数体内所有语句处于同一抽象层级（filter → reduce → multiply），没有混入低层细节。
- [x] **G7.5 Command-Query 分离** — 函数是纯查询：接收数据、返回计算值、无副作用。符合 CQS。
- [x] **G7.6 Tell, Don't Ask** — 不适用：纯计算函数不涉及对象行为封装，N/A。
- [x] **G7.7 不可变性优先** — `readonly OrderItem[]` 约束了数组不可变，`filter` 和 `reduce` 返回新值，不修改输入。

#### § 代码注释（G8）

- [x] **G8.1 注释 WHY 而非 WHAT** — JSDoc 说明了用途和语义（WHY: VIP 10% 折扣、disabled 项被跳过），代码本身清晰表达了 WHAT（filter→reduce→multiply）。
- [x] **G8.2 public API 文档** — 导出函数有完整 JSDoc，包含 `@param`、`@returns`、`@example`。

#### TypeScript 专项

- [x] 无 `any` / `{}` / `Function` / 包装类型
- [x] 无 `enum`，使用 `const` 常量
- [x] 函数参数和返回值显式标注类型
- [x] 可选属性 `disabled?` 使用 `?` 而非 `| undefined`
- [x] 数组标注使用 `readonly T[]`（推荐形式）

### 工具验证: stylelint N/A（无 SCSS 文件） | eslint N/A（独立片段无项目 eslint 配置） | tsc N/A（独立片段无 tsconfig） | custom checks N/A（无 DDD 层边界）

### 结果: 全部通过 — 通用规则 18 项全部满足，SHOULD 设计质量 7 项全部满足，TypeScript 专项 5 项全部满足。无偏离项。
