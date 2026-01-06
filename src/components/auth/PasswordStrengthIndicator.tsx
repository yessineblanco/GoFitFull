import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getPasswordStrengthColor, getPasswordStrengthLabel, calculatePasswordStrength } from '@/utils/passwordStrength';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { theme } from '@/theme';

interface PasswordStrengthIndicatorProps {
  password: string;
  showFeedback?: boolean;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showFeedback = true,
}) => {
  const { strength, percentage, feedback } = calculatePasswordStrength(password);

  if (!password) {
    return null;
  }

  const color = getPasswordStrengthColor(strength);
  const label = getPasswordStrengthLabel(strength);

  return (
    <View style={styles.container}>
      {/* Strength Bar */}
      <View style={styles.barContainer}>
        <View style={[styles.barBackground, { width: '100%' }]}>
          <View style={[styles.barFill, { width: `${percentage}%`, backgroundColor: color }]} />
        </View>
      </View>

      {/* Strength Label and Feedback */}
      <View style={styles.feedbackContainer}>
        <Text style={[styles.strengthLabel, { color }]}>{label}</Text>
        {showFeedback && feedback.length > 0 && (
          <View style={styles.feedbackList}>
            {feedback.map((item, index) => (
              <Text key={index} style={styles.feedbackText}>
                • {item}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  barContainer: {
    marginBottom: theme.spacing.xs,
  },
  barBackground: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  feedbackContainer: {
    marginTop: theme.spacing.xs,
  },
  strengthLabel: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600' as const,
    marginBottom: theme.spacing.xs,
  },
  feedbackList: {
    marginTop: theme.spacing.xs,
  },
  feedbackText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(11),
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: getResponsiveFontSize(16),
    marginBottom: 2,
  },
});

