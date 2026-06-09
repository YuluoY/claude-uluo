---
name: diagram-compiler
description: >-
  Script-driven technical diagram studio for documents, papers, patents, and reports. Generates diagrams and charts with the best-fit backend: Mermaid for semantic diagrams, Matplotlib/PIL for precise static figures, and Canvas/SVG bridges for export. Use this skill whenever the user asks to draw, render, export, or improve any diagram/chart/visualization — especially 流程图, 架构图, 技术路线图, 专利附图, 论文插图, 时序图, ER图, 类图, 状态图, 甘特图, 时间线, 饼图, 思维导图, data flow, module relationships, project plans, or report visuals.
---

# Diagram Compiler

脚本驱动的技术图表生成 Skill。Python 脚本负责图种识别、模板、校验、主题、布局和导出；底层后端按图种选择 Mermaid、Matplotlib/PIL、Canvas/SVG 或专用 renderer。目标是稳定产出可用于技术文档、论文、专利和工作汇报的图表，而不是临场手画。

## 核心原则

- **一类型一脚本**：flowchart.py、sequence.py、er.py、gantt.py、architecture.py ... 每个脚本只管自己类型的规则
- **后端按需选择**：语义图优先 Mermaid；论文/专利/汇报级静态图优先 Matplotlib/PIL 或专用 renderer
- **脚本即真理**：所有校验、模板、规则强制、主题和导出都由脚本完成，AI 只负责**选择并调用脚本**
- **先校验再输出**：Mermaid 类图表产出前必须通过 `enforce`；专用渲染图必须运行对应生成脚本并检查输出

## AI 工作流（不可跳过）

AI 根据不同图表类型选择**两条路径**之一：

### 路径 A：模板路径（过程式图表）

适用于 flowchart / sequence / class / state / er / git / mindmap —— 图表结构由流程逻辑决定，不适合结构化数据。

```
用户说"画个XX图"
    │
    ▼
1. 确定图表类型 → 看 TYPE_ALIASES 与本文件的图表类型表
    │
    ▼
2. 获取 Mermaid 语法模板:
    python scripts/_shared/mermaid.py template --type <类型>
    │
    ▼
3. 在模板基础上填充用户的具体内容（改写 Mermaid 代码）
    │
    ▼
4. enforce 强制规范:
    python scripts/_shared/mermaid.py enforce /tmp/diagram.mmd --type <类型>
    │
    ▼
5. 导出或返回代码块
```

### 路径 B：数据驱动路径（结构化图表）⭐推荐

适用于 quadrant / sankey / c4 / radar / journey / swimlane / pie / gantt / timeline —— 图表由数据决定，Mermaid 只是序列化格式。**AI 不需要写 Mermaid 代码，只需要构建数据。**

```
用户说"画个XX图"
    │
    ▼
1. 确定图表类型 → 看 TYPE_ALIASES
    │
    ▼
2. 查看数据结构要求:
    python scripts/_shared/mermaid.py schema --type <类型>
    │
    ▼
3. 根据用户需求构建 YAML/JSON 数据（不是 Mermaid 代码！）
   → 写入 /tmp/diagram-data.yaml
    │
    ▼
4. 数据 → 图 → enforce → 导出 一步到位:
    python scripts/_shared/mermaid.py generate --type <类型> --data /tmp/diagram-data.yaml -o output.png
    │
    ▼
5. 返回图片路径（或省略 -o 返回 Mermaid 代码块）
```

**关键命令对应表**：

| 场景 | 命令 |
|------|------|
| 获取模板 | `python scripts/_shared/mermaid.py template --type flowchart` |
| 查看数据格式 | `python scripts/_shared/mermaid.py schema --type quadrant` |
| 数据→图表 | `python scripts/_shared/mermaid.py generate --type sankey --data data.yaml` |
| 数据→导出 | `python scripts/_shared/mermaid.py generate --type quadrant --data data.yaml -o out.png` |
| 校验语法 | `python scripts/_shared/mermaid.py validate doc.md --type sequence` |
| 强制规范 | `python scripts/_shared/mermaid.py enforce doc.md --type er` |
| 样式检查 | `python scripts/_shared/mermaid.py style doc.md` |
| 导出图片 | `python scripts/_shared/mermaid.py export doc.md -o out.png` |
| 导出透明背景 | `python scripts/_shared/mermaid.py export doc.md -o out.png --transparent` |
| 列出类型 | `python scripts/_shared/mermaid.py types` |

