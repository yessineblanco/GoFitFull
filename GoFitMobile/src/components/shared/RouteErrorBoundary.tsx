import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { theme } from '@/theme';
import { getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { getThemedBackground, colors as themeColors } from '@/utils/themeUtils';

interface Props {
    children: ReactNode;
    /**
     * Fallback component to render on error
     */
    fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error boundary component to catch errors at route level
 * Prevents the entire app from crashing when a component throws an error
 */
export class RouteErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
        };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error,
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console in development
        if (__DEV__) {
            console.error('RouteErrorBoundary caught an error:', error, errorInfo);
        }

        // In production, you could log to an error reporting service here
        // Example: Sentry.captureException(error, { extra: errorInfo });
    }

    resetError = () => {
        this.setState({
            hasError: false,
            error: null,
        });
    };

    render() {
        if (this.state.hasError && this.state.error) {
            // If custom fallback provided, use it
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.resetError);
            }

            // Default error UI
            return (
                <View style={styles.container}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.iconContainer}>
                            <AlertTriangle
                                size={72}
                                color={theme.colors.error}
                                strokeWidth={1.5}
                            />
                        </View>

                        <Text style={styles.title}>Oops! Something broke</Text>
                        <Text style={styles.message}>
                            Don't worry, it's not your fault. The app encountered an unexpected error.
                        </Text>

                        {__DEV__ && (
                            <View style={styles.errorDetailsContainer}>
                                <Text style={styles.errorDetailsTitle}>Error Details (Dev Mode):</Text>
                                <Text style={styles.errorDetailsText}>
                                    {this.state.error.message}
                                </Text>
                                {this.state.error.stack && (
                                    <Text style={styles.errorStack} numberOfLines={10}>
                                        {this.state.error.stack}
                                    </Text>
                                )}
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={this.resetError}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Try again"
                            accessibilityHint="Attempts to recover from the error"
                        >
                            <Text style={styles.retryButtonText}>Try Again</Text>
                        </TouchableOpacity>

                        <Text style={styles.helpText}>
                            If this keeps happening, try restarting the app.
                        </Text>
                    </ScrollView>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: getThemedBackground('primary'),
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: getResponsiveSpacing(32),
        paddingVertical: getResponsiveSpacing(48),
    },
    iconContainer: {
        marginBottom: getResponsiveSpacing(24),
        opacity: 0.9,
    },
    title: {
        fontSize: getResponsiveFontSize(24),
        fontWeight: '600',
        color: themeColors.text.primary,
        fontFamily: 'Barlow_600SemiBold',
        textAlign: 'center',
        marginBottom: getResponsiveSpacing(12),
    },
    message: {
        fontSize: getResponsiveFontSize(16),
        color: themeColors.text.secondary,
        fontFamily: 'Barlow_400Regular',
        textAlign: 'center',
        lineHeight: getResponsiveFontSize(24),
        marginBottom: getResponsiveSpacing(32),
    },
    errorDetailsContainer: {
        backgroundColor: themeColors.background.surface,
        padding: getResponsiveSpacing(16),
        borderRadius: getResponsiveSpacing(12),
        marginBottom: getResponsiveSpacing(24),
        width: '100%',
        borderWidth: 1,
        borderColor: theme.colors.error,
    },
    errorDetailsTitle: {
        fontSize: getResponsiveFontSize(14),
        fontWeight: '600',
        color: theme.colors.error,
        fontFamily: 'Barlow_600SemiBold',
        marginBottom: getResponsiveSpacing(8),
    },
    errorDetailsText: {
        fontSize: getResponsiveFontSize(13),
        color: themeColors.text.primary,
        fontFamily: 'Barlow_400Regular',
        marginBottom: getResponsiveSpacing(8),
    },
    errorStack: {
        fontSize: getResponsiveFontSize(11),
        color: themeColors.text.tertiary,
        fontFamily: 'Barlow_400Regular',
        lineHeight: getResponsiveFontSize(16),
    },
    retryButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: getResponsiveSpacing(40),
        paddingVertical: getResponsiveSpacing(16),
        borderRadius: getResponsiveSpacing(12),
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        marginBottom: getResponsiveSpacing(16),
    },
    retryButtonText: {
        fontSize: getResponsiveFontSize(16),
        fontWeight: '600',
        color: '#030303',
        fontFamily: 'Barlow_600SemiBold',
    },
    helpText: {
        fontSize: getResponsiveFontSize(13),
        color: themeColors.text.tertiary,
        fontFamily: 'Barlow_400Regular',
        textAlign: 'center',
    },
});
