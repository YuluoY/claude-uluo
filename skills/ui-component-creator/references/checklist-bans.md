# 组件创建检查清单与禁止事项

组件创建的质量保障参考。Phase 2-5 各阶段完成后对照检查。本文件是 [SKILL.md](../SKILL.md) 的质量闸门详细展开。

---

## 一、检查清单（Checklist）

按 10 个维度分类，每项附判定标准。逐项核对，未通过项必须在进入下一 Phase 前修复或显式标注豁免理由。

### 1. 职责与 API 设计

- [ ] **职责单一**：能用一句话（≤ 20 字）描述组件是什么
  - 判定标准：描述中出现"和 / 并且 / 以及"超过一次 → 拆分
- [ ] **API 最小化**：每个 prop 都无法由其他 prop 推导，无法由内部状态推导
  - 判定标准：删除该 prop 后，组件在 80% 场景仍可用 → 该 prop 应内部管理
- [ ] **正交设计**：props 之间不耦合，不互相暗示
  - 判定标准：任意两个 prop 的组合都有明确语义，不存在"propA 为 X 时 propB 必须为 Y"
- [ ] **默认值合理**：80% 场景零配置可用
  - 判定标准：常见用例无需传任何可选 prop 即可运行
- [ ] **受控/非受控支持**：关键状态同时支持受控（外部传入）和非受控（内部默认）模式
  - 判定标准：组件既能作为纯展示用，也能由父组件完全控制
- [ ] **向后兼容**：新增 prop 为可选，不破坏已有用法
  - 判定标准：升级版本后，旧调用代码无需修改即可工作
- [ ] **命名清晰**：prop 名词性、emit/callback 动词性、boolean 用 is/has/can 前缀
  - 判定标准：使用者不看文档能猜中含义

### 2. 四态完整性

- [ ] **Loading 态**：异步数据加载中有明确反馈
  - 判定标准：骨架屏（保持布局）> spinner；加载 < 200ms 不显示 loading 避免闪烁；加载 > 10s 显示超时提示
- [ ] **Error 态**：出错时显示明确错误信息 + 恢复操作
  - 判定标准：错误信息面向用户（非技术细节），提供重试 / 返回 / 联系支持至少一项
- [ ] **Empty 态**：无数据时不显示空白
  - 判定标准：区分"未搜索到结果 / 无权限 / 未初始化"，引导用户下一步行动
- [ ] **Success 边界**：正常状态下覆盖边界情况
  - 判定标准：极长文本（截断 + tooltip）、极多数据（虚拟化/分页）、极宽极窄（响应式）、特殊字符（转义/emoji）
- [ ] **状态切换无闪烁**：状态间过渡平滑，无布局抖动
  - 判定标准：CLS（Cumulative Layout Shift）< 0.1
- [ ] **状态矩阵已产出**：四态的触发条件、UI 表现、交互行为已文档化
  - 判定标准：见 [state-quality.md](state-quality.md) 模板已填写

### 3. 无障碍（a11y）

#### 基础 a11y

- [ ] **语义化 HTML**：用 `<button>` 不用 `<div @click>`，用 `<nav>` 不用 `<div class="nav">`
  - 判定标准：禁用 CSS 后页面结构仍有意义
- [ ] **ARIA 属性正确**：动态内容有 `aria-live`，图标按钮有 `aria-label`，展开/折叠有 `aria-expanded`
  - 判定标准：屏幕阅读器能正确朗读状态变化
- [ ] **键盘可达**：所有交互元素 Tab 可达，Enter/Space 可触发
  - 判定标准：拔掉鼠标仅用键盘能完成所有操作
- [ ] **焦点管理**：弹窗打开聚焦内部首个可交互元素，关闭后焦点归还触发器
  - 判定标准：焦点不丢失、不跳跃到页面顶部
- [ ] **颜色对比度**：文字与背景对比度 ≥ 4.5:1（WCAG AA），大文字 ≥ 3:1
  - 判定标准：用对比度检查工具验证
- [ ] **不依赖颜色传达信息**：错误状态不仅变红，还要有图标/文字
  - 判定标准：色盲用户能识别状态

#### WCAG 2.2 新增标准（必须满足）

- [ ] **2.4.11 Focus Not Obscured (Minimum) (AA)**：元素获得焦点时不被其他内容遮挡，至少部分可见
  - 判定标准：键盘 Tab 到任意元素，该元素至少有部分在视口内可见，不被 sticky header / 浮层 / 广告遮挡
- [ ] **2.4.12 Focus Not Obscured (Enhanced) (AAA)**：焦点元素必须完全可见
  - 判定标准：键盘聚焦的元素 100% 在视口内可见，无任何遮挡
- [ ] **2.4.13 Focus Appearance (AA)**：焦点指示器有尺寸和对比度要求
  - 判定标准：禁止 `outline: none`；推荐 `outline: 3px solid #005fcc; outline-offset: 2px;`；用 `:focus-visible` 区分键盘/鼠标聚焦；焦点指示器最小尺寸 ≥ 2 CSS 像素厚
