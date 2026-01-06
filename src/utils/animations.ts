import { Easing } from 'react-native';

/**
 * Animation utilities optimized for 120Hz displays
 * These easing functions and configurations ensure smooth animations
 * on high refresh rate devices (iPhone 13 Pro+, iPad Pro, high-end Android)
 */

// Custom easing functions optimized for 120Hz
export const Easing120Hz = {
  // Smooth ease-in-out for 120Hz
  easeInOut: Easing.bezier(0.42, 0, 0.58, 1),
  
  // Fast ease-out for snappy animations
  easeOut: Easing.bezier(0.0, 0, 0.2, 1),
  
  // Smooth ease-in for gentle starts
  easeIn: Easing.bezier(0.4, 0, 1, 1),
  
  // Custom spring-like easing for natural motion
  spring: Easing.bezier(0.175, 0.885, 0.32, 1.275),
  
  // Bounce effect (subtle)
  bounce: Easing.bezier(0.68, -0.55, 0.265, 1.55),
};

// Animation timing presets optimized for 120Hz
export const AnimationTiming = {
  // Fast animations (120Hz makes these feel instant)
  fast: {
    duration: 200,
    easing: Easing120Hz.easeOut,
  },
  
  // Standard animations
  standard: {
    duration: 300,
    easing: Easing120Hz.easeInOut,
  },
  
  // Smooth transitions
  smooth: {
    duration: 400,
    easing: Easing120Hz.easeInOut,
  },
  
  // Slow, deliberate animations
  slow: {
    duration: 600,
    easing: Easing120Hz.easeInOut,
  },
  
  // Very slow (for background effects)
  verySlow: {
    duration: 1000,
    easing: Easing120Hz.easeInOut,
  },
};

// Helper to create optimized animation config
export const createAnimationConfig = (
  duration: number = 300,
  easing: typeof Easing120Hz.easeInOut = Easing120Hz.easeInOut
) => ({
  duration,
  easing,
  useNativeDriver: true, // Always use native driver for 120Hz support
});

// Helper for spring-like animations (works great on 120Hz)
export const createSpringConfig = () => ({
  tension: 50,
  friction: 7,
  useNativeDriver: true,
});

// Helper for fade animations
export const createFadeConfig = (duration: number = 300) => ({
  toValue: 1,
  duration,
  easing: Easing120Hz.easeInOut,
  useNativeDriver: true,
});

// Helper for slide animations
export const createSlideConfig = (
  toValue: number,
  duration: number = 300
) => ({
  toValue,
  duration,
  easing: Easing120Hz.easeOut,
  useNativeDriver: true,
});

// Helper for scale animations
export const createScaleConfig = (
  toValue: number,
  duration: number = 300
) => ({
  toValue,
  duration,
  easing: Easing120Hz.spring,
  useNativeDriver: true,
});



