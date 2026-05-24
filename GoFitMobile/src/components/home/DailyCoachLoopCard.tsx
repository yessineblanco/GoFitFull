import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Apple, CheckCircle2, Circle, Dumbbell, Footprints, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { checkInsService, type CheckInResponse } from '@/services/checkIns';
import { computeReadiness, saveReadinessSnapshot, type ReadinessResult } from '@/services/readiness';
import { nutritionService, type DayTotals, type NutritionGoals } from '@/services/nutrition';
import { useDailyCoachStore } from '@/stores/dailyCoachStore';
import { useHealthStore } from '@/store/healthStore';
import { useSessionsStore } from '@/store/sessionsStore';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getBlurTint, getGlassBg, getGlassBorder, getTextColor, getTextSecondaryColor } from '@/utils/colorUtils';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';

const BRAND = '#84c441';

const todayKey = () => new Date().toISOString().slice(0, 10);

function formatSteps(steps: number) {
  if (steps >= 1000) return `${Math.round(steps / 100) / 10}k`;
  return String(steps);
}

export function DailyCoachLoopCard() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { isDark } = useThemeStore();
  const { today: healthToday } = useHealthStore();
  const { sessions, getStreakMetrics } = useSessionsStore();
  const { habits, habitsUnavailable, isLoadingHabits, loadHabits, toggleHabit } = useDailyCoachStore();
  const [nutritionGoals, setNutritionGoals] = useState<NutritionGoals | null>(null);
  const [nutritionTotals, setNutritionTotals] = useState<DayTotals | null>(null);
  const [checkIn, setCheckIn] = useState<CheckInResponse | null>(null);

  useEffect(() => {
    if (!isFocused) return;
    let cancelled = false;

    void loadHabits();
    (async () => {
      try {
        const [goals, totals, state] = await Promise.all([
          nutritionService.getOrCreateGoals(),
          nutritionService.getDayTotals(todayKey()),
          checkInsService.getClientCheckInState(),
        ]);
        if (!cancelled) {
          setNutritionGoals(goals);
          setNutritionTotals(totals);
          setCheckIn(state.completedToday[0] ?? null);
        }
      } catch {
        if (!cancelled) {
          setNutritionGoals(null);
          setNutritionTotals(null);
          setCheckIn(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isFocused, loadHabits]);

  const streakMetrics = useMemo(() => getStreakMetrics(), [getStreakMetrics, sessions]);
  const readiness: ReadinessResult = useMemo(
    () =>
      computeReadiness({
        healthToday,
        nutritionGoals,
        nutritionTotals,
        checkIn,
        habits,
        streakMetrics,
      }),
    [checkIn, habits, healthToday, nutritionGoals, nutritionTotals, streakMetrics],
  );

  useEffect(() => {
    void saveReadinessSnapshot(readiness);
  }, [readiness]);

  const text = getTextColor(isDark);
  const muted = getTextSecondaryColor(isDark);
  const border = getGlassBorder(isDark);
  const completedHabits = habits.filter((habit) => habit.completed).length;
  const nutritionPct =
    nutritionGoals && nutritionTotals
      ? Math.min(100, Math.round((nutritionTotals.calories / Math.max(1, nutritionGoals.calories_goal)) * 100))
      : 0;
  const ctaLabel = streakMetrics.workedOutToday ? 'Log nutrition' : 'Start workout';

  return (
    <View style={[styles.outer, { borderColor: border }]}>
      <BlurView
        intensity={isDark ? 84 : 62}
        tint={getBlurTint(isDark)}
        style={[styles.glass, { backgroundColor: isDark ? 'rgba(10, 10, 10, 0.4)' : 'rgba(255, 255, 255, 0.7)' }]}
      >
        <LinearGradient
          colors={isDark ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'] : ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.2)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Sparkles size={17} color={BRAND} strokeWidth={2.2} />
            <Text style={[styles.eyebrow, { color: muted }]}>Today's coach</Text>
          </View>
          <View style={[styles.scorePill, { borderColor: border, backgroundColor: getGlassBg(isDark) }]}>
            <Text style={[styles.scoreText, { color: BRAND }]}>{readiness.score}</Text>
            <Text style={[styles.scoreLabel, { color: muted }]}>{readiness.level}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <Dumbbell size={15} color={BRAND} strokeWidth={2.2} />
            <Text style={[styles.metricValue, { color: text }]}>{streakMetrics.workedOutToday ? 'Done' : 'Plan'}</Text>
            <Text style={[styles.metricLabel, { color: muted }]}>Workout</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: border }]} />
          <View style={styles.metricItem}>
            <Apple size={15} color={BRAND} strokeWidth={2.2} />
            <Text style={[styles.metricValue, { color: text }]}>{nutritionPct}%</Text>
            <Text style={[styles.metricLabel, { color: muted }]}>Nutrition</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: border }]} />
          <View style={styles.metricItem}>
            <Footprints size={15} color={BRAND} strokeWidth={2.2} />
            <Text style={[styles.metricValue, { color: text }]}>{formatSteps(healthToday?.steps ?? 0)}</Text>
            <Text style={[styles.metricLabel, { color: muted }]}>Steps</Text>
          </View>
        </View>

        <View style={styles.habitHeader}>
          <Text style={[styles.sectionLabel, { color: text }]}>Habits</Text>
          <Text style={[styles.habitCount, { color: muted }]}>
            {completedHabits}/{habits.length || 0}
            {habitsUnavailable ? ' pending setup' : ''}
          </Text>
        </View>

        <View style={styles.habitsRow}>
          {isLoadingHabits ? (
            <ActivityIndicator color={BRAND} />
          ) : (
            habits.slice(0, 4).map((habit) => (
              <TouchableOpacity
                key={habit.id}
                activeOpacity={0.82}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  void toggleHabit(habit);
                }}
                style={[
                  styles.habitChip,
                  {
                    borderColor: habit.completed ? 'rgba(132,196,65,0.65)' : border,
                    backgroundColor: habit.completed
                      ? isDark
                        ? 'rgba(132,196,65,0.16)'
                        : 'rgba(132,196,65,0.2)'
                      : isDark
                        ? 'rgba(255,255,255,0.04)'
                        : 'rgba(255,255,255,0.48)',
                  },
                ]}
              >
                {habit.completed ? <CheckCircle2 size={14} color={BRAND} strokeWidth={2.2} /> : <Circle size={14} color={muted} strokeWidth={2.2} />}
                <Text style={[styles.habitText, { color: habit.completed ? text : muted }]} numberOfLines={1}>
                  {habit.title}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        <TouchableOpacity
          activeOpacity={0.84}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (streakMetrics.workedOutToday) {
              navigation.navigate('Progress', { screen: 'Nutrition', initial: false });
            } else {
              navigation.navigate('Library', { screen: 'ExerciseSelection' });
            }
          }}
          style={styles.cta}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: getResponsiveSpacing(22),
    marginBottom: getResponsiveSpacing(20),
    borderRadius: getResponsiveSpacing(24),
    overflow: 'hidden',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 20,
    elevation: 12,
  },
  glass: {
    padding: getResponsiveSpacing(18),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrow: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(11),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  scoreText: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(16),
  },
  scoreLabel: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(9),
    textTransform: 'uppercase',
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 16,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(12),
  },
  metricLabel: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(9),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricDivider: {
    width: 1,
    opacity: 0.6,
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  sectionLabel: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(11),
  },
  habitCount: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(10),
  },
  habitsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    minHeight: 36,
    marginTop: 10,
  },
  habitChip: {
    maxWidth: '48%',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  habitText: {
    flexShrink: 1,
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(10),
  },
  cta: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  ctaText: {
    color: '#071006',
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(11),
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
});
