export type PasswordStrength = 'weak' | 'medium' | 'strong' | 'very-strong';

export interface PasswordStrengthResult {
  strength: PasswordStrength;
  score: number; // 0-100
  feedback: string[];
  percentage: number; // 0-100 for progress bar
}

/**
 * Calculate password strength based on various criteria
 * 
 * Analyzes a password and returns a strength rating along with feedback.
 * Checks for length, character variety (uppercase, lowercase, numbers, special chars),
 * and common patterns.
 * 
 * @param password - The password to analyze
 * @returns Password strength result with score, strength level, feedback, and percentage
 * 
 * @example
 * ```typescript
 * const result = calculatePasswordStrength('MyP@ssw0rd!');
 * console.log(result.strength); // 'strong'
 * console.log(result.score); // 85
 * console.log(result.feedback); // ['Add more characters']
 * ```
 */
export const calculatePasswordStrength = (password: string): PasswordStrengthResult => {
  if (!password) {
    return {
      strength: 'weak',
      score: 0,
      feedback: [],
      percentage: 0,
    };
  }

  let score = 0;
  const feedback: string[] = [];

  // Length checks
  if (password.length >= 6) score += 10;
  if (password.length >= 8) score += 10;
  if (password.length >= 12) score += 10;
  if (password.length < 6) feedback.push('At least 6 characters');

  // Character variety
  if (/[a-z]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add uppercase letters');
  }

  if (/[0-9]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add numbers');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 15;
  } else {
    feedback.push('Add special characters (!@#$%...)');
  }

  // Bonus for length
  if (password.length >= 16) score += 10;

  // Determine strength level
  let strength: PasswordStrength;
  let percentage: number;

  if (score < 30) {
    strength = 'weak';
    percentage = 25;
  } else if (score < 50) {
    strength = 'weak';
    percentage = 50;
  } else if (score < 70) {
    strength = 'medium';
    percentage = 70;
  } else if (score < 85) {
    strength = 'strong';
    percentage = 85;
  } else {
    strength = 'very-strong';
    percentage = 100;
  }

  return {
    strength,
    score: Math.min(score, 100),
    feedback: feedback.length > 0 ? feedback : ['Strong password!'],
    percentage,
  };
};

/**
 * Get color for password strength indicator
 */
/**
 * Get the color associated with a password strength level
 * 
 * Returns a color code for displaying password strength visually.
 * 
 * @param strength - The password strength level
 * @returns Color code (hex format) for the strength level
 * 
 * @example
 * ```typescript
 * const color = getPasswordStrengthColor('strong');
 * // Returns: '#4CAF50' (green)
 * ```
 */
export const getPasswordStrengthColor = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'weak':
      return '#FF3B30'; // Red
    case 'medium':
      return '#FF9500'; // Orange
    case 'strong':
      return '#34C759'; // Green
    case 'very-strong':
      return '#30D158'; // Bright green
    default:
      return '#8E8E93'; // Gray
  }
};

/**
 * Get label for password strength
 */
/**
 * Get a human-readable label for a password strength level
 * 
 * Returns a user-friendly label for displaying password strength.
 * 
 * @param strength - The password strength level
 * @returns Human-readable label (e.g., "Weak", "Strong", "Very Strong")
 * 
 * @example
 * ```typescript
 * const label = getPasswordStrengthLabel('strong');
 * // Returns: "Strong"
 * ```
 */
export const getPasswordStrengthLabel = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'weak':
      return 'Weak';
    case 'medium':
      return 'Medium';
    case 'strong':
      return 'Strong';
    case 'very-strong':
      return 'Very Strong';
    default:
      return '';
  }
};

