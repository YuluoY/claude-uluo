#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# claude-uluo 安装脚本
# ============================================================
# 用法:
#   curl -fsSL ...install.sh | bash              # 仅注册 marketplace
#   curl -fsSL ...install.sh | bash -s -- all     # 一键安装全部扩展
#   curl -fsSL ...install.sh | bash -s -- <名称>  # 安装指定扩展
# ============================================================

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
die() { echo -e "${RED}错误: $1${NC}" >&2; exit 1; }

command -v claude &>/dev/null || die "请先安装 Claude Code CLI: npm install -g @anthropic-ai/claude-code"

# ---- 注册 marketplace ----
claude plugin marketplace add YuluoY/claude-uluo 2>/dev/null || true
echo -e "${GREEN}✓${NC} marketplace 已注册"

# ---- 全部安装 ----
ALL=(
  diagram-compiler
  frontend-visual-qa
  html-blueprint
  uluo-spec-driven
  uluo-web-standards
  impeccable
  skill-creator
  memex
)

install_one() {
  local name="$1"
  echo -n "  ${name} ... "
  claude plugin install "$name@claude-uluo" --scope project 2>&1 | tail -1
}

case "${1:-}" in
  all)
    echo -e "${CYAN}一键安装全部扩展 ...${NC}"
    for ext in "${ALL[@]}"; do install_one "$ext"; done
    echo -e "${GREEN}✓ 全部安装完成${NC}"
    ;;
  "")
    echo ""
    echo -e "${GREEN}搞定！${NC} 现在可以安装扩展:"
    echo ""
    echo "  全部安装: curl -fsSL ...install.sh | bash -s -- all"
    echo "  单独安装: claude plugin install <名称>@claude-uluo --scope project"
    ;;
  *)
    echo -e "${CYAN}安装 $1 ...${NC}"
    claude plugin install "$1@claude-uluo" --scope project && echo -e "${GREEN}✓${NC} $1 安装完成"
    ;;
esac
