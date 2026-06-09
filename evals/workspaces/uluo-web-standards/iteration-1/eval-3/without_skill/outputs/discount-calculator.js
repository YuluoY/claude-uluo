'use strict';

const { Money } = require('./money');

/**
 * Discount rates keyed by membership level.
 * @type {Object<string, number>}
 */
const DISCOUNT_RATES = Object.freeze({
  REGULAR: 0,
  SILVER: 0.05,
  GOLD: 0.10,
  PLATINUM: 0.15
});

const DEFAULT_RATE = 0;

/**
 * Calculate the discount amount for a given subtotal and membership level.
 *
 * @param {Money} subtotal
 * @param {string} memberLevel
 * @returns {Money}
 */
function calculateDiscount(subtotal, memberLevel) {
  const rate = getDiscountRate(memberLevel);
  return subtotal.multiply(rate);
}

/**
 * Look up the discount rate for the given membership level.
 * @param {string} memberLevel
 * @returns {number}
 */
function getDiscountRate(memberLevel) {
  const upper = String(memberLevel).toUpperCase();
  const rate = DISCOUNT_RATES[upper];
  if (rate !== undefined) {
    return rate;
  }
  return DEFAULT_RATE;
}

module.exports = { calculateDiscount, DISCOUNT_RATES };
