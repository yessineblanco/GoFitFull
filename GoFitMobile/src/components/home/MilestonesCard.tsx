import React, { useEffect, useMemo, useState } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Award, CheckCircle2, Send } from 'lucide-react-native';
import { SectionHeader } from '@/components/home/SectionHeader';
import { useDailyCoachStore } from '@/stores/dailyCoachStore';
import { useSessionsStore } from '@/store/sessionsStore';
import { buildMilestones, type Milestone } from '@/services/milestones';
import { nutritionService, type WeeklyNutritionSummary } from '@/services/nutrition';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getGlassBg, getGlassBorder, getTextColor, getTextSecondaryColor } from '@/utils/colorUtils';
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
    <View style={styles.container}>
      <SectionHeader title="Milestones" showSeeAll={false} />
      <View style={styles.grid}>
        {milestones.map((milestone) => (
          <MilestoneItem key={milestone.id} milestone={milestone} text={text} muted={muted} glass={glass} border={border} />
        ))}
      </View>
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
        {milestone.achieved ? <CheckCircle2 size={17} color={theme.colors.primary} /> : <Award size={17} color={theme.colors.primary} />}
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
          <Send size={13} color="#0a0a0a" />
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: getResponsiveSpacing(24),
  },
  grid: {
    paddingHorizontal: getResponsiveSpacing(20),
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
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(11),
  },
  title: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(13),
  },
  detail: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(11),
    lineHeight: getResponsiveFontSize(15),
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
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(11),
    textTransform: 'uppercase',
  },
});
