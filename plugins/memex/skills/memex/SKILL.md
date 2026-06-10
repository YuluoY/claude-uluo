# Memex — 长期经验记忆插件

自动从对话中学习的 Claude Code 插件。**项目级隔离**：经验默认写入项目库，跨项目通用 pattern 通过 `promote` 手动提升到全局库。

## 双层存储模型

```
project.db (~/.claude/memex/projects/<name>/project.db)
  ↑ 会话自动写入（项目专属经验）
  ↑ 读取时项目优先
global.db (~/.claude/memex/global.db)  
  ↑ 只读参考（跨项目通用 pattern）
  ↑ 手动 promote 提升进入
```

## 核心能力

- **信号检测**：用 SnowNLP + pysentimiento 检测用户消息中的情感信号
- **连续评分**：TrueSkill 贝叶斯评分，μ/σ 无限精度
- **知识提取**：四层管道（原始证据 → 结构化事件 → 根因分析 → 知识节点）
- **知识图谱**：12 种关系（CAUSED_BY/SOLVED_BY/CONTRADICTS...）
- **向量检索**：FTS5 全文搜索，中英混合
- **上下文注入**：SessionStart 自动注入（项目经验优先 + 全局补齐）
- **项目隔离**：经验写入项目库，不污染全局知识空间

## 触发条件

### 隐式触发（自动）
每次对话自动运行，无需手动操作：
- 情感信号检测：用户说"完美！"→ 自动加强相关经验评分
- 纠正检测：用户说"不对，应该是 X"→ 提取纠正，不扣分
- 失败检测：用户说"还是不行"→ 归因验证后扣分
- 会话结束：SignalCount > 0 → 通知 Claude 提取结构化经验到项目库

### CLI 命令

```bash
# 查看项目知识统计（项目优先）
python scripts/cli.py stats

# 查看全局知识统计
python scripts/cli.py stats global

# 列出项目知识节点
python scripts/cli.py list

# 搜索经验
python scripts/cli.py search <关键词>

# 提升项目经验到全局库（跨项目通用化）
python scripts/cli.py promote <节点ID>

# 强制提升（跳过 scope=project 检查）
python scripts/cli.py promote <节点ID> --force

# 生成知识图谱
python scripts/cli.py graph
```

### 提升经验到全局（promote）

当项目中的某条经验被多次验证后，如果具有跨项目通用性，手动提升：

```bash
# 1. 查看项目经验
python scripts/cli.py list

# 2. 提升指定节点
python scripts/cli.py promote 3

# 3. 如果节点 scope=project 但确认通用，强制提升
python scripts/cli.py promote 3 --force
```

提升时 CLI 会自动：
- 检查全局库是否有同名节点（避免重复）
- 将 scope 标记为 `framework`
- 在全局库建立 PROMOTED_FROM 关系边

## LLM 知识提取（会话结束时）

当看到 `[Memex] 会话归档完成` 开头的系统消息时，分析信号提取结构化知识写入**项目库**：

```bash
PYTHONPATH=${CLAUDE_PLUGIN_ROOT}/scripts python3 -c "
from db_ops import insert_knowledge_node
from rating_engine import update_lesson_rating
kid = insert_knowledge_node('<项目库路径>', {
    'title': '<一句话标题>',
    'category_path': '<分类路径>', 
    'scope': 'project',
    'root_cause': '<根因>',
    'solution_text': '<方案>',
    'key_takeaway': '<关键教训>',
    'source_projects': ['<项目路径>'],
})
update_lesson_rating('<项目库路径>', kid, 'confirm', 0.9, 1.0)
"
```

## 分类路径

- `architecture/pattern` — 架构 | `methodology/debugging` — 调试
- `methodology/thinking` — 思维 | `methodology/workflow` — 工作流  
- `tooling/cli` — CLI | `rendering/coordinate` — 渲染坐标
- `data/state/race` — 竞态条件
