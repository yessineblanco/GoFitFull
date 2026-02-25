import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { theme } from '@/theme';
import { getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { getBackgroundColor, getTextColor, getTextSecondaryColor } from '@/utils/colorUtils';
import { useThemeStore } from '@/store/themeStore';

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
    retryText?: string;
    showIcon?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
    title = 'Something went wrong',
    message = 'An unexpected error occurred. Please try again.',
    onRetry,
    retryText = 'Try Again',
    showIcon = true,
}) => {
    const { isDark } = useThemeStore();

    return (
        <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
            {showIcon && (
                <View style={styles.iconContainer}>
                    <AlertCircle
                        size={64}
                        color={theme.colors.error}
                        strokeWidth={1.5}
                    />
                </View>
            )}

            <Text style={[styles.title, { color: getTextColor(isDark) }]}>{title}</Text>
            <Text style={[styles.message, { color: getTextSecondaryColor(isDark) }]}>{message}</Text>

            {onRetry && (
                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={onRetry}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={retryText}
                    accessibilityHint="Retry the failed operation"
                >
                    <Text style={styles.retryButtonText}>{retryText}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: getResponsiveSpacing(32),
    },
    iconContainer: {
        marginBottom: getResponsiveSpacing(24),
        opacity: 0.8,
    },
    title: {
        fontSize: getResponsiveFontSize(20),
        fontWeight: '600',
        fontFamily: 'Barlow_600SemiBold',
        textAlign: 'center',
        marginBottom: getResponsiveSpacing(12),
    },
    message: {
        fontSize: getResponsiveFontSize(15),
        fontFamily: 'Barlow_400Regular',
        textAlign: 'center',
        lineHeight: getResponsiveFontSize(22),
        marginBottom: getResponsiveSpacing(32),
    },
    retryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: getResponsiveSpacing(32),
        paddingVertical: getResponsiveSpacing(14),
        borderRadius: getResponsiveSpacing(12),
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    retryButtonText: {
        fontSize: getResponsiveFontSize(16),
        fontWeight: '600',
        color: '#030303',
        fontFamily: 'Barlow_600SemiBold',
    },
});
