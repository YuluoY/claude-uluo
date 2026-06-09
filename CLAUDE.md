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

**推荐：curl 一行安装**

```bash
# 注册 marketplace + 安装扩展，一步到位
curl -fsSL https://raw.githubusercontent.com/YuluoY/claude-uluo/main/scripts/install.sh | bash -s -- <扩展名>

# 或仅注册 marketplace
curl -fsSL https://raw.githubusercontent.com/YuluoY/claude-uluo/main/scripts/install.sh | bash
```

**手动安装**

```bash
git clone https://github.com/YuluoY/claude-uluo.git ~/claude-uluo

# 在项目 .claude/settings.json 注册 marketplace：
#   "extraKnownMarketplaces": {
#     "claude-uluo": { "source": { "source": "directory", "path": "~/claude-uluo" } }
#   }

# 安装扩展
claude plugin install <扩展名>@claude-uluo --scope project
```

**Symlink 兼容方式**

```bash
./scripts/setup.sh symlink
# 或 ln -sfn ~/claude-uluo/skills/<name> .claude/skills/<name>
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
| Plugin | uluo-doc-standards | `skills/uluo-doc-standards/` |
| Plugin | uluo-web-standards | `skills/uluo-web-standards/` |
