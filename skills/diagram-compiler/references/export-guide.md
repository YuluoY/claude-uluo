# 图片导出指南

> diagram-compiler 的图片导出命令和背景色策略。SKILL.md 引用本文件获取导出细节。

## 导出命令

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

## 背景色策略

**默认行为**：导出图片的背景色跟随主题，不再使用透明背景。这样无论用户将图片放在白色还是深色文档中，文字都清晰可见。

| 主题 | 画布背景色 | 文字色 | 适用场景 |
|------|-----------|--------|---------|
| default | `#ffffff` 白色 | `#333` 深色 | 白底文档、论文 |
| dark | `#1a1a2e` 深色 | `#eceff1` 浅色 | 暗色 PPT、深色模式 |
| warm | `#ffffff` 白色 | `#3e2723` 深棕 | 白底分享 |
| business | `#ffffff` 白色 | `#1a237e` 深蓝 | 企业白底文档 |

## 透明背景和自定义背景色

**显式透明背景**（需要叠加到其他背景上时使用）：

```bash
# Mermaid 图
python scripts/_shared/mermaid.py export doc.md -o out.png --transparent

# 分层架构图
python scripts/_shared/layered_architecture.py --theme dark --transparent -o arch.png

# 自定义背景色
python scripts/_shared/mermaid.py export doc.md -o out.png --background "#f0f0f0"
```

## 背景色原则

除非你明确知道图片将被叠加到特定背景上，否则不要使用 `--transparent`。默认不透明确保文字在任何环境下都清晰可读。
