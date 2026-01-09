import React, { useMemo, useRef, useState, useEffect } from "react";
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

  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const entryAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry Animation
    Animated.spring(entryAnim, {
      toValue: 1,
      tension: 40,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const years = Array.from({ length: 20 }, (_, i) => year - 6 + i);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.mainCard,
          {
            opacity: entryAnim,
            transform: [
              {
                translateY: entryAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0],
                }),
              },
              {
                scale: entryAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.95, 1],
                }),
              },
            ],
          }
        ]}
      >
        <BlurView intensity={20} tint="dark" style={styles.glassContent}>
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
                  {isYearPickerVisible ? `${year}` : format(selected, "MMMM")}
                </AppText>
                {!isYearPickerVisible && (
                  <View style={styles.yearBadge}>
                    <AppText variant="small" style={styles.yearBadgeText}>{year}</AppText>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {!isYearPickerVisible && (
              <View style={styles.navButtons}>
                <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.navButton}>
                  <ChevronLeft size={18} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => changeMonth(1)} style={styles.navButton}>
                  <ChevronRight size={18} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </View>
            )}
          </View>

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
      </Animated.View>
    </View>
  );
};

const TEMPLATE_COLOR = "#84c441";

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    position: 'relative',
  },
  mainCard: {
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(132, 196, 65, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  glassContent: {
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  headerTitleContainer: {
    flex: 1,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  monthTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: '800',
    textTransform: 'capitalize',
    letterSpacing: -0.5,
  },
  yearBadge: {
    backgroundColor: 'rgba(132, 196, 65, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(132, 196, 65, 0.3)',
  },
  yearBadgeText: {
    color: '#84c441',
    fontWeight: '700',
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
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
    borderColor: 'rgba(132, 196, 65, 0.4)',
    backgroundColor: 'rgba(132, 196, 65, 0.1)',
  },
  todayDayText: {
    color: '#84c441',
  },
  selectedCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#84c441',
    shadowColor: '#84c441',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  selectedDayText: {
    color: "#fff",
    fontWeight: '800',
  },
  plannedCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: 'rgba(132, 196, 65, 0.4)',
    borderStyle: 'solid',
  },
  completedCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#84c441',
    borderStyle: 'solid',
    backgroundColor: 'rgba(132, 196, 65, 0.1)',
  },
});

export default CalendarView;

