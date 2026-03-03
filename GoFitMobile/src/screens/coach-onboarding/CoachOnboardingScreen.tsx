import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { CoachOnboardingStackParamList } from '@/types';
import { useCoachStore } from '@/store/coachStore';
import { COACH_SPECIALTIES } from '@/services/coachProfile';
import { CustomButton } from '@/components/auth';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<CoachOnboardingStackParamList>;

const PRIMARY_GREEN = '#B4F04E';

const CANCELLATION_POLICIES = [
  { id: 'flexible', hoursLabel: '2h' },
  { id: 'moderate', hoursLabel: '24h' },
  { id: 'strict', hoursLabel: '48h' },
] as const;

export const CoachOnboardingScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { setOnboardingData, getOnboardingData } = useCoachStore();

  const savedData = getOnboardingData();
  const [bio, setBio] = useState(savedData.bio || '');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(savedData.specialties || []);
  const [hourlyRate, setHourlyRate] = useState(savedData.hourly_rate?.toString() || '');
  const [cancellationPolicy, setCancellationPolicy] = useState<'flexible' | 'moderate' | 'strict'>(
    savedData.cancellation_policy || 'flexible'
  );

  const toggleSpecialty = (specialty: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSpecialties((prev) =>
      prev.includes(specialty)
        ? prev.filter((s) => s !== specialty)
        : [...prev, specialty]
    );
  };

  const isValid = bio.trim().length >= 10 && selectedSpecialties.length > 0 && parseFloat(hourlyRate) > 0;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOnboardingData({
      bio: bio.trim(),
      specialties: selectedSpecialties,
      hourly_rate: parseFloat(hourlyRate),
      cancellation_policy: cancellationPolicy,
    });
    navigation.navigate('CoachCVUpload');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#030303', '#0a1a0a', '#030303']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('coachOnboarding.profile.title')}</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>1/4</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Bio */}
        <Text style={styles.sectionTitle}>{t('coachOnboarding.profile.bioLabel')}</Text>
        <View style={styles.textAreaContainer}>
          <TextInput
            style={styles.textArea}
            value={bio}
            onChangeText={setBio}
            placeholder={t('coachOnboarding.profile.bioPlaceholder')}
            placeholderTextColor="rgba(255,255,255,0.3)"
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/500</Text>
        </View>

        {/* Specialties */}
        <Text style={styles.sectionTitle}>{t('coachOnboarding.profile.specialtiesLabel')}</Text>
        <View style={styles.chipsContainer}>
          {COACH_SPECIALTIES.map((specialty) => {
            const isSelected = selectedSpecialties.includes(specialty);
            return (
              <TouchableOpacity
                key={specialty}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleSpecialty(specialty)}
                activeOpacity={0.7}
              >
                {isSelected && <Check size={14} color="#000000" style={styles.chipCheck} />}
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {t(`coachOnboarding.specialties.${specialty}`)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Hourly Rate */}
        <Text style={styles.sectionTitle}>{t('coachOnboarding.profile.rateLabel')}</Text>
        <View style={styles.rateContainer}>
          <Text style={styles.currencySymbol}>€</Text>
          <TextInput
            style={styles.rateInput}
            value={hourlyRate}
            onChangeText={(text) => setHourlyRate(text.replace(/[^0-9.]/g, ''))}
            placeholder="0.00"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="decimal-pad"
            maxLength={7}
          />
          <Text style={styles.rateUnit}>/h</Text>
        </View>

        {/* Cancellation Policy */}
        <Text style={styles.sectionTitle}>{t('coachOnboarding.profile.policyLabel')}</Text>
        <View style={styles.policiesContainer}>
          {CANCELLATION_POLICIES.map((policy) => {
            const isSelected = cancellationPolicy === policy.id;
            return (
              <TouchableOpacity
                key={policy.id}
                style={[styles.policyCard, isSelected && styles.policyCardSelected]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCancellationPolicy(policy.id);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.policyName, isSelected && styles.policyNameSelected]}>
                  {t(`coachOnboarding.policies.${policy.id}`)}
                </Text>
                <Text style={[styles.policyDesc, isSelected && styles.policyDescSelected]}>
                  {t(`coachOnboarding.policies.${policy.id}Desc`, { hours: policy.hoursLabel })}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <CustomButton
          title={t('common.next')}
          onPress={handleNext}
          disabled={!isValid}
          variant="primary"
          style={styles.nextButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: { padding: 8 },
  headerTitle: {
    flex: 1,
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(20),
    color: '#FFFFFF',
    textAlign: 'center',
    marginRight: 40,
  },
  stepBadge: {
    backgroundColor: 'rgba(180, 240, 78, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(12),
    color: PRIMARY_GREEN,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  sectionTitle: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(16),
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 12,
  },
  textAreaContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  textArea: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(15),
    color: '#FFFFFF',
    minHeight: 100,
  },
  charCount: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'right',
    marginTop: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipSelected: {
    backgroundColor: PRIMARY_GREEN,
    borderColor: PRIMARY_GREEN,
  },
  chipCheck: { marginRight: 6 },
  chipText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255,255,255,0.8)',
  },
  chipTextSelected: { color: '#000000' },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  currencySymbol: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(24),
    color: PRIMARY_GREEN,
    marginRight: 8,
  },
  rateInput: {
    flex: 1,
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(24),
    color: '#FFFFFF',
    paddingVertical: 12,
  },
  rateUnit: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(16),
    color: 'rgba(255,255,255,0.5)',
  },
  policiesContainer: { gap: 12 },
  policyCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },
  policyCardSelected: {
    borderColor: PRIMARY_GREEN,
    backgroundColor: 'rgba(180, 240, 78, 0.08)',
  },
  policyName: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(15),
    color: '#FFFFFF',
    marginBottom: 4,
  },
  policyNameSelected: { color: PRIMARY_GREEN },
  policyDesc: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255,255,255,0.5)',
    lineHeight: getResponsiveFontSize(18),
  },
  policyDescSelected: { color: 'rgba(255,255,255,0.7)' },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: 'rgba(3,3,3,0.95)',
  },
  nextButton: { width: '100%' },
});
