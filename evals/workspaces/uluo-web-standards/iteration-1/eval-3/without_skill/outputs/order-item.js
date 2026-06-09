'use strict';

const { Money } = require('./money');

/**
 * A single line item in an order.
 * @class OrderItem
 */
class OrderItem {
  /**
   * @param {string} productId
   * @param {string} name
   * @param {Money} price - unit price
   * @param {number} quantity
   */
  constructor(productId, name, price, quantity) {
    if (!(price instanceof Money)) {
      throw new TypeError('OrderItem price must be a Money instance');
    }
    if (typeof quantity !== 'number' || quantity < 1) {
      throw new TypeError('OrderItem quantity must be >= 1');
    }
    this.productId = productId;
    this.name = name;
    this.price = price;
    this.quantity = quantity;
  }
}

module.exports = { OrderItem };
