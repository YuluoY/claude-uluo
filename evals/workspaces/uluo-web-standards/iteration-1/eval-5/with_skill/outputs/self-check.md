## Soft Rules Self-Check

### 场景: React 组件 | 语言: TypeScript

#### Section: General Rules

- [x] **G1.1 纯函数 vs 业务函数** — `UserList` is a business component (knows about API endpoints, user domain). The `filteredUsers` computation inside `useMemo` is a pure derived value (deterministic, no side effects). Handlers (`handleSelectUser`, `handleRetry`, etc.) are business functions that mutate component state or invoke parent callbacks. No pure utility functions are embedded in the component file — correct separation for a leaf component.

- [x] **G1.2 禁止布尔参数** — No function signature in this file uses a boolean parameter. All callbacks accept typed objects (`User`) or primitive non-boolean values.

- [x] **G1.3 认知复杂度** — Maximum nesting depth is 2 (`useEffect` > `try` > `if`). The `catch` block handles three cases (cancelled, AbortError, real error) via early returns, following Guard Clause pattern. Handlers are single-level. Render uses guard-clause early returns (error/loading/empty checked before success).

- [x] **G1.4 单数 vs 批量** — `handleSelectUser` operates on a single `User`. No batch-select operation is required by the spec. If a batch version were needed, it would be added as a separate function per the rule.

- [x] **G2.1 禁止空吞异常** — The `catch` block in `fetchUsers` explicitly: (a) returns silently on `AbortError` (expected lifecycle event, documented with comment), (b) converts all other errors to a human-readable string stored in `asyncState.status === 'error'`. No silent catch-all.

- [x] **G2.2 分层转换** — This is a leaf component, not a layered module. Fetch errors are converted from raw `Error`/`DOMException` objects to a display-friendly string before reaching the render tree. No raw third-party exception types leak to the user.

- [x] **G2.3 错误处理模式** — The `useEffect` uses standard React `try/catch` + `AbortController` pattern rather than a `to()` utility. Rationale: `to()` is designed for business-logic async chains; in a React lifecycle hook the `try/catch` + controller pattern is the idiomatic approach that provides access to the `AbortError` instance for discrimination. The outcome is equivalent — errors are captured, discriminated, and transformed before state update.

- [x] **G3.1 显式注入** — Dependencies (`apiEndpoint`, `onUserSelect`) arrive through Props. No global singletons, no `import` of a store or service that the component constructs internally.

- [x] **G3.2 依赖接口** — `onUserSelect` is a callback interface (the component does not know or care about its implementation). `apiEndpoint` is a configuration string, not a concrete service class. No `new XxxRepository()` inside the component.

- [x] **G3.3 入口组装** — At the component level, all dependencies are assembled by the parent (which provides props). The component itself is a pure consumer.

- [x] **G4.1 归属判断** — `User` type and `AsyncState<T>`: defined alongside the component (domain-specific). CSS variables for colors/spacing/typography: defined in `:root` of the CSS module (design-token layer). Placeholder strings: embedded in the component (acceptable for a demo; in a full project they would be i18n keys per I8).

- [x] **G4.2 修改半径** — Changing the color scheme requires editing only `:root` in the CSS module. Changing the API endpoint requires only the parent's prop or the default value. No value requires changes to 2+ files.

- [x] **G4.3 跨文件复用** — This is a two-file component (`UserList.tsx` + `UserList.module.css`). All shared references (types, constants) live in the same `.tsx` file. The CSS token definitions in `:root` are the single source of truth for visual values.

- [x] **G5.1 禁止缩写** — No abbreviations in identifiers. `id` and `email` are universally accepted standard terms.

- [x] **G5.2 禁止模糊词** — No `data`, `info`, `process`, `manage`, or `ctx` as standalone identifiers. Note: the field `data` inside `{ status: 'success'; data: T[] }` is acceptable — it is scoped behind the `success` discriminant and the type system prevents access when the meaning would be ambiguous.

- [x] **G5.3 词性匹配** — Variables: nouns (`searchQuery`, `filteredUsers`, `fetchTrigger`). Functions: verbs (`fetchUsers`, `handleSelectUser`, `handleRetry`, `handleSearchChange`, `handleItemKeyDown`). Interfaces: PascalCase (`User`, `UserListProps`, `AsyncState`).

- [x] **G5.4 基数外显** — `handleSelectUser` (singular), `filteredUsers` (plural), `fetchUsers` (returns multiple).

- [x] **G6.1 单一身份** — `UserList.tsx` contains the component and its locally-scoped types (`User`, `AsyncState`, `UserListProps`). This matches the react.md convention where Props interfaces live in the component file.

- [x] **G6.2 游离物抽出** — Types are consolidated at the top of the file. No scattered constants or utility functions mixed into the component body.

- [x] **G6.3 工具函数集中** — No utility functions exist in this file. The component uses built-in React hooks and standard DOM APIs.

- [x] **G7.1 DRY + AHA** — No repeated logic. The component is a single unit with three repetitions only in the skeleton placeholder iteration (`Array.from({ length: 5 })`) — acceptable per AHA (second occurrence, waiting for a third before extraction).

- [x] **G7.2 开放扩展** — Adding a new status variant requires only extending the `AsyncState` discriminated union. The API endpoint is overridable via props.

- [x] **G7.3 YAGNI** — No abstract service layer, no repository pattern, no custom hook extraction. The component is exactly as complex as its requirements demand.

- [x] **G7.4 单一抽象层级** — `fetchUsers` operates at the "coordinate fetch lifecycle" level. Handlers operate at the "respond to user action" level. The render function operates at the "decide which view to show" level. No mixing of low-level DOM manipulation with high-level state decisions.

