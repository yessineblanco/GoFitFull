import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '@/store/themeStore';
import { getScaledFontSize } from '@/store/textSizeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import * as Haptics from 'expo-haptics';
import { SectionHeader } from './SectionHeader';
import { dialogManager } from '@/components/shared/CustomDialog';

const CARD_WIDTH = 155;
const CARD_HEIGHT = 200; // Slightly taller for better image aspect

interface Article {
    id: string;
    title: string;
    category: string;
    readTime: string;
    image: string;
}

const MOCK_ARTICLES: Article[] = [
    {
        id: '1',
        title: 'Mastering the Squat: Form & Power',
        category: 'Training',
        readTime: '6 min',
        image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=1000&fit=crop&q=80',
    },
    {
        id: '2',
        title: 'Nutrition for Peak Performance',
        category: 'Nutrition',
        readTime: '8 min',
        image: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&h=1000&fit=crop&q=80',
    },
    {
        id: '3',
        title: 'Sleep: The Ultimate Recovery Tool',
        category: 'Recovery',
        readTime: '5 min',
        image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&h=1000&fit=crop&q=80',
    },
    {
        id: '4',
        title: 'HIIT vs Steady State Cardio',
        category: 'Cardio',
        readTime: '10 min',
        image: 'https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800&h=1000&fit=crop&q=80',
    },
    {
        id: '5',
        title: 'Preventing Common Gym Injuries',
        category: 'Training',
        readTime: '7 min',
        image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=1000&fit=crop&q=80',
    },
    {
        id: '6',
        title: 'The Power of Mindset in Sport',
        category: 'Mindset',
        readTime: '6 min',
        image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=1000&fit=crop&q=80',
    },
];

export const ArticlesFeed: React.FC = () => {
    const { isDark } = useThemeStore();
    const animatedValues = useRef<Map<string, { opacity: Animated.Value; scale: Animated.Value }>>(new Map());

    useEffect(() => {
        // Initialize animations
        MOCK_ARTICLES.forEach((article, index) => {
            if (!animatedValues.current.has(article.id)) {
                animatedValues.current.set(article.id, {
                    opacity: new Animated.Value(0),
                    scale: new Animated.Value(0.95),
                });
            }
        });

        // Trigger staggered animations
        const animations = MOCK_ARTICLES.map((article, index) => {
            const anim = animatedValues.current.get(article.id);
            if (!anim) return null;

            return Animated.parallel([
                Animated.timing(anim.opacity, {
                    toValue: 1,
                    duration: 400,
                    delay: 800 + index * 70,
                    useNativeDriver: true,
                }),
                Animated.spring(anim.scale, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    delay: 800 + index * 70,
                    useNativeDriver: true,
                }),
            ]);
        });

        Animated.stagger(70, animations.filter(Boolean) as Animated.CompositeAnimation[]).start();
    }, []);

    const handleArticlePress = (article: Article) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        dialogManager.info(article.title, `${article.category} • ${article.readTime} read`);
    };

    const [imageErrors, setImageErrors] = React.useState<Set<string>>(new Set());

    const handleImageError = (articleId: string) => {
        setImageErrors(prev => new Set(prev).add(articleId));
    };

    return (
        <View style={styles.container}>
            <SectionHeader title="Articles You Might Like" showSeeAll={false} animationDelay={600} />

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                decelerationRate="fast"
            >
                {MOCK_ARTICLES.map((article, index) => {
                    const anim = animatedValues.current.get(article.id);
                    const hasImageError = imageErrors.has(article.id);

                    return (
                        <Animated.View
                            key={article.id}
                            style={[
                                styles.cardWrapper,
                                {
                                    opacity: anim?.opacity || 0,
                                    transform: [{ scale: anim?.scale || 0.95 }],
                                },
                            ]}
                        >
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => handleArticlePress(article)}
                                style={styles.card}
                            >
                                {/* Image or Gradient Fallback */}
                                {!hasImageError ? (
                                    <Image
                                        source={{ uri: article.image }}
                                        style={styles.cardImage}
                                        contentFit="cover"
                                        transition={300}
                                        onError={() => handleImageError(article.id)}
                                        placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                                        placeholderContentFit="cover"
                                        recyclingKey={article.id}
                                    />
                                ) : (
                                    <LinearGradient
                                        colors={['#2A5E3A', '#1A3A2A', '#0F1F17']}
                                        style={styles.cardImage}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                    />
                                )}

                                <LinearGradient
                                    colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
                                    style={StyleSheet.absoluteFill}
                                    start={{ x: 0, y: 0.3 }}
                                    end={{ x: 0, y: 1 }}
                                />

                                <View style={styles.cardContent}>
                                    <BlurView intensity={20} tint="dark" style={styles.categoryBadge}>
                                        <Text style={styles.categoryText}>{article.category}</Text>
                                    </BlurView>

                                    <View>
                                        <Text style={styles.articleTitle} numberOfLines={3}>
                                            {article.title}
                                        </Text>

                                        <View style={styles.readTimeContainer}>
                                            <Clock size={12} color="rgba(255, 255, 255, 0.6)" />
                                            <Text style={styles.readTime}>{article.readTime} read</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </ScrollView>
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
    cardWrapper: {
        marginLeft: getResponsiveSpacing(12),
    },
    card: {
        width: scaleWidth(CARD_WIDTH),
        height: scaleHeight(CARD_HEIGHT),
        borderRadius: getResponsiveSpacing(20),
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: '#1a1a1a',
    },
    cardImage: {
        ...StyleSheet.absoluteFillObject,
    },
    firstCard: {
        marginLeft: getResponsiveSpacing(22),
    },
    cardContent: {
        flex: 1,
        padding: getResponsiveSpacing(12),
        justifyContent: 'space-between',
    },
    categoryBadge: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingHorizontal: getResponsiveSpacing(8),
        paddingVertical: getResponsiveSpacing(4),
        borderRadius: getResponsiveSpacing(6),
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    categoryText: {
        fontSize: getScaledFontSize(9),
        fontWeight: '700',
        fontFamily: 'Barlow_700Bold',
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    articleTitle: {
        fontSize: getScaledFontSize(14),
        fontWeight: '700',
        fontFamily: 'Barlow_700Bold',
        color: '#FFFFFF',
        lineHeight: getScaledFontSize(18),
        marginBottom: getResponsiveSpacing(6),
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    readTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    readTime: {
        fontSize: getScaledFontSize(11),
        fontFamily: 'Barlow_400Regular',
        color: 'rgba(255, 255, 255, 0.8)',
    },
});
