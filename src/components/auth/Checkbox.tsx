import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, PressableProps, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getResponsiveFontSize, ensureMinTouchTarget } from '@/utils/responsive';

interface CheckboxProps extends Omit<PressableProps, 'style'> {
  checked: boolean;
  onPress: () => void;
  label?: string;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onPress,
  label,
  disabled = false,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const borderColorAnim = useRef(new Animated.Value(checked ? 1 : 0)).current;
  const backgroundColorAnim = useRef(new Animated.Value(checked ? 1 : 0)).current;

  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(132, 196, 65, 0.6)', '#84c441'],
  });

  const backgroundColor = backgroundColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', '#84c441'],
  });

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: checked ? 1 : 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.spring(borderColorAnim, {
        toValue: checked ? 1 : 0,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }),
      Animated.spring(backgroundColorAnim, {
        toValue: checked ? 1 : 0,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }),
    ]).start();
  }, [checked]);

  const handlePress = () => {
    if (!disabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <Pressable
      {...props}
      onPress={handlePress}
      disabled={disabled}
      style={[styles.container, disabled && styles.containerDisabled]}
    >
      <Animated.View
        style={[
          styles.checkbox,
          {
            borderColor,
            backgroundColor,
          },
        ]}
      >
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
            opacity: scaleAnim,
          }}
        >
          <Ionicons name="checkmark" size={16} color="#030303" />
        </Animated.View>
      </Animated.View>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ensureMinTouchTarget(44),
  },
  containerDisabled: {
    opacity: 0.5,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  label: {
    fontSize: getResponsiveFontSize(14),
    color: '#ffffff',
    fontFamily: 'Barlow_500Medium',
    fontWeight: '500' as const,
  },
});

