import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Animated, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, parseISO } from 'date-fns';
import { useSessionsStore } from '@/store/sessionsStore';
import { useHealthStore } from '@/store/healthStore';
import { HomeHeader } from '@/components/home/HomeHeader';
import { TopWorkouts } from '@/components/home/TopWorkouts';
import { TopTrainers } from '@/components/home/TopTrainers';
import { YourPrograms } from '@/components/home/YourPrograms';
import { ArticlesFeed } from '@/components/home/ArticlesFeed';
import { NutritionHomeCard } from '@/components/home/NutritionHomeCard';
import { HealthWidget } from '@/components/home/HealthWidget';
import { StreakWidget } from '@/components/home/StreakWidget';
import { CheckInHomeCard } from '@/components/home/CheckInHomeCard';
import { GlassCalendar } from '@/components/home/GlassCalendar';
import { RecommendedWorkouts } from '@/components/home/RecommendedWorkouts';
import { getResponsiveSpacing } from '@/utils/responsive';
import { theme } from '@/theme';
import { getBackgroundColor, getSurfaceColor, getGlassBg, getGlassBorder, getShadow } from '@/utils/colorUtils';
import { useThemeStore } from '@/store/themeStore';
import { useTabScroll } from '@/hooks/useTabScroll';
import { useProfileStore } from '@/store/profileStore';
import { useMarketplaceStore } from '@/store/marketplaceStore';
import { notificationService } from '@/services/notifications';

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { onScroll: handleTabScroll } = useTabScroll();
  const { fetch, sessions, loading, getStreakMetrics } = useSessionsStore();

  const workoutDays = useMemo(() => {
    if (!sessions?.length) return [];
    return sessions
      .filter((s) => s.date || s.started_at)
      .map((s) => {
        const dateStr = s.date || s.started_at;
        return dateStr ? format(parseISO(dateStr), 'yyyy-MM-dd') : '';
      })
      .filter(Boolean);
  }, [sessions]);
  const { status: healthStatus, sync: syncHealth, loadHistory: loadHealthHistory } = useHealthStore();
  const { profile } = useProfileStore();
  const { isDark } = useThemeStore();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  React.useEffect(() => {
    fetch();
  }, [fetch]);

  React.useEffect(() => {
    const prefs = profile?.notification_preferences;
    if (!prefs) return;

    notificationService.updateSmartNotifications({
      prefs: {
        notificationTime: prefs.notification_time || '09:00',
        inactivityNudges: prefs.inactivity_nudges ?? true,
        inactivityThresholdDays: prefs.inactivity_threshold_days ?? 3,
        streakAlerts: prefs.streak_alerts ?? true,
      },
      streakMetrics: getStreakMetrics(),
    });
  }, [sessions, profile?.notification_preferences, getStreakMetrics]);

  const loadTopCoaches = useMarketplaceStore((s) => s.loadTopCoaches);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetch(),
      loadTopCoaches(),
      healthStatus === 'connected' ? syncHealth(true) : loadHealthHistory(),
    ]);
    setRefreshKey(prev => prev + 1);
    setRefreshing(false);
  }, [fetch, healthStatus, loadHealthHistory, loadTopCoaches, syncHealth]);

  const handleQuickStart = () => {
    navigation.navigate('Library', { screen: 'ExerciseSelection' });
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom + getResponsiveSpacing(100),
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: handleTabScroll
          }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
            progressBackgroundColor={getSurfaceColor(isDark)}
          />
        }
      >
        <HomeHeader />

        <GlassCalendar workoutDays={workoutDays} />

        <StreakWidget />

        <CheckInHomeCard />

        <HealthWidget />

        {!loading && sessions.length === 0 ? (
          <RecommendedWorkouts />
        ) : (
          <TopWorkouts key={`workouts-${refreshKey}`} />
        )}

        <TopTrainers key={`trainers-${refreshKey}`} />

        <YourPrograms key={`programs-${refreshKey}`} />

        <NutritionHomeCard />

        <ArticlesFeed key={`articles-${refreshKey}`} />
      </Animated.ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + getResponsiveSpacing(130) }]}
        onPress={handleQuickStart}
        activeOpacity={0.8}
      >
        <View style={[
          styles.fabGlass,
          {
            backgroundColor: getGlassBg(isDark),
            borderColor: getGlassBorder(isDark),
            ...getShadow(isDark, 'large'),
          }
        ]}>
          <Plus color={theme.colors.primary} size={28} strokeWidth={2.5} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
  },
  fab: {
    position: 'absolute',
    right: getResponsiveSpacing(20),
    width: 64,
    height: 64,
    borderRadius: 32,
    zIndex: 100,
  },
  fabGlass: {
    flex: 1,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
