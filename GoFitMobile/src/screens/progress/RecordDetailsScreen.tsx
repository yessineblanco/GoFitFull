import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronLeft, MoreHorizontal, Share, Clock, Dumbbell, Activity, LucideIcon } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { PersonalRecord, fetchExerciseHistory } from '@/services/workoutStats';
import { useAuthStore } from '@/store/authStore';
import { useTabScroll } from '@/hooks/useTabScroll';
import { useThemeStore } from '@/store/themeStore';
import { getBackgroundColor, getTextColor, getTextColorWithOpacity, getTextSecondaryColor, getSurfaceColor } from '@/utils/colorUtils';

const THEME_STATIC = {
    primary: '#84c440',
};

const getTheme = (isDark: boolean) => ({
    ...THEME_STATIC,
    background: getBackgroundColor(isDark),
    cardBg: getSurfaceColor(isDark),
    text: getTextColor(isDark),
    textDim: getTextColorWithOpacity(isDark, 0.6),
    textMuted: getTextColorWithOpacity(isDark, 0.4),
    textSubtle: getTextColorWithOpacity(isDark, 0.3),
    overlayBg: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
    overlayBgSubtle: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
});

// Helper for detail cards
const DetailCard = ({ label, value, unit, icon: Icon, isDark }: { label: string, value: string, unit?: string, icon: any, isDark?: boolean }) => {
    const dark = isDark ?? true;
    const T = getTheme(dark);
    return (
        <LinearGradient
            colors={['rgba(132, 196, 65, 0.1)', 'rgba(132, 196, 65, 0.02)']}
            style={styles.detailCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <View style={styles.detailCardBgIcon}>
                <Icon size={80} color={dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'} />
            </View>
            <View style={styles.detailCardHeader}>
                <Text style={[styles.detailLabel, { color: T.textMuted }]}>{label}</Text>
            </View>
            <View style={styles.detailValueContainer}>
                <Text style={[styles.detailValue, { color: T.text }]}>{value}</Text>
                {unit && <Text style={[styles.detailUnit, { color: T.textDim }]}>{unit}</Text>}
            </View>
            <Icon size={24} color={THEME_STATIC.primary} style={{ position: 'absolute', top: 16, right: 16, opacity: 0.8 }} />
        </LinearGradient>
    );
};

const RecordDetailsScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { user } = useAuthStore();
    const { isDark } = useThemeStore();
    const T = getTheme(isDark);
    const { record, bgImage } = route.params as { record: PersonalRecord, bgImage?: string };
    const { onScroll } = useTabScroll();

    const [history, setHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            if (user?.id && record.exerciseId) {
                try {
                    const data = await fetchExerciseHistory(user.id, record.exerciseId);

                    // Deduplicate by date (keep max weight per day)
                    const uniqueMap = new Map();
                    data.forEach(item => {
                        const dateStr = new Date(item.date).toDateString();
                        if (!uniqueMap.has(dateStr)) {
                            uniqueMap.set(dateStr, item);
                        } else {
                            // If entry exists for this day, keep the one with higher weight
                            const existing = uniqueMap.get(dateStr);
                            if (item.weight > existing.weight) {
                                uniqueMap.set(dateStr, item);
                            }
                        }
                    });

                    const uniqueData = Array.from(uniqueMap.values());

                    // Sort by date desc (newest first)
                    const sorted = uniqueData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
                    setHistory(sorted);
                } catch (e) {
                    console.error("Failed to load history", e);
                } finally {
                    setLoadingHistory(false);
                }
            } else {
                setLoadingHistory(false);
            }
        };
        loadHistory();
    }, [user?.id, record.exerciseId]);

    // Format Data
    const duration = record.duration > 0 ? record.duration : 45; // Default if 0
    const reps = record.reps || 1;
    let volume = record.volume;
    if (!volume && record.weight) {
        volume = record.weight * (reps || 1);
    }
    const intensity = 100; // PR is max effort

    // Fallback image
    const heroImage = bgImage || 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop';

    // Merge current PR into history for display if needed, or just use history
    // Current PR is `record`.
    const displayHistory = history.length > 0 ? history : [
        { weight: record.weight, date: record.date, active: true },
        // if empty, add placeholder
    ];

    return (
        <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.iconButton, { backgroundColor: T.cardBg }]}>
                    <ChevronLeft color={T.text} size={24} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: T.text }]}>Record Details</Text>
                <TouchableOpacity style={[styles.iconButton, { backgroundColor: T.cardBg }]}>
                    <MoreHorizontal color={T.text} size={24} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {/* Hero Card */}
                <View style={styles.heroCardContainer}>
                    {/* Removed Glow as requested */}
                    <ImageBackground
                        source={{ uri: heroImage }}
                        style={styles.heroCard}
                        imageStyle={{ borderRadius: 32 }}
                    >
                        <LinearGradient
                            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.95)']}
                            style={StyleSheet.absoluteFill}
                        />

                        <View style={styles.heroContent}>
                            <BlurView intensity={30} tint="dark" style={styles.heroBadge}>
                                <Text style={styles.badgeText}>NEW RECORD</Text>
                            </BlurView>

                            <View style={{ gap: 8 }}>
                                <Text style={styles.heroExerciseName} numberOfLines={1} adjustsFontSizeToFit>{record.exercise.toUpperCase()}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                    <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>{record.weight}</Text>
                                    <Text style={styles.heroUnit}>LBS</Text>
                                </View>
                                <Text style={styles.heroDate} numberOfLines={1}>{new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} • 1RM Attempt</Text>
                            </View>
                        </View>
                    </ImageBackground>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <DetailCard label="DURATION" value={duration.toString()} unit="m" icon={Clock} isDark={isDark} />
                    <DetailCard label="REPS" value={reps.toString()} unit="rep" icon={Dumbbell} isDark={isDark} />
                    <DetailCard label="VOLUME" value={volume?.toLocaleString() || '-'} unit="lbs" icon={Activity} isDark={isDark} />
                    <DetailCard label="INTENSITY" value={`${intensity}%`} icon={Activity} isDark={isDark} />
                </View>

                {/* Progress Path */}
                <LinearGradient
                    colors={['rgba(132, 196, 65, 0.1)', 'rgba(132, 196, 65, 0.02)']}
                    style={styles.progressSection}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.progressHeader}>
                        <Text style={[styles.sectionTitle, { color: T.text }]}>PROGRESS PATH</Text>
                        <View style={styles.yearlyBadge}>
                            {/* Logic: Difference between current PR and oldest in history? */}
                            <Text style={styles.yearlyBadgeText}>Recent Activity</Text>
                        </View>
                    </View>

                    <View style={styles.timeline}>
                        {displayHistory.map((item, index) => {
                            const isCurrent = item.weight === record.weight && new Date(item.date).toDateString() === new Date(record.date).toDateString();
                            return (
                                <View key={index} style={styles.timelineItem}>
                                    {/* Line */}
                                    {index < displayHistory.length - 1 && <View style={styles.timelineLine} />}

                                    {/* Dot */}
                                    <View style={[styles.timelineDot, isCurrent && styles.timelineDotActive]} />

                                    {/* Content */}
                                    <View style={styles.timelineContent}>
                                        <Text style={[styles.timelineWeight, { color: T.text }]}>{Math.round(item.weight)} lbs</Text>
                                        <Text style={[styles.timelineDate, { color: T.textMuted }, isCurrent && { color: THEME_STATIC.primary }]}>
                                            {isCurrent ? `Current PR • ${new Date(item.date).toLocaleDateString()}` : new Date(item.date).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </LinearGradient>

                {/* Share Button */}
                <TouchableOpacity style={styles.shareButton}>
                    <Share color="#000" size={20} />
                    <Text style={styles.shareButtonText}>Share This Record</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030303',
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
        gap: 20,
    },
    heroCardContainer: {
        marginBottom: 24,
        position: 'relative',
        zIndex: 1
    },
    heroCardGlow: {
        position: 'absolute',
        top: 25,
        left: 0,
        right: 0,
        bottom: -20, // Glow mainly at bottom like ref
        backgroundColor: 'rgba(132, 196, 64, 0.4)', // Stronger green
        borderRadius: 40,
        zIndex: -1,
        shadowColor: THEME_STATIC.primary,
        shadowRadius: 40,
        shadowOpacity: 0.8,
        shadowOffset: { width: 0, height: 10 }
    },
    heroCard: {
        height: 300,
        borderRadius: 32,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        padding: 24,
        borderWidth: 1,
        borderColor: '#266637',
        backgroundColor: '#000' // Ensure no transparent bleed
    },
    heroContent: {
        gap: 20,
    },
    heroBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(132, 196, 64, 0.3)',
        borderWidth: 1,
        borderColor: 'rgba(132, 196, 64, 0.6)',
        overflow: 'hidden'
    },
    badgeText: {
        color: THEME_STATIC.primary,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 2
    },
    heroExerciseName: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 3,
        marginBottom: -6
    },
    heroValue: {
        fontSize: 72,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -3,
        lineHeight: 72,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowRadius: 10,
        flexShrink: 1
    },
    heroUnit: {
        fontSize: 24,
        fontWeight: '800',
        color: THEME_STATIC.primary,
        marginBottom: 12
    },
    heroDate: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: '600'
    },

    // Stats Grid
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 32
    },
    detailCard: {
        flex: 1,
        minWidth: '45%',
        // backgroundColor: 'rgba(28, 28, 30, 0.5)', // Glassy
        borderRadius: 30, // More rounded 
        padding: 20,
        borderWidth: 1,
        borderColor: '#266637',
        minHeight: 140,
        justifyContent: 'center', // Center content
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
    },
    detailCardBgIcon: {
        position: 'absolute',
        right: -10,
        bottom: -20,
        transform: [{ rotate: '-15deg' }],
        opacity: 0.5
    },
    detailCardHeader: {
        marginBottom: 8,
        alignItems: 'center'
    },
    detailLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 4
    },
    detailValueContainer: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    detailValue: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '800',
        flexShrink: 1
    },
    detailUnit: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 14,
        fontWeight: '600',
    },
    progressSection: {
        // backgroundColor: 'rgba(28, 28, 30, 0.5)', // Glassy
        borderRadius: 30,
        padding: 24,
        borderWidth: 1,
        borderColor: '#266637',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    sectionTitle: {
        color: '#fff',
        fontWeight: '800',
        letterSpacing: 1,
        fontSize: 12,
    },
    yearlyBadge: {
        backgroundColor: 'rgba(132, 196, 64, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    yearlyBadgeText: {
        color: THEME_STATIC.primary,
        fontSize: 10,
        fontWeight: '600',
    },
    timeline: {
        paddingLeft: 8,
    },
    timelineItem: {
        flexDirection: 'row',
        gap: 20,
        paddingBottom: 32,
        position: 'relative',
    },
    timelineLine: {
        position: 'absolute',
        left: 7, // Center of dot (14px)
        top: 14,
        bottom: -14, // Extend to next dot
        width: 2,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    timelineDot: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#2c2c2e',
        zIndex: 1,
    },
    timelineDotActive: {
        backgroundColor: THEME_STATIC.primary,
        borderWidth: 2,
        borderColor: 'rgba(132, 196, 64, 0.3)',
    },
    timelineContent: {
        flex: 1,
        justifyContent: 'center',
        gap: 4,
        top: -2, // Align with dot visually
    },
    timelineWeight: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    timelineDate: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 12,
        fontWeight: '500',
    },
    shareButton: {
        backgroundColor: THEME_STATIC.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderRadius: 30,
        gap: 10,
        marginTop: 10,
    },
    shareButtonText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 16,
    },
});

export default RecordDetailsScreen;
