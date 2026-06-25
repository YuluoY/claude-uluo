# [ComponentName]

> 一句话描述组件用途（≤20字）

---

## 元信息

| 字段 | 值 |
|------|-----|
| 组件名 | [ComponentName] |
| 版本 | v1.0.0 |
| 框架 | [Vue 3 / React / Web Component] |
| 状态 | [stable / experimental / deprecated] |
| 入口路径 | `src/components/[ComponentName]/index.[vue|ts|tsx]` |
| 依赖 | [列出依赖的 composable/hook/子组件/第三方库，无则填「无」] |
| 组件层次 | [原子层 / 业务层] |
| 风格兼容性 | [apple, vercel, github, material / 全部 / 特定子集] |

<!-- 填写指南：
- 组件名用 PascalCase
- 版本号与 package.json 保持一致
- 框架三选一，删除其他选项
- 状态三选一：stable（稳定）/ experimental（实验性）/ deprecated（已废弃）
- 入口路径相对仓库根
- 依赖无则填「无」
- 组件层次二选一：原子层（通用基础组件，如 Button/Input/Modal）/ 业务层（组合原子组件 + 业务语义，如 UserSelect/OrderTable）
- 风格兼容性：列出兼容的风格预设，如「apple, vercel」或「全部」
-->

---

## 是什么

[一句话描述，≤20字]

**做什么：**
- [职责 1]
- [职责 2]
- [职责 3]

**不做什么：**
- [非目标 1]
- [非目标 2]

<!-- 填写指南：
- 一句话描述用「动词 + 对象 + 用途」结构
- 做什么：2-4 条核心职责
- 不做什么：2-4 条明确非目标，帮助使用者避免误用
-->

---

## 快速上手

[最小可用示例——导入 + 必填 props + 效果描述]

<!-- 填写指南：选择组件对应的框架，删除其他框架的示例 -->

<!-- Vue -->
```vue
<script setup lang="ts">
import [ComponentName] from '@/components/[ComponentName]'
</script>

<template>
  <[ComponentName] :[requiredProp]="[value]" />
</template>
```
预期渲染：[描述效果]

<!-- React -->
```tsx
import { [ComponentName] } from '@/components/[ComponentName]'

export function Demo() {
  return <[ComponentName] [requiredProp]={[value]} />
}
```
预期渲染：[描述效果]

<!-- Web Component -->
```html
<script type="module" src="@/components/[ComponentName]/index.js"></script>

<[component-name] [required-prop]="[value]"></[component-name]>
```
预期渲染：[描述效果]

---

## API 参考

### Props

| 名称 | 类型 | 必填 | 默认值 | 说明 | 版本 |
|------|------|------|--------|------|------|
| [propName] | [Type] | [是/否] | [默认值或—] | [说明] | v1.0.0 |

<!-- 填写指南：
- 名称：kebab-case（Vue 模板）或 camelCase（React）
- 类型：TypeScript 类型标注
- 必填：是 / 否
- 默认值：字面量，无则填 —
- 说明：用途描述；废弃项加前缀 ⚠️ [deprecated since vX.Y.Z] [替代方案]。将在 vA.B.C 移除。
- 版本：引入该 prop 的版本号
-->

### Emits / Events

| 名称 | 参数 | 触发时机 | 版本 |
|------|------|---------|------|
| [eventName] | [参数类型] | [触发条件] | v1.0.0 |

<!-- 填写指南：
- 名称：事件名，kebab-case（Vue）或 camelCase（React）
- 参数：参数类型签名，如 (row: Row)
- 触发时机：何时触发
- 版本：引入版本
-->

### Slots

| 名称 | 作用域参数 | 默认内容 | 说明 | 版本 |
|------|----------|---------|------|------|
| [slotName] | [参数] | [默认内容或—] | [说明] | v1.0.0 |

<!-- 填写指南：
- 名称：slot 名，默认 slot 用 default
- 作用域参数：透传给 slot 的参数类型，无则填 —
- 默认内容：不传 slot 时的默认渲染，无则填 —
- 说明：用途描述
- 版本：引入版本
-->

