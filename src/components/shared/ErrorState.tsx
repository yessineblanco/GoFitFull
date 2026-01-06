import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { theme } from '@/theme';
import { getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { getThemedBackground, colors as themeColors } from '@/utils/themeUtils';

interface ErrorStateProps {
    /**
     * Error title - brief description of what went wrong
     */
    title?: string;

    /**
     * Error message - more detailed explanation
     */
    message?: string;

    /**
     * Retry callback - function to call when user taps retry
     */
    onRetry?: () => void;

    /**
     * Retry button text
     */
    retryText?: string;

    /**
     * Show icon
     */
    showIcon?: boolean;
}

/**
 * Reusable error state component for displaying errors with retry option
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
    title = 'Something went wrong',
    message = 'An unexpected error occurred. Please try again.',
    onRetry,
    retryText = 'Try Again',
    showIcon = true,
}) => {
    return (
        <View style={styles.container}>
            {showIcon && (
                <View style={styles.iconContainer}>
                    <AlertCircle
                        size={64}
                        color={theme.colors.error}
                        strokeWidth={1.5}
                    />
                </View>
            )}

            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>

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
        backgroundColor: getThemedBackground('primary'),
    },
    iconContainer: {
        marginBottom: getResponsiveSpacing(24),
        opacity: 0.8,
    },
    title: {
        fontSize: getResponsiveFontSize(20),
        fontWeight: '600',
        color: themeColors.text.primary,
        fontFamily: 'Barlow_600SemiBold',
        textAlign: 'center',
        marginBottom: getResponsiveSpacing(12),
    },
    message: {
        fontSize: getResponsiveFontSize(15),
        color: themeColors.text.secondary,
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
