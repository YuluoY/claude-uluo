# Memex

Claude Code 长期经验记忆插件。

## 使用

```bash
pip install -r requirements.txt
python scripts/cli.py init
```

在项目 `.claude/settings.json` 中加入：

```json
{
  "extraKnownMarketplaces": {
    "local": { "source": { "source": "directory", "path": ".claude/plugins" } }
  },
  "enabledPlugins": { "memex@local": true }
}
```

重启 Claude Code 生效。

## 文件位置

```
.claude/plugins/memex/    ← 放这里就行
```

## 命令

```
python scripts/cli.py stats            查看状态
python scripts/cli.py search "关键词"   搜索经验
python scripts/cli.py graph            生成知识图谱 HTML
python scripts/cli.py reset            重置记忆
```
