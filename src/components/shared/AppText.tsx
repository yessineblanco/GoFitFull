import React from 'react';
import { Text, TextProps, TextStyle, StyleSheet } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { useTextSizeStore } from '@/store/textSizeStore';
import { theme } from '@/theme';
import { getTextColor } from '@/utils/colorUtils';

export type TypographyVariant = keyof typeof theme.typography;

interface AppTextProps extends TextProps {
    variant?: TypographyVariant;
    color?: string;
    autoContrast?: boolean; // If true, sets color based on theme (white/black)
    children: React.ReactNode;
}

export const AppText: React.FC<AppTextProps> = ({
    variant = 'body',
    color,
    autoContrast = true,
    style,
    children,
    ...props
}) => {
    const { isDark } = useThemeStore();
    const { getScaleFactor } = useTextSizeStore(); // Triggers re-render on size change
    const scale = getScaleFactor();

    const themeStyle = theme.typography[variant];

    // Calculate scaled font size
    const fontSize = Math.round(themeStyle.fontSize * scale);
    const lineHeight = Math.round(themeStyle.lineHeight * scale);

    const defaultColor = autoContrast ? getTextColor(isDark) : undefined;

    const baseStyle: TextStyle = {
        fontFamily: themeStyle.fontFamily,
        fontSize,
        lineHeight,
        fontWeight: themeStyle.fontWeight,
        color: color || defaultColor,
    };

    return (
        <Text style={[baseStyle, style]} {...props}>
            {children}
        </Text>
    );
};
