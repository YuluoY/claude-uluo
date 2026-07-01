# 导航结构协议

> **Phase**: Phase 2a（定义）/ Phase 2b（复制）
>
> 导航结构是设计系统的**全局骨架**，所有页面共享。本协议定义如何声明、复制和校验导航结构。

---

## 核心原则

1. **layout/main-layout.html 是导航结构的唯一蓝本** — 所有页面的 sidebar 必须精确复制其结构
2. **layout/nav-structure.json 是导航结构的可机读声明** — 用于校验脚本跨页一致性检查
3. **页面不能自行决定导航项** — 增删 nav item 必须在 layout 中同步修改，再重新复制到所有页面
4. **导航中出现的页面必须在 pages/ 下有对应 HTML 文件** — 禁止幽灵链接

---

## 导航结构声明

### nav-structure.json

```json
{
  "version": "1.0",
  "project": "ProjectName",
  "updatedAt": "2026-01-01T00:00:00.000Z",
  "sections": [
    {
      "label": "Main",
      "items": [
        { "label": "Dashboard", "href": "dashboard.html", "icon": "dashboard", "badge": null },
        { "label": "Analytics", "href": "analytics.html", "icon": "analytics", "badge": null },
        { "label": "Events", "href": "events.html", "icon": "events", "badge": 3 }
      ]
    },
    {
      "label": "System",
      "items": [
        { "label": "Settings", "href": "settings.html", "icon": "settings", "badge": null }
      ]
    }
  ],
  "footer": [
    { "label": "Back to Portal", "href": "../index.html", "icon": "back" }
  ],
  "logo": { "label": "ProjectName", "href": "../index.html" }
}
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `version` | 是 | 固定 `"1.0"` |
| `sections` | 是 | 导航分组列表，每个 section 含 `label` 和 `items` |
| `sections[].items[].label` | 是 | 导航项显示文本，与 sidebar__link-text 一致 |
| `sections[].items[].href` | 是 | 相对于 `pages/` 目录的路径（如 `dashboard.html`） |
| `sections[].items[].badge` | 否 | 数字徽章值，null 表示无徽章 |
| `footer` | 是 | 侧边栏底部链接列表 |
| `footer[].href` | 是 | 相对于 `design/` 根目录的路径（如 `../index.html`） |
| `logo.href` | 是 | Logo 链接，通常指向 `../index.html`（设计系统门户）或 `dashboard.html`（默认页） |

---

## 校验规则

由 `design-structure.js` 执行：

### HARD 规则

1. **nav-structure.json 存在性**：`pages/` 有 HTML 文件 → `layout/nav-structure.json` 必须存在
2. **跨页 sidebar 一致性**：提取所有 `pages/*.html` 和 `layout/main-layout.html` 的 sidebar nav 结构，对比：
   - 每个 section 的 item 数量相同
   - 每个 item 的 label 相同
   - 每个 item 的 href（相对路径标准化后）相同
3. **sidebar href 目标存在性**：所有 sidebar 链接的 `href` 指向的 HTML 文件必须存在于 `pages/`（或 `index.html`）
4. **Logo href 一致性**：所有页面 sidebar header 的 logo 链接 `href` 必须相同
5. **Footer 一致性**：所有页面 sidebar footer 的链接必须相同

### WARN 规则

- Footer 链接不一致（HARD 升级候选）

---

## AI 工作流

### Phase 2a：定义导航结构

1. 确定项目有多少个路由页面（`pages/*.html`）
2. 创建 `layout/nav-structure.json`，列出所有页面和分组
3. 生成 `layout/main-layout.html`，sidebar 导航与 nav-structure.json 一致
4. 所有 sidebar 链接使用 `../pages/{name}.html` 格式

### Phase 2b：复制导航结构到每个页面

1. 读取 `layout/nav-structure.json` 了解完整导航结构
2. 读取 `layout/main-layout.html` 了解 sidebar HTML 标记
3. 为每个页面生成完整的 app-shell，sidebar 精确复制 layout 的结构：
   - 相同的 section 数量
   - 相同的 nav item（label + href + 顺序）
   - 当前页面对应的 item 添加 `sidebar__link--active`
   - 相同的 footer 内容
   - 相同的 logo href
4. 使用同级目录路径 `href="dashboard.html"`（pages/ 内）
5. **禁止**增删或改名 nav item

### 导航扩展

需要增加新页面时：

1. 在 `nav-structure.json` 的 `sections[].items` 中添加新项
2. 在 `layout/main-layout.html` 中添加对应的 sidebar link
3. 重新生成 `pages/*.html`，所有页面 sidebar 与 layout 保持一致
4. 创建 `pages/{new-page}.html` 内容
5. 通过 `complete phase2-pages` 校验跨页一致性

---

## 与 component-registry 的关系

| 文件 | 用途 | 更新时机 |
|------|------|---------|
| `nav-structure.json` | 声明"项目有哪些页面" | Phase 2a 定义，新增页面时更新 |
| `component-registry.json` | 跟踪"组件在哪些页面被用" | Phase 1b 初始化，Phase 2b 逐页更新 |
| `main-layout.html` | 导航 HTML 蓝本 | 与 nav-structure.json 同步 |

两者互补不冲突：nav-structure.json 负责路由结构，component-registry.json 负责组件复用。
