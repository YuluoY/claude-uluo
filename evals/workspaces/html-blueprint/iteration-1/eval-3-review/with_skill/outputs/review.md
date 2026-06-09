# HTML Blueprint Review Report

## 原始代码

```html
<div data-component="card">
  <div class="box1">
    <span class="left" data-prop="label">标题</span>
  </div>
</div>
<div data-chart="bar">
  <div data-prop="barValue">100</div>
</div>
<form>
  <input placeholder="姓名">
  <button>提交</button>
</form>
<style>
.box1 { color: red !important; }
div > div > span { font-size: 14px; }
</style>
```

---

## HARD 违规（阻断级，必须修复）

### H-1: `data-component="card"` 不是 PascalCase，且使用了禁止泛名

- **位置**: `<div data-component="card">`
- **违反规则**: data-component 必须 PascalCase；禁止泛名 (card/button/table/box/item/list/component/form/input/modal/header/footer...)
- **修复**: 改为有业务含义的 PascalCase 名，如 `data-component="InfoLabel"` 或 `data-component="MetricCard"`

### H-2: 图表元素缺少 `data-convert="manual"`

- **位置**: `<div data-chart="bar">`
- **违反规则**: 图表元素（data-chart/data-chart-lib）必须 data-convert="manual"
- **修复**: 添加 `data-convert="manual"`

### H-3: 图表子元素包含 data-prop

- **位置**: `<div data-prop="barValue">100</div>`（位于 data-chart 内部）
- **违反规则**: 图表子元素禁止 data-prop 或 data-component
- **修复**: 移除 data-prop；图表数据应在 chart 初始化配置中传递，不应用 HTML data-prop 表达。修改为 `<div data-static="true">100</div>` 或移除该 div 改用 chart 库的 series 配置

### H-4: `<form>` 缺少 `data-model` 和 `data-component`

- **位置**: `<form>`
- **违反规则**: form 必须同时有 data-model 和 data-component
- **修复**:
  ```html
  <form data-component="UserForm" data-model="userInfo">
  ```

### H-5: 表单控件 `<input>` 缺少 `data-field`

- **位置**: `<input placeholder="姓名">`
- **违反规则**: 表单控件（input/select/textarea）必须有 data-field，除非 data-static="true"
- **修复**: 添加 `data-field="name"`

### H-6: HTML 缺少 `<!-- @viewport -->` 声明

- **位置**: HTML 顶部
- **违反规则**: HTML 必须声明 @viewport
- **修复**: 在 HTML 开头添加：
  ```html
  <!-- @viewport width:1440 height:900 -->
  ```

### H-7: CSS 使用 `!important`

- **位置**: `.box1 { color: red !important; }`
- **违反规则**: 禁止 !important
- **修复**: 提升选择器特异性替代 !important：
  ```css
  [data-component="InfoLabel"] .box1 { color: red; }
  ```
  但更根本的修复是下一条——替换 .box1 为 BEM class。

### H-8: class `.box1` 使用禁止的编号名

- **位置**: `class="box1"` + `.box1 { ... }`
- **违反规则**: class 禁止使用编号名 (box1/text2 等)
- **修复**: 改为 BEM 命名，如 `class="info-label__container"`

### H-9: class `.left` 使用禁止的盒模型位置名

- **位置**: `class="left"`
- **违反规则**: class 禁止使用盒模型位置名 (left/right/top/bottom)
- **修复**: 改为语义化 BEM class，如 `class="info-label__text"`

### H-10: 深度标签选择器 `div > div > span`

- **位置**: `div > div > span { font-size: 14px; }`
- **违反规则**: 禁止 >2 层标签选择器
- **修复**: 改用 BEM class 选择器：
  ```css
  .info-label__text { font-size: var(--font-size-base); }
  ```

---

## SHOULD 违规（建议修复，需给出理由）

### S-1: 表单控件建议声明 `data-type`

- **位置**: `<input placeholder="姓名">`
- **建议**: 添加 `data-type="string"` 明确字段类型

### S-2: 提交按钮建议声明 `data-event`

- **位置**: `<button>提交</button>`
- **建议**: 添加事件标注：
  ```html
  <button data-event="submit" data-action="submitForm">提交</button>
  ```

### S-3: data-component 元素建议声明 `data-convert`

- **位置**: `<div data-component="card">`
- **建议**: 明确转换模式 `data-convert="component"`

---

## WARN 提示

### W-1: 图表内容用 DOM 模拟而非真实图表库

- `data-chart="bar"` 内部使用 `<div data-prop="barValue">100</div>` 模拟柱状图值。这无法渲染真实图表。建议指定 data-chart-lib（如 echarts）并确认图表数据源，或降级为静态数值展示 + `data-convert="static"`。

### W-2: 整体缺少防御性结构

- 代码无 `<main>`/`<section>` 语义容器，缺少 data-page/data-section 标注，不利于组件树构建。

---

## 修复后完整代码

```html
<!-- @viewport width:1440 height:900 -->

<main data-page="Dashboard">
  <div data-component="MetricLabel" data-convert="component">
    <div class="metric-label__container">
      <span class="metric-label__text" data-prop="label">标题</span>
    </div>
  </div>

  <div data-chart="bar" data-convert="manual" data-chart-lib="echarts">
    <!-- 图表数据由 chart 初始化配置传递，不在 DOM 中用 data-prop 表达 -->
  </div>

  <form data-component="UserForm" data-model="userInfo">
    <input
      placeholder="姓名"
      data-field="name"
      data-type="string"
    >
    <button
      data-event="submit"
      data-action="submitForm"
    >提交</button>
  </form>
</main>

<style>
.metric-label__container { color: red; }
.metric-label__text { font-size: var(--font-size-base); }
</style>
```

---

## 违规统计

| 级别 | 数量 | 状态 |
|------|------|------|
| HARD | 10 | 已全部给出修复方案 |
| SHOULD | 3 | 已给出建议修复 |
| WARN | 2 | 已给出提示说明 |

## 修复优先级

1. **第一优先级**（阻断转换）: H-1~H-6 数据语义违规 — 缺少 data-model/data-field/data-convert、图表子元素含 data-prop、@viewport 缺失
2. **第二优先级**（阻断输出）: H-7~H-10 CSS 命名与选择器违规 — !important、盒模型/编号 class、深度选择器
3. **第三优先级**（提升质量）: S-1~S-3 — 补充 data-type/data-event/data-convert
4. **建议关注**: W-1~W-2 — 图表实现方案与语义结构完整性
