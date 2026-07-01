# 需求到 Design Spec 提取指南

> **Phase**: 提取 Design Spec 时

AI 从需求（uluo-spec-driven 的 spec.md 或自然语言）提取 Design Spec 的规则。Design Spec 是 AI 提取的中间契约，用户不手写。

---

## 步骤 0：页面类型识别与尺寸预设

1. **页面类型识别**：从需求中识别页面类型，不同类型决定默认尺寸预设：
   - **landing**（营销落地页）：容器 max-width 1200px、导航高度 80px、Hero 区高度 560-640px
   - **dashboard**（数据仪表盘）：容器 max-width 1320px、导航高度 64px、侧边栏宽度 240px、卡片间距 24px
   - **form**（表单页）：单列表单宽度 640px、双列 800px
   - **detail**（详情页）：主内容区 800px + 侧边栏 320px
   - **list**（列表页）：工具栏高度 56px、表格 100% 宽度、分页高度 48px
   - **other**（其他）：使用默认值 1320px 容器、64px 导航

2. **页面清单提取**：从需求中识别所有需要生成的页面，列出页面名和类型。

3. **区块划分提取**：每个页面由哪些区块组成（如 Dashboard = StatsGroup + ChartSection + RecentTable），区块对应 design/blocks/。

4. **尺寸/栅格提取规则**：
   - 如需求明确指定尺寸，使用用户指定值
   - 如需求未指定，根据页面类型使用 design-dimensions.md 中的默认值
   - 默认画布：1440×900 桌面端
   - 默认栅格：12列，gutter 24px，margin 80px

**注意**：提取 Design Spec 时必须设置 `pageType` 字段；`page.canvas`、`page.grid`、`page.container` 字段如需求未指定，应使用 design-dimensions.md 中对应页面类型的默认值。

---

## 两条工作路径

### 路径 A: AI 同时使用 uluo-spec-driven 和 html-blueprint

```
用户描述需求
  ↓
AI 用 uluo-spec-driven 生成 spec.md（需求文档）
  ↓
AI 按本指南从 spec.md 提取 Design Spec（对齐口径）
  ↓
AI 用 html-blueprint 生成 HTML 设计稿
  ↓
AI 运行校验门禁
```

### 路径 B: AI 只用 html-blueprint

```
用户描述需求
  ↓
AI 按本指南从自然语言提取 Design Spec
  ↓
AI 用 html-blueprint 生成 HTML 设计稿
  ↓
AI 运行校验门禁
```

两条路径下游流程一致：提取 Design Spec → 校验 → 生成 HTML → 校验。

---

## 路径 A: 从 spec.md 提取

### 对齐映射表

| uluo-spec-driven spec.md | html-blueprint Design Spec | 映射规则 |
|---------------------------|---------------------------|---------|
| 功能需求 FR-N: [组件名] | components[].name | FR 标题中的名词 → PascalCase 组件名 |
| FR 的"预期行为"-展示数据 | props[] | "显示/展示 XX" → prop（XX 为数据名） |
| FR 的"预期行为"-交互行为 | events[] | "点击/提交 XX" → event |
| FR 的"边界条件"-异常 | states[] | "加载失败时" → error 状态 |
| 非功能性需求-性能 | dataSource.polling | "30秒刷新" → polling: 30000 |
| 验收标准 | 覆盖度验证 | 每条验收标准必须有对应的 prop/event |

### 提取步骤

1. **读取 spec.md 的功能需求章节**
   - 找到所有 `### FR-N: [需求名称]` 条目
   - 每个 FR 提取为一个 component

2. **提取组件名**
   - 从 FR 标题的名词提取，转为 PascalCase
   - 例：`FR-1: 统计卡片` → `StatCard`
   - 例：`FR-2: 用户登录表单` → `LoginForm`

3. **提取 props**
   - 从 FR 的"预期行为"中找展示数据
   - "显示 XX" / "展示 XX" / "列出 XX" → prop
   - 例："显示销售额" → `{ name: "title", type: "string" }`、`{ name: "value", type: "number" }`

4. **提取 events**
   - 从 FR 的"预期行为"中找交互行为
   - "点击 XX" / "提交 XX" / "选择 XX" → event
   - 例："点击查看详情" → `{ name: "viewDetail", trigger: "click" }`

5. **提取 states**
   - 从 FR 的"边界条件"中找异常状态
   - "加载失败时" / "数据为空时" → state
   - 例："加载失败时显示错误提示" → `{ name: "error" }`

6. **提取 dataSource**
   - 从"非功能性需求"或"依赖与前置条件"中找数据源
   - "30秒刷新" → `{ polling: 30000 }`
   - "调用 XX 接口" → `{ endpoint: "XX" }`

7. **验证提取覆盖度**
   - 逐条检查 spec.md 的验收标准
   - 每条验收标准必须有对应的 prop 或 event
   - 如有遗漏，补充到 Design Spec 中

### 示例：从 spec.md 提取

**输入**（uluo-spec-driven spec.md 片段）：

