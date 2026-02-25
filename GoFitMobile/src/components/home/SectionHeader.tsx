import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { ChevronRight } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { getScaledFontSize } from '@/store/textSizeStore';
import { getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { getTextColor, getTextColorWithOpacity } from '@/utils/colorUtils';

interface SectionHeaderProps {
    title: string;
    onSeeAllPress?: () => void;
    showSeeAll?: boolean;
    animationDelay?: number;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
    title,
    onSeeAllPress,
    showSeeAll = true,
    animationDelay = 0,
}) => {
    const { isDark } = useThemeStore();
    const slideAnim = useRef(new Animated.Value(-20)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                delay: animationDelay,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                delay: animationDelay,
                useNativeDriver: true,
            }),
        ]).start();
    }, [animationDelay, slideAnim, fadeAnim]);

    const BRAND_WHITE = getTextColor(isDark);

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateX: slideAnim }],
                },
            ]}
        >
            <Text style={[styles.title, { color: BRAND_WHITE }]}>{title}</Text>
            {showSeeAll && onSeeAllPress && (
                <TouchableOpacity
                    onPress={onSeeAllPress}
                    activeOpacity={0.7}
                >
                    <BlurView intensity={isDark ? 20 : 40} tint={isDark ? 'dark' : 'light'} style={[styles.glassPill, {
                        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.01)' : 'rgba(255, 255, 255, 0.6)',
                        borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        borderBottomColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
                        shadowColor: isDark ? 'rgb(41, 41, 41)' : 'rgba(0,0,0,0.15)',
                    }]}>
                        <Text style={styles.seeAllText}>See All</Text>
                        <ChevronRight size={14} color={theme.colors.primary} />
                    </BlurView>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: getResponsiveSpacing(22),
        marginBottom: getResponsiveSpacing(12),
    },
    title: {
        fontSize: getResponsiveFontSize(20),
        fontWeight: '700',
        fontFamily: 'Barlow_700Bold',
        letterSpacing: 0.5,
    },
    glassPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 100, // Pill shape

        // Deep Glass Effect
        backgroundColor: 'rgba(0, 0, 0, 0.01)', // Ultra subtle

        // Outer Shadow
        shadowColor: 'rgb(41, 41, 41)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 10,

        // Inner rim approximation
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderBottomColor: 'rgba(255,255,255,0.15)', // Simulates bottom inset
        marginBottom: 2, // Compensate for shadow
        overflow: 'visible', // allow shadow
    },
    seeAllText: {
        fontSize: getScaledFontSize(12),
        fontWeight: '600',
        fontFamily: 'Barlow_600SemiBold',
        color: theme.colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
