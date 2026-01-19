import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  WeightScale,
  OnboardingProgressBar,
  OnboardingNavigationButtons,
} from '@/components/onboarding';
import { useOnboardingStore } from '@/store/onboardingStore';
import type { OnboardingStackParamList } from '@/types';
import { getResponsiveFontSize, getResponsiveSpacing, scaleWidth, scaleHeight } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<OnboardingStackParamList>;

export const OnboardingScreen2: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { setOnboardingData, getOnboardingData } = useOnboardingStore();
  const insets = useSafeAreaInsets();
  const [unit, setUnit] = useState<'kg' | 'lb'>('kg');
  const [weight, setWeight] = useState(70);
  const [validationError, setValidationError] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

  const { minWeight, maxWeight } = useMemo(() => ({
    minWeight: unit === 'kg' ? 30 : 66,
    maxWeight: unit === 'kg' ? 150 : 330,
  }), [unit]);

  // Entrance animation
  useEffect(() => {
    Animated.stagger(100, [
      Animated.spring(iconScale, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(contentTranslateY, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const savedData = getOnboardingData();
      if (savedData.weight && savedData.weightUnit) {
        setWeight(savedData.weight);
        setUnit(savedData.weightUnit);
      }
    }, [getOnboardingData])
  );

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: unit === 'lb' ? 0 : 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [unit]);

  const validateWeight = useCallback((value: number): boolean => {
    if (value < minWeight || value > maxWeight) {
      setValidationError(t('onboarding.screen2.weightRange', { min: minWeight, max: maxWeight, unit }));
      return false;
    }
    setValidationError(null);
    return true;
  }, [minWeight, maxWeight, unit, t]);

  const handleNext = useCallback(() => {
    if (isNavigatingRef.current) return;
    if (!validateWeight(weight)) return;

    try {
      setOnboardingData({ weight, weightUnit: unit });
      isNavigatingRef.current = true;
      navigation.navigate('Onboarding3');
      setTimeout(() => { isNavigatingRef.current = false; }, 400);
    } catch (error) {
      console.error('Error saving weight data:', error);
      setValidationError(t('onboarding.screen2.failedToSave'));
    }
  }, [navigation, weight, unit, validateWeight, setOnboardingData]);

  const handleBack = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    navigation.goBack();
    setTimeout(() => { isNavigatingRef.current = false; }, 400);
  }, [navigation]);

  const handleWeightChange = (newWeight: number) => {
    setWeight(newWeight);
    if (validationError) setValidationError(null);
  };

  const handleUnitChange = (newUnit: 'kg' | 'lb') => {
    const oldUnit = unit;
    setUnit(newUnit);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (newUnit === 'lb' && oldUnit === 'kg') {
      setWeight(Math.round(weight * 2.20462));
    } else if (newUnit === 'kg' && oldUnit === 'lb') {
      setWeight(Math.round(weight / 2.20462));
    }
  };

  const handleWeightAdjust = (delta: number) => {
    const newWeight = Math.max(minWeight, Math.min(maxWeight, weight + delta));
    setWeight(newWeight);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isNextDisabled = weight < minWeight || weight > maxWeight;

  const toggleTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, scaleWidth(100) + 2],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#030303', '#0a1a05', '#030303']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Glow */}
      <View style={styles.glowOrb} />

      {/* Progress */}
      <View style={[styles.progressWrapper, { marginTop: insets.top + getResponsiveSpacing(20) }]}>
        <OnboardingProgressBar currentStep={2} totalSteps={4} />
      </View>

      {/* Content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslateY }],
          },
        ]}
      >
        {/* Icon */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}>
          <LinearGradient
            colors={['rgba(132, 196, 65, 0.2)', 'rgba(132, 196, 65, 0.05)']}
            style={styles.iconBackground}
          >
            <Ionicons name="scale-outline" size={40} color="#84C441" />
          </LinearGradient>
        </Animated.View>

        {/* Question */}
        <Text style={styles.question}>{t('onboarding.screen2.question')}</Text>

        {/* Unit Selector */}
        <View style={styles.unitSelector}>
          <Animated.View
            style={[
              styles.slidingBackground,
              { transform: [{ translateX: toggleTranslateX }] },
            ]}
          />
          <Pressable style={styles.unitButton} onPress={() => handleUnitChange('lb')}>
            <Text style={[styles.unitText, unit === 'lb' && styles.unitTextActive]}>lb</Text>
          </Pressable>
          <Pressable style={styles.unitButton} onPress={() => handleUnitChange('kg')}>
            <Text style={[styles.unitText, unit === 'kg' && styles.unitTextActive]}>kg</Text>
          </Pressable>
        </View>

        {/* Weight Scale */}
        <WeightScale
          min={minWeight}
          max={maxWeight}
          initialValue={weight}
          unit={unit}
          onValueChange={handleWeightChange}
        />

        {/* Validation Error */}
        {validationError && <Text style={styles.errorText}>{validationError}</Text>}

        {/* Adjust Buttons */}
        <View style={styles.adjustButtons}>
          <Pressable style={styles.adjustButton} onPress={() => handleWeightAdjust(-1)}>
            <BlurView intensity={20} tint="light" style={styles.adjustButtonBlur}>
              <Ionicons name="remove" size={24} color="#FFFFFF" />
            </BlurView>
          </Pressable>
          <Pressable style={styles.adjustButton} onPress={() => handleWeightAdjust(1)}>
            <BlurView intensity={20} tint="light" style={styles.adjustButtonBlur}>
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </BlurView>
          </Pressable>
        </View>
      </Animated.View>

      {/* Navigation */}
      <View style={[styles.navigationWrapper, { paddingBottom: insets.bottom + getResponsiveSpacing(20) }]}>
        <OnboardingNavigationButtons
          onBack={handleBack}
          onNext={handleNext}
          nextButtonText={t('common.next')}
          isNextDisabled={isNextDisabled}
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
  glowOrb: {
    position: 'absolute',
    width: scaleWidth(300),
    height: scaleWidth(300),
    borderRadius: scaleWidth(150),
    backgroundColor: 'rgba(132, 196, 65, 0.1)',
    top: scaleHeight(200),
    right: -scaleWidth(100),
  },
  progressWrapper: {
    paddingHorizontal: getResponsiveSpacing(24),
  },
  content: {
    flex: 1,
    paddingHorizontal: getResponsiveSpacing(24),
    alignItems: 'center',
    paddingTop: getResponsiveSpacing(24),
  },
  iconContainer: {
    marginBottom: getResponsiveSpacing(20),
  },
  iconBackground: {
    width: scaleWidth(80),
    height: scaleWidth(80),
    borderRadius: scaleWidth(24),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(132, 196, 65, 0.2)',
  },
  question: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(24),
    fontWeight: '600',
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: getResponsiveSpacing(24),
  },
  unitSelector: {
    width: scaleWidth(200),
    height: scaleHeight(48),
    flexDirection: 'row',
    borderRadius: scaleWidth(24),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    position: 'relative',
    marginBottom: getResponsiveSpacing(24),
  },
  slidingBackground: {
    position: 'absolute',
    width: scaleWidth(96),
    height: scaleHeight(44),
    backgroundColor: '#84C441',
    borderRadius: scaleWidth(22),
    top: 2,
  },
  unitButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  unitText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(16),
    color: 'rgba(255, 255, 255, 0.5)',
  },
  unitTextActive: {
    color: '#FFFFFF',
  },
  adjustButtons: {
    flexDirection: 'row',
    gap: getResponsiveSpacing(16),
    marginTop: getResponsiveSpacing(16),
  },
  adjustButton: {
    width: scaleWidth(56),
    height: scaleWidth(56),
    borderRadius: scaleWidth(18),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  adjustButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  errorText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(14),
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: getResponsiveSpacing(8),
  },
  navigationWrapper: {
    paddingHorizontal: getResponsiveSpacing(20),
  },
});
