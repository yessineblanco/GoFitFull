/**
 * Secure logger utility that prevents sensitive data exposure in production
 * Only logs in development mode, sanitizes data in production
 */

const isDevelopment = __DEV__;

/**
 * Sanitize data to remove sensitive information
 */
const sanitize = (data: any): any => {
  if (typeof data === 'string') {
    // Remove potential email addresses
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let sanitized = data.replace(emailRegex, '[EMAIL_REDACTED]');
    
    // Remove potential tokens (JWT-like strings)
    const tokenRegex = /[A-Za-z0-9_-]{20,}/g;
    sanitized = sanitized.replace(tokenRegex, (match) => {
      // Keep short strings, redact long ones that might be tokens
      return match.length > 20 ? '[TOKEN_REDACTED]' : match;
    });
    
    return sanitized;
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = Array.isArray(data) ? [] : {};
    for (const [key, value] of Object.entries(data)) {
      // Skip sensitive keys
      if (['password', 'token', 'secret', 'key', 'auth', 'session'].some(s => 
        key.toLowerCase().includes(s)
      )) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitize(value);
      }
    }
    return sanitized;
  }
  
  return data;
};

/**
 * Secure logger utility for production-safe logging
 * 
 * Automatically sanitizes sensitive data in production and only logs
 * detailed information in development mode.
 */
export const logger = {
  /**
   * Log information (development only)
   * 
   * Logs information messages. Only active in development mode.
   * In production, these logs are suppressed to prevent sensitive data exposure.
   * 
   * @param args - Arguments to log (will be sanitized in production)
   * 
   * @example
   * ```typescript
   * logger.log('User logged in:', userId);
   * ```
   */
  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log errors with automatic sanitization
   * 
   * Logs error messages with automatic sanitization of sensitive data.
   * In development: logs full error details.
   * In production: logs sanitized error (emails, tokens removed).
   * 
   * @param message - Error message to log
   * @param error - Optional error object (will be sanitized in production)
   * 
   * @example
   * ```typescript
   * try {
   *   await apiCall();
   * } catch (error) {
   *   logger.error('API call failed', error);
   * }
   * ```
   */
  error: (message: string, error?: any): void => {
    if (isDevelopment) {
      console.error(message, error);
    } else {
      // In production, sanitize and send to crash reporting service
      const sanitizedError = error ? sanitize(error) : null;
      console.error(message, sanitizedError);
      
      // TODO: Integrate with crash reporting service (e.g., Sentry)
      // Sentry.captureException(error, { 
      //   extra: { message, sanitized: sanitizedError } 
      // });
    }
  },

  /**
   * Log warnings with conditional production logging
   * 
   * Logs warning messages. In development, all warnings are logged.
   * In production, only critical warnings (containing 'CRITICAL' or 'ERROR') are logged.
   * 
   * @param message - Warning message to log
   * @param args - Additional arguments (will be sanitized in production)
   * 
   * @example
   * ```typescript
   * logger.warn('Table not found, continuing without database');
   * logger.warn('CRITICAL: Database connection failed'); // Logged in production
   * ```
   */
  warn: (message: string, ...args: any[]): void => {
    if (isDevelopment) {
      console.warn(message, ...args);
    } else {
      // In production, only log critical warnings
      if (message.includes('CRITICAL') || message.includes('ERROR')) {
        console.warn(message, ...args.map(sanitize));
      }
    }
  },

  /**
   * Log debug information (development only)
   * 
   * Logs debug messages. Only active in development mode.
   * Use for detailed debugging information that shouldn't appear in production.
   * 
   * @param args - Arguments to log
   * 
   * @example
   * ```typescript
   * logger.debug('Form state:', formState);
   * logger.debug('API response:', response);
   * ```
   */
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Log informational messages (development only)
   * 
   * Logs informational messages. Only active in development mode.
   * Use for general information that helps with development but isn't needed in production.
   * 
   * @param args - Arguments to log
   * 
   * @example
   * ```typescript
   * logger.info('App initialized successfully');
   * logger.info('Session refreshed');
   * ```
   */
  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
};


