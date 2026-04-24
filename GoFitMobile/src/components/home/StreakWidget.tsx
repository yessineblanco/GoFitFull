import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Trophy, CalendarClock } from 'lucide-react-native';
import { useSessionsStore } from '@/store/sessionsStore';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import {
  getBlurTint,
  getGlassBorder,
  getTextColor,
  getTextSecondaryColor,
} from '@/utils/colorUtils';

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

  return (
    <View style={styles.container}>
      <BlurView
        intensity={isDark ? 22 : 38}
        tint={getBlurTint(isDark)}
        style={[
          styles.card,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.65)',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <LinearGradient
          colors={isDark ? ['rgba(132,196,65,0.09)', 'rgba(132,196,65,0.02)', 'transparent'] : ['rgba(132,196,65,0.08)', 'rgba(132,196,65,0.02)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.content}>
          <View style={styles.left}>
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: isDark ? 'rgba(132,196,65,0.1)' : 'rgba(132,196,65,0.12)',
                  borderColor: getGlassBorder(isDark),
                },
              ]}
            >
              <Flame size={21} color={theme.colors.primary} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: getTextColor(isDark) }]}>Workout streak</Text>
              <Text style={[styles.sub, { color: getTextSecondaryColor(isDark) }]} numberOfLines={1}>
                {statusText}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Trophy size={13} color={theme.colors.primary} />
                  <Text style={[styles.metaText, { color: getTextSecondaryColor(isDark) }]}>
                    Best {metrics.longestStreak}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <CalendarClock size={13} color={theme.colors.primary} />
                  <Text style={[styles.metaText, { color: getTextSecondaryColor(isDark) }]} numberOfLines={1}>
                    {metrics.lastWorkoutDate || 'No workouts yet'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View
            style={[
              styles.countPill,
              {
                backgroundColor: isDark ? 'rgba(3,3,3,0.35)' : 'rgba(255,255,255,0.75)',
                borderColor: getGlassBorder(isDark),
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
  container: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 18,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minWidth: 0,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(16),
  },
  sub: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    marginTop: 3,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getResponsiveSpacing(8),
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(11),
  },
  countPill: {
    width: 58,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  countValue: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(18),
    lineHeight: getResponsiveFontSize(22),
  },
  countLabel: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(10),
    marginTop: -1,
  },
});
