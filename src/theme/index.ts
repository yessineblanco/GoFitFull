// GoFit Theme Configuration
export const theme = {
  colors: {
    // Primary brand colors (from Figma)
    primary: '#84c441', // Vibrant lime green - main brand color
    primaryDark: '#6fa335', // Darker shade for hover/active states
    primaryLight: '#8dbb5a', // Lighter green - secondary brand color

    // Secondary colors
    secondary: '#3d8c52', // Matching primaryLight
    secondaryDark: '#266637',
    secondaryLight: '#5fb378',

    // Neutral colors (from Figma)
    black: '#030303', // Pure black from palette
    white: '#ffffff', // Pure white from palette

    // Accent colors - Unified Alert System
    accent: '#266637',
    success: '#266637',
    warning: '#f1c40f', // Golden-yellow, energy-focused
    error: '#ff4757', // Vibrant coral-red
    info: '#52c1b8', // Cyan-teal, in green family

    // Background colors - Updated to match lightColors
    background: '#FAFBFC',
    surface: '#F5F7F9',
    surfaceVariant: '#EEF1F4',

    // Text colors - Updated to match lightColors
    text: '#1A1D21',
    textSecondary: '#5A6570',
    textLight: '#8B95A1',

    // Border and divider - Updated to match lightColors
    border: '#D1D7DE',
    divider: '#E1E6EB',

    // Fitness specific (using brand colors)
    workout: '#266637',
    cardio: '#266637',
    strength: '#3d8c52',
    flexibility: '#266637',
    nutrition: '#3d8c52',
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 9999,
  },

  typography: {
    h1: {
      fontFamily: 'Barlow_700Bold',
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
    },
    h2: {
      fontFamily: 'Barlow_700Bold',
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
    },
    h3: {
      fontFamily: 'Barlow_600SemiBold',
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 32,
    },
    h4: {
      fontFamily: 'Barlow_600SemiBold',
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    body: {
      fontFamily: 'Barlow_400Regular',
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodyBold: {
      fontFamily: 'Barlow_600SemiBold',
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    caption: {
      fontFamily: 'Barlow_400Regular',
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    captionBold: {
      fontFamily: 'Barlow_600SemiBold',
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    small: {
      fontFamily: 'Barlow_400Regular',
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
  },

  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 8,
    },
  },
};

export type Theme = typeof theme;
