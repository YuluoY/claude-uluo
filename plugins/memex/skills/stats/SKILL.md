# Memex Stats — 查看记忆统计

查看项目库和全局库的知识统计，包括节点数、事件数、关系边数、信号数。

## 用法

用户在对话中说 "stats"、"记忆统计"、"多少条经验" 或 "/memex:stats" 即可触发。

## 执行步骤

1. 运行（默认项目优先）：
```bash
cd ${CLAUDE_PLUGIN_ROOT} && python3 scripts/cli.py stats
```
2. 如需只看全局库：
```bash
cd ${CLAUDE_PLUGIN_ROOT} && python3 scripts/cli.py stats global
```
3. 向用户展示统计结果，包括项目库和全局库的对比
