import React, { useRef } from 'react';
import { StyleSheet, Pressable, PressableProps, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ensureMinTouchTarget } from '@/utils/responsive';

interface SocialButtonProps extends Omit<PressableProps, 'style'> {
  platform: 'facebook' | 'google' | 'apple';
  onPress: () => void;
  disabled?: boolean;
}

const iconMap = {
  facebook: 'logo-facebook',
  google: 'logo-google',
  apple: 'logo-apple',
} as const;

export const SocialButton: React.FC<SocialButtonProps> = ({
  platform,
  onPress,
  disabled = false,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const handlePress = () => {
    if (!disabled) {
      onPress();
    }
  };

  return (
    <Animated.View
      style={[
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Pressable
        {...props}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[styles.socialButton, disabled && styles.socialButtonDisabled]}
      >
        <Ionicons name={iconMap[platform]} size={24} color="#ffffff" />
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: ensureMinTouchTarget(56),
    minHeight: ensureMinTouchTarget(56),
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
});

