import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  Keyboard,
  Platform,
} from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  LayoutGrid,
  Calendar,
  Dumbbell,
  BarChart3,
  Settings,
} from 'lucide-react-native';
import type { AppTabParamList } from '@/types';
import { TabBadge } from './TabBadge';
import { useUIStore } from '@/store/uiStore';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';

const MAX_TAB_BAR_WIDTH = 360;
const TAB_BAR_HEIGHT = 74;
const TAB_BAR_BORDER_RADIUS = 37;
const BUTTON_SIZE = 58;
const ICON_SIZE = 22;
const HORIZONTAL_PADDING = 8;
const ICON_STROKE_WIDTH = 2.5;

/** Slightly under-damped feel: long settle, no visible bounce (clamped) */
const PILL_SPRING = {
  stiffness: 200,
  damping: 24,
  mass: 0.6,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
} as const;

const ICON_SPRING = {
  stiffness: 190,
  damping: 22,
  mass: 0.45,
  overshootClamping: true,
  reduceMotion: ReduceMotion.System,
} as const;

const TAB_ICONS: Record<keyof AppTabParamList, typeof LayoutGrid> = {
  Home: LayoutGrid,
  Workouts: Calendar,
  Library: Dumbbell,
  Progress: BarChart3,
  Profile: Settings,
};

const TAB_ORDER: Array<keyof AppTabParamList> = [
  'Home',
  'Workouts',
  'Library',
  'Progress',
  'Profile',
];

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

/**
 * Icons: UI-thread spring on opacity + subtle scale for a fluid, non-rigid feel.
 */
const TabButton: React.FC<TabButtonProps> = React.memo(
  ({
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
    const inactiveOpacity = 0.68;
    const opacity = useSharedValue(isFocused ? 1 : inactiveOpacity);
    const scale = useSharedValue(isFocused ? 1 : 0.98);

    useEffect(() => {
      opacity.value = withSpring(isFocused ? 1 : inactiveOpacity, ICON_SPRING);
      scale.value = withSpring(isFocused ? 1 : 0.98, ICON_SPRING);
    }, [isFocused, inactiveOpacity, opacity, scale]);

    const labelStyle = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    }));

    const content = (
      <TouchableOpacity
        onPress={onPress}
        onLongPress={onLongPress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : undefined}
        accessibilityLabel={accessibilityLabel}
        style={styles.pressable}
      >
        <View style={isFocused ? styles.iconContainer : undefined}>
          <View style={styles.iconWrapper}>
            <Icon
              size={ICON_SIZE}
              color={isFocused ? colors.activeIcon : colors.inactiveIcon}
              strokeWidth={ICON_STROKE_WIDTH}
            />
            {badgeCount !== null && badgeCount !== undefined && (
              <TabBadge count={badgeCount} size="small" />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );

    return (
      <Animated.View
        style={[
          isFocused ? styles.button : styles.inactiveButtonWrapper,
          isFocused && styles.activeButton,
          { left: buttonPosition },
          labelStyle,
        ]}
      >
        {content}
      </Animated.View>
    );
  }
);

