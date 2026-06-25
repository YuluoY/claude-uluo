# Web Component 创建领域知识

选定 Web Component 时加载。覆盖 Custom Element、Shadow DOM、Attributes/Properties、Events。

适用场景：需要框架无关的组件、跨技术栈复用、设计系统组件库。

---

## 基本结构

```typescript
// 1. 类型定义
interface ItemListProps {
  items: Item[]
  pageSize: number
  loading: boolean
}

// 2. Custom Element 定义
class ItemList extends HTMLElement {
  // 3. observedAttributes — 声明需要监听变化的 attribute
  static get observedAttributes() {
    return ['page-size', 'loading']
  }

  // 4. Shadow DOM
  private shadow: ShadowRoot
  private _items: Item[] = []
  private _selectedId: string | null = null

  constructor() {
    super()
    this.shadow = this.attachShadow({ mode: 'open' })
  }

  // 5. attribute → property 映射
  get pageSize(): number {
    return Number(this.getAttribute('page-size')) || 10
  }
  set pageSize(value: number) {
    this.setAttribute('page-size', String(value))
  }

  get loading(): boolean {
    return this.hasAttribute('loading')
  }
  set loading(value: boolean) {
    this.toggleAttribute('loading', value)
  }

  // 6. property（不映射 attribute 的内部状态）
  get items(): Item[] {
    return this._items
  }
  set items(value: Item[]) {
    this._items = value
    this.render()
  }

  // 7. 生命周期
  connectedCallback() {
    // 元素插入 DOM
    this.render()
    this.addEventListeners()
  }

  disconnectedCallback() {
    // 元素移除 DOM，清理监听
    this.removeEventListeners()
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return
    this.render()
  }

  // 8. 渲染
  private render() {
    this.shadow.innerHTML = `
      <style>
        :host {
          /* 结构层：布局——与风格无关 */
          display: block;

          /* 语义层：引用语义 token */
          --item-padding: var(--spacing-md);
          --item-bg: var(--color-surface);
          --item-color: var(--color-text);
          --item-hover-bg: var(--color-hover);
        }
        .item {
          padding: var(--item-padding);
          background: var(--item-bg);
          color: var(--item-color);
          cursor: pointer;
        }
        .item:hover {
          background: var(--item-hover-bg);
        }
      </style>
      ${this.loading ? '<div class="loading">Loading...</div>' : ''}
      ${this._items.length === 0 && !this.loading ? '<div class="empty">No data</div>' : ''}
      ${this._items.map(item => `
        <div class="item" data-id="${item.id}">
          <slot name="item-${item.id}">${item.name}</slot>
        </div>
      `).join('')}
    `
  }

  // 9. 事件
  private handleClick = (e: Event) => {
    const target = (e.target as HTMLElement).closest('.item')
    if (!target) return
    const id = target.getAttribute('data-id')
    const item = this._items.find(i => i.id === id)
    if (item) {
      this._selectedId = id
      // 派发自定义事件
      this.dispatchEvent(new CustomEvent('select', {
        detail: item,
        bubbles: true,        // 冒泡
        composed: true,       // 穿透 Shadow DOM
      }))
    }
  }

  private addEventListeners() {
    this.shadow.addEventListener('click', this.handleClick)
  }

  private removeEventListeners() {
    this.shadow.removeEventListener('click', this.handleClick)
  }
}

// 3. 注册
customElements.define('item-list', ItemList)
```

---

## Attributes vs Properties

Web Component 有两种传值方式，理解区别至关重要：

| 方式 | 类型 | 特点 | 适用 |
|------|------|------|------|
| **Attribute** | 字符串 | HTML 标签上的属性，可被 CSS 选择器选中 | 简单值（字符串、数字、布尔） |
| **Property** | 任意类型 | JS 对象属性，可传对象/数组/函数 | 复杂值（对象、数组、回调） |

```typescript
// Attribute
<item-list page-size="20" loading></item-list>
element.setAttribute('page-size', '20')

// Property
element.items = [{ id: '1', name: 'Test' }]
element.onSelect = (item) => { ... }
```

### 同步策略

- **Attribute → Property**：attribute 变化时更新 property（在 `attributeChangedCallback` 中）
- **Property → Attribute**：property 设置时反射到 attribute（在 setter 中调 `setAttribute`）
- **布尔 attribute**：用 `hasAttribute` 判断，用 `toggleAttribute` 设置

---

## 自定义事件

```typescript
// 派发事件
this.dispatchEvent(new CustomEvent('select', {
  detail: { id, name },     // 数据放在 detail
  bubbles: true,             // 是否冒泡
  composed: true,            // 是否穿透 Shadow DOM（重要！）
}))

// 监听
element.addEventListener('select', (e: CustomEvent) => {
  console.log(e.detail)      // { id, name }
})
```

