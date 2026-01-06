import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, X } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND_PRIMARY = '#84c441';
const BRAND_BLACK = '#030303';
const BRAND_WHITE = '#FFFFFF';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface NotificationBannerProps {
  notification: Notifications.Notification | null;
  onDismiss: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  notification,
  onDismiss,
}) => {
  // Use safe area insets (now that SafeAreaProvider wraps the app)
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      // Slide in animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 5 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      handleDismiss();
    }
  }, [notification]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      onDismiss();
    });
  };

  if (!visible || !notification) return null;

  const title = notification.request.content.title || 'Notification';
  const body = notification.request.content.body || '';

  // Determine notification type from data
  const notificationType = notification.request.content.data?.type as string | undefined;
  const getNotificationIcon = () => {
    switch (notificationType) {
      case 'workout_reminder':
        return '💪';
      case 'weekly_progress':
        return '📊';
      case 'achievement':
        return '🏆';
      default:
        return '🔔';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleDismiss}
        style={styles.touchable}
      >
        <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
          <LinearGradient
            colors={[`${BRAND_PRIMARY}15`, `${BRAND_PRIMARY}08`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            {/* Left accent bar */}
            <View style={styles.accentBar} />

            {/* Content */}
            <View style={styles.content}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <Text style={styles.iconEmoji}>{getNotificationIcon()}</Text>
              </View>

              {/* Text content */}
              <View style={styles.textContainer}>
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
                {body ? (
                  <Text style={styles.body} numberOfLines={2}>
                    {body}
                  </Text>
                ) : null}
              </View>

              {/* Close button */}
              <TouchableOpacity
                onPress={handleDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeButton}
              >
                <X size={18} color={BRAND_WHITE} opacity={0.7} />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
  },
  touchable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: `${BRAND_PRIMARY}30`,
  },
  gradient: {
    padding: 16,
    minHeight: 70,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: BRAND_PRIMARY,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${BRAND_PRIMARY}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconEmoji: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: BRAND_WHITE,
    fontFamily: 'Barlow_600SemiBold',
    marginBottom: 4,
  },
  body: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'Barlow_400Regular',
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
  },
});

