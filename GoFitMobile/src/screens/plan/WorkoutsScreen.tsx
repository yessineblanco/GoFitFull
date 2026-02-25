import React, { useRef, useState, useEffect } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  StatusBar,
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { ScreenContainer } from "@/components/shared";
import { Timeline } from "./Timeline";

import MyWorkouts from "./MyWorkouts";
import { useThemeColors } from "@/theme/useThemeColors";
import { useThemeStore } from "@/store/themeStore";
import { getBackgroundColor, getOverlayColor } from "@/utils/colorUtils";
import { useUIStore } from "@/store/uiStore";
import { useWorkoutPlansStore } from "@/store/workoutPlansStore";
import { useSessionsStore } from "@/store/sessionsStore";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";

import { ScreenHeader } from "@/components/shared/ScreenHeader";

// --- Divider Component ---
const Divider: React.FC = () => (
  <View style={styles.divider} />
);

// --- WorkoutsScreen ---
export const WorkoutsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { isDark } = useThemeStore();
  const scrollY = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const setTabBarVisible = useUIStore((state) => state.setTabBarVisible);
  const fetchPlans = useWorkoutPlansStore((s: any) => s.fetch);
  const fetchSessions = useSessionsStore((s: any) => s.fetch);

  useFocusEffect(
    useCallback(() => {
      fetchPlans();
      fetchSessions();
    }, [fetchPlans, fetchSessions])
  );

  const [contentHeight, setContentHeight] = useState(1);
  const [layoutHeight, setLayoutHeight] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Barre de progression en haut
  const indicatorWidth = scrollY.interpolate({
    inputRange: [0, Math.max(contentHeight - layoutHeight, 1)],
    outputRange: ["0%", "100%"], // largeur en %
    extrapolate: "clamp",
  });

  // Affichage du bouton ScrollToTop seulement après 200px de scroll
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = event.nativeEvent.contentOffset.y;
        setShowScrollTop(y > 200);
      },
    }
  );

  // Fonction pour remonter en haut
  const scrollToTop = () => {
    (scrollViewRef.current as any)?.scrollTo({ y: 0, animated: true });
  };

  return (
    <View style={{ flex: 1, backgroundColor: getBackgroundColor(isDark) }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Global Mesh Gradient Background */}
      <View style={[styles.glowContainer, { backgroundColor: getBackgroundColor(isDark) }]}>
        <Animated.View
          style={[
            styles.glowPoint,
            styles.glowTopLeft,
            {
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.3]
              }),
              transform: [{
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.4]
                })
              }]
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(132, 196, 65, 0.4)', 'transparent']}
            style={styles.full}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.glowPoint,
            styles.glowBottomRight,
            {
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.1]
              }),
              transform: [{
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.4, 1]
                })
              }]
            }
          ]}
        >
          <LinearGradient
            colors={['rgba(132, 196, 65, 0.6)', 'transparent']}
            style={styles.full}
          />
        </Animated.View>
      </View>

      <ScreenHeader
        title="MY PLAN"
        rightElement={
          <View style={[styles.progressBarBackground, { backgroundColor: getOverlayColor(isDark, 0.1) }]}>
            <Animated.View
              style={[styles.progressBar, { backgroundColor: '#84c441', width: indicatorWidth }]}
            />
          </View>
        }
      />

      <ScreenContainer
        ref={scrollViewRef}
        scrollable
        // We move the padding to contentContainerStyle for better reliability with absolute headers
        contentContainerStyle={{
          paddingTop: (insets.top > 0 ? insets.top : 20) + 70 + 10,
          paddingHorizontal: 0
        }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onLayout={(e) => setLayoutHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContentHeight(h)}
        fixed={
          showScrollTop && (
            <TouchableOpacity
              style={[styles.scrollTopButton, { backgroundColor: colors.primary }]}
              onPress={scrollToTop}
            >
              <Text style={styles.scrollTopText}>↑</Text>
            </TouchableOpacity>
          )
        }
      >
        <Timeline />
        <MyWorkouts />
      </ScreenContainer>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  // Removed heroContainer, title, subtitle as they are replaced by WeatherWidget

  progressBarBackground: {
    height: 2,
    borderRadius: 1,
    marginBottom: 8,
    marginHorizontal: 16,
    width: "auto",
  },
  progressBar: {
    height: 2,
    borderRadius: 1,
    width: "0%", // sera calculé dynamiquement
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginHorizontal: 16,
    marginVertical: 8,
  },
  scrollTopButton: {
    position: "absolute",
    bottom: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.8,
    zIndex: 100, // toujours au-dessus
  },
  scrollTopText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
    overflow: 'hidden',
  },
  glowPoint: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
  },
  glowTopLeft: {
    top: -150,
    left: -150,
  },
  glowBottomRight: {
    bottom: -150,
    right: -150,
  },
  full: {
    flex: 1,
    borderRadius: 250,
  },
});

export default WorkoutsScreen;
