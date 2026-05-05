import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { SectionHeader } from '@/components/home/SectionHeader';
import { toastManager } from '@/components/shared/Toast';
import { workoutRecommendationService, type AIWorkoutRecommendation } from '@/services/workoutRecommendations';
import { workoutService } from '@/services/workouts';
import { useAuthStore } from '@/store/authStore';
import { useWorkoutsStore } from '@/store/workoutsStore';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { getBlurTint, getGlassBorder, getTextColor, getTextSecondaryColor } from '@/utils/colorUtils';

export const RecommendedWorkouts: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isDark } = useThemeStore();
  const { user } = useAuthStore();
  const { loadWorkouts } = useWorkoutsStore();
  const [recommendation, setRecommendation] = React.useState<AIWorkoutRecommendation | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const generateWorkout = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await workoutRecommendationService.generateAIWorkout();
      setRecommendation(next);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI workout generation failed';
      setError(message);
      toastManager.error(message);
    } finally {
      setLoading(false);
    }
  };

  const saveWorkout = async () => {
    if (!user?.id || !recommendation || saving) return;

    setSaving(true);
    try {
      const saved = await workoutService.createCustomWorkout(user.id, {
        name: recommendation.name,
        difficulty: 'Custom',
        image_url: recommendation.image_url || recommendation.exercises[0]?.image,
        exercises: recommendation.exercises,
      });

      await loadWorkouts(user.id, true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Library', {
        screen: 'WorkoutDetail',
        initial: false,
        params: {
          workoutId: saved.id,
          workoutName: saved.name,
          workoutDifficulty: saved.difficulty,
          workoutImage: saved.image_url,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not save AI workout';
      toastManager.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrimaryPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (recommendation) {
      saveWorkout();
      return;
    }
    generateWorkout();
  };

  const adaptationLabel = recommendation?.adaptation
    ? [
        recommendation.adaptation.coachContext?.hasAssignedProgram ||
        recommendation.adaptation.coachContext?.hasActivePack
          ? 'coach companion'
          : null,
        recommendation.adaptation.readinessLevel !== 'unknown'
          ? `${recommendation.adaptation.readinessLevel} readiness`
          : null,
        recommendation.adaptation.daysSinceLastWorkout !== null &&
        recommendation.adaptation.daysSinceLastWorkout !== undefined
          ? `${recommendation.adaptation.daysSinceLastWorkout}d since workout`
          : null,
        `${recommendation.adaptation.volumeAdjustment} volume`,
      ]
        .filter(Boolean)
        .join(' / ')
    : null;

  return (
    <View style={styles.container}>
      <SectionHeader title="Adaptive workout" showSeeAll={false} />
      <TouchableOpacity activeOpacity={0.9} onPress={handlePrimaryPress} disabled={loading || saving}>
        <BlurView
          intensity={isDark ? 34 : 42}
          tint={getBlurTint(isDark)}
          style={[
            styles.card,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.68)',
              borderColor: getGlassBorder(isDark),
            },
          ]}
        >
          {recommendation?.image_url ? (
            <Image source={{ uri: recommendation.image_url }} style={styles.image} contentFit="cover" transition={180} />
          ) : null}

          <LinearGradient
            colors={
              isDark
                ? ['rgba(3,3,3,0.18)', 'rgba(3,3,3,0.72)', 'rgba(3,3,3,0.96)']
                : ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.62)', 'rgba(255,255,255,0.94)']
            }
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(132,196,65,0.18)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />

          <View style={styles.content}>
            <View style={styles.headerRow}>
              <View style={styles.tag}>
                <Sparkles size={13} color={theme.colors.primary} />
                <Text style={styles.tagText}>Adaptive AI</Text>
              </View>
              {(loading || saving) ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <View style={styles.iconButton}>
                  <ChevronRight size={16} color="#030303" />
                </View>
              )}
            </View>

            <View>
              <Text style={[styles.title, { color: getTextColor(isDark) }]} numberOfLines={2}>
                {recommendation?.name || 'Generate a custom workout'}
              </Text>
              <Text style={[styles.reason, { color: getTextSecondaryColor(isDark) }]} numberOfLines={2}>
                {recommendation?.reason ||
                  error ||
                  'AI builds one workout from your goal, recent sessions, and exercises in the database.'}
              </Text>
              {adaptationLabel ? (
                <Text style={styles.adaptationText} numberOfLines={1}>
                  {adaptationLabel}
                </Text>
              ) : null}

              <View style={styles.footer}>
                <Text style={styles.focus} numberOfLines={1}>
                  {recommendation
                    ? `${recommendation.exercises.length} exercises`
                    : loading
                      ? 'Generating'
                      : 'Tap to generate'}
                </Text>
                <Text style={[styles.actionText, { color: getTextColor(isDark) }]}>
                  {recommendation ? (saving ? 'Saving' : 'Save') : 'Create'}
                </Text>
              </View>
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: getResponsiveSpacing(24),
    paddingHorizontal: getResponsiveSpacing(20),
  },
  card: {
    minHeight: 168,
    borderRadius: getResponsiveSpacing(24),
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.56,
  },
  content: {
    minHeight: 168,
    justifyContent: 'space-between',
    padding: getResponsiveSpacing(18),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: getResponsiveSpacing(11),
    paddingVertical: getResponsiveSpacing(7),
    borderRadius: 999,
    backgroundColor: 'rgba(3,3,3,0.38)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tagText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(10),
    color: 'rgba(255,255,255,0.88)',
    textTransform: 'uppercase',
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
  title: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(18),
    lineHeight: getResponsiveFontSize(22),
  },
  reason: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    lineHeight: getResponsiveFontSize(16),
    marginTop: getResponsiveSpacing(6),
  },
  adaptationText: {
    marginTop: getResponsiveSpacing(8),
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(10),
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  footer: {
    marginTop: getResponsiveSpacing(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  focus: {
    flex: 1,
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(11),
    color: theme.colors.primary,
    textTransform: 'uppercase',
  },
  actionText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(12),
    textTransform: 'uppercase',
  },
});
