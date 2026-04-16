import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { nutritionService, type FoodItem, type MealType } from '@/services/nutrition';
import { useNutritionStore } from '@/stores/nutritionStore';
import { FoodSearchItem } from '@/components/nutrition/FoodSearchItem';
import { getResponsiveFontSize } from '@/utils/responsive';
import type { ProgressStackParamList } from '@/types';
import { useThemeStore } from '@/store/themeStore';
import { getBackgroundColor, getGlassBg, getGlassBorder } from '@/utils/colorUtils';

const BRAND = '#84c441';
const MEALS: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

export default function AddFoodScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ProgressStackParamList, 'AddFood'>>();
  const { isDark } = useThemeStore();
  const addLog = useNutritionStore((s) => s.addLog);
  const storeDate = useNutritionStore((s) => s.selectedDate);

  const initialMeal = route.params?.mealType ?? 'breakfast';
  const logDate = route.params?.date ?? storeDate;

  const [mealType, setMealType] = useState<MealType>(initialMeal);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const [servingsStr, setServingsStr] = useState('1');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 320);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 1) {
      setResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSearching(true);
      try {
        const rows = await nutritionService.searchFoods(debounced);
        if (!cancelled) setResults(rows);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const onPick = useCallback((food: FoodItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPicked(food);
    setServingsStr('1');
  }, []);

  const onSave = async () => {
    if (!picked) return;
    const servings = parseFloat(servingsStr.replace(',', '.'));
    if (!Number.isFinite(servings) || servings <= 0 || servings > 50) {
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addLog(picked.id, mealType, servings, logDate);
    navigation.goBack();
  };

  const bg = getBackgroundColor(isDark);
  const text = isDark ? '#fff' : '#1A1D21';
  const sub = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
  const glass = getGlassBg(isDark);
  const border = getGlassBorder(isDark);

  return (
    <KeyboardAvoidingView style={[styles.root, { backgroundColor: bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <LinearGradient
        colors={isDark ? ['#030303', '#0a1a0a', '#030303'] : ['#FAFBFC', '#F0F4EA', '#FAFBFC']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, flex: 1 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
            style={[styles.iconBtn, { backgroundColor: glass, borderColor: border }]}
          >
            <ChevronLeft size={26} color={text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: text }]}>Add food</Text>
          <View style={{ width: 42 }} />
        </View>

        <View style={styles.mealRow}>
          {MEALS.map((m) => (
            <TouchableOpacity
              key={m.key}
              onPress={() => {
                Haptics.selectionAsync();
                setMealType(m.key);
              }}
              style={[
                styles.mealChip,
                {
                  backgroundColor: mealType === m.key ? 'rgba(132,196,65,0.2)' : glass,
                  borderColor: mealType === m.key ? BRAND : border,
                },
              ]}
            >
              <Text
                style={[
                  styles.mealChipTxt,
                  { color: mealType === m.key ? BRAND : text },
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.searchWrap, { backgroundColor: glass, borderColor: border }]}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search foods…"
            placeholderTextColor={sub}
            style={[styles.search, { color: text }]}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {picked ? (
          <View style={[styles.picked, { borderColor: border, backgroundColor: glass }]}>
            <Text style={[styles.pickedName, { color: text }]} numberOfLines={2}>
              {picked.name}
            </Text>
            <Text style={[styles.pickedMeta, { color: sub }]}>
              {picked.serving_label} · {Math.round(picked.calories)} kcal
            </Text>
            <View style={styles.servRow}>
              <Text style={[styles.servLbl, { color: text }]}>Servings</Text>
              <TextInput
                value={servingsStr}
                onChangeText={setServingsStr}
                keyboardType="decimal-pad"
                style={[styles.servIn, { color: text, borderColor: border }]}
              />
            </View>
            <TouchableOpacity onPress={() => void onSave()} activeOpacity={0.9} style={{ borderRadius: 14, overflow: 'hidden', marginTop: 12 }}>
              <LinearGradient colors={['#6da835', BRAND]} style={styles.saveBtn}>
                <Text style={styles.saveTxt}>Add to log</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPicked(null)}
              style={{ marginTop: 10, alignItems: 'center' }}
            >
              <Text style={{ color: sub, fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(13) }}>Choose different food</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {searching ? <ActivityIndicator color={BRAND} style={{ marginTop: 16 }} /> : null}
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              style={{ marginTop: 12, flex: 1 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                debounced.length > 0 && !searching ? (
                  <Text style={{ color: sub, fontFamily: 'Barlow_400Regular', marginTop: 20, textAlign: 'center' }}>
                    No matches. Try another name.
                  </Text>
                ) : debounced.length === 0 ? (
                  <Text style={{ color: sub, fontFamily: 'Barlow_400Regular', marginTop: 20, textAlign: 'center' }}>
                    Type to search the food catalog.
                  </Text>
                ) : null
              }
              renderItem={({ item }) => <FoodSearchItem food={item} onPress={onPick} isDark={isDark} />}
            />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(18) },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  mealChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  mealChipTxt: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(12) },
  searchWrap: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  search: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(16), paddingVertical: 12 },
  picked: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 12 },
  pickedName: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16) },
  pickedMeta: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), marginTop: 6 },
  servRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  servLbl: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14) },
  servIn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 80,
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(16),
    textAlign: 'center',
  },
  saveBtn: { paddingVertical: 14, alignItems: 'center' },
  saveTxt: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16), color: '#0a0a0a' },
});
