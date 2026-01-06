import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { BlurView } from 'expo-blur';
import { useSessionsStore } from '@/store/sessionsStore';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { getTextColor } from '@/utils/colorUtils';

const { width } = Dimensions.get('window');

export const WeeklyActivityChart = () => {
    const { isDark } = useThemeStore();
    const sessions = useSessionsStore(state => state.sessions);

    const chartData = useMemo(() => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const last7Days = [];
        const counts = [];

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayName = days[date.getDay()];
            const dayISO = date.toISOString().split('T')[0];

            last7Days.push(dayName);

            const count = sessions.filter((s: any) => {
                const d = s.date || s.started_at || s.created_at;
                return d && d.startsWith(dayISO);
            }).length;

            counts.push(count);
        }

        return {
            labels: last7Days,
            datasets: [
                {
                    data: counts,
                },
            ],
        };
    }, [sessions]);

    const BRAND_WHITE = getTextColor(isDark);
    const BRAND_PRIMARY = theme.colors.primary;

    const chartConfig = {
        backgroundGradientFrom: 'transparent',
        backgroundGradientTo: 'transparent',
        color: (opacity = 1) => `rgba(132, 196, 65, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.5})`,
        strokeWidth: 2,
        barPercentage: 0.6,
        useShadowColorFromDataset: false,
        decimalPlaces: 0,
        propsForBackgroundLines: {
            strokeDasharray: '', // solid background lines
            stroke: 'rgba(255, 255, 255, 0.05)',
        },
    };

    return (
        <View style={styles.container}>
            <BlurView intensity={10} tint={isDark ? 'dark' : 'light'} style={styles.content}>
                <Text style={[styles.title, { color: BRAND_WHITE }]}>Weekly Activity</Text>
                <BarChart
                    data={chartData}
                    width={width - getResponsiveSpacing(44)}
                    height={180}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={chartConfig}
                    verticalLabelRotation={0}
                    fromZero={true}
                    showBarTops={false}
                    withInnerLines={true}
                    style={styles.chart}
                />
            </BlurView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: getResponsiveSpacing(22),
        marginTop: getResponsiveSpacing(20),
    },
    content: {
        borderRadius: getResponsiveSpacing(20),
        padding: getResponsiveSpacing(16),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    title: {
        fontSize: getResponsiveFontSize(14),
        fontFamily: 'Barlow_600SemiBold',
        marginBottom: getResponsiveSpacing(12),
    },
    chart: {
        marginLeft: -16, // Adjust for chart internal padding
        marginTop: 8,
    },
});
