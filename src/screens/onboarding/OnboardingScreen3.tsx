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

export const OnboardingScreen3: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { setOnboardingData, getOnboardingData } = useOnboardingStore();
  const insets = useSafeAreaInsets();
  const [unit, setUnit] = useState<'cm' | 'inches'>('cm');
  const [height, setHeight] = useState(170);
  const [validationError, setValidationError] = useState<string | null>(null);
  const isNavigatingRef = useRef(false);

  // Animations
  const slideAnim = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

  const { minHeight, maxHeight } = useMemo(() => ({
    minHeight: unit === 'cm' ? 120 : 47,
    maxHeight: unit === 'cm' ? 220 : 87,
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
      if (savedData.height && savedData.heightUnit) {
        setHeight(savedData.height);
        setUnit(savedData.heightUnit);
      }
    }, [getOnboardingData])
  );

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: unit === 'inches' ? 0 : 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [unit]);

  const validateHeight = useCallback((value: number): boolean => {
    if (value < minHeight || value > maxHeight) {
      setValidationError(t('onboarding.screen3.heightRange', { min: minHeight, max: maxHeight, unit }));
      return false;
    }
    setValidationError(null);
    return true;
  }, [minHeight, maxHeight, unit, t]);

  const handleNext = useCallback(() => {
    if (isNavigatingRef.current) return;
    if (!validateHeight(height)) return;

    try {
      setOnboardingData({ height, heightUnit: unit });
      isNavigatingRef.current = true;
      navigation.navigate('OnboardingPersonalDetails');
      setTimeout(() => { isNavigatingRef.current = false; }, 400);
    } catch (error) {
      console.error('Error saving height data:', error);
      setValidationError(t('onboarding.screen3.failedToSave'));
    }
  }, [navigation, height, unit, validateHeight, setOnboardingData]);

  const handleBack = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    navigation.goBack();
    setTimeout(() => { isNavigatingRef.current = false; }, 400);
  }, [navigation]);

  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight);
    if (validationError) setValidationError(null);
  };

  const handleUnitChange = (newUnit: 'cm' | 'inches') => {
    const oldUnit = unit;
    setUnit(newUnit);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (newUnit === 'inches' && oldUnit === 'cm') {
      setHeight(Math.round(height / 2.54));
    } else if (newUnit === 'cm' && oldUnit === 'inches') {
      setHeight(Math.round(height * 2.54));
    }
  };

  const handleHeightAdjust = (delta: number) => {
    const newHeight = Math.max(minHeight, Math.min(maxHeight, height + delta));
    setHeight(newHeight);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const isNextDisabled = height < minHeight || height > maxHeight;

  const toggleTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, scaleWidth(100) + 2],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#030303', '#051a0a', '#030303']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Glow */}
      <View style={styles.glowOrb} />

      {/* Progress */}
      <View style={[styles.progressWrapper, { marginTop: insets.top + getResponsiveSpacing(20) }]}>
        <OnboardingProgressBar currentStep={3} totalSteps={4} />
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
        {/* Icon - Different from Screen 2 */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: iconScale }] }]}>
          <LinearGradient
            colors={['rgba(132, 196, 65, 0.2)', 'rgba(132, 196, 65, 0.05)']}
            style={styles.iconBackground}
          >
            <Ionicons name="resize-outline" size={40} color="#84C441" />
          </LinearGradient>
        </Animated.View>

        {/* Question */}
        <Text style={styles.question}>{t('onboarding.screen3.question')}</Text>

        {/* Unit Selector */}
        <View style={styles.unitSelector}>
          <Animated.View
            style={[
              styles.slidingBackground,
              { transform: [{ translateX: toggleTranslateX }] },
            ]}
          />
          <Pressable style={styles.unitButton} onPress={() => handleUnitChange('inches')}>
            <Text style={[styles.unitText, unit === 'inches' && styles.unitTextActive]}>in</Text>
          </Pressable>
          <Pressable style={styles.unitButton} onPress={() => handleUnitChange('cm')}>
            <Text style={[styles.unitText, unit === 'cm' && styles.unitTextActive]}>cm</Text>
          </Pressable>
        </View>

        {/* Height Scale */}
        <WeightScale
          min={minHeight}
          max={maxHeight}
          initialValue={height}
          unit={unit}
          onValueChange={handleHeightChange}
        />

        {/* Validation Error */}
        {validationError && <Text style={styles.errorText}>{validationError}</Text>}

        {/* Adjust Buttons */}
        <View style={styles.adjustButtons}>
          <Pressable style={styles.adjustButton} onPress={() => handleHeightAdjust(-1)}>
            <BlurView intensity={20} tint="light" style={styles.adjustButtonBlur}>
              <Ionicons name="remove" size={24} color="#FFFFFF" />
            </BlurView>
          </Pressable>
          <Pressable style={styles.adjustButton} onPress={() => handleHeightAdjust(1)}>
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
    width: scaleWidth(280),
    height: scaleWidth(280),
    borderRadius: scaleWidth(140),
    backgroundColor: 'rgba(132, 196, 65, 0.1)',
    top: scaleHeight(250),
    left: -scaleWidth(80),
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
