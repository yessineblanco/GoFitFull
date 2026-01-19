import type { NavigatorScreenParams } from '@react-navigation/native';
import type { AuthStackParamList, AppTabParamList, OnboardingStackParamList } from '@/types';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

