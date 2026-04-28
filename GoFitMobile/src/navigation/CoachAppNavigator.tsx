import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import type { CoachAppTabParamList } from '@/types';
import { CoachTabBar } from '@/components/shared/CoachTabBar';
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary';

import { CoachDashboardScreen } from '@/screens/coach-app/CoachDashboardScreen';
import { ClientsListScreen } from '@/screens/coach-app/ClientsListScreen';
import { ClientDetailScreen } from '@/screens/coach-app/ClientDetailScreen';
import { ClientNotesScreen } from '@/screens/coach-app/ClientNotesScreen';
import { ClientProgressScreen } from '@/screens/coach-app/ClientProgressScreen';
import { ClientCheckInsScreen } from '@/screens/coach-app/ClientCheckInsScreen';
import { CoachCalendarScreen } from '@/screens/coach-app/CoachCalendarScreen';
import { ConversationsListScreen } from '@/screens/coach-app/ConversationsListScreen';
import { ChatScreen } from '@/screens/coach-app/ChatScreen';
import { CoachProfileScreen } from '@/screens/coach-app/CoachProfileScreen';
import { SessionPacksScreen } from '@/screens/coach-app/SessionPacksScreen';
import { CreatePackScreen } from '@/screens/coach-app/CreatePackScreen';
import { ProgramsListScreen } from '@/screens/coach-app/ProgramsListScreen';
import { ProgramBuilderScreen } from '@/screens/coach-app/ProgramBuilderScreen';
import { CoachAvailabilityScreen } from '@/screens/coach-app/CoachAvailabilityScreen';
import { CoachWalletScreen } from '@/screens/coach-app/CoachWalletScreen';
import { CoachSettingsScreen } from '@/screens/coach-app/CoachSettingsScreen';
import { ThemeSettingsScreen } from '@/screens/profile/ThemeSettingsScreen';
import { ProgramDetailScreen } from '@/screens/profile/ProgramDetailScreen';
import { NotificationInboxScreen } from '@/screens/profile/NotificationInboxScreen';
import { VideoCallScreen } from '@/screens/coach-app/VideoCallScreen';

const Tab = createBottomTabNavigator<CoachAppTabParamList>();
const DashboardStack = createStackNavigator();
const ClientsStack = createStackNavigator();
const CoachProfileStack = createStackNavigator();
const CalendarStack = createStackNavigator();
const ChatStack = createStackNavigator();

const CoachProfileStackNavigator = () => (
  <CoachProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <CoachProfileStack.Screen name="CoachProfileMain" component={CoachProfileScreen} />
    <CoachProfileStack.Screen name="SessionPacks" component={SessionPacksScreen} />
    <CoachProfileStack.Screen name="CreatePack" component={CreatePackScreen} />
    <CoachProfileStack.Screen name="ProgramsList" component={ProgramsListScreen} />
    <CoachProfileStack.Screen name="ProgramBuilder" component={ProgramBuilderScreen} />
    <CoachProfileStack.Screen name="CoachWallet" component={CoachWalletScreen} />
    <CoachProfileStack.Screen name="CoachSettings" component={CoachSettingsScreen} />
    <CoachProfileStack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
  </CoachProfileStack.Navigator>
);

const CalendarStackNavigator = () => (
  <CalendarStack.Navigator screenOptions={{ headerShown: false }}>
    <CalendarStack.Screen name="CalendarMain" component={CoachCalendarScreen} />
    <CalendarStack.Screen name="Availability" component={CoachAvailabilityScreen} />
    <CalendarStack.Screen name="VideoCall" component={VideoCallScreen} />
  </CalendarStack.Navigator>
);

const ChatStackNavigator = () => (
  <ChatStack.Navigator screenOptions={{ headerShown: false }}>
    <ChatStack.Screen name="ConversationsList" component={ConversationsListScreen} />
    <ChatStack.Screen name="ChatScreen" component={ChatScreen} />
  </ChatStack.Navigator>
);

const DashboardStackNavigator = () => (
  <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
    <DashboardStack.Screen name="DashboardMain" component={CoachDashboardScreen} />
    <DashboardStack.Screen name="NotificationInbox" component={NotificationInboxScreen} />
  </DashboardStack.Navigator>
);

const ClientsStackNavigator = () => (
  <ClientsStack.Navigator screenOptions={{ headerShown: false }}>
    <ClientsStack.Screen name="ClientsList" component={ClientsListScreen} />
    <ClientsStack.Screen name="ClientDetail" component={ClientDetailScreen} />
    <ClientsStack.Screen name="ClientNotes" component={ClientNotesScreen} />
    <ClientsStack.Screen name="ClientProgress" component={ClientProgressScreen} />
    <ClientsStack.Screen name="ClientCheckIns" component={ClientCheckInsScreen} />
    <ClientsStack.Screen name="ProgramBuilder" component={ProgramBuilderScreen} />
    <ClientsStack.Screen name="ProgramDetail" component={ProgramDetailScreen} />
    <ClientsStack.Screen name="ChatScreen" component={ChatScreen} />
  </ClientsStack.Navigator>
);

export const CoachAppNavigator: React.FC = () => {
  return (
    <RouteErrorBoundary>
      <Tab.Navigator
        tabBar={(props) => <CoachTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: { display: 'none' },
        }}
      >
        <Tab.Screen name="Dashboard" component={DashboardStackNavigator} options={{ tabBarAccessibilityLabel: 'Dashboard' }} />
        <Tab.Screen name="Clients" component={ClientsStackNavigator} options={{ tabBarAccessibilityLabel: 'Clients' }} />
        <Tab.Screen name="Calendar" component={CalendarStackNavigator} options={{ tabBarAccessibilityLabel: 'Calendar' }} />
        <Tab.Screen name="Chat" component={ChatStackNavigator} options={{ tabBarAccessibilityLabel: 'Chat' }} />
        <Tab.Screen name="CoachProfile" component={CoachProfileStackNavigator} options={{ tabBarAccessibilityLabel: 'Profile' }} />
      </Tab.Navigator>
    </RouteErrorBoundary>
  );
};
