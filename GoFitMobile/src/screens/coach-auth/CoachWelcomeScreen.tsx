import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Award, Users, TrendingUp } from 'lucide-react-native';
import { Logo } from '@/components/shared';
import { theme } from '@/theme';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { CoachAuthStackParamList } from '@/types';
import { scaleWidth, scaleHeight, getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<CoachAuthStackParamList>;

const PRIMARY_GREEN = '#B4F04E';

export const CoachWelcomeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScale = useRef(new Animated.Value(0.95)).current;

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

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('CoachSignup');
  };

  const handleLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('CoachLogin');
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={['#030303', '#0a1a0a', '#030303']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.content, { paddingTop: insets.top + getResponsiveSpacing(theme.spacing.md) }]}>
        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 20 }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>

        <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: logoScale }] }]}>
          <Logo width={scaleWidth(240)} height={scaleHeight(73)} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('coachAuth.welcome.badge')}</Text>
          </View>
        </Animated.View>

        <Animated.View style={[styles.valueProps, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.headline}>{t('coachAuth.welcome.headline')}</Text>
          <Text style={styles.subheadline}>{t('coachAuth.welcome.subheadline')}</Text>

          <View style={styles.features}>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Users size={20} color={PRIMARY_GREEN} />
              </View>
              <Text style={styles.featureText}>{t('coachAuth.welcome.feature1')}</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <Award size={20} color={PRIMARY_GREEN} />
              </View>
              <Text style={styles.featureText}>{t('coachAuth.welcome.feature2')}</Text>
            </View>
            <View style={styles.featureRow}>
              <View style={styles.featureIcon}>
                <TrendingUp size={20} color={PRIMARY_GREEN} />
              </View>
              <Text style={styles.featureText}>{t('coachAuth.welcome.feature3')}</Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View style={[styles.buttonsContainer, { opacity: fadeAnim, paddingBottom: insets.bottom + getResponsiveSpacing(40) }]}>
          <TouchableOpacity onPress={handleGetStarted} activeOpacity={0.9} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{t('coachAuth.welcome.getStarted')}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleLogin} activeOpacity={0.7} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>{t('coachAuth.welcome.alreadyCoach')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030303',
  },
  content: {
    flex: 1,
    paddingHorizontal: getResponsiveSpacing(theme.spacing.lg),
  },
  backButton: {
    position: 'absolute',
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 48,
  },
  badge: {
    marginTop: 12,
    backgroundColor: 'rgba(180, 240, 78, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(180, 240, 78, 0.3)',
  },
  badgeText: {
    color: PRIMARY_GREEN,
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(13),
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  valueProps: {
    marginTop: 40,
  },
  headline: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(28),
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: getResponsiveFontSize(36),
    letterSpacing: 0.5,
  },
  subheadline: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(15),
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: getResponsiveFontSize(22),
  },
  features: {
    marginTop: 32,
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(180, 240, 78, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(15),
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: getResponsiveFontSize(21),
  },
  spacer: {
    flex: 1,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: PRIMARY_GREEN,
    minHeight: 56,
    paddingVertical: 18,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PRIMARY_GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  primaryButtonText: {
    color: '#000000',
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(19),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  secondaryButton: {
    minHeight: 56,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(17),
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.9,
  },
});
