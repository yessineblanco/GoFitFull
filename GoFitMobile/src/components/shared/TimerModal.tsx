import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Vibration,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Play, Pause, RotateCcw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useThemeStore } from '@/store/themeStore';
import { getTextColor, getBlurTint } from '@/utils/colorUtils';
import { getResponsiveFontSize } from '@/utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BRAND_GREEN = '#84c441';
const TIMER_SIZE = SCREEN_WIDTH * 0.55;

const PRESETS = [30, 60, 90, 120, 180] as const;

interface TimerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const TimerModal: React.FC<TimerModalProps> = ({ visible, onClose }) => {
  const { isDark } = useThemeStore();
  const textColor = getTextColor(isDark);

  const [totalSeconds, setTotalSeconds] = useState(60);
  const [remaining, setRemaining] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      opacityAnim.setValue(0);
      resetTimer();
    }
  }, [visible]);

  useEffect(() => {
    if (isRunning && remaining <= 3 && remaining > 0) {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
    }
  }, [remaining, isRunning]);

  const startTimer = useCallback(() => {
    if (remaining <= 0) return;
    setIsRunning(true);
    setHasStarted(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [remaining]);

  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
    setHasStarted(false);
    setRemaining(totalSeconds);
    progressAnim.setValue(1);
  }, [totalSeconds]);

  const selectPreset = useCallback((seconds: number) => {
    if (isRunning) return;
    setTotalSeconds(seconds);
    setRemaining(seconds);
    setHasStarted(false);
    progressAnim.setValue(1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [isRunning]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            intervalRef.current = null;
            setIsRunning(false);
            Vibration.vibrate(Platform.OS === 'ios' ? [0, 500, 200, 500] : [0, 500, 200, 500, 200, 500]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  useEffect(() => {
    if (totalSeconds > 0) {
      Animated.timing(progressAnim, {
        toValue: remaining / totalSeconds,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [remaining, totalSeconds]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPreset = (s: number) => (s >= 60 ? `${s / 60}m` : `${s}s`);

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const circumference = Math.PI * (TIMER_SIZE - 16);
  const strokeDashoffset = circumference * (1 - progress);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.85, duration: 150, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.darkOverlay} />
          <BlurView intensity={isDark ? 40 : 50} tint={getBlurTint(isDark)} style={styles.blurOverlay} />
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.dialogContainer,
                { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
              ]}
            >
              <BlurView
                intensity={isDark ? 100 : 80}
                tint={getBlurTint(isDark)}
                style={[
                  styles.dialog,
                  {
                    backgroundColor: isDark ? 'rgba(20, 20, 20, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  },
                ]}
              >
                <View style={[styles.accentBar, { backgroundColor: BRAND_GREEN }]} />

                <View style={styles.header}>
                  <Text style={[styles.title, { color: textColor }]}>Rest Timer</Text>
                  <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                    <X size={20} color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'} />
                  </TouchableOpacity>
                </View>

                <View style={styles.presetRow}>
                  {PRESETS.map((sec) => {
                    const isActive = totalSeconds === sec && !hasStarted;
                    return (
                      <TouchableOpacity
                        key={sec}
                        onPress={() => selectPreset(sec)}
                        style={[
                          styles.presetButton,
                          isActive && styles.presetButtonActive,
                          { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' },
                        ]}
                        disabled={isRunning}
                      >
                        <Text
                          style={[
                            styles.presetText,
                            { color: isActive ? '#fff' : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' },
                          ]}
                        >
                          {formatPreset(sec)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Animated.View style={[styles.timerContainer, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={[styles.timerRing, { width: TIMER_SIZE, height: TIMER_SIZE }]}>
                    <View
                      style={[
                        styles.timerTrack,
                        { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                      ]}
                    />
                    <View style={styles.svgContainer}>
                      <View
                        style={[
                          styles.progressCircle,
                          {
                            borderColor: remaining === 0 ? '#ff4757' : BRAND_GREEN,
                            borderWidth: 4,
                            borderRadius: TIMER_SIZE / 2,
                            width: TIMER_SIZE - 8,
                            height: TIMER_SIZE - 8,
                            opacity: progress > 0 ? 1 : 0.3,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.timerContent}>
                      <Text
                        style={[
                          styles.timerText,
                          {
                            color: remaining === 0 ? '#ff4757' : textColor,
                            fontSize: getResponsiveFontSize(remaining === 0 ? 28 : 42),
                          },
                        ]}
                      >
                        {remaining === 0 ? 'Done!' : formatTime(remaining)}
                      </Text>
                      {hasStarted && remaining > 0 && (
                        <Text style={[styles.timerLabel, { color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }]}>
                          {isRunning ? 'remaining' : 'paused'}
                        </Text>
                      )}
                    </View>
                  </View>
                </Animated.View>

                <View style={styles.controlRow}>
                  <TouchableOpacity
                    onPress={resetTimer}
                    style={[
                      styles.controlButton,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                    ]}
                  >
                    <RotateCcw size={22} color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={isRunning ? pauseTimer : startTimer}
                    style={styles.mainButton}
                    disabled={remaining <= 0 && !isRunning}
                  >
                    <LinearGradient
                      colors={
                        remaining <= 0
                          ? ['rgba(128,128,128,0.4)', 'rgba(128,128,128,0.3)']
                          : [BRAND_GREEN, '#7db63a']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.mainButtonGradient}
                    >
                      {isRunning ? (
                        <Pause size={28} color="#fff" fill="#fff" />
                      ) : (
                        <Play size={28} color="#fff" fill="#fff" />
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={styles.controlButtonPlaceholder} />
                </View>
              </BlurView>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  blurOverlay: { ...StyleSheet.absoluteFillObject },
  dialogContainer: { width: SCREEN_WIDTH - 48, maxWidth: 400 },
  dialog: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    paddingBottom: 28,
  },
  accentBar: {
    height: 3,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(20),
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetButtonActive: {
    backgroundColor: BRAND_GREEN,
    borderColor: BRAND_GREEN,
  },
  presetText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(13),
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  timerRing: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  timerTrack: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderRadius: 999,
    borderWidth: 4,
  },
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircle: {
    position: 'absolute',
  },
  timerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontFamily: 'Barlow_700Bold',
  },
  timerLabel: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonPlaceholder: {
    width: 48,
    height: 48,
  },
  mainButton: {
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: BRAND_GREEN,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mainButtonGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
