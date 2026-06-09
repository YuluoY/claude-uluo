# 可访问性 (Accessibility)

**加载条件：** Vue/React 组件、HTML 模板时加载。

> 参考：[WCAG 2.2](https://www.w3.org/TR/WCAG22/)、[WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)、[web.dev/accessible](https://web.dev/accessible/)
> HTML 语义化实现见 `references/languages/html.md`。

---

## 目录

- [WCAG 2.2：POUR 四原则](#wcag-22-pour)
  - [WCAG 2.2 新增（Level AA）](#wcag-22-new)
- [语义化 HTML](#semantic-html)
  - [标题层级](#heading-hierarchy)
  - [`lang` 属性](#lang-attribute)
- [ARIA](#aria)
- [键盘](#keyboard)
  - [交互模型](#interaction-model)
  - [焦点管理](#focus-management)
- [颜色对比度](#color-contrast)
- [图片](#images)
- [表单](#forms)
- [移动端](#mobile)
- [测试](#testing)
  - [三件必做](#three-must-dos)
  - [自动工具（能抓 30–40% 的问题）](#automated-tools)
- [自检](#self-check)

## WCAG 2.2：POUR 四原则

目标是 **Level AA**。四个维度：

| 原则 | 含义 |
|------|------|
| **P**erceivable 可感知 | 内容能被至少一种感官感知 |
| **O**perable 可操作 | 所有功能可键盘操作 |
| **U**nderstandable 可理解 | 界面和操作不困惑 |
| **R**obust 健壮 | 适配各种浏览器和辅助技术 |

### WCAG 2.2 新增（Level AA）

| 准则 | 含义 | 前端要做 |
|------|------|---------|
| **2.4.11 Focus Not Obscured** | 聚焦元素不被 sticky header/footer 遮挡 | `scroll-margin` / `scroll-padding` |
| **2.5.7 Dragging Movements** | 拖拽必须提供单击替代 | 排序按钮 + 拖拽 |
| **2.5.8 Target Size Minimum** | 交互目标 ≥ 24×24px | 按钮/链接/表单控件尺寸 |
| **3.3.8 Accessible Authentication** | 认证不依赖记忆/抄写等认知测试 | 支持密码管理器、WebAuthn |

---

## 语义化 HTML

**第一原则：能用原生标签就不加 ARIA。**

```html
<!-- ❌ div + ARIA 模拟 -->
<div role="button" tabindex="0" onclick="...">提交</div>

<!-- ✅ 原生语义 -->
<button type="submit">提交</button>
```

| 用途 | 正确标签 | 错误 |
|------|---------|------|
| 页头 | `<header>` | `<div class="header">` |
| 主导航 | `<nav aria-label="主导航">` | `<div class="nav">` |
| 主内容（唯一） | `<main id="main-content">` | `<div class="content">` |
| 独立区块 | `<section>` | `<div>` |
| 独立文章 | `<article>` | `<div class="card">` |
| 页脚 | `<footer>` | `<div class="footer">` |
| 按钮 | `<button>` | `<div onclick>` |
| 链接 | `<a href>` | `<span onclick="navigate()">` |
| 表单 | `<form>` | `<div>` 包 input |
| 标题 | `<h1>`–`<h6>` | `<div class="title">` |
| 列表 | `<ul>` `<ol>` | `<div>` 手动排列 |
| 数据表 | `<table>` `<th>` | `<div>` 模拟 |

### 标题层级

```
<h1>（每个视图一个）→ <h2> → <h3> 顺序递进，不跳级
```

### `lang` 属性

```html
<html lang="zh-CN">
```

---

## ARIA

**ARIA 第一定律：不用它——如果原生 HTML 已经够了。**

```html
<!-- 导航标签 -->
<nav aria-label="主导航">...</nav>
<nav aria-label="面包屑">...</nav>

<!-- 动态更新 -->
<div role="alert" aria-live="polite">{{ errorMessage }}</div>
<div aria-live="polite" aria-atomic="true">搜索结果：{{ count }} 条</div>

<!-- 图标按钮 -->
<button aria-label="关闭" @click="close">
  <XIcon aria-hidden="true" />
</button>

<!-- 展开/收起 -->
<button aria-expanded="false" aria-controls="menu-panel">菜单</button>
<div id="menu-panel" hidden>...</div>

<!-- 表单错误关联 -->
<input id="email" aria-describedby="email-hint email-error" aria-invalid="true">
<span id="email-hint">请输入工作邮箱</span>
<span id="email-error" role="alert">邮箱格式不正确</span>
```

| 属性 | 何时用 |
|------|--------|
| `aria-label` | 没有可见文本的元素（图标按钮） |
| `aria-labelledby` | 已有可见文本，引用其 id |
| `aria-describedby` | 关联提示/错误到表单控件 |
| `aria-expanded` | 菜单/折叠面板的开合状态 |
| `aria-current="page"` | 当前页导航链接 |
| `aria-live="polite"` | 动态内容被屏幕阅读器读出 |
| `aria-hidden="true"` | 纯装饰元素（图标） |
| `aria-invalid="true"` | 验证失败的表单字段 |

---

## 键盘

### 交互模型

| 按键 | 行为 |
|------|------|
| Tab / Shift+Tab | 前进/后退聚焦 |
| Enter / Space | 激活按钮 |
| Escape | 关闭弹窗/菜单 |
| 方向键 | 复合组件内导航（Tab 列表、菜单） |

### 焦点管理

```css
/* 不禁用 outline，不用 outline:none 不提供替代——用 :focus-visible */
:focus-visible {
  outline: 3px solid var(--color-primary);
  outline-offset: 3px;
}
```

- **Skip Link**：页面第一个可聚焦元素，跳转到 `<main>`
- Modal：打开时焦点移入 → 内部 trap → 关闭时归还原位
- 复合组件（Tab/Menu）：**一个 tab stop** + 方向键内导航
- `tabindex="0"`：非交互元素纳入 Tab 序
- `tabindex="-1"`：脚本聚焦但不入 Tab 序
- **禁止** 给静态内容加 `tabindex` 让它可聚焦

---

## 颜色对比度

| 内容 | 最低对比度 |
|------|:---:|
| 正文（<18px） | **4.5:1** |
| 大文字（≥18px 或 ≥14px bold） | **3:1** |
| UI 组件和图形 | **3:1** |
| 焦点指示器 vs 相邻色 | **3:1** |

- **信息不只靠颜色**——错误状态同时用图标 + 文字 + 红色
- 支持文本缩放到 **200%** 无横向滚动

---

## 图片

```html
<!-- 有意义：有 alt -->
<img src="chart.png" alt="2024 年季度销售趋势：Q1 +12%，Q3 +8%">

<!-- 纯装饰：alt 空 -->
<img src="divider.svg" alt="">

<!-- 复杂图表：alt 总结 + 正文详细描述 -->
<img src="complex-chart.png" alt="销售趋势概览，详见下方分析表格">

<!-- 非首屏：lazy -->
<img src="photo.jpg" alt="产品展示" loading="lazy">
```

---

## 表单

```html
<form novalidate>
  <fieldset>
    <legend>基本信息</legend>

    <div>
      <label for="name">姓名 *</label>
      <input
        id="name"
        type="text"
        name="name"
        required
        autocomplete="name"
        aria-describedby="name-hint"
      >
      <span id="name-hint">请输入真实姓名</span>
    </div>

    <div>
      <label for="email">邮箱 *</label>
      <input
        id="email"
        type="email"
        name="email"
        required
        autocomplete="email"
        aria-describedby="email-error"
        aria-invalid="true"
      >
      <span id="email-error" role="alert">邮箱格式不正确</span>
    </div>
  </fieldset>

  <button type="submit">提交</button>
</form>
```

- `<label>` 始终 `for` 关联 `<input>` 的 `id`
- `<fieldset>` + `<legend>` 分组表单区块
- `autocomplete` 属性提升填写效率
- 错误用 `aria-describedby` 指向错误元素、`aria-invalid="true"` 标记控件
- `role="alert"` 让错误消息被屏幕阅读器立即读出
- 提交空表单 → 焦点自动跳到第一个出错字段
- **Accessible Authentication（3.3.8）**：支持密码管理器、复制粘贴、不阻塞辅助技术

---

## 移动端

- 触摸目标 ≥ 44×44px（比 WCAG 2.5.8 的 24px 更严格——推荐）
- 汉堡菜单：`<button aria-label="菜单" aria-expanded="false">`
- 手势操作提供单击替代（如轮播左右箭头、排序上下按钮）

---

## 测试

### 三件必做

1. **纯键盘** — Tab 走完全部功能，焦点可见、无 trap
2. **屏幕阅读器** — VoiceOver（Mac）/ NVDA（Win）/ TalkBack（Android）
3. **200% 缩放** — 内容不溢出、无横向滚动

### 自动工具（能抓 30–40% 的问题）

- axe DevTools（浏览器扩展）
- WAVE
- Lighthouse Accessibility 评分
- `eslint-plugin-jsx-a11y`（React JSX 专用）
- Pa11y（CI/CD 集成）

---

## 自检

- [ ] 用 `<button>` / `<a href>` / `<form>` 而非 `<div>` 模拟？
- [ ] Skip Link 存在？`<main>` 唯一？
- [ ] 标题层级 `<h1>`→`<h2>`→`<h3>` 不跳？
- [ ] 图片有 `alt`？装饰图 `alt=""`？
- [ ] `:focus-visible` 替代 `:focus`？不禁用 outline？
- [ ] 图标按钮有 `aria-label`？动态内容有 `aria-live`？
- [ ] 表单 `<label for>`？错误有 `aria-describedby` + `aria-invalid`？
- [ ] Modal Escape 关闭 + 焦点 trap + 归还？
- [ ] 颜色对比度 ≥4.5:1？不用颜色单独传达信息？
- [ ] 触摸目标 ≥44×44px？拖拽有单击替代？
- [ ] 键盘完整走通一遍？屏幕阅读器过了一遍？
