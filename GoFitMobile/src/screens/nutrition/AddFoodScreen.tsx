import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Pencil, Plus, ScanLine, Trash2, Utensils, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { nutritionService, type FoodItem, type MealType, type RecentFoodLog, type SavedMeal } from '@/services/nutrition';
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
  const addSavedMeal = useNutritionStore((s) => s.addSavedMeal);
  const renameSavedMeal = useNutritionStore((s) => s.renameSavedMeal);
  const deleteSavedMeal = useNutritionStore((s) => s.deleteSavedMeal);
  const updateSavedMealItemServings = useNutritionStore((s) => s.updateSavedMealItemServings);
  const deleteSavedMealItem = useNutritionStore((s) => s.deleteSavedMealItem);
  const recentFoods = useNutritionStore((s) => s.recentFoods);
  const savedMeals = useNutritionStore((s) => s.savedMeals);
  const loadRecentFoods = useNutritionStore((s) => s.loadRecentFoods);
  const loadSavedMeals = useNutritionStore((s) => s.loadSavedMeals);
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
  const [permission, requestPermission] = useCameraPermissions();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [barcodeMessage, setBarcodeMessage] = useState<string | null>(null);
  const [editingMeal, setEditingMeal] = useState<SavedMeal | null>(null);
  const [editName, setEditName] = useState('');
  const [editServings, setEditServings] = useState<Record<string, string>>({});
  const [removedItemIds, setRemovedItemIds] = useState<string[]>([]);

  useEffect(() => {
    void loadRecentFoods();
    void loadSavedMeals();
  }, [loadRecentFoods, loadSavedMeals]);

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
    setBarcodeMessage(null);
    setPicked(food);
    setServingsStr('1');
  }, []);

  const openScanner = async () => {
    setBarcodeMessage(null);
    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) {
        setBarcodeMessage('Camera permission is needed to scan a barcode.');
        return;
      }
    }
    setScanLocked(false);
    setScannerOpen(true);
  };

  const onBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (scanLocked) return;
    setScanLocked(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const food = await nutritionService.lookupFoodByBarcode(result.data);
      setScannerOpen(false);
      if (food) {
        onPick(food);
        return;
      }
      setBarcodeMessage(`No catalog match for barcode ${result.data}. You can still search manually.`);
      setQuery(result.data);
    } catch {
      setScannerOpen(false);
      setBarcodeMessage('Barcode lookup failed. You can still search manually.');
    } finally {
      setScanLocked(false);
    }
  };

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

  const onRepeatRecent = async (recent: RecentFoodLog) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addLog(recent.food_item.id, mealType, recent.last_servings, logDate);
    navigation.goBack();
  };

  const onLogSavedMeal = async (savedMeal: SavedMeal) => {
    if (savedMeal.items.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addSavedMeal(savedMeal, mealType, logDate);
    navigation.goBack();
  };

  const openEditSavedMeal = (savedMeal: SavedMeal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingMeal(savedMeal);
    setEditName(savedMeal.name);
    setRemovedItemIds([]);
    setEditServings(Object.fromEntries(savedMeal.items.map((item) => [item.id, String(item.servings)])));
  };

  const closeEditSavedMeal = () => {
    setEditingMeal(null);
    setEditName('');
    setEditServings({});
    setRemovedItemIds([]);
  };

  const onSaveEditedMeal = async () => {
    if (!editingMeal) return;
    const nextName = editName.trim();
    if (nextName.length < 1) return;
    const keptItems = editingMeal.items.filter((item) => !removedItemIds.includes(item.id));
    if (keptItems.length < 1) return;

    const parsed = keptItems.map((item) => ({
      item,
      servings: parseFloat((editServings[item.id] ?? '').replace(',', '.')),
    }));
    if (parsed.some(({ servings }) => !Number.isFinite(servings) || servings <= 0 || servings > 50)) {
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (nextName !== editingMeal.name) {
      await renameSavedMeal(editingMeal.id, nextName);
    }
    for (const itemId of removedItemIds) {
      await deleteSavedMealItem(itemId);
    }
    for (const { item, servings } of parsed) {
      if (servings !== item.servings) {
        await updateSavedMealItemServings(item.id, servings);
      }
    }
    closeEditSavedMeal();
  };

  const onDeleteSavedMeal = (savedMeal: SavedMeal) => {
    Alert.alert('Delete saved meal', `Delete "${savedMeal.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          await deleteSavedMeal(savedMeal.id);
        },
      },
    ]);
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
            placeholder="Search foods..."
            placeholderTextColor={sub}
            style={[styles.search, { color: text }]}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => void openScanner()}
            style={styles.scanBtn}
            activeOpacity={0.8}
          >
            <ScanLine size={20} color={BRAND} />
          </TouchableOpacity>
        </View>

        {barcodeMessage ? (
          <Text style={[styles.inlineMessage, { color: sub }]}>{barcodeMessage}</Text>
        ) : null}

        {picked ? (
          <View style={[styles.picked, { borderColor: border, backgroundColor: glass }]}>
            <Text style={[styles.pickedName, { color: text }]} numberOfLines={2}>
              {picked.name}
            </Text>
            <Text style={[styles.pickedMeta, { color: sub }]}>
              {picked.serving_label} - {Math.round(picked.calories)} kcal
            </Text>
            {picked.food_source === 'open_food_facts' ? (
              <View style={styles.sourceNotice}>
                <Text style={styles.sourceNoticeText}>
                  Imported nutrition data. Review values before logging.
                </Text>
              </View>
            ) : null}
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
            {debounced.length === 0 ? (
              <FlatList
                data={recentFoods}
                keyExtractor={(item) => item.food_item.id}
                style={{ marginTop: 12, flex: 1 }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  savedMeals.length === 0 ? (
                    <Text style={{ color: sub, fontFamily: 'Barlow_400Regular', marginTop: 20, textAlign: 'center' }}>
                      No recent foods yet. Search the food catalog to log your first meal.
                    </Text>
                  ) : null
                }
                ListHeaderComponent={
                  <>
                    {savedMeals.length > 0 ? (
                      <View style={styles.sectionBlock}>
                        <Text style={[styles.sectionTitle, { color: text }]}>Saved meals</Text>
                        {savedMeals.map((item) => (
                          <SavedMealRow
                            key={item.id}
                            savedMeal={item}
                            onPress={onLogSavedMeal}
                            onEdit={openEditSavedMeal}
                            onDelete={onDeleteSavedMeal}
                            isDark={isDark}
                          />
                        ))}
                      </View>
                    ) : null}
                    {recentFoods.length > 0 ? <Text style={[styles.sectionTitle, { color: text }]}>Recent foods</Text> : null}
                  </>
                }
                renderItem={({ item }) => <RecentFoodItem recent={item} onPress={onRepeatRecent} isDark={isDark} />}
              />
            ) : (
              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                style={{ marginTop: 12, flex: 1 }}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                  !searching ? (
                    <Text style={{ color: sub, fontFamily: 'Barlow_400Regular', marginTop: 20, textAlign: 'center' }}>
                      No matches. Try another name.
                    </Text>
                  ) : null
                }
                renderItem={({ item }) => <FoodSearchItem food={item} onPress={onPick} isDark={isDark} />}
              />
            )}
          </>
        )}
      </View>
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={styles.scannerRoot}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={scanLocked ? undefined : onBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
            }}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.75)', 'transparent', 'rgba(0,0,0,0.82)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.scannerTop, { paddingTop: insets.top + 12 }]}>
            <TouchableOpacity
              onPress={() => setScannerOpen(false)}
              style={styles.scannerClose}
              activeOpacity={0.8}
            >
              <X size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan barcode</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={styles.scanFrame} />
          <Text style={[styles.scannerHint, { marginBottom: insets.bottom + 28 }]}>
            Align the food barcode inside the frame.
          </Text>
        </View>
      </Modal>
      <Modal transparent visible={!!editingMeal} animationType="fade" onRequestClose={closeEditSavedMeal}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.renameCard, { backgroundColor: bg, borderColor: border }]}>
            <Text style={[styles.renameTitle, { color: text }]}>Edit saved meal</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Meal name"
              placeholderTextColor={sub}
              style={[styles.renameInput, { color: text, borderColor: border }]}
              autoCapitalize="words"
              autoCorrect
              selectTextOnFocus
            />
            <ScrollView style={styles.editItems} keyboardShouldPersistTaps="handled">
              {editingMeal?.items
                .filter((item) => !removedItemIds.includes(item.id))
                .map((item) => (
                  <View key={item.id} style={[styles.editItemRow, { borderColor: border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.editItemName, { color: text }]} numberOfLines={2}>
                        {item.food_item.name}
                      </Text>
                      <Text style={[styles.editItemMeta, { color: sub }]} numberOfLines={1}>
                        {item.food_item.serving_label} - {Math.round(item.food_item.calories * (parseFloat(editServings[item.id] || '0') || 0))} kcal
                      </Text>
                    </View>
                    <TextInput
                      value={editServings[item.id] ?? ''}
                      onChangeText={(value) => setEditServings((current) => ({ ...current, [item.id]: value }))}
                      keyboardType="decimal-pad"
                      style={[styles.editServingInput, { color: text, borderColor: border }]}
                    />
                    <TouchableOpacity
                      onPress={() => {
                        const keptCount = editingMeal.items.length - removedItemIds.length;
                        if (keptCount <= 1) return;
                        setRemovedItemIds((current) => [...current, item.id]);
                      }}
                      hitSlop={10}
                      style={styles.savedActionBtn}
                    >
                      <Trash2 size={16} color="rgba(255,80,80,0.85)" />
                    </TouchableOpacity>
                  </View>
                ))}
            </ScrollView>
            <View style={styles.renameActions}>
              <TouchableOpacity
                onPress={closeEditSavedMeal}
                style={[styles.renameButton, { borderColor: border }]}
              >
                <Text style={[styles.renameButtonText, { color: sub }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void onSaveEditedMeal()} style={[styles.renameButton, styles.renamePrimary]}>
                <Text style={styles.renamePrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function SavedMealRow({
  savedMeal,
  onPress,
  onEdit,
  onDelete,
  isDark,
}: {
  savedMeal: SavedMeal;
  onPress: (savedMeal: SavedMeal) => void;
  onEdit: (savedMeal: SavedMeal) => void;
  onDelete: (savedMeal: SavedMeal) => void;
  isDark: boolean;
}) {
  const title = isDark ? '#fff' : '#1A1D21';
  const sub = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const kcal = Math.round(savedMeal.items.reduce((sum, item) => sum + item.food_item.calories * item.servings, 0));

  return (
    <View style={[styles.recentRow, { borderColor: border }]}>
      <TouchableOpacity style={styles.savedMealMain} onPress={() => onPress(savedMeal)} activeOpacity={0.85}>
        <View style={styles.savedIcon}>
          <Utensils size={16} color="#0a0a0a" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.recentName, { color: title }]} numberOfLines={2}>
            {savedMeal.name}
          </Text>
          <Text style={[styles.recentMeta, { color: sub }]} numberOfLines={1}>
            {savedMeal.items.length} items - {kcal} kcal
          </Text>
        </View>
        <View style={styles.recentAdd}>
          <Plus size={16} color="#0a0a0a" />
        </View>
      </TouchableOpacity>
      <View style={styles.savedActions}>
        <TouchableOpacity onPress={() => onEdit(savedMeal)} hitSlop={10} style={styles.savedActionBtn}>
          <Pencil size={15} color={sub} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(savedMeal)} hitSlop={10} style={styles.savedActionBtn}>
          <Trash2 size={15} color="rgba(255,80,80,0.85)" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RecentFoodItem({
  recent,
  onPress,
  isDark,
}: {
  recent: RecentFoodLog;
  onPress: (recent: RecentFoodLog) => void;
  isDark: boolean;
}) {
  const food = recent.food_item;
  const title = isDark ? '#fff' : '#1A1D21';
  const sub = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
  const kcal = Math.round(food.calories * recent.last_servings);

  return (
    <TouchableOpacity
      style={[styles.recentRow, { borderColor: border }]}
      onPress={() => onPress(recent)}
      activeOpacity={0.85}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.recentName, { color: title }]} numberOfLines={2}>
          {food.name}
        </Text>
        <Text style={[styles.recentMeta, { color: sub }]} numberOfLines={1}>
          {recent.last_servings}x {food.serving_label} - {kcal} kcal - last {recent.last_meal_type}
        </Text>
      </View>
      <View style={styles.recentAdd}>
        <Plus size={16} color="#0a0a0a" />
      </View>
    </TouchableOpacity>
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
  searchWrap: { borderRadius: 14, borderWidth: 1, paddingLeft: 14, paddingRight: 8, flexDirection: 'row', alignItems: 'center' },
  search: { flex: 1, fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(16), paddingVertical: 12 },
  scanBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineMessage: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    marginTop: 8,
    lineHeight: getResponsiveFontSize(17),
  },
  sectionTitle: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(13),
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  sectionBlock: { marginBottom: 8 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  savedMealMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  savedActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  savedActionBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  recentName: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14) },
  recentMeta: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), marginTop: 4 },
  recentAdd: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BRAND,
  },
  savedIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(132,196,65,0.82)',
  },
  picked: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 12 },
  pickedName: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16) },
  pickedMeta: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), marginTop: 6 },
  sourceNotice: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    backgroundColor: 'rgba(132,196,65,0.14)',
  },
  sourceNoticeText: {
    color: BRAND,
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(12),
    lineHeight: getResponsiveFontSize(16),
  },
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
  scannerRoot: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    zIndex: 2,
  },
  scannerClose: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  scannerTitle: {
    color: '#fff',
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(18),
  },
  scanFrame: {
    width: '78%',
    height: 150,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: BRAND,
    backgroundColor: 'rgba(132,196,65,0.08)',
  },
  scannerHint: {
    position: 'absolute',
    bottom: 0,
    paddingHorizontal: 28,
    color: '#fff',
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(14),
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  renameCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  renameTitle: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16), marginBottom: 12 },
  renameInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(15),
  },
  editItems: { maxHeight: 260, marginTop: 12 },
  editItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  editItemName: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(13) },
  editItemMeta: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), marginTop: 3 },
  editServingInput: {
    width: 58,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
    textAlign: 'center',
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(13),
  },
  renameActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  renameButton: {
    minWidth: 82,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  renamePrimary: { borderWidth: 0, backgroundColor: BRAND },
  renameButtonText: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(13) },
  renamePrimaryText: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(13), color: '#0a0a0a' },
});
