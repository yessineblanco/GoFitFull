import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TextInput, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { OnboardingProgressBar, OnboardingNavigationButtons } from '@/components/onboarding';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import { userProfileService } from '@/services/userProfile';
import { authService } from '@/services/auth';
import type { OnboardingStackParamList } from '@/types';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<OnboardingStackParamList>;

export const OnboardingScreenNutrition: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { setHasCompletedOnboarding, getOnboardingData, clearOnboardingData } = useOnboardingStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  
  const [dietaryPreferences, setDietaryPreferences] = useState<string>('');
  const [foodAllergies, setFoodAllergies] = useState<string>('');
  const [foodDislikes, setFoodDislikes] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const handleFinish = useCallback(async () => {
    if (!user?.id || isLoading) return;

    setIsLoading(true);
    setError(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const onboardingData = getOnboardingData();

    try {
      try {
        await userProfileService.saveOnboardingData(user.id, {
          weight: onboardingData.weight || 0,
          weightUnit: onboardingData.weightUnit || 'kg',
          height: onboardingData.height || 0,
          heightUnit: onboardingData.heightUnit || 'cm',
          goal: onboardingData.goal || 'health',
          age: onboardingData.age,
          gender: onboardingData.gender,
          dietaryPreferences: dietaryPreferences ? dietaryPreferences.split(',').map(s => s.trim()).filter(Boolean) : [],
          foodAllergies: foodAllergies ? foodAllergies.split(',').map(s => s.trim()).filter(Boolean) : [],
          foodDislikes: foodDislikes ? foodDislikes.split(',').map(s => s.trim()).filter(Boolean) : [],
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
  }, [user?.id, dietaryPreferences, foodAllergies, foodDislikes, isLoading, getOnboardingData, setHasCompletedOnboarding, clearOnboardingData, t]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a0a', '#111111', '#1a1a1a']}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={[styles.content, { paddingTop: insets.top + getResponsiveSpacing(20), paddingBottom: insets.bottom + getResponsiveSpacing(20) }]}>
        
        <OnboardingProgressBar currentStep={5} totalSteps={5} />
        
        <Animated.View style={[styles.mainSection, { opacity: fadeAnim }]}>
          <Text style={styles.title}>Nutrition Profile</Text>
          <Text style={styles.subtitle}>Help us tailor recommendations by listing your preferences, allergies, and foods you don't like (comma separated).</Text>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Dietary Preferences</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Vegan, Keto, Paleo"
                placeholderTextColor="#666"
                value={dietaryPreferences}
                onChangeText={setDietaryPreferences}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Food Allergies</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Peanuts, Shellfish, Gluten"
                placeholderTextColor="#666"
                value={foodAllergies}
                onChangeText={setFoodAllergies}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Foods You Dislike</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mushrooms, Olives, Cilantro"
                placeholderTextColor="#666"
                value={foodDislikes}
                onChangeText={setFoodDislikes}
              />
            </View>
            
            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </ScrollView>
        </Animated.View>

        <OnboardingNavigationButtons
          onNext={handleFinish}
          onBack={handleBack}
          isNextDisabled={isLoading}
          isLoading={isLoading}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  content: { flex: 1, paddingHorizontal: getResponsiveSpacing(24) },
  mainSection: { flex: 1, marginTop: getResponsiveSpacing(32) },
  title: { fontSize: getResponsiveFontSize(32), fontWeight: '700', color: '#fff', marginBottom: getResponsiveSpacing(12) },
  subtitle: { fontSize: getResponsiveFontSize(16), color: '#a0a0a0', lineHeight: 24, marginBottom: getResponsiveSpacing(32) },
  formContainer: { flex: 1 },
  inputGroup: { marginBottom: getResponsiveSpacing(24) },
  label: { fontSize: getResponsiveFontSize(14), color: '#e5e5e5', marginBottom: getResponsiveSpacing(8), fontWeight: '600' },
  input: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: getResponsiveSpacing(16),
    paddingVertical: getResponsiveSpacing(16),
    fontSize: getResponsiveFontSize(16),
  },
  errorContainer: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: getResponsiveSpacing(16), borderRadius: 12, marginTop: getResponsiveSpacing(24) },
  errorText: { color: '#ef4444', fontSize: getResponsiveFontSize(14), textAlign: 'center' },
});
