import React from 'react';
import { View, StyleSheet } from 'react-native';
import { getResponsiveSpacing, scaleWidth } from '@/utils/responsive';

interface OnboardingProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const STEP_WIDTH = scaleWidth(48);
const STEP_HEIGHT = scaleWidth(4);
const STEP_GAP = scaleWidth(10);

export const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({
  currentStep,
  totalSteps,
}) => {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: totalSteps }, (_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;

        return (
          <View
            key={index}
            style={[
              styles.progressBar,
              isCompleted && styles.completedBar,
              isCurrent && styles.currentBar,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: getResponsiveSpacing(16),
    gap: STEP_GAP,
  },
  progressBar: {
    width: STEP_WIDTH,
    height: STEP_HEIGHT,
    borderRadius: STEP_HEIGHT / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  completedBar: {
    backgroundColor: '#84c441',
  },
  currentBar: {
    backgroundColor: '#84c441',
    width: STEP_WIDTH * 1.3,
  },
});
