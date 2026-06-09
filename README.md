# claude-uluo

Claude Code 扩展集合——Skills + Plugins 的 Marketplace 仓库。

## 快速开始

```bash
git clone <repo-url> ~/claude-uluo

# 一条命令安装任意 skill（推荐）
claude plugin install diagram-compiler@claude-uluo --scope project

# 或者用一键脚本
cd ~/claude-uluo && ./scripts/setup.sh
```

前提：已安装 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI。

## 使用方式

### Plugin 安装（推荐）

每条 skill 都包装为独立 plugin，通过 marketplace 分发：

```bash
# 注册 marketplace（只需一次）
# 在项目 .claude/settings.json 中：
{
  "extraKnownMarketplaces": {
    "claude-uluo": {
      "source": { "source": "directory", "path": "~/claude-uluo" }
    }
  }
}

# 然后安装任意 skill
claude plugin install diagram-compiler@claude-uluo --scope project
claude plugin install impeccable@claude-uluo --scope project

# 查看已安装
claude plugin list
```

### Symlink 兼容方式

```bash
ln -sfn ~/claude-uluo/skills/<name> your-project/.claude/skills/<name>
```

或 `./scripts/setup.sh symlink` 一键链接全部。

## 内容

| 类型 | 名称 | 说明 |
|------|------|------|
| Plugin | [memex](plugins/memex/) | 长期经验记忆 |
| Skill | diagram-compiler | 技术图表编译工坊 |
| Skill | frontend-visual-qa | 前端视觉 QA |
| Skill | html-blueprint | HTML 组件设计协议 |
| Skill | impeccable | 前端 UI 设计与审查 |
| Skill | skill-creator | Skill 创建与评测 |
| Skill | uluo-doc-standards | AI 编程文档规范 |
| Skill | uluo-web-standards | Web 工程规范 |
