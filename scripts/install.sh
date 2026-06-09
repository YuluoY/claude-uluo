#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# claude-uluo 安装脚本
# ============================================================
# 一行搞定 clone + 注册 marketplace + 安装扩展：
#   curl -fsSL https://raw.githubusercontent.com/YuluoY/claude-uluo/main/scripts/install.sh | bash
#   curl -fsSL ... | bash -s -- diagram-compiler
# ============================================================

REPO_URL="https://github.com/YuluoY/claude-uluo.git"
REPO_DIR="$HOME/claude-uluo"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
STEP=0

step() { STEP=$((STEP + 1)); echo -e "${CYAN}[$STEP/3]${NC} $1"; }
ok()   { echo -e "      ${GREEN}✓${NC} $1"; }
warn() { echo -e "      ${YELLOW}!${NC} $1"; }
die()  { echo -e "${RED}错误: $1${NC}" >&2; exit 1; }

# ---- 检查依赖 ----
command -v git    &>/dev/null || die "请先安装 git"
command -v python3 &>/dev/null || die "请先安装 python3"

# ---- 获取/更新仓库 ----
if [[ -d "$REPO_DIR/.git" ]]; then
  step "更新本地仓库"
  cd "$REPO_DIR" && git pull --ff-only --quiet && ok "已更新" || warn "更新失败，使用本地版本"
else
  step "克隆仓库到 $REPO_DIR"
  git clone --quiet "$REPO_URL" "$REPO_DIR" && ok "克隆完成"
fi

# ---- 注册 marketplace ----
step "注册 marketplace"
SETTINGS=".claude/settings.json"
if [[ ! -f "$SETTINGS" ]]; then
  mkdir -p .claude && echo '{}' > "$SETTINGS"
fi

python3 <<PY
import json
with open('$SETTINGS') as f:
    data = json.load(f)
data.setdefault('extraKnownMarketplaces', {})
data['extraKnownMarketplaces']['claude-uluo'] = {
    'source': {'source': 'directory', 'path': '$REPO_DIR'}
}
with open('$SETTINGS', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
    f.write('\n')
PY
ok "已写入 .claude/settings.json"

# ---- 安装扩展 ----
SKILL_NAME="${1:-}"
if [[ -n "$SKILL_NAME" ]]; then
  step "安装 $SKILL_NAME"
  command -v claude &>/dev/null || die "请先安装 Claude Code CLI: npm install -g @anthropic-ai/claude-code"
  claude plugin install "$SKILL_NAME@claude-uluo" --scope project && ok "$SKILL_NAME 安装完成"
else
  echo ""
  echo -e "${GREEN}搞定！${NC} 现在可以安装任意扩展："
  echo ""
  echo "  claude plugin install <name>@claude-uluo --scope project"
  echo ""
  echo "  可用扩展列表: https://github.com/YuluoY/claude-uluo#扩展列表"
fi
