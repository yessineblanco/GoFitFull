# 120Hz Display Support

## Overview
The GoFit app is fully optimized for 120Hz ProMotion displays (iPhone 13 Pro+, iPad Pro) and high refresh rate Android devices. All animations use native drivers and optimized easing functions to ensure buttery-smooth 120fps performance.

## Implementation

### ✅ Native Driver Usage
All animations use `useNativeDriver: true`, which is essential for 120Hz support:
- Animations run on the native thread
- No JavaScript bridge overhead
- Smooth 120fps performance
- Lower CPU usage

### ✅ Optimized Easing Functions
Custom easing functions in `src/utils/animations.ts` optimized for high refresh rates:
- `Easing120Hz.easeInOut` - Smooth transitions
- `Easing120Hz.easeOut` - Snappy animations
- `Easing120Hz.easeIn` - Gentle starts
- `Easing120Hz.spring` - Natural spring-like motion
- `Easing120Hz.bounce` - Subtle bounce effects

### ✅ Components Optimized

1. **AnimatedBackground** (`src/components/AnimatedBackground.tsx`)
   - Ellipse animations use optimized easing
   - Continuous loops run smoothly at 120Hz
   - Pulse and drift animations are fluid

2. **WelcomeScreen** (`src/screens/auth/WelcomeScreen.tsx`)
   - Title fade-in uses `Easing120Hz.easeOut`
   - Button animations use optimized easing
   - Background fade uses `Easing120Hz.easeInOut`

3. **SplashScreen** (`src/components/SplashScreen.tsx`)
   - Logo scale animation uses `Easing120Hz.spring`
   - Fade transitions use optimized easing
   - All animations run at 120fps

4. **Navigation Transitions** (`App.tsx`, `AuthNavigator.tsx`)
   - Screen transitions use `Easing120Hz.easeOut`/`easeIn`
   - 250-300ms duration optimized for 120Hz
   - Smooth slide and fade effects

## Supported Devices

### iOS
- ✅ iPhone 13 Pro / Pro Max
- ✅ iPhone 14 Pro / Pro Max
- ✅ iPhone 15 Pro / Pro Max
- ✅ iPhone 16 Pro / Pro Max
- ✅ iPad Pro (all models with ProMotion)

### Android
- ✅ Samsung Galaxy S21+ / S21 Ultra and later
- ✅ Google Pixel 6 Pro and later
- ✅ OnePlus 9 Pro and later
- ✅ Any device with 120Hz display

## Performance Benefits

1. **Smoother Animations**: 120fps vs 60fps provides noticeably smoother motion
2. **Lower Latency**: Native driver reduces input lag
3. **Better Battery**: Native animations are more efficient
4. **Premium Feel**: High refresh rate makes the app feel more responsive

## Technical Details

### Native Driver Requirements
- ✅ All `Animated.timing()` use `useNativeDriver: true`
- ✅ All `Animated.sequence()` use native driver
- ✅ All `Animated.parallel()` use native driver
- ✅ All `Animated.loop()` use native driver

### Easing Function Selection
- **Fade animations**: `Easing120Hz.easeInOut` for smooth transitions
- **Slide animations**: `Easing120Hz.easeOut` for snappy feel
- **Scale animations**: `Easing120Hz.spring` for natural motion
- **Background effects**: `Easing120Hz.easeInOut` for subtle movement

### Animation Durations
- Fast interactions: 200-300ms
- Standard transitions: 300-400ms
- Smooth animations: 400-600ms
- Background effects: 1000ms+

## Testing

To verify 120Hz support:
1. Enable "Show FPS" in React Native DevTools
2. Check that animations run at 120fps on supported devices
3. Verify smoothness on iPhone 13 Pro+ or iPad Pro
4. Test on high refresh rate Android devices

## Notes

- Animations automatically adapt to device refresh rate
- On 60Hz devices, animations still run smoothly
- No performance penalty on lower refresh rate devices
- All optimizations are backward compatible



