/**
 * Tab Badge Component
 * Displays notification badges on tab bar icons
 * Supports both dot indicators and number badges
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { theme } from '@/theme';

interface TabBadgeProps {
  /**
   * Number to display. If 0 or undefined, shows a dot instead.
   * If null, badge is hidden.
   */
  count?: number | null;

  /**
   * Maximum number to display before showing "99+"
   */
  maxCount?: number;

  /**
   * Size of the badge
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Position offset from top-right
   */
  top?: number;
  right?: number;
}

const BADGE_SIZES = {
  small: { width: 8, height: 8, fontSize: 0 },
  medium: { width: 18, height: 18, fontSize: 10 },
  large: { width: 24, height: 24, fontSize: 12 },
};

/**
 * Tab badge component for showing notifications/counts
 * 
 * @example
 * ```tsx
 * <TabBadge count={5} /> // Shows "5"
 * <TabBadge count={0} /> // Shows a dot
 * <TabBadge count={null} /> // Hidden
 * ```
 */
export const TabBadge: React.FC<TabBadgeProps> = ({
  count = null,
  maxCount = 99,
  size = 'medium',
  top = -4,
  right = -4,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const showDot = count === 0 || count === undefined;
  const displayCount = count && count > maxCount ? `${maxCount}+` : count?.toString();

  // Animate badge appearance
  useEffect(() => {
    if (count === null) return;

    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 8,
    }).start();

    // Subtle pulse animation for dot badges
    if (showDot) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [count, showDot, scaleAnim, pulseAnim]);

  // Hide badge if count is null
  if (count === null) {
    return null;
  }

  const badgeSize = BADGE_SIZES[size];
  const animatedStyle = {
    transform: [
      { scale: scaleAnim },
      ...(showDot ? [{ scale: pulseAnim }] : []),
    ],
  };

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          width: showDot ? badgeSize.width : 'auto',
          height: badgeSize.height,
          minWidth: showDot ? badgeSize.width : badgeSize.height,
          top,
          right,
          ...animatedStyle,
        },
      ]}
    >
      {!showDot && (
        <Text style={[styles.badgeText, { fontSize: badgeSize.fontSize }]}>
          {displayCount}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    backgroundColor: theme.colors.primary,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#030303', // Dark border for contrast
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
  },
});

