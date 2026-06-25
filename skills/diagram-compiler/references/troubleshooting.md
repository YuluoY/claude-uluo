# 依赖与故障排除

> diagram-compiler 的依赖安装和常见问题解决。SKILL.md 引用本文件获取故障排除细节。

## 必需依赖

| 依赖 | 用途 | 安装 |
|------|------|------|
| `mmdc` | Mermaid 图表 → PNG/SVG/PDF 导出 | `npm install -g @mermaid-js/mermaid-cli` |
| `PyYAML` | YAML 数据文件解析 | `pip install pyyaml` |
| CJK 字体 | 中文图表文字渲染 | macOS 自带 STHeiti/PingFang |

运行 `python scripts/_shared/mermaid.py types` 会自动检查依赖状态。

## Mermaid CLI 不支持的类型

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

## CJK 字体

图表中的中文渲染依赖系统字体。macOS 通常已安装 STHeiti/PingFang。
Linux 服务器需安装：`apt install fonts-noto-cjk`。
