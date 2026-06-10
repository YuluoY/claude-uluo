# Memex Edit — 编辑知识节点

修改现有经验节点的文本字段。支持修改 title、key_takeaway、scope 等。

## 用法

用户在对话中说 "edit #3" 或 "/memex:edit 3 --title '新标题'"。

## 执行步骤

1. 确认节点 ID 和要修改的字段
2. 运行：
```bash
cd ${CLAUDE_PLUGIN_ROOT} && python3 scripts/cli.py edit <节点ID> --<字段> "<值>"
```
3. 可编辑字段：title, key_takeaway, root_cause, solution_text, problem_statement, category_path, scope
4. 汇报修改结果

## 示例

```bash
# 修改标题
python3 scripts/cli.py edit 3 --title "正确的标题"

# 修改关键教训
python3 scripts/cli.py edit 3 --key_takeaway "新的关键教训"

# 修改 scope
python3 scripts/cli.py edit 3 --scope framework

# 同时修改多个
python3 scripts/cli.py edit 3 --title "新标题" --category_path "tooling/cli"
```