## 图表类型→脚本对照

| 用户说 | 类型名 | 脚本文件 | 工作流 |
|--------|--------|---------|--------|
| 流程图、业务逻辑、决策分支 | `flowchart` | `scripts/flowchart.py` | 路径A |
| 架构图、模块关系、组件拓扑 | `architecture` → `flowchart` | `scripts/flowchart.py` | 路径A |
| 分层图、DDD 分层、洋葱架构 | `layered` → `flowchart` | `scripts/flowchart.py` | 路径A |
| 分层技术架构图、毕设架构图、N-Tier 架构 | `layered-architecture` | `scripts/_shared/layered_architecture.py` | YAML数据 |
| 时序图、API 调用、消息交互 | `sequence` | `scripts/sequence.py` | 路径A |
| ER 图、实体关系、数据库设计 | `er` | `scripts/er.py` | 路径A |
| 类图、面向对象设计 | `class` | `scripts/class_diagram.py` | 路径A |
| 状态图、状态流转 | `state` | `scripts/state.py` | 路径A |
| 甘特图、项目排期 | `gantt` | `scripts/gantt.py` | 路径A |
| 饼图、数据占比 | `pie` | `scripts/pie.py` | 路径A |
| Git 图、分支合并 | `git` | `scripts/git_graph.py` | 路径A |
| 思维导图、脑图 | `mindmap` | `scripts/mindmap.py` | 路径A |
| 时间线、事件历程 | `timeline` | `scripts/timeline.py` | 路径A |
| 🆕 象限图、技术选型矩阵、风险评估 | `quadrant` | `scripts/quadrant.py` | **路径B** |
| 🆕 桑基图、流量分析、转化漏斗 | `sankey` | `scripts/sankey.py` | **路径B** |
| 🆕 C4架构图、系统上下文 | `c4` | `scripts/c4.py` | **路径B** |
| 🆕 雷达图、多维对比、能力评估 | `radar` | `scripts/radar.py` | **路径B** |
| 🆕 用户旅程图、体验路径 | `journey` | `scripts/journey.py` | **路径B** |
| 🆕 泳道图、跨职能流程 | `swimlane` | `scripts/swimlane.py` | **路径B** |

完整别名见 `scripts/__init__.py` 的 `TYPE_ALIASES`。

## 分层技术架构图 (N-Tier Architecture)

一种特殊的架构图类型——用 Matplotlib/PIL 精确排版，非 Mermaid 渲染。适用于论文、专利、技术方案和工作汇报中那种「从上到下的分层技术栈全景图」，特征为：

- 黑色虚线分隔层级，低饱和淡彩背景区分每层
- 白色矩形模块 + 黑色细实线边框 + 无衬线文字
- 黑色箭头从上到下串联请求流向
- 模块撑满层宽，无多余留白

**重要原则**：分层技术架构图必须是数据驱动的同类图生成，不是固定 Java Web 模板。`architecture.py` 中的 `_default_layout` 只作为默认示例和兜底；真正响应用户需求时，应根据用户描述生成或修改 YAML layout，再通过 `--layout` 渲染。同一类型下可以生成微服务架构、IoT 平台、大数据平台、AI Agent 平台、WebGIS 平台、企业中台等不同内容。

**使用方式**：

```bash
# 使用默认主题
python scripts/_shared/layered_architecture.py

# 切换主题
python scripts/_shared/layered_architecture.py --theme dark
python scripts/_shared/layered_architecture.py --theme business
python scripts/_shared/layered_architecture.py --theme warm

# 指定输出路径
python scripts/_shared/layered_architecture.py -o my-arch.png

# 导出透明背景（用于叠加到其他背景上）
python scripts/_shared/layered_architecture.py --transparent -o my-arch.png

# 使用自定义结构文件（推荐：按用户需求生成临时 YAML 后渲染）
python scripts/_shared/layered_architecture.py --layout /tmp/custom-architecture.yaml -o my-arch.png
```

**配色配置**：编辑 `assets/themes/architecture-themes.yaml` 中的 `themes` 部分或 `custom` 覆盖字段。
详见下方「配色配置」章节。