export const CustomTabBar: React.FC<CustomTabBarProps> = React.memo(
  ({ state, descriptors, navigation, badgeCounts = {} }) => {
    const insets = useSafeAreaInsets();
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const colors = useThemeColors();
    const { isDark } = useThemeStore();

    const setTabBarVisible = useUIStore((store) => store.setTabBarVisible);
    const [keyboardVisible, setKeyboardVisible] = useState(false);

    const TAB_BAR_WIDTH = Math.min(MAX_TAB_BAR_WIDTH, SCREEN_WIDTH - 40);
    const BUTTON_POSITIONS = useMemo(() => {
      const inner = TAB_BAR_WIDTH - HORIZONTAL_PADDING * 2;
      const spacing = (inner - BUTTON_SIZE) / (TAB_ORDER.length - 1);
      return TAB_ORDER.map((_, index) => index * spacing + HORIZONTAL_PADDING);
    }, [TAB_BAR_WIDTH]);

    const indicatorTarget = BUTTON_POSITIONS[state.index] ?? 0;
    const tabBarWidthRef = useRef(TAB_BAR_WIDTH);

    const translateX = useSharedValue(indicatorTarget);
    const translateY = useSharedValue(0);

    const themeColors: ThemeColors = useMemo(
      () => ({
        activeButton: colors.primary,
        activeIcon: '#ffffff',
        inactiveIcon: isDark
          ? 'rgba(132, 196, 65, 0.6)'
          : 'rgba(132, 196, 65, 0.8)',
        bg: isDark ? 'rgba(3, 3, 3, 0.7)' : 'rgba(255, 255, 255, 0.85)',
        tint: isDark
          ? 'rgba(132, 196, 65, 0.05)'
          : 'rgba(132, 196, 65, 0.03)',
        border: isDark
          ? 'rgba(132, 196, 65, 0.15)'
          : 'rgba(132, 196, 65, 0.2)',
      }),
      [isDark, colors.primary]
    );

    useLayoutEffect(() => {
      if (tabBarWidthRef.current !== TAB_BAR_WIDTH) {
        tabBarWidthRef.current = TAB_BAR_WIDTH;
        translateX.value = indicatorTarget;
      }
    }, [TAB_BAR_WIDTH, indicatorTarget, translateX]);

    useEffect(() => {
      translateX.value = withSpring(indicatorTarget, PILL_SPRING);
    }, [state.index, indicatorTarget, translateX]);

    const indicatorStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    const shellStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    useEffect(() => {
      translateY.value = withTiming(keyboardVisible ? 150 : 0, {
        duration: 320,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      });
    }, [keyboardVisible, translateY]);

    useEffect(() => {
      const showSub = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
        () => setKeyboardVisible(true)
      );
      const hideSub = Keyboard.addListener(
        Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
        () => setKeyboardVisible(false)
      );
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, []);

    const isDeepScreen = useMemo(() => {
      const route = state.routes[state.index];
      if (route.state) {
        const index = (route.state as { index?: number }).index;
        const routes = (route.state as { routes?: { name: string }[] }).routes;
        if (typeof index === 'number' && routes) {
          const currentSubRoute = routes[index]?.name;
          if (currentSubRoute === 'WorkoutSession') return true;
          return index > 0;
        }
      }
      return false;
    }, [state]);

    useEffect(() => {
      if (!isDeepScreen) {
        setTabBarVisible(true);
      }
    }, [isDeepScreen, setTabBarVisible]);

    const tabBarLeft = (SCREEN_WIDTH - TAB_BAR_WIDTH) / 2;
    const bottomSpacing =
      Platform.OS === 'ios' ? Math.max(20, insets.bottom) : 20;

    if (isDeepScreen) return null;

    return (
      <Animated.View
        style={[
          styles.containerWrapper,
          shellStyle,
          {
            left: tabBarLeft,
            width: TAB_BAR_WIDTH,
            bottom: bottomSpacing,
          },
        ]}
      >
        <View style={styles.blurWrapper}>
          {Platform.OS === 'ios' ? (
            <BlurView
              intensity={isDark ? 50 : 70}
              tint={isDark ? 'dark' : 'light'}
              style={styles.blurContainer}
            >
              <View
                style={[
                  styles.greenOverlay,
                  { backgroundColor: themeColors.tint },
                ]}
              />
              <View
                style={[
                  styles.container,
                  {
                    backgroundColor: themeColors.bg,
                    borderColor: themeColors.border,
                  },
                ]}
              />
            </BlurView>
          ) : (
            <View style={styles.blurContainer}>
              <View
                style={[
                  styles.greenOverlay,
                  { backgroundColor: themeColors.tint },
                ]}
              />
              <View
                style={[
                  styles.container,
                  {
                    backgroundColor: themeColors.bg,
                    borderColor: themeColors.border,
                  },
                ]}
              />
            </View>
          )}
        </View>

        <View style={styles.buttonsContainer} collapsable={false}>
          <Animated.View
            style={[
              styles.slidingIndicator,
              indicatorStyle,
              { backgroundColor: themeColors.activeButton },
            ]}
          />
          {TAB_ORDER.map((routeName, index) => {
            const route = state.routes.find((r) => r.name === routeName);
            if (!route) return null;
            const { options } = descriptors[route.key];
            const isFocused =
              state.index ===
              state.routes.findIndex((r) => r.key === route.key);

            const onPress = () => {
              queueMicrotask(() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              });
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (event.defaultPrevented) return;
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
              queueMicrotask(() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              });
              navigation.emit({ type: 'tabLongPress', target: route.key });
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
                accessibilityLabel={
                  options.tabBarAccessibilityLabel || routeName
                }
                colors={themeColors}
              />
            );
          })}
        </View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  containerWrapper: {
    position: 'absolute',
    height: TAB_BAR_HEIGHT,
    borderRadius: TAB_BAR_BORDER_RADIUS,
    zIndex: 1000,
    shadowColor: '#84c441',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 10,
  },
  blurWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: TAB_BAR_BORDER_RADIUS,
    overflow: 'hidden',
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
    overflow: 'visible',
    borderRadius: TAB_BAR_BORDER_RADIUS,
    zIndex: 10,
  },
  button: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    top: (TAB_BAR_HEIGHT - BUTTON_SIZE) / 2,
    overflow: 'hidden',
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  inactiveButtonWrapper: {
    position: 'absolute',
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    top: (TAB_BAR_HEIGHT - BUTTON_SIZE) / 2,
    backgroundColor: 'transparent',
    borderRadius: 0,
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
