import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { User, Dumbbell, Scale, Bell, Sun, Cloud, CloudRain } from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useSessionsStore } from '@/store/sessionsStore';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { useThemeStore } from '@/store/themeStore';
import { getBackgroundColor, getTextColor, getTextSecondaryColor, getTextLightColor, getSurfaceColor, getGlassBg, getGlassBorder, getBlurTint, getOverlayColor } from '@/utils/colorUtils';

export const HomeHeader: React.FC = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { user } = useAuthStore();
    const { profilePictureUri, profile } = useProfileStore();
    const { getWeeklySessionCount, getStreak } = useSessionsStore();
    const { t } = useTranslation();
    const { isDark } = useThemeStore();

    const sessions = useSessionsStore(state => state.sessions);
    const weeklyWorkouts = getWeeklySessionCount();
    const streak = getStreak();

    const [weather, setWeather] = React.useState<{ temp: number; code: number; location: string } | null>(null);

    React.useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;

                const location = await Location.getCurrentPositionAsync({});
                const { latitude, longitude } = location.coords;

                const weatherResponse = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
                );
                const weatherData = await weatherResponse.json();

                const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
                const city = geocode[0]?.city || geocode[0]?.region || 'Unknown';

                if (weatherData.current_weather) {
                    setWeather({
                        temp: Math.round(weatherData.current_weather.temperature),
                        code: weatherData.current_weather.weathercode,
                        location: city
                    });
                }
            } catch (err) {
                console.error('Weather fetch failed', err);
            }
        })();
    }, []);

    const weight = profile?.weight ? `${profile.weight} ${profile.weight_unit || 'kg'}` : '--';

    const userName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
    const profileImage = profilePictureUri || user?.user_metadata?.profile_picture_url;

    const getWeatherIcon = (code: number) => {
        const size = 14;
        if (code === 0 || code === 1) return <Sun size={size} color={theme.colors.primary} />;
        if (code >= 51 && code <= 67) return <CloudRain size={size} color={theme.colors.primary} />;
        return <Cloud size={size} color={theme.colors.primary} />;
    };

    const currentDate = new Date().toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });

    const handleProfilePress = () => {
        navigation.navigate('Profile');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + getResponsiveSpacing(10) }]}>
            <View style={styles.topRow}>
                <TouchableOpacity
                    onPress={handleProfilePress}
                    activeOpacity={0.8}
                    style={styles.profileButton}
                    accessibilityRole="button"
                    accessibilityLabel="View profile"
                    accessibilityHint="Opens your profile settings and information"
                >
                    <View style={styles.avatarContainer}>
                        {profileImage ? (
                            <Image
                                source={{ uri: profileImage }}
                                style={styles.avatar}
                                key={profileImage}
                                placeholder={{ blurhash: 'LGF5]+Yk^6#M@-5c,1J5@[or[Q6.' }}
                                placeholderContentFit="cover"
                                contentFit="cover"
                            />
                        ) : (
                            <View style={[styles.placeholderAvatar, {
                                backgroundColor: getGlassBg(isDark),
                                borderColor: getGlassBorder(isDark),
                            }]}>
                                <User size={24} color={theme.colors.primary} strokeWidth={2.5} />
                            </View>
                        )}
                        <View style={[styles.onlineStatus, { borderColor: getBackgroundColor(isDark) }]} />
                    </View>
                </TouchableOpacity>

                <View style={styles.greetingContainer}>
                    <View style={styles.helloRow}>
                        <Text
                            style={[styles.helloText, { color: getTextColor(isDark) }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                        >
                            Hello {userName.split(' ')[0]}
                        </Text>
                    </View>
                    <Text style={[styles.subGreetingText, { color: getTextLightColor(isDark) }]}>Get ready for today</Text>
                </View>

                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Notifications"
                        accessibilityHint="View your notifications and alerts"
                        onPress={() => navigation.navigate('NotificationInbox')}
                    >
                        <BlurView intensity={isDark ? 20 : 40} tint={getBlurTint(isDark)} style={[styles.iconBlur, { backgroundColor: getSurfaceColor(isDark) }]}>
                            <Bell size={20} color={getTextColor(isDark)} strokeWidth={2} />
                            <View style={styles.notificationBadge} />
                        </BlurView>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.iconButton}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Workout streak: ${streak} days`}
                        accessibilityHint="View your workout streak and achievements"
                    >
                        <BlurView intensity={isDark ? 20 : 40} tint={getBlurTint(isDark)} style={[styles.iconBlur, { backgroundColor: getSurfaceColor(isDark) }]}>
                            <Text
                                style={[
                                    styles.streakGlyph,
                                    { color: streak > 0 ? theme.colors.primary : getTextSecondaryColor(isDark) },
                                ]}
                                numberOfLines={1}
                            >
                                {streak}
                            </Text>
                        </BlurView>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.infoRow}>
                <View style={styles.infoContent}>
                    <Text style={styles.dateText}>{currentDate}</Text>

                    <View style={styles.statsRow}>
                        <View style={[styles.statChip, {
                            backgroundColor: getSurfaceColor(isDark),
                            borderColor: getGlassBorder(isDark),
                        }]}>
                            <Dumbbell size={12} color={theme.colors.primary} />
                            <Text style={[styles.statText, { color: getTextSecondaryColor(isDark) }]}>{weeklyWorkouts} Workouts</Text>
                        </View>
                        <View style={[styles.statChip, {
                            backgroundColor: getSurfaceColor(isDark),
                            borderColor: getGlassBorder(isDark),
                        }]}>
                            <Scale size={12} color={theme.colors.primary} />
                            <Text style={[styles.statText, { color: getTextSecondaryColor(isDark) }]}>{weight}</Text>
                        </View>
                        {weather && (
                            <View style={[styles.statChip, {
                                backgroundColor: getSurfaceColor(isDark),
                                borderColor: getGlassBorder(isDark),
                            }]}>
                                {getWeatherIcon(weather.code)}
                                <Text style={[styles.statText, { color: getTextSecondaryColor(isDark) }]} numberOfLines={1}>
                                    {weather.temp}° • {weather.location}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: getResponsiveSpacing(22),
        paddingBottom: getResponsiveSpacing(20),
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: getResponsiveSpacing(16),
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 58,
        height: 58,
        borderRadius: 29,
        borderWidth: 2,
        borderColor: 'rgba(132, 196, 65, 0.4)',
    },
    placeholderAvatar: {
        width: 58,
        height: 58,
        borderRadius: 29,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    onlineStatus: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#4ade80',
        borderWidth: 2,
    },
    profileButton: {
        marginRight: getResponsiveSpacing(14),
    },
    greetingContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingRight: getResponsiveSpacing(10),
    },
    helloRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    helloText: {
        fontFamily: 'Barlow_800ExtraBold',
        fontSize: getResponsiveFontSize(32),
        letterSpacing: 1,
    },
    subGreetingText: {
        fontFamily: 'Barlow_400Regular',
        fontSize: getResponsiveFontSize(theme.typography.body.fontSize),
        marginTop: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: getResponsiveSpacing(8),
    },
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        overflow: 'hidden',
    },
    iconBlur: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationBadge: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ff4757',
    },
    streakGlyph: {
        fontFamily: 'Barlow_800ExtraBold',
        fontSize: getResponsiveFontSize(17),
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    infoContent: {
        flex: 1,
    },
    dateText: {
        fontFamily: 'Barlow_500Medium',
        fontSize: getResponsiveFontSize(theme.typography.small.fontSize),
        color: theme.colors.primary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: getResponsiveSpacing(8),
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: getResponsiveSpacing(8),
    },
    statChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: getResponsiveSpacing(8),
        paddingVertical: getResponsiveSpacing(10),
        borderRadius: getResponsiveSpacing(20),
        borderWidth: 1,
    },
    statText: {
        fontFamily: 'Barlow_500Medium',
        fontSize: getResponsiveFontSize(theme.typography.small.fontSize),
    },
});
