# 客户管理列表页 UI 实现方案

## 一、实现前的判定（遵循 skill 工作协议）

### 任务类型

新建页面 -- 中后台 SaaS 列表页。

### 已有体系扫描

| 维度 | 已有资产 | 不动/沿用 |
|------|---------|----------|
| 组件库 | Element Plus | 不手写 Button/Input/Select/Table/Dialog/Pagination/Popover |
| 图标库 | Element Plus Icons | 所有状态图标、操作图标均从 `@element-plus/icons-vue` 引入 |
| 样式架构 | Sass + BEM | 所有自定义样式走 BEM block，用 Sass 变量做 token 绑定 |
| 设计策略 | Restrained（中性色 + 单 accent） | 不引入渐变、强阴影、彩色边框 |

### 直通规则

项目符合"已有项目先扫描"中 uluo-web-standards 已验证的硬约束默认不再重复确认。本 skill 专注于视觉层级、状态覆盖、文案护栏、响应式和 token 体系。

---

## 二、信息架构决策

### 视口分区

```
视口
├── 导航区（顶部 64px，项目已有）—— 固定，不参与内容滚动
└── 内容区
    ├── 操作栏 (48px) —— 新建按钮 + 右侧搜索，始终可见
    ├── 筛选区 (56px collapsed / 可展开) —— 快速筛选条件
    ├── 批量操作栏 (48px) —— 仅选中行时出现，替换操作栏的位置
    └── 表格区 (flex: 1，局部滚动) —— 表格带 sticky header
        ├── 空状态（无数据 / 搜索无结果 / 权限不足）
        └── 加载状态（骨架屏 / spinner + 文字）
```

### 渐进呈现决策

- **主屏**（用户 95% 时间需要）：搜索框、筛选条件、列表、分页、新建按钮、选中行的批量操作
- **折叠**（低频）：高级筛选条件折叠在"更多筛选"下
- 符合 NN/G Progressive Disclosure 原则：核心任务直接可见，辅助能力收到二级入口

### 5 秒测试

用户 5 秒内能判断：这是客户管理列表，可以新建客户、搜索筛选客户、选中客户做批量操作。

---

## 三、视觉层级

### 眯眼测试

- **最强**：新建按钮（主操作，位置左上 + 颜色 accent）
- **次强**：搜索框（高频操作，筛选区右侧）
- **再次**：表格数据区（占视口最大面积，信息密集但不喧闹）
- **弱**：表头、分页、行内操作

### 字号/尺度（4 级）

| 层级 | 元素 | 字号 | 说明 |
|------|------|------|------|
| L1 | 页面主操作（新建按钮） | 14px, bold | 与组件库 Button 一致 |
| L2 | 筛选标签、表头 | 14px, regular | 与表格密度匹配 |
| L3 | 表格正文 | 13px, regular | 列表页标准密度 |
| L4 | 辅助文字（状态标签、时间） | 12px, regular | 弱化但仍可读 |

---

## 四、状态覆盖方案

### 页面级四态（遵循 uluo `ui-states.md` 四态模型）

| 状态 | 触发条件 | 视觉方案 |
|------|---------|---------|
| **Loading** | 首次进入页面 | Element Plus `<el-skeleton>` 骨架屏，带 animated。不阻塞 UI 操作 |
| **Empty（初始型）** | 无客户数据 | 引导标题 + 说明 + 行动按钮（"创建第一个客户"） |
| **Empty（搜索型）** | 搜索/筛选无结果 | "未找到匹配的客户" + 说明 + "清除筛选"按钮 |
| **Error** | 网络错误 / 服务端错误 | Element Plus `<el-result>` + 错误描述 + "重新加载"按钮 |

### 组件级状态

| 元素 | 状态覆盖 |
|------|---------|
| 新建按钮 | default, hover, focus, active, disabled（无权限时） |
| 搜索框 | empty, focus, input, clearable |
| 筛选下拉 | default, focus, selected, disabled |
| 批量操作按钮 | 无选中时 disabled + 有选中时显示已选数量 |
| 表格行 | default, hover, selected（checkbox 选中行高亮） |
| 行操作按钮 | default, hover, disabled（该行不可操作时） |
| 分页 | 单页时隐藏，多页时显示 |

---

## 五、响应式策略

### 断点

| 宽度 | 行为 |
|------|------|
| < 768px | 操作栏堆叠（搜索全宽，新建按钮固定右上）；筛选区折叠为抽屉；表格横向滚动 |
| 768-1024px | 操作栏一行；筛选区展开；表格正常宽度 |
| 1024px+ | 完整桌面布局，内容区最大宽 1440px 居中 |

### WCAG 2.2 1.4.10 Reflow

- 320px 宽度下无横向溢出
- 表格设 `overflow-x: auto`，允许有意的局部横向滚动
- 所有 flex/grid item 设 `min-width: 0`

