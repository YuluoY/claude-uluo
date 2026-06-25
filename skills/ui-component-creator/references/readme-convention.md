# 组件 README 规范

组件 README.md 是 AI 和开发者快速理解组件的唯一入口文档。本文件定义 README 的结构规范、编写指南和版本迭代更新策略。

---

## 一、AI 扫描友好的设计原则

README 同时服务于人类开发者和 AI Agent（如 Claude Code、Cursor）。为了让 AI 能高效解析、定位、抽取信息，遵循以下设计原则：

1. **固定 H2 节结构**——AI 按节名定位，不猜测。所有组件 README 必须包含相同的 9 个 H2 节，节名不可改名、不可调序、不可省略。AI Agent 通过精确匹配节名（如 `## API 参考`）即可跳转到目标位置抽取信息，无需语义推断。

2. **表格优于段落**——结构化数据易解析。API、元信息、四态、键盘操作等结构化数据必须用 Markdown 表格呈现，禁止用散文段落描述。表格的列名固定，AI 可按列名稳定抽取字段值。

3. **代码块标注语言**——可复制即用。所有代码块必须标注语言标识（`vue` / `tsx` / `ts` / `bash`），AI 才能识别代码类型并正确转译。禁止使用裸代码块（无语言标识）。

4. **顶部速查表**——最快获取元信息。README 第一个 H2 节必须是「元信息」速查表，AI 一次读取即可获取组件名、版本、框架、状态、入口、依赖等关键元数据，无需全文扫描。

5. **废弃项显式标记**——AI 能识别能力边界。已废弃的 API 必须在说明列以 `⚠️ [deprecated since vX.Y.Z]` 前缀标记，并注明替代方案和移除计划版本。AI 据此避免推荐废弃用法。

---

## 二、9 个固定 H2 节规范

所有组件 README 必须按以下顺序包含 9 个 H2 节。每节的内容要求如下。

### 1. `## 元信息`

速查表，使用 Markdown 表格。列：`字段`、`值`。

必填字段：

| 字段 | 说明 |
|------|------|
| 组件名 | PascalCase 命名，如 `DataTable` |
| 当前版本号 | SemVer 格式，如 `v1.2.0` |
| 框架 | `Vue 3` / `React` / `Web Component` 之一 |
| 状态 | `stable` / `experimental` / `deprecated` 之一 |
| 入口路径 | 相对仓库根的路径，如 `src/components/DataTable/index.vue` |
| 依赖列表 | 依赖的 composable / hook / 子组件 / 第三方库，无则填「无」 |

示例：

```markdown
## 元信息

| 字段 | 值 |
|------|-----|
| 组件名 | DataTable |
| 版本 | v1.2.0 |
| 框架 | Vue 3 |
| 状态 | stable |
| 入口路径 | `src/components/DataTable/index.vue` |
| 依赖 | usePagination, Checkbox, lodash-es |
```

### 2. `## 是什么`

一句话描述（≤20 字）+ 职责边界（做什么 / 不做什么列表）。

- 一句话描述：用「[动词] + [对象] + [用途]」结构，如「分页渲染表格数据」。
- 做什么：列出组件承担的核心职责，2-4 条。
- 不做什么：列出组件明确不承担的非目标，2-4 条，帮助使用者避免误用。

示例：

```markdown
## 是什么

分页渲染表格数据的可配置表格组件。

**做什么：**
- 渲染结构化数据为表格
- 提供分页、排序、行选择能力
- 支持自定义单元格渲染

**不做什么：**
- 不负责数据获取（由调用方传入）
- 不提供复杂筛选 UI（由上层组合）
- 不支持树形数据（使用 TreeTable）
```

### 3. `## 快速上手`

最小可用示例，复制即用。包含：

- 导入语句
- 最少必填 props（仅让组件能渲染的最小 props 集）
- 预期渲染效果描述（一句话说明用户将看到什么）

Vue 与 React 框架的组件需分别给出示例。Web Component 给出原生 HTML 示例。

示例（Vue）：

```vue
<script setup lang="ts">
import DataTable from '@/components/DataTable'
</script>

<template>
  <DataTable :data="rows" :columns="cols" />
</template>
```

预期渲染：渲染一个 5 行 3 列的表格，表头显示列名。

示例（React）：

```tsx
import { DataTable } from '@/components/DataTable'

export function Demo() {
  return <DataTable data={rows} columns={cols} />
}
```

