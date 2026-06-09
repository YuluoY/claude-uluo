/**
 * Immutable Money value object.
 *
 * Carries an amount and a currency. All arithmetic operations
 * return a new Money instance — the original is never mutated.
 */
export class Money
{
  #amount

  #currency

  /**
   * @param {number} amount - Monetary amount (decimal, e.g. 99.90).
   * @param {string} currency - ISO 4217 currency code (e.g. "CNY").
   */
  constructor(amount, currency)
  {
    if (amount == null)
    {
      throw new TypeError('Money: amount is required')
    }
    if (!currency)
    {
      throw new TypeError('Money: currency is required')
    }
    if (typeof amount !== 'number' || Number.isNaN(amount))
    {
      throw new TypeError('Money: amount must be a valid number')
    }
    this.#amount = amount
    this.#currency = currency
  }

  /**
   * Returns the monetary amount.
   * @returns {number}
   */
  getAmount()
  {
    return this.#amount
  }

  /**
   * Returns the ISO 4217 currency code.
   * @returns {string}
   */
  getCurrency()
  {
    return this.#currency
  }

  /**
   * Adds another Money of the same currency and returns a new Money.
   * @param {Money} other
   * @returns {Money}
   */
  add(other)
  {
    assertSameCurrency(this, other)
    return new Money(this.#amount + other.#amount, this.#currency)
  }

  /**
   * Subtracts another Money of the same currency and returns a new Money.
   * @param {Money} other
   * @returns {Money}
   */
  subtract(other)
  {
    assertSameCurrency(this, other)
    return new Money(this.#amount - other.#amount, this.#currency)
  }

  /**
   * Multiplies the amount by a factor and returns a new Money.
   * @param {number} factor
   * @returns {Money}
   */
  multiply(factor)
  {
    if (typeof factor !== 'number' || Number.isNaN(factor))
    {
      throw new TypeError('Money.multiply: factor must be a valid number')
    }
    const rounded = Math.round(this.#amount * factor * 100) / 100
    return new Money(rounded, this.#currency)
  }

  /**
   * Returns true when amount and currency match.
   * @param {Money} other
   * @returns {boolean}
   */
  equals(other)
  {
    if (!(other instanceof Money))
    {
      return false
    }
    return this.#amount === other.#amount && this.#currency === other.#currency
  }
}

/**
 * Throws if two Money objects have different currencies.
 * @param {Money} a
 * @param {Money} b
 */
function assertSameCurrency(a, b)
{
  if (a.getCurrency() !== b.getCurrency())
  {
    throw new Error(`Currency mismatch: ${a.getCurrency()} vs ${b.getCurrency()}`)
  }
}
