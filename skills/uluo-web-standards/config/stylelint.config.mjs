/**
 * stylelint 配置 —— SCSS + Concentric 属性排序 + BEM 友好。
 *
 * 使用：
 *   stylelint "**\/*.scss" "**\/*.vue" --fix   → 自动修复（含属性排序）
 *   stylelint "**\/*.scss" "**\/*.vue"         → 审查
 *
 * 属性排序：[Positioning → Display/Box Model → Typography → Visual → Animation → Misc]
 */
export default {
  extends: ['stylelint-config-standard-scss'],

  plugins: ['stylelint-order'],

  rules: {
    // ── 属性排序（Concentric：从外到内） ──
    'order/properties-order': [
      // 1. Positioning
      'position', 'top', 'right', 'bottom', 'left', 'inset', 'z-index',

      // 2. Display & Box Model
      'display', 'flex', 'flex-direction', 'flex-wrap', 'flex-flow',
      'align-items', 'align-self', 'align-content',
      'justify-content', 'justify-items', 'justify-self',
      'grid', 'grid-template', 'grid-template-columns', 'grid-template-rows',
      'grid-column', 'grid-row', 'gap', 'row-gap', 'column-gap',
      'order',
      'width', 'min-width', 'max-width',
      'height', 'min-height', 'max-height',
      'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
      'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
      'box-sizing', 'overflow', 'overflow-x', 'overflow-y',

      // 3. Typography
      'font', 'font-family', 'font-size', 'font-weight', 'font-style',
      'line-height', 'letter-spacing', 'word-spacing',
      'text-align', 'text-transform', 'text-decoration', 'text-indent',
      'white-space', 'word-break', 'word-wrap',
      'color',

      // 4. Visual
      'background', 'background-color', 'background-image', 'background-size',
      'background-position', 'background-repeat',
      'border', 'border-width', 'border-style', 'border-color',
      'border-top', 'border-right', 'border-bottom', 'border-left',
      'border-radius',
      'box-shadow',
      'opacity', 'visibility',
      'outline', 'outline-offset',

      // 5. Animation & Transform
      'transition', 'transition-property', 'transition-duration', 'transition-timing-function',
      'transform', 'transform-origin',
      'animation', 'animation-name', 'animation-duration', 'animation-timing-function',

      // 6. Misc
      'content',
      'cursor', 'user-select', 'pointer-events',
      'will-change',
      'appearance',
    ],

    // ── BEM 友好规则 ──
    // 允许 BEM 双下划线和双横线模式
    'selector-class-pattern': [
      '^[a-z]([a-z0-9-]+)?(__([a-z][a-z0-9-]*?)?)?(--([a-z][a-z0-9-]*?)?)?$',
      { resolveNestedSelectors: true },
    ],

    // ── 通用质量规则 ──
    'declaration-no-important': true,
    'no-duplicate-selectors': true,
    'color-no-invalid-hex': true,

    // 禁止 ID 选择器 —— 权重太高难覆盖（见 languages/css.md §十）
    'selector-max-id': 0,

    // 选择器嵌套深度 ≤3（见 languages/css.md §九）
    'selector-max-compound-selectors': 3,

    // SCSS 规则
    'scss/dollar-variable-pattern': '^[a-z][a-z0-9-]*$',
    'scss/at-rule-no-unknown': true,
  },
}
