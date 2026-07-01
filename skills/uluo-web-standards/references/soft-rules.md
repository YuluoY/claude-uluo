# 软规则 — 模型自检清单

此文件定义**无法由 eslint/stylelint/tsc 自动检查、必须由模型在代码生成/修改时逐条自述**的规则。eslint 覆盖代码质量 + 格式 + 命名，stylelint 覆盖 SCSS 质量 + 属性排序，tsc 覆盖类型安全。仅 DDD 层边界由 validate.js（checks/layer-boundary.js）硬检查。

每个模型触发本 skill 后，必须在 Phase 3 对照适用区块逐条自检，在 Phase 4 逐条自述通过情况。

---

## 目录

- [加载规则](#loading-rules)
- [§ 通用规则](#general-rules)
  - [G1. 函数设计](#g1-function-design)
  - [G2. 错误处理](#g2-error-handling)
  - [G3. 依赖管理](#g3-dependency-management)
  - [G4. 值归属与硬编码](#g4-value-ownership)
  - [G5. 命名](#g5-naming)
  - [G6. 文件纯度](#g6-file-purity)
  - [G7. 设计质量（SHOULD）](#g7-design-quality)
  - [G8. 代码注释](#g8-code-comments)
    - G8.0 默认 · G8.1 MUST JSDoc · G8.2 MUST WHAT · G8.3 NEVER WHY · G8.4–G8.6
- [§ 组件规则（Vue）](#component-rules-vue)
- [§ 组件规则（React）](#component-rules-react)
- [§ 架构规则](#architecture-rules)
  - [基础设施专项](#infrastructure)
  - [组件质量专项](#component-quality)
  - [测试专项](#testing)
- [§ Review 规则](#review-rules)
- [自检输出格式](#self-check-output-format)

---

## 加载规则

根据 SKILL.md Phase 1 识别的场景，加载对应区块：

| 场景 | 加载区块 |
|------|---------|
| Review | § 通用规则 + § Review 规则 |
| 单函数重构 | § 通用规则 |
| 新增小模块 | § 通用规则 |
| 搭建完整模块 | § 通用规则 + § 架构规则 |
| 项目启动 | § 通用规则 + § 架构规则 |
| Vue 组件 | § 通用规则 + § 组件规则（Vue） |
| React 组件 | § 通用规则 + § 组件规则（React） |

---

## § 通用规则

### G1. 函数设计

> 格式方面（分号、引号、大括号、缩进等）由 stylelint 统一处理，不在此列。

- [ ] **G1.1 纯函数 vs 业务函数**：每个函数是否明确标注了身份？二者是否混杂？（纯函数 = 脱离项目可复用，无副作用；业务函数 = 含领域知识，可能有副作用）
- [ ] **G1.2 禁止布尔参数**：函数签名中有布尔参数吗？如有，是应拆成两个函数，还是用 options 对象替代？
- [ ] **G1.3 认知复杂度**：函数体能"一口讲完"吗？嵌套超过 3 层了吗？循环内有分支吗？
- [ ] **G1.4 单数 vs 批量**：有单数操作的函数，是否有对应的批量版本？批量版本内部是否封装了循环逻辑？

### G2. 错误处理

> 空 catch 由 eslint `no-empty` 阻断。

- [ ] **G2.1 禁止空吞异常**：每个 catch 块是否至少做了日志记录或转换重抛？
- [ ] **G2.2 分层转换**：异常在 domain → application → interface 逐层转换了吗？无第三方原始异常（如 `PrismaError`、`AxiosError`）向上泄漏？
- [ ] **G2.3 错误处理模式（JS/TS）**：异步操作是否使用 `[error, data]` 元组解包（如 `to()` 工具）而非 try-catch 嵌套？

### G3. 依赖管理

- [ ] **G3.1 显式注入**：依赖通过构造函数参数或函数参数显式传入？无全局单例引用？
- [ ] **G3.2 依赖接口**：依赖的是抽象接口还是具体实现？业务代码中有 `new XxxRepository()` 这类直接构造吗？
- [ ] **G3.3 入口组装**：依赖图是否在程序入口（如 main.ts、setup.ts）组装，业务代码只消费已注入的依赖？

### G4. 值归属与硬编码

- [ ] **G4.1 归属判断**：每个值是否有明确的归属模块？领域规则 → 领域模块内，配置 → 环境变量 + 配置服务，设计常量 → 主题模块，文案 → i18n key
- [ ] **G4.2 修改半径**：改这个值需要改 ≥2 个文件吗？是 → 已提取到共享常量；否 → 可就地保留
- [ ] **G4.3 跨文件复用值**：事件名、配置键、领域规则常量是否集中定义，不散落在多个文件中？

### G5. 命名

> 详细约定见 `references/languages/javascript.md` §命名规范 和 `references/languages/typescript.md` §命名规范。

- [ ] **G5.1 禁止缩写**：无 `usr`、`calc`、`cfg`？`id`、`url` 等通用缩写除外
- [ ] **G5.2 禁止模糊词**：无 `data`、`info`、`process`、`manage`、`ctx` 作为标识符
- [ ] **G5.3 词性匹配**：变量名词，函数动词，布尔 `is`/`has`/`should`，接口/类 `PascalCase`
- [ ] **G5.4 基数外显**：`getUser`（单数）vs `getUsers`（批量）

### G6. 文件纯度

> 文件最大行数由 eslint `max-lines` 阻断（>500 error）。>300 行时评估是否拆分。

- [ ] **G6.1 单一身份**：一个文件只承载一种身份？（实体定义 / 常量集 / 工具函数集 / 类型定义，只居其一）
- [ ] **G6.2 游离物抽出**：是否有常量、工具函数、游离类型混在主体定义文件中？
- [ ] **G6.3 工具函数集中**：同一个工具函数是否只存在于一个文件？（先查 `shared/utils/` 是否已有同功能实现）

### G7. 设计质量（SHOULD）

- [ ] **G7.1 DRY + AHA**：第三次重复逻辑 → 已抽离？第二次重复 → 已用 AHA 判断等待分叉？
- [ ] **G7.2 开放扩展**：新增场景是通过新增模块/接口扩展，还是修改已有代码追加 if-else 分支？
- [ ] **G7.3 YAGNI**：没有为一次性场景创建多余的抽象层？
- [ ] **G7.4 单一抽象层级**：函数体内所有语句处于同一抽象层级？（要么都是"做什么"，要么都是"怎么做"）
- [ ] **G7.5 Command-Query 分离**：有副作用的函数不应该返回值，返回数据的函数不应有副作用？
- [ ] **G7.6 Tell, Don't Ask**：是把行为放在靠近数据的地方，还是从对象取数据在外面判断？
- [ ] **G7.7 不可变性优先**：值对象是否不可变（创建后状态不改变）？实体是否通过创建新实例替代旧实例？

### G8. 代码注释

- [ ] **G8.0 默认**：写 WHAT（做了什么 / 是什么），不写 WHY；命名已表达的，不重复写。
- [ ] **G8.1 MUST JSDoc**：每个 `export` 函数、类、composable、store action、复杂 export 类型/接口 → JSDoc/TSDoc 含 `@description`（一句话）、每个参数 `@param`、有返回值时 `@returns`。
- [ ] **G8.2 MUST WHAT**：非显而易见逻辑、业务概念、字段含义、步骤意图 → 注释说明做了什么或是什么；可附 `@see`。
- [ ] **G8.3 NEVER WHY**：禁止动机/取舍/历史类 WHY 注释（如 `// 因为…所以…`、`// 为避免 bug 才…`）。
- [ ] **G8.4 NEVER 垃圾注释**：禁止注释掉的 dead code、修改日志（`// 2024-xx-xx 改`）、分区标记（`// ===== xxx =====`）。
- [ ] **G8.5 NEVER 场景**：question-only、review-only、未改代码的任务 → 不新增任何注释。
- [ ] **G8.6 例外**：用户消息含「不要注释」或 `no comments` → 本次零注释；仅改样式/文案/配置值 → 不新增注释；Vue `<script>` export 仍须 JSDoc，`<template>` 禁止注释。
- [ ] **G8.7 MUST 块注释格式**（`scripts/checks/comment-format.js` 硬约束）：
  - 单行说明 → 只用 `//`，禁止 `/** ... */` 写在一行
  - export / 接口 / 函数 → 多行块注释，opening 行仅 `/**`，正文行 ` * ...`，closing ` */`
  - 多行块注释内层 `*` 与 opening 行 `*` **同列对齐**
  - `stores/**`、`constants.ts` 禁止 `label: 'UI文案'`，仅存 id/key，展示走 i18n

---

## § 组件规则（Vue）

在 § 通用规则基础上，Vue 组件追加：

- [ ] **V1 Props/Emits 类型**：`defineProps` 和 `defineEmits` 是否显式声明了类型？
- [ ] **V2 Props 只读**：子组件是否避免了直接修改 props？（应使用 `emit('update:xxx')` 上抛）
- [ ] **V3 v-for key**：`v-for` 是否使用了稳定业务 key（如 ID）而非 index？
- [ ] **V4 computed 纯度**：`computed` 是否只做派生数据，无副作用（无 API 调用、无状态修改）？
- [ ] **V5 watch 克制**：`watch` 是否确实必要？能用 `computed` 表达时不用 `watch`？副作用目的清晰？
- [ ] **V6 复杂逻辑提取**：复杂状态逻辑是否提取到了 composable？组件是否只做视图编排？
- [ ] **V7 样式变量化**：CSS 中是否使用了 CSS 变量或主题 token？无硬编码色值？
- [ ] **V8 SFC 行数**：单个 `.vue` 文件超过 300 行是否评估了拆分？超过 500 行会被 eslint 阻断。

---

## § 组件规则（React）

在 § 通用规则基础上，React 组件追加：

- [ ] **R1 函数组件**：新代码是否使用函数组件 + Hooks，而非 Class Component？
- [ ] **R2 Props 类型**：Props 是否有 TypeScript 类型定义（`interface` 或 `type`）？
- [ ] **R3 useEffect 依赖**：`useEffect` 的依赖数组是否完整且无遗漏？linter（`react-hooks/exhaustive-deps`）是否通过？
- [ ] **R4 稳定引用**：是否避免了在 render 中创建不稳定的引用（inline 函数/对象作为子组件的 props）？必要时用 `useCallback`/`useMemo`
- [ ] **R5 不过度 memo**：`useMemo`/`useCallback` 是否只用于真正昂贵的计算或必要的引用稳定？无"全部包一层以防万一"
- [ ] **R6 自定义 Hook**：自定义 Hook 是否以 `use` 开头，职责单一？是否避免在 Hook 内部定义另一个 Hook？
- [ ] **R7 状态与 UI 分离**：状态管理逻辑（Zustand store / Redux slice / Jotai atom）是否与 UI 组件分离？组件不直接操作原始状态？
- [ ] **R8 组件拆分**：单个组件文件超过 300 行是否评估了拆分？超过 500 行会被 eslint 阻断。
- [ ] **R9 样式变量化**：CSS 中是否使用了变量或 token（CSS Modules 中的 design tokens、Tailwind theme 配置、或 CSS 变量）？无硬编码色值散落在组件中？
- [ ] **R10 无在 render 中定义组件**：是否避免了在组件体内定义另一个组件（会导致每次 render 重新创建，丢失状态）？

---

## § 架构规则

在 § 通用规则基础上，搭建完整模块/项目启动时追加。组织细节见 `references/architecture.md`，基础设施清单见 `references/infrastructure-setup.md`。

- [ ] **A1 水平分层（顶层）**：`components/`、`utils/`、`constants/`、`hooks/`、`stores/`、`types/`、`assets/`、`styles/`、`i18n/`、`monitoring/`、`business-utils/`、`mocks/` 就位？每个目录角色单一？
- [ ] **A2 垂直切片（领域）**：每个业务领域独立成 `features/<domain>/`？领域内有 `components/`、`hooks/`、`stores/`、`types/`、`constants/`、`api/`、`__tests__/`、`__mocks__/`？
- [ ] **A3 Index 出口**：每个文件夹有 `index.ts` 作为唯一对外接口？外部只 import 文件夹本身？
- [ ] **A4 组件分层**：通用组件（纯 UI）在 `components/`，业务组件在 `features/<domain>/components/`？
- [ ] **A5 工具两池**：纯函数在 `utils/`，业务工具在 `business-utils/`？一个文件一个函数？
- [ ] **A6 Hooks 扁平化**：通用 hooks 在 `hooks/`，领域 hooks 在 `features/<domain>/hooks/`？一个文件一个 hook？
- [ ] **A7 基础设施先行**：`styles/tokens/`（CSS 变量）、图标库（lucide 等）、`i18n/`（国际化）、`monitoring/`（日志+异常+埋点）、`constants/`（常量集）第一天就位？

### 基础设施专项

- [ ] **I1 图标**：图标从 icon 包（lucide-vue-next / lucide-react 等）按需 import？无 inline SVG？
- [ ] **I2 主题**：颜色/间距/字号在 `styles/tokens/` 定义？组件用 CSS 变量？无硬编码色值？
- [ ] **I3 常量**：跨文件复用的值在 `constants/` 或 `features/<domain>/constants/`？改一个值需要改 ≥2 个文件 → 已提取？
- [ ] **I4 异常处理**：`monitoring/errors.ts` 定义了异常类层级？边界转换函数存在？空 catch 被 eslint 阻断？
- [ ] **I5 日志**：禁止裸 `console.log`。调试代码中的 console.log 直接删除。如果原代码的 console.log 是功能性业务日志（如订单处理、支付回调记录），重构时改为调用项目日志库（如 `logger.info()`）。LIGHT/单文件任务不要求搭建 monitoring/ 基础设施，但裸 console.log 仍须清除——至少改为 `// TODO: replace with logger.info()` 注释。
- [ ] **I6 埋点**：`monitoring/tracker.ts` 就位？事件模型统一（event/userId/timestamp/context）？
- [ ] **I7 性能**：`monitoring/metrics.ts` 暴露最少四个指标？前端 Web Vitals 采集？Lighthouse CI 配置了性能预算？
- [ ] **I8 i18n**：所有用户可见文案使用 `t()` 引用？无硬编码中英文字符串？

### 组件质量专项

- [ ] **Q1 四态完整**：每个数据驱动组件覆盖 loading/empty/error/success 四态？
- [ ] **Q2 Error Boundary**：关键页面/区域包裹了 Error Boundary？
- [ ] **Q3 语义 HTML**：用 `<button>` 而非 `<div onclick>`？表单用 `<form>`？
- [ ] **Q4 键盘可用**：弹窗支持 Esc？Tab 序合理？

### 测试专项

- [ ] **T1 测试目录**：`__tests__/` 与被测代码同模块内共存？Vitest 已配置？
- [ ] **T2 Mock 数据**：`mocks/`（全局）+ `features/<domain>/__mocks__/`（领域）就位？Mock 工厂化？
- [ ] **T3 测试结构**：Arrange → Act → Assert？领域层不 mock？API 层 mock？
- [ ] **T4 覆盖门禁**：CI 中 `vitest run --coverage` 阻断未达标？

---

## § Review 规则

Review 场景在 § 通用规则基础上追加：

- [ ] **RV1 规则违反**：被 Review 的代码违反了哪些通用规则？逐条列出
- [ ] **RV2 场景匹配**：当前改动是否匹配了正确的场景深度？（没有对单函数重构强行套 DDD 四层，也没有对完整模块只做函数级重构）
- [ ] **RV3 重复识别**：是否有 ≥3 次重复的逻辑可以合并？是否有 ≤2 次重复但本质可能分叉的（AHA 等待）？
- [ ] **RV4 过度工程**：是否有为一次性场景创建的多余抽象？是否有可以就地保留却被强行提取的简单逻辑？
- [ ] **RV5 项目风格**：改动是否尊重了项目既有风格？如果偏离了项目约定，是否有明确理由？

---

## 自检输出格式

Phase 4 中模型逐条自述时，使用以下格式：

```
## Soft Rules Self-Check

### 场景: <场景名> | 语言: <语言>

#### § 通用规则
- [x] G1.1 纯函数 vs 业务函数 — <简述通过情况>
- [x] G1.2 禁止布尔参数 — <简述>
- [x] G1.3 认知复杂度 — <简述>
- [x] G1.4 单数 vs 批量 — <简述>
- [x] G2.1 禁止空吞异常 — <简述>
- [x] G2.2 分层转换 — <简述>
- [x] G2.3 错误处理模式 — <简述>
- [x] G3.1 显式注入 — <简述>
- [x] G3.2 依赖接口 — <简述>
- [x] G3.3 入口组装 — <简述>
- [x] G4.1 归属判断 — <简述>
- [x] G4.2 修改半径 — <简述>
- [x] G4.3 跨文件复用 — <简述>
- [x] G5.1-G5.4 命名 — <简述>
- [x] G6.1-G6.3 文件纯度 — <简述>
- [x] G7.1-G7.7 设计质量 — <简述>
- [x] G8.0-G8.7 代码注释 — <简述>

#### § <场景专项规则>（如适用）
- [x] ...

### 工具验证: stylelint <pass/fail> | eslint <pass/fail> | custom checks <pass/fail>
### 结果: <全部通过 / 以下偏离有明确理由: ...>
```

对于不适用当前场景的检查项（如单函数重构没有分层概念），标注 N/A 并简述原因。
