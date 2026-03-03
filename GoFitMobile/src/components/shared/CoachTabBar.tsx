import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { View, TouchableOpacity, StyleSheet, useWindowDimensions, Animated, Easing, Keyboard, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import {
  LayoutDashboard,
  Users,
  Calendar,
  MessageCircle,
  User,
} from 'lucide-react-native';
import type { CoachAppTabParamList } from '@/types';
import { TabBadge } from './TabBadge';
import { useUIStore } from '@/store/uiStore';
import { useThemeStore } from '@/store/themeStore';
import { theme as themeConfig } from '@/theme';
import { useThemeColors } from '@/theme/useThemeColors';

const BRAND_PRIMARY = themeConfig.colors.primary;
const MAX_TAB_BAR_WIDTH = 360;
const TAB_BAR_HEIGHT = 74;
const TAB_BAR_BORDER_RADIUS = 37;
const BUTTON_SIZE = 58;
const ICON_SIZE = 22;
const HORIZONTAL_PADDING = 8;
const ICON_STROKE_WIDTH = 2.5;

const TAB_ICONS: Record<keyof CoachAppTabParamList, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
  Clients: Users,
  Calendar: Calendar,
  Chat: MessageCircle,
  CoachProfile: User,
};

const TAB_ORDER: Array<keyof CoachAppTabParamList> = ['Dashboard', 'Clients', 'Calendar', 'Chat', 'CoachProfile'];

interface ThemeColors {
  activeButton: string;
  activeIcon: string;
  inactiveIcon: string;
  bg: string;
  tint: string;
  border: string;
}

interface CoachTabBarProps extends BottomTabBarProps {
  badgeCounts?: Partial<Record<keyof CoachAppTabParamList, number | null>>;
}

