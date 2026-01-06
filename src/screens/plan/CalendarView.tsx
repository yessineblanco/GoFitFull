import React, { useMemo, useRef, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { useThemeColors } from "@/theme/useThemeColors";
import { useCalendarStore } from "@/store/calendarStore";
import { WorkoutPlan } from "@/types/workoutPlan";
import { BlurView } from "expo-blur";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { format } from "date-fns";
import { AppText } from "@/components/shared/AppText";

interface Props {
  plans: WorkoutPlan[];
}

const CalendarView: React.FC<Props> = ({ plans }) => {
  const colors = useThemeColors();
  const { selectedDate, setSelectedDate } = useCalendarStore();
  const [isYearPickerVisible, setIsYearPickerVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const selected = new Date(selectedDate);
  const year = selected.getFullYear();
  const month = selected.getMonth();

  const firstDay = new Date(year, month, 1);
  const startDay = (firstDay.getDay() + 6) % 7; // monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const plansByDate = useMemo(() => {
    const map = new Map<string, WorkoutPlan[]>();
    for (const plan of plans) {
      if (!plan.planned_date) continue;
      const dateKey = plan.planned_date.split("T")[0];
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(plan);
    }
    return map;
  }, [plans]);

  const todayIso = new Date().toISOString().split("T")[0];

  const days: (number | null)[] = [
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  while (days.length < 42) {
    days.push(null);
  }

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const changeMonth = (delta: number) => {
    triggerHaptic();

    // Slide animation
    const toValue = delta > 0 ? -20 : 20;
    Animated.sequence([
      Animated.timing(slideAnim, {
        toValue,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: delta > 0 ? 20 : -20,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    const newDate = new Date(year, month + delta, 1);
    const originalDay = selected.getDate();
    const daysInNewMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();
    newDate.setDate(Math.min(originalDay, daysInNewMonth));

    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const selectYear = (newYear: number) => {
    triggerHaptic();
    const originalDay = selected.getDate();
    const daysInNewMonth = new Date(newYear, month + 1, 0).getDate();
    const newDate = new Date(newYear, month, Math.min(originalDay, daysInNewMonth));

    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, '0');
    const d = String(newDate.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
    setIsYearPickerVisible(false);
  };

  const years = Array.from({ length: 20 }, (_, i) => year - 6 + i);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleContainer}>
          <TouchableOpacity
            style={styles.monthSelector}
            onPress={() => {
              triggerHaptic();
              setIsYearPickerVisible(!isYearPickerVisible);
            }}
          >
            <AppText variant="h3" style={styles.monthTitle}>
              {isYearPickerVisible
                ? `${year}`
                : format(selected, "MMMM")}
            </AppText>
            {!isYearPickerVisible && <AppText variant="bodyBold" style={styles.yearSubTitle}>{year}</AppText>}
          </TouchableOpacity>
        </View>

        {!isYearPickerVisible && (
          <View style={styles.navButtons}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navButton}>
              <ChevronLeft size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.navDivider} />
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navButton}>
              <ChevronRight size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <BlurView intensity={10} tint="dark" style={styles.frameContainer}>
        {isYearPickerVisible ? (
          <View style={styles.yearGrid}>
            {years.map((y) => (
              <TouchableOpacity
                key={y}
                style={[
                  styles.yearCell,
                  y === year && { backgroundColor: TEMPLATE_COLOR, borderColor: TEMPLATE_COLOR }
                ]}
                onPress={() => selectYear(y)}
              >
                <AppText
                  variant="bodyBold"
                  style={[
                    styles.yearText,
                    y === year && { color: '#000', fontWeight: '800' }
                  ]}
                >
                  {y}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
            {/* Days Header */}
            <View style={styles.headerRow}>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
                <AppText key={i} variant="small" style={styles.headerText}>{d}</AppText>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.grid}>
              {days.map((day, index) => {
                if (!day) {
                  return <View key={index} style={styles.cell} />;
                }

                const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(
                  day
                ).padStart(2, "0")}`;

                const dayPlans = plansByDate.get(iso) ?? [];
                const isSelected = iso === selectedDate;
                const isToday = iso === todayIso;

                // Determine status priority
                const isCompleted = dayPlans.length > 0 && dayPlans.every(p => p.status === 'completed');
                const hasPlanned = dayPlans.length > 0 && !isCompleted;

                return (
                  <TouchableOpacity
                    key={index}
                    style={styles.cell}
                    onPress={() => {
                      triggerHaptic();
                      setSelectedDate(iso);

                      // Scale animation on select
                      Animated.sequence([
                        Animated.timing(scaleAnim, { toValue: 0.9, duration: 100, useNativeDriver: true }),
                        Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
                      ]).start();
                    }}
                    activeOpacity={0.7}
                  >
                    <Animated.View
                      style={[
                        styles.dayCircle,
                        isToday && styles.todayCircle,
                        isSelected && styles.selectedCircle,
                        isSelected && { transform: [{ scale: scaleAnim }] },
                        !isSelected && !isToday && hasPlanned && styles.plannedCircle,
                        !isSelected && !isToday && isCompleted && styles.completedCircle,
                      ]}
                    >
                      <AppText
                        variant={isToday || isSelected ? "bodyBold" : "body"}
                        style={[
                          styles.dayText,
                          isToday && styles.todayDayText,
                          isSelected && styles.selectedDayText,
                        ]}
                      >
                        {day}
                      </AppText>
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}
      </BlurView>
    </View>
  );
};

const TEMPLATE_COLOR = "#a3e635";

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  headerTitleContainer: {
    flex: 1,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  monthTitle: {
    color: "#fff",
    textTransform: 'capitalize',
  },
  yearSubTitle: {
    color: 'rgba(255,255,255,0.3)',
  },
  navButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  navButton: {
    padding: 10,
    paddingHorizontal: 12,
  },
  navDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  frameContainer: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    overflow: 'hidden',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 4
  },
  yearCell: {
    width: '31%',
    aspectRatio: 1.8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  yearText: {
    color: '#fff',
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  headerText: {
    width: "14.28%",
    textAlign: 'center',
    color: 'rgba(255,255,255,0.25)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: "14.28%",
    alignItems: "center",
    marginVertical: 4,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    position: 'relative',
  },
  dayText: {
    color: "#ffffff",
  },
  todayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: 'rgba(163, 230, 53, 0.4)',
    backgroundColor: 'rgba(163, 230, 53, 0.1)',
  },
  todayDayText: {
    color: TEMPLATE_COLOR,
  },
  selectedCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: TEMPLATE_COLOR,
    shadowColor: TEMPLATE_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  selectedDayText: {
    color: "#030303",
    fontWeight: '700',
  },
  plannedCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: 'rgba(163, 230, 53, 0.5)',
    borderStyle: 'solid',
  },
  completedCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: TEMPLATE_COLOR,
    borderStyle: 'solid',
  },
});

export default CalendarView;

