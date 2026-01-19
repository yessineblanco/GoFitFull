import React from 'react';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { Easing } from 'react-native';
import type { OnboardingStackParamList } from '@/types';
import { OnboardingScreen1 } from '@/screens/onboarding/OnboardingScreen1';
import { OnboardingScreen2 } from '@/screens/onboarding/OnboardingScreen2';
import { OnboardingScreen3 } from '@/screens/onboarding/OnboardingScreen3';
import { OnboardingScreen4 } from '@/screens/onboarding/OnboardingScreen4';
import { OnboardingScreenPersonalDetails } from '@/screens/onboarding/OnboardingScreenPersonalDetails';

const Stack = createStackNavigator<OnboardingStackParamList>();

export const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#FDFDFD' },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        gestureResponseDistance: 50,
        transitionSpec: {
          open: {
            animation: 'timing',
            config: {
              duration: 300,
              easing: Easing.out(Easing.ease),
            },
          },
          close: {
            animation: 'timing',
            config: {
              duration: 300, // Same duration as open for identical feel
              easing: Easing.out(Easing.ease), // Same easing curve
            },
          },
        },
        // Use built-in interpolator that handles both directions consistently
        cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
      }}
      initialRouteName="Onboarding1"
    >
      <Stack.Screen name="Onboarding1" component={OnboardingScreen1} />
      <Stack.Screen name="Onboarding2" component={OnboardingScreen2} />
      <Stack.Screen name="Onboarding3" component={OnboardingScreen3} />
      <Stack.Screen name="OnboardingPersonalDetails" component={OnboardingScreenPersonalDetails} />
      <Stack.Screen name="Onboarding4" component={OnboardingScreen4} />
    </Stack.Navigator>
  );
};

