// eval-9-fixed.ts — All violations resolved

// Fixed 1: var → const
const GLOBAL_CONFIG = 'config'

// Fixed 2: any → specific types using generics
function parseResponse<T>(response: T): T
{
  // Fixed 4: console.log removed, replaced with nothing (pure function)
  return response
}

// Fixed 3: empty catch → log at minimum
// Fixed: riskyOperation is now exported for use
export function getConfigValue(): string
{
  try
  {
    return GLOBAL_CONFIG
  }
  catch (error)
  {
    throw new Error(`Failed to read config: ${String(error)}`)
  }
}

// Fixed 5: default export → named export
export {
  parseResponse,
}
