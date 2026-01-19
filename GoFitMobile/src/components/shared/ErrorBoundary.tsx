import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { logger } from '@/utils/logger';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { theme } from '@/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component to catch React errors and prevent app crashes
 * Displays a user-friendly error screen instead of crashing the entire app
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging
    logger.error('ErrorBoundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Store error info for display
    this.setState({ errorInfo });

    // TODO: In production, send to crash reporting service
    // Sentry.captureException(error, { 
    //   contexts: { react: errorInfo } 
    // });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>😕</Text>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>
            
            {__DEV__ && this.state.errorInfo && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Info (Dev Only):</Text>
                <Text style={styles.debugText}>
                  {this.state.error?.stack}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReset}
              accessibilityLabel="Try again button"
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030303',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSpacing(theme.spacing.lg),
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  emoji: {
    fontSize: getResponsiveFontSize(64),
    marginBottom: getResponsiveSpacing(theme.spacing.md),
  },
  title: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(24),
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: getResponsiveSpacing(theme.spacing.sm),
  },
  message: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(16),
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: getResponsiveSpacing(theme.spacing.xl),
    lineHeight: getResponsiveFontSize(24),
  },
  debugContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    padding: getResponsiveSpacing(theme.spacing.md),
    borderRadius: 8,
    marginBottom: getResponsiveSpacing(theme.spacing.lg),
    width: '100%',
    maxHeight: 200,
  },
  debugTitle: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(14),
    color: '#FF3B30',
    marginBottom: getResponsiveSpacing(theme.spacing.xs),
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: getResponsiveFontSize(10),
    color: 'rgba(255, 255, 255, 0.6)',
  },
  button: {
    backgroundColor: theme.colors.primary || '#8DBB5A',
    paddingHorizontal: getResponsiveSpacing(theme.spacing.xl),
    paddingVertical: getResponsiveSpacing(theme.spacing.md),
    borderRadius: 24,
    minWidth: 150,
  },
  buttonText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600' as const,
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