预期渲染：渲染一个 5 行 3 列的表格，表头显示列名。

### 4. `## API 参考`

四张结构化表格。每张表格的列规范如下。

#### Props 表格

| 列名 | 说明 |
|------|------|
| 名称 | prop 名，kebab-case 或 camelCase 与框架约定一致 |
| 类型 | TypeScript 类型标注 |
| 必填 | `是` / `否` |
| 默认值 | 默认值字面量，无则填 `—` |
| 说明 | 用途描述，废弃项加前缀 |
| 版本 | 引入版本，如 `v1.0.0` |

#### Emits / Events 表格

| 列名 | 说明 |
|------|------|
| 名称 | 事件名 |
| 参数 | 参数类型签名，如 `(row: Row)` |
| 触发时机 | 何时触发 |
| 版本 | 引入版本 |

#### Slots 表格

| 列名 | 说明 |
|------|------|
| 名称 | slot 名，默认 slot 用 `default` |
| 作用域参数 | 透传给 slot 的参数类型，无则填 `—` |
| 默认内容 | 不传 slot 时的默认渲染，无则填 `—` |
| 说明 | 用途描述 |
| 版本 | 引入版本 |

#### Methods 表格

仅当组件通过 `defineExpose`（Vue）或 `ref` 暴露（React `useImperativeHandle`）方法时填写。无则删除本节。

| 列名 | 说明 |
|------|------|
| 名称 | 方法名 |
| 参数 | 参数类型签名 |
| 返回值 | 返回类型 |
| 说明 | 用途描述 |
| 版本 | 引入版本 |

#### 废弃项标记规范

废弃的 prop / emit / slot / method 在「说明」列加前缀：

```
⚠️ [deprecated since vX.Y.Z] [替代方案]。将在 vA.B.C 移除。
```

- `vX.Y.Z`：标记为 deprecated 的版本
- 替代方案：明确指向新 API 或新用法
- `vA.B.C`：计划移除的版本（必须是下一个 MAJOR 版本或之后）

完整示例：

```markdown
## API 参考

### Props

| 名称 | 类型 | 必填 | 默认值 | 说明 | 版本 |
|------|------|------|--------|------|------|
| data | Row[] | 是 | — | 表格数据数组 | v1.0.0 |
| columns | Column[] | 是 | — | 列定义 | v1.0.0 |
| pageSize | number | 否 | 10 | 每页行数 | v1.0.0 |
| rowKey | string \| (row: Row) => string | 否 | 'id' | 行唯一标识 | v1.1.0 |
| striped | boolean | 否 | false | ⚠️ [deprecated since v1.2.0] 改用 `rowClassName`。将在 v2.0.0 移除。 | v1.0.0 |

### Emits / Events

| 名称 | 参数 | 触发时机 | 版本 |
|------|------|---------|------|
| page-change | (page: number) | 分页变化 | v1.0.0 |
| sort-change | (sort: { field: string, order: 'asc' \| 'desc' }) | 排序变化 | v1.0.0 |
| row-click | (row: Row) | 点击行 | v1.1.0 |

### Slots

| 名称 | 作用域参数 | 默认内容 | 说明 | 版本 |
|------|----------|---------|------|------|
| default | — | 渲染表格 | 主体内容 | v1.0.0 |
| cell | `{ row, column, value }` | 渲染 value | 自定义单元格 | v1.0.0 |
| empty | — | 「暂无数据」 | 空状态 | v1.1.0 |

### Methods

| 名称 | 参数 | 返回值 | 说明 | 版本 |
|------|------|--------|------|------|
| refresh | — | Promise<void> | 重新加载数据 | v1.0.0 |
| clearSelection | — | void | 清空选中行 | v1.1.0 |
```

### 5. `## 四态说明`

表格列出 Loading / Error / Empty / Success 四态的触发条件和 UI 表现。

| 列名 | 说明 |
|------|------|
| 状态 | `Loading` / `Error` / `Empty` / `Success` |
| 触发条件 | 进入该状态的条件 |
| UI 表现 | 该状态下的视觉与交互 |

示例：

