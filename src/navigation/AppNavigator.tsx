import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import type { AppTabParamList, ProfileStackParamList, LibraryStackParamList } from '@/types';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { WorkoutsScreen } from '@/screens/plan/WorkoutsScreen';
import { LibraryScreen } from '@/screens/library/LibraryScreen';

import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { CustomTabBar } from '@/components/shared/CustomTabBar';
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary';

// Direct imports - no lazy loading for instant screen transitions
import { AccountInformationScreen } from '@/screens/profile/AccountInformationScreen';
import { GoalsScreen } from '@/screens/profile/GoalsScreen';
import { EditWeightHeightScreen } from '@/screens/profile/EditWeightHeightScreen';
import { UnitPreferencesScreen } from '@/screens/profile/UnitPreferencesScreen';
import { NotificationsSettingsScreen } from '@/screens/profile/NotificationsSettingsScreen';
import { TextSizeSettingsScreen } from '@/screens/profile/TextSizeSettingsScreen';
import { LanguageSettingsScreen } from '@/screens/profile/LanguageSettingsScreen';
import { ThemeSettingsScreen } from '@/screens/profile/ThemeSettingsScreen';
import { EditProfileScreen } from '@/screens/profile/EditProfileScreen';
import { TermsOfServiceScreen } from '@/screens/profile/TermsOfServiceScreen';
import { PrivacyPolicyScreen } from '@/screens/profile/PrivacyPolicyScreen';
import WorkoutStatisticsScreen from '@/screens/progress/WorkoutStatisticsScreen';
import RecordDetailsScreen from '@/screens/progress/RecordDetailsScreen';
import ConsistencyScreen from '@/screens/progress/ConsistencyScreen';
import { WorkoutDetailScreen } from '@/screens/library/WorkoutDetailScreen';
import { ExerciseSelectionScreen } from '@/screens/library/ExerciseSelectionScreen';
import { WorkoutBuilderScreen } from '@/screens/library/WorkoutBuilderScreen';
import { WorkoutSessionScreen } from '@/screens/library/WorkoutSessionScreen';
import { ExerciseDetailScreen } from '@/screens/library/ExerciseDetailScreen';
import { WorkoutSummaryScreen } from '@/screens/library/WorkoutSummaryScreen';

const Tab = createBottomTabNavigator<AppTabParamList>();
const ProfileStack = createStackNavigator<ProfileStackParamList>();
const LibraryStack = createStackNavigator<LibraryStackParamList>();

const ProfileStackNavigator = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="AccountInformation" component={AccountInformationScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="Goals" component={GoalsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="EditWeightHeight" component={EditWeightHeightScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="UnitPreferences" component={UnitPreferencesScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="NotificationsSettings" component={NotificationsSettingsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="TextSizeSettings" component={TextSizeSettingsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="LanguageSettings" component={LanguageSettingsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="ThemeSettings" component={ThemeSettingsScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
    </ProfileStack.Navigator>
  );
};

const WorkoutsStack = createStackNavigator();

const WorkoutsStackNavigator = () => {
  return (
    <WorkoutsStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <WorkoutsStack.Screen name="WorkoutsMain" component={WorkoutsScreen} />
    </WorkoutsStack.Navigator>
  );
};

const LibraryStackNavigator = () => {
  return (
    <LibraryStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <LibraryStack.Screen name="LibraryMain" component={LibraryScreen} />
      <LibraryStack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} options={{ headerShown: false }} />
      <LibraryStack.Screen name="ExerciseSelection" component={ExerciseSelectionScreen} options={{ headerShown: false }} />
      <LibraryStack.Screen name="WorkoutBuilder" component={WorkoutBuilderScreen} options={{ headerShown: false }} />
      <LibraryStack.Screen name="WorkoutSession" component={WorkoutSessionScreen} options={{ headerShown: false }} />
      <LibraryStack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} options={{ headerShown: false }} />
      <LibraryStack.Screen name="WorkoutSummary" component={WorkoutSummaryScreen} options={{ headerShown: false }} />
    </LibraryStack.Navigator>
  );
};

// Progress Stack
const ProgressStack = createStackNavigator();

const ProgressStackNavigator = () => {
  return (
    <ProgressStack.Navigator screenOptions={{ headerShown: false }}>
      <ProgressStack.Screen name="ProgressMain" component={WorkoutStatisticsScreen} />
      <ProgressStack.Screen name="RecordDetails" component={RecordDetailsScreen} />
      <ProgressStack.Screen name="ConsistencyDetails" component={ConsistencyScreen} />
    </ProgressStack.Navigator>
  )
}
export const AppNavigator: React.FC = () => {
  return (
    <RouteErrorBoundary>
      <Tab.Navigator
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: true,
          headerStyle: {
            backgroundColor: '#030303', // Match dark theme
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600',
            color: '#FFFFFF',
            fontFamily: 'Barlow_600SemiBold',
            fontSize: 22,
            letterSpacing: 0.2,
          },
          tabBarShowLabel: false, // Hide default labels - using custom tab bar
          tabBarStyle: {
            display: 'none', // Hide default tab bar
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarAccessibilityLabel: 'Home',
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Workouts"
          component={WorkoutsStackNavigator}
          options={{
            tabBarAccessibilityLabel: 'Workouts',
            headerShown: false, // Use custom ScreenHeader
          }}
        />
        <Tab.Screen
          name="Library"
          component={LibraryStackNavigator}
          options={{
            tabBarAccessibilityLabel: 'Library',
            headerShown: false,
            title: 'MY LIBRARY',
            tabBarStyle: { display: 'none' },
          }}
        />
        <Tab.Screen
          name="Progress"
          component={ProgressStackNavigator}
          options={{
            tabBarAccessibilityLabel: 'Progress',
            title: 'MY PROGRESS',
            headerShown: false // Hide main header as stack handles it (or doesn't need it)
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileStackNavigator}
          options={{
            tabBarAccessibilityLabel: 'Profile',
            headerShown: false, // Hide Tab Navigator header - ProfileStack handles its own headers
          }}
        />
      </Tab.Navigator>
    </RouteErrorBoundary>
  );
};
