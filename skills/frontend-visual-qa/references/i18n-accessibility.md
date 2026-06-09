# 国际化与视觉 a11y 模块

**加载条件：** 任务涉及 i18n 适配、多语言布局、无障碍视觉检查时加载。

> 参考：[MDN — Using Media Queries for Accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_media_queries/Using_media_queries_for_accessibility)、[WCAG 2.2 — Focus Not Obscured (2.4.11)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)、[ICU MessageFormat](https://unicode-org.github.io/icu/userguide/format_parse/messages/)
> 本模块与 uluo-web-standards 的分工：
> - uluo `accessibility.md` 覆盖 WCAG 2.2 完整实现（语义 HTML、ARIA、键盘焦点管理、表单 label/关联、图片 alt、对比度数值和测试工具）。
> - uluo `infrastructure-setup.md` §10 覆盖 i18n 目录结构和 key 规范。
> - uluo `ui-states.md` 覆盖四态模型代码架构。
> - 本模块只覆盖 uluo 未涉及的视觉层面：i18n 布局影响、用户偏好媒体查询、WCAG 2.4.11 Focus Not Obscured、按钮/表单级别的视觉 contrast check。

## 目录

- [一、国际化](#一国际化)
  - [文本膨胀预算](#文本膨胀预算)
  - [RTL 支持](#rtl-支持)
  - [工具链与测试](#工具链与测试)
- [二、用户偏好媒体查询](#二用户偏好媒体查询)
- [三、视觉 a11y 检查](#三视觉-a11y-检查)
  - [按钮/CTA 级别](#按钮cta-级别)
  - [表单与错误恢复](#表单与错误恢复)

---

## 一、国际化

> uluo `infrastructure-setup.md` §10 定了 i18n 目录结构和 key 引用规范。以下只覆盖 i18n 对布局和视觉的影响。

- 若项目已有 i18n 机制，用户可见字符串必须接入该机制。
- 禁止拼接翻译字符串——使用完整 message key 与插值（ICU MessageFormat：`{count, plural, one {# item} other {# items}}`）。
- 日期/时间/数字/货币按 locale 用 `Intl.DateTimeFormat` / `Intl.NumberFormat` 处理。
- 避免文字烘焙进图片或图标。

### 文本膨胀预算

- i18n 布局预留 **30-40% 文本宽度**。德语通常比英语长 30%——是实用的最长参考。
- 按钮、标签页、筛选项、表头、卡片、弹层、导航项全部弹性——不设固定宽度。
- `min-width: 0` 在 flex/grid item 上防溢出。

### RTL 支持

若 RTL 在范围内：
- CSS **logical properties**：`margin-inline-start` 不用 `margin-left`，`padding-inline` 不用 `padding-left/right`，`border-inline-end` 不用 `border-right`。
- 方向性图标镜像（`transform: scaleX(-1)`），非方向性图标（搜索放大镜）保持不动。
- `dir="rtl"` 属性在 `<html>` 上设置。

### 工具链与测试

- 使用 `react-i18next` / `vue-i18n` / `@nuxtjs/i18n` 等成熟框架——不手写 i18n 逻辑。
- 测试方法：**用德语验证文本膨胀**（所有 UI 元素不破版），**用阿拉伯语验证 RTL**（布局镜像、图标方向正确）。
- `Intl` API 不需要 polyfill——现代浏览器已全覆盖。

## 二、用户偏好媒体查询

AI 默认不处理用户的系统级偏好。以下四个媒体查询是 MUST 级别的——动效、对比、透明、暗色任一缺失都是 a11y 破损。

### prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
- 任何动画、滚动视差、入场过渡必须有此降级。
- Motion 库：用 `useReducedMotion()` hook 包裹动画逻辑。

### prefers-color-scheme

- 暗色模式不是"好看"选项——是 a11y 特性。
- 默认尊重系统偏好。提供手动切换 toggle 但不覆盖 `prefers-color-scheme` 的默认值。
- 语义 token 在两个模式下都保证对比度和层级。

### prefers-contrast

```css
@media (prefers-contrast: more) {
  :root { --color-text-secondary: var(--color-text-primary); }
  body { border: 2px solid currentColor; }

}
```
- `more` → 提高文本和 UI 组件对比度，去掉低对比的二级文案。
- `less` → 只在用户显式请求时降低对比（极少场景）。

### prefers-reduced-transparency

```css
@media (prefers-reduced-transparency: reduce) {
  .glass-panel { background: var(--color-surface-elevated); backdrop-filter: none; }
}

```

- 玻璃态/半透明效果必须有纯色回退。不能假设 backdrop-filter 被支持或用户能看清半透明内容。

## 三、视觉 a11y 检查

> uluo `accessibility.md` 覆盖语义 HTML、ARIA、键盘焦点和表单 label 的完整实现。以下只覆盖 uluo 未涉及的视觉层面。

### WCAG 2.4.11 Focus Not Obscured

sticky header/footer/侧栏不得遮挡被聚焦元素。AI 默认不加这个——因为它假设所有元素都在一个无遮挡的滚动容器里。

```css
html { scroll-padding-top: 80px; } /* sticky header 的高度 */
```
- 任何 sticky/fixed 元素声明后 → 对应 `scroll-padding` 或 `scroll-margin` 必须跟随。
- dialog/modal 内的焦点元素同样适用。

### 按钮/CTA 级别

- **Button contrast（MUST）**：文字 vs 背景 WCAG AA（正文 4.5:1，大字 ≥18px 3:1）。白底白字 / 透明按钮无边框 → 禁止。ghost button 叠加照片→加背幕。
- **CTA button wrap（MUST）**：桌面端一行。折行 = 缩短标签或加宽按钮。
- **Form contrast（MUST）**：placeholder、focus ring、label 全部过 WCAG AA。
- **Tactile feedback**：`:active` 时 `scale-[0.98]` 或 `translateY(1px)`。

### 表单与错误恢复

- 错误信息：什么问题 + 为什么 + 下一步（详见 `copy-rules.md` §三）。
- 高成本操作需要确认/撤销/取消。复杂表单考虑分步 + 草稿保存。
- 错误字段自动聚焦 + `aria-describedby` 关联错误文案。
