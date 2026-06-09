/**
 * Represents a single item in an order with pricing and availability information.
 */
interface OrderItem {
  price: number;
  quantity: number;
  /** When true, this item is excluded from total calculation. */
  disabled?: boolean;
}

/** VIP users receive a 10% discount. */
const VIP_DISCOUNT_RATE = 0.9;

/**
 * Calculates the total price of all enabled items, with an optional discount rate.
 *
 * @param items - Array of order items, each with a price and quantity. Items
 *   marked `disabled` are skipped.
 * @param options - Optional configuration for the calculation.
 * @param options.discountRate - Discount rate to apply to the subtotal
 *   (0–1 range, where 1 = no discount). Defaults to 1.
 * @returns The calculated total after applying the discount.
 *
 * @example
 * // Regular users — no discount
 * calculateTotal([{ price: 100, quantity: 2 }])
 * // => 200
 *
 * @example
 * // VIP users — 10% off
 * calculateTotal([{ price: 100, quantity: 2 }], { discountRate: VIP_DISCOUNT_RATE })
 * // => 180
 */
export function calculateTotal(
  items: readonly OrderItem[],
  { discountRate = 1 }: { discountRate?: number } = {},
): number {
  const subtotal = items
    .filter((item) => !item.disabled)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  return subtotal * discountRate;
}
