'use strict';

const { Money, zero } = require('./money');
const { OrderItem } = require('./order-item');

/**
 * Order entity – holds the raw data of an order.
 * Mutations happen through the use-case layer.
 *
 * @class Order
 */
class Order {
  /**
   * @param {string} id
   * @param {OrderItem[]} items
   * @param {string} memberLevel
   * @param {string} deliveryMethod
   */
  constructor(id, items, memberLevel, deliveryMethod) {
    this.id = id;
    this.items = items;
    this.memberLevel = memberLevel;
    this.deliveryMethod = deliveryMethod;
    // Computed fields – populated by use-cases
    this.subtotal = null;
    this.discountAmount = null;
    this.shippingCost = null;
    this.total = null;
  }

  /**
   * Compute the subtotal by summing line-item totals.
   * @returns {Money}
   */
  computeSubtotal() {
    const currency = inferCurrency(this.items);
    if (currency === null) {
      return zero('USD');
    }
    const initial = zero(currency);
    return this.items.reduce(
      (sum, item) => sum.add(item.price.multiply(item.quantity)),
      initial
    );
  }
}

/**
 * Infer the base currency from the first item. Returns null for empty orders.
 * @param {OrderItem[]} items
 * @returns {string|null}
 */
function inferCurrency(items) {
  if (items.length === 0) {
    return null;
  }
  return items[0].price.currency;
}

module.exports = { Order };