### Methods

<!-- 如无通过 ref/defineExpose 暴露的方法，删除本节 -->

| 名称 | 参数 | 返回值 | 说明 | 版本 |
|------|------|--------|------|------|
| [methodName] | [参数类型] | [返回类型] | [说明] | v1.0.0 |

<!-- 填写指南：
- 名称：方法名
- 参数：参数类型签名
- 返回值：返回类型
- 说明：用途描述
- 版本：引入版本
-->

---

## 四态说明

| 状态 | 触发条件 | UI 表现 |
|------|---------|---------|
| Loading | [条件] | [骨架屏/spinner + 描述] |
| Error | [条件] | [错误信息 + 重试按钮] |
| Empty | [条件] | [空状态插图 + 引导文案] |
| Success | [条件] | [正常渲染] |

<!-- 填写指南：
- 四态必须全部覆盖
- 触发条件：明确进入该状态的条件
- UI 表现：该状态下的视觉与交互
- 若组件无某状态（如纯展示组件无 Loading），仍需保留行并注明「不适用」
-->

---

## 使用示例

### [场景 1 标题]

[一句话说明]

```[lang]
[完整代码]
```

### [场景 2 标题]

[一句话说明]

```[lang]
[完整代码]
```

### [场景 3 标题]

[一句话说明]

```[lang]
[完整代码]
```

<!-- 填写指南：
- 2-4 个常见场景
- 每个示例有 H3 标题 + 一句话说明 + 完整可运行代码
- 代码块必须标注语言标识（vue/tsx/ts/html）
- 代码包含导入、模板、必要的数据定义
-->

---

## 设计决策

### [决策 1 标题]

- **决策**：[做了什么选择]
- **理由**：[为什么这样选]

### [决策 2 标题]

- **决策**：[做了什么选择]
- **理由**：[为什么这样选]

<!-- 填写指南：
- 仅记录有取舍的、非显然的决策
- 避免流水账（如「使用 TypeScript」这种无需解释的）
- 每条决策必须附理由
- 常见决策：API 设计取舍、性能 vs 功能、内置 vs 外置、约定 vs 配置
-->

---

## 可访问性

- [a11y 特性 1：如「键盘可达，Tab 导航逻辑顺序」]
- [a11y 特性 2：如「ARIA 属性正确，aria-label 标注图标按钮」]
- [a11y 特性 3：如「焦点管理，弹窗打开聚焦内部，关闭归还焦点」]
- [a11y 特性 4：如「颜色对比度 ≥ 4.5:1（WCAG AA）」]

**键盘操作：**

| 按键 | 行为 |
|------|------|
| Tab | [行为] |
| Enter / Space | [行为] |
| Escape | [行为] |
| Arrow Up / Down | [行为，如适用] |

<!-- 填写指南：
- 特性列表用无序列表，每条说明一个 a11y 特性
- 键盘操作用表格，列：按键、行为
- 若组件无可交互元素，注明「本组件为纯展示，无键盘交互」
- 常见 a11y 特性：语义化 HTML、ARIA 属性、焦点管理、颜色对比、屏幕阅读器支持
-->

---

## 变更记录

### v1.0.0 (YYYY-MM-DD)
- **Added**: 初始版本，提供 [核心功能]

<!-- 填写指南：
- 倒序排列，最新版本在前
- 每个版本一个 H3，格式：### vX.Y.Z (YYYY-MM-DD)
- 变更类型：Added / Changed / Deprecated / Removed / Fixed
  - Added：新增功能
  - Changed：修改现有功能（非破坏性）
  - Deprecated：标记即将移除的功能
  - Removed：移除功能（通常是之前 deprecated 的）
  - Fixed：Bug 修复
- 每条变更一行，格式：- **[类型]**: [描述]
- 版本号遵循 SemVer：MAJOR（破坏性）/ MINOR（向后兼容新功能）/ PATCH（bug 修复）
-->