### 触摸目标

- 新建按钮、操作按钮均 >= 44x44px（Element Plus 默认 size 符合）
- 表格行 checkbox >= 44x44px
- 行操作按钮间距 >= 8px

---

## 六、文案护栏

### 按钮标签（verb + object）

| 按钮 | 标签 | 语义 |
|------|------|------|
| 主操作 | "新建客户" | 动词 + 宾语 |
| 批量删除 | "删除客户" | 含确认步骤 |
| 批量导出 | "导出客户" | 动词 + 宾语 |
| 行编辑 | "编辑" | 标准，上下文中清晰 |
| 行删除 | "删除" | 需确认弹窗 |

### 空状态文案（三段式：引导标题 + 说明 + 行动）

- 初始空：标题"还没有客户" / 说明"创建第一个客户，开始管理您的客户信息" / 按钮"新建客户"
- 搜索空：标题"未找到匹配的客户" / 说明"试试其他关键词，或清除筛选条件" / 按钮"清除筛选"

### 加载文案

- 骨架屏替代 spinner 用于首屏加载（避免空转焦虑）
- 行内操作（删除确认等）用 `<el-button loading>` 反馈

### 禁止项检查

- 无 emoji 或文本符号充当图标
- 无假精确数字
- 无填充动词（elevate, seamless, unleash 等）
- 无 em-dash 装饰
- 无通用人名（John Doe 等）-- 使用贴近行业语境的真实感名称
- 确认信息说明具体操作（"已删除 3 位客户"而非"操作成功"）

---

## 七、Token 体系

### 策略选择

Restrained（中性色承担结构，单 accent 做标记）。项目已有 Sass 变量体系，在此基础上建立语义层映射。

### 语义 Token（映射至项目 Sass 变量）

| Token | 用途 | 映射 |
|-------|------|------|
| `--color-surface-page` | 页面背景 | `$color-bg-page` |
| `--color-surface-elevated` | 筛选区/卡片背景 | `$color-white` |
| `--color-text-primary` | 正文、客户名称、表头 | `$color-text-primary` |
| `--color-text-secondary` | 辅助信息、状态文字 | `$color-text-secondary` |
| `--color-text-disabled` | 禁用态文字 | `$color-text-disabled` |
| `--color-action-primary` | 主操作按钮背景 | `$color-primary` |
| `--color-action-primary-hover` | 主操作 hover | `$color-primary-light` |
| `--color-border-default` | 表格边框、输入框边框 | `$color-border` |
| `--color-feedback-error` | 错误状态 | `$color-danger` |
| `--color-feedback-success` | 成功状态 | `$color-success` |
| `--color-feedback-warning` | 警告状态 | `$color-warning` |

### Token 驱动原则

- 页面级样式不出现原始 hex 颜色值 —— 全部通过 token 变量引用
- 组件代码只知道 token 名，不知道背后的值
- 主题切换在 token 层发生，不触及组件代码

---

## 八、反模式自查

依据 `review-antipatterns.md` 逐项检查：

| 反模式 | 是否触发 | 说明 |
|--------|---------|------|
| emoji 图标 | 否 | 全部使用 Element Plus Icons |
| 营销页幻觉 | 否 | 直接展示列表工作面，无 hero 区域 |
| 标题描述复读 | 否 | 操作栏不设重复标题，筛选区直接展示控件 |
| 卡片泛滥 | 否 | 筛选区用背景色区分而非套 card，表格直接展示 |
| 状态缺失 | 否 | 覆盖 loading/empty/error + 所有交互态 |
| 弱可供性 | 否 | 按钮使用 Element Plus 默认样式（有边界、有颜色、有 hover） |
| 固定宽高 | 否 | 表格使用弹性宽度，筛选区用 flex-wrap |
| 无 tokens | 否 | 所有颜色通过语义 token 变量引用 |
| 布局无意图 | 否 | 每个区域有明确功能：筛选 → 操作 → 数据 → 分页 |
| 破坏性操作紧邻确认 | 否 | 批量删除有确认弹窗 + 二次确认 |

---

## 九、自检清单（SKILL.md 第 8 条）

- [x] 响应式：断点 768/1024/1280，320px 无横向溢出
- [x] 状态：loading/empty/error/disabled/focus/hover/active/selected 全覆盖
- [x] 图标：全部 Element Plus Icons，无 emoji
- [x] Tokens：语义 token 驱动，无散写 hex
- [x] 组件库：按 Element Plus API 使用，不手写基础控件
- [x] 主题/i18n：弹性布局预留 30-40% 宽度膨胀空间
- [x] 文案：按钮 verb+object，空状态三段式，遵循 copy-rules
- [x] 视觉主次：新建按钮最强，表格为主体，辅助信息弱化
