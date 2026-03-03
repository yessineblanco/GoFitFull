import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, ImageStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Star, ArrowUpRight } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '@/store/themeStore';
import { useMarketplaceStore } from '@/store/marketplaceStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { SectionHeader } from './SectionHeader';
import { useTranslation } from 'react-i18next';

const CARD_WIDTH = 135;
const CARD_HEIGHT = 190;

export const TopTrainers: React.FC = () => {
    const { isDark } = useThemeStore();
    const { topCoaches, loadTopCoaches } = useMarketplaceStore();
    const navigation = useNavigation<any>();
    const { t } = useTranslation();
    const [loading, setLoading] = React.useState(true);
    const scrollX = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        loadTopCoaches().finally(() => setLoading(false));
    }, []);

    const handleTrainerPress = (coachId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('CoachDetail', { coachId });
    };

    const handleSeeAll = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('Marketplace');
    };

    if (loading || topCoaches.length === 0) {
        return <View style={styles.container} />;
    }

    return (
        <View style={styles.container}>
            <SectionHeader
                title={t('marketplace.eliteTrainers')}
                onSeeAllPress={handleSeeAll}
                animationDelay={300}
            />

            <Animated.ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
                snapToInterval={scaleWidth(CARD_WIDTH) + getResponsiveSpacing(16)}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            >
                {topCoaches.map((coach, index) => {
                    const range = scaleWidth(CARD_WIDTH);
                    const inputRange = [
                        (index - 1) * range,
                        index * range,
                        (index + 1) * range,
                    ];

                    const scale = scrollX.interpolate({
                        inputRange,
                        outputRange: [0.95, 1, 0.95],
                        extrapolate: 'clamp',
                    });

                    const imageUri = coach.profile_picture_url || coach.user_profile_picture;

                    return (
                        <TouchableOpacity
                            key={coach.id}
                            activeOpacity={0.9}
                            onPress={() => handleTrainerPress(coach.id)}
                        >
                            <Animated.View style={[styles.cardWrapper, { transform: [{ scale }] }]}>
                                {imageUri ? (
                                    <Image
                                        source={{ uri: imageUri }}
                                        style={StyleSheet.absoluteFill as ImageStyle}
                                        contentFit="cover"
                                        transition={300}
                                        placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                                        placeholderContentFit="cover"
                                        recyclingKey={coach.id}
                                    />
                                ) : (
                                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a2a1a', alignItems: 'center', justifyContent: 'center' }]}>
                                        <Text style={{ fontFamily: 'Barlow_700Bold', fontSize: 32, color: theme.colors.primary }}>
                                            {(coach.display_name || '?')[0].toUpperCase()}
                                        </Text>
                                    </View>
                                )}

                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0.3 }}
                                    end={{ x: 0, y: 1 }}
                                />

                                <View style={styles.cardContent}>
                                    <View style={styles.topRow}>
                                        {coach.is_verified ? (
                                            <BlurView intensity={30} tint="light" style={styles.proBadge}>
                                                <Text style={styles.proText}>PRO</Text>
                                            </BlurView>
                                        ) : <View />}
                                        <BlurView intensity={20} tint="dark" style={styles.ratingPill}>
                                            <Star size={10} color={theme.colors.primary} fill={theme.colors.primary} />
                                            <Text style={styles.ratingText}>{coach.average_rating.toFixed(1)}</Text>
                                        </BlurView>
                                    </View>

                                    <View style={styles.bottomInfo}>
                                        <View style={styles.nameRow}>
                                            <Text style={styles.trainerName} numberOfLines={1}>{coach.display_name || '—'}</Text>
                                        </View>
                                        <View style={styles.specialtyRow}>
                                            <Text style={styles.specialtyText} numberOfLines={1}>
                                                {coach.specialties[0] ? t(`coachOnboarding.specialties.${coach.specialties[0]}`) : ''}
                                            </Text>
                                            <View style={styles.dot} />
                                            <Text style={styles.expText}>{coach.total_sessions}s</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.borderOverlay} />
                            </Animated.View>
                        </TouchableOpacity>
                    );
                })}
            </Animated.ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: getResponsiveSpacing(32),
    },
    scrollContent: {
        paddingHorizontal: getResponsiveSpacing(22),
        paddingBottom: getResponsiveSpacing(20),
    },
    cardWrapper: {
        width: scaleWidth(CARD_WIDTH),
        height: scaleHeight(CARD_HEIGHT),
        marginRight: getResponsiveSpacing(16),
        borderRadius: getResponsiveSpacing(20),
        overflow: 'hidden',
        backgroundColor: '#1a1a1a', // Fallback
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    cardContent: {
        flex: 1,
        padding: getResponsiveSpacing(12),
        justifyContent: 'space-between',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    proBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
    },
    proText: {
        fontSize: getResponsiveFontSize(9),
        fontFamily: 'Barlow_700Bold',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    ratingPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    ratingText: {
        color: '#FFF',
        fontSize: getResponsiveFontSize(10),
        fontFamily: 'Barlow_600SemiBold',
    },
    bottomInfo: {
        gap: 2,
        position: 'relative',
    },
    nameRow: {
        marginBottom: 2,
    },
    trainerName: {
        fontSize: getResponsiveFontSize(15),
        fontFamily: 'Barlow_700Bold',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    specialtyRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    specialtyText: {
        fontSize: getResponsiveFontSize(11),
        fontFamily: 'Barlow_400Regular',
        color: 'rgba(255,255,255,0.9)',
    },
    dot: {
        width: 2,
        height: 2,
        borderRadius: 1,
        backgroundColor: theme.colors.primary,
        marginHorizontal: 6,
    },
    expText: {
        fontSize: getResponsiveFontSize(11),
        fontFamily: 'Barlow_700Bold',
        color: theme.colors.primary,
    },
    borderOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: getResponsiveSpacing(20),
        pointerEvents: 'none',
    },
});
