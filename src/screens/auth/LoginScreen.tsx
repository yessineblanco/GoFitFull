import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller } from 'react-hook-form';
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
  SocialButton,
  Checkbox,
} from '@/components/auth';
import { useAuthStore } from '@/store/authStore';
import { loginSchema, type LoginInput } from '@/lib/validations';
import { saveFormData, loadFormData, clearFormData } from '@/utils/formPersistence';
import type { AuthStackParamList } from '@/types';
import { getResponsiveFontSize, getResponsiveSpacing, scaleWidth, scaleHeight } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<AuthStackParamList>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithOAuth, loading, rememberMe, rememberedEmail, setRememberMe, loadRememberedEmail } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMeChecked, setRememberMeChecked] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  
  const { control, handleSubmit, formState: { errors, isValid, touchedFields }, watch, setValue } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Load remembered email on mount
  useFocusEffect(
    React.useCallback(() => {
      loadRememberedEmail();
    }, [loadRememberedEmail])
  );

  // Set email from remembered email
  useEffect(() => {
    if (rememberedEmail) {
      setValue('email', rememberedEmail, { shouldValidate: true });
      setRememberMeChecked(true);
    }
  }, [rememberedEmail, setValue]);

  // Load saved form data with validation
  useFocusEffect(
    React.useCallback(() => {
      loadFormData('login', loginSchema.partial()).then((savedData) => {
        if (savedData && !rememberedEmail) {
          if (savedData.email) setValue('email', savedData.email, { shouldValidate: true });
        }
      });
    }, [setValue, rememberedEmail])
  );

  // Save form data when it changes
  useEffect(() => {
    const subscription = watch((value) => {
      if (value.email && !rememberMeChecked) {
        saveFormData('login', {
          email: value.email || '',
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, rememberMeChecked]);

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

  const onSubmit = async (data: LoginInput) => {
    try {
      await signIn(data.email, data.password, rememberMeChecked);
      if (!rememberMeChecked) {
        await clearFormData('login');
      }
    } catch (error: any) {
      const errorMessage = error.message || t('auth.login.failedToSignIn');
      let friendlyMessage = errorMessage;
      if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('invalid')) {
        friendlyMessage = t('auth.login.invalidCredentials');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        friendlyMessage = t('auth.login.networkError');
      } else if (errorMessage.includes('email not confirmed')) {
        friendlyMessage = t('auth.login.emailNotVerified');
      }
      toastManager.error(friendlyMessage);
    }
  };

  const handleRememberMeToggle = async (checked: boolean) => {
    setRememberMeChecked(checked);
    const email = watch('email');
    if (checked && email) {
      await setRememberMe(true, email);
    } else {
      await setRememberMe(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    try {
      await signInWithOAuth(provider);
    } catch (error: any) {
      const errorMessage = error.message || t('auth.login.socialLoginFailed');
      toastManager.error(errorMessage);
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
          <Text style={styles.heading}>{t('auth.login.title')}</Text>

        {/* Input Fields */}
        <View style={styles.inputsContainer}>
          <Controller
            control={control}
            name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <CustomInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                  placeholder={t('auth.login.email')}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                  error={errors.email && touchedFields.email ? errors.email.message : undefined}
                />
                    )}
          />

          <Controller
            control={control}
            name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <CustomInput
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder={t('auth.login.password')}
                  secureTextEntry
                  showPasswordToggle
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  error={errors.password && touchedFields.password ? errors.password.message : undefined}
                />
              )}
          />
        </View>

        {/* Remember Me & Forgot Password */}
        <View style={styles.rememberForgotContainer}>
            <Checkbox
              checked={rememberMeChecked}
            onPress={() => handleRememberMeToggle(!rememberMeChecked)}
              label={t('auth.login.rememberMe')}
            />
            <Pressable
              style={styles.forgotPassword}
            onPress={() => navigation.replace('ForgotPassword')}
          >
              <Text style={styles.forgotText}>{t('auth.login.forgotPassword')}</Text>
            </Pressable>
        </View>

          {/* Login Button */}
          <CustomButton
            title={t('auth.login.loginButton')}
          onPress={handleSubmit(onSubmit)} 
            loading={loading}
          disabled={!isValid || loading}
            variant="primary"
            style={styles.button}
          />

          {/* Social Login Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('auth.login.signInWith')}</Text>
            <View style={styles.dividerLine} />
        </View>

          {/* Social Login Buttons */}
        <View style={styles.socialContainer}>
            <SocialButton
              platform="facebook"
            onPress={() => handleSocialLogin('facebook')}
            disabled={loading}
            />
            <SocialButton
              platform="google"
            onPress={() => handleSocialLogin('google')}
            disabled={loading}
            />
            <SocialButton
              platform="apple"
            onPress={() => handleSocialLogin('apple')}
            disabled={loading}
            />
        </View>

          {/* Bottom Link */}
          <View style={styles.bottomLink}>
            <Text style={styles.bottomText}>{t('auth.login.noAccount')} </Text>
            <Pressable onPress={() => navigation.replace('Signup')}>
              <Text style={styles.link}>{t('auth.login.registerNow')}</Text>
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
    marginBottom: 40,
    lineHeight: getResponsiveFontSize(36),
    letterSpacing: 0.5,
  },
  inputsContainer: {
    marginBottom: 24,
  },
  rememberForgotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  forgotPassword: {
    padding: 4,
  },
  forgotText: {
    fontSize: getResponsiveFontSize(14),
    color: '#84c441',
    fontFamily: 'Barlow_600SemiBold',
    fontWeight: '600' as const,
  },
  button: {
    marginBottom: 32,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dividerText: {
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Barlow_500Medium',
    fontWeight: '500' as const,
    paddingHorizontal: 16,
    letterSpacing: 0.5,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
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
