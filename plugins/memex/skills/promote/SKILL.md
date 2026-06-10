# Memex Promote — 提升项目经验到全局库

将项目库中经过验证的知识节点提升为跨项目通用经验。

## 用法

用户在对话中说 "promote #3" 或 "/memex:promote 3" 即可触发。

## 执行步骤

1. 确认要提升的节点 ID（用户提供，或先运行 `list` 查看）
2. 运行提升命令：
```bash
cd ${CLAUDE_PLUGIN_ROOT} && python3 scripts/cli.py promote <节点ID>
```
3. 如果节点 scope=project 但确认具有跨项目通用性，加 `--force`：
```bash
cd ${CLAUDE_PLUGIN_ROOT} && python3 scripts/cli.py promote <节点ID> --force
```
4. 汇报结果给用户

## 提升条件（CLI 自动检查）

- 全局库无同名节点（避免重复）
- scope 非 project（除非 --force）
- 提升后 scope → framework，同时在全局库建立 PROMOTED_FROM 关系边
