// eval-9-violation.ts — Deliberate violations for validate-rules.js test

// Violation 1: var declaration (eslint no-var)
var GLOBAL_CONFIG = 'config'

// Violation 2: any type (eslint @typescript-eslint/no-explicit-any)
function parseResponse(response: any): any
{
  // Violation 4: console.log (eslint no-console)
  console.log('Parsing response...')

  return response
}

// Violation 3: empty catch block (eslint no-empty)
function riskyOperation(): string
{
  try
  {
    return GLOBAL_CONFIG
  }
  catch (e)
  {
  }
  return ''
}

// Violation 5: default export (eslint import/no-default-export)
export default parseResponse
