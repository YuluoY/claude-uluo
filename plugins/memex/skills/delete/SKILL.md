# Memex Delete — 删除知识节点

软删除经验节点（标记为 deleted，数据保留用于审计）。

## 用法

用户在对话中说 "delete #3"、"删除第3条" 或 "/memex:delete 3"。

## 执行步骤

1. 确认节点 ID
2. 运行前先展示节点信息让用户确认：
```bash
cd ${CLAUDE_PLUGIN_ROOT} && python3 scripts/cli.py list
```
3. 执行删除（会要求确认）：
```bash
cd ${CLAUDE_PLUGIN_ROOT} && python3 scripts/cli.py delete <节点ID>
```
4. 汇报结果

## 注意事项

- 此操作为软删除（标记 scope='deleted'），数据保留用于审计
- 已删除节点不会出现在 search/list/stats 结果中
- 不可撤销（如需恢复，需手动 SQL 修改 scope）
