import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import type { MealLogWithFood, MealType } from '@/services/nutrition';
import { getResponsiveFontSize } from '@/utils/responsive';

const BRAND = '#84c441';

type Props = {
  title: string;
  mealType: MealType;
  logs: MealLogWithFood[];
  onAdd: (mealType: MealType) => void;
  onDelete: (id: string) => void;
  isDark?: boolean;
};

export function MealSection({ title, mealType, logs, onAdd, onDelete, isDark = true }: Props) {
  const titleC = isDark ? '#fff' : '#1A1D21';
  const sub = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';
  const glass = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)';
  const border = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={[styles.card, { backgroundColor: glass, borderColor: border }]}>
      <View style={styles.head}>
        <Text style={[styles.h, { color: titleC }]}>{title}</Text>
        <TouchableOpacity onPress={() => onAdd(mealType)} hitSlop={10} style={styles.addBtn}>
          <Plus size={20} color={BRAND} />
        </TouchableOpacity>
      </View>
      {logs.length === 0 ? (
        <Text style={[styles.empty, { color: sub }]}>Nothing logged yet.</Text>
      ) : (
        logs.map((log) => {
          const kcal = Math.round(log.food_item.calories * log.servings);
          return (
            <View key={log.id} style={[styles.item, { borderTopColor: border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: titleC }]} numberOfLines={2}>
                  {log.food_item.name}
                </Text>
                <Text style={[styles.itemMeta, { color: sub }]}>
                  {log.servings}× {log.food_item.serving_label} · {kcal} kcal
                </Text>
              </View>
              <TouchableOpacity onPress={() => onDelete(log.id)} hitSlop={12} style={{ padding: 6 }}>
                <Trash2 size={18} color="rgba(255,80,80,0.85)" />
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  h: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(15) },
  addBtn: { padding: 4 },
  empty: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(12), paddingVertical: 6 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1 },
  itemName: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(13) },
  itemMeta: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), marginTop: 3 },
});
