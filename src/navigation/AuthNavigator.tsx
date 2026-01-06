import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Easing } from 'react-native';
import type { AuthStackParamList } from '@/types';
import { WelcomeScreen } from '@/screens/auth/WelcomeScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { SignupScreen } from '@/screens/auth/SignupScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { VerifyOtpScreen } from '@/screens/auth/VerifyOtpScreen';
import { ResetPasswordScreen } from '@/screens/auth/ResetPasswordScreen';
import { PasswordChangedSuccessScreen } from '@/screens/auth/PasswordChangedSuccessScreen';
import { Easing120Hz } from '@/utils/animations';

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#030303' }, // Prevent white flash
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 250,
              easing: Easing120Hz.easeOut, // Optimized for 120Hz
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 250,
              easing: Easing120Hz.easeIn, // Optimized for 120Hz
            },
          },
        },
        cardStyleInterpolator: ({ current, next, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
                {
                  scale: next
                    ? next.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 0.95],
                      })
                    : 1,
                },
              ],
              opacity: current.progress.interpolate({
                inputRange: [0, 0.5, 0.9, 1],
                outputRange: [0, 0.25, 0.7, 1],
              }),
            },
          };
        },
      }}
      initialRouteName="Welcome"
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="PasswordChangedSuccess" component={PasswordChangedSuccessScreen} />
    </Stack.Navigator>
  );
};

