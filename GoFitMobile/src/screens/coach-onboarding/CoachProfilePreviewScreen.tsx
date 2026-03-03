import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, User, Award, FileText, DollarSign, Shield, Star } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { CoachOnboardingStackParamList } from '@/types';
import { useCoachStore } from '@/store/coachStore';
import { useAuthStore } from '@/store/authStore';
import { CustomButton } from '@/components/auth';
import { toastManager } from '@/components/shared';
import { getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<CoachOnboardingStackParamList>;

const PRIMARY_GREEN = '#B4F04E';

export const CoachProfilePreviewScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { getOnboardingData, createProfile, addCertification, setCoachOnboardingCompleted, clearOnboardingData, profile } = useCoachStore();
  const { user } = useAuthStore();

  const [submitting, setSubmitting] = useState(false);
  const data = getOnboardingData();
  const certEntries = (route.params as any)?.certEntries || [];

  const handleSubmit = async () => {
    if (!data.bio || !data.specialties?.length || !data.hourly_rate) {
      toastManager.error(t('coachOnboarding.preview.incompleteData'));
      return;
    }

    setSubmitting(true);
    try {
      const createdProfile = await createProfile({
        bio: data.bio,
        specialties: data.specialties,
        hourly_rate: data.hourly_rate,
        cancellation_policy: data.cancellation_policy || 'flexible',
      });

      for (const cert of certEntries) {
        try {
          await addCertification(cert.name, cert.issuer, cert.docUri, cert.docName);
        } catch {
          // Non-critical, continue
        }
      }

      if (user?.id) {
        await setCoachOnboardingCompleted(user.id);
      }
      clearOnboardingData();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('CoachPending');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toastManager.error(error.message || t('coachOnboarding.preview.submitError'));
    } finally {
      setSubmitting(false);
    }
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
        <Text style={styles.headerTitle}>{t('coachOnboarding.preview.title')}</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>4/4</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <User size={36} color="rgba(255,255,255,0.5)" />
          </View>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.ratingRow}>
            <Star size={14} color={PRIMARY_GREEN} fill={PRIMARY_GREEN} />
            <Text style={styles.ratingText}>{t('coachOnboarding.preview.newCoach')}</Text>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={16} color={PRIMARY_GREEN} />
            <Text style={styles.sectionTitle}>{t('coachOnboarding.preview.aboutSection')}</Text>
          </View>
          <Text style={styles.bioText}>{data.bio || '—'}</Text>
        </View>

        {/* Specialties */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Award size={16} color={PRIMARY_GREEN} />
            <Text style={styles.sectionTitle}>{t('coachOnboarding.preview.specialtiesSection')}</Text>
          </View>
          <View style={styles.chipsRow}>
            {data.specialties?.map((spec) => (
              <View key={spec} style={styles.chip}>
                <Text style={styles.chipText}>{t(`coachOnboarding.specialties.${spec}`)}</Text>
              </View>
            )) || <Text style={styles.emptyText}>—</Text>}
          </View>
        </View>

        {/* Rate */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <DollarSign size={16} color={PRIMARY_GREEN} />
            <Text style={styles.sectionTitle}>{t('coachOnboarding.preview.rateSection')}</Text>
          </View>
          <Text style={styles.rateValue}>€{data.hourly_rate?.toFixed(2) || '0.00'}/h</Text>
        </View>

        {/* Policy */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={16} color={PRIMARY_GREEN} />
            <Text style={styles.sectionTitle}>{t('coachOnboarding.preview.policySection')}</Text>
          </View>
          <Text style={styles.policyValue}>
            {t(`coachOnboarding.policies.${data.cancellation_policy || 'flexible'}`)}
          </Text>
        </View>

        {/* Certifications */}
        {certEntries.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={16} color={PRIMARY_GREEN} />
              <Text style={styles.sectionTitle}>
                {t('coachOnboarding.preview.certificationsSection')} ({certEntries.length})
              </Text>
            </View>
            {certEntries.map((cert: any, index: number) => (
              <View key={index} style={styles.certRow}>
                <Text style={styles.certName}>{cert.name}</Text>
                {cert.issuer ? <Text style={styles.certIssuer}>{cert.issuer}</Text> : null}
              </View>
            ))}
          </View>
        )}

        {/* CV Status */}
        {profile?.cv_url && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <FileText size={16} color={PRIMARY_GREEN} />
              <Text style={styles.sectionTitle}>{t('coachOnboarding.preview.cvUploaded')}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <CustomButton
          title={submitting ? t('coachOnboarding.preview.submitting') : t('coachOnboarding.preview.submitButton')}
          onPress={handleSubmit}
          loading={submitting}
          disabled={submitting}
          variant="primary"
          style={styles.submitButton}
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
    color: '#B4F04E',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
    marginBottom: 24,
    marginTop: 8,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(180, 240, 78, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  email: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255,255,255,0.6)',
  },
  section: {
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.9)',
  },
  bioText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.7)',
    lineHeight: getResponsiveFontSize(20),
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(180, 240, 78, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(12),
    color: '#B4F04E',
  },
  emptyText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.4)',
  },
  rateValue: {
    fontFamily: 'Barlow_700Bold',
    fontSize: getResponsiveFontSize(24),
    color: '#FFFFFF',
  },
  policyValue: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(15),
    color: 'rgba(255,255,255,0.8)',
  },
  certRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  certName: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(14),
    color: '#FFFFFF',
  },
  certIssuer: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: 'rgba(3,3,3,0.95)',
  },
  submitButton: { width: '100%' },
});
