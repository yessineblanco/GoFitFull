import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { theme } from '@/theme';
import { getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { useThemeStore } from '@/store/themeStore';
import { getBackgroundColor, getTextColor, getTextSecondaryColor, getTextLightColor, getSurfaceColor } from '@/utils/colorUtils';

interface Props {
    children: ReactNode;
    fallback?: (error: Error, resetError: () => void) => ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

const ErrorUI: React.FC<{ error: Error; onReset: () => void }> = ({ error, onReset }) => {
    const { isDark } = useThemeStore();

    return (
        <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.iconContainer}>
                    <AlertTriangle size={72} color={theme.colors.error} strokeWidth={1.5} />
                </View>

                <Text style={[styles.title, { color: getTextColor(isDark) }]}>Oops! Something broke</Text>
                <Text style={[styles.message, { color: getTextSecondaryColor(isDark) }]}>
                    Don't worry, it's not your fault. The app encountered an unexpected error.
                </Text>

                {__DEV__ && (
                    <View style={[styles.errorDetailsContainer, { backgroundColor: getSurfaceColor(isDark) }]}>
                        <Text style={styles.errorDetailsTitle}>Error Details (Dev Mode):</Text>
                        <Text style={[styles.errorDetailsText, { color: getTextColor(isDark) }]}>
                            {error.message}
                        </Text>
                        {error.stack && (
                            <Text style={[styles.errorStack, { color: getTextLightColor(isDark) }]} numberOfLines={10}>
                                {error.stack}
                            </Text>
                        )}
                    </View>
                )}

                <TouchableOpacity
                    style={styles.retryButton}
                    onPress={onReset}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Try again"
                    accessibilityHint="Attempts to recover from the error"
                >
                    <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>

                <Text style={[styles.helpText, { color: getTextLightColor(isDark) }]}>
                    If this keeps happening, try restarting the app.
                </Text>
            </ScrollView>
        </View>
    );
};

export class RouteErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        if (__DEV__) {
            console.error('RouteErrorBoundary caught an error:', error, errorInfo);
        }
    }

    resetError = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError && this.state.error) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error, this.resetError);
            }
            return <ErrorUI error={this.state.error} onReset={this.resetError} />;
        }
        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        fontFamily: 'Barlow_600SemiBold',
        textAlign: 'center',
        marginBottom: getResponsiveSpacing(12),
    },
    message: {
        fontSize: getResponsiveFontSize(16),
        fontFamily: 'Barlow_400Regular',
        textAlign: 'center',
        lineHeight: getResponsiveFontSize(24),
        marginBottom: getResponsiveSpacing(32),
    },
    errorDetailsContainer: {
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
        fontFamily: 'Barlow_400Regular',
        marginBottom: getResponsiveSpacing(8),
    },
    errorStack: {
        fontSize: getResponsiveFontSize(11),
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
        fontFamily: 'Barlow_400Regular',
        textAlign: 'center',
    },
});
