import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ImageBackground, StatusBar, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Logo } from '@/components/shared';
import { theme } from '@/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp, StackScreenProps } from '@react-navigation/stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { AuthStackParamList, RootStackParamList } from '@/types';
import { scaleWidth, scaleHeight, getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

type NavigationProp = CompositeNavigationProp<
  StackNavigationProp<AuthStackParamList>,
  StackNavigationProp<RootStackParamList>
>;

// Consistent Colors with Onboarding
const PRIMARY_GREEN = '#B4F04E';

export const WelcomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const logoScale = useRef(new Animated.Value(0.95)).current;
  const loginButtonScale = useRef(new Animated.Value(1)).current;

  // Entrance Animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Reset when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Optional: Logic to run when screen focuses
    }, [])
  );

  const handleLoginPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(loginButtonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(loginButtonScale, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      navigation.navigate('Login');
    });
  };

  const handleRegisterPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Signup');
  };

  const handleCoachPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    (navigation as any).replace('CoachAuth');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ImageBackground
        source={require('../../../assets/welcome-hero.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Refined Gradient Overlay for Readability */}
        <LinearGradient
          colors={['rgba(3, 3, 3, 0.3)', 'rgba(3, 3, 3, 0.6)', 'rgba(3, 3, 3, 0.95)']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.content, { paddingTop: insets.top + getResponsiveSpacing(60) }]}>
          {/* Logo Section */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Logo width={scaleWidth(320)} height={scaleHeight(98)} style={styles.logo} />
          </Animated.View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Buttons Section */}
          <Animated.View
            style={[
              styles.buttonsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
                paddingBottom: insets.bottom + getResponsiveSpacing(40),
              },
            ]}
          >
            {/* Login Button - Solid Green with Glow */}
            <Animated.View style={{ transform: [{ scale: loginButtonScale }] }}>
              <TouchableOpacity
                onPress={handleLoginPress}
                activeOpacity={0.9}
                style={styles.loginButton}
              >
                <Text style={styles.loginButtonText}>{t('welcome.login')}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Register Button - Transparent/Minimal */}
            <TouchableOpacity
              onPress={handleRegisterPress}
              activeOpacity={0.7}
              style={styles.registerButton}
            >
              <Text style={styles.registerButtonText}>{t('welcome.register')}</Text>
            </TouchableOpacity>

            {/* Coach CTA */}
            <TouchableOpacity
              onPress={handleCoachPress}
              activeOpacity={0.7}
              style={styles.coachButton}
            >
              <Text style={styles.coachButtonText}>{t('welcome.imACoach')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030303',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: getResponsiveSpacing(theme.spacing.lg),
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // Removed shadow to keep logo crisp
  },
  logo: {
    // Logo styles
  },
  spacer: {
    flex: 1,
  },
  buttonsContainer: {
    width: '100%',
    paddingHorizontal: theme.spacing.md,
    gap: 16,
  },
  loginButton: {
    backgroundColor: PRIMARY_GREEN,
    minHeight: 56,
    paddingVertical: 18,
    borderRadius: 35, // Match Onboarding Get Started
    alignItems: 'center',
    justifyContent: 'center',
    // Glow Effect
    shadowColor: PRIMARY_GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  loginButtonText: {
    color: '#000000',
    fontFamily: 'Barlow_600SemiBold', // Match Register button
    fontSize: getResponsiveFontSize(19),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  registerButton: {
    minHeight: 56,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(17),
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.9,
  },
  coachButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachButtonText: {
    color: 'rgba(180, 240, 78, 0.8)',
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(14),
    letterSpacing: 0.5,
  },
});