- [ ] **2.5.7 Dragging Movements (AA)**：拖拽操作必须提供键盘替代方案
  - 判定标准：所有拖拽功能（如拖拽排序、拖拽调整大小）都有键盘操作路径（方向键 / 菜单选项）
- [ ] **2.5.8 Target Size (Minimum) (AA)**：触摸目标至少 24×24 CSS 像素
  - 判定标准：所有可点击元素的实际命中区域 ≥ 24×24px；推荐 44×44px（Apple HIG）/ 48×48px（Google Material）
- [ ] **3.3.7 Redundant Entry (AA)**：多步流程中已输入的信息不要让用户重复输入
  - 判定标准：同一流程中已收集的信息自动填充或提供选择，不让用户二次输入

### 4. 国际化（i18n）

- [ ] **所有用户可见文本走 i18n**：不硬编码中文/英文
  - 判定标准：搜索源码无中文字面量（注释除外），所有文案走 `t('key')` / `i18n.t('key')`
- [ ] **日期/数字本地化**：用 `Intl.DateTimeFormat` / `Intl.NumberFormat`，不手动拼接
  - 判定标准：日期格式随 locale 变化，数字千分位随 locale 变化
- [ ] **复数处理**：用 ICU MessageFormat，不写 `if (count === 1)`
  - 判定标准：`{count, plural, one {# item} other {# items}}` 形式
- [ ] **文本长度弹性**：德语比英语长 30%，布局要适应
  - 判定标准：长文本不撑破布局，用 `text-overflow: ellipsis` 或 flex 收缩
- [ ] **RTL 支持**：如需支持阿拉伯语/希伯来语，布局逻辑用 `start/end` 不用 `left/right`
  - 判定标准：CSS 用 `margin-inline-start` / `inset-inline-start`，逻辑属性替代物理属性
- [ ] **不拼接句子**：不写 `"Welcome " + name + "!"`，用 `"Welcome, {name}!"` 模板
  - 判定标准：不同语言语序不同，拼接会破坏语法

### 5. 主题与设计 token

- [ ] **颜色用 token**：`var(--color-primary)` / `theme.colors.primary`，不硬编码 `#1890ff`
  - 判定标准：搜索源码无 `#[0-9a-fA-F]{3,8}` 字面量（注释除外）
- [ ] **间距用 token**：`var(--spacing-md)` / `theme.spacing.md`，不硬编码 `16px`
  - 判定标准：间距值来自预定义的 spacing scale（如 4/8/12/16/24/32）
- [ ] **字号用 token**：`var(--font-size-sm)`，不硬编码 `14px`
  - 判定标准：字号来自预定义的 type scale
- [ ] **圆角/阴影用 token**：保持视觉一致性
  - 判定标准：`border-radius` / `box-shadow` 走 token
- [ ] **暗色模式**：所有颜色走 token，暗色模式自动适配
  - 判定标准：切换主题后无硬编码颜色残留
- [ ] **z-index 用 token**：不硬编码 `z-index: 9999`
  - 判定标准：用预定义层级（如 `--z-dropdown / --z-modal / --z-toast`）
- [ ] **结构层样式独立**：布局/尺寸/定位样式与风格无关，用固定值或独立 token（不引用语义 token）
  - 判定标准：结构层样式在切换风格预设时不需要改动
- [ ] **语义层 token 完整**：所有颜色/间距/字号/圆角/阴影走语义 token（如 `var(--color-primary)`），不硬编码具体值
  - 判定标准：搜索组件源码无 `#[0-9a-fA-F]{3,8}` 字面量、无 `Npx` 间距/字号字面量（结构层除外）
- [ ] **风格层由预设提供**：组件代码不实现风格层 token 值，由 `references/style-presets/` 预设文件提供
  - 判定标准：组件内无 `--color-primary: #XXX` 的赋值，只有 `var(--color-primary)` 的引用
- [ ] **风格切换测试通过**：至少切换 2 种风格预设（apple/vercel/github/material）验证 UI 正确
  - 判定标准：切换预设后组件渲染正确，无样式破损
- [ ] **业务层样式继承**（业务层组件必查）：业务层组件继承原子层语义 token，不引入新的硬编码值
  - 判定标准：业务层组件可定义业务语义 token（如 `--color-user-avatar-border`），但值仍引用语义层（如 `var(--color-border)`）

### 6. 响应式

- [ ] **移动端**（< 768px）：布局合理，触摸目标 ≥ 44px
  - 判定标准：单列布局，关键操作拇指可达
- [ ] **平板**（768-1024px）：布局合理
  - 判定标准：可双列布局，利用宽屏空间
- [ ] **桌面**（> 1024px）：布局合理
  - 判定标准：多列布局，hover 交互可用
- [ ] **超宽屏**（> 1920px）：内容合理限制最大宽度或自适应
  - 判定标准：不出现超长行宽影响阅读（行宽 ≤ 1200px 为宜）
