# uluo-web-standards Benchmark — Iteration 1

**Date:** 2026-06-08
**Evals:** 12 test cases × 2 configurations = 24 runs

## Summary

| Metric | with_skill | without_skill | Delta |
|--------|-----------|---------------|-------|
| Pass Rate | 64.2% ± 18.3% | 45.3% ± 20.2% | **+0.19** |
| Time (avg) | 342s | 135s | +207.9s |
| Tokens (avg) | 60,457 | 17,613 | +42844 |

## Per-Eval Breakdown

| # | Eval | with_skill | without_skill | Gap |
|---|------|-----------|---------------|-----|
| 0 | refactor-function | 50% (725s, 88,078tok) | 50% (45s, 9,947tok) | 0% |
| 1 | library-booking-system | 57% (457s, 90,309tok) | 57% (339s, 36,361tok) | 0% |
| 2 | order-service-infra | 71% (366s, 72,651tok) | 57% (426s, 37,070tok) | +14% |
| 3 | js-discount-module | 57% (520s, 82,198tok) | 29% (188s, 18,646tok) | +28% |
| 4 | vue-product-list | 75% (299s, 59,342tok) | 62% (68s, 12,238tok) | +13% |
| 5 | react-user-list | 75% (347s, 56,696tok) | 62% (59s, 11,813tok) | +13% |
| 6 | review-domain-entity | 88% (97s, 38,040tok) | 75% (96s, 12,768tok) | +13% |
| 7 | conflict-resolution | 60% (230s, 41,970tok) | 20% (177s, 27,813tok) | +40% |
| 8 | simple-refactor | 17% (107s, 35,590tok) | 17% (23s, 8,802tok) | 0% |
| 9 | deliberate-violations | 75% (355s, 60,325tok) | 50% (41s, 9,780tok) | +25% |
| 10 | small-module | 71% (157s, 36,092tok) | 14% (41s, 9,947tok) | +57% |
| 11 | notification-module | 75% (450s, 64,198tok) | 50% (112s, 16,169tok) | +25% |

## Key Findings

1. **+19pp pass rate advantage** with the skill loaded, confirming the skill adds measurable value
2. **Skill costs 3-5x more tokens** — but produces self-check checklists, 4-phase protocol compliance, and systematic validation
3. **Biggest gaps** in conflict resolution (+40pp) and small module discipline (+57pp)
4. **Smallest gaps** in simple refactoring (0pp) — for trivial tasks, the skill's overhead doesn't help
5. **Eval-9 (violations)** is the most realistic — the skill agent actually ran eslint and validated the toolchain
