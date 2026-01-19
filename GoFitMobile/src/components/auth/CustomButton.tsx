import React, { useRef } from 'react';
import { Text, StyleSheet, ActivityIndicator, Pressable, PressableProps, Animated, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '@/theme';
import { getResponsiveFontSize, ensureMinTouchTarget } from '@/utils/responsive';

interface CustomButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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
    if (!disabled && !loading) {
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
        disabled={disabled || loading}
        style={[
          styles.button,
          variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
          (disabled || loading) && styles.buttonDisabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? '#030303' : '#ffffff'} size="small" />
        ) : (
          <Text
            style={[
              styles.buttonText,
              variant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText,
            ]}
          >
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 30,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ensureMinTouchTarget(56),
    shadowColor: '#84c441',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButton: {
    backgroundColor: '#84c441',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    fontFamily: 'Barlow_600SemiBold',
  },
  primaryButtonText: {
    color: '#030303',
  },
  secondaryButtonText: {
    color: '#ffffff',
  },
});

