/**
 * Unwraps a promise into an [error, data] tuple.
 * Always resolves — the caller checks error first, data second.
 *
 * @param {Promise} promise - The promise to unwrap.
 * @returns {Promise<[Error|null, any]>} Tuple of [error, data].
 */
export async function to(promise)
{
  try
  {
    const data = await promise
    return [null, data]
  }
  catch (error)
  {
    return [error, null]
  }
}
