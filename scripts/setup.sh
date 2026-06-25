#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# claude-uluo 一键引入脚本
# ============================================================
# 用法:
#   ./setup.sh                        # 交互式选择模式
#   ./setup.sh plugin <name>          # 安装指定 plugin（推荐）
#   ./setup.sh symlink                # symlink 全部 skill（兼容旧方式）
#   ./setup.sh all                    # plugin 安装全部 skill
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SKILLS_DIR="$REPO_DIR/skills"

SKILLS=(
  "diagram-compiler"
  "frontend-visual-qa"
  "html-blueprint"
  "impeccable"
  "skill-creator"
  "uluo-spec-driven"
  "uluo-web-standards"
)

# ----------------------------------------------------------
# 检查 claude 命令是否可用
# ----------------------------------------------------------
check_claude() {
  if ! command -v claude &>/dev/null; then
    echo -e "${RED}错误: 找不到 claude 命令，请先安装 Claude Code${NC}"
    echo "  npm install -g @anthropic-ai/claude-code"
    exit 1
  fi
}

# ----------------------------------------------------------
# Plugin 安装模式（推荐）
# ----------------------------------------------------------
install_plugin() {
  local name="$1"
  check_claude

  echo -e "${GREEN}→ 安装 $name@claude-uluo ...${NC}"

  # 先确保 marketplace 已注册
  if ! claude plugin list 2>/dev/null | grep -q "claude-uluo"; then
    echo -e "${YELLOW}注册 marketplace ...${NC}"
    claude plugin add-marketplace claude-uluo --source "$REPO_DIR" 2>/dev/null || true
  fi

  claude plugin install "$name@claude-uluo" --scope project
  echo -e "${GREEN}✓ $name 安装完成${NC}"
}

# ----------------------------------------------------------
# Symlink 模式（兼容旧方式）
# ----------------------------------------------------------
install_symlink() {
  local name="$1"
  local target=".claude/skills/$name"
  local source="$SKILLS_DIR/$name"

  if [ ! -d "$source" ]; then
    echo -e "${RED}错误: 找不到 skill 目录 $source${NC}"
    return 1
  fi

  mkdir -p "$(dirname "$target")"
  ln -sfn "$source" "$target"
  echo -e "${GREEN}✓ $name → $target${NC}"
}

# ----------------------------------------------------------
# 全部安装
# ----------------------------------------------------------
install_all_plugins() {
  echo -e "${GREEN}=== Plugin 模式：安装全部 skill ===${NC}"
  for skill in "${SKILLS[@]}"; do
    install_plugin "$skill"
  done
}

install_all_symlinks() {
  echo -e "${GREEN}=== Symlink 模式：链接全部 skill ===${NC}"
  for skill in "${SKILLS[@]}"; do
    install_symlink "$skill"
  done
}

# ----------------------------------------------------------
# 交互式菜单
# ----------------------------------------------------------
interactive_menu() {
  echo "============================================"
  echo "  claude-uluo 快速引入"
  echo "============================================"
  echo ""
  echo "  1) Plugin 安装全部 skill（推荐）"
  echo "  2) Plugin 安装单个 skill"
  echo "  3) Symlink 全部 skill（兼容旧方式）"
  echo "  4) Symlink 单个 skill"
  echo ""
  read -rp "  请选择 [1-4]: " choice

  case "$choice" in
    1) install_all_plugins ;;
    2)
      echo "可选: ${SKILLS[*]}"
      read -rp "  输入 skill 名称: " name
      install_plugin "$name"
      ;;
    3) install_all_symlinks ;;
    4)
      echo "可选: ${SKILLS[*]}"
      read -rp "  输入 skill 名称: " name
      install_symlink "$name"
      ;;
    *) echo -e "${RED}无效选择${NC}"; exit 1 ;;
  esac
}

# ----------------------------------------------------------
# Main
# ----------------------------------------------------------
case "${1:-}" in
  plugin)
    if [ -z "${2:-}" ]; then
      echo "用法: $0 plugin <name>"
      echo "可选: ${SKILLS[*]}"
      exit 1
    fi
    install_plugin "$2"
    ;;
  symlink)
    if [ -z "${2:-}" ]; then
      install_all_symlinks
    else
      install_symlink "$2"
    fi
    ;;
  all)
    install_all_plugins
    ;;
  *)
    interactive_menu
    ;;
esac
