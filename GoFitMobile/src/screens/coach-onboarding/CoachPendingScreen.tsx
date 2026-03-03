import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, CheckCircle, Mail } from 'lucide-react-native';
import { CustomButton } from '@/components/auth';
import { useAuthStore } from '@/store/authStore';
import { getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';

const PRIMARY_GREEN = '#B4F04E';

export const CoachPendingScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuthStore();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#030303', '#0a1a0a', '#030303']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 80,
            paddingBottom: insets.bottom + 24,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
          <Clock size={48} color={PRIMARY_GREEN} />
        </Animated.View>

        <Text style={styles.title}>{t('coachOnboarding.pending.title')}</Text>
        <Text style={styles.subtitle}>{t('coachOnboarding.pending.subtitle')}</Text>

        <View style={styles.stepsContainer}>
          <View style={styles.step}>
            <View style={[styles.stepIcon, styles.stepIconDone]}>
              <CheckCircle size={20} color={PRIMARY_GREEN} />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('coachOnboarding.pending.step1Title')}</Text>
              <Text style={styles.stepDesc}>{t('coachOnboarding.pending.step1Desc')}</Text>
            </View>
          </View>

          <View style={styles.stepLine} />

          <View style={styles.step}>
            <View style={[styles.stepIcon, styles.stepIconActive]}>
              <Clock size={20} color="#FFA500" />
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t('coachOnboarding.pending.step2Title')}</Text>
              <Text style={styles.stepDesc}>{t('coachOnboarding.pending.step2Desc')}</Text>
            </View>
          </View>

          <View style={styles.stepLine} />

          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Mail size={20} color="rgba(255,255,255,0.3)" />
            </View>
            <View style={styles.stepContent}>
              <Text style={[styles.stepTitle, styles.stepTitlePending]}>{t('coachOnboarding.pending.step3Title')}</Text>
              <Text style={styles.stepDesc}>{t('coachOnboarding.pending.step3Desc')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.bottomActions}>
          <CustomButton
            title={t('coachOnboarding.pending.signOut')}
            onPress={() => signOut()}
            variant="secondary"
            style={styles.signOutButton}
          />
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(180, 240, 78, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(26),
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(15),
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: getResponsiveFontSize(22),
    marginBottom: 40,
    maxWidth: 320,
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 24,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconDone: {
    backgroundColor: 'rgba(180, 240, 78, 0.1)',
  },
  stepIconActive: {
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
  },
  stepContent: { flex: 1 },
  stepTitle: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(15),
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stepTitlePending: {
    color: 'rgba(255,255,255,0.4)',
  },
  stepDesc: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255,255,255,0.5)',
    lineHeight: getResponsiveFontSize(18),
  },
  stepLine: {
    width: 2,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: 19,
    marginVertical: 4,
  },
  bottomActions: {
    marginTop: 'auto',
    width: '100%',
  },
  signOutButton: { width: '100%' },
});
