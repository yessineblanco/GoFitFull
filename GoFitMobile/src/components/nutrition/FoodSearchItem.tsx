import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { FoodItem } from '@/services/nutrition';
import { getResponsiveFontSize } from '@/utils/responsive';

type Props = {
  food: FoodItem;
  onPress: (food: FoodItem) => void;
  isDark?: boolean;
};

export function FoodSearchItem({ food, onPress, isDark = true }: Props) {
  const sub = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const title = isDark ? '#fff' : '#1A1D21';
  return (
    <TouchableOpacity
      style={[styles.row, { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
      onPress={() => onPress(food)}
      activeOpacity={0.85}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: title }]} numberOfLines={2}>
          {food.name}
        </Text>
        <Text style={[styles.meta, { color: sub }]}>
          {food.serving_label} · {Math.round(food.calories)} kcal · P {Math.round(food.protein_g)} / C {Math.round(food.carbs_g)} / F{' '}
          {Math.round(food.fat_g)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  name: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(14) },
  meta: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), marginTop: 4 },
});
