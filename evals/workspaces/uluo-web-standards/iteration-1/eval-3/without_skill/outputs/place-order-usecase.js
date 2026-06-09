'use strict';

const { Money } = require('./money');
const { Order } = require('./order');
const { OrderItem } = require('./order-item');
const { calculateDiscount } = require('./discount-calculator');
const { calculateShipping } = require('./shipping-calculator');

/**
 * PlaceOrderUseCase orchestrates the full order-placement flow:
 * 1. Build domain objects from input data
 * 2. Validate the order
 * 3. Compute the subtotal
 * 4. Apply a membership-level discount
 * 5. Calculate shipping cost
 * 6. Compute the final total
 *
 * @class PlaceOrderUseCase
 */
class PlaceOrderUseCase {
  /**
   * @param {Object} input - raw order data
   * @param {string} input.id
   * @param {Array}  input.items - [{productId, name, price, currency, quantity}]
   * @param {string} input.memberLevel
   * @param {string} input.deliveryMethod
   * @returns {Order} the populated order
   */
  execute(input) {
    const order = buildOrder(input);
    validateOrder(order);
    const subtotal = order.computeSubtotal();
    const discountAmount = calculateDiscount(subtotal, order.memberLevel);
    const shippingCost = calculateShipping(
      order.deliveryMethod,
      subtotal.currency
    );
    const total = subtotal.subtract(discountAmount).add(shippingCost);

    order.subtotal = subtotal;
    order.discountAmount = discountAmount;
    order.shippingCost = shippingCost;
    order.total = total;

    return order;
  }
}

// ---------------------------------------------------------------------------
// Private helpers – extracted to keep nesting <= 3
// ---------------------------------------------------------------------------

/**
 * @param {Object} input
 * @returns {Order}
 */
function buildOrder(input) {
  const items = buildItems(input.items);
  return new Order(input.id, items, input.memberLevel, input.deliveryMethod);
}

/**
 * @param {Array} rawItems
 * @returns {OrderItem[]}
 */
function buildItems(rawItems) {
  return rawItems.map(toOrderItem);
}

/**
 * @param {Object} raw
 * @returns {OrderItem}
 */
function toOrderItem(raw) {
  const price = new Money(raw.price, raw.currency);
  return new OrderItem(raw.productId, raw.name, price, raw.quantity);
}

/**
 * Basic validation – throws on invalid input.
 * @param {Order} order
 */
function validateOrder(order) {
  if (!order.id) {
    throw new Error('Order id is required');
  }
  if (!Array.isArray(order.items) || order.items.length === 0) {
    throw new Error('Order must contain at least one item');
  }
  validateItemsConsistentCurrency(order.items);
}

/**
 * Ensure all items use the same currency.
 * @param {OrderItem[]} items
 */
function validateItemsConsistentCurrency(items) {
  const firstCurrency = items[0].price.currency;
  items.forEach(function checkItem(item) {
    if (item.price.currency !== firstCurrency) {
      throw new Error(
        `Currency mismatch in items: expected ${firstCurrency}, got ${item.price.currency}`
      );
    }
  });
}

module.exports = { PlaceOrderUseCase };
