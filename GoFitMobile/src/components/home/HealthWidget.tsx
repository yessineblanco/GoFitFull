import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/authStore';
import { attachHealthForegroundSync, useHealthStore } from '@/store/healthStore';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getBlurTint, getGlassBorder, getTextColor, getTextSecondaryColor } from '@/utils/colorUtils';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatSleep(minutes: number | null | undefined) {
  if (!minutes) return '--';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatNullableNumber(value: number | null | undefined) {
  return value ? value.toLocaleString() : '--';
}

export function HealthWidget() {
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const { status, today, error, checkConnection, loadHistory, connect, sync } = useHealthStore();

  useEffect(() => {
    void checkConnection();
    void loadHistory();
    const subscription = attachHealthForegroundSync();
    return () => subscription.remove();
  }, [checkConnection, loadHistory]);

  const text = getTextColor(isDark);
  const muted = getTextSecondaryColor(isDark);
  const border = getGlassBorder(isDark);
  const isSyncing = status === 'syncing';
  const canConnect = status === 'disconnected' || status === 'error';
  const steps = today?.steps ?? 0;
  const calories = today?.active_calories ?? 0;

  if (!user?.id) return null;

  const subtitle =
    status === 'unsupported'
      ? 'Android Health Connect only'
      : error || (today ? 'Synced from Health Connect' : 'Connect for daily activity');

  return (
    <View style={[styles.outer, { borderColor: border }]}>
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
        <View style={styles.topRow}>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: text }]}>Health today</Text>
            <Text style={[styles.subtitle, { color: muted }]} numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.82}
            disabled={isSyncing || status === 'unsupported'}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              void (canConnect ? connect() : sync(true));
            }}
            style={[styles.syncBtn, { borderColor: border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)' }]}
            accessibilityRole="button"
            accessibilityLabel={canConnect ? 'Connect health' : 'Sync health data'}
          >
            {isSyncing ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text style={[styles.syncLabel, { color: theme.colors.primary }]}>
                {canConnect ? 'Connect' : 'Sync'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: text }]}>{formatNumber(steps)}</Text>
            <Text style={[styles.metricLabel, { color: muted }]}>Steps</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: border }]} />
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: text }]}>{formatNumber(calories)}</Text>
            <Text style={[styles.metricLabel, { color: muted }]}>Active kcal</Text>
          </View>
        </View>
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: text }]}>{formatSleep(today?.sleep_minutes)}</Text>
            <Text style={[styles.metricLabel, { color: muted }]}>Sleep</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: border }]} />
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: text }]}>
              {formatNullableNumber(today?.resting_heart_rate)}
            </Text>
            <Text style={[styles.metricLabel, { color: muted }]}>Rest HR</Text>
          </View>
        </View>
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
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  glass: {
    padding: getResponsiveSpacing(20),
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleBlock: {
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
  },
  syncBtn: {
    minWidth: 88,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: getResponsiveSpacing(20),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncLabel: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(12),
    letterSpacing: 0.5,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: getResponsiveSpacing(20),
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  metricValue: {
    fontFamily: 'Designer',
    fontSize: getResponsiveFontSize(22),
  },
  metricLabel: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(11),
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 6,
  },
  metricDivider: {
    width: 1,
    alignSelf: 'stretch',
    opacity: 0.6,
  },
});
