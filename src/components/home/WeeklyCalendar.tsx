import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useSessionsStore } from '@/store/sessionsStore';
import { theme } from '@/theme';
import { getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';

const DAYS_IN_WEEK = 7;
const CIRCLE_SIZE = 44;
const STROKE_WIDTH = 2;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

import { BlurView } from 'expo-blur';

export const WeeklyCalendar: React.FC = () => {
    const { sessions } = useSessionsStore();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get start of week (Sunday)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay());
    startDate.setHours(0, 0, 0, 0);

    const getWorkoutIntensity = (date: Date) => {
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        const daySessions = sessions.filter(s => {
            const dateStr = s.date || s.started_at || s.created_at;
            if (!dateStr) return false;
            const sessionDate = new Date(dateStr);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === checkDate.getTime();
        });
        return daySessions.length;
    };

    const renderDay = (index: number) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);
        date.setHours(0, 0, 0, 0);

        const dayName = DAY_NAMES[date.getDay()];
        const dayNumber = date.getDate().toString();
        const isToday = date.getTime() === today.getTime();
        const workoutCount = getWorkoutIntensity(date);

        let progress = 0;
        let strokeColor = 'rgba(255, 255, 255, 0.1)';

        if (isToday) {
            progress = 0.7; // 70% per image
            strokeColor = theme.colors.primary;
        } else if (workoutCount > 0) {
            progress = 1.0; // Complete ring for workout days
            strokeColor = 'rgba(255, 255, 255, 0.6)'; // Brighter per image (13, 18)
        }

        const strokeDashoffset = CIRCUMFERENCE - (progress * CIRCUMFERENCE);

        return (
            <View key={index} style={styles.dayColumn}>
                <Text style={[
                    styles.dayName,
                    isToday && styles.todayText
                ]}>
                    {dayName}
                </Text>

                <View style={styles.circleContainer}>
                    <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.svg}>
                        <Circle
                            cx={CIRCLE_SIZE / 2}
                            cy={CIRCLE_SIZE / 2}
                            r={RADIUS}
                            stroke="rgba(255, 255, 255, 0.05)"
                            strokeWidth={STROKE_WIDTH}
                            fill="transparent"
                        />
                        {progress > 0 && (
                            <Circle
                                cx={CIRCLE_SIZE / 2}
                                cy={CIRCLE_SIZE / 2}
                                r={RADIUS}
                                stroke={strokeColor}
                                strokeWidth={STROKE_WIDTH}
                                fill="transparent"
                                strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                transform={`rotate(-90 ${CIRCLE_SIZE / 2} ${CIRCLE_SIZE / 2})`}
                            />
                        )}
                    </Svg>
                    <Text style={[
                        styles.dayNumber,
                        isToday && styles.todayText,
                        workoutCount > 0 && !isToday && styles.workoutDayNumber
                    ]}>
                        {dayNumber}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <BlurView intensity={20} tint="dark" style={styles.glassContainer}>
                <View style={styles.daysRow}>
                    {Array.from({ length: DAYS_IN_WEEK }).map((_, i) => renderDay(i))}
                </View>
            </BlurView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: getResponsiveSpacing(22),
        marginBottom: getResponsiveSpacing(10),
        marginTop: getResponsiveSpacing(16),
    },
    glassContainer: {
        borderRadius: getResponsiveSpacing(28),
        paddingVertical: getResponsiveSpacing(16),
        paddingHorizontal: getResponsiveSpacing(12),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dayColumn: {
        alignItems: 'center',
    },
    dayName: {
        fontFamily: 'Barlow_500Medium',
        fontSize: getResponsiveFontSize(12),
        color: 'rgba(255, 255, 255, 0.5)',
        marginBottom: getResponsiveSpacing(12),
    },
    circleContainer: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    svg: {
        position: 'absolute',
    },
    dayNumber: {
        fontFamily: 'Barlow_600SemiBold',
        fontSize: getResponsiveFontSize(15),
        color: '#FFFFFF',
    },
    todayText: {
        color: theme.colors.primary,
    },
    workoutDayNumber: {
        color: '#FFFFFF',
    },
});
