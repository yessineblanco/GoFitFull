import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { GradientBackground } from '@/components/shared/GradientBackground';
// Removed BlurView
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfileStore } from '@/store/profileStore';
import { ArrowLeft, Bell, Save, Clock, TestTube, Dumbbell, TrendingUp, Trophy, Info } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { ProfileStackParamList } from '@/types';
import { userProfileService } from '@/services/userProfile';
import { useAuthStore } from '@/store/authStore';
import * as Haptics from 'expo-haptics';
import { notificationService } from '@/services/notifications';
import { logger } from '@/utils/logger';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/store/themeStore';
import { getScaledFontSize } from '@/store/textSizeStore';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity } from '@/utils/colorUtils';

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'NotificationsSettings'>;

interface NotificationsSettingsScreenProps {
  navigation: NavigationProp;
}

export const NotificationsSettingsScreen: React.FC<NotificationsSettingsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile, loadProfile } = useProfileStore();
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();

  // Notification preferences state
  const [workoutReminders, setWorkoutReminders] = useState(true);
  const [achievementNotifications, setAchievementNotifications] = useState(true);
  const [weeklyProgressReports, setWeeklyProgressReports] = useState(true);
  const [notificationTime, setNotificationTime] = useState('09:00'); // Default 9 AM
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [customTimeInput, setCustomTimeInput] = useState('09:00');
  const [testingNotification, setTestingNotification] = useState(false);

  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
      backgroundColor: '#030303',
    },


    header: {
      borderBottomColor: 'rgba(255, 255, 255, 0.05)',
      borderBottomWidth: 1,
    },
    headerTitle: {
      fontSize: getScaledFontSize(18),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
    },
    sectionTitle: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
    },
    timeLabel: {
      fontSize: getScaledFontSize(14),
      color: 'rgba(255, 255, 255, 0.7)',
      fontFamily: 'Barlow_400Regular',
      marginBottom: 4,
    },
    timeValue: {
      fontSize: getScaledFontSize(18),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
    },
    settingTitle: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
      marginBottom: 4,
    },
    settingDescription: {
      fontSize: getScaledFontSize(13),
      color: 'rgba(255, 255, 255, 0.6)',
      fontFamily: 'Barlow_400Regular',
    },
    card: {
      borderRadius: 16,
      overflow: 'hidden' as const,
      borderWidth: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    glowWrapper: {
      padding: 0,
      borderRadius: 16,
      backgroundColor: 'transparent',
    },
    divider: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalContent: {
      backgroundColor: '#030303',
      borderTopColor: theme.colors.primary,
    },
    modalTitle: {
      fontSize: getScaledFontSize(20),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
      marginBottom: 20,
      textAlign: 'center' as const,
    },
    presetTimeText: {
      fontSize: getScaledFontSize(16),
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
      textAlign: 'center' as const,
    },
    presetTimeTextActive: {
      color: '#030303',
    },
    customTimeLabel: {
      fontSize: getScaledFontSize(14),
      color: 'rgba(255, 255, 255, 0.7)',
      fontFamily: 'Barlow_400Regular',
      marginBottom: 12,
    },
    customTimeInput: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      color: '#ffffff',
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    customTimeButtonText: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600' as const,
      color: '#030303',
      fontFamily: 'Barlow_600SemiBold',
    },
    modalCloseButtonText: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
      textAlign: 'center' as const,
    },
    testButtonText: {
      fontSize: getScaledFontSize(14),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
    },
    testCard: {
      flex: 1,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 20,
      paddingVertical: 16,
      paddingHorizontal: 8,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      minHeight: 110,
    },
    testCardIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: 10,
    },
    testCardLabel: {
      fontSize: getScaledFontSize(11),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
      textAlign: 'center' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    infoText: {
      fontSize: getScaledFontSize(12),
      color: 'rgba(255, 255, 255, 0.5)',
      fontFamily: 'Barlow_400Regular',
      lineHeight: 18,
      flex: 1,
    },
    footerCredits: {
      fontSize: getScaledFontSize(11),
      color: 'rgba(255, 255, 255, 0.2)',
      fontFamily: 'Barlow_600SemiBold',
      textAlign: 'center' as const,
      marginTop: 24,
      textTransform: 'uppercase' as const,
      letterSpacing: 2,
    },
  }), [isDark]);

  useEffect(() => {
    // Initialize with current preferences from profile
    const prefs = profile?.notification_preferences;
    if (prefs) {
      setWorkoutReminders(prefs.workout_reminders ?? true);
      setAchievementNotifications(prefs.achievement_notifications ?? true);
      setWeeklyProgressReports(prefs.weekly_progress_reports ?? true);
      setNotificationTime(prefs.notification_time || '09:00');
    }
    setHasChanges(false);
  }, [profile]);

  const handleToggle = (type: 'workout' | 'achievement' | 'weekly', value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHasChanges(true);

    switch (type) {
      case 'workout':
        setWorkoutReminders(value);
        break;
      case 'achievement':
        setAchievementNotifications(value);
        break;
      case 'weekly':
        setWeeklyProgressReports(value);
        break;
    }
  };

  const handleTimeChange = () => {
    setCustomTimeInput(notificationTime);
    setShowTimeModal(true);
  };

  const updateTime = (time: string) => {
    setNotificationTime(time);
    setHasChanges(true);
    setShowTimeModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCustomTimeChange = (text: string) => {
    // Remove any non-digit characters except colon
    let cleaned = text.replace(/[^\d:]/g, '');

    // Auto-format: add colon after 2 digits if not present
    if (cleaned.length === 2 && !cleaned.includes(':')) {
      cleaned = cleaned + ':';
    }
    // Limit to HH:MM format (5 characters max)
    if (cleaned.length > 5) {
      cleaned = cleaned.substring(0, 5);
    }
    // Prevent multiple colons
    const colonCount = (cleaned.match(/:/g) || []).length;
    if (colonCount > 1) {
      cleaned = cleaned.replace(/:/g, '').substring(0, 2) + ':' + cleaned.replace(/:/g, '').substring(2, 4);
    }

    setCustomTimeInput(cleaned);
  };

  const handleCustomTimeSubmit = () => {
    // Validate time format (HH:MM)
    const timeRegex = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
    if (timeRegex.test(customTimeInput)) {
      updateTime(customTimeInput);
    } else {
      dialogManager.error(
        t('notifications.invalidTimeFormat'),
        t('notifications.invalidTimeFormatMessage')
      );
    }
  };

  const presetTimes = [
    { label: '6:00 AM', value: '06:00' },
    { label: '7:00 AM', value: '07:00' },
    { label: '8:00 AM', value: '08:00' },
    { label: '9:00 AM', value: '09:00' },
    { label: '10:00 AM', value: '10:00' },
    { label: '12:00 PM', value: '12:00' },
    { label: '2:00 PM', value: '14:00' },
    { label: '4:00 PM', value: '16:00' },
    { label: '6:00 PM', value: '18:00' },
    { label: '8:00 PM', value: '20:00' },
    { label: '9:00 PM', value: '21:00' },
  ];

  const handleTestNotification = async (type: 'workout' | 'progress' | 'achievement') => {
    setTestingNotification(true);
    try {
      // Request permissions first
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) {
        dialogManager.warning(t('notifications.permissionRequired'), t('notifications.permissionRequiredMessage'));
        return;
      }

      await notificationService.sendTestNotification(type);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      dialogManager.error(t('common.error'), t('notifications.testNotificationError'));
      logger.error('Error sending test notification:', error);
    } finally {
      setTestingNotification(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) {
      dialogManager.error(t('common.error'), t('account.userNotFound'));
      return;
    }

    setSaving(true);
    try {
      // Update notification preferences
      await userProfileService.updateUserProfile(user.id, {
        notificationPreferences: {
          workout_reminders: workoutReminders,
          achievement_notifications: achievementNotifications,
          weekly_progress_reports: weeklyProgressReports,
          notification_time: notificationTime,
        },
      });

      // Update scheduled notifications (may not work fully in Expo Go, but preferences are saved)
      try {
        await notificationService.updateScheduledNotifications({
          workoutReminders,
          achievementNotifications,
          weeklyProgressReports,
          notificationTime,
        });
      } catch (error) {
        // Notifications may not work in Expo Go, but preferences are still saved
        logger.warn('Could not schedule notifications (may not be fully supported in Expo Go):', error);
      }

      await loadProfile();
      setHasChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      dialogManager.success(
        t('common.success'),
        t('notifications.preferencesSaved')
      );
      navigation.goBack();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('notifications.failedToUpdate');
      dialogManager.error(t('common.error'), errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <GradientBackground style={dynamicStyles.container}>

      {/* Header */}
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={BRAND_WHITE} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>{t('notifications.title')}</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, (!hasChanges || saving) && styles.saveButtonDisabled]}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Save size={24} color={hasChanges ? BRAND_PRIMARY : 'rgba(255, 255, 255, 0.3)'} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: 20 + insets.bottom,
            flexGrow: 1,
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Notification Time Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={20} color={BRAND_PRIMARY} />
            <Text style={dynamicStyles.sectionTitle}>{t('notifications.notificationTime')}</Text>
          </View>

          <View style={dynamicStyles.glowWrapper}>
            <View style={styles.card}>
              <TouchableOpacity
                style={styles.timeRow}
                onPress={handleTimeChange}
                activeOpacity={0.7}
              >
                <View style={styles.timeRowLeft}>
                  <Text style={dynamicStyles.timeLabel}>{t('notifications.preferredTime')}</Text>
                  <Text style={dynamicStyles.timeValue}>{formatTime(notificationTime)}</Text>
                </View>
                <Clock size={20} color={BRAND_PRIMARY} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Notification Types Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={BRAND_PRIMARY} />
            <Text style={dynamicStyles.sectionTitle}>{t('notifications.notificationTypes')}</Text>
          </View>

          <View style={dynamicStyles.glowWrapper}>
            <View style={styles.card}>
              {/* Workout Reminders */}
              <View style={styles.settingRow}>
                <View style={styles.settingRowLeft}>
                  <Text style={dynamicStyles.settingTitle}>{t('notifications.workoutReminders')}</Text>
                  <Text style={dynamicStyles.settingDescription}>
                    {t('notifications.workoutRemindersDesc')}
                  </Text>
                </View>
                <Switch
                  value={workoutReminders}
                  onValueChange={(value) => handleToggle('workout', value)}
                  trackColor={{ false: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(3, 3, 3, 0.2)', true: BRAND_PRIMARY }}
                  thumbColor={BRAND_WHITE}
                  ios_backgroundColor={isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(3, 3, 3, 0.2)"}
                />
              </View>

              <View style={[styles.divider, dynamicStyles.divider]} />

              {/* Achievement Notifications */}
              <View style={styles.settingRow}>
                <View style={styles.settingRowLeft}>
                  <Text style={dynamicStyles.settingTitle}>{t('notifications.achievementNotifications')}</Text>
                  <Text style={dynamicStyles.settingDescription}>
                    {t('notifications.achievementNotificationsDesc')}
                  </Text>
                </View>
                <Switch
                  value={achievementNotifications}
                  onValueChange={(value) => handleToggle('achievement', value)}
                  trackColor={{ false: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(3, 3, 3, 0.2)', true: BRAND_PRIMARY }}
                  thumbColor={BRAND_WHITE}
                  ios_backgroundColor={isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(3, 3, 3, 0.2)"}
                />
              </View>

              <View style={[styles.divider, dynamicStyles.divider]} />

              {/* Weekly Progress Reports */}
              <View style={styles.settingRow}>
                <View style={styles.settingRowLeft}>
                  <Text style={dynamicStyles.settingTitle}>{t('notifications.weeklyProgressReports')}</Text>
                  <Text style={dynamicStyles.settingDescription}>
                    {t('notifications.weeklyProgressReportsDesc')}
                  </Text>
                </View>
                <Switch
                  value={weeklyProgressReports}
                  onValueChange={(value) => handleToggle('weekly', value)}
                  trackColor={{ false: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(3, 3, 3, 0.2)', true: BRAND_PRIMARY }}
                  thumbColor={BRAND_WHITE}
                  ios_backgroundColor={isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(3, 3, 3, 0.2)"}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Test Notification Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <TestTube size={20} color={BRAND_PRIMARY} />
            <Text style={dynamicStyles.sectionTitle}>{t('notifications.testNotification')}</Text>
          </View>


          <View style={styles.testCardRow}>
            {/* Workout Test Card */}
            <TouchableOpacity
              style={[dynamicStyles.testCard, testingNotification && styles.testButtonDisabled]}
              onPress={() => handleTestNotification('workout')}
              disabled={testingNotification}
              activeOpacity={0.7}
            >
              <View style={dynamicStyles.testCardIconContainer}>
                <Dumbbell size={22} color={BRAND_PRIMARY} />
              </View>
              <Text style={dynamicStyles.testCardLabel} numberOfLines={1} adjustsFontSizeToFit>Workout</Text>
            </TouchableOpacity>

            {/* Progress Test Card */}
            <TouchableOpacity
              style={[dynamicStyles.testCard, testingNotification && styles.testButtonDisabled]}
              onPress={() => handleTestNotification('progress')}
              disabled={testingNotification}
              activeOpacity={0.7}
            >
              <View style={dynamicStyles.testCardIconContainer}>
                <TrendingUp size={22} color={BRAND_PRIMARY} />
              </View>
              <Text style={dynamicStyles.testCardLabel} numberOfLines={1} adjustsFontSizeToFit>Progress</Text>
            </TouchableOpacity>

            {/* Achievement Test Card */}
            <TouchableOpacity
              style={[dynamicStyles.testCard, testingNotification && styles.testButtonDisabled]}
              onPress={() => handleTestNotification('achievement')}
              disabled={testingNotification}
              activeOpacity={0.7}
            >
              <View style={dynamicStyles.testCardIconContainer}>
                <Trophy size={22} color={BRAND_PRIMARY} />
              </View>
              <Text style={dynamicStyles.testCardLabel} numberOfLines={1} adjustsFontSizeToFit>Achievement</Text>
            </TouchableOpacity>
          </View>

          {testingNotification && (
            <ActivityIndicator size="small" color={BRAND_PRIMARY} style={styles.testLoading} />
          )}
        </View>

        {/* Footer info */}
        <View style={styles.footerContainer}>
          <View style={styles.infoBox}>
            <Info size={16} color={BRAND_PRIMARY} style={{ opacity: 0.6 }} />
            <Text style={dynamicStyles.infoText}>
              Consistent notifications help you stay on track with your fitness habits and achieve your goals faster.
            </Text>
          </View>
          <Text style={dynamicStyles.footerCredits}>GoFit Premium Experience</Text>
        </View>
      </ScrollView>

      {/* Time Selection Modal */}
      <Modal
        visible={showTimeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, dynamicStyles.modalContent]}>
            <Text style={dynamicStyles.modalTitle}>{t('notifications.selectNotificationTime')}</Text>

            {/* Preset Times */}
            <ScrollView style={styles.presetTimesContainer} showsVerticalScrollIndicator={false}>
              {presetTimes.map((preset) => (
                <TouchableOpacity
                  key={preset.value}
                  style={[
                    styles.presetTimeButton,
                    notificationTime === preset.value && styles.presetTimeButtonActive,
                  ]}
                  onPress={() => updateTime(preset.value)}
                >
                  <Text
                    style={[
                      dynamicStyles.presetTimeText,
                      notificationTime === preset.value && dynamicStyles.presetTimeTextActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Custom Time Input */}
            <View style={styles.customTimeContainer}>
              <Text style={dynamicStyles.customTimeLabel}>{t('notifications.orEnterCustomTime')}</Text>
              <View style={styles.customTimeRow}>
                <TextInput
                  style={[styles.customTimeInput, dynamicStyles.customTimeInput]}
                  value={customTimeInput}
                  onChangeText={handleCustomTimeChange}
                  placeholder="09:30"
                  placeholderTextColor={isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(3, 3, 3, 0.4)"}
                  keyboardType="default"
                  maxLength={5}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.customTimeButton}
                  onPress={handleCustomTimeSubmit}
                >
                  <Text style={dynamicStyles.customTimeButtonText}>{t('notifications.set')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTimeModal(false)}
            >
              <Text style={dynamicStyles.modalCloseButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  timeRowLeft: {
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingRowLeft: {
    flex: 1,
    marginRight: 16,
  },
  divider: {
    height: 1,
    marginLeft: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
    borderTopWidth: 2,
  },
  presetTimesContainer: {
    maxHeight: 300,
    marginBottom: 20,
  },
  presetTimeButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  presetTimeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  customTimeContainer: {
    marginTop: 10,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  customTimeRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  customTimeInput: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Barlow_400Regular',
    borderWidth: 1,
    textAlign: 'center',
  },
  customTimeButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  testButtonRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  testButton: {
    flex: 1,
    minWidth: 100,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testButtonDisabled: {
    opacity: 0.5,
  },
  testLoading: {
    marginTop: 12,
  },
  testCardRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  footerContainer: {
    marginTop: 8,
    paddingTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
});

