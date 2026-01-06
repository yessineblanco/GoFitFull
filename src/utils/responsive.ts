import { Dimensions, Platform, PixelRatio } from 'react-native';

// Get screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Design dimensions (based on iPhone 14 Pro - 390x844)
const DESIGN_WIDTH = 390;
const DESIGN_HEIGHT = 844;

// Breakpoints for responsive design
export const BREAKPOINTS = {
  small: 375,   // iPhone SE, small Android phones
  medium: 414,  // iPhone 14 Pro Max, larger Android phones
  large: 768,   // Tablets (iPad mini)
  xlarge: 1024, // Large tablets (iPad Pro)
};

// Device type detection
export const getDeviceType = () => {
  const width = SCREEN_WIDTH;
  if (width < BREAKPOINTS.small) return 'small';
  if (width < BREAKPOINTS.medium) return 'medium';
  if (width < BREAKPOINTS.large) return 'tablet';
  return 'largeTablet';
};

// Check if device is tablet
export const isTablet = () => {
  const width = SCREEN_WIDTH;
  const height = SCREEN_HEIGHT;
  const aspectRatio = height / width;
  return (
    (Platform.OS === 'ios' && width >= BREAKPOINTS.large) ||
    (Platform.OS === 'android' && (width >= BREAKPOINTS.large || aspectRatio < 1.6))
  );
};

// Check if device is small screen
export const isSmallScreen = () => SCREEN_WIDTH < BREAKPOINTS.small;

// Check if device is large screen
export const isLargeScreen = () => SCREEN_WIDTH >= BREAKPOINTS.medium;

/**
 * Scale a width value responsively based on screen width
 * 
 * Scales a width value proportionally to the current screen width,
 * using the design width (390px) as the baseline.
 * 
 * @param size - Width value in design units (based on 390px width)
 * @returns Scaled width value for current screen
 * 
 * @example
 * ```typescript
 * const buttonWidth = scaleWidth(200); // Scales 200px for current screen
 * ```
 */
export const scaleWidth = (size: number): number => {
  const scale = SCREEN_WIDTH / DESIGN_WIDTH;
  return size * scale;
};

/**
 * Scale a height value responsively based on screen height
 * 
 * Scales a height value proportionally to the current screen height,
 * using the design height (844px) as the baseline.
 * 
 * @param size - Height value in design units (based on 844px height)
 * @returns Scaled height value for current screen
 * 
 * @example
 * ```typescript
 * const cardHeight = scaleHeight(300); // Scales 300px for current screen
 * ```
 */
export const scaleHeight = (size: number): number => {
  const scale = SCREEN_HEIGHT / DESIGN_HEIGHT;
  return size * scale;
};

/**
 * Scale a font size responsively with min/max limits
 * 
 * Scales font size based on screen width with limits to prevent
 * extremely large or small text. Fonts scale between 80% and 120% of original size.
 * 
 * @param size - Base font size in pixels
 * @param factor - Scaling factor (default: 0.5, lower = less scaling)
 * @returns Scaled font size (between 80% and 120% of original)
 * 
 * @example
 * ```typescript
 * const fontSize = scaleFont(16); // Scales 16px for current screen
 * const titleSize = scaleFont(24, 0.3); // Less aggressive scaling
 * ```
 */
export const scaleFont = (size: number, factor: number = 0.5): number => {
  const scale = SCREEN_WIDTH / DESIGN_WIDTH;
  const newSize = size + (scale - 1) * factor;
  const maxSize = size * 1.2; // Max 20% larger
  const minSize = size * 0.8; // Min 20% smaller
  return Math.max(minSize, Math.min(maxSize, newSize));
};

// Responsive size (scales based on screen width)
export const scaleSize = (size: number): number => {
  return scaleWidth(size);
};

// Get responsive spacing
/**
 * Get responsive spacing value
 * 
 * Scales spacing values (padding, margin) based on screen width.
 * Ensures consistent spacing across different screen sizes.
 * 
 * @param baseSpacing - Base spacing value in pixels
 * @returns Scaled spacing value for current screen
 * 
 * @example
 * ```typescript
 * const padding = getResponsiveSpacing(16); // Scales 16px spacing
 * ```
 */
export const getResponsiveSpacing = (baseSpacing: number): number => {
  if (isSmallScreen()) {
    return baseSpacing * 0.9; // 10% smaller on small screens
  }
  if (isTablet()) {
    return baseSpacing * 1.2; // 20% larger on tablets
  }
  return baseSpacing;
};

// Get responsive font size
/**
 * Get responsive font size
 * 
 * Scales font sizes based on screen width with automatic min/max limits.
 * This is a convenience wrapper around `scaleFont`.
 * 
 * @param baseSize - Base font size in pixels
 * @returns Scaled font size for current screen (between 80% and 120% of original)
 * 
 * @example
 * ```typescript
 * const titleSize = getResponsiveFontSize(24);
 * const bodySize = getResponsiveFontSize(16);
 * ```
 */
export const getResponsiveFontSize = (baseSize: number): number => {
  if (isSmallScreen()) {
    return baseSize * 0.9; // 10% smaller on small screens
  }
  if (isTablet()) {
    return baseSize * 1.15; // 15% larger on tablets
  }
  return baseSize;
};

// Platform-specific adjustments
export const getPlatformValue = <T>(ios: T, android: T): T => {
  return Platform.OS === 'ios' ? ios : android;
};

// Get safe area insets (for use with useSafeAreaInsets hook)
export const getSafeAreaPadding = (insets: { top: number; bottom: number; left: number; right: number }) => {
  return {
    paddingTop: insets.top,
    paddingBottom: insets.bottom,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };
};

// Minimum touch target size (44x44 for iOS, 48x48 for Android)
export const MIN_TOUCH_TARGET = Platform.OS === 'ios' ? 44 : 48;

// Ensure touch target meets minimum size
/**
 * Ensure a size meets minimum touch target requirements
 * 
 * Ensures interactive elements meet accessibility guidelines for minimum
 * touch target size (44px on iOS, 48px on Android).
 * 
 * @param size - The size to check/enforce
 * @returns Size that meets minimum touch target (original or minimum, whichever is larger)
 * 
 * @example
 * ```typescript
 * const buttonSize = ensureMinTouchTarget(30); // Returns 44 (iOS) or 48 (Android)
 * const largeButton = ensureMinTouchTarget(60); // Returns 60 (already meets requirement)
 * ```
 */
export const ensureMinTouchTarget = (size: number): number => {
  return Math.max(size, MIN_TOUCH_TARGET);
};

// Get pixel ratio for high DPI screens
export const getPixelRatio = (): number => {
  return PixelRatio.get();
};

// Check if device has notch (simplified check)
export const hasNotch = (): boolean => {
  // This is a simplified check - in production, use react-native-device-info or similar
  return Platform.OS === 'ios' && (SCREEN_HEIGHT / SCREEN_WIDTH > 2);
};

// Export current dimensions
export const screenData = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
  scale: SCREEN_WIDTH / DESIGN_WIDTH,
  isTablet: isTablet(),
  isSmallScreen: isSmallScreen(),
  isLargeScreen: isLargeScreen(),
  deviceType: getDeviceType(),
  pixelRatio: getPixelRatio(),
  hasNotch: hasNotch(),
};