```markdown
## 四态说明

| 状态 | 触发条件 | UI 表现 |
|------|---------|---------|
| Loading | `loading` prop 为 true 或数据未到达 | 骨架屏占位，禁用分页交互 |
| Error | 数据加载抛错 | 错误图标 + 错误信息 + 「重试」按钮 |
| Empty | `data` 为空数组 | 空状态插图 + 「暂无数据」文案 |
| Success | 数据加载完成且非空 | 正常渲染表格 |
```

### 6. `## 使用示例`

2-4 个常见场景的完整代码。每个示例包含：

- 场景标题（H3）
- 一句话说明
- 完整可运行代码块（含导入、模板、必要的数据定义）

示例：

```markdown
## 使用示例

### 基础分页表格

最常见用法，传入数据和列定义即可。

\`\`\`vue
<script setup lang="ts">
import DataTable from '@/components/DataTable'
import { ref } from 'vue'

const columns = [
  { field: 'name', title: '姓名' },
  { field: 'age', title: '年龄' },
]
const data = ref([
  { id: 1, name: '张三', age: 28 },
  { id: 2, name: '李四', age: 32 },
])
</script>

<template>
  <DataTable :data="data" :columns="columns" :page-size="5" />
</template>
\`\`\`

### 自定义单元格渲染

通过 `cell` slot 自定义某列的渲染。

\`\`\`vue
<template>
  <DataTable :data="data" :columns="columns">
    <template #cell="{ row, column }">
      <span v-if="column.field === 'status'" :class="`tag-${row.status}`">
        {{ row.status }}
      </span>
      <span v-else>{{ row[column.field] }}</span>
    </template>
  </DataTable>
</template>
\`\`\`
```

### 7. `## 设计决策`

关键 why，每条决策附原因。格式：决策 + 理由。仅记录有取舍的、非显然的决策，避免流水账。

示例：

```markdown
## 设计决策

### 分页内置而非外置

- **决策**：分页逻辑内置在组件中，通过 `pageSize` 控制。
- **理由**：90% 的表格场景需要分页，外置会导致每个调用方重复实现。少数不需要分页的场景可设 `pageSize = data.length`。

### 不内置数据获取

- **决策**：组件不发起 HTTP 请求，数据由调用方传入。
- **理由**：数据获取与 UI 解耦，便于测试和复用。组件只关心渲染，不耦合具体 API。
```

### 8. `## 可访问性`

a11y 特性列表 + 键盘操作说明（表格）。

特性列表用无序列表，每条说明一个 a11y 特性。键盘操作用表格，列：`按键`、`行为`。

示例：

```markdown
## 可访问性

- 语义化表格结构：使用 `<table>` / `<thead>` / `<tbody>` / `<th scope>`。
- ARIA 属性：排序按钮标注 `aria-sort`，选中行标注 `aria-selected`。
- 焦点管理：可交互元素（按钮、链接）Tab 可达，逻辑顺序与视觉顺序一致。
- 颜色对比：文字与背景对比度 ≥ 4.5:1（WCAG AA）。

**键盘操作：**

| 按键 | 行为 |
|------|------|
| Tab | 在可交互元素间顺序移动焦点 |
| Enter / Space | 触发当前焦点元素（如排序、行选择） |
| Escape | 关闭展开的行详情 |
```

### 9. `## 变更记录`

Keep a Changelog 格式，倒序（最新版本在前）。

变更类型：

| 类型 | 说明 |
|------|------|
| Added | 新增功能 |
| Changed | 修改现有功能（非破坏性） |
| Deprecated | 标记即将移除的功能 |
| Removed | 移除功能（通常是之前 deprecated 的） |
| Fixed | Bug 修复 |

每个版本一个 H3，格式 `### vX.Y.Z (YYYY-MM-DD)`，下方按类型列出变更条目。

完整示例：

```markdown
## 变更记录

### v1.2.0 (2026-06-20)
- **Added**: 新增 `rowKey` prop 支持自定义行标识。
- **Deprecated**: `striped` prop 标记废弃，改用 `rowClassName`。将在 v2.0.0 移除。
- **Fixed**: 修复分页按钮在数据为空时仍可点击的问题。

### v1.1.0 (2026-05-10)
- **Added**: 新增 `empty` slot 支持自定义空状态。
- **Added**: 新增 `row-click` emit。
- **Changed**: `pageSize` 默认值从 20 改为 10。

### v1.0.0 (2026-04-01)
- **Added**: 初始版本，提供基础表格、分页、排序能力。
```

---

## 三、版本迭代更新策略

