#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# claude-uluo 打包脚本：将 skills/ 与 plugins/ 打为 dist/*.zip
# ============================================================
# 用法:
#   ./scripts/build.sh              # 全量打包
#   ./scripts/build.sh <name>       # 打包指定扩展（如 video-production）
# ============================================================

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$REPO_DIR/dist"
mkdir -p "$DIST_DIR"

# 排除规则（对齐 .gitignore 与 skill dev 文件）
EXCLUDES=(
  -x "*.DS_Store" "*.DS_Store/*"
  "*__pycache__*" "*.pyc" "*.pyo"
  "*.pytest_cache*" "*.pytest_cache/*"
  "*__tests__*"
  "*node_modules*"
  "*/package.json" "*/package-lock.json" "*/vitest.config.js"
  "*.html" "*.db" "*.db.bak"
)

build_skill() {
  local name="$1"
  local src="$REPO_DIR/skills/$name"
  if [ ! -d "$src" ]; then
    echo "✗ 跳过 $name：目录不存在"
    return 1
  fi
  (cd "$REPO_DIR" && rm -f "dist/$name.zip" && zip -qr "dist/$name.zip" "skills/$name" "${EXCLUDES[@]}")
  echo "✓ dist/$name.zip ($(du -h "dist/$name.zip" | cut -f1))"
}

build_plugin() {
  local name="$1"
  local src="$REPO_DIR/plugins/$name"
  if [ ! -d "$src" ]; then
    echo "✗ 跳过 $name：目录不存在"
    return 1
  fi
  (cd "$REPO_DIR" && rm -f "dist/$name.zip" && zip -qr "dist/$name.zip" "plugins/$name" "${EXCLUDES[@]}")
  echo "✓ dist/$name.zip ($(du -h "dist/$name.zip" | cut -f1))"
}

# 收集全部打包目标：skills/* + plugins/*
all_names() {
  for d in "$REPO_DIR"/skills/*/; do
    [ -d "$d" ] && basename "$d"
  done
  for d in "$REPO_DIR"/plugins/*/; do
    [ -d "$d" ] && basename "$d"
  done
}

case "${1:-}" in
  "")
    echo "=== 全量打包 ==="
    for name in $(all_names); do
      if [ -d "$REPO_DIR/skills/$name" ]; then
        build_skill "$name"
      elif [ -d "$REPO_DIR/plugins/$name" ]; then
        build_plugin "$name"
      fi
    done
    echo "=== 完成，共 $(ls "$DIST_DIR" | wc -l | tr -d ' ') 个 zip ==="
    ;;
  -h|--help)
    echo "用法: $0 [name]    # 无参数=全量打包"
    echo "可选: $(all_names)"
    ;;
  *)
    if [ -d "$REPO_DIR/skills/$1" ]; then
      build_skill "$1"
    elif [ -d "$REPO_DIR/plugins/$1" ]; then
      build_plugin "$1"
    else
      echo "✗ 未知扩展: $1"
      echo "可选: $(all_names)"
      exit 1
    fi
    ;;
esac
