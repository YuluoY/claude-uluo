/**
 * ir.js — html-blueprint 转换中间表示 (Intermediate Representation) 类型定义。
 *
 * 本文件定义从带 data-* 标注的 HTML 中提取的组件树结构。
 * IR 与框架无关，可同时用于生成 Vue 和 React 代码。
 *
 * @typedef {Object} PropDef
 * @property {string} name        — prop 名 (camelCase)
 * @property {string} type        — TypeScript 类型 (string|number|boolean|date|email...)
 * @property {string} [defaultValue] — 设计稿中的示例值/默认值
 * @property {boolean} [required] — 是否必填
 *
 * @typedef {Object} EventDef
 * @property {string} name        — 事件/动作名 (camelCase)
 * @property {string} trigger     — 触发方式 (click|submit|change|input...)
 * @property {string} [payload]   — 事件携带的数据表达式
 * @property {boolean} [confirm] — 是否需要确认
 *
 * @typedef {Object} SlotDef
 * @property {string} name        — 插槽名 ("default" 为默认插槽)
 * @property {string} content     — 插槽默认内容的 HTML 片段
 *
 * @typedef {Object} ListDef
 * @property {string} name        — 列表名
 * @property {'dynamic'|'static'|'config'} type — 列表类型
 * @property {string} [itemComponent] — 列表项组件名 (dynamic 类型)
 *
 * @typedef {Object} FormDef
 * @property {string} model       — 数据模型名
 * @property {Array<{field: string, type: string, required: boolean}>} fields — 表单字段
 *
 * @typedef {'component'|'layout'|'static'|'decorative'|'manual'} ConvertMode
 *
 * @typedef {Object} ComponentNode
 * @property {string} name             — 组件名 (PascalCase)
 * @property {string} [pageName]       — 所属页面名 (仅入口组件)
 * @property {ConvertMode} convertMode — 转换模式
 * @property {PropDef[]} props         — props 定义
 * @property {EventDef[]} events       — 事件定义
 * @property {SlotDef[]} slots         — 插槽定义
 * @property {ListDef[]} lists         — 列表定义
 * @property {FormDef|null} form       — 表单定义 (如果 data-model 存在)
 * @property {string} template         — 该组件的 HTML 模板片段 (含 data-* 标注)
 * @property {string} css              — 该组件的 CSS 样式
 * @property {string[]} children       — 嵌套子组件名
 * @property {string} [parent]         — 父组件名
 * @property {boolean} isRoot          — 是否为页面入口
 * @property {number} confidence       — 转换置信度 0-1
 * @property {string[]} issues         — 转换注意事项
 * @property {Object} [responsive]     — 响应式声明
 * @property {string} [chart]          — 图表类型 (如果有 data-chart)
 * @property {string} [chartLib]       — 目标图表库
 * @property {string[]} [states]       — 组件状态声明
 */

// jsdoc-only module, no exports needed
export {}
