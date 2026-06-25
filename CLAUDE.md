# claude-uluo/ 工作区规范

Claude Code 扩展集合：Skills + Plugins 的 Marketplace 仓库。

## 目录约定

```
claude-uluo/
├── CLAUDE.md                    ← 本文件
├── marketplace.json             ← Plugin 注册表
├── plugins/                     ← Plugin 目录
│   └── memex/
├── skills/                      ← Skill 目录（每个也包装为 plugin）
│   ├── diagram-compiler/
│   ├── frontend-visual-qa/
│   └── ...
├── scripts/
│   └── setup.sh                 ← 一键引入脚本
├── docs/
├── evals/workspaces/            ← 评测工作区
└── .claude/                     ← 开发用配置 (.gitignore)
```

## Plugin 设计模式

每个 plugin 遵循标准 Claude Code Plugin 结构：

```
<name>/
├── .claude-plugin/plugin.json
├── skills/<name>/SKILL.md
├── hooks/hooks.json             ← 用 ${CLAUDE_PLUGIN_ROOT}
├── hooks/*.py
├── scripts/
├── agents/
├── __tests__/
└── README.md
```

## Skill 设计模式

每个 skill 同时也包装为最小 plugin（通过 `.claude-plugin/plugin.json`），使其可通过 `claude plugin install` 分发：

```
<name>/
├── .claude-plugin/plugin.json   ← 最小 plugin 包装（新增）
├── SKILL.md
├── references/
├── examples/
├── agents/
├── scripts/ + __tests__/
└── evals/evals.json
```

## 使用方式

**推荐：一条命令注册 marketplace**

```bash
# 注册（每台机器只需一次）
claude plugin marketplace add YuluoY/claude-uluo

# 安装扩展（每个项目）
claude plugin install <扩展名>@claude-uluo --scope project
```

Claude Code 自动从 GitHub 拉取，无需手动 clone。

**亦可一键脚本**

```bash
curl -fsSL https://raw.githubusercontent.com/YuluoY/claude-uluo/main/scripts/install.sh | bash -s -- <扩展名>
```

**Symlink 兼容方式**

```bash
./scripts/setup.sh symlink
# 或 ln -sfn ~/claude-uluo/skills/<name> .claude/skills/<name>
```

## Workspace 打包规范

claude-uluo workspace 内的 skill 需创建 `.claude-plugin/plugin.json` 用于 plugin 分发。此规范是 workspace 级别，不影响 uluo-skill-creator 创建的 skill 本身。

### plugin.json 必需字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | plugin 名称，与 skill 目录名一致 |
| `version` | string | 语义化版本号（如 `0.1.0`） |
| `description` | string | plugin 描述，简明说明 skill 用途 |
| `skills` | string | skill 入口路径，固定为 `"./"` |

### 示例

```json
{
  "name": "uluo-skill-creator",
  "version": "0.3.0",
  "description": "规范化+流程化的 skill 创建器",
  "skills": "./"
}
```

## 已注册

| 类型 | 名称 | 路径 |
|------|------|------|
| Plugin | memex | `plugins/memex/` |
| Plugin | diagram-compiler | `skills/diagram-compiler/` |
| Plugin | frontend-visual-qa | `skills/frontend-visual-qa/` |
| Plugin | html-blueprint | `skills/html-blueprint/` |
| Plugin | impeccable | `skills/impeccable/` |
| Plugin | skill-creator | `skills/skill-creator/` |
| Plugin | spirit-forge | `skills/spirit-forge/` |
| Plugin | uluo-change-flow | `skills/uluo-change-flow/` |
| Plugin | uluo-doc-standards | `skills/uluo-doc-standards/` |
| Plugin | uluo-skill-creator | `skills/uluo-skill-creator/` |
| Plugin | uluo-web-standards | `skills/uluo-web-standards/` |
| Plugin | ui-component-creator | `skills/ui-component-creator/` |
