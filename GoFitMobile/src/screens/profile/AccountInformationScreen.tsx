import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  LayoutAnimation,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated } from 'react-native';
// Removed BlurView
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/auth';
import { changePasswordSchema, type ChangePasswordInput } from '@/lib/validations';
import { ArrowLeft, Lock, Eye, EyeOff, ChevronRight, Save } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { ProfileStackParamList } from '@/types';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity, getTextSecondaryColor, getOverlayColor } from '@/utils/colorUtils';
import { GradientBackground } from '@/components/shared/GradientBackground';
import { AppText } from '@/components/shared/AppText';

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'AccountInformation'>;

interface AccountInformationScreenProps {
  navigation: NavigationProp;
}

export const AccountInformationScreen: React.FC<AccountInformationScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user, refreshUser } = useAuthStore();
  const { isDark } = useThemeStore();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showEmailEditSection, setShowEmailEditSection] = useState(false);
  const [emailVerificationPassword, setEmailVerificationPassword] = useState('');
  const [showEmailVerificationPassword, setShowEmailVerificationPassword] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const chevronRotation = React.useRef(new Animated.Value(0)).current;
  const emailChevronRotation = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (user) {
      const name = user.user_metadata?.display_name || user.email?.split('@')[0] || '';
      setDisplayName(name);
      setEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    Animated.timing(chevronRotation, {
      toValue: showPasswordSection ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showPasswordSection]);

  useEffect(() => {
    Animated.timing(emailChevronRotation, {
      toValue: showEmailEditSection ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showEmailEditSection]);

  const emailRotateInterpolate = emailChevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const rotateInterpolate = chevronRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  const handleSave = async () => {
    // Validate display name
    if (!displayName.trim()) {
      dialogManager.error(t('common.error'), t('account.displayNameEmpty'));
      return;
    }

    if (displayName.length > 50) {
      dialogManager.error(t('common.error'), t('account.displayNameTooLong'));
      return;
    }

    const nameRegex = /^[a-zA-Z0-9\s\-_]+$/;
    if (!nameRegex.test(displayName)) {
      dialogManager.error(t('common.error'), t('account.displayNameInvalid'));
      return;
    }

    // Validate email if changed
    const emailChanged = email.trim() !== (user?.email || '').trim();
    if (emailChanged) {
      if (!email.trim()) {
        dialogManager.error(t('common.error'), t('account.emailEmpty'));
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        dialogManager.error(t('common.error'), t('account.emailInvalid'));
        return;
      }
    }

    setLoading(true);
    try {
      // Update display name
      await authService.updateUserMetadata({ display_name: displayName.trim() });

      // Update email if changed
      if (emailChanged) {
        await authService.updateEmail(email.trim());
        dialogManager.info(
          t('account.emailUpdatePending'),
          t('account.emailUpdateMessage'),
          async () => {
            await refreshUser();
          }
        );
      } else {
        await refreshUser();
        dialogManager.success(t('common.success'), t('account.displayNameUpdated'));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('account.failedToUpdate');
      dialogManager.error(t('common.error'), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPasswordForEmail = async () => {
    if (!emailVerificationPassword) {
      dialogManager.error(t('common.error'), t('account.passwordRequired'));
      return;
    }

    if (!user?.email) {
      dialogManager.error(t('common.error'), t('account.userEmailNotFound'));
      return;
    }

    setVerifyingPassword(true);
    try {
      // Verify password by signing in
      await authService.signIn(user.email, emailVerificationPassword);
      setEmailVerified(true);
      setEmailVerificationPassword('');
      setShowEmailEditSection(false);
      dialogManager.success(t('common.success'), t('account.passwordVerified'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid login credentials')) {
        dialogManager.error(t('common.error'), t('account.incorrectPassword'));
      } else {
        const errorMessage = error instanceof Error ? error.message : t('account.failedToVerify');
        dialogManager.error(t('common.error'), errorMessage);
      }
      setEmailVerificationPassword('');
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      const data: ChangePasswordInput = {
        currentPassword,
        newPassword,
        confirmPassword,
      };

      // Validate using schema
      changePasswordSchema.parse(data);

      setChangingPassword(true);

      // Verify current password by signing in
      if (!user?.email) {
        throw new Error(t('account.userEmailNotFound'));
      }

      await authService.signIn(user.email, currentPassword);

      // Update password
      await authService.updatePassword(newPassword);

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);

      dialogManager.success(t('common.success'), t('account.passwordChanged'));
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid login credentials')) {
          dialogManager.error(t('common.error'), t('account.currentPasswordIncorrect'));
        } else if (error.message.includes("New passwords don't match")) {
          dialogManager.error(t('common.error'), t('account.passwordsDontMatch'));
        } else if (error.message.includes('must be different')) {
          dialogManager.error(t('common.error'), t('account.passwordMustBeDifferent'));
        } else {
          dialogManager.error(t('common.error'), error.message);
        }
      } else {
        dialogManager.error(t('common.error'), t('account.failedToChangePassword'));
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // Theme colors
  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
    },

    card: {
      borderRadius: 16,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      overflow: 'hidden' as const,
      padding: 20,
      borderWidth: 0,
    },
    glowWrapper: {
      padding: 0,
      borderRadius: 16,
      backgroundColor: 'transparent',
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: '600' as const,
      fontFamily: 'Barlow_600SemiBold',
      color: BRAND_WHITE,
    },
    input: {
      color: BRAND_WHITE,
      fontFamily: theme.typography.body.fontFamily,
    },
    label: {
      color: BRAND_WHITE,
    },
    sectionLabel: {
      color: getTextSecondaryColor(isDark),
    },
    verifySubmitButtonText: {
      color: BRAND_WHITE,
    },
    changePasswordButtonText: {
      color: BRAND_WHITE,
    },
    passwordInput: {
      color: BRAND_WHITE,
      fontFamily: theme.typography.body.fontFamily,
    },
    passwordToggleText: {
      color: BRAND_WHITE,
    },
    header: {
      borderBottomColor: getOverlayColor(isDark, 0.05),
      borderBottomWidth: 1,
    },
    hint: {
      color: getTextSecondaryColor(isDark),
    },
  }), [isDark, BRAND_WHITE]);

  return (
    <GradientBackground style={dynamicStyles.container}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={BRAND_WHITE} />
        </TouchableOpacity>
        <AppText variant="h4" style={dynamicStyles.headerTitle}>{t('account.title')}</AppText>
        <TouchableOpacity onPress={handleSave} style={styles.saveButton} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Save size={24} color={theme.colors.primary} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Display Name Section */}
        <View style={dynamicStyles.glowWrapper}>
          <View style={[styles.card, dynamicStyles.card]}>
            <AppText variant="captionBold" style={[styles.sectionLabel, dynamicStyles.label]}>{t('account.displayName')}</AppText>
            <TextInput
              style={[styles.input, dynamicStyles.input]}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('account.enterDisplayName')}
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              maxLength={50}
            />
          </View>
        </View>

        {/* Email Section */}
        <View style={[dynamicStyles.glowWrapper, { marginTop: 16 }]}>
          <View style={[styles.card, dynamicStyles.card]}>
            <AppText variant="captionBold" style={[styles.sectionLabel, dynamicStyles.label]}>{t('account.email')}</AppText>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, dynamicStyles.input, styles.inputFlex, !emailVerified && styles.inputDisabled]}
                value={email}
                onChangeText={setEmail}
                placeholder={t('account.enterEmail')}
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={emailVerified}
              />
              {!emailVerified && (
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setShowEmailEditSection(!showEmailEditSection);
                    if (!showEmailEditSection) {
                      setEmailVerificationPassword('');
                    }
                  }}
                >
                  <Lock size={16} color={theme.colors.primary} />
                  <AppText variant="small" style={styles.verifyButtonText}>{t('account.verify')}</AppText>
                </TouchableOpacity>
              )}
            </View>
            <AppText variant="small" style={[styles.hint, dynamicStyles.hint]}>
              {emailVerified
                ? (email.trim() !== (user?.email || '').trim()
                  ? t('account.emailConfirmationSent')
                  : t('account.emailChangeEnabled'))
                : t('account.emailChangeHint')}
            </AppText>

            {/* Password Verification */}
            {showEmailEditSection && !emailVerified && (
              <View style={styles.verificationContainer}>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={[styles.passwordInput, dynamicStyles.passwordInput]}
                    value={emailVerificationPassword}
                    onChangeText={setEmailVerificationPassword}
                    placeholder={t('account.enterPassword')}
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    secureTextEntry={!showEmailVerificationPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowEmailVerificationPassword(!showEmailVerificationPassword)}
                    style={styles.eyeButton}
                  >
                    {showEmailVerificationPassword ? (
                      <EyeOff size={20} color={isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(3, 3, 3, 0.6)"} />
                    ) : (
                      <Eye size={20} color={isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(3, 3, 3, 0.6)"} />
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.verifySubmitButton}
                  onPress={handleVerifyPasswordForEmail}
                  disabled={verifyingPassword || !emailVerificationPassword}
                >
                  {verifyingPassword ? (
                    <ActivityIndicator size="small" color={BRAND_WHITE} />
                  ) : (
                    <AppText variant="bodyBold" style={styles.verifySubmitButtonText}>{t('account.verifyPasswordButton')}</AppText>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Change Password Section */}
        <View style={[dynamicStyles.glowWrapper, { marginTop: 16 }]}>
          <View style={[styles.card, dynamicStyles.card]}>
            <TouchableOpacity
              style={styles.passwordToggleRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setShowPasswordSection(!showPasswordSection);
                if (!showPasswordSection) {
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }
              }}
            >
              <View style={styles.passwordToggleLeft}>
                <Lock size={20} color={theme.colors.primary} />
                <AppText variant="bodyBold" style={[styles.passwordToggleText, dynamicStyles.passwordToggleText]}>
                  {t('account.changePassword')}
                </AppText>
              </View>
              <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
                <ChevronRight size={20} color={getTextColorWithOpacity(isDark, 0.6)} />
              </Animated.View>
            </TouchableOpacity>

            {showPasswordSection && (
              <View style={styles.passwordFieldsContainer}>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={[styles.passwordInput, dynamicStyles.passwordInput]}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder={t('account.currentPassword')}
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    style={styles.eyeButton}
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={20} color={isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(3, 3, 3, 0.6)"} />
                    ) : (
                      <Eye size={20} color={isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(3, 3, 3, 0.6)"} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={[styles.passwordInput, dynamicStyles.passwordInput]}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder={t('account.newPassword')}
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeButton}
                  >
                    {showNewPassword ? (
                      <EyeOff size={20} color={isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(3, 3, 3, 0.6)"} />
                    ) : (
                      <Eye size={20} color={isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(3, 3, 3, 0.6)"} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={[styles.passwordInput, dynamicStyles.passwordInput]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t('account.confirmPassword')}
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeButton}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color={isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(3, 3, 3, 0.6)"} />
                    ) : (
                      <Eye size={20} color={isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(3, 3, 3, 0.6)"} />
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.changePasswordButton}
                  onPress={handleChangePassword}
                  disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                >
                  {changingPassword ? (
                    <ActivityIndicator size="small" color={BRAND_WHITE} />
                  ) : (
                    <AppText variant="bodyBold" style={styles.changePasswordButtonText}>
                      {t('account.updatePassword')}
                    </AppText>
                  )}
                </TouchableOpacity>
              </View>
            )}

          </View>
        </View>
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    // borderBottomColor applied dynamically
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    // fontSize, fontWeight managed by AppText variant="h4"
  },
  saveButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(132, 196, 65, 0.25)',
    backgroundColor: 'transparent',
    padding: 20,
  },
  sectionLabel: {
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16, // Input font size usually fixed or manually derived
    // fontFamily managed by dynamicStyles
    borderWidth: 1,
    // backgroundColor, color, borderColor applied dynamically
  },
  inputFlex: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hint: {
    marginTop: 10,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(132, 196, 65, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(132, 196, 65, 0.4)',
  },
  verifyButtonText: {
    color: theme.colors.primary,
  },
  verificationContainer: {
    marginTop: 16,
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  verifySubmitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  verifySubmitButtonText: {
    // Managed by AppText
  },
  passwordToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  passwordToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  passwordToggleText: {
    // Managed by AppText
  },
  passwordFieldsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 14,
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  passwordInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    // color applied dynamically
  },
  eyeButton: {
    padding: 16,
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    gap: 8,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  changePasswordButtonText: {
    // Managed by AppText
  },
});
