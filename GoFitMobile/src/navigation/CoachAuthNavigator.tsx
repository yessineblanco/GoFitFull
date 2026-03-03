import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { CoachAuthStackParamList } from '@/types';
import { CoachWelcomeScreen } from '@/screens/coach-auth/CoachWelcomeScreen';
import { CoachLoginScreen } from '@/screens/coach-auth/CoachLoginScreen';
import { CoachSignupScreen } from '@/screens/coach-auth/CoachSignupScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { VerifyOtpScreen } from '@/screens/auth/VerifyOtpScreen';
import { ResetPasswordScreen } from '@/screens/auth/ResetPasswordScreen';
import { PasswordChangedSuccessScreen } from '@/screens/auth/PasswordChangedSuccessScreen';
import { Easing120Hz } from '@/utils/animations';

const Stack = createStackNavigator<CoachAuthStackParamList>();

export const CoachAuthNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#030303' },
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 250,
              easing: Easing120Hz.easeOut,
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 250,
              easing: Easing120Hz.easeIn,
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
      initialRouteName="CoachWelcome"
    >
      <Stack.Screen name="CoachWelcome" component={CoachWelcomeScreen} />
      <Stack.Screen name="CoachLogin" component={CoachLoginScreen} />
      <Stack.Screen name="CoachSignup" component={CoachSignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="PasswordChangedSuccess" component={PasswordChangedSuccessScreen} />
    </Stack.Navigator>
  );
};
