import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../../theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenContainer,
  AnimatedBackground,
  KeyboardDismissView,
  Toast,
  toastManager,
} from '@/components/shared';
import { PasswordStrengthIndicator } from '@/components/auth';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { resetPasswordSchema, type ResetPasswordInput } from '@/lib/validations';
import type { AuthStackParamList } from '@/types';
import { useWindowDimensions } from 'react-native';
import { getResponsiveFontSize, getResponsiveSpacing, isSmallScreen, ensureMinTouchTarget } from '@/utils/responsive';

type NavigationProp = StackNavigationProp<AuthStackParamList>;
type ResetPasswordRouteProp = RouteProp<AuthStackParamList, 'ResetPassword'>;

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ResetPasswordRouteProp>();
  const { email } = route.params;
  const { setIsResettingPassword } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const { width } = useWindowDimensions();
  
  const { control, handleSubmit, formState: { errors, touchedFields }, watch } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onBlur',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

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

  // Track password value for strength indicator
  useEffect(() => {
    if (password) {
      setPasswordValue(password);
    }
  }, [password]);

  const onSubmit = async (data: ResetPasswordInput) => {
    setLoading(true);
    try {
      // Update password (user is already in recovery state after OTP verification)
      await authService.updatePassword(data.password);
      
      // Clear the password reset flag
      setIsResettingPassword(false);
      
      // Sign out after password reset (optional - you can keep them signed in)
      await authService.signOut();
      
      toastManager.success('Password reset successfully!');
      
      // Navigate to success screen after brief delay
      setTimeout(() => {
        navigation.replace('PasswordChangedSuccess');
      }, 500);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to reset password';
      let friendlyMessage = errorMessage;
      if (errorMessage.includes('weak') || errorMessage.includes('too short')) {
        friendlyMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        friendlyMessage = 'Network error. Please check your connection and try again.';
      }
      toastManager.error(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardDismissView style={styles.container}>
      {/* Background ellipses */}
      <AnimatedBackground />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          visible={toast.visible}
          onDismiss={() => setToast(null)}
        />
      )}

      <ScreenContainer scrollable={true} style={styles.screenContainer}>
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>Reset Password</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Your new password must be unique from those previously used.
          </Text>

          {/* Password Input */}
          <View style={styles.inputsContainer}>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => {
                const hasError = !!errors.password && touchedFields.password;
                return (
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[
                          styles.customInput,
                          hasError && styles.inputError,
                        ]}
                        placeholder="New Password"
                        placeholderTextColor="rgba(255, 255, 255, 0.42)"
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowPassword(!showPassword)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={22}
                          color="rgba(255, 255, 255, 0.42)"
                        />
                      </TouchableOpacity>
                      {hasError && errors.password && (
                        <Text style={styles.errorText}>{errors.password.message}</Text>
                      )}
                      {/* Password Strength Indicator */}
                      {passwordValue && !hasError && (
                        <PasswordStrengthIndicator password={passwordValue} />
                      )}
                    </View>
                  </View>
                );
              }}
            />

            {/* Confirm Password */}
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => {
                const hasError = !!errors.confirmPassword && touchedFields.confirmPassword;
                return (
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                      <TextInput
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[
                          styles.customInput,
                          hasError && styles.inputError,
                        ]}
                        placeholder="Confirm New Password"
                        placeholderTextColor="rgba(255, 255, 255, 0.42)"
                      />
                      <TouchableOpacity
                        style={styles.eyeIcon}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={22}
                          color="rgba(255, 255, 255, 0.42)"
                        />
                      </TouchableOpacity>
                      {hasError && errors.confirmPassword && (
                        <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleSubmit(onSubmit)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#1E232C" />
            ) : (
              <Text style={styles.resetButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: getResponsiveSpacing(theme.spacing.md),
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  backButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(isSmallScreen() ? 26 : 30),
    fontWeight: 'normal' as const,
    color: '#FFFFFF',
    textAlign: 'left',
    marginBottom: theme.spacing.sm,
    lineHeight: getResponsiveFontSize(isSmallScreen() ? 34 : 39),
    letterSpacing: -0.01,
    flexWrap: 'wrap',
  },
  subtitle: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(13),
    fontWeight: '400' as const,
    color: 'rgba(255, 255, 255, 0.64)',
    textAlign: 'left',
    marginBottom: getResponsiveSpacing(theme.spacing.xl),
    lineHeight: getResponsiveFontSize(20),
    paddingRight: theme.spacing.md,
  },
  inputsContainer: {
    marginBottom: theme.spacing.lg,
  },
  inputWrapper: {
    marginBottom: theme.spacing.lg,
  },
  inputContainer: {
    position: 'relative',
  },
  customInput: {
    backgroundColor: 'rgba(141, 187, 90, 0.2)',
    borderColor: '#8DBB5A',
    borderWidth: 1,
    borderRadius: 27.5,
    height: ensureMinTouchTarget(isSmallScreen() ? 52 : 56),
    paddingHorizontal: theme.spacing.md,
    paddingRight: 50,
    color: '#FFFFFF',
    fontSize: getResponsiveFontSize(15),
    fontFamily: 'Barlow_400Regular',
  },
  inputError: {
    borderColor: theme.colors.error || '#FF3B30',
    borderWidth: 2,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  eyeIcon: {
    position: 'absolute',
    right: theme.spacing.md,
    top: '50%',
    transform: [{ translateY: -11 }],
  },
  errorText: {
    color: theme.colors.error || '#FF3B30',
    fontSize: getResponsiveFontSize(12),
    marginTop: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
    fontFamily: 'Barlow_400Regular',
  },
  resetButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1E232C',
    borderWidth: 1,
    borderRadius: 27.5,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    height: ensureMinTouchTarget(58),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  resetButtonText: {
    color: '#1E232C',
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(15),
    fontWeight: '600' as const,
  },
});

