type Item = {
  price: number;
  quantity: number;
  disabled?: boolean;
};

const VIP_DISCOUNT = 0.9;

const isEnabled = (item: Item): boolean => !item.disabled;

const getSubtotal = (item: Item): number => item.price * item.quantity;

const add = (acc: number, value: number): number => acc + value;

/**
 * Calculate the total price for a list of items, applying a VIP discount when applicable.
 *
 * Disabled items are excluded from the calculation.
 * VIP customers receive a 10% discount on the final total.
 */
export function calculateTotal(items: Item[], vip: boolean): number {
  const subtotal = items
    .filter(isEnabled)
    .map(getSubtotal)
    .reduce(add, 0);

  return vip ? subtotal * VIP_DISCOUNT : subtotal;
}
