# 配置系统

> diagram-compiler 的配色和结构配置参考。SKILL.md 引用本文件获取配置细节。

## assets/ 目录结构

所有配色和结构配置集中在 `assets/` 目录下，按职责分子文件：

```
assets/
  themes/
    architecture-themes.yaml   # 分层架构图配色（4 主题）
    diagram-themes.yaml         # Mermaid 图配色（default/dark/warm/business）
  layouts/
    architecture-layout.yaml   # 分层架构图结构定义（支持自定义系统架构）
```

## 架构图配色 (`assets/themes/architecture-themes.yaml`)

| 主题 | 风格 | 适用场景 |
|------|------|---------|
| `default` | 低饱和学术风（绿/蓝/橙） | 论文、技术文档 |
| `dark` | 深色背景 | 暗色 PPT、深色文档 |
| `warm` | 暖色调（米黄/粉） | 轻松的技术分享 |
| `business` | 商务蓝 | 正式方案、企业文档 |

## Mermaid 图配色 (`assets/themes/diagram-themes.yaml`)

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

## 自定义架构图结构

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
