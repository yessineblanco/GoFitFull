import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { theme } from '@/theme';
import { useSessionsStore } from '@/store/sessionsStore';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';

const { width } = Dimensions.get('window');
const CARD_PADDING = 24;
const CIRCLE_SIZE = Math.min(width * 0.5, 200);
const STROKE_WIDTH = 14;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const WeeklyStatus: React.FC = () => {
    const { t } = useTranslation();
    const getWeeklySessionCount = useSessionsStore((state) => state.getWeeklySessionCount);

    const weeklyGoal = 4;
    const completed = getWeeklySessionCount();
    const progress = Math.min(completed / weeklyGoal, 1);

    // Animation values
    const progressAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 400,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start();

        // Progress ring animation
        Animated.timing(progressAnim, {
            toValue: progress,
            duration: 1200,
            delay: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start();
    }, [progress]);

    const strokeDashoffset = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [CIRCUMFERENCE, 0],
    });

    return (
        <Animated.View style={[styles.container, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
            <BlurView intensity={20} tint="dark" style={styles.card}>
                {/* Subtle gradient overlay */}
                <LinearGradient
                    colors={['rgba(132, 196, 65, 0.08)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />

                <View style={styles.content}>
                    {/* Circular Progress */}
                    <View style={styles.chartContainer}>
                        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
                            <Defs>
                                <SvgLinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <Stop offset="0%" stopColor="#84c441" stopOpacity="1" />
                                    <Stop offset="100%" stopColor="#6fa335" stopOpacity="1" />
                                </SvgLinearGradient>
                            </Defs>

                            <Circle
                                cx={CIRCLE_SIZE / 2}
                                cy={CIRCLE_SIZE / 2}
                                r={RADIUS}
                                stroke="rgba(255, 255, 255, 0.08)"
                                strokeWidth={STROKE_WIDTH}
                                fill="transparent"
                            />

                            <AnimatedCircle
                                cx={CIRCLE_SIZE / 2}
                                cy={CIRCLE_SIZE / 2}
                                r={RADIUS}
                                stroke="url(#progressGradient)"
                                strokeWidth={STROKE_WIDTH}
                                fill="transparent"
                                strokeDasharray={CIRCUMFERENCE}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                                rotation="-90"
                                origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
                            />
                        </Svg>

                        {/* Center Text */}
                        <View style={styles.centerTextContainer}>
                            <Text style={styles.countText}>
                                {completed}
                                <Text style={styles.goalText}>/{weeklyGoal}</Text>
                            </Text>
                            <Text style={styles.labelText}>{t('home.workoutsCompleted')}</Text>
                        </View>
                    </View>

                    {/* Title Below */}
                    <Text style={styles.title}>{t('home.weeklyGoal')}</Text>
                </View>
            </BlurView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: getResponsiveSpacing(16),
        marginTop: getResponsiveSpacing(20),
    },
    card: {
        borderRadius: getResponsiveSpacing(28),
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(132, 196, 65, 0.15)',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 6,
    },
    content: {
        alignItems: 'center',
        paddingVertical: getResponsiveSpacing(CARD_PADDING),
        paddingHorizontal: getResponsiveSpacing(CARD_PADDING),
    },
    chartContainer: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        marginBottom: getResponsiveSpacing(16),
    },
    centerTextContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    countText: {
        fontFamily: 'Barlow_700Bold',
        fontSize: getResponsiveFontSize(48),
        color: '#FFFFFF',
        letterSpacing: -2,
    },
    goalText: {
        fontFamily: 'Barlow_600SemiBold',
        fontSize: getResponsiveFontSize(32),
        color: 'rgba(255, 255, 255, 0.5)',
    },
    labelText: {
        fontFamily: 'Barlow_500Medium',
        fontSize: getResponsiveFontSize(11),
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    title: {
        fontFamily: 'Barlow_600SemiBold',
        fontSize: getResponsiveFontSize(16),
        color: '#FFFFFF',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
});
