import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getResponsiveFontSize, getResponsiveSpacing, scaleWidth, scaleHeight, ensureMinTouchTarget } from '@/utils/responsive';
import { theme } from '@/theme';

interface OnboardingNavigationButtonsProps {
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextButtonText?: string;
  showBack?: boolean;
  showSkip?: boolean;
  isLoading?: boolean;
  isNextDisabled?: boolean;
}

export const OnboardingNavigationButtons: React.FC<OnboardingNavigationButtonsProps> = ({
  onBack,
  onNext,
  onSkip,
  nextButtonText = 'Next',
  showBack = true,
  showSkip = false,
  isLoading = false,
  isNextDisabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const backScaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const handleBackPressIn = () => {
    Animated.spring(backScaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const handleBackPressOut = () => {
    Animated.spring(backScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  return (
    <View style={styles.container}>
      {/* Back Button */}
      {showBack && onBack ? (
        <Animated.View style={{ transform: [{ scale: backScaleAnim }] }}>
          <Pressable
            style={styles.backButton}
            onPress={onBack}
            onPressIn={handleBackPressIn}
            onPressOut={handleBackPressOut}
            disabled={isLoading}
          >
            <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      ) : showSkip && onSkip ? (
        <Pressable style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      ) : (
        <View style={styles.placeholder} />
      )}

      {/* Next Button */}
      <Animated.View style={[styles.nextButtonWrapper, { transform: [{ scale: scaleAnim }] }]}>
        <Pressable
          style={[
            styles.nextButton,
            (isLoading || isNextDisabled) && styles.buttonDisabled,
          ]}
          onPress={onNext}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isLoading || isNextDisabled}
        >
          {isLoading ? (
            <ActivityIndicator color="#030303" size="small" />
          ) : (
            <Text style={styles.nextButtonText}>{nextButtonText}</Text>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveSpacing(4),
    gap: getResponsiveSpacing(12),
  },
  backButton: {
    width: scaleWidth(56),
    height: scaleWidth(56),
    borderRadius: scaleWidth(28),
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    paddingHorizontal: getResponsiveSpacing(16),
    paddingVertical: getResponsiveSpacing(12),
  },
  skipText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(15),
    color: 'rgba(255, 255, 255, 0.6)',
  },
  placeholder: {
    width: scaleWidth(56),
  },
  nextButtonWrapper: {
    flex: 1,
  },
  nextButton: {
    backgroundColor: '#84c441',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ensureMinTouchTarget(56),
    shadowColor: '#84c441',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  nextButtonText: {
    fontSize: getResponsiveFontSize(17),
    fontWeight: '600',
    letterSpacing: 0.5,
    fontFamily: 'Barlow_600SemiBold',
    color: '#030303',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