- [ ] **断点用 token**：不硬编码 `@media (max-width: 768px)`
  - 判定标准：用 `breakpoints.md` / `--breakpoint-md` 等 token
- [ ] **横竖屏适配**：移动端横屏布局不破
  - 判定标准：`orientation: landscape` 验证

### 7. 性能

#### React 特定

- [ ] **React.memo 用于叶子组件**：大型组件树中的叶子组件用 `memo` 包裹
  - 判定标准：仅对渲染开销 > 1ms 的叶子组件用 memo；轻量组件（< 1ms 渲染）不用 memo（memo 本身有开销）
- [ ] **useMemo 用于昂贵计算**：派生数据计算复杂度 O(n) 以上时缓存
  - 判定标准：简单计算（如 `a + b`）不用 useMemo，开销大于 useMemo 本身
- [ ] **useCallback 用于稳定引用**：传给 memo 子组件的回调、context provider 的值用 useCallback
  - 判定标准：避免因回调引用变化导致子组件无谓 re-render
- [ ] **useEffect/useMemo/useCallback 依赖数组完整**：不遗漏依赖，不故意省略
  - 判定标准：开启 `eslint-plugin-react-hooks` 的 `exhaustive-deps` 规则，无 warning
- [ ] **列表 key 稳定**：用数据唯一 id，不用 index
  - 判定标准：列表项增删时 DOM 不错位
- [ ] **React.lazy 路由级代码分割**：非首屏组件动态导入
  - 判定标准：首屏 JS bundle 不包含路由级重组件

#### Vue 特定

- [ ] **computed 缓存派生状态**：派生数据用 computed，不用 method 调用
  - 判定标准：依赖未变化时不重复计算
- [ ] **shallowRef 处理大对象**：大对象（如列表数据）用 shallowRef，避免深度响应式开销
  - 判定标准：仅顶层响应式，内部修改手动触发
- [ ] **v-for 必须有 key**：且 key 稳定唯一，不用 index
  - 判定标准：列表项增删时 DOM 不错位
- [ ] **v-once / v-memo 优化静态内容**：纯展示且不变化的内容用 v-once
  - 判定标准：减少不必要的 patch

#### 通用性能

- [ ] **虚拟化**：列表 > 50 项考虑虚拟化，> 100 项必须虚拟化
  - 判定标准：DOM 节点数与数据量解耦
- [ ] **图片懒加载**：`loading="lazy"` 或 IntersectionObserver
  - 判定标准：视口外图片不立即加载
- [ ] **防抖节流**：搜索输入（debounce 300ms）、resize/scroll 监听（throttle 16ms）
  - 判定标准：高频事件不触发高频更新
- [ ] **避免内联函数/对象**：JSX 中不写 `onClick={() => ...}` 传给 memo 子组件
  - 判定标准：提取为 useCallback 或类方法

### 8. 安全

- [ ] **用户输入转义**：不直接 `v-html` / `dangerouslySetInnerHTML`
  - 判定标准：必须用 `v-html` 时先经过 DOMPurify 等清洗库
- [ ] **不信任外部数据**：校验 API 返回的数据结构
  - 判定标准：用 zod / yup / TypeScript 类型守卫验证运行时数据
- [ ] **XSS 防护**：URL 参数校验，不直接拼接到 `href` / `src`
  - 判定标准：URL 用 allowlist 校验协议（仅允许 http/https/mailto/tel）
- [ ] **不暴露敏感信息**：错误信息不包含 stack trace、token、内部路径
  - 判定标准：生产环境错误边界显示通用提示
- [ ] **CSRF 防护**：表单提交带 CSRF token（如适用）
  - 判定标准：后端校验 token 有效性

### 9. 测试覆盖

- [ ] **单元测试**：覆盖每个 prop 默认值和传入值
  - 判定标准：边界情况（空值、极值、非法值）有测试
- [ ] **emit/callback 测试**：每个 emit / callback 的触发条件和 payload 都有测试
  - 判定标准：模拟用户交互验证事件触发
- [ ] **插槽测试**：每个插槽的渲染有测试
  - 判定标准：默认插槽 + 具名插槽 + 作用域插槽
- [ ] **四态测试**：loading/error/empty/success 各有测试
  - 判定标准：模拟对应数据状态验证渲染
- [ ] **a11y 测试**：axe-core 自动扫描无 violation
  - 判定标准：CI 中集成 axe 扫描，0 critical/serious issue
- [ ] **视觉回归测试**：关键 UI 状态有快照
  - 判定标准：四态各一张 + 响应式断点各一张
- [ ] **键盘交互测试**：Tab 顺序、Enter/Space 触发有测试
  - 判定标准：模拟键盘事件验证交互

### 10. 可维护性

- [ ] **复杂逻辑有注释**：注释说明 why 不说明 what
  - 判定标准：非显而易见的算法、业务规则、workaround 有注释
