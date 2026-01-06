import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { theme } from '@/theme';
import { useSessionsStore } from '@/store/sessionsStore';
import { Calendar, Clock, ChevronRight, Dumbbell } from 'lucide-react-native';
import { getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';

export const RecentActivity: React.FC = () => {
    const { t } = useTranslation();
    const { sessions } = useSessionsStore();

    const recentSessions = sessions.slice(0, 3);

    // Stagger animation for cards
    const cardAnims = useRef(
        recentSessions.map(() => new Animated.Value(0))
    ).current;

    useEffect(() => {
        if (recentSessions.length > 0) {
            const animations = cardAnims.slice(0, recentSessions.length).map((anim, index) =>
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 400,
                    delay: index * 100,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                })
            );
            Animated.stagger(100, animations).start();
        }
    }, [recentSessions.length]);

    if (!recentSessions || recentSessions.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Text style={styles.sectionTitle}>Last Session</Text>
                </View>
                <BlurView intensity={5} tint="dark" style={styles.emptyCard}>
                    <Dumbbell size={32} color="rgba(255, 255, 255, 0.2)" />
                    <Text style={styles.emptyText}>{t('home.noRecentActivity')}</Text>
                </BlurView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>Last Session</Text>
                <TouchableOpacity>
                    <Text style={styles.viewAll}>{t('home.viewAll')}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.list}>
                {recentSessions.map((session: any, index: number) => {
                    const translateX = cardAnims[index]?.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                    }) || 0;

                    return (
                        <Animated.View
                            key={session.id || index}
                            style={{
                                opacity: cardAnims[index] || 1,
                                transform: [{ translateX }],
                            }}
                        >
                            <TouchableOpacity activeOpacity={0.8} style={styles.cardTouchable}>
                                <BlurView intensity={10} tint="dark" style={styles.card}>
                                    {/* Icon - Demoted to Outlined */}
                                    <View style={styles.iconCircle}>
                                        <Dumbbell size={18} color="rgba(255,255,255,0.7)" strokeWidth={2.5} />
                                    </View>

                                    {/* Details */}
                                    <View style={styles.details}>
                                        <Text style={styles.workoutName} numberOfLines={1}>
                                            {session.workout?.name || 'Workout'}
                                        </Text>
                                        <View style={styles.metaRow}>
                                            <Calendar size={11} color="rgba(255, 255, 255, 0.5)" />
                                            <Text style={styles.metaText}>
                                                {new Date(session.date).toLocaleDateString()}
                                            </Text>
                                            <Text style={styles.separator}>•</Text>
                                            <Clock size={11} color="rgba(255, 255, 255, 0.5)" />
                                            <Text style={styles.metaText}>
                                                {Math.round((session.duration || 0) / 60)} min
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Chevron */}
                                    <ChevronRight size={18} color="rgba(255, 255, 255, 0.3)" />
                                </BlurView>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: getResponsiveSpacing(16),
        marginTop: getResponsiveSpacing(20),
        marginBottom: getResponsiveSpacing(32),
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: getResponsiveSpacing(14),
    },
    sectionTitle: {
        fontFamily: 'Barlow_600SemiBold',
        fontSize: getResponsiveFontSize(16),
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    viewAll: {
        fontFamily: 'Barlow_600SemiBold',
        fontSize: getResponsiveFontSize(12),
        color: 'rgba(255, 255, 255, 0.5)', // Muted, not primary
        letterSpacing: 0.5,
    },
    list: {
        gap: getResponsiveSpacing(10),
    },
    cardTouchable: {
        borderRadius: getResponsiveSpacing(14),
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: getResponsiveSpacing(14),
        borderRadius: getResponsiveSpacing(14),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.04)', // Subtler border
    },
    iconCircle: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'transparent', // No background
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: getResponsiveSpacing(12),
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)', // White outline
    },
    details: {
        flex: 1,
    },
    workoutName: {
        fontFamily: 'Barlow_600SemiBold',
        fontSize: getResponsiveFontSize(14),
        color: 'rgba(255, 255, 255, 0.9)', // Slightly reduced opacity
        marginBottom: 4,
        letterSpacing: 0.2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontFamily: 'Barlow_400Regular',
        fontSize: getResponsiveFontSize(11),
        color: 'rgba(255, 255, 255, 0.5)',
    },
    separator: {
        color: 'rgba(255, 255, 255, 0.25)',
        marginHorizontal: 4,
    },
    emptyCard: {
        borderRadius: getResponsiveSpacing(14),
        padding: getResponsiveSpacing(32),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    emptyText: {
        fontFamily: 'Barlow_500Medium',
        fontSize: getResponsiveFontSize(13),
        color: 'rgba(255, 255, 255, 0.4)',
        marginTop: getResponsiveSpacing(12),
    },
});
