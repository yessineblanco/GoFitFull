import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTextSizeStore, getScaledFontSize } from '@/store/textSizeStore';
import { useThemeStore } from '@/store/themeStore';
import { getTextColor, getGlassBg, getGlassBorder, getOverlayColor, getBlurTint, getSurfaceColor } from '@/utils/colorUtils';

const BRAND_PRIMARY = '#84c441';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type DialogType = 'success' | 'error' | 'warning' | 'info';

interface DialogState {
  visible: boolean;
  title: string;
  message: string;
  type: DialogType;
  onConfirm?: () => void;
  confirmText?: string;
  showCancel?: boolean;
  onCancel?: () => void;
  cancelText?: string;
}

interface CustomDialogProps {
  dialog: DialogState;
  onDismiss: () => void;
}

export const CustomDialog: React.FC<CustomDialogProps> = ({ dialog, onDismiss }) => {
  const { textSize } = useTextSizeStore();
  const { isDark } = useThemeStore();
  const textColor = getTextColor(isDark);
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(0)).current;
  const iconRotateAnim = useRef(new Animated.Value(0)).current;
  const borderGlowAnim = useRef(new Animated.Value(0)).current;

  const dynamicStyles = React.useMemo(() => {
    // Calculate if text is long (for French or other languages)
    const titleLength = dialog.title?.length || 0;
    const messageLength = dialog.message?.length || 0;
    const isLongText = titleLength > 15 || messageLength > 40;

    return {
      title: {
        fontSize: getScaledFontSize(isLongText ? 18 : 20),
        fontWeight: '600' as const,
        color: textColor,
        fontFamily: 'Barlow_600SemiBold',
        marginBottom: 8,
        textAlign: 'center' as const,
        paddingHorizontal: 4,
      },
      message: {
        fontSize: getScaledFontSize(isLongText ? 14 : 15),
        color: getOverlayColor(!isDark, 0.8),
        fontFamily: 'Barlow_400Regular',
        lineHeight: getScaledFontSize(isLongText ? 20 : 22),
        textAlign: 'center' as const,
        paddingHorizontal: 4,
      },
      confirmButtonText: {
        fontSize: getScaledFontSize(16),
        fontWeight: '600' as const,
        color: '#FFFFFF',
        fontFamily: 'Barlow_600SemiBold',
      },
      cancelButtonText: {
        fontSize: getScaledFontSize(16),
        fontWeight: '600' as const,
        color: textColor,
        fontFamily: 'Barlow_600SemiBold',
      },
    };
  }, [textSize, dialog.title, dialog.message, isDark, textColor]);

  useEffect(() => {
    if (dialog.visible) {
      // Trigger haptic feedback based on type
      if (dialog.type === 'success') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (dialog.type === 'error') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(iconScaleAnim, {
          toValue: 1,
          tension: 40,
          friction: 6,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.timing(iconRotateAnim, {
          toValue: 1,
          duration: 400,
          delay: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Pulsing border glow
      Animated.loop(
        Animated.sequence([
          Animated.timing(borderGlowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(borderGlowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      // Reset animations
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      iconScaleAnim.setValue(0);
      iconRotateAnim.setValue(0);
      borderGlowAnim.setValue(0);
    }
  }, [dialog.visible]);

  const handleConfirm = () => {
    // Start dismiss animation immediately
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (dialog.onConfirm) {
        dialog.onConfirm();
      }
      onDismiss();
    });
  };

  const handleCancel = () => {
    // Start dismiss animation immediately
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (dialog.onCancel) {
        dialog.onCancel();
      }
      onDismiss();
    });
  };

  const getDialogConfig = () => {
    switch (dialog.type) {
      case 'success':
        return {
          icon: CheckCircle,
          iconColor: BRAND_PRIMARY,
          accentColor: BRAND_PRIMARY,
        };
      case 'error':
        return {
          icon: XCircle,
          iconColor: '#ff4757',
          accentColor: '#ff4757',
        };
      case 'warning':
        return {
          icon: AlertCircle,
          iconColor: '#ff4757',
          accentColor: '#ff4757',
        };
      case 'info':
      default:
        return {
          icon: Info,
          iconColor: BRAND_PRIMARY,
          accentColor: BRAND_PRIMARY,
        };
    }
  };

  const config = getDialogConfig();
  const IconComponent = config.icon;

  const iconRotation = iconRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const borderGlowOpacity = borderGlowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  if (!dialog.visible) return null;

  return (
    <Modal
      visible={dialog.visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          {/* Dark overlay background */}
          <View style={styles.darkOverlay} />
          <BlurView intensity={isDark ? 40 : 50} tint={getBlurTint(isDark)} style={styles.blurOverlay} />
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.dialogContainer,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              <BlurView intensity={isDark ? 100 : 80} tint={getBlurTint(isDark)} style={[styles.dialog, {
                borderColor: getGlassBorder(isDark),
                backgroundColor: isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
              }]}>
                {/* Animated glowing border */}
                <Animated.View
                  style={[
                    styles.glowBorder,
                    {
                      borderColor: config.accentColor,
                      opacity: borderGlowOpacity,
                    },
                  ]}
                />
                <LinearGradient
                  colors={isDark
                    ? [`${config.accentColor}40`, `${config.accentColor}25`, '#1a1a1a']
                    : [`${config.accentColor}15`, `${config.accentColor}08`, 'rgba(255,255,255,0.95)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.gradient, { backgroundColor: isDark ? 'rgba(26, 26, 26, 0.9)' : 'rgba(255, 255, 255, 0.9)' }]}
                >
                  {/* Accent bar at top */}
                  <View style={[styles.accentBar, { backgroundColor: config.accentColor }]} />

                  {/* Icon */}
                  <View style={styles.iconContainer}>
                    <Animated.View
                      style={[
                        styles.iconCircle,
                        { backgroundColor: `${config.iconColor}20` },
                        {
                          transform: [
                            { scale: iconScaleAnim },
                            { rotate: iconRotation },
                          ],
                        },
                      ]}
                    >
                      <IconComponent size={40} color={config.iconColor} />
                    </Animated.View>
                  </View>

                  {/* Title */}
                  <Text
                    style={dynamicStyles.title}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    allowFontScaling={true}
                  >
                    {dialog.title}
                  </Text>

                  {/* Message */}
                  <Text
                    style={dynamicStyles.message}
                    numberOfLines={3}
                    adjustsFontSizeToFit
                    minimumFontScale={0.9}
                    allowFontScaling={true}
                  >
                    {dialog.message}
                  </Text>

                  {/* Buttons */}
                  <View style={styles.buttonContainer}>
                    {dialog.showCancel && (
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={handleCancel}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={dynamicStyles.cancelButtonText}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.85}
                          allowFontScaling={true}
                        >
                          {dialog.cancelText || 'Cancel'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={handleConfirm}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={[config.accentColor, `${config.accentColor}cc`]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.confirmGradient}
                      >
                        <Text
                          style={dynamicStyles.confirmButtonText}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.85}
                          allowFontScaling={true}
                        >
                          {dialog.confirmText || 'OK'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </BlurView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogContainer: {
    width: SCREEN_WIDTH - 64,
    maxWidth: 420, // Slightly wider to accommodate longer text
    minWidth: 280, // Ensure minimum width
  },
  dialog: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    position: 'relative',
  },
  glowBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 26,
    borderWidth: 2,
    zIndex: -1,
  },
  gradient: {
    padding: 24,
    paddingTop: 32,
    backgroundColor: 'rgba(26, 26, 26, 0.9)', // Solid base for gradient
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 0,
  },
  confirmGradient: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// Dialog Manager
class DialogManager {
  private listeners: Set<(dialog: DialogState | null) => void> = new Set();
  private currentDialog: DialogState | null = null;

  subscribe(listener: (dialog: DialogState | null) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.currentDialog));
  }

  show(
    title: string,
    message: string,
    type: DialogType = 'info',
    options?: {
      onConfirm?: () => void;
      confirmText?: string;
      showCancel?: boolean;
      onCancel?: () => void;
      cancelText?: string;
    }
  ) {
    this.currentDialog = {
      visible: true,
      title,
      message,
      type,
      onConfirm: options?.onConfirm,
      confirmText: options?.confirmText,
      showCancel: options?.showCancel || false,
      onCancel: options?.onCancel,
      cancelText: options?.cancelText,
    };
    this.notify();
  }

  success(
    title: string,
    message: string,
    onConfirm?: () => void,
    confirmText?: string
  ) {
    this.show(title, message, 'success', { onConfirm, confirmText });
  }

  error(
    title: string,
    message: string,
    onConfirm?: () => void,
    confirmText?: string
  ) {
    this.show(title, message, 'error', { onConfirm, confirmText });
  }

  warning(
    title: string,
    message: string,
    onConfirm?: () => void,
    confirmText?: string
  ) {
    this.show(title, message, 'warning', { onConfirm, confirmText });
  }

  info(
    title: string,
    message: string,
    onConfirm?: () => void,
    confirmText?: string
  ) {
    this.show(title, message, 'info', { onConfirm, confirmText });
  }

  dismiss() {
    if (this.currentDialog) {
      this.currentDialog.visible = false;
      this.notify();
      setTimeout(() => {
        this.currentDialog = null;
        this.notify();
      }, 150); // Faster cleanup
    }
  }
}

export const dialogManager = new DialogManager();

