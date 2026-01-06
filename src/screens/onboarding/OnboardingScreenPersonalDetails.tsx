import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
    OnboardingProgressBar,
    OnboardingNavigationButtons,
} from '@/components/onboarding';
import { useOnboardingStore } from '@/store/onboardingStore';
import type { OnboardingStackParamList } from '@/types';
import { getResponsiveFontSize, getResponsiveSpacing, scaleWidth, scaleHeight } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';
import { theme } from '@/theme';

type NavigationProp = StackNavigationProp<OnboardingStackParamList>;

// Types
type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export const OnboardingScreenPersonalDetails: React.FC = () => {
    const navigation = useNavigation<NavigationProp>();
    const { t } = useTranslation();
    const { setOnboardingData, getOnboardingData } = useOnboardingStore();
    const insets = useSafeAreaInsets();

    // State
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState<Gender | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;

    // Initialize with existing data
    useEffect(() => {
        const data = getOnboardingData();
        if (data.displayName) setName(data.displayName);
        if (data.age) setAge(data.age.toString());
        if (data.gender) setGender(data.gender);

        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.spring(slideAnim, { toValue: 0, tension: 40, friction: 8, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleNext = useCallback(async () => {
        if (!name.trim() || !age.trim() || !gender) return;

        setIsLoading(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Save to store
        setOnboardingData({
            displayName: name.trim(),
            age: parseInt(age, 10),
            gender: gender,
        });

        setIsLoading(false);
        navigation.navigate('Onboarding4');
    }, [name, age, gender]);

    const handleBack = useCallback(() => {
        navigation.goBack();
    }, [navigation]);

    const handleGenderSelect = (selected: Gender) => {
        setGender(selected);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const isNextDisabled = !name.trim() || !age.trim() || !gender;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#030303', '#0d1a08', '#030303']}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
            />

            {/* Progress */}
            <View style={[styles.progressWrapper, { paddingTop: insets.top + getResponsiveSpacing(16) }]}>
                <OnboardingProgressBar currentStep={3.5} totalSteps={4} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    {/* Title */}
                    <Text style={styles.title}>{t('onboarding.personalDetails.title', 'Tell us about yourself')}</Text>
                    <Text style={styles.subtitle}>
                        {t('onboarding.personalDetails.subtitle', 'We use this to personalize your fitness plan.')}
                    </Text>

                    {/* Name Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('profileFields.name', 'Name')}</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="person-outline" size={20} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                            <TextInput
                                value={name}
                                onChangeText={setName}
                                placeholder="Your Name"
                                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                                style={styles.input}
                            />
                        </View>
                    </View>

                    {/* Age Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('profileFields.age', 'Age')}</Text>
                        <View style={styles.inputContainer}>
                            <Ionicons name="calendar-outline" size={20} color="rgba(255, 255, 255, 0.4)" style={styles.inputIcon} />
                            <TextInput
                                value={age}
                                onChangeText={(text) => setAge(text.replace(/[^0-9]/g, ''))}
                                placeholder="25"
                                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                                keyboardType="numeric"
                                maxLength={3}
                                style={styles.input}
                            />
                        </View>
                    </View>

                    {/* Gender Selection */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('profileFields.gender', 'Gender')}</Text>
                        <View style={styles.genderContainer}>
                            {[
                                { id: 'male', icon: 'male', label: t('profileFields.male', 'Male') },
                                { id: 'female', icon: 'female', label: t('profileFields.female', 'Female') },
                                { id: 'other', icon: 'happy-outline', label: t('profileFields.other', 'Other') },
                            ].map((option) => {
                                const isSelected = gender === option.id;
                                return (
                                    <TouchableOpacity
                                        key={option.id}
                                        style={[styles.genderCard, isSelected && styles.genderCardSelected]}
                                        onPress={() => handleGenderSelect(option.id as Gender)}
                                    >
                                        <Ionicons
                                            name={option.icon as any}
                                            size={24}
                                            color={isSelected ? '#030303' : 'rgba(255, 255, 255, 0.6)'}
                                        />
                                        <Text style={[styles.genderText, isSelected && styles.genderTextSelected]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Navigation */}
            <View style={[styles.navigationWrapper, { paddingBottom: insets.bottom + getResponsiveSpacing(24) }]}>
                <OnboardingNavigationButtons
                    onBack={handleBack}
                    onNext={handleNext}
                    isLoading={isLoading}
                    isNextDisabled={isNextDisabled || isLoading}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030303',
    },
    progressWrapper: {
        paddingHorizontal: getResponsiveSpacing(24),
        marginBottom: getResponsiveSpacing(10),
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        paddingHorizontal: getResponsiveSpacing(24),
        paddingTop: getResponsiveSpacing(20),
    },
    title: {
        fontFamily: 'Barlow_600SemiBold',
        fontSize: getResponsiveFontSize(24),
        textAlign: 'center',
        color: '#FFFFFF',
        marginBottom: getResponsiveSpacing(8),
    },
    subtitle: {
        fontFamily: 'Barlow_400Regular',
        fontSize: getResponsiveFontSize(14),
        textAlign: 'center',
        color: 'rgba(255, 255, 255, 0.6)',
        marginBottom: getResponsiveSpacing(32),
    },
    inputGroup: {
        marginBottom: getResponsiveSpacing(24),
    },
    label: {
        fontFamily: 'Barlow_600SemiBold',
        fontSize: getResponsiveFontSize(14),
        color: '#FFFFFF',
        marginBottom: getResponsiveSpacing(12),
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        height: 56,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        fontFamily: 'Barlow_500Medium',
        fontSize: getResponsiveFontSize(16),
    },
    genderContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    genderCard: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        gap: 8,
    },
    genderCardSelected: {
        backgroundColor: '#84c441',
        borderColor: '#84c441',
    },
    genderText: {
        fontFamily: 'Barlow_500Medium',
        fontSize: getResponsiveFontSize(13),
        color: 'rgba(255, 255, 255, 0.6)',
    },
    genderTextSelected: {
        color: '#030303',
        fontFamily: 'Barlow_600SemiBold',
    },
    navigationWrapper: {
        paddingHorizontal: getResponsiveSpacing(20),
        paddingTop: 10,
    },
});