**关键：** Shadow DOM 内部的事件默认不穿透到外部。如果需要外部监听，必须设 `composed: true`。

---

## Slots

```html
<!-- 组件定义 -->
<template id="item-list">
  <slot name="header">默认头部</slot>
  <ul>
    <slot></slot>  <!-- 默认插槽 -->
  </ul>
  <slot name="footer">默认底部</slot>
</template>

<!-- 使用 -->
<item-list>
  <div slot="header">自定义头部</div>
  <li>项目1</li>
  <li>项目2</li>
  <div slot="footer">自定义底部</div>
</item-list>
```

### slotchange 事件

监听 slot 内容变化：

```typescript
const slot = this.shadow.querySelector('slot')
slot.addEventListener('slotchange', () => {
  const assignedNodes = slot.assignedNodes()
  console.log('Slot content changed:', assignedNodes)
})
```

---

## CSS 与主题

### Shadow DOM 样式隔离

Shadow DOM 内的样式不影响外部，外部样式也不影响内部（除了可继承属性）。

```css
:host {
  /* :host 选择器指向自定义元素本身 */
  display: block;
}

::slotted(div) {
  /* ::slotted 选择器作用于被分发到 slot 的内容 */
  color: red;
}
```

### CSS 变量与三层架构

Web Component 采用三层样式分离——结构层（固定值）、语义层（token 引用）、风格层（预设提供）。

```css
/* 组件内部——只引用语义层 token */
:host {
  /* 结构层：布局——与风格无关 */
  display: block;

  /* 语义层：引用语义 token */
  --item-bg: var(--color-surface);
  --item-color: var(--color-text);
  --item-padding: var(--spacing-md);
}
.item {
  background: var(--item-bg);
  color: var(--item-color);
  padding: var(--item-padding);
}
```

```css
/* 外部覆盖语义 token（风格层——由预设文件提供） */
item-list {
  --color-surface: #ffffff;
  --color-text: #333333;
  --spacing-md: 16px;
}
```

> **注意**：组件内部只引用语义层 token（如 `var(--color-surface)`），不硬编码风格层值（如 `#fff`）。切换风格时只需替换外部 token 定义，组件代码零改动。

---

## 文件结构

```
component-name/
├── README.md                   ← 组件入口文档，AI 快速扫描入口
├── docs/                       ← 设计文档（与代码同目录）
│   ├── research-report.md      ← Phase 1 调研笔记
│   ├── component-spec.md       ← Phase 2 组件设计规格
│   └── verification-report.md  ← Phase 5 验收报告（可选）
├── index.ts                   ← 注册入口
├── ComponentName.ts           ← Custom Element 类定义
├── components/                ← 内部子组件
│   └── SubComponent.ts
├── styles/
│   └── ComponentName.css      ← Shadow DOM 样式（如需外置）
├── types.ts                   ← 类型定义
├── template.ts                ← HTML 模板（如需抽取）
└── __tests__/
    └── ComponentName.test.ts
```

---

## 使用 Lit（推荐）

原生 Web Component 样板代码多，推荐用 [Lit](https://lit.dev/) 简化：

```typescript
import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

@customElement('item-list')
class ItemList extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    .item {
      padding: var(--spacing-md, 16px);
    }
  `

  @property({ type: Array })
  items: Item[] = []

  @property({ type: Number, attribute: 'page-size' })
  pageSize = 10

  @property({ type: Boolean })
  loading = false

  @state()
  private _selectedId: string | null = null

  render() {
    if (this.loading) return html`<div>Loading...</div>`
    if (this.items.length === 0) return html`<div>No data</div>`

    return html`
      <ul>
        ${this.items.map(item => html`
          <li @click=${() => this._handleSelect(item)}>
            ${item.name}
          </li>
        `)}
      </ul>
    `
  }

  private _handleSelect(item: Item) {
    this._selectedId = item.id
    this.dispatchEvent(new CustomEvent('select', {
      detail: item,
      bubbles: true,
      composed: true,
    }))
  }
}
```

---

## 测试

```typescript
import { fixture, expect } from '@open-wc/testing'

describe('ItemList', () => {
  it('renders items', async () => {
    const el = await fixture(html`<item-list></item-list>`)
    el.items = [{ id: '1', name: 'Test' }]
    await el.updateComplete
    expect(el.shadowRoot?.textContent).to.include('Test')
  })

  it('dispatches select event', async () => {
    const el = await fixture(html`<item-list></item-list>`)
    el.items = [{ id: '1', name: 'Test' }]
    await el.updateComplete

    let selected: Item | null = null
    el.addEventListener('select', (e: CustomEvent) => {
      selected = e.detail
    })

    const item = el.shadowRoot!.querySelector('li')!
    item.click()

    expect(selected).to.deep.equal({ id: '1', name: 'Test' })
  })
})
```
