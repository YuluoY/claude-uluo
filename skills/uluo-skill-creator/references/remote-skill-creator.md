# 远程引用 skill-creator（Remote Skill Creator）

## 目的

**必需环节**：skill-creator 是 Phase 8 测试/benchmark 的必需环节。本地有则用本地，无则从 GitHub raw 获取。

---

## GitHub raw URL 清单

**远程获取**：本地无 skill-creator 时，通过 WebFetch 读取以下 URL。

| 文件 | URL |
|------|-----|
| SKILL.md | `https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/SKILL.md` |
| aggregate_benchmark.py | `https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/scripts/aggregate_benchmark.py` |
| run_eval.py | `https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/scripts/run_eval.py` |
| run_loop.py | `https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/scripts/run_loop.py` |
| generate_review.py | `https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/eval-viewer/generate_review.py` |
| grader.md | `https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/agents/grader.md` |
| analyzer.md | `https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/agents/analyzer.md` |
| comparator.md | `https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/agents/comparator.md` |
| schemas.md | `https://raw.githubusercontent.com/anthropics/skills/main/skills/skill-creator/references/schemas.md` |

---

## npx skills 完整安装

**完整管线**：需要运行完整测试/benchmark 管线时，使用 npx skills 安装。

```bash
npx skills add anthropics/skills/skill-creator
```

---

## 参考

- [anthropics/skills 仓库](https://github.com/anthropics/skills)：skill-creator 上游
- [skills.sh](https://skills.sh)：npx skills 工具官网
