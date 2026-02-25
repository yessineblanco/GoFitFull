/**
 * Color Utility Functions
 * 
 * Helper functions for working with brand colors, especially for creating
 * rgba variations and opacity-based color modifications.
 */

import { theme } from '@/theme';
import { lightColors, darkColors } from '@/theme/colors';

/**
 * Convert a hex color to rgba with custom opacity
 * 
 * @param hex - Hex color string (e.g., '#84c441' or '84c441')
 * @param opacity - Opacity value between 0 and 1
 * @returns rgba color string (e.g., 'rgba(132, 196, 65, 0.5)')
 * 
 * @example
 * ```typescript
 * const primaryWithOpacity = hexToRgba(theme.colors.primary, 0.5);
 * // Returns: 'rgba(132, 196, 65, 0.5)'
 * ```
 */
export const hexToRgba = (hex: string, opacity: number): string => {
  // Remove # if present
  const cleanHex = hex.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Get brand primary color with opacity
 * 
 * @param opacity - Opacity value between 0 and 1
 * @returns rgba color string for primary brand color
 * 
 * @example
 * ```typescript
 * const lightPrimary = getPrimaryWithOpacity(0.1);
 * // Returns: 'rgba(132, 196, 65, 0.1)'
 * ```
 */
export const getPrimaryWithOpacity = (opacity: number): string => {
  return hexToRgba(theme.colors.primary, opacity);
};

/**
 * Get brand secondary color with opacity
 * 
 * @param opacity - Opacity value between 0 and 1
 * @returns rgba color string for secondary brand color
 * 
 * @example
 * ```typescript
 * const lightSecondary = getSecondaryWithOpacity(0.2);
 * // Returns: 'rgba(141, 187, 90, 0.2)'
 * ```
 */
export const getSecondaryWithOpacity = (opacity: number): string => {
  return hexToRgba(theme.colors.secondary, opacity);
};

/**
 * Get brand black color with opacity
 * 
 * @param opacity - Opacity value between 0 and 1
 * @returns rgba color string for black brand color
 * 
 * @example
 * ```typescript
 * const semiBlack = getBlackWithOpacity(0.5);
 * // Returns: 'rgba(3, 3, 3, 0.5)'
 * ```
 */
export const getBlackWithOpacity = (opacity: number): string => {
  return hexToRgba(theme.colors.black, opacity);
};

/**
 * Get brand white color with opacity
 * 
 * @param opacity - Opacity value between 0 and 1
 * @returns rgba color string for white brand color
 * 
 * @example
 * ```typescript
 * const semiWhite = getWhiteWithOpacity(0.8);
 * // Returns: 'rgba(255, 255, 255, 0.8)'
 * ```
 */
export const getWhiteWithOpacity = (opacity: number): string => {
  return hexToRgba(theme.colors.white, opacity);
};

/**
 * Get theme-aware background color (black in dark mode, warm white in light mode)
 * 
 * @param isDark - Whether dark mode is active
 * @returns Hex color string for background
 */
export const getBackgroundColor = (isDark: boolean): string => {
  return isDark ? darkColors.background : lightColors.background;
};

/**
 * Get theme-aware text color (white in dark mode, dark in light mode)
 * 
 * @param isDark - Whether dark mode is active
 * @returns Hex color string for text
 */
export const getTextColor = (isDark: boolean): string => {
  return isDark ? darkColors.text : lightColors.text;
};

/**
 * Get theme-aware surface color (for cards, containers)
 * 
 * @param isDark - Whether dark mode is active
 * @returns Hex color string for surface
 */
export const getSurfaceColor = (isDark: boolean): string => {
  return isDark ? darkColors.surface : lightColors.surface;
};

/**
 * Get theme-aware surface variant color (for elevated surfaces)
 * 
 * @param isDark - Whether dark mode is active
 * @returns Hex color string for surface variant
 */
export const getSurfaceVariantColor = (isDark: boolean): string => {
  return isDark ? darkColors.surfaceVariant : lightColors.surfaceVariant;
};

/**
 * Get theme-aware border color
 * 
 * @param isDark - Whether dark mode is active
 * @returns Hex color string for border
 */
export const getBorderColor = (isDark: boolean): string => {
  return isDark ? darkColors.border : lightColors.border;
};

/**
 * Get theme-aware text secondary color
 * 
 * @param isDark - Whether dark mode is active
 * @returns Hex color string for secondary text
 */
export const getTextSecondaryColor = (isDark: boolean): string => {
  return isDark ? darkColors.textSecondary : lightColors.textSecondary;
};

/**
 * Get theme-aware text color with opacity
 * 
 * @param isDark - Whether dark mode is active
 * @param opacity - Opacity value between 0 and 1
 * @returns rgba color string for text
 */
export const getTextColorWithOpacity = (isDark: boolean, opacity: number): string => {
  const color = getTextColor(isDark);
  return hexToRgba(color, opacity);
};

/**
 * Get theme-aware shadow style
 * 
 * @param isDark - Whether dark mode is active
 * @param size - Shadow size: 'small' | 'medium' | 'large'
 * @returns Shadow style object
 */
export const getShadow = (isDark: boolean, size: 'small' | 'medium' | 'large' = 'medium') => {
  const base = theme.shadows[size];
  if (isDark) {
    return base;
  }
  return {
    ...base,
    shadowOpacity: base.shadowOpacity * 1.8,
    shadowRadius: base.shadowRadius * 1.2,
    elevation: base.elevation + 1,
  };
};

/**
 * Glass surface background -- frosted glass card effect
 * Dark: subtle white tint on dark | Light: frosted white with stronger opacity
 */
export const getGlassBg = (isDark: boolean): string => {
  return isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.7)';
};

/**
 * Glass border color for frosted surfaces
 */
export const getGlassBorder = (isDark: boolean): string => {
  return isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)';
};

/**
 * Theme-aware overlay: white-on-dark / black-on-light with custom opacity
 */
export const getOverlayColor = (isDark: boolean, opacity: number): string => {
  return isDark
    ? `rgba(255, 255, 255, ${opacity})`
    : `rgba(0, 0, 0, ${opacity})`;
};

/**
 * BlurView tint value based on theme
 */
export const getBlurTint = (isDark: boolean): 'dark' | 'light' => {
  return isDark ? 'dark' : 'light';
};

/**
 * Get theme-aware text light/tertiary color
 */
export const getTextLightColor = (isDark: boolean): string => {
  return isDark ? darkColors.textLight : lightColors.textLight;
};

