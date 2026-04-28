import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, ClipboardCheck } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { checkInsService, type CheckInSchedule } from '@/services/checkIns';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { getBlurTint, getGlassBorder, getTextColor, getTextSecondaryColor } from '@/utils/colorUtils';

export function CheckInHomeCard() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { t } = useTranslation();
  const { isDark } = useThemeStore();
  const [dueSchedules, setDueSchedules] = useState<CheckInSchedule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isFocused) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const state = await checkInsService.getClientCheckInState();
        if (!cancelled) setDueSchedules(state.dueSchedules);
      } catch {
        if (!cancelled) setDueSchedules([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [isFocused]);

  if (dueSchedules.length === 0) return null;

  const text = getTextColor(isDark);
  const muted = getTextSecondaryColor(isDark);
  const border = getGlassBorder(isDark);
  const firstSchedule = dueSchedules[0];

  return (
    <View style={[styles.outer, { borderColor: border }]}>
      <TouchableOpacity
        activeOpacity={0.84}
        disabled={loading || !firstSchedule}
        onPress={() => {
          if (!firstSchedule) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('CheckIn');
        }}
      >
        <BlurView
          intensity={isDark ? 80 : 60}
          tint={getBlurTint(isDark)}
          style={[
            styles.glass,
            { backgroundColor: isDark ? 'rgba(10, 10, 10, 0.42)' : 'rgba(255, 255, 255, 0.72)' },
          ]}
        >
          <LinearGradient
            colors={
              isDark
                ? ['rgba(180,240,78,0.12)', 'rgba(255,255,255,0.03)']
                : ['rgba(132,196,65,0.14)', 'rgba(255,255,255,0.28)']
            }
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.content}>
            <View style={[styles.iconBox, { borderColor: border }]}>
              <ClipboardCheck size={22} color={theme.colors.primary} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: text }]}>{t('checkIns.dueTitle')}</Text>
              <Text style={[styles.subtitle, { color: muted }]} numberOfLines={2}>
                {dueSchedules.length > 1
                  ? t('checkIns.dueCount', { count: dueSchedules.length })
                  : t('checkIns.dueSubtitle')}
              </Text>
            </View>
            <View style={[styles.chevron, { borderColor: border }]}>
              {loading ? <ActivityIndicator color={theme.colors.primary} /> : <ChevronRight size={17} color={muted} />}
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: getResponsiveSpacing(22),
    marginBottom: getResponsiveSpacing(12),
    borderRadius: getResponsiveSpacing(24),
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  glass: {
    padding: getResponsiveSpacing(18),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSpacing(14),
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(180,240,78,0.08)',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(theme.typography.h4.fontSize),
    letterSpacing: 0.3,
  },
  subtitle: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    marginTop: 6,
    lineHeight: getResponsiveFontSize(17),
  },
  chevron: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
});
