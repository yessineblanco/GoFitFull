import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { theme } from '@/theme';
import { Play, ArrowRight, Zap } from 'lucide-react-native';
import { useWorkoutsStore } from '@/store/workoutsStore';
import { workoutService } from '@/services/workouts';
import { supabase } from '@/config/supabase';
import { getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { useThemeStore } from '@/store/themeStore';
import { getTextColor, getTextSecondaryColor, getGlassBg, getGlassBorder, getBlurTint } from '@/utils/colorUtils';

export const ActionCard: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();
    const { isDark } = useThemeStore();
    const [incompleteSession, setIncompleteSession] = useState<any>(null);

    // Animation
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        const checkSession = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const session = await workoutService.getLatestIncompleteWorkoutSession(user.id);
                setIncompleteSession(session);
            }
        };
        checkSession();
    }, []);

    useEffect(() => {
        // Entrance animation
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();

        // Subtle pulsing for "Start" state
        if (!incompleteSession) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.02,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 2000,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [incompleteSession]);

    const handlePress = () => {
        if (incompleteSession) {
            navigation.navigate('WorkoutSession', {
                sessionId: incompleteSession.id,
                workoutId: incompleteSession.workout_id
            });
        } else {
            navigation.navigate('Library');
        }
    };

    if (incompleteSession) {
        return (
            <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
                <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.touchable}>
                    <LinearGradient
                        colors={['#84c441', '#7db63a', '#6fa335']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.resumeCard}
                    >
                        {/* Subtle pattern overlay */}
                        <View style={styles.patternOverlay} />

                        <View style={styles.resumeContent}>
                            <View style={styles.resumeLeft}>
                                <View style={styles.playIconContainer}>
                                    <Play fill="#FFFFFF" stroke="none" size={22} />
                                </View>
                                <View>
                                    <Text style={styles.resumeLabel}>{t('home.resumeWorkout')}</Text>
                                    <Text style={styles.workoutName} numberOfLines={1}>
                                        {incompleteSession.workout?.name || 'Workout'}
                                    </Text>
                                </View>
                            </View>
                            <ArrowRight color="#FFFFFF" size={24} />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        );
    }

    return (
        <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }, { scale: pulseAnim }] }]}>
            <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.touchable}>
                <BlurView intensity={isDark ? 15 : 40} tint={getBlurTint(isDark)} style={[styles.startCard, {
                    borderColor: isDark ? 'rgba(132, 196, 65, 0.4)' : 'rgba(132, 196, 65, 0.3)',
                }]}>
                    <View style={styles.startContent}>
                        <View style={styles.startIconContainer}>
                            <Zap size={28} color={theme.colors.primary} fill={theme.colors.primary} />
                        </View>
                        <View style={styles.startTextContainer}>
                            <Text style={[styles.startTitle, { color: getTextColor(isDark) }]}>{t('home.startWorkout')}</Text>
                            <Text style={[styles.startSubtitle, { color: getTextSecondaryColor(isDark) }]}>{t('library.createFirstWorkout')}</Text>
                        </View>
                        <ArrowRight color={theme.colors.primary} size={20} />
                    </View>
                </BlurView>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: getResponsiveSpacing(16),
        marginTop: getResponsiveSpacing(20),
        marginBottom: getResponsiveSpacing(12),
    },
    touchable: {
        borderRadius: getResponsiveSpacing(18),
        overflow: 'hidden',
        // Dramatic shadow
        shadowColor: '#84c441',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
    },
    resumeCard: {
        borderRadius: getResponsiveSpacing(18),
        padding: getResponsiveSpacing(20),
        minHeight: 90,
    },
    patternOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    resumeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    resumeLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: getResponsiveSpacing(14),
    },
    playIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    resumeLabel: {
        fontFamily: 'Barlow_600SemiBold',
        fontSize: getResponsiveFontSize(12),
        color: 'rgba(255, 255, 255, 0.85)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 2,
    },
    workoutName: {
        fontFamily: 'Barlow_700Bold',
        fontSize: getResponsiveFontSize(18),
        color: '#FFFFFF',
        letterSpacing: -0.5,
    },
    startCard: {
        borderRadius: getResponsiveSpacing(18),
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(132, 196, 65, 0.4)',
        padding: getResponsiveSpacing(20),
        minHeight: 90,
    },
    startContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: getResponsiveSpacing(14),
    },
    startIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: 'rgba(132, 196, 65, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    startTextContainer: {
        flex: 1,
    },
    startTitle: {
        fontFamily: 'Barlow_600SemiBold',
        fontSize: getResponsiveFontSize(16),
        marginBottom: 2,
    },
    startSubtitle: {
        fontFamily: 'Barlow_400Regular',
        fontSize: getResponsiveFontSize(12),
    },
});
