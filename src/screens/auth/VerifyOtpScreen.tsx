import React, { useState, useRef, useEffect } from 'react';
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
  GradientText,
} from '@/components/shared';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { verifyOtpSchema, type VerifyOtpInput } from '@/lib/validations';
import type { AuthStackParamList } from '@/types';
import { useWindowDimensions } from 'react-native';
import { getResponsiveFontSize, getResponsiveSpacing, isSmallScreen, ensureMinTouchTarget } from '@/utils/responsive';

type NavigationProp = StackNavigationProp<AuthStackParamList>;
type VerifyOtpRouteProp = RouteProp<AuthStackParamList, 'VerifyOtp'>;

export const VerifyOtpScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<VerifyOtpRouteProp>();
  const { email } = route.params;
  const { setIsResettingPassword } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '', '', '']);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const { width } = useWindowDimensions();

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
  
  const handleOtpChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // Auto-focus next input
    if (value && index < 7) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 8) {
      toastManager.error('Please enter the complete 8-digit code');
      return;
    }

    setLoading(true);
    try {
      // Set flag FIRST to prevent automatic navigation to App
      setIsResettingPassword(true);
      
      // Verify OTP with recovery type - user will be in recovery state (not signed in)
      const result = await authService.verifyOtp(email, code);
      
      // Navigate immediately - the flag should prevent App.tsx from redirecting
      navigation.replace('ResetPassword', { email });
    } catch (error: any) {
      const errorMessage = error.message || 'Invalid OTP code. Please try again.';
      let friendlyMessage = errorMessage;
      if (errorMessage.includes('expired')) {
        friendlyMessage = 'OTP code has expired. Please request a new one.';
      } else if (errorMessage.includes('invalid') || errorMessage.includes('incorrect')) {
        friendlyMessage = 'Invalid OTP code. Please check and try again.';
      }
      toastManager.error(friendlyMessage);
      // Clear OTP on error
      setOtp(['', '', '', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await authService.forgotPassword(email);
      toastManager.success('A new OTP code has been sent to your email');
      setOtp(['', '', '', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to resend code';
      let friendlyMessage = errorMessage;
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
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

      <ScreenContainer scrollable={false} style={styles.screenContainer}>
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
          <Text style={styles.title} numberOfLines={2}>Enter Verification Code</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            We've sent an 8-digit code to {email}
          </Text>

          {/* OTP Inputs - 2 rows of 4 for better UI */}
          <View style={styles.otpContainer}>
            {/* First row - 4 digits */}
            <View style={styles.otpRow}>
              {otp.slice(0, 4).map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => { inputRefs.current[index] = ref; }}
                  style={styles.otpInput}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(index, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>
            {/* Second row - 4 digits */}
            <View style={styles.otpRow}>
              {otp.slice(4, 8).map((digit, index) => (
                <TextInput
                  key={index + 4}
                  ref={(ref) => { inputRefs.current[index + 4] = ref; }}
                  style={styles.otpInput}
                  value={digit}
                  onChangeText={(value) => handleOtpChange(index + 4, value)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(index + 4, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                />
              ))}
            </View>
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
            onPress={handleVerify}
            disabled={loading || otp.join('').length !== 8}
          >
            {loading ? (
              <ActivityIndicator color="#1E232C" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Code</Text>
            )}
          </TouchableOpacity>

          {/* Resend Code */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity onPress={handleResend} disabled={loading}>
              <GradientText
                text="Resend"
                colors={['#8DBB5A', '#D6EBEB']}
                fontSize={getResponsiveFontSize(15)}
                fontFamily="Barlow_400Regular"
                fontWeight="400"
                letterSpacing={0.01}
              />
            </TouchableOpacity>
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
    fontSize: getResponsiveFontSize(isSmallScreen() ? 22 : 26),
    fontWeight: 'normal' as const,
    color: '#FFFFFF',
    textAlign: 'left',
    marginBottom: theme.spacing.sm,
    lineHeight: getResponsiveFontSize(isSmallScreen() ? 30 : 34),
    letterSpacing: -0.01,
    flexWrap: 'wrap',
  },
  subtitle: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(13),
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.64)',
    textAlign: 'left',
    marginBottom: getResponsiveSpacing(theme.spacing.xl),
    lineHeight: getResponsiveFontSize(20),
    paddingRight: theme.spacing.md,
  },
  otpContainer: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.sm,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  otpInput: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(141, 187, 90, 0.2)',
    borderColor: '#8DBB5A',
    borderWidth: 1,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: getResponsiveFontSize(24),
    fontFamily: 'Barlow_600SemiBold',
    color: '#FFFFFF',
    fontWeight: '600' as const,
  },
  verifyButton: {
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
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: '#1E232C',
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(15),
    fontWeight: '600' as const,
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.lg,
  },
  resendText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(15),
    fontWeight: '400' as const,
    color: '#FFFFFF',
    lineHeight: getResponsiveFontSize(21),
    letterSpacing: 0.01,
  },
});

