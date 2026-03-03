import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '@/store/themeStore';

interface ShimmerProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: any;
}

export const Shimmer: React.FC<ShimmerProps> = ({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style
}) => {
    const { isDark } = useThemeStore();
    const animatedValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(animatedValue, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const translateX = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-300, 300],
    });

    const baseBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    const shimmerColors: [string, string, string] = isDark
        ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']
        : ['rgba(0,0,0,0.03)', 'rgba(0,0,0,0.08)', 'rgba(0,0,0,0.03)'];

    return (
        <View style={[{ width, height, borderRadius, overflow: 'hidden', backgroundColor: baseBg }, style]}>
            <Animated.View style={{ transform: [{ translateX }], flex: 1 }}>
                <LinearGradient
                    colors={shimmerColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ flex: 1 }}
                />
            </Animated.View>
        </View>
    );
};

export const StatCardSkeleton = () => {
    const { isDark } = useThemeStore();
    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    return (
        <View style={{ padding: 12, backgroundColor: cardBg, borderRadius: 12, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: 'rgba(132, 196, 65, 0.3)' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Shimmer width={32} height={32} borderRadius={8} />
                <View style={{ flex: 1 }}>
                    <Shimmer width="60%" height={12} style={{ marginBottom: 6 }} />
                    <Shimmer width="40%" height={16} />
                </View>
            </View>
        </View>
    );
};

export const ChartSkeleton = ({ height = 240 }: { height?: number }) => {
    const { isDark } = useThemeStore();
    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    return (
        <View style={{ padding: 20, backgroundColor: cardBg, borderRadius: 20, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <Shimmer width={20} height={20} borderRadius={4} />
                <Shimmer width={120} height={18} />
            </View>
            <Shimmer width="100%" height={height} borderRadius={12} />
        </View>
    );
};

export const PRCardSkeleton = () => {
    const { isDark } = useThemeStore();
    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    return (
        <View style={{ padding: 16, backgroundColor: cardBg, borderRadius: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: 'rgba(132, 196, 65, 0.3)' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                    <Shimmer width={40} height={40} borderRadius={10} />
                    <View style={{ flex: 1 }}>
                        <Shimmer width="70%" height={16} style={{ marginBottom: 6 }} />
                        <Shimmer width="40%" height={12} />
                    </View>
                </View>
                <Shimmer width={60} height={20} />
            </View>
        </View>
    );
};

export const SkeletonCoachCard = () => {
    const { isDark } = useThemeStore();
    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: cardBg, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
            <Shimmer width={64} height={64} borderRadius={12} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
                <Shimmer width="60%" height={16} style={{ marginBottom: 8 }} />
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                    <Shimmer width={50} height={20} borderRadius={10} />
                    <Shimmer width={45} height={20} borderRadius={10} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Shimmer width={40} height={14} />
                    <Shimmer width={50} height={14} />
                </View>
            </View>
            <Shimmer width={48} height={24} borderRadius={8} />
        </View>
    );
};

export const SkeletonConversationRow = () => {
    const { isDark } = useThemeStore();
    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: cardBg, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <Shimmer width={48} height={48} borderRadius={24} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
                <Shimmer width="50%" height={16} style={{ marginBottom: 6 }} />
                <Shimmer width="80%" height={12} />
            </View>
            <Shimmer width={36} height={12} borderRadius={4} />
        </View>
    );
};

export const SkeletonCoachDetail = () => {
    const { isDark } = useThemeStore();
    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    return (
        <View style={{ padding: 24 }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Shimmer width={100} height={100} borderRadius={50} style={{ marginBottom: 12 }} />
                <Shimmer width={140} height={22} style={{ marginBottom: 16 }} />
                <View style={{ flexDirection: 'row', gap: 20 }}>
                    <Shimmer width={60} height={40} borderRadius={8} />
                    <Shimmer width={60} height={40} borderRadius={8} />
                    <Shimmer width={60} height={40} borderRadius={8} />
                </View>
            </View>
            <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 20, marginBottom: 16 }}>
                <Shimmer width="70%" height={18} style={{ marginBottom: 12 }} />
                <Shimmer width="100%" height={60} borderRadius={12} />
            </View>
            <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 20 }}>
                <Shimmer width="50%" height={18} style={{ marginBottom: 12 }} />
                <Shimmer width="100%" height={80} borderRadius={12} />
            </View>
        </View>
    );
};

export const SkeletonClientRow = () => {
    const { isDark } = useThemeStore();
    const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: cardBg, borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <Shimmer width={48} height={48} borderRadius={24} style={{ marginRight: 14 }} />
            <View style={{ flex: 1 }}>
                <Shimmer width="55%" height={16} style={{ marginBottom: 8 }} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Shimmer width={70} height={20} borderRadius={10} />
                    <Shimmer width={90} height={14} />
                </View>
            </View>
        </View>
    );
};