- [ ] **命名表意**：变量名词性、函数动词性、布尔值 is/has/can 前缀
  - 判定标准：无需注释即可理解意图
- [ ] **文件结构清晰**：单一职责，一个文件一个组件 / 一个 composable
  - 判定标准：文件名与导出一致，入口 index 唯一
- [ ] **类型完整**：所有 props/emits/events 有 TypeScript 类型
  - 判定标准：无 `any`，无 `@ts-ignore`（除非有注释说明原因）
- [ ] **TODO 有 issue 关联**：不写裸 `// TODO`
  - 判定标准：`// TODO(#123): description` 形式
- [ ] **无魔法数字**：数字字面量提取为命名常量
  - 判定标准：除 0/1 外的数字都有语义命名
- [ ] **无死代码**：无未使用的 import / 变量 / 函数
  - 判定标准：开启 `noUnusedLocals` / `noUnusedParameters`

#### README 首次产出检查

- [ ] **README.md 存在**：组件目录根部有 README.md
  - 判定标准：`<组件目录>/README.md` 文件存在
- [ ] **9 个 H2 节齐全**：元信息 / 是什么 / 快速上手 / API 参考 / 四态说明 / 使用示例 / 设计决策 / 可访问性 / 变更记录
  - 判定标准：grep `^## ` 计数 ≥ 9
- [ ] **API 参考表格完整**：Props/Emits/Slots/Methods 四张表格覆盖全部 API
  - 判定标准：表格行数与 types.ts / defineProps / defineEmits / defineExpose 的声明数一致
- [ ] **快速上手可复制即用**：示例包含导入 + 必填 props + 效果描述
  - 判定标准：代码块可直接复制到项目中运行
- [ ] **变更记录有 v1.0.0 条目**：初始版本已记录
  - 判定标准：变更记录节包含 `### v1.0.0` 条目

#### README 迭代更新检查

- [ ] **版本号已更新**：元信息节的版本号与本次变更匹配
  - 判定标准：破坏性变更→MAJOR，新功能→MINOR，bug 修复→PATCH
- [ ] **API 表格已同步**：新增/修改/废弃的 API 已更新到对应表格
  - 判定标准：对比 git diff，代码变更的 API 在表格中也有对应变更
- [ ] **变更记录新增条目**：本次版本变更已记录在变更记录顶部
  - 判定标准：变更记录节顶部有本次版本条目，使用 Added/Changed/Deprecated/Removed/Fixed 分类
- [ ] **废弃项有移除计划**：废弃的 API 标注了移除版本
  - 判定标准：`⚠️ [deprecated since vX.Y.Z]` 标记包含「将在 vA.B.C 移除」

---

## 二、禁止事项（Bans）

每条附 ❌ 错误示例 + ✅ 正确示例 + 判定标准。违反任意一条即不可合并。

### 禁令 1：禁止跳过调研直接写代码

不熟悉的领域必须先走 Phase 1 调研，建立知识基础后再设计 API。

❌ **错误示例**：

```jsx
// 直接开始写 DatePicker，不知道日期本地化、时区、周起始日等坑
function DatePicker(props) {
  const [date, setDate] = useState(new Date())
  // 凭想象设计 API...
}
```

✅ **正确示例**：

```markdown
// Phase 1 调研笔记：
// - 日期本地化：用 Intl.DateTimeFormat，不手动拼接
// - 时区：存储 UTC，展示用本地时区
// - 周起始日：不同地区不同（中国周一，美国周日）
// - 键盘交互：方向键导航，Enter 选择
// 调研完成后再进入 Phase 2 设计 API
```

**判定标准**：能产出调研笔记，列出至少 3 个该领域的已知坑点。

---

### 禁令 2：禁止先写实现再补 API

API 是契约，必须先设计后实现。先写实现会导致 API 被实现细节绑架。

❌ **错误示例**：

```vue
<!-- 先写实现，API 是实现过程中"自然形成"的 -->
<template>
  <div>
    <input v-model="internalValue" @input="onInput" />
    <ul v-if="showList"><li v-for="item in filteredList" @click="select(item)">{{ item }}</li></ul>
  </div>
</template>
<!-- 最后才补 props: { value, list, filterFn, visible } —— 耦合严重 -->
```

✅ **正确示例**：

```markdown
// Phase 2 先产出 component-spec：
// Props: modelValue (string), options (Option[]), filterable (boolean, default: false)
// Emits: update:modelValue, select
// Slots: option (作用域插槽，传 { option })
// 然后进入 Phase 3 实现
```

**判定标准**：有 component-spec 文档，API 设计在实现之前完成。

---

### 禁令 3：禁止忽略四态

只写 success 状态的组件是半成品。loading/error/empty 必须处理。

❌ **错误示例**：

```jsx
function UserList({ users }) {
  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  )
}
// 无 loading、无 error、无 empty 处理
```

✅ **正确示例**：

