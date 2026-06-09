'use strict';

/**
 * Immutable Money value object.
 * All arithmetic returns a new Money instance. The instance is frozen on creation.
 *
 * @class Money
 */
class Money {
  /**
   * @param {number} amount
   * @param {string} currency - ISO 4217 currency code, e.g. "USD", "CNY"
   */
  constructor(amount, currency) {
    if (typeof amount !== 'number' || Number.isNaN(amount)) {
      throw new TypeError('Money amount must be a valid number');
    }
    if (typeof currency !== 'string' || currency.trim().length === 0) {
      throw new TypeError('Money currency must be a non-empty string');
    }
    this._amount = amount;
    this._currency = currency.trim().toUpperCase();
    Object.freeze(this);
  }

  get amount() {
    return this._amount;
  }

  get currency() {
    return this._currency;
  }

  /**
   * Add another Money of the same currency.
   * @param {Money} other
   * @returns {Money}
   */
  add(other) {
    assertSameCurrency(this, other);
    return new Money(this._amount + other._amount, this._currency);
  }

  /**
   * Subtract another Money of the same currency.
   * @param {Money} other
   * @returns {Money}
   */
  subtract(other) {
    assertSameCurrency(this, other);
    return new Money(this._amount - other._amount, this._currency);
  }

  /**
   * Multiply the amount by a scalar factor.
   * @param {number} factor
   * @returns {Money}
   */
  multiply(factor) {
    return new Money(this._amount * factor, this._currency);
  }

  /**
   * Check equality with another Money.
   * @param {Money} other
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof Money)) {
      return false;
    }
    return this._amount === other._amount && this._currency === other._currency;
  }

  /**
   * Is this amount zero?
   * @returns {boolean}
   */
  isZero() {
    return this._amount === 0;
  }

  /**
   * Return a formatted string representation.
   * @returns {string}
   */
  toString() {
    return `${this._currency} ${this._amount.toFixed(2)}`;
  }

  /**
   * Serialise to a plain object for JSON output.
   * @returns {{amount: number, currency: string}}
   */
  toJSON() {
    return { amount: this._amount, currency: this._currency };
  }
}

/**
 * Throw if two Money instances do not share the same currency.
 * @param {Money} a
 * @param {Money} b
 */
function assertSameCurrency(a, b) {
  if (a._currency !== b._currency) {
    throw new Error(
      `Currency mismatch: ${a._currency} vs ${b._currency}`
    );
  }
}

/**
 * Factory – create a zero-amount Money in the given currency.
 * @param {string} currency
 * @returns {Money}
 */
function zero(currency) {
  return new Money(0, currency);
}

module.exports = { Money, zero };
