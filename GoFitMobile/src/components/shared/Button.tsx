import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '@/theme';
import { ensureMinTouchTarget, getResponsiveFontSize } from '@/utils/responsive';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle | TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) => {
  const buttonStyle = [
    styles.base,
    styles[variant],
    disabled ? styles.disabled : null,
    style,
  ].filter(Boolean);

  const textStyle = styles[`${variant}Text`];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!!(disabled || loading)}
      style={buttonStyle}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? theme.colors.primary : '#ffffff'} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ensureMinTouchTarget(52),
    minWidth: ensureMinTouchTarget(120),
    ...theme.shadows.small,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.secondary,
  },
  outline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryText: {
    color: '#D9D9D9',
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(15),
    lineHeight: getResponsiveFontSize(18),
    fontWeight: '600' as const,
  },
  secondaryText: {
    color: '#ffffff',
    ...theme.typography.bodyBold,
    fontSize: 16,
  },
  outlineText: {
    color: '#1E232C',
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(15),
    lineHeight: getResponsiveFontSize(18),
    fontWeight: '600' as const,
  },
});