```jsx
function UserList({ users, isLoading, error, onRetry }) {
  if (isLoading) return <UserListSkeleton />
  if (error) return <ErrorState message={error.message} onRetry={onRetry} />
  if (users.length === 0) return <EmptyState action="创建用户" />
  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  )
}
```

**判定标准**：四态各有明确 UI 表现和交互，状态矩阵已填写。

---

### 禁令 4：禁止硬编码

颜色/文本/间距硬编码是技术债，破坏主题切换和 i18n。

❌ **错误示例**：

```jsx
<button style={{ color: '#1890ff', padding: '16px' }}>
  提交
</button>
```

✅ **正确示例**：

```jsx
<button className={cx(styles.button, theme.buttonPrimary)}>
  {t('actions.submit')}
</button>
// CSS: .button { color: var(--color-primary); padding: var(--spacing-md); }
```

**判定标准**：源码无硬编码颜色值、无硬编码文案、无硬编码间距值。

---

### 禁令 5：禁止过度抽象

只有一个使用场景时不要提前抽象。YAGNI（You Aren't Gonna Need It）。

❌ **错误示例**：

```ts
// 为"未来可能的需求"设计通用配置系统
interface ComponentConfig {
  theme?: ThemeConfig
  behavior?: BehaviorConfig
  rendering?: RenderingConfig
  // ...10 个嵌套配置项，但当前只有一个使用场景
}
```

✅ **正确示例**：

```ts
// 当前场景需要的最小 API
interface ButtonProps {
  variant: 'primary' | 'secondary'
  size: 'sm' | 'md' | 'lg'
  onClick?: () => void
  children: React.ReactNode
}
// 出现第二个场景时再抽象
```

**判定标准**：抽象层级与使用场景数量匹配；无"未来可能用到"的配置项。

---

### 禁令 6：禁止忽略现有代码

写新组件前必须搜索可复用模块，避免重复造轮子。

❌ **错误示例**：

```bash
# 项目已有 @/components/Button，但没搜索直接新建
mkdir src/components/MyButton
# 写了一个功能重复的按钮组件
```

✅ **正确示例**：

```bash
# Phase 3.1 复用识别：
# 1. Grep "Button" src/ —— 发现已有 @/components/Button
# 2. 评估：现有 Button 满足需求？满足 → 复用；不满足 → 扩展或新建
# 3. 决策记录在 component-spec 中
```

**判定标准**：有复用识别检查记录，确认无重复组件。

---

### 禁令 7：禁止移除焦点指示器

`outline: none` 违反 WCAG 2.2 的 2.4.13 Focus Appearance，键盘用户无法看到当前焦点位置。

❌ **错误示例**：

```css
/* 移除焦点指示器，键盘用户无法定位 */
button:focus {
  outline: none;
}

/* 或用相同颜色伪装，对比度不足 */
button:focus {
  outline: 1px solid transparent;
}
```

✅ **正确示例**：

```css
/* 用 :focus-visible 区分键盘/鼠标聚焦 */
button:focus-visible {
  outline: 3px solid #005fcc;
  outline-offset: 2px;
}

/* 鼠标点击不显示焦点环 */
button:focus:not(:focus-visible) {
  outline: none;
}
```

**判定标准**：键盘 Tab 导航时焦点元素有清晰可见的焦点环，对比度 ≥ 3:1，厚度 ≥ 2px。

---

### 禁令 8：禁止用 div 模拟交互元素

`<div @click>` 不可键盘可达，无语义，屏幕阅读器不识别为可交互。

❌ **错误示例**：

```jsx
// div 模拟按钮，键盘不可达，无 ARIA 角色
<div onClick={handleClick} className="btn">提交</div>

// div 模拟导航
<div className="nav">
  <div onClick={goHome}>首页</div>
  <div onClick={goAbout}>关于</div>
</div>
```

✅ **正确示例**：

```jsx
// 用语义化元素
<button onClick={handleClick} className="btn">提交</button>

<nav className="nav">
  <a href="/home">首页</a>
  <a href="/about">关于</a>
</nav>
```

**判定标准**：禁用 CSS 后页面结构仍有意义；所有交互元素原生可键盘操作。

---

### 禁令 9：禁止用 index 作为列表 key

index 作为 key 会导致列表增删时 DOM 复用错乱，状态串项。

❌ **错误示例**：

```jsx
// index 作为 key，删除第一项后所有项的 state 错位
{items.map((item, index) => (
  <ListItem key={index} data={item} />
))}
```

```vue
<!-- Vue 同样禁止 -->
<li v-for="(item, index) in items" :key="index">{{ item.name }}</li>
```

✅ **正确示例**：

```jsx
// 用数据唯一 id
{items.map(item => (
  <ListItem key={item.id} data={item} />
))}
```

```vue
<li v-for="item in items" :key="item.id">{{ item.name }}</li>
```

**判定标准**：列表项有稳定唯一的 key，key 不随列表顺序变化而变化。

---

