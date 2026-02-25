import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Inbox, Package, Search, Calendar, Dumbbell } from 'lucide-react-native';
import { theme } from '@/theme';
import { getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { getTextColor, getTextSecondaryColor } from '@/utils/colorUtils';
import { useThemeStore } from '@/store/themeStore';

export type EmptyStateType = 'workouts' | 'exercises' | 'sessions' | 'plans' | 'search' | 'generic';

interface EmptyStateProps {
    type?: EmptyStateType;
    title?: string;
    message?: string;
    onAction?: () => void;
    actionText?: string;
    showIcon?: boolean;
    icon?: React.ReactNode;
}

const getDefaultContent = (type: EmptyStateType, isDark: boolean): { title: string; message: string; icon: React.ReactNode } => {
    const iconColor = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
    
    switch (type) {
        case 'workouts':
            return {
                title: 'No Workouts Yet',
                message: 'Start building your fitness journey by creating your first workout plan.',
                icon: <Dumbbell size={48} color={iconColor} strokeWidth={1.5} />,
            };
        case 'exercises':
            return {
                title: 'No Exercises Found',
                message: 'Try adjusting your search or filters to find what you\'re looking for.',
                icon: <Search size={48} color={iconColor} strokeWidth={1.5} />,
            };
        case 'sessions':
            return {
                title: 'No Workout Sessions',
                message: 'Complete your first workout to start tracking your progress.',
                icon: <Calendar size={48} color={iconColor} strokeWidth={1.5} />,
            };
        case 'plans':
            return {
                title: 'No Plans Scheduled',
                message: 'Create a workout plan to stay organized and reach your goals.',
                icon: <Package size={48} color={iconColor} strokeWidth={1.5} />,
            };
        case 'search':
            return {
                title: 'No Results Found',
                message: 'Try different keywords or check your filters.',
                icon: <Search size={48} color={iconColor} strokeWidth={1.5} />,
            };
        default:
            return {
                title: 'Nothing Here Yet',
                message: 'Content will appear here once available.',
                icon: <Inbox size={48} color={iconColor} strokeWidth={1.5} />,
            };
    }
};

export const EmptyState: React.FC<EmptyStateProps> = ({
    type = 'generic',
    title,
    message,
    onAction,
    actionText = 'Get Started',
    showIcon = true,
    icon,
}) => {
    const { isDark } = useThemeStore();
    const defaultContent = getDefaultContent(type, isDark);
    const displayTitle = title || defaultContent.title;
    const displayMessage = message || defaultContent.message;
    const displayIcon = icon || (showIcon ? defaultContent.icon : null);

    return (
        <View style={styles.container}>
            {displayIcon && (
                <View style={styles.iconContainer}>
                    {displayIcon}
                </View>
            )}

            <Text style={[styles.title, { color: getTextColor(isDark) }]}>{displayTitle}</Text>
            <Text style={[styles.message, { color: getTextSecondaryColor(isDark) }]}>{displayMessage}</Text>

            {onAction && (
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={onAction}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={actionText}
                    accessibilityHint="Perform the suggested action"
                >
                    <Text style={styles.actionButtonText}>{actionText}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: getResponsiveSpacing(24),
        paddingVertical: getResponsiveSpacing(32),
    },
    iconContainer: {
        marginBottom: getResponsiveSpacing(16),
        opacity: 0.5,
    },
    title: {
        fontSize: getResponsiveFontSize(18),
        fontWeight: '600',
        fontFamily: 'Barlow_600SemiBold',
        textAlign: 'center',
        marginBottom: getResponsiveSpacing(8),
    },
    message: {
        fontSize: getResponsiveFontSize(14),
        fontFamily: 'Barlow_400Regular',
        textAlign: 'center',
        lineHeight: getResponsiveFontSize(20),
        marginBottom: getResponsiveSpacing(24),
    },
    actionButton: {
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
    actionButtonText: {
        fontSize: getResponsiveFontSize(16),
        fontWeight: '600',
        color: '#030303',
        fontFamily: 'Barlow_600SemiBold',
    },
});
