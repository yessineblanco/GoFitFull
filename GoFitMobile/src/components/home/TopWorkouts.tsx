import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useThemeStore } from '@/store/themeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { SectionHeader } from './SectionHeader';
import { useSessionsStore } from '@/store/sessionsStore';
import { workoutService } from '@/services/workouts';
import { AppText } from '@/components/shared/AppText';
import { EmptyState } from '@/components/shared/EmptyState';
import { Shimmer } from '@/components/shared/Shimmer';
import { Play } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { getGlassBg, getGlassBorder, getSurfaceColor } from '@/utils/colorUtils';

const CARD_WIDTH = 263;
const CARD_HEIGHT = 180;

export const TopWorkouts: React.FC = () => {
    const { isDark } = useThemeStore();
    const navigation = useNavigation<any>();

    // Use sessions store for dynamic history
    const { sessions, loading } = useSessionsStore();
    const [enhancedSessions, setEnhancedSessions] = useState<any[]>([]);

    // Animation refs
    const scrollX = useRef(new Animated.Value(0)).current;


    // Fetch workout details to get exercise counts
    useEffect(() => {
        const loadDetails = async () => {
            if (!sessions || sessions.length === 0) {
                setEnhancedSessions([]);
                return;
            }

            const recent = sessions
                .filter(s => s.workout && (s.date || s.started_at))
                .slice(0, 5);

            const detailed = await Promise.all(recent.map(async (s) => {
                // If we already have completed exercises in session, use them
                if (s.exercises_completed && s.exercises_completed.length > 0) {
                    return s;
                }

                // Otherwise fetch workout plan details
                if (s.workout?.id) {
                    try {
                        const details = await workoutService.getWorkoutById(s.workout.id);
                        return {
                            ...s,
                            workout: {
                                ...s.workout,
                                exercisesCount: details?.exercises?.length || 0
                            }
                        };
                    } catch (e) {
                        return s;
                    }
                }
                return s;
            }));

            setEnhancedSessions(detailed);
        };

        loadDetails();
    }, [sessions]);



    const handleWorkoutPress = (workoutId: string) => {
        if (!workoutId) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('Library', {
            screen: 'WorkoutDetail',
            initial: false,
            params: { workoutId },
        });
    };

    const handleSeeAll = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('Progress', { screen: 'ProgressMain' });
    };

    // Shimmer effect
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (loading) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(shimmerAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(shimmerAnim, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            shimmerAnim.stopAnimation();
        }
    }, [loading]);

    const shimmerOpacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.6],
    });

    if (loading && enhancedSessions.length === 0) {
        return (
            <View style={styles.container}>
                <SectionHeader title="Recent Activity" showSeeAll={false} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {[1, 2, 3].map((i) => (
                        <View
                            key={i}
                            style={[
                                styles.cardContainer,
                                styles.skeletonCard,
                                i === 1 && styles.firstCard,
                            ]}
                        >
                            <Shimmer width={scaleWidth(CARD_WIDTH)} height={CARD_HEIGHT} borderRadius={20} />
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    }

    // Render logic
    return (
        <View style={styles.container}>
            <SectionHeader title="Recent Activity" onSeeAllPress={handleSeeAll} animationDelay={0} />

            {enhancedSessions.length === 0 ? (
                <View style={[styles.emptyContainer, {
                    backgroundColor: getGlassBg(isDark),
                    borderColor: getGlassBorder(isDark),
                }]}>
                    <EmptyState
                        type="sessions"
                        title="No workout planned for today"
                        message="Start your fitness journey by selecting a workout from the library."
                        onAction={() => navigation.navigate('Library' as any, { screen: 'LibraryMain' })}
                        actionText="Find a Workout"
                    />
                </View>
            ) : (
                <Animated.ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    decelerationRate="fast"
                    snapToInterval={scaleWidth(CARD_WIDTH) + getResponsiveSpacing(14)}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                        { useNativeDriver: true }
                    )}
                    scrollEventThrottle={16}
                >
                    {enhancedSessions.map((session, index) => {
                        const workout = session.workout;
                        if (!workout) return null;

                        const inputRange = [
                            (index - 1) * (scaleWidth(CARD_WIDTH) + getResponsiveSpacing(14)),
                            index * (scaleWidth(CARD_WIDTH) + getResponsiveSpacing(14)),
                            (index + 1) * (scaleWidth(CARD_WIDTH) + getResponsiveSpacing(14)),
                        ];

                        const scale = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.95, 1, 0.95],
                            extrapolate: 'clamp',
                        });

                        const opacity = scrollX.interpolate({
                            inputRange,
                            outputRange: [0.7, 1, 0.7],
                            extrapolate: 'clamp',
                        });

                        const imageUrl = workout.image_url;
                        const dateString = session.date || session.started_at;
                        const formattedDate = dateString ? format(parseISO(dateString), 'MMM d, yyyy') : '';

                        // Determine exercise count
                        const exerciseCount = session.exercises_completed?.length > 0
                            ? session.exercises_completed.length
                            : (workout.exercisesCount || 0);

                        return (
                            <Animated.View
                                key={session.id}
                                style={{
                                    transform: [{ scale }],
                                    opacity,
                                }}
                            >
                                <TouchableOpacity
                                    activeOpacity={0.9}
                                    onPress={() => handleWorkoutPress(workout.id)}
                                    style={[styles.cardContainer, index === 0 && styles.firstCard]}
                                >
                                    <BlurView intensity={40} tint="dark" style={styles.cardBlur}>
                                        {/* Image */}
                                        {imageUrl ? (
                                            <Image
                                                source={{ uri: imageUrl }}
                                                style={styles.cardImage}
                                                contentFit="cover"
                                                transition={200}
                                                placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                                                placeholderContentFit="cover"
                                                recyclingKey={workout.id}
                                            />
                                        ) : (
                                            <LinearGradient
                                                colors={['#333', '#111']}
                                                style={styles.cardImage}
                                            />
                                        )}

                                        {/* Gradient Overlay */}
                                        <LinearGradient
                                            colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
                                            style={styles.gradient}
                                        />

                                        {/* Content */}
                                        <View style={styles.cardContent}>
                                            {/* Badge - Date - ONLY show if NOT today (handled by logic later) */}
                                            {index !== 0 && (
                                                <View style={styles.badgeRow}>
                                                    <BlurView intensity={50} tint="dark" style={styles.glassBadge}>
                                                        <Text style={styles.badgeText}>{formattedDate}</Text>
                                                    </BlurView>
                                                </View>
                                            )}
                                            {index === 0 && (
                                                <View style={styles.badgeRow}>
                                                    <View style={[styles.glassBadge, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
                                                        <Text style={[styles.badgeText, { color: '#000' }]}>TODAY</Text>
                                                    </View>
                                                </View>
                                            )}

                                            {/* Bottom Info */}
                                            <View>
                                                <AppText variant="h4" style={styles.workoutName} numberOfLines={2}>{workout.name}</AppText>

                                                <View style={styles.lowerActionRow}>
                                                    <View style={styles.metaRow}>
                                                        {workout.difficulty && (
                                                            <>
                                                                <Text style={styles.workoutType}>{workout.difficulty}</Text>
                                                                <View style={styles.dot} />
                                                            </>
                                                        )}
                                                        {exerciseCount > 0 && (
                                                            <Text style={styles.exerciseCountText}>
                                                                {exerciseCount} Exercises
                                                            </Text>
                                                        )}
                                                    </View>

                                                    {/* Primary Action Button Logic */}
                                                    {index === 0 ? (
                                                        <View style={styles.primaryActionButtonIcon}>
                                                            <Play size={18} color="#000" fill="#000" />
                                                        </View>
                                                    ) : (
                                                        <View style={styles.secondaryActionButton}>
                                                            <Text style={styles.secondaryActionText}>VIEW</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    </BlurView>
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </Animated.ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: getResponsiveSpacing(24),
    },
    scrollContent: {
        paddingRight: getResponsiveSpacing(22),
    },
    cardContainer: {
        width: scaleWidth(CARD_WIDTH),
        height: scaleHeight(CARD_HEIGHT),
        borderRadius: getResponsiveSpacing(24),
        marginLeft: getResponsiveSpacing(14),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 10,
    },
    firstCard: {
        marginLeft: getResponsiveSpacing(22),
    },
    cardBlur: {
        flex: 1,
        backgroundColor: 'rgba(30, 30, 30, 0.4)',
        borderRadius: getResponsiveSpacing(24),
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    cardImage: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0.9,
    },
    gradient: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        bottom: 0,
    },
    cardContent: {
        flex: 1,
        padding: getResponsiveSpacing(18),
        justifyContent: 'space-between',
    },
    badgeRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
    },
    glassBadge: {
        paddingHorizontal: getResponsiveSpacing(12),
        paddingVertical: getResponsiveSpacing(6),
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    badgeText: {
        fontFamily: 'Barlow_700Bold',
        fontSize: getResponsiveFontSize(11),
        color: 'rgba(255, 255, 255, 0.9)',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    workoutName: {
        color: '#FFFFFF',
        marginBottom: getResponsiveSpacing(6),
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        fontSize: getResponsiveFontSize(18),
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    workoutType: {
        fontFamily: 'Barlow_400Regular',
        fontSize: getResponsiveFontSize(13),
        color: 'rgba(255, 255, 255, 0.85)',
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: theme.colors.primary,
        marginHorizontal: getResponsiveSpacing(8),
        opacity: 0.8,
    },
    exerciseCountText: {
        fontFamily: 'Barlow_700Bold',
        fontSize: getResponsiveFontSize(13),
        color: theme.colors.primary,
        letterSpacing: 0.3,
    },
    skeletonCard: {
        borderWidth: 1,
    },
    emptyContainer: {
        marginHorizontal: getResponsiveSpacing(22),
        marginTop: getResponsiveSpacing(8),
        padding: getResponsiveSpacing(16),
        borderRadius: getResponsiveSpacing(20),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        minHeight: scaleHeight(160),
    },
    emptyText: {
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    startBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: theme.colors.primary,
        borderRadius: 30,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    startBtnText: {
        color: '#000',
        fontWeight: '700',
        fontFamily: 'Barlow_700Bold',
    },
    lowerActionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: getResponsiveSpacing(8),
    },
    primaryActionButton: {
        backgroundColor: theme.colors.primary,
        paddingHorizontal: getResponsiveSpacing(16),
        paddingVertical: getResponsiveSpacing(8),
        borderRadius: 20,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
    },
    primaryActionButtonIcon: {
        width: 40,
        height: 40,
        backgroundColor: theme.colors.primary,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
    },
    primaryActionText: {
        color: '#000',
        fontFamily: 'Barlow_700Bold',
        fontSize: getResponsiveFontSize(12),
        textTransform: 'uppercase',
    },
    secondaryActionButton: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        paddingHorizontal: getResponsiveSpacing(14),
        paddingVertical: getResponsiveSpacing(6),
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    secondaryActionText: {
        color: 'rgba(255,255,255,0.8)',
        fontFamily: 'Barlow_600SemiBold',
        fontSize: getResponsiveFontSize(11),
        textTransform: 'uppercase',
    },
});