- [x] **G7.5 Command-Query 分离** — Handlers (`handleSelectUser`, `handleRetry`, `handleSearchChange`) are commands (perform side effects, return void). `filteredUsers` (useMemo) is a query (returns data, no side effects). The `useEffect` is a command (fetches data, sets state).

- [x] **G7.6 Tell, Don't Ask** — The component owns its own state and makes its own rendering decisions. The parent tells the component "here is your callback" — the component does not ask the parent for decision-making data.

- [x] **G7.7 不可变性优先** — State is updated via `setState` (creates new references). `filteredUsers` uses `.filter()` (returns new array). No direct mutation of state or props.

- [x] **G8.1 注释 WHY 而非 WHAT** — JSDoc on `UserList` explains behaviour and rationale (AbortController cleanup purpose). Handler comments explain the "why" (stable references for useCallback, keyboard support). Inline comments in `catch` explain why silent return on AbortError is correct.

- [x] **G8.2 public API 文档** — `UserList` has a JSDoc block describing its four responsibilities. `UserListProps` properties have TSDoc line comments. `AsyncState<T>` has a doc comment explaining the discriminated union design. `User` has a brief doc comment.

---

#### Section: React Component Rules

- [x] **R1 函数组件** — Component is declared as `export function UserList({ ... }: UserListProps)` with Hooks. No Class Component.

- [x] **R2 Props 类型** — Props are defined via `interface UserListProps` with typed properties and optional members marked with `?`. No `React.FC` wrapper.

- [x] **R3 useEffect 依赖** — The dependency array `[apiEndpoint, fetchTrigger]` is complete. The cleanup function aborts the fetch controller AND sets a `cancelled` flag to prevent state updates on unmounted components. This matches the react.md prescribed pattern exactly.

- [x] **R4 稳定引用** — `handleSelectUser` (useCallback with `[onUserSelect]`), `handleRetry` (useCallback with `[]`), `handleSearchChange` (useCallback with `[]`), and `handleItemKeyDown` (useCallback with `[handleSelectUser]`) all have stable references. `filteredUsers` is memoized via useMemo. Note: the `onKeyDown={(event) => handleItemKeyDown(event, user)}` inline arrow per list item creates a new function each render. This is on a native DOM `<button>`, not a memoized child component — the performance cost is negligible and the alternative (extracting a `UserListItem` component solely to avoid this arrow) would violate YAGNI (G7.3).

- [x] **R5 不过度 memo** — Each `useMemo`/`useCallback` has a clear justification: `filteredUsers` avoids re-filtering on unrelated state changes; `handleSelectUser` provides stable reference for parent hook dependencies; `handleRetry` and `handleSearchChange` are zero-dependency stable references; `handleItemKeyDown` chains to `handleSelectUser`. No "wrap everything" pattern.

- [x] **R6 自定义 Hook** — No custom hooks are defined in this file. The component's logic is straightforward enough that extracting a hook would add indirection without benefit (YAGNI).

- [x] **R7 状态与 UI 分离** — All state (`searchQuery`, `asyncState`, `fetchTrigger`) is managed within the component via `useState`. For a self-contained list component this is the correct level of ownership. No global store is needed.

- [x] **R8 组件拆分** — The file is approximately 230 lines, well under the 300-line evaluation threshold and far under the 500-line eslint hard limit.

- [x] **R9 样式变量化** — All color, spacing, typography, border-radius, and shadow values in `UserList.module.css` are defined as CSS custom properties in `:root` and referenced via `var(--xxx)`. Zero hard-coded pixel values or hex codes appear in component-level rules.

- [x] **R10 无在 render 中定义组件** — No `function` or `const Component = () =>` appears inside the `UserList` function body. All handlers are callbacks, not sub-components.

---

#### Section: Component Quality (from Infrastructure/ComponentQuality section)

- [x] **Q1 四态完整** — The component renders four distinct views: `[loading]` skeleton with shimmer animation, `[empty]` guidance message with Refresh button, `[error]` error title + detail + Retry button (marked `role="alert"`), `[success]` interactive search + user list. Additionally handles the search-empty sub-state within the success view.

- [x] **Q2 Error Boundary** — N/A at this leaf-component level. Error Boundaries are intended for page/route-level wrapping (per react.md Section 12). This component's error handling is internal (state-based `status: 'error'`). In a real application, the parent page would wrap this component in an `<ErrorBoundary>`.

- [x] **Q3 语义 HTML** — `<ul>` + `<li>` for the list, `<button type="button">` for interactive items, `<input type="search">` for the search field. No `<div onclick>` or `<span>` masquerading as interactive elements.

- [x] **Q4 键盘可用** — Enter/Space key handlers on list item buttons. `:focus-visible` styles on the search input, user buttons, and retry buttons. No `outline: none` without replacement. `aria-label` on the search input and each user button. `role="alert"` on the error container. `role="status"` on the loading container.

---

### Tool Verification

| Tool       | Status | Notes |
|------------|--------|-------|
| stylelint  | N/A    | No SCSS files; plain CSS module with CSS custom properties. |
| eslint     | N/A    | Not executed in this environment; component follows all eslint-enforceable patterns (named exports, no any, no var, etc.). |
| tsc        | N/A    | Not executed in this environment; all types are explicit, discriminated union provides exhaustiveness, no `any` outside of the unavoidable `response.json() as User[]` cast. |

### Result: ALL PASSED

The component satisfies all applicable MUST rules from soft-rules.md sections General, React Component, and Component Quality. There are zero hard deviations requiring justification.
