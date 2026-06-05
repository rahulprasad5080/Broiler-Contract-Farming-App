/**
 * Shared formatting utilities for batch management components.
 * Centralises date, number, money, and label formatting to avoid duplication.
 */

/**
 * Formats a date string into a human-readable Indian locale date (e.g. "05 Jun 2026").
 * Returns "Not set" for falsy values and the raw string if parsing fails.
 */
export function formatDate(value?: string | null): string {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Formats a number with Indian locale grouping and an optional suffix (e.g. " kg").
 * Returns "0" (plus suffix) for null/undefined.
 */
export function formatNumber(value?: number | null, suffix = ''): string {
  if (value === undefined || value === null) return `0${suffix}`;
  return `${Number(value).toLocaleString('en-IN')}${suffix}`;
}

/**
 * Formats a number as an Indian Rupee money string (e.g. "Rs. 1,500").
 * Returns "Rs. 0" for null/undefined.
 */
export function formatMoney(value?: number | null): string {
  return `Rs. ${formatNumber(value)}`;
}

/**
 * Converts a SCREAMING_SNAKE_CASE or snake_case string into a human-readable label
 * (e.g. "PAYMENT_STATUS" → "Payment Status").
 * Returns "Not set" for falsy values.
 */
export function labelize(value?: string | null): string {
  if (!value) return 'Not set';
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Returns a display-safe string for any value, falling back to "Not set"
 * for null, undefined, or empty string.
 */
export function formatValue(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return 'Not set';
  return String(value);
}