## 配置系统 (assets/)

所有配色和结构配置集中在 `assets/` 目录下，按职责分子文件：

```
assets/
  themes/
    architecture-themes.yaml   # 分层架构图配色（4 主题）
    diagram-themes.yaml         # Mermaid 图配色（default/dark/warm/business）
  layouts/
    architecture-layout.yaml   # 分层架构图结构定义（支持自定义系统架构）
```

### 架构图配色 (`assets/themes/architecture-themes.yaml`)

| 主题 | 风格 | 适用场景 |
|------|------|---------|
| `default` | 低饱和学术风（绿/蓝/橙） | 论文、技术文档 |
| `dark` | 深色背景 | 暗色 PPT、深色文档 |
| `warm` | 暖色调（米黄/粉） | 轻松的技术分享 |
| `business` | 商务蓝 | 正式方案、企业文档 |

### Mermaid 图配色 (`assets/themes/diagram-themes.yaml`)

4 组 `themeVariables` 预设，应用于 flowchart/ER/state/gantt/pie 的样式注入：

```yaml
themes:
  default: { primaryColor: "#fff", primaryBorderColor: "#888", ... }
  dark:    { primaryColor: "#37474f", ... }
  warm:    { primaryBorderColor: "#8d6e63", ... }
  business:{ primaryBorderColor: "#3949ab", ... }
active_theme: default
```

**修改方式**：

1. **切换主题**：改 `active_theme` 字段，或传 `--theme` 参数
2. **微调颜色**：在 `custom:` 下写覆盖项，例：
   ```yaml
   custom:
     primaryBorderColor: "#333333"
   ```
3. **创建新主题**：在 `themes:` 下新增一个主题

### 自定义架构图结构

编辑 `assets/layouts/architecture-layout.yaml`，或新建 YAML 文件，用 `--layout custom.yaml` 指定。

当用户要求“画某某系统架构图”时，不要直接套默认 Java Web 内容。应先抽取：标题、层级、每层模块、模块权重、是否需要箭头、是否需要高亮，然后生成同 schema 的 YAML：

```yaml
title: "示例系统技术架构图"
subtitle: "Client -> Gateway -> Services -> Data -> Runtime"
arrows: true
layers:
  - id: client
    label: "客户端层"
    blocks:
      - type: device
        icon: "Web"
        text: "Web Portal"
        width: 1
      - type: device
        icon: "Mobile"
        text: "Mobile App"
        width: 1
  - id: services
    label: "服务层"
    blocks:
      - type: group
        title: "Core Services"
        width: 4
        columns:
          - title: "业务服务"
            items: ["订单服务", "支付服务", "用户服务"]
          - title: "平台能力"
            items: ["权限", "任务", "通知"]
```

支持的 block 类型：
- `module` — 标准白色矩形
- `highlight` — 彩色模块（`color: yellow|red|blue`）
- `device` — 设备示意（图标+文字）
- `ajax-block` — Ajax 方法标签
- `group` — 带标题的分栏容器
- `side-modules` — 右侧竖排小模块
- `modular-block` — 标题 + 水平子模块

### 渲染引擎

图表按类型选择最佳渲染后端：
- Mermaid 图 → Mermaid SVG → Canvas PNG 桥接（语义表达强、Markdown 友好）
- Gantt / Pie / Timeline 等静态图 → Matplotlib renderer（版式和导出可控）
- 分层技术架构图 → Matplotlib/PIL 专用 renderer（中文测量、宽高自适应、论文/专利插图友好）

## 样式规范

默认样式在 `scripts/_shared/core.py` 的 `DEFAULT_THEME_VARIABLES` 中定义：

```python
DEFAULT_THEME_VARIABLES = {
    "primaryColor": "#ffffff",
    "primaryBorderColor": "#888888",
    "primaryTextColor": "#333333",
    "lineColor": "#666666",
    "secondaryColor": "#f5f5f5",
    "tertiaryColor": "#fafafa",
}
```

- 所有图表必须注入此样式
- `python scripts/_shared/mermaid.py enforce` 会自动检查和注入
- 用户指定其他样式时，跳过默认注入

## 图片导出

当用户需要图片文件（非 Markdown 内嵌）：

