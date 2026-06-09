# 🛠️ claude-uluo

<p align="center">
  <a href="./README_zh.md">中文</a>
  &nbsp;·&nbsp;
  <a href="#-quick-start">Quick Start</a>
  &nbsp;·&nbsp;
  <a href="#-extensions">Extensions</a>
  &nbsp;·&nbsp;
  <a href="#-contributing">Contributing</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="https://docs.anthropic.com/en/docs/claude-code"><img src="https://img.shields.io/badge/Claude%20Code-≥2.1.0-orange?logo=claude&logoColor=white" alt="Claude Code ≥2.1.0"></a>
</p>

A marketplace of Claude Code extensions for frontend development — UI review, component blueprint, visual QA, diagram compilation, doc standards, and more. Install with a single command.

## 🚀 Quick Start

```bash
# 1. Register the marketplace (once per machine)
claude plugin marketplace add YuluoY/claude-uluo

# 2. Install all extensions at once
claude plugin install claude-uluo-all@claude-uluo --scope project

# Or pick one
claude plugin install diagram-compiler@claude-uluo --scope project
```

> Requires [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI ≥ 2.1.0

## 📦 Installation

### ⚡ Install All (Recommended)

```bash
# Register the marketplace
claude plugin marketplace add YuluoY/claude-uluo

# Install everything
claude plugin install claude-uluo-all@claude-uluo --scope project
```

Or use the one-line script:

```bash
curl -fsSL https://raw.githubusercontent.com/YuluoY/claude-uluo/main/scripts/install.sh | bash -s -- all
```

### 🎯 Install Individual

```bash
claude plugin install <name>@claude-uluo --scope project
```

### 🔄 Update

```bash
claude plugin update <name>
```

## 📖 Usage

```bash
# Install
claude plugin install diagram-compiler@claude-uluo --scope project

# List installed
claude plugin list

# Uninstall
claude plugin uninstall diagram-compiler@claude-uluo
```

Invoke in Claude Code: `/diagram-compiler`

## 📋 Extensions

### 🔌 Plugin

| Name | Description |
|------|-------------|
| claude-uluo-all | Meta plugin — installs all extensions as dependencies |
| [memex](plugins/memex/) | Long-term experience memory — auto learning, knowledge extraction, hybrid vector search |

### 🎨 Skill

**Built by claude-uluo**

| Name | Description |
|------|-------------|
| diagram-compiler | Technical diagram studio — Mermaid/Matplotlib/Canvas, flowcharts, architecture, paper figures |
| frontend-visual-qa | Visual QA for AI-generated UI — design tokens, components, responsive, a11y, i18n |
| html-blueprint | HTML-first component design protocol — data-* annotated renderable drafts |
| uluo-doc-standards | AI coding doc standards — spec/plan/tasks/changelog templates and quality benchmarks |
| uluo-web-standards | Web engineering standards — eslint/stylelint/tsc + DDD architecture + soft rules |

**Curated**

| Name | Description | Source |
|------|-------------|--------|
| impeccable | Frontend UI design & review — UX, visual hierarchy, a11y, theming, typography, motion | Third-party |
| skill-creator | Skill creation & evaluation — evals, benchmarking, variance analysis | Claude Code Official |

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## 📄 License

[MIT](LICENSE)
