/**
 * 价格格式化工具 — 纯函数模块。
 *
 * 职责：将数值转换为可读的金额字符串。
 * 身份：纯函数（脱离项目可复用，无副作用）。
 *
 * @module formatPrice
 */

/**
 * 价格格式化选项。
 */
interface FormatPriceOptions {
  /**
   * 货币符号，如 '¥'、'$'、'€'。
   * @default '¥'
   */
  currency?: string;

  /**
   * 小数位数。
   * @default 2
   */
  decimalPlaces?: number;
}

/**
 * 默认货币符号。
 * 修改半径=1：仅此一处定义。
 */
const DEFAULT_CURRENCY = '¥';

/**
 * 默认小数位数。
 * 修改半径=1：仅此一处定义。
 */
const DEFAULT_DECIMAL_PLACES = 2;

/**
 * 将数值格式化为可读的价格字符串。
 *
 * 此函数为纯函数——相同输入始终产生相同输出，不修改任何外部状态，不依赖任何外部资源。
 *
 * @param value - 待格式化的数值。支持正数、负数、零。非有限值（NaN/Infinity）会被安全降级为 0。
 * @param options - 可选配置项。
 * @param options.currency - 货币符号，默认 `'¥'`。
 * @param options.decimalPlaces - 小数位数，默认 `2`。
 * @returns 格式化后的价格字符串，如 `"¥1,234.50"`、`"-$12.50"`。
 *
 * @example
 * // 基本用法
 * formatPrice(12.5)
 * // => "¥12.50"
 *
 * @example
 * // 指定货币符号
 * formatPrice(1234.5, { currency: '$' })
 * // => "$1,234.50"
 *
 * @example
 * // 指定小数位数
 * formatPrice(99, { decimalPlaces: 0 })
 * // => "¥99"
 *
 * @example
 * // 负数处理——符号在货币符号之前
 * formatPrice(-12.5)
 * // => "-¥12.50"
 */
export function formatPrice(
  value: number,
  options?: FormatPriceOptions,
): string {
  const {
    currency = DEFAULT_CURRENCY,
    decimalPlaces = DEFAULT_DECIMAL_PLACES,
  } = options ?? {};

  // Guard: 非有限值降级为零，避免输出 "¥NaN" 或 "¥Infinity"
  if (!Number.isFinite(value)) {
    return `${currency}0.${'0'.repeat(decimalPlaces)}`;
  }

  const isNegative = value < 0;
  const absoluteValue = Math.abs(value);
  const fixed = absoluteValue.toFixed(decimalPlaces);
  const [integerPart, decimalPart] = fixed.split('.') as [string, string];

  // 整数部分添加千分位逗号
  const formattedInteger = integerPart.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ',',
  );

  const sign = isNegative ? '-' : '';

  return `${sign}${currency}${formattedInteger}.${decimalPart}`;
}
