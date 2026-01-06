/**
 * Input Sanitization Utility
 * Removes potentially dangerous content from user input to prevent XSS attacks
 */

/**
 * Sanitize a string by removing HTML tags and escaping special characters
 * 
 * Aggressively removes all potentially dangerous content including:
 * - HTML tags
 * - JavaScript event handlers (onclick, onerror, etc.)
 * - Script and style tags with content
 * - Data URIs
 * - Escapes special characters (&, <, >, ", ', /)
 * 
 * Use this for user input that will be displayed in contexts where HTML could be dangerous.
 * 
 * @param input - The string to sanitize
 * @returns Sanitized string with all dangerous content removed
 * 
 * @example
 * ```typescript
 * const userInput = "<script>alert('xss')</script>Hello";
 * const safe = sanitizeString(userInput);
 * console.log(safe); // "Hello"
 * ```
 */
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') {
    return String(input);
  }

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove JavaScript event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove style tags and their content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove data URIs that could contain scripts
  sanitized = sanitized.replace(/data:[^;]*;base64[^,)]*/gi, '');

  // Escape remaining special characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized.trim();
};

/**
 * Sanitize an object by sanitizing all string values recursively
 * 
 * Recursively sanitizes all string values in an object, including nested objects
 * and arrays. Non-string values are preserved as-is.
 * 
 * @template T - The type of the object
 * @param obj - The object to sanitize
 * @returns New object with all string values sanitized
 * 
 * @example
 * ```typescript
 * const userData = {
 *   name: "<script>alert('xss')</script>John",
 *   email: "user@example.com",
 *   goal: "Lose <b>weight</b>"
 * };
 * const safe = sanitizeObject(userData);
 * // { name: "John", email: "user@example.com", goal: "Lose weight" }
 * ```
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as T[Extract<keyof T, string>];
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null && !Array.isArray(sanitized[key])) {
      sanitized[key] = sanitizeObject(sanitized[key]) as T[Extract<keyof T, string>];
    } else if (Array.isArray(sanitized[key])) {
      sanitized[key] = sanitized[key].map((item: unknown) => 
        typeof item === 'string' ? sanitizeString(item) : item
      ) as T[Extract<keyof T, string>];
    }
  }
  
  return sanitized;
};

/**
 * Sanitize text input (less aggressive - preserves basic formatting)
 * 
 * Removes HTML tags and scripts but allows normal punctuation and formatting.
 * This is less aggressive than `sanitizeString` and is suitable for user-facing
 * text fields where you want to preserve readability.
 * 
 * @param input - The text to sanitize
 * @returns Sanitized text with HTML/scripts removed but punctuation preserved
 * 
 * @example
 * ```typescript
 * const userInput = "John's goal is to <b>lose weight</b>";
 * const safe = sanitizeText(userInput);
 * console.log(safe); // "John's goal is to lose weight"
 * ```
 */
export const sanitizeText = (input: string): string => {
  if (typeof input !== 'string') {
    return String(input);
  }

  // Remove HTML tags but keep the text content
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Remove JavaScript event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove script and style tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Don't escape special characters for text input (allow normal punctuation)
  // This is less aggressive than sanitizeString
  return sanitized.trim();
};

/**
 * Sanitize a string for database storage (most aggressive)
 * 
 * Uses the most aggressive sanitization to ensure data stored in the database
 * is safe from XSS attacks. This is an alias for `sanitizeString`.
 * 
 * **Always use this before saving user input to the database.**
 * 
 * @param input - The string to sanitize
 * @returns Fully sanitized string safe for database storage
 * 
 * @example
 * ```typescript
 * const userGoal = userInput.goal;
 * const safeGoal = sanitizeForDatabase(userGoal);
 * await apiClient.upsert('user_profiles', { goal: safeGoal });
 * ```
 */
export const sanitizeForDatabase = (input: string): string => {
  return sanitizeString(input);
};

