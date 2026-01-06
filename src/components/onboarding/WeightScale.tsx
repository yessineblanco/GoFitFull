import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import {
  PanGestureHandler,
  GestureHandlerRootView,
  State,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { getResponsiveFontSize, scaleWidth, scaleHeight } from '@/utils/responsive';
import { theme } from '@/theme';

interface WeightScaleProps {
  min?: number;
  max?: number;
  initialValue?: number;
  unit?: string;
  onValueChange?: (value: number) => void;
  containerStyle?: any;
}

const SCALE_WIDTH = scaleWidth(340);
const ITEM_WIDTH = 10;
const TICK_HEIGHT_MAJOR = 30;
const TICK_HEIGHT_MID = 20;
const TICK_HEIGHT_MINOR = 12;

export const WeightScale: React.FC<WeightScaleProps> = React.memo(({
  min = 0,
  max = 300,
  initialValue = 0,
  unit = '',
  onValueChange,
  containerStyle,
}) => {
  // anchorValue: The value at translateX = 0
  const [anchorValue, setAnchorValue] = useState(initialValue);
  // displayValue: The live value shown in text
  const [displayValue, setDisplayValue] = useState(initialValue);

  const translateX = useRef(new Animated.Value(0)).current;
  const isGesturing = useRef(false);
  const lastHapticValue = useRef(initialValue);
  const lastProcessedProp = useRef(initialValue);

  // Sync with props (e.g. +/- buttons)
  useEffect(() => {
    // Only update from props if:
    // 1. We're not gesturing
    // 2. The prop actually changed from what we last processed
    // 3. It's different from what we're displaying (prevents echo loop)
    if (!isGesturing.current &&
      initialValue !== lastProcessedProp.current &&
      initialValue !== displayValue) {
      setAnchorValue(initialValue);
      setDisplayValue(initialValue);
      lastHapticValue.current = initialValue;
      lastProcessedProp.current = initialValue;
    }
  }, [initialValue, displayValue]);

  const triggerValueChange = useCallback((newValue: number) => {
    if (newValue !== lastHapticValue.current) {
      lastHapticValue.current = newValue;
      setDisplayValue(newValue);
      onValueChange?.(newValue);
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync();
      }
    }
  }, [onValueChange]);

  const onGestureEvent = useCallback(Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const { translationX } = event.nativeEvent;
        // Calculate live value based on anchor + translation
        // moving right (+x) -> decreasing value
        const valueDelta = -translationX / ITEM_WIDTH;
        const rawValue = anchorValue + valueDelta;
        const newValue = Math.round(Math.max(min, Math.min(max, rawValue)));

        triggerValueChange(newValue);
      }
    }
  ), [min, max, anchorValue, triggerValueChange]);

  const onHandlerStateChange = useCallback((event: any) => {
    const { state, translationX } = event.nativeEvent;

    if (state === State.BEGAN) {
      isGesturing.current = true;
      // Stop any pending animation
      translateX.stopAnimation();
      translateX.setOffset(0); // Ensure we start fresh? 
      // Actually standard PanHandler logic:
      translateX.setOffset(0);
      translateX.setValue(0);
    }
    else if (state === State.END || state === State.CANCELLED) {
      // Calculate final target
      const valueDelta = -translationX / ITEM_WIDTH;
      const rawValue = anchorValue + valueDelta;

      // Clamp and round
      const finalValue = Math.round(Math.max(min, Math.min(max, rawValue)));

      // Calculate where we need to animate translateX to align with finalValue
      // finalValue = anchor + (-targetTx / ITEM_WIDTH)
      // targetTx = (anchor - finalValue) * ITEM_WIDTH
      const targetTx = (anchorValue - finalValue) * ITEM_WIDTH;

      Animated.spring(translateX, {
        toValue: targetTx,
        velocity: event.nativeEvent.velocityX, // Pass velocity for momentum feel
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start(() => {
        // On finish:
        // 1. Update anchor to the new center
        setAnchorValue(finalValue);
        // 2. Reset translateX to 0 (since anchor now includes the offset)
        translateX.setValue(0);
        // 3. Mark gesture as done
        isGesturing.current = false;

        // Ensure final value sync
        triggerValueChange(finalValue);
      });
    }
  }, [anchorValue, min, max, triggerValueChange]);

  const centerX = SCALE_WIDTH / 2;

  const ticks = useMemo(() => {
    const result = [];
    // Render window based on ANCHOR value
    const rangeInView = (SCALE_WIDTH / 2) / ITEM_WIDTH;
    const buffer = 15;
    const startTick = Math.max(min, Math.floor(anchorValue - rangeInView - buffer));
    const endTick = Math.min(max, Math.ceil(anchorValue + rangeInView + buffer));

    for (let v = startTick; v <= endTick; v++) {
      const diff = v - anchorValue;
      const position = centerX + (diff * ITEM_WIDTH);

      const isMajor = v % 10 === 0;
      const isMid = v % 5 === 0 && !isMajor;

      result.push(
        <View
          key={`tick-${v}`}
          style={[
            styles.tickContainer,
            { left: position }
          ]}
        >
          <View
            style={[
              styles.tick,
              isMajor ? styles.tickMajor :
                isMid ? styles.tickMid : styles.tickMinor
            ]}
          />
          {isMajor && (
            <Text style={styles.tickLabel}>{v}</Text>
          )}
        </View>
      );
    }
    return result;
  }, [min, max, anchorValue, centerX]);

  return (
    <GestureHandlerRootView style={[styles.container, containerStyle]}>
      <View style={styles.valueDisplay}>
        <Text style={styles.valueNumber}>{displayValue}</Text>
        <Text style={styles.unitLabel}>{unit}</Text>
      </View>

      <View style={styles.rulerWrapper}>
        <View style={styles.indicatorContainer} pointerEvents="none">
          <View style={styles.indicator} />
        </View>

        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          activeOffsetX={[-10, 10]}
          failOffsetY={[-20, 20]}
        >
          <Animated.View style={styles.gestureArea}>
            <Animated.View
              style={[
                styles.ticksContainer,
                { transform: [{ translateX }] }
              ]}
            >
              {ticks}
            </Animated.View>
          </Animated.View>
        </PanGestureHandler>

        <LinearGradient
          colors={['#030303', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.leftFade}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', '#030303']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.rightFade}
          pointerEvents="none"
        />
      </View>
    </GestureHandlerRootView>
  );
}, (prev, next) => {
  return prev.min === next.min && prev.max === next.max && prev.initialValue === next.initialValue && prev.unit === next.unit;
});

const styles = StyleSheet.create({
  container: {
    width: SCALE_WIDTH,
    alignItems: 'center',
  },
  valueDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 30,
  },
  valueNumber: {
    fontFamily: 'Barlow_800ExtraBold',
    fontSize: getResponsiveFontSize(64),
    color: '#FFFFFF',
    marginRight: 8,
  },
  unitLabel: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(20),
    color: theme.colors.primary,
  },
  rulerWrapper: {
    width: '100%',
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    justifyContent: 'center',
    position: 'relative',
  },
  gestureArea: {
    width: '100%',
    height: '100%',
  },
  ticksContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  tickContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 20,
    marginLeft: -10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tick: {
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
  },
  tickMajor: {
    height: TICK_HEIGHT_MAJOR,
    backgroundColor: theme.colors.primary,
    width: 3,
  },
  tickMid: {
    height: TICK_HEIGHT_MID,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  tickMinor: {
    height: TICK_HEIGHT_MINOR,
  },
  tickLabel: {
    position: 'absolute',
    bottom: 5, // Keep as per previous fix
    fontFamily: 'Barlow_600SemiBold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.5)',
    width: 40,
    textAlign: 'center',
    left: -19,
  },
  indicatorContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  indicator: {
    width: 4,
    height: 50,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  leftFade: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 60,
  },
  rightFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 60,
  },
});
