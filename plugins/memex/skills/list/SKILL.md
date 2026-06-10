# Memex List — 列出项目知识节点

查看当前项目库中的经验列表。

## 用法

用户在对话中说 "list"、"列出经验" 或 "/memex:list" 即可触发。

## 执行步骤

1. 运行：
```bash
cd ${CLAUDE_PLUGIN_ROOT} && python3 scripts/cli.py list
```
2. 如需查看全局库，加 `global`：
```bash
cd ${CLAUDE_PLUGIN_ROOT} && python3 scripts/cli.py list global
```
3. 向用户展示结果，标注每条经验的 TrueSkill 评分、scope、分类

## 输出解读

- cs 越高 → 经验越可靠（μ - 2σ 保守估计）
- scope=project → 项目专属 | scope=framework → 跨项目通用
- scope=project 的高分经验是 `promote` 的候选
