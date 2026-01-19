import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ScreenContainer,
  Logo,
  KeyboardDismissView,
  Toast,
  toastManager,
} from '@/components/shared';
import {
  CustomInput,
  CustomButton,
} from '@/components/auth';
import { authService } from '@/services/auth';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/validations';
import type { AuthStackParamList } from '@/types';
import { getResponsiveFontSize, getResponsiveSpacing, scaleWidth, scaleHeight } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<AuthStackParamList>;

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const { control, handleSubmit, formState: { errors, isValid, touchedFields } } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
    },
  });

  // Toast subscription
  useEffect(() => {
    const unsubscribe = toastManager.subscribe((toastState) => {
      if (toastState) {
        setToast(toastState);
      } else {
        setToast(null);
      }
    });
    return unsubscribe;
  }, []);

  const onSubmit = async (data: ForgotPasswordInput) => {
    setLoading(true);
    try {
      await authService.forgotPassword(data.email);
      toastManager.success(t('auth.forgotPassword.otpSent'));
      setTimeout(() => {
        navigation.replace('VerifyOtp', { email: data.email });
      }, 500);
    } catch (error: any) {
      const errorMessage = error.message || t('auth.forgotPassword.failedToSend');
      let friendlyMessage = errorMessage;
      if (errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
        friendlyMessage = t('auth.forgotPassword.emailNotFound');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        friendlyMessage = t('auth.forgotPassword.networkError');
      }
      toastManager.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardDismissView style={styles.container}>
      <LinearGradient
        colors={['#030303', '#030303', '#0a1a0a']}
        locations={[0, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          onDismiss={() => setToast(null)}
        />
      )}

      <ScreenContainer scrollable={true} style={styles.screenContainer}>
        <View style={[styles.content, { paddingTop: insets.top + getResponsiveSpacing(theme.spacing.md) }]}>
          {/* Back Button */}
          <Pressable
            style={[styles.backButton, { top: insets.top + 20 }]}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#ffffff" />
          </Pressable>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Logo width={scaleWidth(200)} height={scaleHeight(61)} />
          </View>

          {/* Heading */}
          <Text style={styles.heading}>{t('auth.forgotPassword.title')}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {t('auth.forgotPassword.subtitle')}
          </Text>

          {/* Email Input */}
          <View style={styles.inputsContainer}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <CustomInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t('auth.forgotPassword.email')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={errors.email && touchedFields.email ? errors.email.message : undefined}
                />
              )}
            />
          </View>

          {/* Send Code Button */}
          <CustomButton
            title={t('auth.forgotPassword.sendCode')}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={!isValid || loading}
            variant="primary"
            style={styles.button}
          />

          {/* Bottom Link */}
          <View style={styles.bottomLink}>
            <Text style={styles.bottomText}>{t('auth.forgotPassword.rememberPassword')} </Text>
            <Pressable onPress={() => navigation.goBack()}>
              <Text style={styles.link}>{t('auth.forgotPassword.login')}</Text>
            </Pressable>
          </View>
        </View>
      </ScreenContainer>
    </KeyboardDismissView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030303',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: getResponsiveSpacing(theme.spacing.lg),
  },
  backButton: {
    position: 'absolute',
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 32,
  },
  heading: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(28),
    fontWeight: 'normal' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: getResponsiveFontSize(36),
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '400' as const,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: getResponsiveFontSize(20),
    paddingHorizontal: 16,
  },
  inputsContainer: {
    marginBottom: 24,
  },
  button: {
    marginBottom: 32,
  },
  bottomLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  bottomText: {
    fontSize: getResponsiveFontSize(15),
    color: '#FFFFFF',
    fontFamily: 'Barlow_400Regular',
    fontWeight: '400' as const,
  },
  link: {
    fontSize: getResponsiveFontSize(15),
    color: '#84c441',
    fontFamily: 'Barlow_600SemiBold',
    fontWeight: '600' as const,
  },
});
