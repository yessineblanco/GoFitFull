import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react-native';
import { theme } from '@/theme';
import { getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { useThemeStore } from '@/store/themeStore';
import { getTextColor, getGlassBg, getGlassBorder, getBlurTint, getOverlayColor } from '@/utils/colorUtils';
import {
    format,
    addDays,
    startOfWeek,
    isSameDay,
    subDays,
} from 'date-fns';

interface GlassCalendarProps {
    onDateSelect?: (date: Date) => void;
    workoutDays?: string[]; // Array of date strings (YYYY-MM-DD)
}

export const GlassCalendar: React.FC<GlassCalendarProps> = ({
    onDateSelect,
    workoutDays = [],
}) => {
    const { isDark } = useThemeStore();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })); // Monday start

    // Generate 5 days window
    const days = Array.from({ length: 5 }).map((_, i) => addDays(currentWeekStart, i));

    // Current Month/Year for display
    const monthYear = format(currentWeekStart, 'MMMM yyyy');

    const handlePrevWeek = () => {
        setCurrentWeekStart(prev => subDays(prev, 1));
    };

    const handleNextWeek = () => {
        setCurrentWeekStart(prev => addDays(prev, 1));
    };

    const handleDatePress = (date: Date) => {
        setSelectedDate(date);
        if (onDateSelect) onDateSelect(date);
    };

    return (
        <View style={[styles.container, { borderColor: getGlassBorder(isDark) }]}>
            <BlurView intensity={isDark ? 80 : 60} tint={getBlurTint(isDark)} style={[styles.glassContainer, {
                backgroundColor: isDark ? 'rgba(10, 10, 10, 0.4)' : 'rgba(255, 255, 255, 0.7)',
            }]}>
                <LinearGradient
                    colors={isDark
                        ? ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']
                        : ['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.2)']
                    }
                    style={StyleSheet.absoluteFill}
                />

                {/* Header: Month/Year + Navigation */}
                <View style={styles.header}>
                    <Text style={[styles.monthText, { color: getTextColor(isDark) }]}>{monthYear}</Text>
                    <View style={styles.navContainer}>
                        <TouchableOpacity onPress={handlePrevWeek} style={[styles.navButton, { borderColor: getGlassBorder(isDark) }]}>
                            <BlurView intensity={40} tint={getBlurTint(isDark)} style={[styles.navBlur, { backgroundColor: getGlassBg(isDark) }]}>
                                <ChevronLeft size={20} color={getTextColor(isDark)} />
                            </BlurView>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleNextWeek} style={[styles.navButton, { borderColor: getGlassBorder(isDark) }]}>
                            <BlurView intensity={40} tint={getBlurTint(isDark)} style={[styles.navBlur, { backgroundColor: getGlassBg(isDark) }]}>
                                <ChevronRight size={20} color={getTextColor(isDark)} />
                            </BlurView>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Calendar Days Row */}
                <View style={styles.daysRow}>
                    {days.map((date, index) => {
                        const isSelected = isSameDay(date, selectedDate);
                        const isToday = isSameDay(date, new Date());
                        const dateString = format(date, 'yyyy-MM-dd');
                        const hasWorkout = workoutDays.includes(dateString);

                        return (
                            <TouchableOpacity
                                key={index}
                                onPress={() => handleDatePress(date)}
                                activeOpacity={0.8}
                                style={styles.dayWrapper}
                            >
                                <BlurView
                                    intensity={isSelected ? 90 : 20}
                                    tint={isSelected ? 'light' : getBlurTint(isDark)}
                                    style={[
                                        styles.dayBlur,
                                        { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) },
                                        isSelected && styles.dayBlurSelected,
                                        !isSelected && isToday && styles.dayBlurToday,
                                    ]}
                                >
                                    {isSelected && (
                                        <LinearGradient
                                            colors={[theme.colors.primary, theme.colors.primaryDark]}
                                            style={StyleSheet.absoluteFill}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        />
                                    )}

                                    <Text style={[
                                        styles.dayName,
                                        { color: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.5)' },
                                        isSelected && styles.dayNameSelected,
                                        !isSelected && isToday && { color: theme.colors.primary }
                                    ]}>
                                        {format(date, 'EEE')}
                                    </Text>

                                    <View style={styles.dateNumberContainer}>
                                        <Text style={[
                                            styles.dayNumber,
                                            { color: getTextColor(isDark) },
                                            isSelected && styles.dayNumberSelected,
                                            !isSelected && isToday && styles.dayNumberToday
                                        ]}>
                                            {format(date, 'd')}
                                        </Text>

                                        {/* Completed Workout Checkmark */}
                                        {hasWorkout && !isSelected && (
                                            <View style={styles.checkIconContainer}>
                                                <Check size={14} color={theme.colors.primary} strokeWidth={3} />
                                            </View>
                                        )}
                                    </View>
                                </BlurView>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </BlurView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: getResponsiveSpacing(16),
        marginHorizontal: getResponsiveSpacing(16),
        borderRadius: getResponsiveSpacing(24),
        overflow: 'hidden',
        borderWidth: 1.5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 12,
    },
    glassContainer: {
        padding: getResponsiveSpacing(20),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: getResponsiveSpacing(24),
    },
    monthText: {
        fontSize: getResponsiveFontSize(theme.typography.h4.fontSize),
        fontFamily: 'Designer',
        color: '#FFF',
        fontWeight: 'normal',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    navContainer: {
        flexDirection: 'row',
        gap: getResponsiveSpacing(8),
    },
    navButton: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    navBlur: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: getResponsiveSpacing(8),
    },
    dayWrapper: {
        flex: 1,
        alignItems: 'center',
    },
    dayBlur: {
        width: '100%',
        aspectRatio: 0.7, // Taller
        borderRadius: getResponsiveSpacing(24),
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    dayBlurSelected: {
        backgroundColor: 'transparent',
        borderColor: 'rgba(255,255,255,0.5)',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
        elevation: 5,
    },
    dayBlurToday: {
        borderColor: theme.colors.primary,
        borderWidth: 1.5,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        backgroundColor: 'rgba(132, 196, 65, 0.05)',
    },
    dayName: {
        fontSize: getResponsiveFontSize(11),
        color: 'rgba(255, 255, 255, 0.6)',
        fontFamily: 'Designer',
        marginBottom: 2,
        textTransform: 'uppercase',
    },
    dayNameSelected: {
        color: '#000',
        fontFamily: 'Designer',
    },
    dateNumberContainer: {
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayNumber: {
        fontSize: getResponsiveFontSize(18),
        color: '#FFF',
        fontFamily: 'Designer',
    },
    dayNumberSelected: {
        color: '#000',
        fontFamily: 'Designer',
    },
    dayNumberToday: {
        color: theme.colors.primary,
        fontFamily: 'Designer',
        fontWeight: 'normal',
    },
    checkIconContainer: {
        position: 'absolute',
        bottom: -2,
    },
    // Removed old dot styles
});