const TabButton: React.FC<{
  routeName: keyof CoachAppTabParamList;
  isFocused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  buttonPosition: number;
  badgeCount: number | null;
  accessibilityLabel: string;
  colors: ThemeColors;
}> = React.memo(({ routeName, isFocused, onPress, onLongPress, buttonPosition, badgeCount, accessibilityLabel, colors }) => {
  const Icon = TAB_ICONS[routeName];
  const scaleAnim = useRef(new Animated.Value(isFocused ? 1.1 : 0.95)).current;
  const opacityAnim = useRef(new Animated.Value(isFocused ? 1 : 0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: isFocused ? 1.1 : 0.95, useNativeDriver: true, tension: 200, friction: 15 }),
      Animated.timing(opacityAnim, { toValue: isFocused ? 1 : 0.8, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start();
  }, [isFocused]);

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true, tension: 300, friction: 15 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: isFocused ? 1.1 : 0.95, useNativeDriver: true, tension: 200, friction: 15 }).start();
  }, [scaleAnim, isFocused]);

  const animStyle = { transform: [{ scale: scaleAnim }], opacity: opacityAnim };

  if (!isFocused) {
    return (
      <Animated.View style={[styles.inactiveButtonWrapper, { left: buttonPosition }, animStyle]}>
        <TouchableOpacity onPress={onPress} onLongPress={onLongPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.pressable}>
          <View style={styles.iconWrapper}>
            <Icon size={ICON_SIZE} color={colors.inactiveIcon} strokeWidth={ICON_STROKE_WIDTH} />
            {badgeCount != null && <TabBadge count={badgeCount} size="small" />}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.button, styles.activeButton, { left: buttonPosition }, animStyle]}>
      <TouchableOpacity onPress={onPress} onLongPress={onLongPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.8} accessibilityRole="button" accessibilityState={{ selected: true }} accessibilityLabel={accessibilityLabel} style={styles.pressable}>
        <View style={styles.iconContainer}>
          <View style={styles.iconWrapper}>
            <Icon size={ICON_SIZE} color={colors.activeIcon} strokeWidth={ICON_STROKE_WIDTH} />
            {badgeCount != null && <TabBadge count={badgeCount} size="small" />}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export const CoachTabBar: React.FC<CoachTabBarProps> = React.memo(({ state, descriptors, navigation, badgeCounts = {} }) => {
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const colors = useThemeColors();
  const { isDark } = useThemeStore();
  const { tabBarVisible, setTabBarVisible } = useUIStore();
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const [keyboardVisible, setKeyboardVisible] = React.useState(false);

  const TAB_BAR_WIDTH = Math.min(MAX_TAB_BAR_WIDTH, SCREEN_WIDTH - 40);
  const INNER_WIDTH = TAB_BAR_WIDTH - (HORIZONTAL_PADDING * 2);
  const BUTTON_SPACING = (INNER_WIDTH - BUTTON_SIZE) / (TAB_ORDER.length - 1);
  const BUTTON_POSITIONS = TAB_ORDER.map((_, i) => (i * BUTTON_SPACING) + HORIZONTAL_PADDING);

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
    Animated.spring(indicatorAnim, { toValue: BUTTON_POSITIONS[state.index], useNativeDriver: true, tension: 100, friction: 12 }).start();
  }, [state.index]);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    Animated.spring(translateYAnim, { toValue: (!tabBarVisible || keyboardVisible) ? 150 : 0, useNativeDriver: true, tension: 50, friction: 8 }).start();
  }, [tabBarVisible, keyboardVisible]);

  useEffect(() => { setTabBarVisible(true); }, [state.index]);

  const isDeepScreen = useMemo(() => {
    const route = state.routes[state.index];
    if (route.state) {
      const idx = (route.state as any).index;
      return typeof idx === 'number' && idx > 0;
    }
    return false;
  }, [state]);

  const tabBarLeft = (SCREEN_WIDTH - TAB_BAR_WIDTH) / 2;
  const bottomSpacing = Platform.OS === 'ios' ? Math.max(20, insets.bottom) : 20;

  if (isDeepScreen) return null;

  return (
    <Animated.View style={[styles.containerWrapper, { left: tabBarLeft, width: TAB_BAR_WIDTH, bottom: bottomSpacing, transform: [{ translateY: translateYAnim }] }]}>
      <View style={styles.blurWrapper}>
        <BlurView intensity={isDark ? 50 : 70} tint={isDark ? 'dark' : 'light'} style={styles.blurContainer}>
          <View style={[styles.greenOverlay, { backgroundColor: themeColors.tint }]} />
          <View style={[styles.mainContainer, { backgroundColor: themeColors.bg, borderColor: themeColors.border }]} />
        </BlurView>
      </View>
      <View style={styles.buttonsContainer}>
        <Animated.View style={[styles.slidingIndicator, { transform: [{ translateX: indicatorAnim }], backgroundColor: themeColors.activeButton }]} />
        {TAB_ORDER.map((routeName, index) => {
          const route = state.routes.find(r => r.name === routeName);
          if (!route) return null;
          const { options } = descriptors[route.key];
          const isFocused = state.index === state.routes.findIndex(r => r.key === route.key);
          const onPress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name as any);
          };
          const onLongPress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };
          return (
            <TabButton key={route.key} routeName={routeName} isFocused={isFocused} onPress={onPress} onLongPress={onLongPress} buttonPosition={BUTTON_POSITIONS[index] ?? 0} badgeCount={badgeCounts[routeName] ?? null} accessibilityLabel={options.tabBarAccessibilityLabel || routeName} colors={themeColors} />
          );
        })}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  containerWrapper: { position: 'absolute', height: TAB_BAR_HEIGHT, borderRadius: TAB_BAR_BORDER_RADIUS, zIndex: 1000, shadowColor: '#84c441', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 16 },
  blurWrapper: { position: 'absolute', width: '100%', height: '100%', borderRadius: TAB_BAR_BORDER_RADIUS, overflow: 'hidden' },
  blurContainer: { width: '100%', height: '100%', borderRadius: TAB_BAR_BORDER_RADIUS },
  greenOverlay: { position: 'absolute', width: '100%', height: '100%', borderRadius: TAB_BAR_BORDER_RADIUS },
  mainContainer: { position: 'absolute', width: '100%', height: '100%', borderRadius: TAB_BAR_BORDER_RADIUS, borderWidth: 1.5 },
  buttonsContainer: { position: 'absolute', width: '100%', height: '100%', flexDirection: 'row', alignItems: 'center', overflow: 'visible', borderRadius: TAB_BAR_BORDER_RADIUS, zIndex: 10 },
  button: { position: 'absolute', width: BUTTON_SIZE, height: BUTTON_SIZE, borderRadius: BUTTON_SIZE / 2, justifyContent: 'center', alignItems: 'center', top: (TAB_BAR_HEIGHT - BUTTON_SIZE) / 2, overflow: 'hidden' },
  activeButton: { backgroundColor: 'transparent' },
  slidingIndicator: { position: 'absolute', width: BUTTON_SIZE, height: BUTTON_SIZE, borderRadius: BUTTON_SIZE / 2, top: (TAB_BAR_HEIGHT - BUTTON_SIZE) / 2, shadowColor: '#84c441', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  inactiveButtonWrapper: { position: 'absolute', width: BUTTON_SIZE, height: BUTTON_SIZE, justifyContent: 'center', alignItems: 'center', top: (TAB_BAR_HEIGHT - BUTTON_SIZE) / 2, backgroundColor: 'transparent', borderRadius: 0 },
  pressable: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  iconContainer: { justifyContent: 'center', alignItems: 'center', width: ICON_SIZE, height: ICON_SIZE },
  iconWrapper: { position: 'relative', justifyContent: 'center', alignItems: 'center', width: ICON_SIZE, height: ICON_SIZE },
});
