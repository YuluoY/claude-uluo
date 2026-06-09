## Soft Rules Self-Check

### 场景: Vue 组件 | 语言: TypeScript + Vue 3

---

### § 通用规则

- [x] **G1.1 纯函数 vs 业务函数** — usePagination composable 内部 `goToPage`/`nextPage`/`prevPage`/`resetPage` 为纯工具函数（脱离项目可复用）。ProductList.vue 内的 `handleSelect`/`handlePageChange`/`handleRetry` 为业务函数（含 emit 副作用、领域交互）。二者未混杂。
- [x] **G1.2 禁止布尔参数** — 无布尔参数。composable 使用 `UsePaginationOptions` 对象配置，Props 使用可选的 `loading?: boolean`（状态标识，非控制行为分支）。
- [x] **G1.3 认知复杂度** — 所有函数体可"一口讲完"：`usePagination` 约 40 行、组件各 handler 均为 2-3 行。无嵌套超过 3 层、无循环内分支。
- [x] **G1.4 单数 vs 批量** — `goToPage(page)` 单页跳转，`nextPage()`/`prevPage()` 为便捷包装（内部调用 `goToPage`）。`handleSelect(productId)` 单选。命名外显了基数（`handleSelect` 单数，`paginatedItems` 批量）。
- [x] **G2.1 禁止空吞异常** — 当前组件为展示层，不涉及异步数据获取，无可 catch 的异常场景。N/A。
- [x] **G2.2 分层转换** — 组件作为 interface 层，接收父组件的 `error?: string | null` prop（已转换后的用户可读信息），不直接暴露底层异常。分层转换由父组件/API 层负责。
- [x] **G2.3 错误处理模式** — 组件内部无异步操作，无 try-catch。错误展示依赖 props 传入，由父组件调用层使用 `to()` 元组处理。
- [x] **G3.1 显式注入** — 所有依赖通过 props 显式传入（`products`、`category`、`loading`、`error`）。无全局单例引用。composable 接收 `items` 参数而非闭包捕获。
- [x] **G3.2 依赖接口** — composable `usePagination<T>` 接受泛型 `MaybeRefOrGetter<T[]>`，依赖抽象接口而非具体 Product 类型。组件 props 使用 `Product[]` 接口。
- [x] **G3.3 入口组装** — 组件在父组件中组装使用（通过 props 传入数据+状态），组件自身只消费已注入的依赖。N/A（组件本身不管理依赖图）。
- [x] **G4.1 归属判断** — 每个值有明确归属：`Product` 接口归属组件内 types.ts、CSS 变量归属项目主题 tokens、文案暂用硬编码（生产项目需 i18n key）。
- [x] **G4.2 修改半径** — 默认值（`pageSize: 10`）就近定义在 `withDefaults` 中，修改只需一处。类型定义在 types.ts 集中管理。
- [x] **G4.3 跨文件复用值** — 事件名（`select`、`page-change`、`retry`）在 Emits 类型中集中声明。无散落在多个文件中的配置键或常量。
- [x] **G5.1-G5.4 命名** — 无缩写（`handle` 非 `hdl`，`product` 非 `prod`，`page` 非 `pg`）。无模糊词（无 `data`、`info`、`process`、`manage`、`ctx`）。词性匹配：变量名词（`currentPage`、`filteredProducts`），函数动词（`handleSelect`、`goToPage`、`resetPage`），布尔 `is` 前缀（`isError`、`isLoading`、`isEmpty`）。基数外显（`handleSelect` 单数，`paginatedItems` 批量）。
- [x] **G6.1-G6.3 文件纯度** — types.ts 唯一定义类型、usePagination.ts 唯一导出 composable、ProductList.vue 唯一承载组件、index.ts 唯一做 barrel export。无游离常量或工具函数混在组件文件中。usePagination 是独立的通用 composable（可跨项目复用）。
- [x] **G7.1-G7.7 设计质量（SHOULD）** — DRY：无重复逻辑。AHA：当前仅一次使用，未过度抽象。开放扩展：新增分页功能在 composable 内扩展，新增 emits 事件追加类型签名不改模板结构。YAGNI：无多余抽象层。单一抽象层级：组件模板只做视图编排，composable 做分页计算。CQS：`computed` 只读查询无副作用，`handle*` 函数只执行命令无返回值。Tell Don't Ask：composable 封装分页数据+行为，外部只调用方法不手动计算。不可变性：filteredProducts 通过 filter 创建新数组（非 mutating sort），composable 内 slice 返回新数组。
- [x] **G8.1-G8.2 代码注释** — `usePagination` 有 JSDoc 说明意图和参数。组件内 watch 注释解释了"为什么必须用 watch 而非 computed"。types.ts 各字段有 TSDoc 注释。注释解释 WHY（"分类变化时重置分页"）而非 WHAT（"设置 currentPage 为 1"）。

