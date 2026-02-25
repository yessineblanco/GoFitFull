import React, { useEffect, useState, useRef, useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Animated } from "react-native";
import * as Location from "expo-location";
import { useCalendarStore } from "@/store/calendarStore";
import { useThemeStore } from "@/store/themeStore";
import { getTextColor, getTextColorWithOpacity, getOverlayColor } from "@/utils/colorUtils";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Cloud, CloudRain, Sun, CloudLightning, MapPin, Bell, Snowflake } from "lucide-react-native";
import { format } from "date-fns";

interface WeatherData {
    temperature: number;
    weatherCode: number;
}

const WeatherWidget: React.FC<{ showDate?: boolean }> = ({ showDate = true }) => {
    const { isDark } = useThemeStore();
    const todayIso = new Date().toISOString().split("T")[0];
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [address, setAddress] = useState<string>("Paris"); // Default

    const fadeAnim = useRef(new Animated.Value(0)).current;

    // 1. Get Location
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setErrorMsg('Location permission denied');
                return;
            }

            try {
                let location = await Location.getCurrentPositionAsync({});
                setLocation(location);

                let reverseGeocode = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });

                if (reverseGeocode.length > 0) {
                    setAddress(reverseGeocode[0].city || reverseGeocode[0].region || "Unknown");
                }
            } catch (err) {
                console.error("Location retrieval failed", err);
            }
        })();
    }, []);

    // 2. Fetch Weather
    useEffect(() => {
        if (!location) return;

        const fetchWeather = async () => {
            setLoading(true);
            try {
                const { latitude, longitude } = location.coords;
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`
                );
                const data = await response.json();

                const dates = data.daily.time;
                const index = dates.indexOf(todayIso);

                if (index !== -1) {
                    setWeather({
                        temperature: data.daily.temperature_2m_max[index],
                        weatherCode: data.daily.weathercode[index]
                    });

                    // Trigger fade in
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }).start();
                } else {
                    setWeather(null);
                }
            } catch (err) {
                console.error("Weather fetch failed", err);
            } finally {
                setLoading(false);
            }
        };

        fetchWeather();
    }, [location, todayIso]);


    const getWeatherIcon = (code: number) => {
        const size = 32;
        if (code === 0 || code === 1) return <Sun size={size} color="#a3e635" />;
        if (code === 2 || code === 3) return <Cloud size={size} color="#888" />;
        if (code >= 45 && code <= 48) return <Cloud size={size} color="#888" />;
        if (code >= 51 && code <= 67) return <CloudRain size={size} color="#60a5fa" />;
        if (code >= 71 && code <= 77) return <Snowflake size={size} color="#fff" />;
        if (code >= 80 && code <= 82) return <CloudRain size={size} color="#60a5fa" />;
        if (code >= 95) return <CloudLightning size={size} color="#facc15" />;
        return <Sun size={size} color="#a3e635" />;
    };

    const getWeatherDescription = (code: number) => {
        if (code === 0) return "Sunny";
        if (code >= 1 && code <= 3) return "Cloudy";
        if (code >= 51 && code <= 67) return "Rainy";
        if (code >= 71 && code <= 77) return "Snowy";
        return "Clear";
    };

    return (
        <View style={styles.outerContainer}>
            <View style={styles.mainContainer}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#a3e635" />
                    </View>
                ) : weather ? (
                    <Animated.View style={[styles.contentRow, { opacity: fadeAnim }]}>
                        <View style={styles.weatherInfo}>
                            <View style={styles.tempRow}>
                                <Text style={[styles.tempText, { color: getTextColor(isDark) }]}>{Math.round(weather.temperature)}°C</Text>
                                <View style={styles.weatherIndicator}>
                                    {getWeatherIcon(weather.weatherCode)}
                                </View>
                            </View>

                            <View style={styles.metaRow}>
                                {showDate && (
                                    <>
                                        <Text style={styles.dateText}>
                                            {format(new Date(), "EEEE, MMM d")}
                                        </Text>
                                        <View style={[styles.dot, { backgroundColor: getOverlayColor(isDark, 0.2) }]} />
                                    </>
                                )}
                                <Text style={[styles.conditionText, { color: getTextColorWithOpacity(isDark, 0.5) }]}>{getWeatherDescription(weather.weatherCode)}</Text>
                                <View style={[styles.dot, { backgroundColor: getOverlayColor(isDark, 0.2) }]} />
                                <View style={styles.locationContainer}>
                                    <MapPin size={10} color={getTextColorWithOpacity(isDark, 0.4)} />
                                    <Text style={[styles.locationText, { color: getTextColorWithOpacity(isDark, 0.4) }]}>{address}</Text>
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity style={[styles.notificationButton, { backgroundColor: getOverlayColor(isDark, 0.06), borderColor: getOverlayColor(isDark, 0.1) }]} activeOpacity={0.7}>
                            <Bell size={18} color="#a3e635" />
                            <View style={[styles.notificationBadge, { backgroundColor: '#a3e635' }]} />
                        </TouchableOpacity>
                    </Animated.View>
                ) : (
                    <View style={styles.errorContainer}>
                        <Text style={[styles.errorText, { color: getTextColorWithOpacity(isDark, 0.3) }]}>{errorMsg || "Weather data pending..."}</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    mainContainer: {
        minHeight: 80,
        justifyContent: 'center',
    },
    loadingContainer: {
        height: 60,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    weatherInfo: {
        flex: 1,
    },
    tempRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    tempText: {
        fontSize: 32,
        color: '#fff',
        fontFamily: 'Barlow_700Bold',
        letterSpacing: -1,
    },
    weatherIndicator: {
        marginTop: 0,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dateText: {
        fontSize: 11,
        color: '#a3e635',
        fontFamily: 'Barlow_600SemiBold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    conditionText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'Barlow_500Medium',
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.4)',
        fontFamily: 'Barlow_500Medium',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 6,
        height: 6,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: '#000',
    },
    errorContainer: {
        justifyContent: 'center',
    },
    errorText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 12,
        fontStyle: 'italic',
    },
    bottomDivider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.06)',
        marginTop: 16,
    }
});

export default WeatherWidget;

