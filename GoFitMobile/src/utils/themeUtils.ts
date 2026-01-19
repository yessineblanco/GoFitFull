import { theme } from '@/theme';

/**
 * Theme utilities for consistent color usage across the app
 * This replaces hardcoded color values with theme-based colors
 */

export const colors = {
    // Background colors
    background: {
        primary: '#030303', // Main dark background
        secondary: '#1a1a1a', // Slightly lighter dark background
        surface: '#141414', // Surface/card background
        elevated: '#202020', // Elevated elements
    },

    // Brand colors from theme
    brand: {
        primary: theme.colors.primary, // #84c441
        primaryDark: theme.colors.primaryDark,
        primaryLight: theme.colors.primaryLight,
    },

    // Text colors - Updated for WCAG AA compliance (4.5:1 contrast ratio)
    text: {
        primary: '#FFFFFF',
        secondary: 'rgba(255, 255, 255, 0.85)', // Increased from 0.7 for better contrast
        tertiary: 'rgba(255, 255, 255, 0.65)',  // Increased from 0.5 for better readability
        disabled: 'rgba(255, 255, 255, 0.4)',   // Increased from 0.3
    },

    // Semantic colors
    semantic: {
        success: theme.colors.success,
        error: theme.colors.error,
        warning: theme.colors.warning,
        info: theme.colors.info,
    },

    // Border & divider colors
    border: {
        default: 'rgba(255, 255, 255, 0.1)',
        subtle: 'rgba(255, 255, 255, 0.05)',
        emphasis: 'rgba(255, 255, 255, 0.2)',
        primary: `rgba(132, 196, 65, 0.4)`, // Primary color with opacity
    },
} as const;

/**
 * Get themed background color based on context
 */
export const getThemedBackground = (variant: 'primary' | 'secondary' | 'surface' | 'elevated' = 'primary') => {
    return colors.background[variant];
};

/**
 * Get themed text color based on emphasis
 */
export const getThemedText = (emphasis: 'primary' | 'secondary' | 'tertiary' | 'disabled' = 'primary') => {
    return colors.text[emphasis];
};

/**
 * Get primary brand color with optional opacity
 */
export const getPrimaryColor = (opacity: number = 1) => {
    if (opacity === 1) return colors.brand.primary;
    const r = 132, g = 196, b = 65;
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Get white color with opacity
 */
export const getWhiteWithOpacity = (opacity: number) => {
    return `rgba(255, 255, 255, ${opacity})`;
};

/**
 * Get black color with opacity
 */
export const getBlackWithOpacity = (opacity: number) => {
    return `rgba(3, 3, 3, ${opacity})`;
};
