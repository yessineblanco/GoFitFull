import React, { useState, useRef } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, TextInputProps, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/theme';
import { getResponsiveFontSize, ensureMinTouchTarget, isSmallScreen } from '@/utils/responsive';

interface CustomInputProps extends Omit<TextInputProps, 'style'> {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  error?: string;
  showPasswordToggle?: boolean;
  onTogglePassword?: () => void;
  showPassword?: boolean;
}

export const CustomInput: React.FC<CustomInputProps> = ({
  placeholder,
  value,
  onChangeText,
  secureTextEntry = false,
  error,
  showPasswordToggle = false,
  onTogglePassword,
  showPassword = false,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const borderColorAnim = useRef(new Animated.Value(0)).current;
  const backgroundColorAnim = useRef(new Animated.Value(0)).current;

  const borderColor = borderColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(132, 196, 65, 0.6)', '#84c441'],
  });

  const backgroundColor = backgroundColorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.08)'],
  });

  const handleFocus = () => {
    setIsFocused(true);
    Animated.parallel([
      Animated.spring(borderColorAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(backgroundColorAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.parallel([
      Animated.timing(borderColorAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(backgroundColorAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            borderColor,
            backgroundColor,
          },
          error && styles.inputError,
        ]}
      >
        <TextInput
          {...props}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry && !showPassword}
          placeholder={placeholder}
          placeholderTextColor="rgba(255, 255, 255, 0.4)"
          style={styles.input}
        />
        {showPasswordToggle && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={onTogglePassword}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={24}
              color="rgba(255, 255, 255, 0.7)"
            />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: 'rgba(132, 196, 65, 0.6)',
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: ensureMinTouchTarget(isSmallScreen() ? 52 : 56),
  },
  input: {
    flex: 1,
    fontSize: getResponsiveFontSize(16),
    color: '#ffffff',
    fontFamily: 'Barlow_400Regular',
    paddingRight: 8,
  },
  inputError: {
    borderColor: '#FF4444',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
  },
  eyeIcon: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF4444',
    fontSize: 12,
    fontFamily: 'Barlow_400Regular',
    marginTop: 4,
    marginLeft: 24,
  },
});

