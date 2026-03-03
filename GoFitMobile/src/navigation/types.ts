import type { NavigatorScreenParams } from '@react-navigation/native';
import type { 
  AuthStackParamList, 
  AppTabParamList, 
  OnboardingStackParamList,
  CoachAuthStackParamList,
  CoachOnboardingStackParamList,
  CoachAppTabParamList,
} from '@/types';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList>;
  App: NavigatorScreenParams<AppTabParamList>;
  CoachAuth: NavigatorScreenParams<CoachAuthStackParamList>;
  CoachOnboarding: NavigatorScreenParams<CoachOnboardingStackParamList>;
  CoachApp: NavigatorScreenParams<CoachAppTabParamList>;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

