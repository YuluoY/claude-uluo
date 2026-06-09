---
name: html-blueprint
description: >-
  HTML-first Component Design Protocol. Generate browser-renderable HTML/CSS design
  drafts annotated with data-* attributes (data-component, data-prop, data-slot,
  data-event, data-convert) that encode component semantics for reliable later
  conversion to Vue/React. Not a new DSL — HTML handles visual fidelity, data-*
  handles component semantics. Triggers on: 生成页面, 设计稿, HTML原型, 组件化HTML,
  UI设计稿转代码, HTML转Vue, HTML转React, 前端设计稿, 页面重构, 表单设计,
  component blueprint, HTML design draft, design-to-code, UI prototype.
---

# HTML Blueprint — 组件化设计协议

AI 生成「可组件化 HTML 设计稿」的协议与护栏。HTML/CSS 保证视觉保真（flex/grid/gradient/shadow/animation），`data-*` 属性标注组件语义（props/slots/events/convert-mode）。后续可稳定转为 Vue/React 组件。

本 skill 不发明 DSL，不替代 HTML，不用 JSON Schema 描述 UI。它保持 HTML 的全部表现力，通过 `data-*` 注释让 HTML 从"只能看"变成"能转换"。

## 强制工作协议

1. **识别任务类型**：判断是生成新设计稿、review 已有设计稿、还是转换 HTML→Vue/React。
2. **生成前加载协议**：任何生成 HTML 设计稿的任务，必须先读取 `references/protocol-spec.md` 了解完整属性字典和组件分类规则。
3. **写 CSS 时加载约定**：任何涉及 CSS 的任务，读取 `references/css-conventions.md`。
4. **理解约束分级**：读取 `references/constraint-tiers.md` 区分 HARD（阻断）/ SHOULD（建议）/ WARN（提示）。
5. **转换时加载指南**：将 HTML 设计稿转为 Vue/React 前，读取 `references/conversion-guide.md`。
6. **HTML 负责视觉保真**：允许 flex、grid、gradient、box-shadow、backdrop-filter、animation。不要为了"好转换"而牺牲视觉效果。
7. **data-* 负责语义标注**：每个组件用 data-component（PascalCase）、动态数据用 data-prop、交互用 data-event、可替换区域用 data-slot、转换策略用 data-convert。
8. **生成后自检**：HTML 输出后立即运行 `node scripts/validate-all.js <output.html>`，HARD 违规必须修复后才呈现给用户。
9. **输出转换报告**：每次生成设计稿必须附带转换置信度报告（JSON 格式，每个组件一个）。

## 模块加载表

- `references/protocol-spec.md`：完整属性字典、组件分类决策树、转换报告格式、禁止模式。**生成或 review 时默认必读。**
- `references/css-conventions.md`：BEM 命名、hybrid token 模式、禁止选择器、装饰元素样式、响应式声明。**写 CSS 时加载。**
- `references/constraint-tiers.md`：HARD/SHOULD/WARN 三级约束体系与执行协议。**需要理解规则严重程度时加载。**
- `references/conversion-guide.md`：HTML→Vue/React 转换流程（component→文件、prop→props、event→emits、slot→slot、list→v-for/map、convert→转换深度）。**转换任务时加载。**

## 一票否决项

以下问题视为硬失败，必须修正：

- `data-component` 值不是 PascalCase（如 "card"、"组件A"）
- `data-component` 使用泛名（card/button/table/box/item/list/component/form/input/modal/header/footer...）
- `data-convert` 值不在合法枚举中（component/layout/static/decorative/manual）
- `data-convert="component"` 但没有 `data-component`
- 图表元素（data-chart/data-chart-lib）没有 `data-convert="manual"`
- 图表子元素包含 data-prop 或 data-component
- `<form>` 没有 `data-model` 和 `data-component`
- 表单控件（input/select/textarea）没有 `data-field`（除非 data-static="true"）
- `data-decorative="true"` 没有 `aria-hidden="true"`
- 装饰元素包含 data-prop/data-field/data-event/data-slot
- HTML 没有 `<!-- @viewport -->` 声明
- CSS 使用 `!important`
- class 使用盒模型位置名（.left/.right/.top/.bottom）或编号名（.box1/.text2）

## 默认方向

- 先保证视觉像，再保证能转换。视觉保真优先于组件可维护性。
- 不确定时标记 manual，不强行自动转换。
- 图表默认 manual，除非用户提供了真实数据结构。
- 不是所有元素都是组件——用 data-convert 显式区分 component/layout/static/decorative/manual。
- 装饰元素走 absolute + blur + aria-hidden，业务内容走正常文档流。
- 当视觉保真和组件可维护性冲突：保留视觉稿、标记 data-risk、不强行转换、输出人工处理建议。

## 最少提问规则

需求模糊时只问一个问题，默认自主判断其余。

参考问题优先级：
1. "目标组件库是什么？（Vue 3 / React / 不确定）" → 生成中立 HTML，不做库特定映射
2. "需要响应式吗？目标画布尺寸？" → 默认 1440×900 单画布
3. "有现成的设计系统/tokens 吗？" → 有则沿用，无则生成 hybrid token
