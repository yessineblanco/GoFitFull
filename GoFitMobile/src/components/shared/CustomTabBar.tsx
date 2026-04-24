import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, useWindowDimensions, Animated, Easing, Keyboard, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
// Import icons from the main package (correct way for Metro bundler)
import {
  LayoutGrid,
  Calendar,
  Dumbbell,
  BarChart3,
  Settings
} from 'lucide-react-native';
import type { AppTabParamList } from '@/types';
import { TabBadge } from './TabBadge';
import { useUIStore } from '@/store/uiStore';
import { useThemeStore } from '@/store/themeStore';
import { theme as themeConfig } from '@/theme';

const BRAND_PRIMARY = themeConfig.colors.primary;
import { useThemeColors } from '@/theme/useThemeColors';

// Tab bar dimensions - optimized for different screen sizes
const MAX_TAB_BAR_WIDTH = 360;
const TAB_BAR_HEIGHT = 74; // Sleeker height
const TAB_BAR_BORDER_RADIUS = 37;

// Button dimensions
const BUTTON_SIZE = 58; // More elegant size
const ICON_SIZE = 22;
const HORIZONTAL_PADDING = 8; // Safety margin for rounded ends

const ICON_STROKE_WIDTH = 2.5;

// Tab icon mapping - 5 tabs total
const TAB_ICONS: Record<keyof AppTabParamList, typeof LayoutGrid> = {
  Home: LayoutGrid,        // Grid icon (home)
  Workouts: Calendar,      // Calendar icon (workouts)
  Library: Dumbbell,       // Dumbbell icon (exercises/library)
  Progress: BarChart3,     // Bar chart icon (stats)
  Profile: Settings,       // Settings/gear icon (profile)
};

// Tab order - 5 tabs: Home, Workouts, Library (Exercises), Progress (Stats), Profile
const TAB_ORDER: Array<keyof AppTabParamList> = ['Home', 'Workouts', 'Library', 'Progress', 'Profile'];

const TAB_ROOT_SCREENS: Partial<Record<keyof AppTabParamList, string>> = {
  Home: 'HomeMain',
  Workouts: 'WorkoutsMain',
  Library: 'LibraryMain',
  Progress: 'ProgressMain',
  Profile: 'ProfileMain',
};

interface ThemeColors {
  activeButton: string;
  activeIcon: string;
  inactiveIcon: string;
  bg: string;
  tint: string;
  border: string;
}

interface CustomTabBarProps extends BottomTabBarProps {
  /**
   * Optional badge counts for each tab
   * Key should match route names from AppTabParamList
   */
  badgeCounts?: Partial<Record<keyof AppTabParamList, number | null>>;
}

interface TabButtonProps {
  routeName: keyof AppTabParamList;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  buttonPosition: number;
  badgeCount: number | null;
  accessibilityLabel: string;
  colors: ThemeColors;
}

