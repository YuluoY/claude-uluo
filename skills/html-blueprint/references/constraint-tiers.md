# 约束分级体系

> **Phase**: 理解约束等级时

html-blueprint 的校验规则按严重程度分为三级：

## HARD（硬约束）

**定义**：违反即阻断。不符合这些规则的输出不能发布给用户。

**检查方式**：由 `scripts/checks/*.js` 强制执行，exit code 1。

**HARD 规则清单**：

| 规则 | 检查脚本 |
|------|---------|
| data-component 必须 PascalCase | checks/data-component.js |
| data-component 禁止泛名（card/button/table 等） | checks/data-component.js |
| data-list 内的组件必须有 data-convert | checks/data-component.js |
| data-convert 值必须为合法枚举 | checks/data-convert.js |
| data-convert="component" 必须有 data-component | checks/data-convert.js |
| 图表元素必须 data-convert="manual" | checks/charts.js |
| 图表子元素禁止 data-prop/data-component | checks/charts.js |
| form 必须有 data-model | checks/form-model.js |
| form 必须有 data-component | checks/form-model.js |
| 表单控件必须有 data-field | checks/form-model.js |
| 装饰元素必须有 aria-hidden="true" | checks/decorative-aria.js |
| 装饰元素禁止含业务属性 | checks/decorative-aria.js |
| HTML 必须声明 @viewport | checks/responsive-viewport.js |

## SHOULD（建议约束）

**定义**：建议遵守，不遵守需要说明理由。不影响 exit code，但会在报告中列出。

**检查方式**：由校验脚本检测并输出，但仍以 exit code 1 返回（与 HARD 同级展示，但不区分）。

**SHOULD 规则清单**：

| 规则 | 检查脚本 |
|------|---------|
| 装饰元素建议 aria-hidden | checks/data-convert.js |
| 禁止 box1/left/text2 等泛名 class | checks/class-names.js |
| 禁止中文 class 名 | checks/class-names.js |
| 禁止 !important | checks/forbidden-selectors.js |
| 禁止深度后代标签选择器 | checks/forbidden-selectors.js |
| 禁止 nth-child 无 class 前缀 | checks/forbidden-selectors.js |
| 禁止 *:not() | checks/forbidden-selectors.js |
| 表单字段建议声明 data-type | checks/form-model.js |
| 提交按钮建议 data-event | checks/form-model.js |
| 设计稿 HTML 缺少 <!-- @theme --> 声明 | checks/theme-consistency.js |
| HTML 中 <style> 重复定义主题已有的 :root token | checks/theme-consistency.js |
| var() 引用主题 CSS 中不存在的 token | checks/theme-consistency.js |

## WARN（提示约束）

**定义**：用于 review 阶段的人工判断辅助。不在自动化脚本中检查，而是由 AI 在生成/转换时自行判断。

**WARN 规则清单**：

- 过多的 data-prop（超过 10 个 → props 爆炸风险）
- 业务内容使用 absolute 定位
- 多个 data-component 嵌套超过 3 层
- 单个页面 data-component 超过 15 个（可能过度拆解）
- 设计稿中使用了大量硬编码像素值而非 token
- 装饰效果过于复杂（超过 3 层叠加的渐变/阴影/模糊）
- 项目存在多个不同 tokens.css（主题文件应唯一）
- 多个 HTML 设计稿引用不同主题文件

## 执行协议

1. AI 生成 HTML 后，自动运行 `node scripts/validate.js`
2. HARD 违规必须修复，修复后重新运行直至通过
3. SHOULD 违规列出，AI 逐条判断：修复 或 记录理由
4. WARN 违规由 AI 在转换置信度报告中列出

## 约束 vs 指导

基于 [Guardrails Beat Guidance](https://arxiv.org/abs/2604.11088) 的研究结论：
- 负面约束（"不得"）比正面指导（"应该"）更能提升 agent 输出质量
- html-blueprint 优先使用禁止模式而非推荐模式
- 使用 `data-risk` 标记而非强行修改不符合规范的视觉设计
