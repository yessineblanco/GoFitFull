import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { theme } from '@/theme';
import { Scale, Plus, Timer, Award } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';

interface QuickAction {
    id: string;
    label: string;
    icon: any;
    gradientColors: readonly [string, string];
    onPress: () => void;
}

export const QuickActions: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<any>();

    // Stagger animation for each card
    const cardAnims = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current;

    useEffect(() => {
        // Stagger entrance animations
        const animations = cardAnims.map((anim, index) =>
            Animated.timing(anim, {
                toValue: 1,
                duration: 400,
                delay: index * 80,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            })
        );
        Animated.stagger(80, animations).start();
    }, []);

    const actions: QuickAction[] = [
        {
            id: 'weight',
            label: t('home.logWeight'),
            icon: Scale,
            gradientColors: ['#84c441', '#7db63a'] as const,
            onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Profile', { screen: 'EditBodyMetrics' });
            },
        },
        {
            id: 'create',
            label: t('home.createWorkout'),
            icon: Plus,
            gradientColors: ['#9b59b6', '#8e44ad'] as const,
            onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Library', { screen: 'CreateWorkout' });
            },
        },
        {
            id: 'timer',
            label: t('home.timer'),
            icon: Timer,
            gradientColors: ['#3498db', '#2980b9'] as const,
            onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // TODO: Open standalone timer modal
            },
        },
        {
            id: 'achievements',
            label: 'Achievements',
            icon: Award,
            gradientColors: ['#e74c3c', '#c0392b'] as const,
            onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('Progress');
            },
        },
    ];

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
            <View style={styles.grid}>
                {actions.map((action, index) => {
                    const translateY = cardAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                    });

                    return (
                        <Animated.View
                            key={action.id}
                            style={[
                                styles.cardWrapper,
                                {
                                    opacity: cardAnims[index],
                                    transform: [{ translateY }],
                                },
                            ]}
                        >
                            <TouchableOpacity
                                onPress={action.onPress}
                                activeOpacity={0.8}
                                style={styles.touchable}
                            >
                                <BlurView intensity={15} tint="dark" style={styles.card}>
                                    <LinearGradient
                                        colors={action.gradientColors}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.iconContainer}
                                    >
                                        <action.icon size={22} color="#FFFFFF" strokeWidth={2.5} />
                                    </LinearGradient>
                                    <Text style={styles.label}>{action.label}</Text>
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
        marginBottom: getResponsiveSpacing(12),
    },
    sectionTitle: {
        fontFamily: 'Barlow_600SemiBold',
        fontSize: getResponsiveFontSize(16),
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: getResponsiveSpacing(14),
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: getResponsiveSpacing(12),
    },
    cardWrapper: {
        width: '48%', // Approximate 50% minus gap
        minWidth: 160,
    },
    touchable: {
        borderRadius: getResponsiveSpacing(28),
        overflow: 'hidden',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    card: {
        borderRadius: getResponsiveSpacing(28),
        padding: getResponsiveSpacing(18),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        minHeight: 110,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: getResponsiveSpacing(12),
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    label: {
        fontFamily: 'Barlow_600SemiBold',
        fontSize: getResponsiveFontSize(13),
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
});
