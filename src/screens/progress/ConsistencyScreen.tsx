import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useRef } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, Calendar, ChevronRight, ChevronLeft as ChevronLeftIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTabScroll } from '@/hooks/useTabScroll';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const THEME = {
    primary: '#84c440',
    background: '#030303',
    cardBg: '#1c1c1e',
    text: '#ffffff',
    textDim: 'rgba(255, 255, 255, 0.6)',
    intensity: {
        rest: '#2c2c2e',
        light: '#4a6b2f', // Dim green
        medium: '#6da835', // Mid green
        heavy: '#84c440', // Bright green
    }
};

type Intensity = 'rest' | 'light' | 'medium' | 'heavy';

const ConsistencyScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const params = route.params as { streak?: number, volumeData?: any[] } || {};

    const volumeData = params.volumeData || [];
    const { onScroll: handleTabScroll } = useTabScroll();
    const scrollY = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef<ScrollView>(null);

    // --- Data Processing (New Logic) ---

    // 1. Weekly Data for "Recent Activity"
    const getWeeklyData = () => {
        const weeks = [];
        const today = new Date();
        // Generate last 5 weeks
        for (let i = 4; i >= 0; i--) {
            const startOfWeek = new Date(today);
            // Calculate start of week (Monday)
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
            startOfWeek.setDate(diff - (i * 7)); // Move back i weeks

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6);

            // Format range label "OCT 01 - 07"
            const startMonth = startOfWeek.toLocaleString('default', { month: 'short' }).toUpperCase();
            const startDay = String(startOfWeek.getDate()).padStart(2, '0');
            const endDay = String(endOfWeek.getDate()).padStart(2, '0');
            const rangeLabel = `${startMonth} ${startDay} - ${endDay}`;

            // Generate 7 days for this week
            const weekDays = [];
            for (let d = 0; d < 7; d++) {
                const currentDay = new Date(startOfWeek);
                currentDay.setDate(startOfWeek.getDate() + d);
                const dateStr = currentDay.toISOString().split('T')[0];

                // Check volume
                const dayVol = volumeData.find(v => v.date.startsWith(dateStr));
                const hasActivity = !!dayVol && dayVol.volume > 0;

                // Day label M, T, W...
                const dayLabel = currentDay.toLocaleDateString('en-US', { weekday: 'narrow' });

                weekDays.push({ label: dayLabel, hasActivity, date: dateStr });
            }

            weeks.push({ rangeLabel, days: weekDays });
        }
        return weeks;
    };

    const weeklyData = getWeeklyData();

    // 2. Yearly Activity (Rolling 12 Months)
    const calculateYearlyActivity = () => {
        const today = new Date();
        const monthlyVolumes = [];
        const monthLabels = [];

        // Go back 11 months + current month = 12 months
        for (let i = 11; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthIndex = d.getMonth();
            const year = d.getFullYear();

            // Label "JAN"
            monthLabels.push(d.toLocaleString('default', { month: 'short' }).toUpperCase());

            // Sum volume for this month
            let sum = 0;
            volumeData.forEach(vol => {
                const vDate = new Date(vol.date);
                if (vDate.getMonth() === monthIndex && vDate.getFullYear() === year) {
                    sum += vol.volume;
                }
            });
            monthlyVolumes.push(sum);
        }

        // Normalize (0.1 to 1.0)
        const maxVol = Math.max(...monthlyVolumes, 100);
        const normalized = monthlyVolumes.map(v => {
            if (v === 0) return 0.1; // Small bar for empty
            // Cap at 1.0
            return Math.min(v / maxVol, 1.0);
        });

        return { data: normalized, labels: monthLabels };
    };

    const { data: yearlyData, labels: yearlyLabels } = calculateYearlyActivity();

    // --- Stats for Streak Card ---
    const today = new Date();
    const currentStreakCount = params.streak || 0;

    // Best Streak
    const calculateBestStreak = () => {
        if (!volumeData.length) return 0;
        let maxStreak = 0;
        let currentStreak = 0;
        const sorted = [...volumeData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        sorted.forEach(d => {
            if (d.volume > 0) {
                currentStreak++;
                if (currentStreak > maxStreak) maxStreak = currentStreak;
            } else {
                currentStreak = 0;
            }
        });
        return maxStreak;
    };
    const bestStreak = calculateBestStreak();

    // Month Stats (Current Month)
    const currentMonthData = volumeData.filter(d => {
        const dDate = new Date(d.date);
        return dDate.getMonth() === today.getMonth() && dDate.getFullYear() === today.getFullYear();
    });
    const monthTotalWorkouts = currentMonthData.filter(d => d.volume > 0).length;
    const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const activePercent = Math.round((monthTotalWorkouts / daysInCurrentMonth) * 100);

    const monthName = today.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
                    <ChevronLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Consistency</Text>
                <TouchableOpacity style={styles.iconButton}>
                    <Calendar color="#fff" size={20} />
                </TouchableOpacity>
            </View>

            <Animated.ScrollView
                contentContainerStyle={[styles.content, { paddingBottom: 100 }]}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    {
                        useNativeDriver: true,
                        listener: handleTabScroll
                    }
                )}
                scrollEventThrottle={16}
            >

                {/* Streak Card */}
                <View style={styles.streakCard}>
                    <View style={styles.streakHeader}>
                        <View style={styles.streakTag}>
                            <View style={styles.activeDot} />
                            <Text style={styles.streakTagText}>CURRENT STREAK</Text>
                        </View>
                    </View>

                    <View style={styles.streakMain}>
                        <Text style={styles.streakNumber} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{currentStreakCount}</Text>
                        <Text style={styles.streakIcon}>🔥</Text>
                    </View>
                    <Text style={styles.streakLabel}>Days Active</Text>

                    <View style={styles.divider} />

                    <View style={styles.streakStatsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>{monthName.split(' ')[0].toUpperCase()} TOTAL</Text>
                            <Text style={styles.statValue}>{monthTotalWorkouts}</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>ACTIVE %</Text>
                            <Text style={styles.statValue}>{activePercent}%</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>BEST STREAK</Text>
                            <Text style={styles.statValue}>{bestStreak}</Text>
                        </View>
                    </View>
                </View>

                {/* Recent Activity (Weekly Cards) */}
                <View style={styles.calendarSection}>
                    <View style={styles.calendarHeader}>
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <Text style={styles.sectionTitleSmall}>{monthName}</Text>
                    </View>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 12, paddingRight: 20 }}
                        ref={scrollRef}
                        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
                    >
                        {weeklyData.map((week, index) => (
                            <View key={index} style={styles.weekGroup}>
                                <Text style={styles.weekDateRange}>{week.rangeLabel}</Text>
                                <View style={styles.weekCard}>
                                    <View style={styles.weekBarsRow}>
                                        {week.days.map((day, dIndex) => {
                                            // Determine color based on intensity/activity
                                            // Design: Green for active, Dark Grey for inactive
                                            let barColor = 'rgba(255,255,255,0.1)';
                                            if (day.hasActivity) {
                                                barColor = THEME.primary;
                                            }

                                            return (
                                                <View key={dIndex} style={styles.weekDayCol}>
                                                    <View style={[styles.weekBarContainer]}>
                                                        <View style={[
                                                            styles.weekBar,
                                                            {
                                                                height: day.hasActivity ? '80%' : '100%', // Visual variation
                                                                backgroundColor: barColor,
                                                                opacity: day.hasActivity ? 1 : 0.3
                                                            },
                                                            day.hasActivity && {
                                                                shadowColor: THEME.primary,
                                                                shadowOpacity: 0.5,
                                                                shadowRadius: 6
                                                            }
                                                        ]} />
                                                    </View>
                                                    <Text style={[
                                                        styles.weekDayLabel,
                                                        day.hasActivity && { color: '#fff', fontWeight: 'bold' }
                                                    ]}>
                                                        {day.label}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                {/* Yearly Activity */}
                <View style={styles.yearSection}>
                    <View style={styles.yearHeader}>
                        <Text style={styles.sectionTitleSmall}>YEARLY ACTIVITY</Text>
                        <Text style={[styles.sectionTitleSmall, { color: THEME.primary }]}>{today.getFullYear()}</Text>
                    </View>

                    <View style={styles.chartContainer}>
                        {yearlyData.map((h, i) => (
                            <View key={i} style={styles.chartBarContainer}>
                                <View style={[
                                    styles.chartBar,
                                    { height: `${h * 100}%` },
                                    i === 11 ? { backgroundColor: THEME.primary } : { backgroundColor: 'rgba(255,255,255,0.2)' }
                                ]} />
                            </View>
                        ))}
                    </View>
                    <View style={styles.chartLabels}>
                        <Text style={styles.chartLabel}>{yearlyLabels[0]}</Text>
                        <Text style={styles.chartLabel}>{yearlyLabels[6]}</Text>
                        <Text style={styles.chartLabel}>{yearlyLabels[11]}</Text>
                    </View>
                </View>

            </Animated.ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: THEME.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    iconButton: {
        padding: 8,
        backgroundColor: '#1c1c1e',
        borderRadius: 20,
    },
    content: {
        padding: 20,
        gap: 24
    },
    streakCard: {
        backgroundColor: '#111',
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    streakHeader: {
        marginBottom: 16
    },
    streakTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(132, 196, 64, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6
    },
    activeDot: {
        width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.primary
    },
    streakTagText: {
        color: THEME.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1
    },
    streakMain: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    streakNumber: {
        fontSize: 72,
        fontWeight: '900',
        color: '#fff',
        lineHeight: 72,
        letterSpacing: -2,
        flexShrink: 1
    },
    streakIcon: {
        fontSize: 30,
        marginTop: 10
    },
    streakLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 14,
        fontWeight: '500',
        marginTop: 8
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        width: '100%',
        marginVertical: 24
    },
    streakStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 10
    },
    statItem: {
        alignItems: 'center',
        gap: 6
    },
    statLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1
    },
    statValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        flexShrink: 1
    },
    verticalDivider: {
        width: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        height: '80%'
    },

    // Recent Activity Cards (New)
    calendarSection: {
        gap: 16
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff'
    },
    weekGroup: {
        gap: 8,
        alignItems: 'flex-start'
    },
    weekDateRange: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: 4
    },
    weekCard: {
        backgroundColor: '#111',
        borderRadius: 24,
        padding: 16,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    weekBarsRow: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'flex-end',
        height: 60
    },
    weekDayCol: {
        alignItems: 'center',
        gap: 8,
        width: 14 // fixed width for alignment
    },
    weekBarContainer: {
        height: 40, // Max height
        width: 6,
        justifyContent: 'flex-end',
        alignItems: 'center'
    },
    weekBar: {
        width: '100%',
        borderRadius: 3
    },
    weekDayLabel: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        fontWeight: '700'
    },

    // Yearly
    yearSection: {
        backgroundColor: '#111',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    yearHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24
    },
    sectionTitleSmall: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 2
    },
    chartContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        height: 80,
        gap: 8,
        paddingHorizontal: 10
    },
    chartBarContainer: {
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
    },
    chartBar: {
        borderRadius: 4,
        width: '100%',
        minHeight: 4
    },
    chartLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingHorizontal: 10
    },
    chartLabel: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 10,
        fontWeight: '700'
    }
});

export default ConsistencyScreen;