```bash
python scripts/_shared/mermaid.py export doc.md -o output.png
python scripts/_shared/mermaid.py export doc.md -o output.svg
python scripts/_shared/mermaid.py export doc.md -o output.pdf
```

依赖 `mmdc`。若未安装：
```bash
npm install -g @mermaid-js/mermaid-cli
npx puppeteer browsers install chrome
```

### 背景色策略

**默认行为**：导出图片的背景色跟随主题，不再使用透明背景。这样无论用户将图片放在白色还是深色文档中，文字都清晰可见。

| 主题 | 画布背景色 | 文字色 | 适用场景 |
|------|-----------|--------|---------|
| default | `#ffffff` 白色 | `#333` 深色 | 白底文档、论文 |
| dark | `#1a1a2e` 深色 | `#eceff1` 浅色 | 暗色 PPT、深色模式 |
| warm | `#ffffff` 白色 | `#3e2723` 深棕 | 白底分享 |
| business | `#ffffff` 白色 | `#1a237e` 深蓝 | 企业白底文档 |

**显式透明背景**（需要叠加到其他背景上时使用）：

```bash
# Mermaid 图
python scripts/_shared/mermaid.py export doc.md -o out.png --transparent

# 分层架构图
python scripts/_shared/layered_architecture.py --theme dark --transparent -o arch.png

# 自定义背景色
python scripts/_shared/mermaid.py export doc.md -o out.png --background "#f0f0f0"
```

**原则**：除非你明确知道图片将被叠加到特定背景上，否则不要使用 `--transparent`。默认不透明确保文字在任何环境下都清晰可读。

## 禁止事项

- **禁止凭记忆写 Mermaid 语法**——路径A 必须先用 `template` 拿模板，路径B 必须先用 `schema` 看数据格式
- **禁止跳过 enforce**——任何图表产出前必须先 enforce
- **禁止手动注入样式**——让 enforce 命令自动处理
- **禁止在 sequenceDiagram 的 participant ID 中使用中文**——用 `participant U as 用户` 模式
- **禁止 flowchart 节点标签中使用小写 `end`**——用 `End` 或 `END`
- **禁止 subgraph 嵌套超过 3 层**
- **禁止节点数超过 40 不拆分**
- **禁止对路径B类型直接写 Mermaid 代码**——必须构建YAML/JSON数据，通过 `generate` 命令生成。AI 写 Mermaid 代码容易出错；脚本生成保证语法正确。

## 依赖与故障排除

### 必需依赖

| 依赖 | 用途 | 安装 |
|------|------|------|
| `mmdc` | Mermaid 图表 → PNG/SVG/PDF 导出 | `npm install -g @mermaid-js/mermaid-cli` |
| `PyYAML` | YAML 数据文件解析 | `pip install pyyaml` |
| CJK 字体 | 中文图表文字渲染 | macOS 自带 STHeiti/PingFang |

运行 `python scripts/_shared/mermaid.py types` 会自动检查依赖状态。

### Mermaid CLI 不支持的类型

以下类型 Mermaid CLI 不支持或部分支持，需使用 Matplotlib `render()` 直出：

| 类型 | Mermaid CLI 状态 | 解决方案 |
|------|-----------------|---------|
| `radar` | ❌ 不支持 | 使用 `radar.render(data, output_path)` |
| `sankey` | ⚠️ 不支持中文标签 | 含中文时用 `sankey.render(data, output_path)` |
| `swimlane` | ❌ 原生不支持 | 使用 `swimlane.render(data, output_path)` |

使用方式：
```python
import radar, sankey, swimlane
radar.render(data, Path("output.png"))
sankey.render(data, Path("output.png"))
```

或在 CLI 中使用 `--use-renderer` 标志：
```bash
python scripts/_shared/mermaid.py generate --type radar --data data.yaml -o out.png --use-renderer
```

### CJK 字体

图表中的中文渲染依赖系统字体。macOS 通常已安装 STHeiti/PingFang。
Linux 服务器需安装：`apt install fonts-noto-cjk`。

## 与 uluo-doc-standards 的集成

当同时使用 uluo-doc-standards skill 时：
- 架构图 → `plans/README.md`
- ER 图 → `plans/` (数据模型章节)
- 流程图 → `spec.md` 或 `plans/`
- 时序图 → `plans/` (模块交互章节)
- 状态图 → `spec.md` 或 `plans/`
