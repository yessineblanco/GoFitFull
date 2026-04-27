import 'react-native-gesture-handler'; // Must be imported first for gestures to work
import 'react-native-reanimated'; // UI-thread animations (tab bar, etc.)
import './src/i18n'; // Initialize i18n
import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { StatusBar, Platform, Linking } from 'react-native';
import { View, ActivityIndicator, StyleSheet, Easing, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import * as ExpoSplashScreen from 'expo-splash-screen'; // Import SplashScreen
import { Easing120Hz } from './src/utils/animations';
import {
  Barlow_400Regular,
  Barlow_500Medium,
  Barlow_600SemiBold,
  Barlow_700Bold,
  Barlow_800ExtraBold,
} from '@expo-google-fonts/barlow';
import { useAuthStore } from './src/store/authStore';
import { useOnboardingStore } from './src/store/onboardingStore';
import { useCoachStore } from './src/store/coachStore';
import { useThemeStore } from './src/store/themeStore';
import { useWorkoutsStore } from './src/store/workoutsStore';
import { useProfileStore } from './src/store/profileStore';
import { AuthNavigator } from './src/navigation/AuthNavigator';
import { CoachAuthNavigator } from './src/navigation/CoachAuthNavigator';
import { CoachOnboardingNavigator } from './src/navigation/CoachOnboardingNavigator';
import { OnboardingNavigator } from './src/navigation/OnboardingNavigator';
import { AppNavigator } from './src/navigation/AppNavigator';
import { CoachAppNavigator } from './src/navigation/CoachAppNavigator';
import { SplashScreen, ErrorBoundary, NotificationBanner, CustomDialog } from './src/components/shared';
import { dialogManager } from './src/components/shared/CustomDialog';
import { logger } from './src/utils/logger';
import { notificationService } from './src/services/notifications';
import { useDeepLinkStore, parseGoFitUrl } from './src/store/deepLinkStore';
import type { RootStackParamList } from './src/navigation/types';
import { theme } from './src/theme';

const Stack = createStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ['gofit://'],
  config: {
    screens: {
      App: {
        screens: {
          Home: {
            screens: {
              CoachDetail: 'coach/:coachId',
            },
          },
        },
      },
    },
  },
};

// Suppress expo-notifications warnings/errors about Expo Go limitations
// These messages are informational - local notifications work fine in Expo Go
// Only remote push notifications require a development build (which we're not using)
// The "ERROR" message is misleading - it's actually just an info message about limitations
LogBox.ignoreLogs([
  /expo-notifications.*Android Push notifications/i,
  /expo-notifications.*functionality is not fully supported/i,
  /Use a development build instead of Expo Go/i,
  /expo-notifications.*was removed from Expo Go/i,
  /expo-notifications.*SDK 53/i,
  /expo-notifications.*dev-client/i,
]);

