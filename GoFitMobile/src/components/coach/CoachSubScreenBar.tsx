import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { COACH_STITCH, coachStitchOr } from '@/theme/coachStitch';
import { getResponsiveFontSize } from '@/utils/responsive';

type Props = {
  title?: string;
  /** When false, only safe-area top padding + optional right slot (no title text). */
  showTitle?: boolean;
  right?: React.ReactNode;
};

export const CoachSubScreenBar: React.FC<Props> = ({ title = '', showTitle = true, right }) => {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<any>();
  const { userType } = useAuthStore();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();

  const onSurface = coachStitchOr(isDark, COACH_STITCH.onSurface, colors.text);
  const accent = coachStitchOr(isDark, COACH_STITCH.primaryContainer, colors.primary);

  const openSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (userType === 'client') nav.navigate('NotificationsSettings');
    else nav.getParent()?.navigate('CoachProfile', { screen: 'CoachSettings' });
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 8 }]}>
      {showTitle ? (
        <Text style={[styles.title, { color: onSurface }]} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={styles.titleSpacer} />
      )}
      {right ?? (
        <TouchableOpacity onPress={openSettings} hitSlop={12} accessibilityRole="button" accessibilityLabel="Settings">
          <Settings size={22} color={accent} strokeWidth={2} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 12,
  },
  title: {
    flex: 1,
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(26),
    letterSpacing: -0.6,
  },
  titleSpacer: { flex: 1 },
});
