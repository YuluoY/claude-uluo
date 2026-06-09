import { MEMBERSHIP_LEVELS } from './MembershipLevel.js'

/**
 * Discount rates keyed by membership level.
 * Rate 1.00 = no discount, 0.85 = 15% off.
 * Defined at module scope per LICM — computed once, not per call.
 */
const DISCOUNT_RATE_MAP = Object.freeze({
  [MEMBERSHIP_LEVELS.NORMAL]: 1.00,
  [MEMBERSHIP_LEVELS.SILVER]: 0.95,
  [MEMBERSHIP_LEVELS.GOLD]: 0.90,
  [MEMBERSHIP_LEVELS.PLATINUM]: 0.85,
})

/**
 * Calculates the discounted price based on membership level.
 *
 * This is a pure business function: given a subtotal and a membership level
 * it returns the discounted amount without mutating any state.
 *
 * @param {import('./Money.js').Money} subtotal - The order subtotal before discount.
 * @param {string} membershipLevel - One of MEMBERSHIP_LEVELS values.
 * @returns {import('./Money.js').Money} Discounted amount (may equal subtotal for NORMAL).
 */
export function calculateDiscount(subtotal, membershipLevel)
{
  if (!subtotal)
  {
    throw new TypeError('calculateDiscount: subtotal is required')
  }
  if (!membershipLevel)
  {
    throw new TypeError('calculateDiscount: membershipLevel is required')
  }

  const rate = DISCOUNT_RATE_MAP[membershipLevel]
  if (rate == null)
  {
    throw new Error(`Unknown membership level: ${membershipLevel}`)
  }

  return subtotal.multiply(rate)
}
