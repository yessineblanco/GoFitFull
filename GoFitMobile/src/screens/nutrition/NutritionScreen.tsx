import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useNutritionStore } from '@/stores/nutritionStore';
import { MacroRings } from '@/components/nutrition/MacroRings';
import { MealSection } from '@/components/nutrition/MealSection';
import type { MealLogWithFood, MealType } from '@/services/nutrition';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useThemeStore } from '@/store/themeStore';
import { getBackgroundColor, getGlassBg, getGlassBorder } from '@/utils/colorUtils';

const BRAND = '#84c441';

function shiftDate(iso: string, deltaDays: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function fmtHeader(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function NutritionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useThemeStore();
  const {
    selectedDate,
    setSelectedDate,
    goals,
    logs,
    totals,
    weeklySummary,
    isLoading,
    error,
    refresh,
    removeLog,
    loadGoals,
    addWater,
    saveMeal,
  } = useNutritionStore();

  useFocusEffect(
    useCallback(() => {
      void loadGoals();
      void refresh();
    }, [loadGoals, refresh]),
  );

  const onAdd = (mealType: MealType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('AddFood', { mealType, date: selectedDate });
  };

  const onDelete = (id: string) => {
    Alert.alert('Remove food', 'Delete this log entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await removeLog(id);
        },
      },
    ]);
  };

  const onSaveMeal = (mealType: MealType, mealLogs: MealLogWithFood[]) => {
    if (mealLogs.length === 0) return;
    const title = mealType === 'snack' ? 'Snack' : mealType.charAt(0).toUpperCase() + mealType.slice(1);
    const name = `${title} - ${fmtHeader(selectedDate)}`;
    Alert.alert('Save meal', `Save ${mealLogs.length} items as "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await saveMeal(name, mealLogs);
        },
      },
    ]);
  };

  const byMeal = (t: MealType) => logs.filter((l) => l.meal_type === t);

  const bg = getBackgroundColor(isDark);
  const text = isDark ? '#fff' : '#1A1D21';
  const sub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const glass = getGlassBg(isDark);
  const border = getGlassBorder(isDark);

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <LinearGradient
        colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : ['#FAFBFC', '#F0F4EA', '#FAFBFC']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 18,
        }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => void refresh()} tintColor={BRAND} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
            style={[styles.iconBtn, { backgroundColor: glass, borderColor: border }]}
            hitSlop={12}
          >
            <ChevronLeft size={26} color={text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: text }]}>Nutrition</Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('NutritionGoals');
            }}
            style={[styles.iconBtn, { backgroundColor: glass, borderColor: border }]}
            hitSlop={12}
          >
            <Settings2 size={22} color={BRAND} />
          </TouchableOpacity>
        </View>

        <View style={[styles.dateRow, { backgroundColor: glass, borderColor: border }]}>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              const next = shiftDate(selectedDate, -1);
              setSelectedDate(next);
              void refresh(next);
            }}
            style={styles.dateNav}
          >
            <ChevronLeft size={22} color={text} />
          </TouchableOpacity>
          <Text style={[styles.dateTxt, { color: text }]}>{fmtHeader(selectedDate)}</Text>
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              const next = shiftDate(selectedDate, 1);
              setSelectedDate(next);
              void refresh(next);
            }}
            style={styles.dateNav}
          >
            <ChevronRight size={22} color={text} />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={[styles.err, { borderColor: border, backgroundColor: glass }]}>
            <Text style={styles.errTxt}>{error}</Text>
          </View>
        ) : null}

        {goals && !isLoading ? (
          <MacroRings totals={totals} goals={goals} isDark={isDark} />
        ) : isLoading && !goals ? (
          <ActivityIndicator color={BRAND} style={{ marginVertical: 24 }} />
        ) : null}

        {goals && weeklySummary ? (
          <View style={[styles.trendCard, { borderColor: border, backgroundColor: glass }]}>
            <Text style={[styles.trendTitle, { color: text }]}>7-day trend</Text>
            <View style={styles.trendGrid}>
              <View style={styles.trendItem}>
                <Text style={[styles.trendValue, { color: text }]}>{weeklySummary.average_calories}</Text>
                <Text style={[styles.trendLabel, { color: sub }]}>avg kcal</Text>
              </View>
              <View style={styles.trendItem}>
                <Text style={[styles.trendValue, { color: text }]}>{weeklySummary.protein_days_hit}/7</Text>
                <Text style={[styles.trendLabel, { color: sub }]}>protein</Text>
              </View>
              <View style={styles.trendItem}>
                <Text style={[styles.trendValue, { color: text }]}>{weeklySummary.water_days_hit}/7</Text>
                <Text style={[styles.trendLabel, { color: sub }]}>water</Text>
              </View>
              <View style={styles.trendItem}>
                <Text style={[styles.trendValue, { color: text }]}>{weeklySummary.fiber_days_hit}/7</Text>
                <Text style={[styles.trendLabel, { color: sub }]}>fiber</Text>
              </View>
            </View>
            <Text style={[styles.trendNote, { color: sub }]}>
              {weeklySummary.tracked_days}/7 days tracked. Use the trend, not one noisy day.
            </Text>
          </View>
        ) : null}

        <MealSection title="Breakfast" mealType="breakfast" logs={byMeal('breakfast')} onAdd={onAdd} onDelete={onDelete} onSave={onSaveMeal} isDark={isDark} />
        <MealSection title="Lunch" mealType="lunch" logs={byMeal('lunch')} onAdd={onAdd} onDelete={onDelete} onSave={onSaveMeal} isDark={isDark} />
        <MealSection title="Dinner" mealType="dinner" logs={byMeal('dinner')} onAdd={onAdd} onDelete={onDelete} onSave={onSaveMeal} isDark={isDark} />
        <MealSection title="Snacks" mealType="snack" logs={byMeal('snack')} onAdd={onAdd} onDelete={onDelete} onSave={onSaveMeal} isDark={isDark} />

        {goals ? (
          <View style={[styles.waterCard, { borderColor: border, backgroundColor: glass }]}>
            <View>
              <Text style={[styles.waterTitle, { color: text }]}>Water</Text>
              <Text style={[styles.waterMeta, { color: sub }]}>
                {Math.round(totals.water_ml)} / {goals.water_ml_goal} ml
              </Text>
            </View>
            <View style={styles.waterActions}>
              {[250, 500].map((amount) => (
                <TouchableOpacity
                  key={amount}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    void addWater(amount, selectedDate);
                  }}
                  style={styles.waterBtn}
                >
                  <Text style={styles.waterBtnText}>+{amount}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : null}

        <Text style={[styles.foot, { color: sub }]}>
          Search the food catalog to log meals. Goals are editable from the gear icon.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(20) },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  dateNav: { padding: 8 },
  dateTxt: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(15) },
  err: { padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  errTxt: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(13), color: '#ff8a80' },
  foot: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), lineHeight: 16, marginTop: 8 },
  trendCard: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  trendTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(15), marginBottom: 12 },
  trendGrid: { flexDirection: 'row', gap: 8 },
  trendItem: { flex: 1, alignItems: 'center' },
  trendValue: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(15) },
  trendLabel: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(10), marginTop: 2, textTransform: 'uppercase' },
  trendNote: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), marginTop: 12, textAlign: 'center' },
  waterCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  waterTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(15) },
  waterMeta: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), marginTop: 3 },
  waterActions: { flexDirection: 'row', gap: 8 },
  waterBtn: {
    minWidth: 58,
    minHeight: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND,
  },
  waterBtnText: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(12), color: '#0a0a0a' },
});
