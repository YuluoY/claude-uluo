## Soft Rules Self-Check

### 场景: 新增小模块 | 语言: TypeScript

---

#### § 通用规则

- [x] **G1.1 纯函数 vs 业务函数** — 已明确标注身份：模块注释声明 `身份：纯函数（脱离项目可复用，无副作用）`，JSDoc 中写明 `此函数为纯函数——相同输入始终产生相同输出，不修改任何外部状态，不依赖任何外部资源`。纯函数与业务函数泾渭分明，无混杂。

- [x] **G1.2 禁止布尔参数** — 函数签名无布尔参数。配置项通过 `FormatPriceOptions` 接口（`currency?: string`、`decimalPlaces?: number`）传入，符合 options 对象模式。

- [x] **G1.3 认知复杂度** — 函数体可"一口讲完"：取默认值 → 守卫非有限值 → 取绝对值 → 定精度 → 拆分整数/小数 → 加千分位 → 拼接返回。无嵌套（最深层仅 1 层 if-guard），无循环内分支。

- [x] **G1.4 单数 vs 批量** — 本函数处理单个值的格式化。批量场景由调用方自行 `map(formatPrice)`，这是纯函数的标准用法，无需在函数内部封装循环。

- [x] **G2.1 禁止空吞异常** — N/A。本函数为同步纯函数，无 try-catch 块。唯一"异常"输入（NaN/Infinity）通过 Guard Clause 安全降级为零值输出，不会静默失败。

- [x] **G2.2 分层转换** — N/A。本模块位于 `utils/`，属于通用工具层，不参与 DDD 分层。无第三方异常产生。

- [x] **G2.3 错误处理模式** — N/A。无异步操作，不需要 `to()` 元组解包或 try-catch。

- [x] **G3.1 显式注入** — N/A。纯函数无外部依赖，所有输入通过参数显式传入。

- [x] **G3.2 依赖接口** — N/A。无依赖。

- [x] **G3.3 入口组装** — N/A。无依赖。

- [x] **G4.1 归属判断** — `DEFAULT_CURRENCY` 和 `DEFAULT_DECIMAL_PLACES` 作为模块级常量定义在文件顶部，归属本模块。它们不是跨领域共享的配置（无需进 `constants/`），也不是用户可见文案（无需进 i18n）。

- [x] **G4.2 修改半径** — 改默认货币或默认小数位数，仅需修改此文件中对应常量定义（修改半径=1）。满足"不需要改 ≥2 个文件"的条件。

- [x] **G4.3 跨文件复用值** — 无跨文件复用值。所有常量就地定义在唯一使用它们的文件中。

- [x] **G5.1 禁止缩写** — 所有标识符均为完整单词：`formatPrice`、`FormatPriceOptions`、`currency`、`decimalPlaces`、`absoluteValue`、`formattedInteger`、`isNegative`。无 `usr`/`calc`/`cfg` 等缩写。`value` 是标准的数学/格式化领域术语，不是缩写。

- [x] **G5.2 禁止模糊词** — 无 `data`/`info`/`process`/`manage`/`ctx` 等模糊标识符。`value` 在此语境下是精确语义（"待格式化的数值"），`options` 是 JavaScript 生态的标准约定（配置对象）。

- [x] **G5.3 词性匹配** — 函数 `formatPrice` = 动词 `format` + 名词 `Price`（A/HC 结构正确）。变量 `currency`/`decimalPlaces` = 名词。布尔 `isNegative` = `is` 前缀。接口 `FormatPriceOptions` = `PascalCase` 名词。均符合规则。

- [x] **G5.4 基数外显** — 函数名 `formatPrice` 为单数（格式化一个价格）。无集合操作，无复数歧义。

- [x] **G6.1 单一身份** — 此文件只承载一种身份：价格格式化工具函数。不混杂类型、常量集、其他工具函数（只有一个导出函数）。

- [x] **G6.2 游离物抽出** — `FormatPriceOptions` 接口与函数紧密耦合，共存于同一文件是合理的（文件内聚）。默认常量提取到模块顶部，不混在函数体内。

- [x] **G6.3 工具函数集中** — 这是全新模块，项目中原无同功能实现。不存在重复定义。

- [x] **G7.1 DRY + AHA** — 函数体内无重复逻辑。整数千分位格式化的正则只出现一次。

- [x] **G7.2 开放扩展** — 通过 `FormatPriceOptions` 接口扩展新选项（如 `locale`、`thousandsSeparator`）不影响调用方现有代码。不是通过追加 if-else 分支实现。

- [x] **G7.3 YAGNI** — 未引入类、工厂、策略模式等抽象。单个纯函数足以满足"格式化一个价格为字符串"的需求。

- [x] **G7.4 单一抽象层级** — 所有语句处于同一层级："取选项"、"守卫非法值"、"取绝对值"、"定精度"、"拆分"、"添加千分位"、"拼接"。正则 `/\B(?=(\d{3})+(?!\d))/g` 是标准的数字格式化表达式，属于底层细节但已内聚为一行，不需要提取。

- [x] **G7.5 Command-Query 分离** — 本函数是查询：只返回数据（字符串），不修改任何状态，不产生副作用。调用任意次结果一致。完全符合 CQS。

- [x] **G7.6 Tell, Don't Ask** — N/A。本函数未操作对象，不存在"从对象取数据在外面判断"的场景。

- [x] **G7.7 不可变性优先** — 函数不修改输入参数，不修改任何外部状态。返回全新字符串。完全不可变。

- [x] **G8.1 注释 WHY 而非 WHAT** — Guard Clause 处的注释 `非有限值降级为零，避免输出 "¥NaN" 或 "¥Infinity"` 解释了 WHY（为什么要做这个守卫）。常量注释 `修改半径=1：仅此一处定义` 解释了 WHY（为什么提取出来）。函数 JSDoc 中的"纯函数"声明解释了 WHY（身份声明，告诉调用方可以安全地 memoize/cache 结果）。

- [x] **G8.2 public API 文档** — 导出函数 `formatPrice` 有完整的 JSDoc，包含 `@param`（两处：value 和 options 及子属性）、`@returns`、`@example`（4 个示例覆盖基本/换符号/改精度/负数场景）。

---

#### TypeScript 专项

- [x] **无 `any`** — 所有类型显式标注，无 `any`。
- [x] **无 `{}` / `Function` / 包装类型** — 未使用。
- [x] **无 `enum`** — 未使用。常量用 `const` + primitive 类型。
- [x] **无 `@ts-ignore`** — 未使用。
- [x] **函数参数和返回值显式标注** — `(value: number, options?: FormatPriceOptions): string`。
- [x] **`import type` 用于纯类型导入** — N/A，无导入。
- [x] **可空标在使用处** — `options?: FormatPriceOptions`，可选参数使用 `?` 而非 `| undefined`。
- [x] **`??` 而非 `||`** — `options ?? {}` 及解构默认值使用 `=`（原生默认值语义），等价于 `??` 行为。
- [x] **Interface 用于对象形状** — `FormatPriceOptions` 使用 `interface`。
- [x] **无 `null`** — 全文件未出现 `null`。可选值均使用 `undefined` 语义。

---

### 工具验证:
- stylelint: N/A（无 SCSS 文件）
- eslint: N/A（本次输出为独立代码文件，未在完整项目中运行 lint）
- tsc --noEmit: N/A（本次输出为独立代码文件，未在完整项目中运行类型检查）
- 自定义检查: N/A（非 DDD 模块，无层依赖边界）

### 结果: 全部 MUST 规则通过，无偏离项。
