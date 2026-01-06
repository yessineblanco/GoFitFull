import React, { useMemo, useRef, useState, useCallback } from "react";
import { View, ScrollView, Pressable, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Play, Info, Plus, Lock, Trash2 } from "lucide-react-native";
import { useThemeColors } from "@/theme/useThemeColors";
import { useCalendarStore } from "@/store/calendarStore";
import { useSessionsStore } from "@/store/sessionsStore";
import { useWorkoutPlansStore } from "@/store/workoutPlansStore";
import { useNavigation, useFocusEffect, CommonActions } from "@react-navigation/native";
import { format, parseISO } from "date-fns";
import { enUS } from "date-fns/locale";
import { workoutService } from "@/services/workouts";
import { dialogManager } from "@/components/shared/CustomDialog";
import { GymBagModal } from "@/components/plan/GymBagModal";
import { TimePickerPill } from "@/components/plan/TimePickerPill";
import { AppText } from "@/components/shared/AppText";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const MyWorkouts: React.FC = () => {
  const colors = useThemeColors();
  const selectedDate = useCalendarStore((s) => s.selectedDate);
  const { plans, fetch: fetchPlans, removePlan, updatePlanTime } = useWorkoutPlansStore();
  const { sessions, fetch } = useSessionsStore();
  const navigation = useNavigation<any>();

  const [showGymBag, setShowGymBag] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  // Combine sessions and plans
  const itemsOfDay = useMemo(() => {
    const daySessions = sessions.filter((s: any) => s.date?.split("T")[0] === selectedDate);
    const dayPlans = plans.filter((p: any) => {
      const planDate = p.planned_date?.split("T")[0];
      if (planDate !== selectedDate) return false;
      if (p.status !== 'completed') return true;
      const linkedSession = sessions.find((s: any) => s.id === p.session_id);
      if (!linkedSession) return true;
      const sessionDate = linkedSession.date?.split("T")[0];
      if (sessionDate === selectedDate) {
        return false;
      }
      return true;
    });

    const merged = [
      ...dayPlans.map(p => {
        let completionInfo = undefined;
        if (p.status === 'completed' && p.session_id) {
          const s = sessions.find((sess: any) => sess.id === p.session_id);
          if (s) {
            completionInfo = { date: (s.date as string)?.split("T")[0] };
          }
        }
        return { ...p, type: 'plan', completionInfo };
      }),
      ...daySessions.map(s => ({ ...s, type: 'session' }))
    ];

    return merged;
  }, [sessions, plans, selectedDate]);

  const formattedDate = selectedDate ? parseISO(selectedDate) : new Date();

  const TEMPLATE_COLOR = "#a3e635"; // Lime Green
  // Hybrid Dimensions: Smaller width to show context
  const CARD_WIDTH = SCREEN_WIDTH * 0.75;
  const CARD_HEIGHT = 240; // Reduced from 380

  const handleStartWorkout = async (plan: any) => {
    // Check if session is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const planDate = parseISO(selectedDate);
    planDate.setHours(0, 0, 0, 0);

    const isFuture = planDate.getTime() > today.getTime();

    if (isFuture) {
      dialogManager.show(
        "Session Locked",
        `This session is scheduled for ${format(planDate, 'MMMM do')}. Please wait until the date arrives to start your workout.`,
        "info",
        { confirmText: "Understood" }
      );
      return;
    }

    try {
      const w = plan.workout;
      if (!w) return;

      let exercisesToUse = w.exercises;

      if (!exercisesToUse || exercisesToUse.length === 0) {
        const fullWorkout = await workoutService.getWorkoutById(w.id);
        if (fullWorkout && fullWorkout.exercises) {
          exercisesToUse = fullWorkout.exercises;
        }
      }

      if (!exercisesToUse || exercisesToUse.length === 0) {
        dialogManager.error("Error", "This workout has no exercises.");
        return;
      }

      const formattedExercises = exercisesToUse.map((ex: any) => ({
        id: ex.id,
        name: ex.name,
        sets: ex.sets?.toString() || '3',
        reps: ex.reps?.toString() || '10',
        restTime: ex.restTime?.toString() || ex.rest_time?.toString() || '60',
        image: ex.image || ex.image_url,
      }));

      // Navigate to Library tab's WorkoutSession screen
      navigation.dispatch(
        CommonActions.navigate({
          name: "Library",
          params: {
            screen: "WorkoutSession",
            params: {
              workoutId: w.id,
              workoutName: w.name,
              workoutType: w.is_custom ? 'custom' : 'native',
              exercises: formattedExercises,
              planId: plan.id,
              returnTo: 'Plan',
            },
          },
        })
      );

    } catch (error) {
      console.error("Failed to start workout:", error);
      dialogManager.error("Error", "Failed to start workout session.");
    }
  };

  const handleDeletePlan = (plan: any) => {
    dialogManager.show(
      "Remove Workout?",
      `Are you sure you want to remove "${plan.workout?.name}" from your plan?`,
      "warning",
      {
        confirmText: "Remove",
        showCancel: true,
        cancelText: "Cancel",
        onConfirm: async () => {
          try {
            await removePlan(plan.id);
          } catch (error) {
            dialogManager.error("Error", "Failed to remove workout from plan.");
          }
        },
      }
    );
  };

  const styles = StyleSheet.create({
    container: { paddingBottom: 24 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 16,
      marginBottom: 16,
    },
    headerTitle: {
      color: '#fff',
      letterSpacing: 1,
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: TEMPLATE_COLOR,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
    },
    addBtnText: {
      color: '#000',
      marginLeft: 6,
      fontWeight: '800',
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 20,
      gap: 16,
    },
    cardContainer: {
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      borderRadius: 24,
      overflow: "hidden",
      backgroundColor: "#111",
      borderWidth: 1.5,
      borderColor: "rgba(255,255,255,0.08)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.6,
      shadowRadius: 16,
      elevation: 15,
    },
    cardImage: {
      ...StyleSheet.absoluteFillObject,
      opacity: 0.8,
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
    },
    cardOverlay: {
      flex: 1,
      padding: 20,
      justifyContent: 'space-between',
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    badgeWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    statusIndicator: {
      width: 6,
      height: 6,
      borderRadius: 3,
      marginRight: 8,
    },
    badgeText: {
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    deleteButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    cardMiddle: {
      marginTop: 'auto',
      marginBottom: 12,
    },
    cardTitle: {
      color: '#fff',
      fontWeight: '900',
      fontSize: 24,
      marginBottom: 8,
      letterSpacing: -0.5,
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    statPill: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    statText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    cardActions: {
      flexDirection: 'row',
      gap: 10,
    },
    actionButton: {
      flex: 1.5,
      backgroundColor: TEMPLATE_COLOR,
      borderRadius: 14,
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: TEMPLATE_COLOR,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
    },
    lockedButton: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      shadowOpacity: 0,
    },
    secondaryActionButton: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 14,
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
    },
    actionText: {
      color: '#000',
      marginLeft: 8,
      fontWeight: '800',
      fontSize: 14,
      letterSpacing: 0.5,
    },
    secondaryActionText: {
      color: '#fff',
      marginLeft: 6,
      fontWeight: '700',
      fontSize: 12,
    },
    emptyState: {
      height: 160,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.08)',
      borderStyle: 'dashed',
      borderRadius: 24,
      marginTop: 8,
    },
    emptyIconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: 'rgba(163, 230, 53, 0.05)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    emptyText: {
      letterSpacing: 1,
    },
  });


  return (
    <View style={styles.container}>
      <GymBagModal
        visible={showGymBag}
        onClose={() => setShowGymBag(false)}
      />

      {/* Section Header */}
      <View style={styles.headerRow}>
        <View>
          <AppText variant="h4" style={styles.headerTitle}>YOUR TASKS</AppText>
          <AppText variant="small" style={{ color: 'rgba(255,255,255,0.4)', marginTop: -2 }}>
            {itemsOfDay.length} active items for today
          </AppText>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.addBtn,
            { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] }
          ]}
          onPress={() =>
            navigation.dispatch(
              CommonActions.navigate({
                name: "Library",
                params: {
                  screen: "LibraryMain",
                  params: { date: selectedDate },
                },
              })
            )
          }
        >
          <Plus size={16} color="#000" strokeWidth={3} />
          <AppText variant="small" style={styles.addBtnText}>ADD</AppText>
        </Pressable>
      </View>

      {/* Content */}
      {itemsOfDay.length === 0 ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Pressable
            style={({ pressed }) => [
              styles.emptyState,
              { opacity: pressed ? 0.8 : 1, backgroundColor: pressed ? 'rgba(255,255,255,0.02)' : 'transparent' }
            ]}
            onPress={() =>
              navigation.dispatch(
                CommonActions.navigate({
                  name: "Library",
                  params: {
                    screen: "LibraryMain",
                    params: { date: selectedDate },
                  },
                })
              )
            }
          >
            <View style={styles.emptyIconContainer}>
              <Plus size={32} color="rgba(163, 230, 53, 0.3)" />
            </View>
            <AppText variant="bodyBold" style={[styles.emptyText, { color: 'rgba(255,255,255,0.5)' }]}>EMPTY SCHEDULE</AppText>
            <AppText variant="small" style={{ color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Tap to add your first workout</AppText>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          horizontal
          ref={scrollRef}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          snapToInterval={CARD_WIDTH + 16}
          decelerationRate="fast"
        >
          {itemsOfDay.map((item: any, index) => {
            const w = item.workout;
            if (!w) return null;
            const isPlan = item.type === 'plan';
            const statusLabel = isPlan
              ? (item.status === 'skipped' ? 'SKIPPED' : item.status === 'completed'
                ? (item.completionInfo ? `DONE ${format(parseISO(item.completionInfo.date), 'MMM d').toUpperCase()}` : 'COMPLETED')
                : (item.planned_day ? `DAY ${item.planned_day}` : 'SCHEDULED'))
              : 'COMPLETED';

            const statusColor = item.status === 'completed' || !isPlan ? '#4CAF50' :
              item.status === 'skipped' ? '#EF4444' : TEMPLATE_COLOR;

            const isFuture = parseISO(selectedDate).setHours(0, 0, 0, 0) > new Date().setHours(0, 0, 0, 0);

            return (
              <Pressable
                key={`${item.type}-${item.id}-${index}`}
                style={({ pressed }) => [
                  styles.cardContainer,
                  { transform: [{ scale: pressed ? 0.98 : 1 }] }
                ]}
                onPress={() => {
                  if (isPlan && item.status !== 'completed') {
                    handleStartWorkout(item);
                  } else {
                    navigation.dispatch(
                      CommonActions.navigate({
                        name: "Workouts",
                        params: {
                          screen: "WorkoutDetails",
                          params: { session: item }
                        }
                      })
                    );
                  }
                }}
              >
                {/* Background Image with Overlay */}
                <View style={StyleSheet.absoluteFill}>
                  {w.image_url ? (
                    <Image source={{ uri: w.image_url }} style={styles.cardImage} contentFit="cover" transition={400} />
                  ) : (
                    <View style={[styles.cardImage, { backgroundColor: '#111' }]} />
                  )}
                  <LinearGradient
                    colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.95)']}
                    locations={[0, 0.4, 1]}
                    style={styles.gradient}
                  />
                </View>

                <View style={styles.cardOverlay}>
                  {/* Top: Status & Delete */}
                  <View style={styles.cardTop}>
                    <View style={styles.badgeWrapper}>
                      <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
                      <AppText variant="small" style={[styles.badgeText, { color: '#fff', fontSize: 11 }]}>{statusLabel}</AppText>
                    </View>

                    {isPlan && item.status !== 'completed' && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.deleteButton,
                          { backgroundColor: pressed ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0,0,0,0.4)' }
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeletePlan(item);
                        }}
                      >
                        <Trash2 size={14} color="#fff" />
                      </Pressable>
                    )}
                  </View>

                  {/* Middle: Title & Meta */}
                  <View style={styles.cardMiddle}>
                    <AppText variant="h3" style={styles.cardTitle} numberOfLines={2}>{w.name}</AppText>
                    <View style={styles.statsContainer}>
                      <View style={styles.statPill}>
                        <AppText variant="small" style={styles.statText}>{w.estimated_duration || 45} MIN</AppText>
                      </View>
                      {isPlan && item.status === 'planned' && (
                        <TimePickerPill
                          time={item.planned_time}
                          onTimeChange={(time) => updatePlanTime(item.id, time)}
                        />
                      )}
                    </View>
                  </View>

                  {/* Bottom: Actions */}
                  <View style={styles.cardActions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.secondaryActionButton,
                        { opacity: pressed ? 0.7 : 1 }
                      ]}
                      onPress={(e) => {
                        e.stopPropagation();
                        navigation.dispatch(
                          CommonActions.navigate({
                            name: "Library",
                            params: {
                              screen: "WorkoutDetail",
                              params: {
                                workoutId: w.id,
                                workoutName: w.name,
                                workoutImage: w.image_url,
                                workoutDifficulty: w.difficulty || 'Intermediate',
                                returnTo: 'Plan'
                              }
                            }
                          })
                        );
                      }}
                    >
                      <Info size={16} color="#fff" />
                      <AppText variant="small" style={styles.secondaryActionText}>DETAILS</AppText>
                    </Pressable>

                    {isPlan && item.status !== 'completed' && (
                      <Pressable
                        style={({ pressed }) => [
                          styles.actionButton,
                          isFuture && styles.lockedButton,
                          { opacity: pressed ? 0.9 : 1 }
                        ]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleStartWorkout(item);
                        }}
                      >
                        {isFuture ? (
                          <>
                            <Lock size={16} color="rgba(0,0,0,0.4)" />
                            <AppText variant="bodyBold" style={[styles.actionText, { color: 'rgba(0,0,0,0.4)' }]}>LOCKED</AppText>
                          </>
                        ) : (
                          <>
                            <Play size={16} color="#000" fill="#000" />
                            <AppText variant="bodyBold" style={styles.actionText}>START</AppText>
                          </>
                        )}
                      </Pressable>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

export default MyWorkouts;
