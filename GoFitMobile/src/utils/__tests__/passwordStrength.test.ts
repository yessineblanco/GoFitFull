import {
  calculatePasswordStrength,
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
  PasswordStrength,
} from '../passwordStrength';

describe('password strength', () => {
  test('returns an empty weak result for an empty password', () => {
    expect(calculatePasswordStrength('')).toEqual({
      strength: 'weak',
      score: 0,
      feedback: [],
      percentage: 0,
    });
  });

  test('reports missing requirements for a weak password', () => {
    const result = calculatePasswordStrength('abc');

    expect(result.strength).toBe('weak');
    expect(result.score).toBe(15);
    expect(result.feedback).toEqual([
      'At least 6 characters',
      'Add uppercase letters',
      'Add numbers',
      'Add special characters (!@#$%...)',
    ]);
  });

  test('classifies passwords at the strong and very-strong thresholds', () => {
    expect(calculatePasswordStrength('Abcdef1!')).toMatchObject({
      strength: 'strong',
      score: 80,
      percentage: 85,
    });
    expect(calculatePasswordStrength('VeryLongPassword1!')).toMatchObject({
      strength: 'very-strong',
      score: 100,
      percentage: 100,
      feedback: ['Strong password!'],
    });
  });

  test.each<[PasswordStrength, string, string]>([
    ['weak', '#FF3B30', 'Weak'],
    ['medium', '#FF9500', 'Medium'],
    ['strong', '#34C759', 'Strong'],
    ['very-strong', '#30D158', 'Very Strong'],
  ])('maps %s to its display color and label', (strength, color, label) => {
    expect(getPasswordStrengthColor(strength)).toBe(color);
    expect(getPasswordStrengthLabel(strength)).toBe(label);
  });
});
