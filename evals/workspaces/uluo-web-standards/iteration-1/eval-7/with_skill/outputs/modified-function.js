// =====================================================================
// File: src/utils/calc-discount.js
// Project: shop-mgr (e-commerce order management tool)
//
// Project existing conventions:
//   - eslint: airbnb-base with custom overrides
//   - eqeqeq: 'warn' (not error) -- project allows ==
//   - no-var: disabled -- project allows var in legacy code
//   - no-console: disabled -- project uses console.error for logging
//   - Naming: abbreviated names (cfg, usr, disc, amt) accepted
//   - Strings: single quotes required
//   - Semi-colons: required
//
// ⚠️ uluo-web-standards conflict resolution applied:
//   - skill's eqeqeq (MUST)        → downgraded to SHOULD (project allows ==)
//   - skill's no-var (MUST)        → downgraded to SHOULD (project uses var)
//   - skill's no-abbrev (SHOULD)   → overridden by project naming convention
//   - skill's no-console (MUST)    → downgraded to SHOULD (project uses console.error)
//
// Functional fixes applied (no project style changed):
//   [1] Freeze config object to prevent accidental runtime mutation
//   [2] Add input validation (Fail Fast pattern per coding-paradigms.md)
//   [3] Add guard clause for invalid user tier
//   [4] Add JSDoc for public API documentation (G8.2)
// =====================================================================

var cfg = Object.freeze({
  rates: Object.freeze({
    basic: 0.05,
    premium: 0.10,
    vip: 0.15,
  }),
});

/**
 * 计算订单折扣金额。
 * 根据用户等级返回对应的折扣金额。
 * 如果订单总额为非正数或用户等级无效，返回 0。
 *
 * @param {string} usr - 用户等级 ('basic' | 'premium' | 'vip')
 * @param {number} total - 订单总额
 * @returns {number} 折扣金额（非负数）
 */
export function calcDisc(usr, total) {
  // Fail Fast: 订单总额校验 —— 负值或 null/undefined 直接返回 0
  if (total == null || total <= 0) {
    return 0;
  }

  // Guard Clause: 无效用户等级提前退出
  var rate = cfg.rates[usr];
  if (rate == null) {
    console.error('[calcDisc] Unknown user tier: ' + usr);
    return 0;
  }

  return total * rate;
}
