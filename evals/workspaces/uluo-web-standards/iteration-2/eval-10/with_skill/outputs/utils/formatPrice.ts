interface FormatPriceOptions {
  /** ISO 639-1 locale code, e.g. 'zh-CN', 'en-US'. Defaults to 'zh-CN'. */
  locale?: string;
  /** ISO 4217 currency code, e.g. 'CNY', 'USD'. Defaults to 'CNY'. */
  currency?: string;
  /** Minimum fraction digits. Defaults to 2. */
  minimumFractionDigits?: number;
  /** Maximum fraction digits. Defaults to 2. */
  maximumFractionDigits?: number;
}

/**
 * 将数值型价格格式化为本地化货币字符串。
 *
 * 纯函数——不依赖外部状态，无副作用，相同输入始终产出相同输出。
 * 底层基于 {@link https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat | Intl.NumberFormat}，
 * 相比手写正则拼接，能正确处理千分位、小数点、货币符号位置等各 locale 的差异。
 *
 * @param price - 待格式化的价格数值。
 * @param options - 可选格式化配置，覆盖默认的 locale / currency / 小数位数。
 * @returns 格式化后的货币字符串，如 `'¥1,234.56'`。
 *
 * @example
 * ```ts
 * formatPrice(1234.5)
 * // => '¥1,234.50'
 *
 * formatPrice(1234.5, { currency: 'USD', locale: 'en-US' })
 * // => '$1,234.50'
 *
 * formatPrice(99, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
 * // => '¥99'
 * ```
 */
export function formatPrice(price: number, options?: Readonly<FormatPriceOptions>): string {
  if (typeof price !== 'number' || Number.isNaN(price)) {
    throw new TypeError('price must be a valid number')
  }

  const {
    locale = 'zh-CN',
    currency = 'CNY',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options ?? {}

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(price)
}