export default function App() {
  const { initialize, initialized, session, isResettingPassword, user, userType, loadRememberedEmail } = useAuthStore();
  const { hasCompletedOnboarding } = useOnboardingStore();
  const { hasCompletedCoachOnboarding } = useCoachStore();
  const { isDark } = useThemeStore();
  const [fontsLoaded, fontError] = useFonts({
    'Designer': require('./assets/fonts/Designer.otf'),
    'Barlow_400Regular': Barlow_400Regular,
    'Barlow_500Medium': Barlow_500Medium,
    'Barlow_600SemiBold': Barlow_600SemiBold,
    'Barlow_700Bold': Barlow_700Bold,
    'Barlow_800ExtraBold': Barlow_800ExtraBold,
  });

  // Keep native splash screen visible while loading resources
  useEffect(() => {
    async function prepare() {
      try {
        await ExpoSplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.warn(e);
      }
    }
    prepare();
  }, []);
  const [showSplash, setShowSplash] = useState(true);
  const [splashComplete, setSplashComplete] = useState(false);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const [dialog, setDialog] = useState<any>(null);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const { setPending, consumePending } = useDeepLinkStore();

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      const parsed = parseGoFitUrl(url);
      if (parsed && !session) {
        setPending(parsed);
      }
    };
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [session, setPending]);

  useEffect(() => {
    if (!session || userType !== 'client' || !hasCompletedOnboarding(user?.id || null)) return;
    const pending = consumePending();
    if (pending?.type !== 'coach' || !pending.coachId) return;
    const navigate = () => {
      if (navigationRef.isReady()) {
(navigationRef as any).navigate('App', {
        screen: 'Home',
        params: { screen: 'CoachDetail', params: { coachId: pending.coachId } },
      });
      } else {
        setTimeout(navigate, 100);
      }
    };
    navigate();
  }, [session, userType, user?.id, hasCompletedOnboarding, consumePending]);

  useEffect(() => {
    if (fontError) {
      console.error('Font loading error:', fontError);
    }
    if (fontsLoaded) {
      console.log('Fonts loaded successfully');
    }
  }, [fontsLoaded, fontError]);

  // Hide native splash once custom splash is ready to take over
  useEffect(() => {
    // Hide native splash as soon as fonts are loaded so we can show our JS splash
    if (fontsLoaded) {
      ExpoSplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (!initialized) {
      initialize();
      loadRememberedEmail();
    }
  }, [initialized, initialize, loadRememberedEmail]);

  // Initialize theme on app startup - only update system theme if needed
  // Note: This runs after rehydration, so we can safely check the saved theme
  useEffect(() => {
    // Wait for rehydration to complete (Zustand persist typically takes 50-100ms)
    const timer = setTimeout(() => {
      const store = useThemeStore.getState();
      // Only update if theme is 'system' - don't override user's saved preference
      if (store.theme === 'system') {
        store.updateSystemTheme();
      } else {
        // For explicit light/dark themes, ensure isDark matches
        if (store.theme === 'light' && store.isDark !== false) {
          useThemeStore.setState({ isDark: false });
        } else if (store.theme === 'dark' && store.isDark !== true) {
          useThemeStore.setState({ isDark: true });
        }
      }
    }, 300); // Increased delay to ensure rehydration completes
    return () => clearTimeout(timer);
  }, []);

  // Set up notification listeners for custom UI
  useEffect(() => {
    // Listener for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    // Listener for notification interactions (user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      // Handle notification tap if needed
      setNotification(null);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Set up custom dialog listener
  useEffect(() => {
    const unsubscribe = dialogManager.subscribe((dialogState) => {
      setDialog(dialogState);
    });
    return unsubscribe;
  }, []);

  // Preload data when user is authenticated (in background, doesn't block UI)
  useEffect(() => {
    let isMounted = true;

    const preloadData = async () => {
      if (!isMounted) return;

      if (initialized && session && user?.id) {
        // Preload workouts and profile in background - don't wait for it
        // Access functions directly from store to avoid dependency issues
        // Zustand functions are stable, but accessing via getState() is safer
        const { loadWorkouts: loadWorkoutsFn, loadLatestIncompleteSession: loadSessionFn } = useWorkoutsStore.getState();
        const { loadProfile: loadProfileFn } = useProfileStore.getState();

        // Call async functions with proper error handling
        // Use Promise.allSettled to ensure all promises are handled even if some fail
        // Each promise has its own catch handler to prevent unhandled rejections
        const promises = [
          loadWorkoutsFn(user.id).catch((error) => {
            if (isMounted) {
              logger.error('Error preloading workouts:', error);
            }
          }),
          loadSessionFn(user.id).catch((error) => {
            if (isMounted) {
              logger.error('Error preloading incomplete session:', error);
            }
          }),
          loadProfileFn().catch((error) => {
            if (isMounted) {
              logger.error('Error preloading profile:', error);
            }
          }),
          notificationService.registerPushToken(user.id).catch((error) => {
            if (isMounted) {
              logger.warn('Push token registration failed (expected in Expo Go):', error);
            }
          }),
        ];

        // Wait for all promises to settle (but don't block)
        // This ensures all errors are caught and logged
        Promise.allSettled(promises).catch(() => {
          // All individual errors are already handled above
          // This catch is just a safety net
        });
      } else if (initialized && !session) {
        // Clear caches when user logs out
        if (isMounted) {
          useWorkoutsStore.getState().clearWorkouts();
          useProfileStore.getState().clearProfile();
        }
      }
    };

    preloadData();

    // Cleanup: prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
    // Only depend on actual state values, not store functions
    // Zustand functions are stable, but removing them from deps prevents any potential issues
  }, [initialized, session, user?.id]);

  const handleSplashComplete = () => {
    setSplashComplete(true);
    // Hide splash after a brief moment
    setTimeout(() => {
      setShowSplash(false);
    }, 100);
  };

  if (!fontsLoaded) {
    return null; // Keep native splash visible via preventAutoHideAsync until fonts load
  }

  // Show Custom Splash until animation completes
  if (!splashComplete) {
    return (
      <SplashScreen
        isReady={initialized}
        onComplete={handleSplashComplete}
      />
    );
  }

  // Once splash is done and we are initialized, show the app
  // Note: initialized should be true here because SplashScreen waits for isReady=true


  const navigationTheme = {
    dark: isDark,
    colors: {
      primary: theme.colors.primary,
      background: isDark ? '#030303' : '#FFFFFF',
      card: isDark ? '#030303' : '#FFFFFF',
      text: isDark ? '#FFFFFF' : '#030303',
      border: isDark ? '#030303' : '#E0E0E0',
      notification: theme.colors.primary,
    },
    fonts: {
      regular: {
        fontFamily: 'Barlow_400Regular',
        fontWeight: '400' as const,
      },
      medium: {
        fontFamily: 'Barlow_500Medium',
        fontWeight: '500' as const,
      },
      bold: {
        fontFamily: 'Barlow_700Bold',
        fontWeight: '700' as const,
      },
      heavy: {
        fontFamily: 'Barlow_800ExtraBold',
        fontWeight: '800' as const,
      },
    },
  };

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <NavigationContainer ref={navigationRef} linking={linking} theme={navigationTheme}>
          {Platform.OS === 'android' && (
            <StatusBar
              barStyle={isDark ? "light-content" : "dark-content"}
              backgroundColor={isDark ? "#030303" : "#FFFFFF"}
              translucent={false}
            />
          )}
          {Platform.OS === 'ios' && (
            <ExpoStatusBar style={isDark ? "light" : "dark"} />
          )}
          {/* Custom Notification Banner */}
          <NotificationBanner
            notification={notification}
            onDismiss={() => setNotification(null)}
          />
          {/* Custom Dialog */}
          {dialog && (
            <CustomDialog
              dialog={dialog}
              onDismiss={() => dialogManager.dismiss()}
            />
          )}
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: '#030303' }, // Prevent white flash
              transitionSpec: {
                open: {
                  animation: 'timing',
                  config: {
                    duration: 300,
                    easing: Easing120Hz.easeOut, // Optimized for 120Hz
                  },
                },
                close: {
                  animation: 'timing',
                  config: {
                    duration: 300,
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
          >
            {session && !isResettingPassword ? (
              (() => {
                if (userType === 'coach') {
                  if (!hasCompletedCoachOnboarding(user?.id || null)) {
                    return <Stack.Screen name="CoachOnboarding" component={CoachOnboardingNavigator} />;
                  }
                  return <Stack.Screen name="CoachApp" component={CoachAppNavigator} />;
                }
                return hasCompletedOnboarding(user?.id || null) ? (
                  <Stack.Screen name="App" component={AppNavigator} />
                ) : (
                  <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
                );
              })()
            ) : (
              <>
                <Stack.Screen name="Auth" component={AuthNavigator} />
                <Stack.Screen name="CoachAuth" component={CoachAuthNavigator} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#030303',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  logo: {
    width: 200,
    height: 60,
    marginBottom: theme.spacing.xl,
  },
  loader: {
    marginTop: theme.spacing.md,
  },
});
