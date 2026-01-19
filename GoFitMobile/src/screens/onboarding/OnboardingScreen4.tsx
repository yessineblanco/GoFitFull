import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  OnboardingProgressBar,
  OnboardingNavigationButtons,
} from '@/components/onboarding';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { userProfileService } from '@/services/userProfile';
import { authService } from '@/services/auth';
import type { OnboardingStackParamList } from '@/types';
import { getResponsiveFontSize, getResponsiveSpacing, scaleWidth, scaleHeight } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<OnboardingStackParamList>;

type GoalOption = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const GOAL_OPTIONS: GoalOption[] = [
  { id: 'strength', icon: 'barbell-outline' },
  { id: 'hiit', icon: 'flash-outline' },
  { id: 'cardio', icon: 'heart-outline' },
  { id: 'functional', icon: 'body-outline' },
];

export const OnboardingScreen4: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { setHasCompletedOnboarding, getOnboardingData, clearOnboardingData } = useOnboardingStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [selectedGoal, setSelectedGoal] = useState<string>('strength');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleNext = useCallback(async () => {
    if (!user?.id || isLoading) return;

    const onboardingData = getOnboardingData();
    if (!onboardingData.weight || !onboardingData.height || !selectedGoal) {
      setError(t('onboarding.screen4.completeAllSteps'));
      return;
    }

    setIsLoading(true);
    setError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      try {
        await userProfileService.saveOnboardingData(user.id, {
          weight: onboardingData.weight,
          weightUnit: onboardingData.weightUnit || 'kg',
          height: onboardingData.height,
          heightUnit: onboardingData.heightUnit || 'cm',
          goal: selectedGoal,
          age: onboardingData.age,
          gender: onboardingData.gender,
        });

        if (onboardingData.displayName) {
          await authService.updateUserMetadata({ display_name: onboardingData.displayName });
        }
      } catch (dbError: any) {
        console.warn('Could not save to database:', dbError.message);
      }

      await setHasCompletedOnboarding(user.id, true);
      clearOnboardingData();
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      setError(error.message || t('onboarding.screen4.failedToComplete'));
      setIsLoading(false);
    }
  }, [user?.id, selectedGoal, isLoading, getOnboardingData, setHasCompletedOnboarding, clearOnboardingData]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoal(goalId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const getGoalLabel = (goalId: string) => {
    const labels: Record<string, string> = {
      strength: t('goals.strength'),
      hiit: t('goals.hiit'),
      cardio: t('goals.cardio'),
      functional: t('goals.functional'),
    };
    return labels[goalId] || goalId;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#030303', '#0d1a08', '#030303']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Progress */}
      <View style={[styles.progressWrapper, { paddingTop: insets.top + getResponsiveSpacing(16) }]}>
        <OnboardingProgressBar currentStep={4} totalSteps={4} />
      </View>

      {/* Content */}
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Title */}
        <Text style={styles.title}>{t('onboarding.screen4.title')}</Text>
        <Text style={styles.subtitle}>{t('onboarding.screen4.subtitle')}</Text>

        {/* Error */}
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Goal Options */}
        <View style={styles.optionsContainer}>
          {GOAL_OPTIONS.map((option) => {
            const isSelected = selectedGoal === option.id;
            return (
              <Pressable
                key={option.id}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => handleGoalSelect(option.id)}
              >
                <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                  <Ionicons name={option.icon} size={24} color={isSelected ? '#030303' : '#84c441'} />
                </View>
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {getGoalLabel(option.id)}
                </Text>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark" size={16} color="#030303" />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {/* Navigation */}
      <View style={[styles.navigationWrapper, { paddingBottom: insets.bottom + getResponsiveSpacing(24) }]}>
        <OnboardingNavigationButtons
          onBack={handleBack}
          onNext={handleNext}
          nextButtonText={t('onboarding.screen4.startNow')}
          isLoading={isLoading}
          isNextDisabled={!selectedGoal || isLoading}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030303',
  },
  progressWrapper: {
    paddingHorizontal: getResponsiveSpacing(24),
  },
  content: {
    flex: 1,
    paddingHorizontal: getResponsiveSpacing(24),
    paddingTop: getResponsiveSpacing(24),
  },
  title: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(22),
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: getResponsiveSpacing(8),
  },
  subtitle: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: getResponsiveSpacing(24),
  },
  errorText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(13),
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: getResponsiveSpacing(12),
  },
  optionsContainer: {
    flex: 1,
    gap: getResponsiveSpacing(12),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: scaleWidth(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: getResponsiveSpacing(16),
    paddingHorizontal: getResponsiveSpacing(16),
  },
  optionCardSelected: {
    borderColor: '#84c441',
    borderWidth: 2,
    backgroundColor: 'rgba(132, 196, 65, 0.1)',
  },
  iconContainer: {
    width: scaleWidth(44),
    height: scaleWidth(44),
    borderRadius: scaleWidth(12),
    backgroundColor: 'rgba(132, 196, 65, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveSpacing(14),
  },
  iconContainerSelected: {
    backgroundColor: '#84c441',
  },
  optionText: {
    flex: 1,
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255, 255, 255, 0.8)',
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontFamily: 'Barlow_600SemiBold',
  },
  checkmark: {
    width: scaleWidth(24),
    height: scaleWidth(24),
    borderRadius: scaleWidth(12),
    backgroundColor: '#84c441',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigationWrapper: {
    paddingHorizontal: getResponsiveSpacing(20),
  },
});
