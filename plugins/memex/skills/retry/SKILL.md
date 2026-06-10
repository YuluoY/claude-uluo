# Memex Retry — 重试未处理的知识提取

列出有信号但可能未提取知识的 session，支持手动重试。

## 用法

用户在对话中说 "retry"、"重试提取" 或 "/memex:retry"。

## 执行步骤

1. 运行列出命令：
```bash
cd ${CLAUDE_PLUGIN_ROOT} && python3 scripts/cli.py retry
```
2. 向用户展示未处理 session 列表
3. 如需回放：在对应项目目录下，手动分析 transcript JSONL 文件中的信号，重新触发提取
