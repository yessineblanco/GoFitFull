import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { theme } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import {
  ScreenContainer,
  AnimatedBackground,
} from '@/components/shared';
import type { AuthStackParamList } from '@/types';
import { useWindowDimensions } from 'react-native';
import { getResponsiveFontSize, getResponsiveSpacing, isSmallScreen, ensureMinTouchTarget } from '@/utils/responsive';

type NavigationProp = StackNavigationProp<AuthStackParamList>;

export const PasswordChangedSuccessScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { width } = useWindowDimensions();

  return (
    <View style={styles.container}>
      {/* Background ellipses */}
      <AnimatedBackground />

      <ScreenContainer scrollable={false} style={styles.screenContainer}>
        <View style={styles.content}>
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.replace('Login')}
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <Image 
              source={require('../../../assets/done.png')} 
              style={styles.successIcon}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Password Changed!</Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            Your password has been changed successfully.
          </Text>

          {/* Back to Login Button */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.replace('Login')}
          >
            <Text style={styles.loginButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030303',
  },
  screenContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: getResponsiveSpacing(theme.spacing.md),
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: theme.spacing.xl,
    left: getResponsiveSpacing(theme.spacing.md),
    zIndex: 10,
  },
  backButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#D9D9D9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconContainer: {
    width: 100,
    height: 100,
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIcon: {
    width: 100,
    height: 100,
  },
  title: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(isSmallScreen() ? 24 : 26),
    fontWeight: 'normal' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: getResponsiveFontSize(isSmallScreen() ? 29 : 31),
  },
  subtitle: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(15),
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.64)',
    textAlign: 'center',
    marginBottom: theme.spacing.xxl,
    lineHeight: getResponsiveFontSize(22),
    paddingHorizontal: theme.spacing.lg,
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#1E232C',
    borderWidth: 1,
    borderRadius: 27.5,
    width: '100%',
    maxWidth: 344,
    height: ensureMinTouchTarget(58),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  loginButtonText: {
    color: '#1E232C',
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(15),
    fontWeight: '600' as const,
  },
});

