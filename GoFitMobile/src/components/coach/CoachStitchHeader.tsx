import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Bell, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useThemeStore } from '@/store/themeStore';
import { COACH_STITCH, coachStitchOr } from '@/theme/coachStitch';
import { useThemeColors } from '@/theme/useThemeColors';

type Props = {
  showBell?: boolean;
  onBellPress?: () => void;
};

export const CoachStitchHeader: React.FC<Props> = ({ showBell, onBellPress }) => {
  const nav = useNavigation<any>();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const { user, userType } = useAuthStore();
  const { profilePictureUri } = useProfileStore();

  const name = (user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Coach').split(' ')[0];
  const bg = coachStitchOr(isDark, COACH_STITCH.bg, colors.background);
  const brand = coachStitchOr(isDark, COACH_STITCH.primaryContainer, colors.primary);
  const iconColor = coachStitchOr(isDark, COACH_STITCH.primaryContainer, colors.primary);
  const border = coachStitchOr(isDark, COACH_STITCH.surfaceHighest, colors.border ?? 'rgba(0,0,0,0.08)');

  const openProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (userType === 'client') nav.navigate('ProfileMain');
    else nav.getParent()?.navigate('CoachProfile');
  };

  const openSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (userType === 'client') nav.navigate('NotificationsSettings');
    else nav.getParent()?.navigate('CoachProfile', { screen: 'CoachSettings' });
  };

  return (
    <View style={[styles.row, { backgroundColor: bg }]}>
      <TouchableOpacity style={styles.left} onPress={openProfile} activeOpacity={0.85}>
               <LinearGradient
          colors={isDark ? [COACH_STITCH.primary, COACH_STITCH.primaryContainer] : [colors.primary, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.avatarRing, { borderColor: border }]}
        >
          {profilePictureUri ? (
            <Image source={{ uri: profilePictureUri }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: isDark ? COACH_STITCH.surfaceLow : colors.surface }]}>
              <Text style={[styles.avatarLetter, { color: brand }]}>{name[0]?.toUpperCase()}</Text>
            </View>
          )}
        </LinearGradient>
        <Text style={[styles.brand, { color: brand }]}>{userType === 'client' ? 'GOFIT' : 'GOFIT COACH'}</Text>
      </TouchableOpacity>
      <View style={styles.right}>
        {showBell && onBellPress && (
          <TouchableOpacity onPress={onBellPress} hitSlop={12} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Notifications">
            <Bell size={22} color={iconColor} strokeWidth={2} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={openSettings} hitSlop={12} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Settings">
          <Settings size={22} color={iconColor} strokeWidth={2} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    padding: 2,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 18 },
  avatarFallback: { width: '100%', height: '100%', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontFamily: 'Barlow_700Bold', fontSize: 18 },
  brand: { fontFamily: 'Barlow_800ExtraBold', fontSize: 15, letterSpacing: -0.5, textTransform: 'uppercase', flexShrink: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 4 },
});
