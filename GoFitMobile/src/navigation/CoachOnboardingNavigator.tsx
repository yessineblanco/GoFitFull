import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import type { CoachOnboardingStackParamList } from '@/types';
import { CoachOnboardingScreen } from '@/screens/coach-onboarding/CoachOnboardingScreen';
import { CoachCVUploadScreen } from '@/screens/coach-onboarding/CoachCVUploadScreen';
import { CoachCertificationsScreen } from '@/screens/coach-onboarding/CoachCertificationsScreen';
import { CoachProfilePreviewScreen } from '@/screens/coach-onboarding/CoachProfilePreviewScreen';
import { CoachPendingScreen } from '@/screens/coach-onboarding/CoachPendingScreen';
import { Easing120Hz } from '@/utils/animations';

const Stack = createStackNavigator<CoachOnboardingStackParamList>();

export const CoachOnboardingNavigator: React.FC = () => {
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
      initialRouteName="CoachOnboarding"
    >
      <Stack.Screen name="CoachOnboarding" component={CoachOnboardingScreen} />
      <Stack.Screen name="CoachCVUpload" component={CoachCVUploadScreen} />
      <Stack.Screen name="CoachCertifications" component={CoachCertificationsScreen} />
      <Stack.Screen name="CoachProfilePreview" component={CoachProfilePreviewScreen} />
      <Stack.Screen name="CoachPending" component={CoachPendingScreen} />
    </Stack.Navigator>
  );
};
