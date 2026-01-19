import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Flame, Trophy, Flame as BurnIcon } from 'lucide-react-native';
import { useSessionsStore } from '@/store/sessionsStore';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getResponsiveSpacing, getResponsiveFontSize, scaleWidth } from '@/utils/responsive';
import { getTextColor, getPrimaryWithOpacity } from '@/utils/colorUtils';

const { width } = Dimensions.get('window');

export const StatsSummaryBar = () => {
    const { isDark } = useThemeStore();
    const getStreak = useSessionsStore(state => state.getStreak);
    const getTotalWorkouts = useSessionsStore(state => state.getTotalWorkouts);
    const getTodayCalories = useSessionsStore(state => state.getTodayCalories);

    const streak = getStreak();
    const total = getTotalWorkouts();
    const calories = getTodayCalories();

    const BRAND_WHITE = getTextColor(isDark);
    const BRAND_PRIMARY = theme.colors.primary;

    const StatCard = ({ icon: Icon, value, label, color }: any) => (
        <BlurView intensity={15} tint={isDark ? 'dark' : 'light'} style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: getPrimaryWithOpacity(0.1) }]}>
                <Icon size={18} color={color || BRAND_PRIMARY} />
            </View>
            <View>
                <Text style={[styles.value, { color: BRAND_WHITE }]}>{value}</Text>
                <Text style={styles.label}>{label}</Text>
            </View>
        </BlurView>
    );

    return (
        <View style={styles.container}>
            <StatCard
                icon={Flame}
                value={streak}
                label="Day Streak"
                color="#FF8C00"
            />
            <StatCard
                icon={Trophy}
                value={total}
                label="Total Workouts"
                color={BRAND_PRIMARY}
            />
            <StatCard
                icon={BurnIcon}
                value={calories}
                label="Today Kcal"
                color="#FF4B4B"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: getResponsiveSpacing(22),
        marginTop: getResponsiveSpacing(16),
        gap: getResponsiveSpacing(10),
    },
    card: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: getResponsiveSpacing(12),
        borderRadius: getResponsiveSpacing(28),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        overflow: 'hidden',
    },
    iconContainer: {
        width: getResponsiveSpacing(36),
        height: getResponsiveSpacing(36),
        borderRadius: getResponsiveSpacing(18),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: getResponsiveSpacing(10),
    },
    value: {
        fontSize: getResponsiveFontSize(16),
        fontWeight: '700',
        fontFamily: 'Barlow_700Bold',
    },
    label: {
        fontSize: getResponsiveFontSize(10),
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'Barlow_400Regular',
        marginTop: 2,
    },
});
