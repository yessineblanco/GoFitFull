/**
 * Form validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, error: "Email is required" };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }
  
  return { isValid: true };
}

/**
 * Validate required field
 */
export function validateRequired(value: string | null | undefined, fieldName: string): ValidationResult {
  if (!value || value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
}

/**
 * Validate minimum length
 */
export function validateMinLength(value: string, minLength: number, fieldName: string): ValidationResult {
  if (value.length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  return { isValid: true };
}

/**
 * Validate maximum length
 */
export function validateMaxLength(value: string, maxLength: number, fieldName: string): ValidationResult {
  if (value.length > maxLength) {
    return { isValid: false, error: `${fieldName} must be no more than ${maxLength} characters` };
  }
  return { isValid: true };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string | null | undefined, fieldName: string): ValidationResult {
  if (!url) {
    return { isValid: true }; // URL is optional
  }
  
  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: `${fieldName} must be a valid URL` };
  }
}

/**
 * Validate number range
 */
export function validateNumberRange(
  value: number | null | undefined,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  if (value === null || value === undefined) {
    return { isValid: true }; // Optional field
  }
  
  if (value < min || value > max) {
    return { isValid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }
  
  return { isValid: true };
}

/**
 * Validate exercise name
 */
export function validateExerciseName(name: string): ValidationResult {
  const required = validateRequired(name, "Exercise name");
  if (!required.isValid) return required;
  
  const minLength = validateMinLength(name, 2, "Exercise name");
  if (!minLength.isValid) return minLength;
  
  const maxLength = validateMaxLength(name, 100, "Exercise name");
  if (!maxLength.isValid) return maxLength;
  
  return { isValid: true };
}

/**
 * Validate workout name
 */
export function validateWorkoutName(name: string): ValidationResult {
  const required = validateRequired(name, "Workout name");
  if (!required.isValid) return required;
  
  const minLength = validateMinLength(name, 2, "Workout name");
  if (!minLength.isValid) return minLength;
  
  const maxLength = validateMaxLength(name, 100, "Workout name");
  if (!maxLength.isValid) return maxLength;
  
  return { isValid: true };
}

/**
 * Validate sets/reps
 */
export function validateSetsReps(value: number | null | undefined, fieldName: string): ValidationResult {
  if (value === null || value === undefined) {
    return { isValid: true }; // Optional
  }
  
  return validateNumberRange(value, 1, 1000, fieldName);
}

/**
 * Validate rest time (in seconds)
 */
export function validateRestTime(value: number | null | undefined): ValidationResult {
  if (value === null || value === undefined) {
    return { isValid: true }; // Optional
  }
  
  return validateNumberRange(value, 0, 600, "Rest time");
}
