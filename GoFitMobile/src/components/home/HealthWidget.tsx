import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, Flame, Footprints, RefreshCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/authStore';
import { attachHealthForegroundSync, useHealthStore } from '@/store/healthStore';
import { useThemeStore } from '@/store/themeStore';
import { getGlassBg, getGlassBorder } from '@/utils/colorUtils';
import { getResponsiveFontSize } from '@/utils/responsive';

const BRAND = '#84c441';

function formatNumber(value: number) {
  return value.toLocaleString();
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

  const text = isDark ? '#FFFFFF' : '#1A1D21';
  const muted = isDark ? 'rgba(255,255,255,0.48)' : 'rgba(0,0,0,0.48)';
  const border = getGlassBorder(isDark);
  const glass = getGlassBg(isDark);
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
    <View style={styles.wrap}>
      <LinearGradient
        colors={isDark ? ['rgba(132,196,65,0.13)', 'rgba(255,255,255,0.035)'] : ['rgba(132,196,65,0.1)', 'rgba(255,255,255,0.75)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: isDark ? 'rgba(132,196,65,0.22)' : border }]}
      >
        <View style={styles.topRow}>
          <View style={[styles.iconBox, { backgroundColor: glass, borderColor: border }]}>
            <Activity size={20} color={BRAND} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={[styles.title, { color: text }]}>Health today</Text>
            <Text style={[styles.subtitle, { color: muted }]} numberOfLines={1}>{subtitle}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.82}
            disabled={isSyncing || status === 'unsupported'}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              void (canConnect ? connect() : sync(true));
            }}
            style={[styles.actionButton, { backgroundColor: glass, borderColor: border }]}
          >
            {isSyncing ? <ActivityIndicator color={BRAND} /> : <RefreshCw size={16} color={BRAND} />}
          </TouchableOpacity>
        </View>

        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Footprints size={16} color={BRAND} />
            <Text style={[styles.metricValue, { color: text }]}>{formatNumber(steps)}</Text>
            <Text style={[styles.metricLabel, { color: muted }]}>steps</Text>
          </View>
          <View style={[styles.metricDivider, { backgroundColor: border }]} />
          <View style={styles.metric}>
            <Flame size={16} color={BRAND} />
            <Text style={[styles.metricValue, { color: text }]}>{formatNumber(calories)}</Text>
            <Text style={[styles.metricLabel, { color: muted }]}>active kcal</Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  titleBlock: {
    flex: 1,
  },
  title: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(16),
  },
  subtitle: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    marginTop: 3,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(20),
  },
  metricLabel: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(11),
    textTransform: 'uppercase',
  },
  metricDivider: {
    width: 1,
    height: 44,
    marginHorizontal: 8,
  },
});
