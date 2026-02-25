import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  AccessibilityInfo,
  Easing,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Play, Pause, SkipForward, Plus, Minus, Settings } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useTextSizeStore, getScaledFontSize } from '@/store/textSizeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity } from '@/utils/colorUtils';
import { useRestTimer } from '@/hooks/useRestTimer';
import { useTimerStore } from '@/store/timerStore';
import { RestTimerSettings } from './RestTimerSettings';
import { useTranslation } from 'react-i18next';
import { Easing120Hz } from '@/utils/animations';
import { playHaptic } from '@/utils/audioManager';
import { Image } from 'expo-image';
import { getTranslatedExerciseName } from '@/utils/exerciseTranslations';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop, Path, ClipPath, G } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Exercise {
  id: string;
  name: string;
  image_url?: string;
  sets: string | number;
  reps: string | number;
}

interface EnhancedRestTimerProps {
  initialSeconds: number;
  onComplete: () => void;
  onSkip?: () => void;
  nextExercise?: Exercise;
  exerciseRestTime?: number;
  currentExercise?: {
    name: string;
    image_url?: string;
    currentSet: number;
    totalSets: number;
  };
  isBetweenExercises?: boolean;
}

export const EnhancedRestTimer: React.FC<EnhancedRestTimerProps> = ({
  initialSeconds,
  onComplete,
  onSkip,
  nextExercise,
  exerciseRestTime,
  currentExercise,
  isBetweenExercises = false,
}) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { preferences } = useTimerStore();
  const { t } = useTranslation();

  const [showNextExercise, setShowNextExercise] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const nextExerciseOpacity = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animated values for circular progress
  const progressValue = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.6)).current;
  const headerScale = useRef(new Animated.Value(1)).current;
  const headerGlow = useRef(new Animated.Value(0)).current;

  // Elite Enhancements: Animated Values
  const liquidWaveAnim = useRef(new Animated.Value(0)).current;
  const adrenalinePulseAnim = useRef(new Animated.Value(0)).current;
  const shatterScaleAnim = useRef(new Animated.Value(1)).current;
  const shatterOpacityAnim = useRef(new Animated.Value(1)).current;
  const edgeGlowScale = useRef(new Animated.Value(0.9)).current;

  // Smooth Progress Animation: Decouples visual level from seconds tick
  const animatedProgress = useRef(new Animated.Value(1)).current;

  // Use custom rest time if provided, otherwise use initialSeconds
  const restSeconds = exerciseRestTime || initialSeconds || preferences.default_rest_seconds;

  const {
    isActive,
    currentSeconds,
    initialSeconds: timerInitialSeconds,
    isPaused,
    start,
    stop,
    pause,
    resume,
    addTime,
    reduceTime,
  } = useRestTimer({
    onComplete: handleTimerComplete,
    enabled: true,
  });

  const PRESET_TIMES = [30, 60, 90, 120];

  const handlePresetTime = (seconds: number) => {
    playHaptic('light', preferences.haptics_enabled);
    start(seconds);
    if (isPaused) resume();
  };

  function handleTimerComplete() {
    Animated.parallel([
      Animated.timing(shatterScaleAnim, {
        toValue: 2.2,
        duration: 250,
        easing: Easing.bezier(0.33, 1, 0.68, 1),
        useNativeDriver: true,
      }),
      Animated.timing(shatterOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onComplete();
    });
  }

  // Start timer on mount
  useEffect(() => {
    const timerStore = useTimerStore.getState();
    timerStore.resetTimer();

    const seconds = Math.max(1, restSeconds || 60);
    const timer = setTimeout(() => {
      start(seconds);
    }, 100);

    return () => {
      clearTimeout(timer);
      stop();
    };
  }, []);

  const safeCurrentSeconds = isNaN(currentSeconds) || currentSeconds < 0 ? 0 : Math.floor(currentSeconds);
  const safeInitialSeconds = isNaN(timerInitialSeconds) || timerInitialSeconds <= 0 ? (restSeconds || 60) : Math.floor(timerInitialSeconds);
  const progress = safeInitialSeconds > 0 ? Math.max(0, Math.min(1, safeCurrentSeconds / safeInitialSeconds)) : 0;

  // Show next exercise preview
  useEffect(() => {
    if (isActive && !isPaused && nextExercise) {
      if (isBetweenExercises) {
        if (!showNextExercise) {
          setShowNextExercise(true);
          nextExerciseOpacity.setValue(0);
          scaleAnim.setValue(0.85);
          Animated.parallel([
            Animated.spring(nextExerciseOpacity, { toValue: 1, tension: 30, friction: 6, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, tension: 30, friction: 6, useNativeDriver: true }),
          ]).start();
        }
      } else {
        const shouldShow = safeCurrentSeconds <= 10 && safeCurrentSeconds > 0;
        if (shouldShow && !showNextExercise) {
          setShowNextExercise(true);
          nextExerciseOpacity.setValue(0);
          scaleAnim.setValue(0.9);
          Animated.parallel([
            Animated.timing(nextExerciseOpacity, { toValue: 1, duration: 600, easing: Easing120Hz.easeOut, useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(scaleAnim, { toValue: 1.05, duration: 300, easing: Easing120Hz.easeOut, useNativeDriver: true }),
              Animated.timing(scaleAnim, { toValue: 1, duration: 300, easing: Easing120Hz.easeIn, useNativeDriver: true }),
            ]),
          ]).start();
        } else if (!shouldShow && showNextExercise) {
          setShowNextExercise(false);
          nextExerciseOpacity.setValue(0);
          scaleAnim.setValue(1);
        }
      }
    } else {
      setShowNextExercise(false);
      nextExerciseOpacity.setValue(0);
      scaleAnim.setValue(1);
    }
  }, [isActive, isPaused, nextExercise, isBetweenExercises, safeCurrentSeconds, showNextExercise]);

  // Heartbeat Haptics & Pulse
  useEffect(() => {
    const timeRemaining = safeCurrentSeconds;
    if (preferences.warnings.includes(timeRemaining) && !isNaN(timeRemaining)) {
      const scale = timeRemaining <= 5 ? 1.15 : timeRemaining <= 10 ? 1.12 : 1.08;
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: scale, duration: 150, easing: Easing120Hz.easeOut, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 150, easing: Easing120Hz.easeIn, useNativeDriver: true }),
      ]).start();
    }

    if (timeRemaining <= 5 && timeRemaining > 0 && !isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(adrenalinePulseAnim, { toValue: 0.8, duration: 400, easing: Easing120Hz.easeInOut, useNativeDriver: true }),
          Animated.timing(adrenalinePulseAnim, { toValue: 0.3, duration: 400, easing: Easing120Hz.easeInOut, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(edgeGlowScale, { toValue: 1.05, duration: 400, easing: Easing120Hz.easeInOut, useNativeDriver: true }),
          Animated.timing(edgeGlowScale, { toValue: 0.95, duration: 400, easing: Easing120Hz.easeInOut, useNativeDriver: true }),
        ])
      ).start();

      // Drive header glow and pulsing at 5s
      Animated.loop(
        Animated.sequence([
          Animated.timing(headerGlow, { toValue: 1, duration: 400, easing: Easing120Hz.easeInOut, useNativeDriver: true }),
          Animated.timing(headerGlow, { toValue: 0, duration: 400, easing: Easing120Hz.easeInOut, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(headerScale, { toValue: 1.02, duration: 400, easing: Easing120Hz.easeInOut, useNativeDriver: true }),
          Animated.timing(headerScale, { toValue: 1, duration: 400, easing: Easing120Hz.easeInOut, useNativeDriver: true }),
        ])
      ).start();

      const lastHapticTime = (global as any).lastHaptic || 0;
      const now = Date.now();
      const interval = timeRemaining <= 3 ? 500 : 1000;
      if (now - lastHapticTime >= interval) {
        playHaptic(timeRemaining <= 3 ? 'heavy' : 'medium', preferences.haptics_enabled);
        (global as any).lastHaptic = now;
      }
    } else if (timeRemaining <= 10 && timeRemaining > 5 && !isPaused) {
      // Just subtle header pulse between 10s and 5s
      Animated.loop(
        Animated.sequence([
          Animated.timing(headerScale, { toValue: 1.01, duration: 800, easing: Easing120Hz.easeInOut, useNativeDriver: true }),
          Animated.timing(headerScale, { toValue: 1, duration: 800, easing: Easing120Hz.easeInOut, useNativeDriver: true }),
        ])
      ).start();
      headerGlow.setValue(0);
      adrenalinePulseAnim.setValue(0);
    } else {
      adrenalinePulseAnim.stopAnimation();
      edgeGlowScale.stopAnimation();
      headerScale.stopAnimation();
      headerGlow.stopAnimation();
      adrenalinePulseAnim.setValue(0);
      headerGlow.setValue(0);
      headerScale.setValue(1);
    }
  }, [safeCurrentSeconds, isPaused]);

  // Smooth Progress Level
  useEffect(() => {
    const targetProgress = progress;
    const currentProgress = (animatedProgress as any)._value || 1;
    const diff = Math.abs(currentProgress - targetProgress);

    if (diff > 0.1) {
      animatedProgress.setValue(targetProgress);
    } else {
      Animated.timing(animatedProgress, {
        toValue: targetProgress,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    }
  }, [progress]);

  // Perpetual Wave Animation
  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(liquidWaveAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const formatTime = (seconds: number) => {
    const secs = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(secs / 60);
    const rs = secs % 60;
    return mins > 0 ? `${mins}:${rs.toString().padStart(2, '0')}` : `${rs}s`;
  };

  const timerColor = safeCurrentSeconds > 30 ? theme.colors.success : safeCurrentSeconds > 10 ? theme.colors.warning : safeCurrentSeconds > 5 ? '#FF9800' : '#FF3B30';
  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  // Rolling Digit Component for smooth time transitions
  const RollingDigit = ({ digit, style }: { digit: string; style: any }) => {
    const animatedValue = useRef(new Animated.Value(0)).current;
    const [prevDigit, setPrevDigit] = useState(digit);
    const [currentDigit, setCurrentDigit] = useState(digit);

    useEffect(() => {
      if (digit !== currentDigit) {
        setPrevDigit(currentDigit);
        setCurrentDigit(digit);
        animatedValue.setValue(0);
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    }, [digit]);

    const translateYPrev = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -scaleHeight(60)],
    });

    const translateYCurr = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [scaleHeight(60), 0],
    });

    const opacityPrev = animatedValue.interpolate({
      inputRange: [0, 0.8, 1],
      outputRange: [1, 0, 0],
    });

    const opacityCurr = animatedValue.interpolate({
      inputRange: [0, 0.2, 1],
      outputRange: [0, 0, 1],
    });

    if (digit === ':' || digit === 's') {
      return <Text style={[style, { lineHeight: scaleHeight(110), verticalAlign: 'middle' }]}>{digit}</Text>;
    }

    return (
      <View style={{ height: scaleHeight(120), overflow: 'hidden', alignItems: 'center', justifyContent: 'center', width: digit === '1' ? scaleWidth(26) : scaleWidth(50) }}>
        <Animated.View style={{ position: 'absolute', transform: [{ translateY: translateYPrev }], opacity: opacityPrev }}>
          <Text style={[style, { lineHeight: scaleHeight(120), verticalAlign: 'middle' }]}>{prevDigit}</Text>
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: translateYCurr }], opacity: opacityCurr }}>
          <Text style={[style, { lineHeight: scaleHeight(120), verticalAlign: 'middle' }]}>{currentDigit}</Text>
        </Animated.View>
      </View>
    );
  };

  // Animated Glow Border Component
  const AnimatedGlowBorder = ({ color, glowValue }: { color: string; glowValue: Animated.Value }) => {
    const opacity = glowValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: getResponsiveSpacing(28),
            borderWidth: 2,
            borderColor: color,
            opacity,
          },
        ]}
      />
    );
  };

  const CircularProgress = ({ size, strokeWidth }: { size: number; strokeWidth: number }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const innerRadius = radius - strokeWidth / 2;
    const clipId = `liquidClip-${size}`;
    const waveH1 = size * 0.25;
    const count1 = 2.2;
    const segment1 = size / count1;
    const waveH2 = size * 0.18;
    const count2 = 3.8;
    const segment2 = size / count2;
    const waveH3 = size * 0.12;
    const count3 = 5.5;
    const segment3 = size / count3;

    const generatePath = (count: number, segWidth: number, height: number, invert = false) => {
      const h = invert ? -height : height;
      const w2 = segWidth / 2;
      const bezier = `c ${segWidth * 0.2} ${-h} ${segWidth * 0.3} ${-h} ${w2} 0 c ${segWidth * 0.2} ${h} ${segWidth * 0.3} ${h} ${w2} 0 `;
      let p = "";
      for (let i = 0; i < Math.ceil(count) + 4; i++) p += bezier;
      return `M 0 0 ${p} L ${size * 4} ${size} L 0 ${size} Z`;
    };

    const translateX1 = liquidWaveAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -segment1] });
    const translateX2 = liquidWaveAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -segment2 * 2] });
    const translateX3 = liquidWaveAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -segment3 * 3] });
    const waveBob1 = liquidWaveAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 8, 0] });
    const waveBob2 = liquidWaveAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [6, 0, 6] });
    const liquidLevel = animatedProgress.interpolate({ inputRange: [0, 1], outputRange: [size, 0] });
    const strokeDashoffset = animatedProgress.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

    const AnimatedCircle = Animated.createAnimatedComponent(Circle);
    const AnimatedPath = Animated.createAnimatedComponent(Path);
    const AnimatedG = Animated.createAnimatedComponent(G);

    return (
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Defs>
            <ClipPath id={clipId}>
              <Circle cx={size / 2} cy={size / 2} r={innerRadius - 4} />
            </ClipPath>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth={strokeWidth} fill="transparent" />
          <G clipPath={`url(#${clipId})`}>
            <AnimatedG transform={[{ translateY: liquidLevel }]}>
              <AnimatedG transform={[{ translateX: translateX1 }, { translateY: waveBob2 }]}><Path d={generatePath(count1, segment1, waveH1)} fill={timerColor} opacity={0.15} /></AnimatedG>
              <AnimatedG transform={[{ translateX: translateX2 }, { translateY: waveBob1 }]}><Path d={generatePath(count2, segment2, waveH2, true)} fill={timerColor} opacity={0.3} /></AnimatedG>
              <AnimatedG transform={[{ translateX: translateX3 }]}><Path d={generatePath(count3, segment3, waveH3)} fill={timerColor} opacity={0.6} /></AnimatedG>
            </AnimatedG>
          </G>
          <AnimatedCircle cx={size / 2} cy={size / 2} r={radius} stroke={timerColor} strokeWidth={strokeWidth} fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset as any} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        </Svg>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#030303' : '#FFFFFF' }]}>
      <LinearGradient colors={isDark ? ['#030303', '#1a1a1a', '#030303'] : ['#FFFFFF', '#F5F7F9', '#FFFFFF']} style={StyleSheet.absoluteFill} />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: adrenalinePulseAnim, borderWidth: 15, borderColor: '#FF3B30', transform: [{ scale: edgeGlowScale }] }]} pointerEvents="none">
        <BlurView intensity={60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
      </Animated.View>

      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: shatterScaleAnim }], opacity: shatterOpacityAnim }]}>
        <LinearGradient colors={isDark ? ['#030303', '#1a1a1a', '#030303'] : ['#FFFFFF', '#F5F7F9', '#FFFFFF']} style={StyleSheet.absoluteFill} />

        <TouchableOpacity onPress={() => setShowSettings(true)} style={[styles.settingsButton, { top: insets.top + getResponsiveSpacing(20), backgroundColor: getPrimaryWithOpacity(0.3), borderColor: BRAND_PRIMARY }]} activeOpacity={0.7}>
          <Settings size={24} color={BRAND_PRIMARY} />
        </TouchableOpacity>

        <View style={[styles.content, { paddingTop: insets.top + getResponsiveSpacing(40), paddingBottom: insets.bottom + getResponsiveSpacing(80) }]}>
          {currentExercise && !isBetweenExercises && (
            <Animated.View style={[styles.exerciseHeaderContainer, { transform: [{ scale: headerScale }] }]}>
              <View style={styles.exerciseCardContainer}>
                <LinearGradient colors={isDark ? ['rgba(0,200,83,0.15)', 'rgba(0,200,83,0.05)', 'rgba(3,3,3,0.8)'] : ['rgba(0,200,83,0.2)', 'rgba(0,200,83,0.05)', 'rgba(255,255,255,0.9)']} style={styles.exerciseCardGradient} />

                {/* Glow border effect when timer is low */}
                <AnimatedGlowBorder color={timerColor} glowValue={headerGlow} />

                <View style={styles.exerciseCardContent}>
                  {currentExercise.image_url ? (
                    <View style={styles.exerciseImageContainer}>
                      <Image source={{ uri: currentExercise.image_url }} style={styles.exerciseMainImage} contentFit="cover" />
                    </View>
                  ) : (
                    <View style={[styles.exerciseImagePlaceholder, { backgroundColor: getPrimaryWithOpacity(0.2) }]}>
                      <Text style={[styles.exerciseImagePlaceholderText, { color: BRAND_PRIMARY }]}>{currentExercise.name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.exerciseInfoContainer}>
                    <Text style={[styles.exerciseLabel, { color: getTextColorWithOpacity(isDark, 0.6) }]}>{t('library.restTimer.completedSet', { defaultValue: 'Completed Set' })}</Text>
                    <Text style={[styles.exerciseName, { color: BRAND_WHITE }]} numberOfLines={2}>{getTranslatedExerciseName(currentExercise.name, t)}</Text>
                    <Animated.View style={{ transform: [{ scale: pulseAnim }], alignSelf: 'flex-start' }}>
                      <LinearGradient colors={[BRAND_PRIMARY, BRAND_PRIMARY]} style={styles.setBadgeGradient}>
                        <Text style={[styles.setBadgeText, { color: BRAND_BLACK }]}>{t('library.restTimer.set', { defaultValue: 'Set' })} {currentExercise.currentSet} / {currentExercise.totalSets}</Text>
                      </LinearGradient>
                    </Animated.View>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          <View style={styles.timerSection}>
            <View style={styles.progressContainer}>
              <CircularProgress size={scaleWidth(240)} strokeWidth={12} />
              <View style={styles.timerTextContainer}>
                <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', transform: [{ scale: pulseAnim }] }]}>
                  {formatTime(safeCurrentSeconds).split('').map((char, index) => (
                    <RollingDigit
                      key={`${index}-${char === ':' ? 'sep' : char === 's' ? 'unit' : 'digit'}`}
                      digit={char}
                      style={[styles.timerText, { color: timerColor, fontSize: getResponsiveFontSize(64) }]}
                    />
                  ))}
                </Animated.View>
              </View>
            </View>
          </View>

          <View style={styles.controlsContainer}>
            <TouchableOpacity onPress={() => reduceTime(15)} style={[styles.timeButton, { backgroundColor: getPrimaryWithOpacity(0.2), borderColor: getPrimaryWithOpacity(0.3) }]} activeOpacity={0.7}><Minus size={18} color={BRAND_PRIMARY} /><Text style={[styles.timeButtonText, { color: BRAND_PRIMARY }]}>-15s</Text></TouchableOpacity>
            <TouchableOpacity onPress={isPaused ? resume : pause} style={[styles.controlButton, { backgroundColor: getPrimaryWithOpacity(0.2), borderColor: BRAND_PRIMARY }]} activeOpacity={0.7}>{isPaused ? <Play size={24} color={BRAND_PRIMARY} fill={BRAND_PRIMARY} /> : <Pause size={24} color={BRAND_PRIMARY} fill={BRAND_PRIMARY} />}</TouchableOpacity>
            <TouchableOpacity onPress={() => addTime(15)} style={[styles.timeButton, { backgroundColor: getPrimaryWithOpacity(0.2), borderColor: getPrimaryWithOpacity(0.3) }]} activeOpacity={0.7}><Plus size={18} color={BRAND_PRIMARY} /><Text style={[styles.timeButtonText, { color: BRAND_PRIMARY }]}>+15s</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { stop(); if (onSkip) onSkip(); else onComplete(); }} style={[styles.skipButton, { backgroundColor: getPrimaryWithOpacity(0.2), borderColor: BRAND_PRIMARY }]} activeOpacity={0.7}><SkipForward size={18} color={BRAND_WHITE} /><Text style={[styles.skipButtonText, { color: BRAND_WHITE }]}>Skip</Text></TouchableOpacity>
          </View>

          <View style={[styles.presetContainer, { marginTop: getResponsiveSpacing(16) }]}>
            <Text style={[styles.presetLabel, { color: getTextColorWithOpacity(isDark, 0.5) }]}>{t('library.restTimer.quickPresets', { defaultValue: 'Quick Presets' })}</Text>
            <View style={styles.presetButtonsRow}>
              {PRESET_TIMES.map((time) => (
                <TouchableOpacity key={time} onPress={() => handlePresetTime(time)} style={[styles.presetButton, { backgroundColor: getPrimaryWithOpacity(0.15), borderColor: getPrimaryWithOpacity(0.3) }]} activeOpacity={0.7}><Text style={[styles.presetButtonText, { color: BRAND_PRIMARY }]}>{time}s</Text></TouchableOpacity>
              ))}
            </View>
          </View>

          {showNextExercise && nextExercise && (
            <Animated.View style={[styles.nextExerciseContainer, { opacity: nextExerciseOpacity, transform: [{ scale: scaleAnim }], backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
              <Text style={[styles.nextExerciseTitle, { color: getTextColorWithOpacity(isDark, 0.8) }]}>{t('library.restTimer.nextExercise', { defaultValue: 'Next Exercise' })}</Text>
              <View style={styles.nextExerciseCard}>
                {nextExercise.image_url && <Image source={{ uri: nextExercise.image_url }} style={styles.nextExerciseImage} contentFit="cover" />}
                <View style={styles.nextExerciseInfo}>
                  <Text style={[styles.nextExerciseName, { color: BRAND_WHITE }]} numberOfLines={1}>{nextExercise.name}</Text>
                  <Text style={[styles.nextExerciseDetails, { color: getTextColorWithOpacity(isDark, 0.7) }]}>{nextExercise.sets} sets × {nextExercise.reps} reps</Text>
                </View>
                <TouchableOpacity onPress={() => { stop(); onComplete(); }} style={[styles.skipToNextButton, { backgroundColor: getPrimaryWithOpacity(0.2) }]} activeOpacity={0.7}><Text style={[styles.skipToNextText, { color: BRAND_WHITE }]}>{t('library.restTimer.skipToNext', { defaultValue: 'Skip to Next' })}</Text></TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      </Animated.View>

      <RestTimerSettings visible={showSettings} onClose={() => setShowSettings(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, justifyContent: 'center', alignItems: 'center' },
  content: { width: '100%', paddingHorizontal: getResponsiveSpacing(24), alignItems: 'center' },
  timerSection: { alignItems: 'center', marginBottom: getResponsiveSpacing(12) },
  progressContainer: { width: scaleWidth(240), height: scaleWidth(240), justifyContent: 'center', alignItems: 'center', position: 'relative', marginBottom: getResponsiveSpacing(16) },
  timerTextContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  timerText: { fontFamily: 'Barlow_800ExtraBold', fontWeight: 'normal', letterSpacing: -4, textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
  controlsContainer: { width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: getResponsiveSpacing(12), gap: getResponsiveSpacing(6) },
  controlButton: { width: scaleWidth(56), height: scaleWidth(56), borderRadius: scaleWidth(28), justifyContent: 'center', alignItems: 'center', borderWidth: 2, elevation: 6 },
  timeButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: getResponsiveSpacing(10), paddingVertical: getResponsiveSpacing(8), borderRadius: getResponsiveSpacing(20), gap: getResponsiveSpacing(4), elevation: 6 },
  timeButtonText: { fontSize: getResponsiveFontSize(12), fontFamily: 'Barlow_600SemiBold', fontWeight: '600' },
  skipButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: getResponsiveSpacing(12), paddingVertical: getResponsiveSpacing(8), borderRadius: getResponsiveSpacing(20), borderWidth: 2, gap: getResponsiveSpacing(4), elevation: 6 },
  skipButtonText: { fontSize: getResponsiveFontSize(12), fontFamily: 'Barlow_600SemiBold', fontWeight: '600' },
  presetContainer: { width: '100%', alignItems: 'center' },
  presetLabel: { fontSize: getResponsiveFontSize(12), fontFamily: 'Barlow_500Medium', marginBottom: getResponsiveSpacing(8), textTransform: 'uppercase', letterSpacing: 0.5 },
  presetButtonsRow: { flexDirection: 'row', gap: getResponsiveSpacing(8), justifyContent: 'center', flexWrap: 'wrap' },
  presetButton: { paddingHorizontal: getResponsiveSpacing(16), paddingVertical: getResponsiveSpacing(8), borderRadius: getResponsiveSpacing(16), borderWidth: 2, minWidth: scaleWidth(60), alignItems: 'center', elevation: 3 },
  presetButtonText: { fontSize: getResponsiveFontSize(14), fontFamily: 'Barlow_600SemiBold' },
  nextExerciseContainer: { width: '100%', marginTop: getResponsiveSpacing(8), padding: getResponsiveSpacing(12), borderRadius: getResponsiveSpacing(20), borderWidth: 2, elevation: 8 },
  nextExerciseTitle: { fontSize: getResponsiveFontSize(14), fontFamily: 'Barlow_600SemiBold', marginBottom: getResponsiveSpacing(12) },
  nextExerciseCard: { flexDirection: 'row', alignItems: 'center', gap: getResponsiveSpacing(12) },
  nextExerciseImage: { width: scaleWidth(60), height: scaleWidth(60), borderRadius: getResponsiveSpacing(8) },
  nextExerciseInfo: { flex: 1 },
  nextExerciseName: { fontSize: getResponsiveFontSize(14), fontFamily: 'Barlow_600SemiBold', marginBottom: getResponsiveSpacing(4) },
  nextExerciseDetails: { fontSize: getResponsiveFontSize(14), fontFamily: 'Barlow_400Regular' },
  skipToNextButton: { paddingHorizontal: getResponsiveSpacing(16), paddingVertical: getResponsiveSpacing(10), borderRadius: getResponsiveSpacing(20) },
  skipToNextText: { fontSize: getResponsiveFontSize(14), fontFamily: 'Barlow_600SemiBold', fontWeight: '600' },
  settingsButton: { position: 'absolute', right: getResponsiveSpacing(20), width: scaleWidth(48), height: scaleWidth(48), borderRadius: scaleWidth(24), justifyContent: 'center', alignItems: 'center', borderWidth: 2, zIndex: 1000, elevation: 10 },
  exerciseHeaderContainer: { width: '100%', marginBottom: getResponsiveSpacing(12), paddingHorizontal: getResponsiveSpacing(20) },
  exerciseCardContainer: { borderRadius: getResponsiveSpacing(28), overflow: 'hidden', borderWidth: 2, elevation: 12 },
  exerciseCardGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: getResponsiveSpacing(28), borderWidth: 2 },
  exerciseCardContent: { flexDirection: 'row', alignItems: 'center', padding: getResponsiveSpacing(16), minHeight: scaleHeight(110) },
  exerciseImageContainer: { width: scaleWidth(80), height: scaleWidth(80), borderRadius: getResponsiveSpacing(16), overflow: 'hidden', marginRight: getResponsiveSpacing(20), elevation: 8 },
  exerciseMainImage: { width: '100%', height: '100%' },
  exerciseImagePlaceholder: { width: scaleWidth(80), height: scaleWidth(80), borderRadius: getResponsiveSpacing(16), justifyContent: 'center', alignItems: 'center', marginRight: getResponsiveSpacing(20), elevation: 8 },
  exerciseImagePlaceholderText: { fontSize: getScaledFontSize(36), fontFamily: 'Barlow_800ExtraBold', fontWeight: 'normal' },
  exerciseInfoContainer: { flex: 1, justifyContent: 'center' },
  exerciseLabel: { fontSize: getScaledFontSize(11), fontFamily: 'Barlow_600SemiBold', marginBottom: getResponsiveSpacing(6), textTransform: 'uppercase', letterSpacing: 1.5 },
  exerciseName: { fontSize: getScaledFontSize(18), fontFamily: 'Barlow_700Bold', marginBottom: getResponsiveSpacing(12), lineHeight: getScaledFontSize(24) },
  setBadgeGradient: { paddingHorizontal: getResponsiveSpacing(16), paddingVertical: getResponsiveSpacing(8), borderRadius: getResponsiveSpacing(20), elevation: 6 },
  setBadgeText: { fontSize: getScaledFontSize(14), fontFamily: 'Barlow_700Bold', fontWeight: '700' },
});
