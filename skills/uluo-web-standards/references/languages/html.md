# HTML 编码规范

**加载条件：** 任务涉及 HTML、模板、SEO、可访问性结构时加载。

> 参考：[Google HTML/CSS Style Guide](https://google.github.io/styleguide/htmlcssguide.html)、[WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
> 可访问性声明式规则见 `references/accessibility.md`。性能优化见 `references/performance.md`。
> Vue 模板额外约束见 `references/languages/vue.md` §二。格式由 `eslint-plugin-vue` 的 `vue/html-indent` 等覆盖（见 `assets/eslint.config.mjs`）。

## 目录

- [一、文档骨架](#document-skeleton)
- [二、语义化](#semantics)
  - [标题层级](#heading-hierarchy)
- [三、属性](#attributes)
- [四、图片](#images)
- [五、表单](#forms)
- [六、ARIA](#aria)
- [七、格式](#formatting)
- [八、性能与 SEO](#performance-and-seo)
- [输出前自检](#output-checklist)

---

## 一、文档骨架

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="页面描述，150 字以内">
  <title>页面标题</title>
</head>
<body>
  <a href="#main-content" class="skip-link">跳转到主内容</a>
  <main id="main-content">
    <!-- 页面内容 -->
  </main>
</body>
</html>
```

- DOCTYPE 必须是 `<!DOCTYPE html>`
- `lang` 属性必填
- `viewport` meta 必填
- 始终提供 Skip Link（键盘用户直达主内容）

---

## 二、语义化

用语义标签，不用 `<div>` 替代一切：

| 用途 | 正确标签 | 错误 |
|------|---------|------|
| 页头 | `<header>` | `<div class="header">` |
| 主导航 | `<nav aria-label="主导航">` | `<div class="nav">` |
| 主内容 | `<main>` | `<div class="content">` |
| 独立区块 | `<section>` | `<div>` |
| 独立文章/卡片 | `<article>` | `<div class="card">` |
| 页脚 | `<footer>` | `<div class="footer">` |
| 按钮 | `<button>` | `<div onclick>` |
| 链接 | `<a href>` | `<span onclick="navigate()">` |
| 表单 | `<form>` | `<div>` 包 input |
| 标题 | `<h1>`–`<h6>` | `<div class="title">` |
| 列表 | `<ul>` `<ol>` `<li>` | `<div>` 手动排列 |
| 表格 | `<table>` `<th>` `<td>` | `<div>` 模拟 |
| 插图 | `<figure>` + `<figcaption>` | `<div>` 包 img + p |

### 标题层级

`<h1>` → `<h2>` → `<h3>` 顺序递进，不跳级：

```html
<h1>用户中心</h1>
<section>
  <h2>个人信息</h2>
  <h3>基本资料</h3>
  <h3>联系方式</h3>
</section>
```

---

## 三、属性

- 属性名全小写
- 值用双引号 `""`
- 布尔属性不写值：`<input disabled>` 而非 `<input disabled="true">`
- `type` 属性可省略（`<link>` 和 `<script>` 在 HTML5 已默认）

```html
<!-- ✅ -->
<script src="app.js"></script>
<link rel="stylesheet" href="styles.css">

<!-- ❌ -->
<script type="text/javascript" src="app.js"></script>
<link type="text/css" rel="stylesheet" href="styles.css">
```

- `id` 仅用于锚点、label 关联和必要脚本引用，避免用于样式选择器
- `id` 值含连字符：`user-name` 而非 `username`（防止和 JS 标识符冲突，污染 `window` 对象）

---

## 四、图片

```html
<!-- 有意义图片：必有 alt -->
<img src="chart.png" alt="2024 年季度销售趋势：Q1 增长 12%，Q2 下降 3%">

<!-- 纯装饰：alt 为空 -->
<img src="divider.svg" alt="">

<!-- 响应式：srcset + sizes -->
<img
  src="hero-800.webp"
  srcset="hero-400.webp 400w, hero-800.webp 800w, hero-1200.webp 1200w"
  sizes="(max-width: 768px) 100vw, 800px"
  alt="产品展示"
  loading="lazy"
  width="800"
  height="400"
>
```

- `loading="lazy"`：非首屏图片延迟加载
- `width` / `height`：防布局跳动（CLS）
- 优先 WebP/AVIF 格式，提供 `<picture>` fallback：

```html
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="产品展示">
</picture>
```

---

## 五、表单

```html
<form novalidate>
  <!-- 字段分组 -->
  <fieldset>
    <legend>基本信息</legend>

    <!-- label 必须关联 input -->
    <div>
      <label for="name">姓名</label>
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
      <label for="email">邮箱</label>
      <input
        id="email"
        type="email"
        name="email"
        required
        autocomplete="email"
      >
      <span id="email-error" role="alert"></span>
    </div>
  </fieldset>

  <button type="submit">提交</button>
</form>
```

- `<label>` 始终用 `for` 关联 `<input>` 的 `id`
- 用 `<fieldset>` + `<legend>` 分组
- `autocomplete` 属性提升 UX
- 错误提示用 `aria-describedby` 关联、`role="alert"` 标识
- 表单验证用 HTML5 原生 + JS 双重校验，不信任纯前端校验

---

## 六、ARIA

能用原生语义就不用 ARIA。需要时遵循：

```html
<!-- 导航标签 -->
<nav aria-label="主导航">...</nav>
<nav aria-label="面包屑">...</nav>

<!-- 动态内容 -->
<div aria-live="polite" aria-atomic="true">
  搜索结果：{{ count }} 条
</div>

<!-- 图标按钮 -->
<button aria-label="关闭" @click="close">
  <XIcon aria-hidden="true" />
</button>

<!-- Tab 组件 -->
<div role="tablist" aria-label="设置">
  <button role="tab" aria-selected="true" aria-controls="panel-general">通用</button>
  <button role="tab" aria-selected="false" aria-controls="panel-security">安全</button>
</div>
<div id="panel-general" role="tabpanel">...</div>
```

---

## 七、格式

- 缩进 2 空格
- 块级元素独占一行，子元素缩进
- 属性多时每属性一行（对齐 vue `max-attributes-per-line`）

```html
<!-- ✅ -->
<article>
  <h2>标题</h2>
  <p>内容段落</p>
</article>

<!-- ❌ -->
<article><h2>标题</h2><p>内容段落</p></article>
```

---

## 八、性能与 SEO

- 关键 CSS 内联 `<head>`，其余 defer 加载
- 脚本 `defer` 或 `async`，不放 body 末尾阻塞渲染
- 预加载关键资源：

```html
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preconnect" href="https://api.example.com">
```

- 结构化数据（JSON-LD）标注内容：

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "项目名",
  "url": "https://example.com"
}
</script>
```

- `<meta name="robots">` 控制抓取
- 规范 URL：`<link rel="canonical" href="...">`
- `<title>` 每个页面唯一，60 字以内

---

## 输出前自检

- [ ] `<!DOCTYPE html>` + `lang` + `charset` + `viewport`？
- [ ] 有 Skip Link？
- [ ] 语义标签用于正确目的（button 而非 div onclick）？
- [ ] 图片有 `alt`？装饰图 `alt=""`？非首屏 `loading="lazy"`？
- [ ] 表单有 `<label for>`？有错误提示？
- [ ] `<h1>`–`<h6>` 层级不跳？
- [ ] 属性全小写、双引号？
- [ ] 块级元素独占一行、子元素缩进？
