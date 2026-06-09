# Memex — 长期经验记忆插件

自动从对话中学习的 Claude Code 插件。

## 核心能力

- **信号检测**：用 SnowNLP + pysentimiento 检测用户消息中的情感信号
- **连续评分**：TrueSkill 贝叶斯评分，μ/σ 无限精度
- **知识提取**：四层管道（原始证据 → 结构化事件 → 根因分析 → 知识节点）
- **知识图谱**：12 种关系（CAUSED_BY/SOLVED_BY/CONTRADICTS...）
- **向量检索**：FTS5 + sqlite-vec 混合，中英混合
- **上下文注入**：SessionStart 自动注入高价值经验
- **团队协作**：JSON Patches 自动合并

## 触发条件

### 隐式触发（自动）
每次对话自动运行，无需手动操作：
- 情感信号检测：用户说"完美！"→ 自动加强相关经验评分
- 纠正检测：用户说"不对，应该是 X"→ 提取纠正，不扣分
- 失败检测：用户说"还是不行"→ 归因验证后扣分

### 显式命令
```bash
# 初始化数据库
python scripts/db_schema.py ~/.claude/memex/global.db

# 搜索经验
python scripts/db_ops.py ~/.claude/memex/global.db search "ReactFlow"

# 查看图统计
python -c "from scripts.knowledge_graph import graph_stats; print(graph_stats('~/.claude/memex/global.db'))"

# 测试情感检测
python scripts/sentiment_detector.py

# 测试 TrueSkill
python scripts/rating_engine.py
```

## LLM 知识提取

当你看到 `[Memex] 会话归档完成` 开头的系统消息时，其中包含检测到的信号摘要。分析每个信号，提取结构化知识写入 DB：

```bash
PYTHONPATH=/Users/huyongle/Desktop/workspace/skills/memex/scripts python3 -c "
from db_ops import insert_knowledge_node
from rating_engine import update_lesson_rating
kid = insert_knowledge_node('/Users/huyongle/.claude/memex/global.db', {
    'title': '<一句话标题>',
    'category_path': '<分类路径>', 
    'scope': 'domain',
    'root_cause': '<根因>',
    'solution_text': '<方案>',
    'key_takeaway': '<关键教训>',
})
update_lesson_rating('/Users/huyongle/.claude/memex/global.db', kid, 'confirm', 0.9, 1.0)
"
```

## 分类路径

- `architecture/pattern` — 架构 | `methodology/debugging` — 调试
- `methodology/thinking` — 思维 | `methodology/workflow` — 工作流  
- `tooling/cli` — CLI | `rendering/coordinate` — 渲染坐标
- `data/state/race` — 竞态条件
