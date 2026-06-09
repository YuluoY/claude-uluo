'use strict';

const { Money } = require('./money');

/**
 * Shipping fee configuration keyed by delivery method.
 * @type {Object<string, number>}
 */
const SHIPPING_FEES = Object.freeze({
  STANDARD: 5.00,
  EXPRESS: 15.00,
  PICKUP: 0
});

const DEFAULT_FEE = 5.00;
const DEFAULT_CURRENCY = 'USD';

/**
 * Calculate the shipping cost for a given delivery method.
 *
 * @param {string} deliveryMethod
 * @param {string} [currency] - currency of the order (defaults to USD)
 * @returns {Money}
 */
function calculateShipping(deliveryMethod, currency) {
  const cur = currency || DEFAULT_CURRENCY;
  const fee = getShippingFee(deliveryMethod);
  return new Money(fee, cur);
}

/**
 * Look up the shipping fee for the given delivery method.
 * @param {string} deliveryMethod
 * @returns {number}
 */
function getShippingFee(deliveryMethod) {
  const upper = String(deliveryMethod).toUpperCase();
  const fee = SHIPPING_FEES[upper];
  if (fee !== undefined) {
    return fee;
  }
  return DEFAULT_FEE;
}

module.exports = { calculateShipping, SHIPPING_FEES };
