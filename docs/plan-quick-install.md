# Plan: claude-uluo 快速引入方案

## Context

当前 claude-uluo 是 Claude Code 的 Skills + Plugins 集合，但引入到其他项目的步骤太繁琐——需要手动 git clone、配置 `extraKnownMarketplaces`、逐个 ln -s symlink 技能。目标是将所有内容变为 **一条命令即可引入**。

## 调研结论（来自 Claude Code 官方文档）

| 机制 | 安装方式 | 适用对象 |
|------|---------|---------|
| **Plugin via Marketplace** | `claude plugin install <name>@<marketplace>` | Plugin（支持） |
| **Project Skills** | 放在 `.claude/skills/` 目录 | 项目内 skill |
| **User Skills** | 放在 `~/.claude/skills/` 目录 | 个人全局 skill |
| **Plugin-bundled Skills** | 随 plugin 安装自动加载 | ✅ 推荐 |
| **SessionStart Hook** | git pull 自动同步 skill 目录 | 团队共享 skill |

**核心结论**：Claude Code 没有 `claude skill install` 命令。独立 skill 的唯一分发路径是 **把它包进 plugin**，然后走 marketplace 安装。

## 实施方案

### 1. 为每个 skill 添加最小 plugin 包装

每个 `skills/<name>/` 目录增加一个 `.claude-plugin/plugin.json`：

```json
{
  "name": "<skill-name>",
  "version": "0.1.0",
  "description": "<skill描述>",
  "author": { "name": "claude-uluo" }
}
```

涉及的 skill（7个）：
- `skills/diagram-compiler/`
- `skills/frontend-visual-qa/`
- `skills/html-blueprint/`
- `skills/impeccable/`
- `skills/skill-creator/`
- `skills/uluo-doc-standards/`
- `skills/uluo-web-standards/`

### 2. marketplace.json 新增全部条目

```json
{
  "$schema": "https://json.schemastore.org/claude-code-marketplace.json",
  "name": "claude-uluo",
  "plugins": [
    { "name": "memex", "source": "./plugins/memex", "description": "..." },
    { "name": "diagram-compiler", "source": "./skills/diagram-compiler", "description": "..." },
    { "name": "frontend-visual-qa", "source": "./skills/frontend-visual-qa", "description": "..." },
    ...
  ]
}
```

### 3. 提供一键安装脚本

新建 `scripts/setup.sh`，两种模式：

- **Plugin 模式（推荐）**：`claude plugin install <name>@claude-uluo --scope project`
- **Symlink 模式（兼容旧方式）**：一键 ln 所有 skill

### 4. README 快速开始

用户在任一项目中只需：

```bash
# 方式一：Plugin 安装（推荐，一条命令）
claude plugin install diagram-compiler@claude-uluo --scope project

# 方式二：配 marketplace + 手动启用
# 在 .claude/settings.json 中加上 extraKnownMarketplaces
# 然后 claude plugin install <name>@claude-uluo
```

前提：repo 已推送到 GitHub（`github.com/<user>/claude-uluo`）

### 5. 可选：SessionStart Hook 自动同步

在 `hooks/` 下提供 hook 脚本，团队可配置为 SessionStart 时自动 git pull 最新 skill。

## 需改动的文件

| 文件 | 操作 |
|------|------|
| `skills/*/plugin.json` | **新建 7 个**，每个 skill 加 `.claude-plugin/plugin.json` |
| `marketplace.json` | 补全所有 plugin 条目，加 `$schema` |
| `README.md` | 重写快速开始章节 |
| `CLAUDE.md` | 更新使用方式章节 |
| `scripts/setup.sh` | **新建**，一键安装脚本 |

## 验证方式

1. 在 evals/workspaces 下创建测试项目，模拟真实引入流程
2. `claude plugin install diagram-compiler@claude-uluo --scope project`
3. 验证 `/diagram-compiler` slash command 可用
4. `claude plugin list` 确认安装状态