### 禁令 10：禁止在子组件修改 props（Vue）/ 在 render 中修改 state（React）

Vue props 是只读的，子组件修改会破坏单向数据流。React 在 render 中修改 state 会导致无限循环。

❌ **错误示例**：

```vue
<!-- Vue: 子组件直接修改 prop -->
<script setup>
const props = defineProps(['modelValue'])
// ❌ 直接修改 prop
props.modelValue = 'new value'
</script>
```

```jsx
// React: render 中修改 state，无限循环
function Component({ count }) {
  const [doubled, setDoubled] = useState(0)
  setDoubled(count * 2) // ❌ render 中调用 setState
  return <div>{doubled}</div>
}
```

✅ **正确示例**：

```vue
<!-- Vue: 用 emit 通知父组件修改 -->
<script setup>
const props = defineProps(['modelValue'])
const emit = defineEmits(['update:modelValue'])
const update = (val) => emit('update:modelValue', val)
</script>
```

```jsx
// React: 用 useMemo 或 useEffect 派生
function Component({ count }) {
  const doubled = useMemo(() => count * 2, [count])
  return <div>{doubled}</div>
}
```

**判定标准**：Vue props 在子组件内只读；React render 函数纯无副作用。

---

### 禁令 11：禁止拖拽操作不提供键盘替代

违反 WCAG 2.2 的 2.5.7 Dragging Movements，运动障碍用户无法操作。

❌ **错误示例**：

```jsx
// 拖拽排序，但无键盘替代方案
<DraggableList
  items={items}
  onReorder={handleReorder}
/>
// 用户只能用鼠标拖拽，无法用键盘排序
```

✅ **正确示例**：

```jsx
// 拖拽 + 键盘方向键双重支持
<DraggableList
  items={items}
  onReorder={handleReorder}
  keyboardReorder  // 启用键盘排序
/>
// 实现：聚焦列表项后，按方向键上下移动，Enter 确认
```

**判定标准**：所有拖拽功能都有键盘操作路径，能用键盘完成相同操作。

---

### 禁令 12：禁止触摸目标过小

违反 WCAG 2.2 的 2.5.8 Target Size (Minimum)，触摸屏用户难以精准点击。

❌ **错误示例**：

```css
/* 触摸目标过小，仅 16×16px */
.icon-button {
  width: 16px;
  height: 16px;
  padding: 0;
}
```

✅ **正确示例**：

```css
/* 触摸目标至少 24×24px（AA），推荐 44×44px */
.icon-button {
  width: 44px;
  height: 44px;
  /* 视觉尺寸可以小，但命中区域要大 */
  /* 用 padding 扩大命中区域 */
}

/* 或用伪元素扩大命中区域 */
.icon-button::before {
  content: '';
  position: absolute;
  inset: -10px; /* 扩大 10px 命中区域 */
}
```

**判定标准**：所有可点击元素的实际命中区域 ≥ 24×24px（AA），移动端推荐 ≥ 44×44px。

---

### 禁令 13：禁止迭代后不更新 README

README 是组件的单一入口文档，过期的 README 比没有 README 更危险——AI 或开发者按过期文档使用组件，会导致调用不存在的 API 或错过新功能。

❌ **错误示例**：

```markdown
# README.md（v1.0.0 时的版本，未更新）

## API 参考
### Props
| 名称 | 类型 | 必填 | 默认值 | 说明 | 版本 |
|------|------|------|--------|------|------|
| items | Item[] | 是 | — | 数据列表 | v1.0.0 |

# 但代码已经到 v1.3.0，新增了 pageSize、loading 两个 prop
# README 完全没更新，AI 按旧 README 使用会遗漏新功能
```

✅ **正确示例**：

```markdown
# README.md（v1.3.0，每次迭代都同步更新）

## 元信息
| 字段 | 值 |
|------|-----|
| 版本 | v1.3.0 |

## API 参考
### Props
| 名称 | 类型 | 必填 | 默认值 | 说明 | 版本 |
|------|------|------|--------|------|------|
| items | Item[] | 是 | — | 数据列表 | v1.0.0 |
| pageSize | number | 否 | 10 | 每页条数 | v1.2.0 |
| loading | boolean | 否 | false | 加载状态 | v1.3.0 |

## 变更记录
### v1.3.0 (2026-06-25)
- **Added**: 新增 `loading` prop，支持加载状态
### v1.2.0 (2026-06-20)
- **Added**: 新增 `pageSize` prop，支持分页
```

**判定标准**：每次组件迭代（新增/修改/删除 API、修改默认值、修复 bug）后，README 的版本号、API 表格、变更记录三处必须同步更新。git diff 显示代码有 API 变更但 README 无对应变更 → 不通过。

---

### 禁令 14：禁止硬编码风格层值

具体颜色值（如 `#007AFF`）、具体间距值（如 `16px`）属于风格层，必须走语义 token。硬编码风格层值会破坏三层样式分离架构，导致风格切换失效。

❌ **错误示例**：

