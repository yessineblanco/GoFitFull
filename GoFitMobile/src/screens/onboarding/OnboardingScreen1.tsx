import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  StatusBar,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingProgressBar } from '@/components/onboarding';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';
import type { OnboardingStackParamList } from '@/types';
import { useTranslation } from 'react-i18next';
const { width, height } = Dimensions.get('window');

type NavigationProp = StackNavigationProp<OnboardingStackParamList>;

const PRIMARY_GREEN = '#B4F04E';
const BACKGROUND_DARK = '#030303';

export const OnboardingScreen1: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const { setHasCompletedOnboarding } = useOnboardingStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const isNavigatingRef = useRef(false);

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    navigation.navigate('Onboarding2');
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 500);
  };

  const handleSkip = async () => {
    if (isNavigatingRef.current || !user?.id) return;
    isNavigatingRef.current = true;
    await setHasCompletedOnboarding(user.id, true);
  };

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground
        source={require('../../../assets/onboarding-hero.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* DARK GRADIENT OVERLAY - Makes bottom much darker for text readability */}
        <LinearGradient
          colors={['rgba(10,10,10,0)', 'rgba(10,10,10,0.85)', 'rgba(10,10,10,0.98)']}
          locations={[0, 0.6, 0.9]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Safe Area Content */}
        <View style={[styles.safeArea, { paddingTop: insets.top + 20 }]}>
          {/* Progress Dots - Using shared component */}
          <View style={styles.progressWrapper}>
            <OnboardingProgressBar currentStep={1} totalSteps={4} />
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Content Container */}
          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Subtitle */}
            <Text style={styles.subtitle}>Start your</Text>

            {/* Title - NO GREEN LINE */}
            <Text style={styles.title}>FITNESS JOURNEY</Text>

            {/* Description */}
            <Text style={styles.description}>
              {t('onboarding.screen1.subtitle')}
            </Text>
          </Animated.View>

          {/* Button Container */}
          <View style={[styles.buttonContainer, { marginBottom: insets.bottom + 70 }]}>
            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipButton}
              activeOpacity={0.6}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                onPress={handleGetStarted}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.primaryButton}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  {t('onboarding.screen1.getStarted')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_DARK,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  progressWrapper: {
    paddingHorizontal: 24,
  },
  spacer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 30,
    paddingBottom: 0,
    marginBottom: 50,
  },
  subtitle: {
    fontSize: 20,
    color: '#D5D5D5', // Improved from #B8B8B8 for better contrast
    fontWeight: '600',
    fontFamily: 'Barlow_600SemiBold',
    marginBottom: 8,
  },
  title: {
    fontSize: 40,
    color: '#FFFFFF',
    fontFamily: 'Barlow_800ExtraBold',
    letterSpacing: 2,
    lineHeight: 46,
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#E0E0E0', // Improved from #CCCCCC for better contrast
    lineHeight: 26,
    opacity: 0.9,
    fontFamily: 'Barlow_400Regular',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 18,
    color: '#E0E0E0',
    fontWeight: '600',
    fontFamily: 'Barlow_600SemiBold',
  },
  primaryButton: {
    backgroundColor: PRIMARY_GREEN,
    paddingVertical: 20,
    paddingHorizontal: 48,
    borderRadius: 35,
    // GLOW EFFECT
    shadowColor: PRIMARY_GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  primaryButtonText: {
    fontSize: 19,
    color: '#000000',
    textAlign: 'center',
    fontFamily: 'Barlow_600SemiBold',
  },
});
