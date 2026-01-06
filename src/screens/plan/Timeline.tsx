import React from "react";
import { View, StyleSheet } from "react-native";
import CalendarView from "./CalendarView";
import { useWorkoutPlansStore } from "@/store/workoutPlansStore";

export const Timeline: React.FC = () => {
  const { plans } = useWorkoutPlansStore();

  return (
    <View style={styles.container}>
      <CalendarView plans={plans} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
});
