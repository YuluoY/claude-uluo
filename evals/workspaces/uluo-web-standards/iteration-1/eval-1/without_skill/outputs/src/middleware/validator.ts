import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';

/**
 * A simple validation rule definition.
 */
interface ValidationRule {
  field: string;
  type: 'string' | 'number';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  /** Source of the field value: body, query, or params. */
  source?: 'body' | 'query' | 'params';
}

/**
 * Validates that required fields are present and of the correct type.
 *
 * @param rules - Array of validation rules to apply.
 * @returns Express middleware function.
 */
export function validate(rules: ValidationRule[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const fieldErrors: Record<string, string> = {};

    for (const rule of rules) {
      const source = rule.source ?? 'body';
      const data: Record<string, unknown> =
        source === 'body'
          ? (req as any).body ?? {}
          : source === 'query'
            ? (req as any).query ?? {}
            : (req as any).params ?? {};

      const value = data[rule.field];

      // Required check.
      if (rule.required && (value === undefined || value === null || value === '')) {
        fieldErrors[rule.field] = `${rule.field} is required`;
        continue;
      }

      // Skip further checks if the value is not provided and not required.
      if (value === undefined || value === null || value === '') {
        continue;
      }

      // Type check.
      if (rule.type === 'number') {
        const num = Number(value);
        if (isNaN(num)) {
          fieldErrors[rule.field] = `${rule.field} must be a valid number`;
          continue;
        }
        // Coerce to number for downstream handlers.
        data[rule.field] = num;
      }

      // String length checks.
      if (rule.type === 'string' && typeof value === 'string') {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          fieldErrors[rule.field] =
            `${rule.field} must be at least ${rule.minLength} characters`;
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          fieldErrors[rule.field] =
            `${rule.field} must be at most ${rule.maxLength} characters`;
        }
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      throw new ValidationError('Request validation failed', fieldErrors);
    }

    next();
  };
}
