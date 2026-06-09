#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# claude-uluo 安装脚本
# ============================================================
# 一行注册 marketplace + 安装扩展:
#   curl -fsSL https://raw.githubusercontent.com/YuluoY/claude-uluo/main/scripts/install.sh | bash
#   curl -fsSL ... | bash -s -- diagram-compiler
# ============================================================

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
die() { echo -e "${RED}错误: $1${NC}" >&2; exit 1; }

# 检查依赖（仅需要 claude CLI）
command -v claude &>/dev/null || die "请先安装 Claude Code CLI: npm install -g @anthropic-ai/claude-code"

# 注册 marketplace（每台机器只需一次，claude code 自动从 github 拉取）
echo -e "${CYAN}注册 claude-uluo marketplace ...${NC}"
claude plugin marketplace add YuluoY/claude-uluo 2>/dev/null || true
echo -e "${GREEN}✓${NC} marketplace 已注册"

# 安装扩展
EXT="${1:-}"
if [[ -n "$EXT" ]]; then
  echo -e "${CYAN}安装 $EXT ...${NC}"
  claude plugin install "$EXT@claude-uluo" --scope project && echo -e "${GREEN}✓${NC} $EXT 安装完成"
else
  echo ""
  echo -e "${GREEN}搞定！${NC} 现在可以安装任意扩展:"
  echo ""
  echo "  claude plugin install <名称>@claude-uluo --scope project"
  echo ""
  echo "  可用: diagram-compiler frontend-visual-qa html-blueprint impeccable"
  echo "       skill-creator uluo-doc-standards uluo-web-standards memex"
fi
