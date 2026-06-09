# Skill Benchmark: uluo-web-standards (Iteration 2)

**Date**: 2026-06-08 | **Evals**: 5 selected (0,6,8,10,11)

## Summary

| Metric | With Skill | Without Skill | Delta |
|--------|-----------|---------------|-------|
| Pass Rate | 93.4% | 85.3% | +8.1% |
| Time | 215s | 99s | +116s |
| Tokens | 44664 | 11135 | +33529 |

## Per-Eval Results

| Eval | With Skill | Without Skill | Gap | WS Tokens | WO Tokens |
|------|-----------|---------------|-----|-----------|-----------|
| eval-0 | 67% | 67% | +0% | 58723 | 8986 |
| eval-6 | 100% | 100% | +0% | 38626 | 10450 |
| eval-8 | 100% | 100% | +0% | 29882 | 8658 |
| eval-10 | 100% | 100% | +0% | 33722 | 9794 |
| eval-11 | 100% | 60% | +40% | 62368 | 17787 |

## Comparison with Iteration 1

| Metric | Iteration 1 | Iteration 2 | Change |
|--------|------------|------------|--------|
| With Skill Pass Rate | 64.2% | 93.4% | +29.2% |
| Without Skill Pass Rate | 45.3% | 85.3% | +40.0% |
| Delta | +19pp | +8.1% | |
| With Skill Tokens | 60,457 | 44664 | -15793 |
| Ratio (WS/WO Tokens) | 3.4x | 4.0x | |

> Note: Iteration 1 used 12 evals with process assertions. Iteration 2 uses 5 evals with output-quality-only assertions. Direct comparison is approximate.

## Key Findings

- **eval-0 (refactor-function)**: Both 67% — console.log remains in both outputs. With_skill produces better structure but doesn't gain on pass rate due to this shared issue.
- **eval-6 (review)**: Both 100% — Review scenario works well, with_skill adds specific rule citations.
- **eval-8 (simple-refactor)**: Both 100% — LIGHT path with restraint principles works. Skill no longer over-engineers simple tasks.
- **eval-10 (small-module)**: Both 100% — LIGHT/MEDIUM path works. Skill loads appropriate files without excess.
- **eval-11 (notification-module)**: 100% vs 60% — largest gap (+40%). Skill enforces directory structure and barrel exports effectively.
