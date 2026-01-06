import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../theme';
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
  PasswordStrengthIndicator,
} from '@/components/auth';
import { useAuthStore } from '@/store/authStore';
import { signupSchema, type SignupInput } from '@/lib/validations';
import { saveFormData, loadFormData, clearFormData } from '@/utils/formPersistence';
import type { AuthStackParamList } from '@/types';
import { getResponsiveFontSize, getResponsiveSpacing, scaleWidth, scaleHeight } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<AuthStackParamList>;

export const SignupScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { signUp, loading } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  
  const { control, handleSubmit, formState: { errors, isValid, touchedFields }, watch, setValue } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  // Load saved form data on mount
  useFocusEffect(
    React.useCallback(() => {
      loadFormData('signup', signupSchema.partial()).then((savedData) => {
        if (savedData) {
          if (savedData.email) setValue('email', savedData.email, { shouldValidate: true });
          if (savedData.password) {
            setValue('password', savedData.password, { shouldValidate: true });
            setPasswordValue(savedData.password);
          }
        }
      });
    }, [setValue])
  );

  // Save form data when it changes
  useEffect(() => {
    const subscription = watch((value) => {
      if (value.email || value.password) {
        saveFormData('signup', {
          email: value.email || '',
          password: value.password || '',
        });
      }
      if (value.password) {
        setPasswordValue(value.password);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

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

  const onSubmit = async (data: SignupInput) => {
    try {
      await signUp(data.email, data.password);
      await clearFormData('signup');
      toastManager.success(t('auth.signup.accountCreated'));
    } catch (error: any) {
      const errorMessage = error.message || t('auth.signup.failedToCreate');
      let friendlyMessage = errorMessage;
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        friendlyMessage = t('auth.signup.emailAlreadyRegistered');
      } else if (errorMessage.includes('invalid email')) {
        friendlyMessage = t('auth.signup.invalidEmail');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        friendlyMessage = t('auth.signup.networkError');
      }
      toastManager.error(friendlyMessage);
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
          <Text style={styles.heading}>{t('auth.signup.title')}</Text>

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
                  placeholder={t('auth.signup.email')}
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
                <View>
                  <CustomInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder={t('auth.signup.password')}
                    secureTextEntry
                    showPasswordToggle
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword(!showPassword)}
                    error={errors.password && touchedFields.password ? errors.password.message : undefined}
                  />
                  {passwordValue && !errors.password && (
                    <View style={styles.passwordHints}>
                      <Text style={styles.hint}>• At least 8 characters</Text>
                      <Text style={styles.hint}>• One uppercase letter</Text>
                      <Text style={styles.hint}>• One number</Text>
                    </View>
                  )}
                  {passwordValue && !errors.password && (
                      <PasswordStrengthIndicator password={passwordValue} />
                    )}
                </View>
              )}
          />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <CustomInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder={t('auth.signup.confirmPassword')}
                  secureTextEntry
                  showPasswordToggle
                  showPassword={showConfirmPassword}
                  onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
                  error={errors.confirmPassword && touchedFields.confirmPassword ? errors.confirmPassword.message : undefined}
                />
              )}
            />
          </View>

          {/* Register Button */}
          <CustomButton
            title={t('auth.signup.registerButton')}
            onPress={handleSubmit(onSubmit)} 
            loading={loading}
            disabled={!isValid || loading}
            variant="primary"
            style={styles.button}
          />

          {/* Bottom Link */}
          <View style={styles.bottomLink}>
            <Text style={styles.bottomText}>{t('auth.signup.hasAccount')} </Text>
            <Pressable onPress={() => navigation.replace('Login')}>
              <Text style={styles.link}>{t('auth.signup.loginNow')}</Text>
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
  passwordHints: {
    marginTop: 8,
    marginLeft: 24,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontFamily: 'Barlow_400Regular',
    lineHeight: 18,
    marginBottom: 2,
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
