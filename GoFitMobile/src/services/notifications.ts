import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/config/supabase';
import { logger } from '@/utils/logger';

export interface NotificationPreferences {
  workoutReminders: boolean;
  achievementNotifications: boolean;
  weeklyProgressReports: boolean;
  notificationTime: string; // HH:MM format
}

// Configure notification handler
// When app is in foreground, we'll use custom UI instead of system banner
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false, // Disable system banner - we'll show custom UI
    shouldShowList: true, // Show in notification list
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Notification service for managing local scheduled notifications
 * 
 * Note: This uses LOCAL notifications (scheduled on device), which work in Expo Go.
 * Remote push notifications require a development build and are not used here.
 */
export const notificationService = {
  /**
   * Request notification permissions for local notifications
   * Works in Expo Go - only remote push notifications require a development build
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        logger.warn('Notification permissions not granted');
        return false;
      }

      // Configure Android channel for local notifications
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'GoFit Notifications',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#84c441',
          });
        } catch (error) {
          // Channel creation might fail in Expo Go, but local notifications should still work
          logger.warn('Could not create notification channel (may not be available in Expo Go):', error);
        }
      }

      return true;
    } catch (error) {
      // Gracefully handle errors (e.g., in Expo Go or when notifications aren't fully supported)
      logger.warn('Error requesting notification permissions (notifications may not be fully supported in Expo Go):', error);
      // Return false but don't throw - app should continue to work
      return false;
    }
  },

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      logger.info('All scheduled notifications cancelled');
    } catch (error) {
      logger.error('Error cancelling notifications:', error);
    }
  },

  /**
   * Schedule workout reminder notification (local notification)
   * Works in Expo Go - uses device's local notification scheduler
   */
  async scheduleWorkoutReminder(time: string): Promise<void> {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      
      // Cancel existing workout reminders
      try {
        const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of allNotifications) {
          if (notification.identifier.startsWith('workout-reminder-')) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          }
        }
      } catch (error) {
        logger.warn('Could not cancel existing notifications:', error);
      }

      // Schedule daily workout reminder (local notification)
      await Notifications.scheduleNotificationAsync({
        identifier: 'workout-reminder-daily',
        content: {
          title: '💪 Time for Your Workout!',
          body: 'Don\'t forget to complete your workout today. Stay consistent!',
          sound: true,
          data: { type: 'workout_reminder' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      logger.info(`Workout reminder scheduled for ${time}`);
    } catch (error) {
      // Gracefully handle errors (e.g., if notifications aren't fully supported)
      logger.warn('Error scheduling workout reminder (local notifications may not be fully supported):', error);
      // Don't throw - allow app to continue functioning
    }
  },

  /**
   * Schedule weekly progress report notification (local notification)
   * Works in Expo Go - uses device's local notification scheduler
   */
  async scheduleWeeklyProgressReport(time: string): Promise<void> {
    try {
      const [hours, minutes] = time.split(':').map(Number);
      
      // Cancel existing weekly reports
      try {
        const allNotifications = await Notifications.getAllScheduledNotificationsAsync();
        for (const notification of allNotifications) {
          if (notification.identifier.startsWith('weekly-report-')) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          }
        }
      } catch (error) {
        logger.warn('Could not cancel existing notifications:', error);
      }

      // Schedule weekly progress report (every Monday) - local notification
      // Android doesn't support weekday in calendar triggers, so we skip it on Android
      // Weekly reports will only work on iOS until we implement a workaround
      if (Platform.OS === 'android') {
        logger.info('Weekly progress reports are not fully supported on Android (weekday triggers not available). Skipping schedule.');
        // Don't schedule on Android - the preference is still saved, just won't trigger
        return;
      }
      
      // iOS supports weekday
      await Notifications.scheduleNotificationAsync({
        identifier: 'weekly-report-monday',
        content: {
          title: '📊 Your Weekly Progress Report',
          body: 'Check out your fitness progress for this week!',
          sound: true,
          data: { type: 'weekly_progress' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          weekday: 1, // Monday
          hour: hours,
          minute: minutes,
          repeats: true,
        },
      });

      logger.info(`Weekly progress report scheduled for ${time} every Monday`);
    } catch (error) {
      // Gracefully handle errors
      logger.warn('Error scheduling weekly progress report (local notifications may not be fully supported):', error);
      // Don't throw - allow app to continue functioning
    }
  },

  /**
   * Send achievement notification (immediate local notification)
   * Works in Expo Go - uses device's local notification system
   */
  async sendAchievementNotification(title: string, body: string): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🏆 ${title}`,
          body,
          sound: true,
          data: { type: 'achievement' },
        },
        trigger: null, // Immediate (local notification)
      });
    } catch (error) {
      // Gracefully handle errors
      logger.warn('Error sending achievement notification (local notifications may not be fully supported):', error);
      // Don't throw - allow app to continue functioning
    }
  },

  /**
   * Update scheduled notifications based on user preferences
   * Uses local notifications - works in Expo Go
   */
  async updateScheduledNotifications(prefs: NotificationPreferences): Promise<void> {
    try {
      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        logger.warn('Cannot update notifications: permissions not granted (this is expected in Expo Go if notifications aren\'t fully supported)');
        // Don't throw - preferences are still saved to database
        return;
      }

      // Cancel all existing notifications
      await this.cancelAllNotifications();

      // Schedule new notifications based on preferences
      if (prefs.workoutReminders) {
        await this.scheduleWorkoutReminder(prefs.notificationTime);
      }

      if (prefs.weeklyProgressReports) {
        await this.scheduleWeeklyProgressReport(prefs.notificationTime);
      }

      // Achievement notifications are sent immediately when triggered
      // They don't need to be scheduled

      logger.info('Notification preferences updated successfully');
    } catch (error) {
      // Gracefully handle errors - don't throw so preferences can still be saved
      logger.warn('Error updating scheduled notifications (may not be fully supported in Expo Go):', error);
      // Don't throw - preferences are still saved to database even if scheduling fails
    }
  },

  /**
   * Register push token with backend (for remote push notifications)
   * Note: getExpoPushTokenAsync may not work in Expo Go - requires development build
   */
  async registerPushToken(userId: string): Promise<void> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return;

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: require('../../app.json').expo.extra?.eas?.projectId ?? undefined,
      });
      const token = tokenData?.data;
      if (!token) return;

      const platform = Platform.OS as 'ios' | 'android';
      await supabase.from('push_tokens').upsert(
        { user_id: userId, expo_push_token: token, platform },
        { onConflict: 'user_id,expo_push_token' }
      );
      logger.info('Push token registered');
    } catch (error) {
      logger.warn('Could not register push token (expected in Expo Go):', error);
    }
  },

  /**
   * Get all scheduled notifications (for debugging)
   */
  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      logger.error('Error getting scheduled notifications:', error);
      return [];
    }
  },

  /**
   * Send a test notification to preview the custom UI
   * This triggers immediately and shows the custom banner when app is in foreground
   */
  async sendTestNotification(type: 'workout' | 'progress' | 'achievement' = 'workout'): Promise<void> {
    try {
      const notificationConfig = {
        workout: {
          title: '💪 Time for Your Workout!',
          body: 'This is a test workout reminder notification.',
          data: { type: 'workout_reminder' },
        },
        progress: {
          title: '📊 Your Weekly Progress Report',
          body: 'This is a test progress report notification.',
          data: { type: 'weekly_progress' },
        },
        achievement: {
          title: '🏆 Achievement Unlocked!',
          body: 'This is a test achievement notification.',
          data: { type: 'achievement' },
        },
      };

      const config = notificationConfig[type];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: config.title,
          body: config.body,
          sound: true,
          data: config.data,
        },
        trigger: null, // Immediate notification
      });

      logger.info(`Test ${type} notification sent`);
    } catch (error) {
      logger.error('Error sending test notification:', error);
      throw error;
    }
  },
};

