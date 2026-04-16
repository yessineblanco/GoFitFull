import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { DayTotals, NutritionGoals } from '@/services/nutrition';
import { getResponsiveFontSize } from '@/utils/responsive';

const BRAND = '#84c441';
const CARB = '#5ba3d0';
const FAT = '#e6b045';

type Props = {
  totals: DayTotals;
  goals: NutritionGoals;
  isDark?: boolean;
};

function Ring({
  size,
  stroke,
  progress,
  color,
}: {
  size: number;
  stroke: number;
  progress: number;
  color: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  const dash = c * p;
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${dash} ${c}`}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

export function MacroRings({ totals, goals, isDark = true }: Props) {
  const calGoal = Math.max(1, goals.calories_goal);
  const calProg = totals.calories / calGoal;

  const dim = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const label = isDark ? '#fff' : '#1A1D21';

  const macros = [
    { label: 'Protein', cur: totals.protein_g, goal: Math.max(0.1, goals.protein_g), color: BRAND },
    { label: 'Carbs', cur: totals.carbs_g, goal: Math.max(0.1, goals.carbs_g), color: CARB },
    { label: 'Fat', cur: totals.fat_g, goal: Math.max(0.1, goals.fat_g), color: FAT },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.calBlock}>
        <View style={styles.calRing}>
          <Ring size={112} stroke={10} progress={calProg} color={BRAND} />
          <View style={styles.calCenter}>
            <Text style={[styles.calVal, { color: label }]}>{Math.round(totals.calories)}</Text>
            <Text style={[styles.calSub, { color: dim }]}>of {goals.calories_goal} kcal</Text>
          </View>
        </View>
      </View>
      <View style={styles.row}>
        {macros.map((m) => (
          <View key={m.label} style={styles.macro}>
            <Ring size={64} stroke={6} progress={m.cur / m.goal} color={m.color} />
            <Text style={[styles.macroLbl, { color: label }]}>{m.label}</Text>
            <Text style={[styles.macroSub, { color: dim }]}>
              {Math.round(m.cur)} / {Math.round(m.goal)} g
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginVertical: 8 },
  calBlock: { marginBottom: 18 },
  calRing: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  calCenter: { position: 'absolute', alignItems: 'center' },
  calVal: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(22) },
  calSub: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11), marginTop: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 8 },
  macro: { alignItems: 'center', flex: 1 },
  macroLbl: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(11), marginTop: 6 },
  macroSub: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(10), marginTop: 2 },
});