```css
/* 硬编码颜色和间距，破坏风格切换 */
.button {
  color: #007AFF;
  background-color: #FFFFFF;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-size: 14px;
}
```

✅ **正确示例**：

```css
/* 走语义 token，风格层由预设文件提供 */
.button {
  color: var(--color-primary);
  background-color: var(--color-surface);
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  font-size: var(--font-size-sm);
}
```

**判定标准**：组件源码（含 template/style）无硬编码颜色值、无硬编码间距/字号/圆角值（结构层固定值除外）。搜索源码无 `#[0-9a-fA-F]{3,8}` 字面量、无 `Npx` 间距/字号字面量（结构层除外）。

---

## 三、检查项到 Phase 映射表

标注每项检查在哪个 Phase 执行。Phase 2-5 完成时对照本表自检。

| 检查维度 | 检查项 | 检查 Phase | 说明 |
|---------|--------|-----------|------|
| **职责与 API 设计** | 职责单一 | Phase 2 | API 契约设计时验证 |
| 职责与 API 设计 | API 最小化 | Phase 2 | 每个 prop 必要性审查 |
| 职责与 API 设计 | 正交设计 | Phase 2 | props 组合语义验证 |
| 职责与 API 设计 | 默认值合理 | Phase 2 | 80% 场景零配置验证 |
| 职责与 API 设计 | 受控/非受控 | Phase 2 | API 契约设计时确定 |
| 职责与 API 设计 | 向后兼容 | Phase 2 | 新增 prop 可选性验证 |
| 职责与 API 设计 | 命名清晰 | Phase 2 | API 评审时验证 |
| **四态完整性** | Loading 态 | Phase 4 | 状态矩阵填写时验证 |
| 四态完整性 | Error 态 | Phase 4 | 状态矩阵填写时验证 |
| 四态完整性 | Empty 态 | Phase 4 | 状态矩阵填写时验证 |
| 四态完整性 | Success 边界 | Phase 4 | 边界情况测试时验证 |
| 四态完整性 | 状态切换无闪烁 | Phase 4 | 视觉验证 |
| 四态完整性 | 状态矩阵已产出 | Phase 4 | 产出物检查 |
| **无障碍（a11y）** | 语义化 HTML | Phase 4 | 结构实现时验证 |
| 无障碍 | ARIA 属性正确 | Phase 4 | 交互实现时验证 |
| 无障碍 | 键盘可达 | Phase 4 | 键盘交互测试 |
| 无障碍 | 焦点管理 | Phase 4 | 弹窗/模态实现时验证 |
| 无障碍 | 颜色对比度 | Phase 4 | 视觉审查 |
| 无障碍 | 不依赖颜色 | Phase 4 | 视觉审查 |
| 无障碍 | 2.4.11 Focus Not Obscured (Min) | Phase 4 | 键盘 Tab 全流程验证 |
| 无障碍 | 2.4.12 Focus Not Obscured (Enhanced) | Phase 4 | 键盘 Tab 全流程验证 |
| 无障碍 | 2.4.13 Focus Appearance | Phase 4 | CSS 焦点样式审查 |
| 无障碍 | 2.5.7 Dragging Movements | Phase 4 | 拖拽功能实现时验证 |
| 无障碍 | 2.5.8 Target Size (Minimum) | Phase 4 | 触摸目标尺寸审查 |
| 无障碍 | 3.3.7 Redundant Entry | Phase 4 | 多步流程实现时验证 |
| **国际化（i18n）** | 文本不硬编码 | Phase 4 | 文案审查 |
| 国际化 | 日期/数字本地化 | Phase 4 | 数据展示实现时验证 |
| 国际化 | 复数处理 | Phase 4 | 文案审查 |
| 国际化 | 文本长度弹性 | Phase 4 | 布局测试 |
| 国际化 | RTL 支持 | Phase 4 | 如需支持 RTL 时验证 |
| 国际化 | 不拼接句子 | Phase 4 | 文案审查 |
| **主题与设计 token** | 颜色用 token | Phase 4 | CSS 审查 |
| 主题与设计 token | 间距用 token | Phase 4 | CSS 审查 |
| 主题与设计 token | 字号用 token | Phase 4 | CSS 审查 |
| 主题与设计 token | 圆角/阴影用 token | Phase 4 | CSS 审查 |
| 主题与设计 token | 暗色模式 | Phase 4 | 主题切换测试 |
| 主题与设计 token | z-index 用 token | Phase 4 | 层级审查 |
| 主题与设计 token | 结构层样式独立 | Phase 3/4 | 样式架构决策时验证 |
| 主题与设计 token | 语义层 token 完整 | Phase 4 | CSS 审查 |
| 主题与设计 token | 风格层由预设提供 | Phase 3/4 | 样式架构决策时验证 |
| 主题与设计 token | 风格切换测试通过 | Phase 4 | 风格切换测试 |
| 主题与设计 token | 业务层样式继承 | Phase 3/4 | 业务层组件实现时验证 |
| **响应式** | 移动端 | Phase 4 | 响应式测试 |
| 响应式 | 平板 | Phase 4 | 响应式测试 |
| 响应式 | 桌面 | Phase 4 | 响应式测试 |
| 响应式 | 超宽屏 | Phase 4 | 响应式测试 |
| 响应式 | 断点用 token | Phase 4 | CSS 审查 |
| 响应式 | 横竖屏适配 | Phase 4 | 移动端测试 |
| **性能** | React.memo 叶子组件 | Phase 3/4 | 结构拆分时决策，实现时验证 |
| 性能 | useMemo 昂贵计算 | Phase 4 | 实现时验证 |
| 性能 | useCallback 稳定引用 | Phase 4 | 实现时验证 |
| 性能 | 依赖数组完整 | Phase 4 | ESLint 规则验证 |
| 性能 | 列表 key 稳定 | Phase 4 | 列表实现时验证 |
| 性能 | React.lazy 代码分割 | Phase 3 | 结构拆分时决策 |
| 性能 | Vue computed 缓存 | Phase 4 | 实现时验证 |
| 性能 | Vue shallowRef 大对象 | Phase 4 | 实现时验证 |
| 性能 | v-for key 稳定 | Phase 4 | 列表实现时验证 |
| 性能 | v-once/v-memo 静态内容 | Phase 4 | 实现时验证 |
| 性能 | 虚拟化（>50 考虑，>100 必须） | Phase 3/4 | 结构拆分时决策 |
| 性能 | 图片懒加载 | Phase 4 | 实现时验证 |
| 性能 | 防抖节流 | Phase 4 | 高频事件实现时验证 |
| 性能 | 避免内联函数 | Phase 4 | 代码审查 |
| **安全** | 用户输入转义 | Phase 4 | 实现时验证 |
| 安全 | 不信任外部数据 | Phase 4 | 数据接入时验证 |
| 安全 | XSS 防护 | Phase 4 | URL 处理时验证 |
| 安全 | 不暴露敏感信息 | Phase 4 | 错误处理时验证 |
| 安全 | CSRF 防护 | Phase 4 | 表单实现时验证 |
| **测试覆盖** | 单元测试 | Phase 5 | 测试编写时验证 |
| 测试覆盖 | emit/callback 测试 | Phase 5 | 测试编写时验证 |
| 测试覆盖 | 插槽测试 | Phase 5 | 测试编写时验证 |
| 测试覆盖 | 四态测试 | Phase 5 | 测试编写时验证 |
| 测试覆盖 | a11y 测试 | Phase 5 | axe 扫描验证 |
| 测试覆盖 | 视觉回归测试 | Phase 5 | 快照测试验证 |
| 测试覆盖 | 键盘交互测试 | Phase 5 | 键盘测试验证 |
| **可维护性** | 复杂逻辑有注释 | Phase 3/4 | 代码审查 |
| 可维护性 | 命名表意 | Phase 3/4 | 代码审查 |
| 可维护性 | 文件结构清晰 | Phase 3 | 结构拆分时验证 |
| 可维护性 | 类型完整 | Phase 3/4 | 类型检查验证 |
| 可维护性 | TODO 有 issue 关联 | Phase 3/4 | 代码审查 |
| 可维护性 | 无魔法数字 | Phase 4 | 代码审查 |
| 可维护性 | 无死代码 | Phase 3/4 | ESLint 验证 |
| **README 首次产出** | README.md 存在 | Phase 5 | 文件存在性检查 |
| README 首次产出 | 9 个 H2 节齐全 | Phase 5 | grep `^## ` 验证 |
| README 首次产出 | API 参考表格完整 | Phase 5 | 表格行数与声明数对比 |
| README 首次产出 | 快速上手可复制即用 | Phase 5 | 示例可运行性验证 |
| README 首次产出 | 变更记录有 v1.0.0 | Phase 5 | 初始条目检查 |
| **README 迭代更新** | 版本号已更新 | Phase 5 | SemVer 规则验证 |
| README 迭代更新 | API 表格已同步 | Phase 5 | git diff 对比验证 |
| README 迭代更新 | 变更记录新增条目 | Phase 5 | 顶部条目检查 |
| README 迭代更新 | 废弃项有移除计划 | Phase 5 | 废弃标记检查 |

---

## 使用说明

1. **Phase 2 完成时**：检查"职责与 API 设计"全部项 + "四态完整性"的状态矩阵产出
2. **Phase 3 完成时**：检查"可维护性"的文件结构 + "性能"的结构性决策（memo/lazy/虚拟化）
3. **Phase 4 完成时**：检查全部 10 个维度——这是质量闸门的核心
4. **Phase 5 完成时**：检查"测试覆盖"全部项 + "README 首次产出"或"README 迭代更新"全部项

**禁令是硬性红线**，违反任意一条不可合并。检查清单中的项如有豁免，必须在 component-spec 中显式标注理由。
