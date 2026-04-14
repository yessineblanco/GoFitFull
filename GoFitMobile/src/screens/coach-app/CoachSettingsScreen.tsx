import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Bell,
  Clock,
  Eye,
  Shield,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useCoachStore } from '@/store/coachStore';
import { useProfileStore } from '@/store/profileStore';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/config/supabase';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getBackgroundColor, getGlassBg, getGlassBorder } from '@/utils/colorUtils';

const PRIMARY_GREEN = '#B4F04E';
const CANCELLATION_OPTIONS = ['flexible', 'moderate', 'strict'] as const;
const DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;

export const CoachSettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { profile: coachProfile, updateProfile } = useCoachStore();
  const { profile: userProfile } = useProfileStore();
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();

  const notifPrefs = userProfile?.notification_preferences as any || {};
  const [bookingNotifs, setBookingNotifs] = useState(notifPrefs.booking_notifications !== false);
  const [messageNotifs, setMessageNotifs] = useState(notifPrefs.message_notifications !== false);
  const [reviewNotifs, setReviewNotifs] = useState(notifPrefs.review_notifications !== false);
  const [profileVisible, setProfileVisible] = useState(coachProfile?.status === 'approved');
  const [cancellationPolicy, setCancellationPolicy] = useState(coachProfile?.cancellation_policy || 'flexible');
  const [sessionDuration, setSessionDuration] = useState(60);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (coachProfile) {
      setProfileVisible(coachProfile.status === 'approved');
      setCancellationPolicy(coachProfile.cancellation_policy || 'flexible');
    }
  }, [coachProfile]);

  const saveNotificationPref = async (key: string, value: boolean) => {
    try {
      const updated = { ...notifPrefs, [key]: value };
      const { error } = await supabase
        .from('user_profiles')
        .update({ notification_preferences: updated })
        .eq('id', user?.id);
      if (error) throw error;
    } catch {
      dialogManager.error('Error', 'Failed to save notification preference');
    }
  };

  const handleToggleBooking = (v: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBookingNotifs(v);
    saveNotificationPref('booking_notifications', v);
  };

  const handleToggleMessage = (v: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMessageNotifs(v);
    saveNotificationPref('message_notifications', v);
  };

  const handleToggleReview = (v: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setReviewNotifs(v);
    saveNotificationPref('review_notifications', v);
  };

  const handleToggleVisibility = async (v: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProfileVisible(v);
    try {
      await updateProfile({ status: v ? 'approved' : 'pending' } as any);
    } catch {
      setProfileVisible(!v);
      dialogManager.error('Error', 'Failed to update profile visibility');
    }
  };

  const openAvailability = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.getParent()?.navigate('Calendar', { screen: 'Availability' });
  };

  const showDurationPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Default Session Duration',
      'Select your default session length',
      DURATION_OPTIONS.map((mins) => ({
        text: `${mins} min`,
        onPress: () => setSessionDuration(mins),
      })),
    );
  };

  const showPolicyPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Cancellation Policy',
      'flexible = free cancel anytime\nmoderate = 12h notice\nstrict = 24h notice',
      CANCELLATION_OPTIONS.map((p) => ({
        text: p.charAt(0).toUpperCase() + p.slice(1),
        onPress: async () => {
          setCancellationPolicy(p);
          try {
            await updateProfile({ cancellation_policy: p } as any);
          } catch {
            dialogManager.error('Error', 'Failed to update cancellation policy');
          }
        },
      })),
    );
  };

  const handleChangePassword = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!user?.email) return;
    dialogManager.show(
      'Reset Password',
      `We'll send a password reset link to ${user.email}`,
      'info',
      {
        showCancel: true,
        confirmText: 'Send',
        onConfirm: async () => {
          try {
            await supabase.auth.resetPasswordForEmail(user.email!);
            dialogManager.success('Sent', 'Check your email for the reset link');
          } catch {
            dialogManager.error('Error', 'Failed to send reset email');
          }
        },
      },
    );
  };

  const switchTrackFalse = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
  const switchThumbOff = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.25)';
  const chevronColor = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)';
  const dividerColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const iconWrapBg = isDark ? 'rgba(180,240,78,0.08)' : 'rgba(132,196,65,0.1)';

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
      <LinearGradient
        colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : [colors.background, '#EAF0EA', colors.background]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Notifications</Text>
        <View style={[styles.card, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
          <View style={styles.toggleRow}>
            <View style={[styles.iconWrap, { backgroundColor: iconWrapBg }]}>
              <Bell size={20} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Booking Notifications</Text>
            <Switch
              value={bookingNotifs}
              onValueChange={handleToggleBooking}
              trackColor={{ false: switchTrackFalse, true: 'rgba(180,240,78,0.35)' }}
              thumbColor={bookingNotifs ? PRIMARY_GREEN : switchThumbOff}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <View style={styles.toggleRow}>
            <View style={[styles.iconWrap, { backgroundColor: iconWrapBg }]}>
              <Bell size={20} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Message Notifications</Text>
            <Switch
              value={messageNotifs}
              onValueChange={handleToggleMessage}
              trackColor={{ false: switchTrackFalse, true: 'rgba(180,240,78,0.35)' }}
              thumbColor={messageNotifs ? PRIMARY_GREEN : switchThumbOff}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <View style={styles.toggleRow}>
            <View style={[styles.iconWrap, { backgroundColor: iconWrapBg }]}>
              <Bell size={20} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Review Notifications</Text>
            <Switch
              value={reviewNotifs}
              onValueChange={handleToggleReview}
              trackColor={{ false: switchTrackFalse, true: 'rgba(180,240,78,0.35)' }}
              thumbColor={reviewNotifs ? PRIMARY_GREEN : switchThumbOff}
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Session defaults</Text>
        <View style={[styles.card, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
          <TouchableOpacity style={styles.navRow} onPress={showDurationPicker} activeOpacity={0.7}>
            <View style={[styles.iconWrap, { backgroundColor: iconWrapBg }]}>
              <Clock size={20} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Default Session Duration</Text>
            <View style={styles.navRight}>
              <Text style={styles.valueText}>{sessionDuration} min</Text>
              <ChevronRight size={18} color={chevronColor} />
            </View>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <TouchableOpacity style={styles.navRowMulti} onPress={showPolicyPicker} activeOpacity={0.7}>
            <View style={[styles.iconWrap, { backgroundColor: iconWrapBg }]}>
              <Shield size={20} color={colors.primary} />
            </View>
            <View style={styles.navMid}>
              <Text style={[styles.navTitle, { color: colors.text }]}>Cancellation Policy</Text>
              <Text style={[styles.policyHint, { color: colors.textLight }]} numberOfLines={1}>
                {cancellationPolicy === 'flexible' ? 'Free cancel anytime' :
                 cancellationPolicy === 'moderate' ? '12h notice required' :
                 '24h notice required'}
              </Text>
            </View>
            <View style={styles.navRight}>
              <Text style={styles.valueText}>{cancellationPolicy}</Text>
              <ChevronRight size={18} color={chevronColor} />
            </View>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Profile</Text>
        <View style={[styles.card, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
          <View style={styles.toggleRow}>
            <View style={[styles.iconWrap, { backgroundColor: iconWrapBg }]}>
              <Eye size={20} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Profile Visibility</Text>
            <Switch
              value={profileVisible}
              onValueChange={handleToggleVisibility}
              trackColor={{ false: switchTrackFalse, true: 'rgba(180,240,78,0.35)' }}
              thumbColor={profileVisible ? PRIMARY_GREEN : switchThumbOff}
            />
          </View>
          <View style={[styles.divider, { backgroundColor: dividerColor }]} />
          <TouchableOpacity style={styles.navRow} onPress={openAvailability} activeOpacity={0.7}>
            <View style={[styles.iconWrap, { backgroundColor: iconWrapBg }]}>
              <Clock size={20} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Edit Availability</Text>
            <ChevronRight size={18} color={chevronColor} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Account</Text>
        <View style={[styles.card, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
          <TouchableOpacity style={styles.navRow} onPress={handleChangePassword} activeOpacity={0.7}>
            <View style={[styles.iconWrap, { backgroundColor: iconWrapBg }]}>
              <Shield size={20} color={colors.primary} />
            </View>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Change Password</Text>
            <ChevronRight size={18} color={chevronColor} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: { padding: 8, width: 40 },
  headerSpacer: { width: 40 },
  headerTitle: {
    flex: 1,
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(20),
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 4 },
  sectionLabel: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 10,
    marginTop: 8,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(180,240,78,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  navRowMulti: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  navMid: { flex: 1, minWidth: 0 },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  navTitle: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(15),
    color: '#FFFFFF',
  },
  rowLabel: {
    flex: 1,
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(15),
    color: '#FFFFFF',
  },
  valueText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(180,240,78,0.85)',
  },
  policyHint: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.42)',
    marginTop: 4,
    lineHeight: 17,
  },
  chevronAlign: { marginTop: 10 },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: 16,
  },
});
