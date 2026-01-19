import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/shared/AppText';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { theme as themeConfig } from '@/theme';

const BRAND_PRIMARY = themeConfig.colors.primary;

interface ScreenHeaderProps {
    title: string;
    subtitle?: string;
    showBack?: boolean;
    rightElement?: React.ReactNode;
    style?: any;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
    title,
    subtitle,
    showBack = false,
    rightElement,
    style
}) => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const { isDark } = useThemeStore();

    // Animated energy pulse
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <View
            style={[
                styles.container,
                { paddingTop: insets.top },
                style
            ]}
        >
            {/* Gradient Base Layer */}
            <LinearGradient
                colors={isDark ? [
                    'rgba(10, 18, 10, 0.95)',      // Dark green-black
                    'rgba(5, 10, 5, 0.92)',         // Darker
                ] : [
                    'rgba(250, 251, 252, 0.95)',    // Light background
                    'rgba(245, 247, 249, 0.92)',    // Slightly darker
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            {/* Glass Blur Overlay */}
            <BlurView
                intensity={isDark ? 40 : 60}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
            />

            {/* Diagonal Accent Stripes */}
            <View style={styles.stripeContainer}>
                <View style={styles.stripe1} />
                <View style={styles.stripe2} />
                <Animated.View
                    style={[
                        styles.stripe3,
                        {
                            backgroundColor: BRAND_PRIMARY,
                            opacity: pulseAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.3, 0.7]
                            })
                        }
                    ]}
                />
            </View>

            {/* Main Content */}
            <View style={styles.content}>
                {/* Back Button (Left) */}
                {showBack && navigation.canGoBack() && (
                    <TouchableOpacity
                        onPress={() => {
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            }
                        }}
                        style={[styles.backButton, { borderColor: isDark ? 'rgba(132, 196, 64, 0.3)' : 'rgba(132, 196, 64, 0.2)' }]}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <LinearGradient
                            colors={isDark ? ['rgba(132, 196, 64, 0.2)', 'rgba(132, 196, 64, 0.05)'] : ['rgba(132, 196, 64, 0.1)', 'rgba(132, 196, 64, 0.02)']}
                            style={StyleSheet.absoluteFill}
                        />
                        <ArrowLeft size={20} color={BRAND_PRIMARY} strokeWidth={2.5} />
                    </TouchableOpacity>
                )}

                {/* Centered Title */}
                <View style={styles.centerContainer}>
                    {/* Energy Line */}
                    <View style={styles.energyLineWrapper}>
                        <LinearGradient
                            colors={['#84c440', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.energyLine}
                        />
                    </View>

                    <AppText
                        style={[styles.title, { color: isDark ? '#FFFFFF' : '#030303' }]}
                        numberOfLines={1}
                    >
                        {title}
                    </AppText>
                </View>

                {/* Right Element */}
                {rightElement ? (
                    <View style={styles.rightContainer}>
                        {rightElement}
                    </View>
                ) : (
                    showBack && <View style={styles.rightSpacer} />
                )}
            </View>

            {/* Bottom Accent Line with Glow */}
            <View style={styles.bottomAccent}>
                {/* Glow effect */}
                <LinearGradient
                    colors={['transparent', 'rgba(132, 196, 64, 0.15)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.bottomGlow}
                />
                {/* Main line */}
                <LinearGradient
                    colors={['transparent', 'rgba(132, 196, 64, 0.6)', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.bottomGradientLine}
                />
            </View>

            {/* Corner Geometric Accent */}
            <View style={styles.cornerAccent} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        overflow: 'hidden',
        // Enhanced shadow for floating effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 12,
        // Subtle border for definition
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(132, 196, 64, 0.15)',
    },
    stripeContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    stripe1: {
        position: 'absolute',
        top: -20,
        right: -50,
        width: 150,
        height: 2,
        backgroundColor: 'rgba(132, 196, 64, 0.15)',
        transform: [{ rotate: '-45deg' }],
    },
    stripe2: {
        position: 'absolute',
        top: 30,
        right: -30,
        width: 100,
        height: 1.5,
        backgroundColor: 'rgba(132, 196, 64, 0.1)',
        transform: [{ rotate: '-45deg' }],
    },
    stripe3: {
        position: 'absolute',
        top: 50,
        right: -60,
        width: 120,
        height: 2.5,
        transform: [{ rotate: '-45deg' }],
    },
    content: {
        height: 70,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Center content naturally
        paddingHorizontal: 20,
        zIndex: 2,
        position: 'relative',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: 1,
        position: 'absolute',
        left: 20,
        zIndex: 3,
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    energyLineWrapper: {
        marginBottom: 6,
        alignItems: 'center',
    },
    energyLine: {
        height: 3,
        width: 40,
        borderRadius: 2,
    },
    title: {
        fontFamily: 'Barlow_700Bold',
        fontSize: 20, // Slightly smaller for better fit
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        fontWeight: '900',
        textShadowColor: 'rgba(132, 196, 64, 0.2)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
        textAlign: 'center',
    },
    rightContainer: {
        position: 'absolute',
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        zIndex: 3,
    },
    rightSpacer: {
        width: 44,
    },
    bottomAccent: {
        height: 3,
        width: '100%',
        zIndex: 2,
        position: 'relative',
    },
    bottomGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 8,
        opacity: 0.6,
    },
    bottomGradientLine: {
        flex: 1,
        height: 1.5,
    },
    cornerAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 4,
        height: 40,
        backgroundColor: '#84c440',
        shadowColor: '#84c440',
        shadowOpacity: 0.8,
        shadowRadius: 10,
        shadowOffset: { width: 1, height: 0 },
        borderTopRightRadius: 2,
        borderBottomRightRadius: 2,
    },
});
