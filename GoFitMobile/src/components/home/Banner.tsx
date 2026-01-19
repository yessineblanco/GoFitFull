import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Sparkles } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { getScaledFontSize } from '@/store/textSizeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { getTextColor } from '@/utils/colorUtils';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export const Banner: React.FC = () => {
    const { isDark } = useThemeStore();
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();

        // Continuous shimmer effect
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [scaleAnim, fadeAnim, shimmerAnim]);

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Navigate to challenges or featured content
    };

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-width, width],
    });

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={handlePress}
                style={styles.touchable}
            >
                <BlurView intensity={20} tint="dark" style={styles.blurContainer}>
                    {/* Gradient Background */}
                    <LinearGradient
                        colors={['rgba(132, 196, 65, 0.3)', 'rgba(132, 196, 65, 0.15)', 'rgba(132, 196, 65, 0.05)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* Shimmer Effect */}
                    <Animated.View
                        style={[
                            styles.shimmer,
                            {
                                transform: [{ translateX: shimmerTranslate }],
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={['transparent', 'rgba(255, 255, 255, 0.1)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>

                    {/* Content */}
                    <View style={styles.content}>
                        <View style={styles.textSection}>
                            <View style={styles.badge}>
                                <Sparkles size={12} color={theme.colors.primary} />
                                <Text style={styles.badgeText}>FEATURED</Text>
                            </View>
                            <Text style={styles.title}>Start Your 30-Day{'\n'}Challenge Today!</Text>
                            <Text style={styles.subtitle}>Transform your body with our proven workout plan</Text>
                        </View>

                        {/* CTA Button */}
                        <View style={styles.ctaButton}>
                            <LinearGradient
                                colors={[theme.colors.primary, '#7db63a']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.ctaGradient}
                            >
                                <Text style={styles.ctaText}>START NOW</Text>
                            </LinearGradient>
                        </View>
                    </View>
                </BlurView>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: getResponsiveSpacing(22),
        marginBottom: getResponsiveSpacing(24),
        borderRadius: getResponsiveSpacing(16),
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    touchable: {
        width: '100%',
        height: scaleHeight(180),
    },
    blurContainer: {
        flex: 1,
        borderRadius: getResponsiveSpacing(16),
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(132, 196, 65, 0.3)',
    },
    shimmer: {
        ...StyleSheet.absoluteFillObject,
        width: width * 0.3,
    },
    content: {
        flex: 1,
        padding: getResponsiveSpacing(20),
        justifyContent: 'space-between',
    },
    textSection: {
        flex: 1,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        backgroundColor: 'rgba(132, 196, 65, 0.2)',
        paddingHorizontal: getResponsiveSpacing(10),
        paddingVertical: getResponsiveSpacing(4),
        borderRadius: getResponsiveSpacing(12),
        marginBottom: getResponsiveSpacing(12),
    },
    badgeText: {
        fontSize: getScaledFontSize(10),
        fontWeight: '700',
        fontFamily: 'Barlow_700Bold',
        color: theme.colors.primary,
        letterSpacing: 1,
    },
    title: {
        fontSize: getResponsiveFontSize(24),
        fontWeight: '700',
        fontFamily: 'Barlow_700Bold',
        color: '#FFFFFF',
        marginBottom: getResponsiveSpacing(8),
        lineHeight: getResponsiveFontSize(28),
    },
    subtitle: {
        fontSize: getScaledFontSize(13),
        fontFamily: 'Barlow_400Regular',
        color: 'rgba(255, 255, 255, 0.7)',
        lineHeight: getScaledFontSize(18),
    },
    ctaButton: {
        alignSelf: 'flex-start',
        borderRadius: getResponsiveSpacing(10),
        overflow: 'hidden',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 4,
    },
    ctaGradient: {
        paddingHorizontal: getResponsiveSpacing(24),
        paddingVertical: getResponsiveSpacing(12),
    },
    ctaText: {
        fontSize: getScaledFontSize(14),
        fontWeight: '700',
        fontFamily: 'Barlow_700Bold',
        color: '#030303',
        letterSpacing: 1,
    },
});
