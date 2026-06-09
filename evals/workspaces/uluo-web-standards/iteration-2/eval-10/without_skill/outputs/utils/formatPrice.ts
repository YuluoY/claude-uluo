/**
 * Options for customizing price formatting behavior.
 */
interface FormatPriceOptions {
  /** The currency symbol to prepend or append (e.g., '¥', '$', '€'). Defaults to '¥'. */
  currency?: string;
  /** The number of decimal places to display. Defaults to 2. */
  decimals?: number;
  /** Whether to use locale-aware grouping (thousands separator). Defaults to true. */
  locale?: string | false;
  /** Whether to use the "cents" minor-unit convention: input is in cents, so divide by 100 first. Defaults to false. */
  inMinorUnit?: boolean;
}

/**
 * Formats a numeric price value into a human-readable currency string.
 *
 * This is a **pure function** — given the same input and options, it always
 * produces the same output. It does not mutate any external state, perform
 * I/O, or depend on mutable global variables.
 *
 * @param value - The numeric price to format. Supports integers, floats, and
 *   numeric strings (e.g. `"1999.9"`). NaN and infinite values will throw.
 * @param options - Optional formatting overrides.
 * @param options.currency - Currency symbol to use (default: `'¥'`).
 * @param options.decimals - Number of decimal places (default: `2`).
 * @param options.locale - A BCP 47 locale tag for locale-aware grouping
 *   (e.g. `'en-US'`, `'zh-CN'`). Pass `false` to disable grouping entirely.
 *   Defaults to `'zh-CN'`.
 * @param options.inMinorUnit - Treat the input as the minor currency unit
 *   (cents) and divide by 100 before formatting. Defaults to `false`.
 *
 * @returns The formatted price string, including the currency symbol.
 *
 * @throws {RangeError} If `value` is NaN, infinite, or negative when the
 *   caller expects a non-negative price.
 *
 * @example
 * ```ts
 * // Basic usage
 * formatPrice(1234.5);
 * // => '¥1,234.50'
 *
 * // Different currency and locale
 * formatPrice(1234.5, { currency: '$', locale: 'en-US' });
 * // => '$1,234.50'
 *
 * // Input in cents (minor unit)
 * formatPrice(123450, { inMinorUnit: true });
 * // => '¥1,234.50'
 *
 * // Disable grouping
 * formatPrice(1234.5, { locale: false });
 * // => '¥1234.50'
 * ```
 */
function formatPrice(
  value: number | string,
  options: FormatPriceOptions = {},
): string {
  const {
    currency = '¥', // ¥
    decimals = 2,
    locale = 'zh-CN',
    inMinorUnit = false,
  } = options;

  let num = typeof value === 'string' ? Number.parseFloat(value) : value;

  if (!Number.isFinite(num)) {
    throw new RangeError(
      `formatPrice: value must be a finite number, received ${typeof value} = ${value}`,
    );
  }

  if (inMinorUnit) {
    num /= 100;
  }

  /* ---- Build the numeric part ---- */
  const abs = Math.abs(num);
  const fixed = abs.toFixed(decimals);
  const [integerPart, fractionPart] = fixed.split('.') as [string, string];

  const groupedInteger =
    locale !== false
      ? Number.parseInt(integerPart, 10).toLocaleString(locale, {
        useGrouping: true,
        minimumIntegerDigits: 1,
      })
      : integerPart;

  const negativeSign = num < 0 ? '-' : '';
  const body = fractionPart
    ? `${groupedInteger}.${fractionPart}`
    : groupedInteger;

  /* ---- Assemble final string ---- */
  return `${negativeSign}${currency}${body}`;
}

export { formatPrice };
export type { FormatPriceOptions };
