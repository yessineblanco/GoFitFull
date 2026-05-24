import React, { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Award, CheckCircle2, Send } from 'lucide-react-native';
import { useDailyCoachStore } from '@/stores/dailyCoachStore';
import { useSessionsStore } from '@/store/sessionsStore';
import { buildMilestones, type Milestone } from '@/services/milestones';
import { nutritionService, type WeeklyNutritionSummary } from '@/services/nutrition';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getBlurTint, getGlassBg, getGlassBorder, getTextColor, getTextSecondaryColor } from '@/utils/colorUtils';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';

const todayKey = () => new Date().toISOString().slice(0, 10);

export function MilestonesCard() {
  const { isDark } = useThemeStore();
  const { habits, loadHabits } = useDailyCoachStore();
  const { getTotalWorkouts, getStreakMetrics, sessions } = useSessionsStore();
  const [weeklyNutrition, setWeeklyNutrition] = useState<WeeklyNutritionSummary | null>(null);

  useEffect(() => {
    void loadHabits();
    let cancelled = false;

    (async () => {
      try {
        const goals = await nutritionService.getOrCreateGoals();
        const summary = await nutritionService.getWeeklySummary(todayKey(), goals);
        if (!cancelled) setWeeklyNutrition(summary);
      } catch {
        if (!cancelled) setWeeklyNutrition(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadHabits]);

  const milestones = useMemo(
    () =>
      buildMilestones({
        totalWorkouts: getTotalWorkouts(),
        streakMetrics: getStreakMetrics(),
        habits,
        weeklyNutrition,
      }),
    [getStreakMetrics, getTotalWorkouts, habits, sessions, weeklyNutrition],
  );

  const text = getTextColor(isDark);
  const muted = getTextSecondaryColor(isDark);
  const glass = getGlassBg(isDark);
  const border = getGlassBorder(isDark);

  return (
    <View style={[styles.outer, { borderColor: border }]}>
      <BlurView
        intensity={isDark ? 80 : 60}
        tint={getBlurTint(isDark)}
        style={[styles.glass, { backgroundColor: isDark ? 'rgba(10, 10, 10, 0.4)' : 'rgba(255, 255, 255, 0.7)' }]}
      >
        <LinearGradient
          colors={isDark ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] : ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.2)']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={[styles.heading, { color: text }]}>Milestones</Text>
        <View style={styles.grid}>
          {milestones.map((milestone) => (
            <MilestoneItem key={milestone.id} milestone={milestone} text={text} muted={muted} glass={glass} border={border} />
          ))}
        </View>
      </BlurView>
    </View>
  );
}

function MilestoneItem({
  milestone,
  text,
  muted,
  glass,
  border,
}: {
  milestone: Milestone;
  text: string;
  muted: string;
  glass: string;
  border: string;
}) {
  const pct = Math.round((milestone.progress / Math.max(1, milestone.target)) * 100);
  const onShare = () => {
    void Share.share({
      message: `I unlocked a GoFit milestone: ${milestone.title}.`,
    });
  };

  return (
    <View style={[styles.item, { backgroundColor: glass, borderColor: milestone.achieved ? 'rgba(132,196,65,0.5)' : border }]}>
      <View style={styles.itemHeader}>
        {milestone.achieved ? (
          <CheckCircle2 size={16} color={theme.colors.primary} strokeWidth={2.2} />
        ) : (
          <Award size={16} color={theme.colors.primary} strokeWidth={2.2} />
        )}
        <Text style={[styles.percent, { color: theme.colors.primary }]}>{Math.min(100, pct)}%</Text>
      </View>
      <Text style={[styles.title, { color: text }]} numberOfLines={1}>
        {milestone.title}
      </Text>
      <Text style={[styles.detail, { color: muted }]} numberOfLines={2}>
        {milestone.detail}
      </Text>
      <View style={[styles.track, { backgroundColor: border }]}>
        <View style={[styles.fill, { width: `${Math.min(100, pct)}%` }]} />
      </View>
      {milestone.achieved ? (
        <TouchableOpacity onPress={onShare} activeOpacity={0.8} style={styles.shareButton}>
          <Send size={12} color="#0a0a0a" strokeWidth={2.2} />
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: getResponsiveSpacing(22),
    marginBottom: getResponsiveSpacing(24),
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
  heading: {
    fontSize: getResponsiveFontSize(17),
    fontFamily: 'Designer',
    fontWeight: 'normal',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: getResponsiveSpacing(16),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getResponsiveSpacing(10),
  },
  item: {
    width: '48%',
    minHeight: 128,
    borderRadius: getResponsiveSpacing(16),
    borderWidth: 1,
    padding: getResponsiveSpacing(13),
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSpacing(10),
  },
  percent: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(10),
  },
  title: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(11),
  },
  detail: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(10),
    lineHeight: getResponsiveFontSize(14),
    marginTop: getResponsiveSpacing(4),
    minHeight: getResponsiveFontSize(30),
  },
  track: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 'auto',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  shareButton: {
    marginTop: getResponsiveSpacing(10),
    minHeight: 30,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  shareText: {
    color: '#0a0a0a',
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(10),
    textTransform: 'uppercase',
  },
});
