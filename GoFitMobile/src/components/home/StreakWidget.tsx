import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { format, parseISO, isValid } from 'date-fns';
import { useSessionsStore } from '@/store/sessionsStore';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { getBlurTint, getGlassBorder, getTextColor, getTextSecondaryColor } from '@/utils/colorUtils';

function formatLastDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? parseISO(iso) : new Date(iso);
    if (!isValid(d)) return iso;
    return format(d, 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

export const StreakWidget: React.FC = () => {
  const { isDark } = useThemeStore();
  const getStreakMetrics = useSessionsStore((state) => state.getStreakMetrics);
  const metrics = getStreakMetrics();

  const statusText = metrics.workedOutToday
    ? 'Workout logged today'
    : metrics.daysSinceLastWorkout === 0
      ? 'Ready for today'
      : metrics.daysSinceLastWorkout === 1
        ? 'Last workout was yesterday'
        : metrics.daysSinceLastWorkout
          ? `${metrics.daysSinceLastWorkout} days since last workout`
          : 'Start your first streak';

  const lastLabel = formatLastDate(metrics.lastWorkoutDate);
  const metaLine = `Best ${metrics.longestStreak} ${
    metrics.longestStreak === 1 ? 'day' : 'days'
  } · Last ${lastLabel}`;

  return (
    <View style={[styles.outer, { borderColor: getGlassBorder(isDark) }]}>
      <BlurView
        intensity={isDark ? 80 : 60}
        tint={getBlurTint(isDark)}
        style={[
          styles.glass,
          {
            backgroundColor: isDark ? 'rgba(10, 10, 10, 0.4)' : 'rgba(255, 255, 255, 0.7)',
          },
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']
              : ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.2)']
          }
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.copy}>
            <Text style={[styles.title, { color: getTextColor(isDark) }]}>Workout streak</Text>
            <Text style={[styles.sub, { color: getTextSecondaryColor(isDark) }]} numberOfLines={2}>
              {statusText}
            </Text>
            <Text
              style={[styles.meta, { color: getTextSecondaryColor(isDark) }]}
              numberOfLines={2}
            >
              {metaLine}
            </Text>
          </View>

          <View
            style={[
              styles.count,
              {
                borderColor: getGlassBorder(isDark),
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)',
              },
            ]}
          >
            <Text style={[styles.countValue, { color: getTextColor(isDark) }]}>
              {metrics.currentStreak}
            </Text>
            <Text style={[styles.countLabel, { color: getTextSecondaryColor(isDark) }]}>
              {metrics.currentStreak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>
      </BlurView>
    </View>
  );
};

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
    padding: getResponsiveSpacing(20),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: getResponsiveSpacing(14),
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
  sub: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    marginTop: 6,
    lineHeight: getResponsiveFontSize(17),
  },
  meta: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(11),
    marginTop: 10,
    opacity: 0.95,
  },
  count: {
    minWidth: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: getResponsiveSpacing(20),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countValue: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(22),
  },
  countLabel: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(10),
    marginTop: 2,
    textTransform: 'lowercase',
  },
});
