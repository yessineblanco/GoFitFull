import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Animated, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionsStore } from '@/store/sessionsStore';
import { HomeHeader } from '@/components/home/HomeHeader';
import { TopWorkouts } from '@/components/home/TopWorkouts';
import { TopTrainers } from '@/components/home/TopTrainers';
import { YourPrograms } from '@/components/home/YourPrograms';
import { ArticlesFeed } from '@/components/home/ArticlesFeed';
import { getResponsiveSpacing } from '@/utils/responsive';
import { theme } from '@/theme';
import { getBackgroundColor, getSurfaceColor, getGlassBg, getGlassBorder, getShadow } from '@/utils/colorUtils';
import { useThemeStore } from '@/store/themeStore';
import { useTabScroll } from '@/hooks/useTabScroll';

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { onScroll: handleTabScroll } = useTabScroll();
  const { fetch } = useSessionsStore();
  const { isDark } = useThemeStore();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  React.useEffect(() => {
    fetch();
  }, [fetch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetch();
    setRefreshKey(prev => prev + 1);
    setRefreshing(false);
  }, [fetch]);

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

        <TopWorkouts key={`workouts-${refreshKey}`} />

        <TopTrainers key={`trainers-${refreshKey}`} />

        <YourPrograms key={`programs-${refreshKey}`} />

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