```markdown
### FR-1: 统计卡片
- **描述**: 在 Dashboard 首页展示核心业务指标
- **优先级**: P0
- **触发条件**: 页面加载时
- **预期行为**:
  - 显示销售额、订单数、转化率三项指标
  - 点击卡片可查看对应指标的详细趋势
- **边界条件**:
  - 数据加载中显示骨架屏
  - 加载失败时显示错误提示和重试按钮

## 验收标准
- [ ] 卡片显示销售额、订单数、转化率
- [ ] 点击卡片跳转到详情页
- [ ] 加载失败时显示重试按钮
```

**输出**（Design Spec JSON 片段）：

```json
{
  "components": [
    {
      "name": "StatCard",
      "convertMode": "component",
      "props": [
        { "name": "salesAmount", "type": "number", "required": true },
        { "name": "orderCount", "type": "number", "required": true },
        { "name": "conversionRate", "type": "number", "required": true }
      ],
      "events": [
        { "name": "viewDetail", "trigger": "click" }
      ],
      "states": [
        { "name": "loading" },
        { "name": "error" }
      ]
    }
  ]
}
```

**覆盖度验证**：
- ✅ "卡片显示销售额、订单数、转化率" → props: salesAmount, orderCount, conversionRate
- ✅ "点击卡片跳转到详情页" → event: viewDetail
- ✅ "加载失败时显示重试按钮" → state: error

---

## 路径 B: 从自然语言提取

### 模式匹配规则

| 自然语言模式 | Design Spec 字段 | 提取规则 |
|-------------|-----------------|---------|
| "显示/展示 XX" / "列出 XX" | props[] | XX 为数据名，推断类型 |
| "点击/提交/选择 XX" | events[] | XX 为事件名，trigger 为交互类型 |
| "加载中/骨架屏" | states[] | loading 状态 |
| "加载失败/错误态" | states[] | error 状态 |
| "空数据/无数据" | states[] | empty 状态 |
| "调用 XX 接口" / "从 XX 获取" | dataSource.endpoint | XX 为接口路径 |
| "N秒刷新" / "定时刷新" | dataSource.polling | N*1000 毫秒 |
| "图表/趋势图/柱状图" | convertMode: manual | 复杂可视化需手动转换 |
| "表单/输入框/下拉选" | convertMode: component | 表单组件需独立封装 |

### 提取步骤

1. **识别组件**
   - 从需求中找名词性实体（"Dashboard"、"登录表单"、"商品列表"）
   - 转为 PascalCase 作为组件名

2. **识别展示数据 → props**
   - 找"显示"、"展示"、"列出"等动词后的名词
   - 推断类型：数字（金额、数量）、字符串（标题、名称）、数组（列表）

3. **识别交互行为 → events**
   - 找"点击"、"提交"、"选择"、"切换"等动词
   - 提取动作名作为 event name

4. **识别状态 → states**
   - 找"加载中"、"失败"、"空数据"等描述
   - 映射到 loading/error/empty 状态

5. **识别数据源 → dataSource**
   - 找"调用接口"、"从 XX 获取"、"定时刷新"等描述

6. **识别复杂交互 → convertMode**
   - 图表、富文本编辑器、复杂动画 → `manual`
   - 普通展示组件 → `component`

### 示例：从自然语言提取

**输入**（用户自然语言需求）：

> 帮我做一个 Dashboard 页面，顶部显示销售额、订单数和转化率三个统计卡片，点击卡片可以查看详细趋势。数据从 /api/dashboard 接口获取，需要每 30 秒刷新一次。加载中显示骨架屏，加载失败显示错误提示。

**输出**（Design Spec JSON 片段）：

```json
{
  "components": [
    {
      "name": "StatCard",
      "convertMode": "component",
      "props": [
        { "name": "salesAmount", "type": "number", "required": true },
        { "name": "orderCount", "type": "number", "required": true },
        { "name": "conversionRate", "type": "number", "required": true }
      ],
      "events": [
        { "name": "viewDetail", "trigger": "click" }
      ],
      "states": [
        { "name": "loading" },
        { "name": "error" }
      ],
      "dataSource": {
        "endpoint": "/api/dashboard",
        "polling": 30000
      }
    }
  ]
}
```

---

## Design Spec 展示确认流程

AI 提取 Design Spec 后，应向用户展示提取结果并确认：

1. **展示 Design Spec 摘要**
   - 列出识别到的组件、props、events、states
   - 标注每个提取项的来源（spec.md 的 FR-N 或自然语言的哪句话）

2. **标注不确定项**
   - 类型推断不确定的 prop 标注"待确认"
   - 组件边界模糊时列出可选方案

3. **用户确认后继续**
   - 用户确认或调整后，AI 运行 `checks/spec.js` 校验
   - 校验通过后生成 HTML 设计稿

---

## 相关文件

- [design-spec.md](./design-spec.md) — Design Spec 格式规范
- [design-dimensions.md](./design-dimensions.md) — 尺寸规范与预设值
- [protocol-spec.md](./protocol-spec.md) — data-* 属性协议
- [../SKILL.md](../SKILL.md) — Skill 主文档（含门禁定义）
