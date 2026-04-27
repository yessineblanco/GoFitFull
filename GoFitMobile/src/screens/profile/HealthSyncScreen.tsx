import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, ExternalLink, RefreshCw, ShieldCheck, Unlink } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { ScreenHeader } from '@/components/shared/ScreenHeader';
import { useHealthStore } from '@/store/healthStore';
import { useThemeStore } from '@/store/themeStore';
import { getBackgroundColor, getGlassBg, getGlassBorder, getTextColor, getTextSecondaryColor } from '@/utils/colorUtils';
import { openHealthConnectSettings } from '@/services/healthSync';

const BRAND = '#84c441';

function statusLabel(status: string) {
  if (status === 'connected') return 'Connected';
  if (status === 'syncing') return 'Syncing';
  if (status === 'unsupported') return 'Unavailable';
  if (status === 'error') return 'Needs attention';
  return 'Disconnected';
}

export function HealthSyncScreen() {
  const { isDark } = useThemeStore();
  const { status, today, history, error, lastSyncedAt, checkConnection, loadHistory, connect, sync, disconnectLocal } = useHealthStore();
  const isSyncing = status === 'syncing';

  useEffect(() => {
    void checkConnection();
    void loadHistory();
  }, [checkConnection, loadHistory]);

  const text = getTextColor(isDark);
  const muted = getTextSecondaryColor(isDark);
  const glass = getGlassBg(isDark);
  const border = getGlassBorder(isDark);
  const weeklySteps = history.reduce((sum, row) => sum + row.steps, 0);
  const weeklyCalories = history.reduce((sum, row) => sum + row.active_calories, 0);

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
      <LinearGradient
        colors={isDark ? ['rgba(132,196,65,0.16)', 'transparent'] : ['rgba(132,196,65,0.1)', 'transparent']}
        style={styles.ambient}
      />
      <ScreenHeader title="HEALTH SYNC" />

      <View style={styles.content}>
        <LinearGradient
          colors={isDark ? ['rgba(132,196,65,0.14)', 'rgba(255,255,255,0.035)'] : ['rgba(132,196,65,0.1)', 'rgba(255,255,255,0.75)']}
          style={[styles.panel, { borderColor: border }]}
        >
          <View style={styles.statusRow}>
            <View style={[styles.iconBox, { backgroundColor: glass, borderColor: border }]}>
              <Activity size={24} color={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: text }]}>Health Connect</Text>
              <Text style={[styles.subtitle, { color: muted }]}>{error || statusLabel(status)}</Text>
            </View>
            <View style={[styles.pill, { borderColor: border, backgroundColor: glass }]}>
              <Text style={[styles.pillText, { color: status === 'connected' ? BRAND : muted }]}>{statusLabel(status)}</Text>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={[styles.metricBox, { backgroundColor: glass, borderColor: border }]}>
              <Text style={[styles.metricValue, { color: text }]}>{(today?.steps ?? 0).toLocaleString()}</Text>
              <Text style={[styles.metricLabel, { color: muted }]}>steps today</Text>
            </View>
            <View style={[styles.metricBox, { backgroundColor: glass, borderColor: border }]}>
              <Text style={[styles.metricValue, { color: text }]}>{(today?.active_calories ?? 0).toLocaleString()}</Text>
              <Text style={[styles.metricLabel, { color: muted }]}>active kcal</Text>
            </View>
          </View>

          <Text style={[styles.helper, { color: muted }]}>
            7 days: {weeklySteps.toLocaleString()} steps · {weeklyCalories.toLocaleString()} active kcal
          </Text>
          <Text style={[styles.helper, { color: muted }]}>
            {lastSyncedAt ? `Last sync ${new Date(lastSyncedAt).toLocaleString()}` : 'No sync yet'}
          </Text>
        </LinearGradient>

        <TouchableOpacity
          activeOpacity={0.86}
          disabled={isSyncing || status === 'unsupported'}
          style={[styles.primaryButton, { opacity: status === 'unsupported' ? 0.55 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            void (status === 'connected' ? sync(true) : connect());
          }}
        >
          {isSyncing ? <ActivityIndicator color="#10140D" /> : status === 'connected' ? <RefreshCw size={18} color="#10140D" /> : <ShieldCheck size={18} color="#10140D" />}
          <Text style={styles.primaryButtonText}>{status === 'connected' ? 'Sync Now' : 'Connect Health Connect'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.82}
          style={[styles.secondaryButton, { borderColor: border, backgroundColor: glass }]}
          onPress={() => openHealthConnectSettings()}
        >
          <ExternalLink size={18} color={BRAND} />
          <Text style={[styles.secondaryButtonText, { color: text }]}>Open Health Connect settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.82}
          style={[styles.secondaryButton, { borderColor: border, backgroundColor: glass }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            disconnectLocal();
          }}
        >
          <Unlink size={18} color={muted} />
          <Text style={[styles.secondaryButtonText, { color: muted }]}>Disconnect in GoFit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  ambient: {
    position: 'absolute',
    top: -120,
    left: -80,
    right: -80,
    height: 280,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 104,
    gap: 14,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 20,
  },
  subtitle: {
    fontFamily: 'Barlow_500Medium',
    fontSize: 13,
    marginTop: 3,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
    marginBottom: 12,
  },
  metricBox: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  metricValue: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 24,
  },
  metricLabel: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 11,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  helper: {
    fontFamily: 'Barlow_400Regular',
    fontSize: 12,
    marginTop: 4,
  },
  primaryButton: {
    height: 52,
    borderRadius: 17,
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: 14,
    color: '#10140D',
  },
  secondaryButton: {
    height: 50,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontFamily: 'Barlow_700Bold',
    fontSize: 13,
  },
});
