import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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
  Checkbox,
} from '@/components/auth';
import { useAuthStore } from '@/store/authStore';
import { loginSchema, type LoginInput } from '@/lib/validations';
import { saveFormData, loadFormData, clearFormData } from '@/utils/formPersistence';
import type { CoachAuthStackParamList } from '@/types';
import { getResponsiveFontSize, getResponsiveSpacing, scaleWidth, scaleHeight } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<CoachAuthStackParamList>;

export const CoachLoginScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { signIn, loading, rememberMe, rememberedEmail, setRememberMe, loadRememberedEmail } = useAuthStore();
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

  useFocusEffect(
    React.useCallback(() => {
      loadRememberedEmail();
    }, [loadRememberedEmail])
  );

  useEffect(() => {
    if (rememberedEmail) {
      setValue('email', rememberedEmail, { shouldValidate: true });
      setRememberMeChecked(true);
    }
  }, [rememberedEmail, setValue]);

  useFocusEffect(
    React.useCallback(() => {
      loadFormData('coach_login', loginSchema.partial()).then((savedData) => {
        if (savedData && !rememberedEmail) {
          if (savedData.email) setValue('email', savedData.email, { shouldValidate: true });
        }
      });
    }, [setValue, rememberedEmail])
  );

  useEffect(() => {
    const subscription = watch((value) => {
      if (value.email && !rememberMeChecked) {
        saveFormData('coach_login', { email: value.email || '' });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, rememberMeChecked]);

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
        await clearFormData('coach_login');
      }
    } catch (error: any) {
      const errorMessage = error.message || t('coachAuth.login.failedToSignIn');
      let friendlyMessage = errorMessage;
      if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('invalid')) {
        friendlyMessage = t('coachAuth.login.invalidCredentials');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        friendlyMessage = t('coachAuth.login.networkError');
      } else if (errorMessage.includes('email not confirmed')) {
        friendlyMessage = t('coachAuth.login.emailNotVerified');
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
          <Pressable
            style={[styles.backButton, { top: insets.top + 20 }]}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#ffffff" />
          </Pressable>

          <View style={styles.logoContainer}>
            <Logo width={scaleWidth(200)} height={scaleHeight(61)} />
          </View>

          <Text style={styles.heading}>{t('coachAuth.login.title')}</Text>

          <View style={styles.inputsContainer}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <CustomInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t('coachAuth.login.email')}
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
                  placeholder={t('coachAuth.login.password')}
                  secureTextEntry
                  showPasswordToggle
                  showPassword={showPassword}
                  onTogglePassword={() => setShowPassword(!showPassword)}
                  error={errors.password && touchedFields.password ? errors.password.message : undefined}
                />
              )}
            />
          </View>

          <View style={styles.rememberForgotContainer}>
            <Checkbox
              checked={rememberMeChecked}
              onPress={() => handleRememberMeToggle(!rememberMeChecked)}
              label={t('coachAuth.login.rememberMe')}
            />
            <Pressable
              style={styles.forgotPassword}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotText}>{t('coachAuth.login.forgotPassword')}</Text>
            </Pressable>
          </View>

          <CustomButton
            title={t('coachAuth.login.loginButton')}
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={!isValid || loading}
            variant="primary"
            style={styles.button}
          />

          <View style={styles.bottomLink}>
            <Text style={styles.bottomText}>{t('coachAuth.login.noAccount')} </Text>
            <Pressable onPress={() => navigation.replace('CoachSignup')}>
              <Text style={styles.link}>{t('coachAuth.login.registerNow')}</Text>
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
