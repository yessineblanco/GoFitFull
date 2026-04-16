import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useNutritionStore } from '@/stores/nutritionStore';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useThemeStore } from '@/store/themeStore';
import { getBackgroundColor, getGlassBg, getGlassBorder } from '@/utils/colorUtils';

const BRAND = '#84c441';

export default function NutritionGoalsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useThemeStore();
  const { loadGoals, saveGoals } = useNutritionStore();

  const [cal, setCal] = useState('');
  const [p, setP] = useState('');
  const [c, setC] = useState('');
  const [f, setF] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const g = await loadGoals();
      if (!cancelled && g) {
        setCal(String(g.calories_goal));
        setP(String(g.protein_g));
        setC(String(g.carbs_g));
        setF(String(g.fat_g));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadGoals]);

  const bg = getBackgroundColor(isDark);
  const text = isDark ? '#fff' : '#1A1D21';
  const sub = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)';
  const glass = getGlassBg(isDark);
  const border = getGlassBorder(isDark);

  const onSave = async () => {
    const calories_goal = Math.round(parseFloat(cal.replace(',', '.')));
    const protein_g = parseFloat(p.replace(',', '.'));
    const carbs_g = parseFloat(c.replace(',', '.'));
    const fat_g = parseFloat(f.replace(',', '.'));
    if (
      !Number.isFinite(calories_goal) ||
      calories_goal < 800 ||
      calories_goal > 10000 ||
      !Number.isFinite(protein_g) ||
      protein_g < 0 ||
      protein_g > 500 ||
      !Number.isFinite(carbs_g) ||
      carbs_g < 0 ||
      carbs_g > 800 ||
      !Number.isFinite(fat_g) ||
      fat_g < 0 ||
      fat_g > 300
    ) {
      return;
    }
    setSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await saveGoals({ calories_goal, protein_g, carbs_g, fat_g });
    setSaving(false);
    if (res) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: bg }]}>
        <ActivityIndicator color={BRAND} />
      </View>
    );
  }

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
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 18,
        }}
        keyboardShouldPersistTaps="handled"
      >
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
          <Text style={[styles.title, { color: text }]}>Daily goals</Text>
          <View style={{ width: 42 }} />
        </View>

        <Text style={[styles.hint, { color: sub }]}>Targets roll into your nutrition rings. Values in kcal and grams.</Text>

        {[
          { label: 'Calories (kcal)', val: cal, set: setCal, keyboard: 'number-pad' as const },
          { label: 'Protein (g)', val: p, set: setP, keyboard: 'decimal-pad' as const },
          { label: 'Carbs (g)', val: c, set: setC, keyboard: 'decimal-pad' as const },
          { label: 'Fat (g)', val: f, set: setF, keyboard: 'decimal-pad' as const },
        ].map((field) => (
          <View key={field.label} style={{ marginBottom: 14 }}>
            <Text style={[styles.lbl, { color: text }]}>{field.label}</Text>
            <View style={[styles.inWrap, { backgroundColor: glass, borderColor: border }]}>
              <TextInput
                value={field.val}
                onChangeText={field.set}
                keyboardType={field.keyboard}
                placeholder="0"
                placeholderTextColor={sub}
                style={[styles.in, { color: text }]}
              />
            </View>
          </View>
        ))}

        <TouchableOpacity onPress={() => void onSave()} disabled={saving} activeOpacity={0.9} style={{ borderRadius: 14, overflow: 'hidden', marginTop: 8 }}>
          <LinearGradient colors={['#6da835', BRAND]} style={styles.saveBtn}>
            <Text style={styles.saveTxt}>{saving ? 'Saving…' : 'Save goals'}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(20) },
  hint: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), lineHeight: 18, marginBottom: 18 },
  lbl: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(13), marginBottom: 6 },
  inWrap: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14 },
  in: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(16), paddingVertical: 12 },
  saveBtn: { paddingVertical: 14, alignItems: 'center' },
  saveTxt: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(16), color: '#0a0a0a' },
});
