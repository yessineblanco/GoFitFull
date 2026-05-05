import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Apple } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { nutritionService, type DayTotals } from '@/services/nutrition';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useThemeStore } from '@/store/themeStore';
import { getGlassBg, getGlassBorder } from '@/utils/colorUtils';

const BRAND = '#84c441';

export function NutritionHomeCard() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const { isDark } = useThemeStore();
  const [goals, setGoals] = useState<{ calories: number; waterMl: number } | null>(null);
  const [totals, setTotals] = useState<DayTotals | null>(null);

  useEffect(() => {
    if (!isFocused) return;
    let cancelled = false;
    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const goals = await nutritionService.getOrCreateGoals();
        const t = await nutritionService.getDayTotals(today);
        if (!cancelled) {
          setGoals({ calories: goals.calories_goal, waterMl: goals.water_ml_goal });
          setTotals(t);
        }
      } catch {
        if (!cancelled) {
          setGoals(null);
          setTotals(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isFocused]);

  const text = isDark ? '#fff' : '#1A1D21';
  const muted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const glass = getGlassBg(isDark);
  const border = getGlassBorder(isDark);

  const cal = totals ? Math.round(totals.calories) : 0;
  const g = goals?.calories ?? 2000;
  const pct = Math.min(100, Math.round((cal / Math.max(1, g)) * 100));
  const waterPct = totals && goals ? Math.min(100, Math.round((totals.water_ml / Math.max(1, goals.waterMl)) * 100)) : 0;

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate('Progress', { screen: 'Nutrition', initial: false });
        }}
      >
        <LinearGradient
          colors={isDark ? ['rgba(61,140,82,0.15)', 'rgba(132,196,65,0.06)'] : ['rgba(61,140,82,0.12)', 'rgba(132,196,65,0.05)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, { borderColor: isDark ? 'rgba(61,140,82,0.35)' : 'rgba(61,140,82,0.25)' }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={[
                  styles.iconBox,
                  { backgroundColor: isDark ? 'rgba(61,140,82,0.2)' : 'rgba(61,140,82,0.15)', borderColor: border },
                ]}
              >
                <Apple size={22} color={BRAND} />
              </View>
              <View>
                <Text style={[styles.title, { color: text }]}>Nutrition today</Text>
                <Text style={[styles.sub, { color: muted }]}>
                  {cal} / {g} kcal - {pct}% food - {waterPct}% water
                </Text>
              </View>
            </View>
            <View style={[styles.chev, { backgroundColor: glass, borderColor: border }]}>
              <ChevronRight size={16} color={muted} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16) },
  sub: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), marginTop: 3 },
  chev: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