const TabButton: React.FC<TabButtonProps> = React.memo(({
  routeName,
  isFocused,
  onPress,
  onLongPress,
  buttonPosition,
  badgeCount,
  accessibilityLabel,
  colors,
}) => {
  const Icon = TAB_ICONS[routeName];

  const scaleAnim = useRef(new Animated.Value(isFocused ? 1.1 : 0.95)).current;
  const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0.8)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;

  const iconRotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg'],
  });

  useEffect(() => {
    const animations: Animated.CompositeAnimation[] = [
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.1 : 0.95,
        useNativeDriver: true,
        tension: 200,
        friction: 15,
      }),
      Animated.timing(opacityAnim, {
        toValue: isFocused ? 1 : 0.8,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ];

    if (routeName === 'Profile') {
      animations.push(
        Animated.spring(rotationAnim, {
          toValue: isFocused ? 1 : 0,
          useNativeDriver: true,
          tension: 150,
          friction: 10,
        })
      );
    }

    Animated.parallel(animations).start();
  }, [isFocused, routeName, scaleAnim, opacityAnim, rotationAnim]);

  const animatedButtonStyle = {
    transform: [{ scale: scaleAnim }],
    opacity: opacityAnim,
  };

  const animatedIconStyle = useMemo(() => {
    const transforms: any[] = [];
    if (routeName === 'Profile') {
      transforms.push({ rotate: iconRotation });
    }
    return transforms.length > 0 ? { transform: transforms } : {};
  }, [routeName, iconRotation]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      tension: 300,
      friction: 15,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: isFocused ? 1.1 : 0.95,
      useNativeDriver: true,
      tension: 200,
      friction: 15,
    }).start();
  }, [scaleAnim, isFocused]);

  if (!isFocused) {
    return (
      <Animated.View
        style={[
          styles.inactiveButtonWrapper,
          { left: buttonPosition },
          animatedButtonStyle,
        ]}
      >
        <TouchableOpacity
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          style={styles.pressable}
        >
          <View style={styles.iconWrapper}>
            <Animated.View style={animatedIconStyle}>
              <Icon
                size={ICON_SIZE}
                color={colors.inactiveIcon}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </Animated.View>
            {badgeCount !== null && badgeCount !== undefined && (
              <TabBadge count={badgeCount} size="small" />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.button,
        styles.activeButton,
        { left: buttonPosition },
        animatedButtonStyle,
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: true }}
        accessibilityLabel={accessibilityLabel}
        style={styles.pressable}
      >
        <View style={styles.iconContainer}>
          <View style={styles.iconWrapper}>
            <Animated.View style={animatedIconStyle}>
              <Icon
                size={ICON_SIZE}
                color={colors.activeIcon}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </Animated.View>
            {badgeCount !== null && badgeCount !== undefined && (
              <TabBadge count={badgeCount} size="small" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

/**
 * Custom tab bar component matching the Figma design
 * 
 * Design specifications:
 * - Rounded pill-shaped container with black background (#030303) and 40px border radius
 * - 5 circular buttons (64x64px) evenly spaced and centered - smaller for better spacing
 * - Active button: Vibrant green background (#84c441) with white icon (#ffffff) - using brand colors
 * - Inactive buttons: Subtle green tint background with lighter green icons - using brand colors
 * - Icons: LayoutGrid (Home), Calendar (Workouts), LibrarySquare (Exercises), BarChart3 (Stats), Settings (Profile)
 * - Buttons are perfectly centered vertically and horizontally within the container
 * - All colors use the brand palette: #84c441, #8dbb5a, #030303, #ffffff
 */
export const CustomTabBar: React.FC<CustomTabBarProps> = React.memo(({
  state,
  descriptors,
  navigation,
  badgeCounts = {},
}) => {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const colors = useThemeColors();
  const { isDark } = useThemeStore();

  const setTabBarVisible = useUIStore((store) => store.setTabBarVisible);
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);

  // Responsive widths with safety padding for rounded ends
  const TAB_BAR_WIDTH = Math.min(MAX_TAB_BAR_WIDTH, SCREEN_WIDTH - 40);
  const INNER_WIDTH = TAB_BAR_WIDTH - (HORIZONTAL_PADDING * 2);
  const BUTTON_SPACING = (INNER_WIDTH - BUTTON_SIZE) / (TAB_ORDER.length - 1);
  const BUTTON_POSITIONS = TAB_ORDER.map((_, index) => (index * BUTTON_SPACING) + HORIZONTAL_PADDING);

  const indicatorAnim = useRef(new Animated.Value(BUTTON_POSITIONS[state.index])).current;

  const themeColors: ThemeColors = useMemo(() => ({
    activeButton: colors.primary,
    activeIcon: '#ffffff',
    inactiveIcon: isDark ? 'rgba(132, 196, 65, 0.6)' : 'rgba(132, 196, 65, 0.8)',
    bg: isDark ? 'rgba(3, 3, 3, 0.7)' : 'rgba(255, 255, 255, 0.85)',
    tint: isDark ? 'rgba(132, 196, 65, 0.05)' : 'rgba(132, 196, 65, 0.03)',
    border: isDark ? 'rgba(132, 196, 65, 0.15)' : 'rgba(132, 196, 65, 0.2)',
  }), [isDark, colors.primary]);

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: BUTTON_POSITIONS[state.index],
      useNativeDriver: true,
      tension: 100,
      friction: 12,
    }).start();
  }, [state.index, BUTTON_POSITIONS]);

  // Keyboard handling
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Check for deep screens in any stack to hide tab bar
  const isDeepScreen = useMemo(() => {
    const route = state.routes[state.index];
    if (route.state) {
      // If the stack has more than 1 screen, it's a deep screen
      const index = (route.state as any).index;
      const routes = (route.state as any).routes;
      if (typeof index === 'number' && routes) {
        // Exception: some stacks might want the tab bar on specific screens
        // Default: hide for index > 0
        const currentSubRoute = routes[index].name;
        if (currentSubRoute === 'WorkoutSession') return true;
        return index > 0;
      }
    }
    return false;
  }, [state]);

  // Root tab visibility is derived from navigation state. Reset the legacy
  // scroll flag whenever a root tab is active so stale scroll state cannot
  // keep the bar hidden after navigating back from a deep screen.
  useEffect(() => {
    if (!isDeepScreen) {
      setTabBarVisible(true);
    }
  }, [isDeepScreen, setTabBarVisible]);

  // Animate only for transient UI state. Deep-screen hiding is handled by
  // returning null below, so it cannot leave behind a stale hidden transform.
  useEffect(() => {
    Animated.spring(translateYAnim, {
      toValue: keyboardVisible ? 150 : 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [keyboardVisible, translateYAnim]);

  // All 5 tabs visible
  const visibleTabs = TAB_ORDER;



  // Center the tab bar horizontally on screen
  const tabBarLeft = (SCREEN_WIDTH - TAB_BAR_WIDTH) / 2;

  // Bottom spacing with safe area inset
  const bottomSpacing = Platform.OS === 'ios' ? Math.max(20, insets.bottom) : 20;

  if (isDeepScreen) return null;

  return (
    <Animated.View
      style={[
        styles.containerWrapper,
        {
          left: tabBarLeft,
          width: TAB_BAR_WIDTH,
          bottom: bottomSpacing,
          transform: [{ translateY: translateYAnim }]
        }
      ]}
    >
      {/* Blurred background only - strictly contained */}
      <View style={styles.blurWrapper}>
        <BlurView intensity={isDark ? 50 : 70} tint={isDark ? "dark" : "light"} style={styles.blurContainer}>
          <View style={[styles.greenOverlay, { backgroundColor: themeColors.tint }]} />
          <View style={[styles.container, { backgroundColor: themeColors.bg, borderColor: themeColors.border }]} />
        </BlurView>
      </View>
      {/* Buttons rendered above blur - remain sharp */}
      <View style={styles.buttonsContainer}>
        <Animated.View
          style={[
            styles.slidingIndicator,
            {
              transform: [{ translateX: indicatorAnim }],
              backgroundColor: themeColors.activeButton
            }
          ]}
        />
        {visibleTabs.map((routeName, index) => {
          const route = state.routes.find(r => r.name === routeName);
          if (!route) return null;

          const { options } = descriptors[route.key];
          const isFocused = state.index === state.routes.findIndex(r => r.key === route.key);

          const onPress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (event.defaultPrevented) {
              return;
            }

            const rootScreen = TAB_ROOT_SCREENS[routeName];
            if (rootScreen) {
              navigation.navigate(route.name as any, { screen: rootScreen } as any);
              return;
            }

            if (!isFocused) {
              navigation.navigate(route.name as any);
            }
          };

          const onLongPress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <TabButton
              key={route.key}
              routeName={routeName}
              isFocused={isFocused}
              onPress={onPress}
              onLongPress={onLongPress}
              buttonPosition={BUTTON_POSITIONS[index] ?? 0}
              badgeCount={badgeCounts[routeName] ?? null}
              accessibilityLabel={options.tabBarAccessibilityLabel || routeName}
              colors={themeColors}
            />
          );
        })}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  containerWrapper: {
    position: 'absolute',
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_BORDER_RADIUS,
    zIndex: 1000, // Ensure navbar is always above screen content
    // Shadow for the entire tab bar
    shadowColor: '#84c441',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16, // Android shadow
  },
  blurWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: TAB_BAR_BORDER_RADIUS,
    overflow: 'hidden', // Strictly contain blur - no overflow at all
  },
  blurContainer: {
    width: '100%',
    height: '100%',
    borderRadius: TAB_BAR_BORDER_RADIUS,
  },
  greenOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: TAB_BAR_BORDER_RADIUS,
  },
  container: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: TAB_BAR_BORDER_RADIUS,
    borderWidth: 1.5,
  },
  buttonsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible', // Allow buttons to extend beyond for visual effect
    borderRadius: TAB_BAR_BORDER_RADIUS,
    zIndex: 10, // Ensure buttons are above blur
  },
  button: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2, // Perfect circle
    justifyContent: 'center',
    alignItems: 'center',
    // Perfect vertical centering: (container height - button height) / 2
    top: (TAB_BAR_HEIGHT - BUTTON_SIZE) / 2,
    overflow: 'hidden', // Prevent any overflow
  },
  activeButton: {
    backgroundColor: 'transparent',
  },
  slidingIndicator: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    top: (TAB_BAR_HEIGHT - BUTTON_SIZE) / 2,
    shadowColor: '#84c441',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  inactiveButtonWrapper: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    top: (TAB_BAR_HEIGHT - BUTTON_SIZE) / 2,
    // No background, no border, no shadow - just the icon
    backgroundColor: 'transparent',
    borderRadius: 0, // No rounded shape at all
  },
  pressable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  iconWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
});