### 触发条件

以下变更必须同步更新 README：

| 变更类型 | 是否更新 README | 更新内容 |
|---------|---------------|---------|
| 新增 prop / emit / slot / method | 是 | API 表格新增行 + 变更记录 Added |
| 修改 prop 类型 | 是 | API 表格修改类型 + 变更记录 Changed |
| 修改默认值 | 是 | API 表格修改默认值 + 变更记录 Changed |
| 修改语义（如触发时机变化） | 是 | API 表格修改说明 + 变更记录 Changed |
| 删除 prop / emit / slot / method | 是 | API 表格删除行 + 变更记录 Removed |
| 标记废弃 | 是 | API 表格加 deprecated 前缀 + 变更记录 Deprecated |
| 修复 bug（不影响 API） | 是 | 变更记录 Fixed |
| 内部重构（不影响 API） | 否 | — |

### SemVer 规则

| 版本号变化 | 触发条件 | 示例 |
|----------|---------|------|
| MAJOR（X.0.0） | 破坏性变更：删除 API、修改类型不兼容、修改默认值导致行为变化 | v1.2.0 → v2.0.0 |
| MINOR（1.X.0） | 向后兼容的新功能：新增 API、新增 slot、修改默认值但行为兼容 | v1.2.0 → v1.3.0 |
| PATCH（1.2.X） | Bug 修复：修复缺陷但不改 API | v1.2.0 → v1.2.1 |

### 废弃过渡期

废弃 API 必须经过过渡期，禁止直接删除：

1. **标记阶段**：在当前 MINOR 版本标记为 `deprecated`，README 的 API 表格加前缀，变更记录加 Deprecated 条目，注明替代方案。
2. **过渡阶段**：至少保留一个 MINOR 版本，期间废弃 API 仍可用但控制台输出警告。
3. **移除阶段**：在下一个 MAJOR 版本移除，README 删除该 API 行，变更记录加 Removed 条目。

示例时间线：

```
v1.2.0  标记 striped 为 deprecated，提供 rowClassName 替代
v1.3.0  保留 striped，控制台警告
v1.4.0  保留 striped，控制台警告
v2.0.0  移除 striped
```

### 更新流程

每次版本迭代更新 README 的标准流程：

1. **更新元信息版本号**——`## 元信息` 表格的「版本」字段改为新版本号。
2. **更新 API 表格**——根据变更类型增删改对应表格行，废弃项加前缀。
3. **新增变更记录条目**——在 `## 变更记录` 顶部（最新版本在前）新增 H3 版本块，按类型列出变更。
4. **更新示例**（如有必要）——若新增/修改的 API 影响示例，同步更新 `## 快速上手` 或 `## 使用示例`。
5. **更新四态说明**（如有必要）——若状态行为变化，同步更新。

### 禁止事项

- **禁止迭代后不更新 README**——任何 API 变更必须同步更新，否则视为未完成。
- **禁止静默删除 API**——必须先 deprecated，再在 MAJOR 版本移除。
- **禁止变更记录与实际变更不符**——变更记录必须真实反映本次版本的所有变更。
- **禁止省略废弃项的移除计划**——deprecated 标记必须注明将在哪个版本移除。

---

## 四、编写检查清单

发布前逐项检查：

- [ ] 9 个 H2 节齐全，顺序正确，节名无改动
- [ ] 元信息速查表字段完整，版本号与 package.json 一致
- [ ] 「是什么」一句话描述 ≤20 字，做什么/不做什么各 2-4 条
- [ ] 快速上手示例可复制即用，含导入 + 必填 props + 效果描述
- [ ] API 表格覆盖全部 props / emits / slots / methods
- [ ] API 表格列名与规范一致，版本字段填写正确
- [ ] 废弃项有 `⚠️ [deprecated since vX.Y.Z]` 前缀，注明替代方案和移除计划版本
- [ ] 四态说明覆盖 Loading / Error / Empty / Success
- [ ] 使用示例 2-4 个，每个有标题、说明、完整代码
- [ ] 设计决策每条附「决策 + 理由」
- [ ] 可访问性含特性列表 + 键盘操作表格
- [ ] 变更记录倒序（最新在前），分类正确（Added/Changed/Deprecated/Removed/Fixed）
- [ ] 所有代码块标注语言标识
- [ ] 表格列名固定，无自定义列名
