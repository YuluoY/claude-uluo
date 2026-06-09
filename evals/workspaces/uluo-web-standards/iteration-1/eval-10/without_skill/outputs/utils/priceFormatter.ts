/**
 * Supported currency codes for price formatting.
 */
type CurrencyCode = 'CNY' | 'USD' | 'EUR' | 'JPY' | 'GBP';

/**
 * Configuration options for price formatting.
 */
interface PriceFormatOptions {
  /** The currency code (e.g., 'CNY', 'USD'). Defaults to 'CNY'. */
  currency?: CurrencyCode;
  /** Number of decimal places. Defaults to 2 for most currencies, 0 for JPY. */
  decimals?: number;
  /** The locale used for thousand separators and decimal delimiter. Defaults to 'zh-CN'. */
  locale?: string;
  /** Whether to include the currency symbol. Defaults to true. */
  showSymbol?: boolean;
}

/**
 * Internal mapping of currency codes to their typical symbols and default decimal places.
 */
const CURRENCY_CONFIG: Record<
  CurrencyCode,
  { symbol: string; defaultDecimals: number }
> = {
  CNY: { symbol: '¥', defaultDecimals: 2 },
  USD: { symbol: '$', defaultDecimals: 2 },
  EUR: { symbol: '€', defaultDecimals: 2 },
  JPY: { symbol: '¥', defaultDecimals: 0 },
  GBP: { symbol: '£', defaultDecimals: 2 },
};

/**
 * Formats a numeric value into a human-readable price string with proper
 * thousand separators, decimal places, and an optional currency symbol.
 *
 * This is a pure function: given the same inputs it always returns the same
 * output, and it does not mutate any external state or cause side effects.
 *
 * @param value - The numeric price value to format. Accepts number or a
 *   numeric string. Values that cannot be parsed as a finite number will
 *   result in an empty string being returned.
 * @param options - Optional configuration for currency, decimals, locale,
 *   and symbol display.
 * @returns The formatted price string (e.g., "¥123,456.78"), or an empty
 *   string if the input is not a valid finite number.
 *
 * @example
 * // Basic usage with defaults (CNY, zh-CN)
 * formatPrice(123456.78);
 * // Returns: "¥123,456.78"
 *
 * @example
 * // US Dollars with English locale
 * formatPrice(123456.78, { currency: 'USD', locale: 'en-US' });
 * // Returns: "$123,456.78"
 *
 * @example
 * // Japanese Yen (0 decimal places by default)
 * formatPrice(123456, { currency: 'JPY', locale: 'ja-JP' });
 * // Returns: "¥123,456"
 *
 * @example
 * // Without currency symbol
 * formatPrice(99.9, { showSymbol: false });
 * // Returns: "99.90"
 *
 * @example
 * // Invalid input returns empty string
 * formatPrice(NaN);
 * // Returns: ""
 */
export function formatPrice(
  value: number | string,
  options: PriceFormatOptions = {},
): string {
  const {
    currency = 'CNY',
    decimals,
    locale = 'zh-CN',
    showSymbol = true,
  } = options;

  // Parse the input to a number, coercing strings and handling edge cases
  const num = typeof value === 'string' ? parseFloat(value) : value;

  // Guard against NaN, Infinity, and other non-finite values
  if (!Number.isFinite(num)) {
    return '';
  }

  const config = CURRENCY_CONFIG[currency];
  const decimalPlaces = decimals ?? config.defaultDecimals;

  // Format the numeric portion using Intl.NumberFormat for proper locale-aware
  // grouping and decimal separators.
  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(num);

  // Prepend the currency symbol if requested
  return showSymbol ? `${config.symbol}${formattedNumber}` : formattedNumber;
}