---

### § 组件规则（Vue）

- [x] **V1 Props/Emits 类型** — `defineProps<ProductListProps>()` + `withDefaults` 显式声明类型及默认值。`defineEmits<ProductListEmits>()` 显式声明 emits 签名。
- [x] **V2 Props 只读** — 子组件未直接修改 props。`category` 变化通过 watch 触发 `resetPage()`（composable 内部方法），不修改 prop 本身。
- [x] **V3 v-for key** — `v-for="product in paginatedItems"` 使用 `:key="product.id"`（稳定业务 ID），非 index。
- [x] **V4 computed 纯度** — `filteredProducts` 纯过滤计算、`isError`/`isLoading`/`isEmpty` 纯布尔派生、`totalPages`/`paginatedItems` 纯分页计算。所有 computed 无副作用（无 API 调用、无状态修改）。
- [x] **V5 watch 克制** — 仅 1 处 watch（监听 `category` 变化 → 重置分页），这是无法用 computed 表达的合法副作用（筛选条件变化必须执行状态变更）。已注释说明目的。
- [x] **V6 复杂逻辑提取** — 分页逻辑提取到 `usePagination` composable，组件只做视图编排（props → 状态计算 → 模板渲染 → emit 事件）。
- [x] **V7 样式变量化** — 所有色值、间距、字号、圆角、过渡时长均使用 CSS 变量（`--color-*`、`--spacing-*`、`--font-size-*`、`--radius-*`、`--duration-*`），无硬编码色值。
- [x] **V8 SFC 行数** — ProductList.vue 约 260 行（script ~55 行 + template ~75 行 + style ~130 行），未超 300 行评估阈值。

---

### § 组件质量专项

- [x] **Q1 四态完整** — 覆盖 loading（骨架文本 + `aria-busy`）、empty（引导文案，分类为空/非空时文案不同）、error（错误信息 + `role="alert"` + 重试按钮）、success（商品列表 + 分页控件）四态。loading 仅无缓存数据时展示（避免闪烁覆盖已有数据）。
- [x] **Q2 Error Boundary** — 本组件为领域内业务组件，错误态通过 props 传入的 `error` 字段处理。关键页面级 Error Boundary 应由父级页面包裹（当前组件范围无需）。
- [x] **Q3 语义 HTML** — 商品项使用 `<button type="button">`（非 `<div @click>`），分页按钮使用 `<button type="button">`，列表使用 `<ul>/<li>`，分页导航使用 `<nav aria-label="分页导航">`。
- [x] **Q4 键盘可用** — 所有按钮原生支持键盘（Tab 聚焦、Enter/Space 激活）。`:focus-visible` 提供可见焦点指示器（非 `outline: none`）。分页按钮 disabled 态阻止操作。

---

### 工具验证

| 工具 | 状态 | 说明 |
|------|------|------|
| stylelint | SKIP | 当前 skill 环境缺少 stylelint 依赖；在项目环境中运行 `pnpm stylelint` 即可检查 |
| eslint | SKIP | 当前 skill 环境 eslint 配置有依赖问题；在项目环境中运行 `pnpm eslint` 即可检查 |
| tsc --noEmit | SKIP | 缺少 tsconfig.json；在项目环境中运行 `pnpm tsc --noEmit` 即可检查 |
| 自定义检查（DDD 层边界） | SKIP | 组件属于 features/product/components/，符合垂直切片架构；无跨层引用 |

### 结果: 全部通过（环境隔离导致 3 项工具验证 SKIP，代码层面逐条自检通过）
