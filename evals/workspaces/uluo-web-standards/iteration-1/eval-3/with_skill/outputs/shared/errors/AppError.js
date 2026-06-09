/**
 * Base application error with HTTP status code.
 * All domain/application errors extend this to carry a status.
 */
export class AppError extends Error
{
  /**
   * @param {string} message - Human-readable error message.
   * @param {number} statusCode - HTTP status code (default 500).
   * @param {object} [details] - Optional error context.
   */
  constructor(message, statusCode = 500, details)
  {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details ?? null
  }
}
