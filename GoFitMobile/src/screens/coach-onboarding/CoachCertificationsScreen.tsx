import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { ArrowLeft, Plus, Award, FileText, Trash2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { CoachOnboardingStackParamList } from '@/types';
import { useCoachStore } from '@/store/coachStore';
import { CustomButton } from '@/components/auth';
import { toastManager } from '@/components/shared';
import { getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';

type NavigationProp = StackNavigationProp<CoachOnboardingStackParamList>;

const PRIMARY_GREEN = '#B4F04E';

interface CertEntry {
  name: string;
  issuer: string;
  docUri?: string;
  docName?: string;
}

export const CoachCertificationsScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [certEntries, setCertEntries] = useState<CertEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [certName, setCertName] = useState('');
  const [certIssuer, setCertIssuer] = useState('');
  const [certDoc, setCertDoc] = useState<{ uri: string; name: string } | null>(null);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        setCertDoc({ uri: file.uri, name: file.name });
      }
    } catch (error) {
      toastManager.error(t('coachOnboarding.certifications.pickError'));
    }
  };

  const handleAddCert = () => {
    if (!certName.trim()) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCertEntries((prev) => [
      ...prev,
      {
        name: certName.trim(),
        issuer: certIssuer.trim(),
        docUri: certDoc?.uri,
        docName: certDoc?.name,
      },
    ]);
    setCertName('');
    setCertIssuer('');
    setCertDoc(null);
    setShowForm(false);
  };

  const handleRemoveCert = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCertEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('CoachProfilePreview', { certEntries } as any);
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
        <Text style={styles.headerTitle}>{t('coachOnboarding.certifications.title')}</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>3/4</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>{t('coachOnboarding.certifications.subtitle')}</Text>

        {certEntries.map((cert, index) => (
          <View key={index} style={styles.certCard}>
            <View style={styles.certIcon}>
              <Award size={20} color={PRIMARY_GREEN} />
            </View>
            <View style={styles.certInfo}>
              <Text style={styles.certName}>{cert.name}</Text>
              {cert.issuer ? <Text style={styles.certIssuer}>{cert.issuer}</Text> : null}
              {cert.docName ? (
                <View style={styles.certDocRow}>
                  <FileText size={12} color="rgba(255,255,255,0.4)" />
                  <Text style={styles.certDocName}>{cert.docName}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => handleRemoveCert(index)} style={styles.removeBtn}>
              <Trash2 size={18} color="rgba(255,255,255,0.4)" />
            </TouchableOpacity>
          </View>
        ))}

        {showForm ? (
          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              value={certName}
              onChangeText={setCertName}
              placeholder={t('coachOnboarding.certifications.namePlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            <TextInput
              style={styles.input}
              value={certIssuer}
              onChangeText={setCertIssuer}
              placeholder={t('coachOnboarding.certifications.issuerPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            <TouchableOpacity style={styles.attachBtn} onPress={handlePickDocument}>
              <FileText size={16} color="rgba(255,255,255,0.6)" />
              <Text style={styles.attachText}>
                {certDoc ? certDoc.name : t('coachOnboarding.certifications.attachDocument')}
              </Text>
            </TouchableOpacity>
            <View style={styles.formActions}>
              <TouchableOpacity onPress={() => { setShowForm(false); setCertName(''); setCertIssuer(''); setCertDoc(null); }}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <CustomButton
                title={t('coachOnboarding.certifications.addButton')}
                onPress={handleAddCert}
                disabled={!certName.trim()}
                variant="primary"
                style={styles.addButton}
              />
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.addCertButton}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowForm(true); }}
            activeOpacity={0.7}
          >
            <Plus size={20} color={PRIMARY_GREEN} />
            <Text style={styles.addCertText}>{t('coachOnboarding.certifications.addCertification')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity onPress={handleNext} style={styles.skipButton}>
          <Text style={styles.skipText}>{certEntries.length === 0 ? t('coachOnboarding.certifications.skip') : ''}</Text>
        </TouchableOpacity>
        <CustomButton
          title={t('common.next')}
          onPress={handleNext}
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
    color: '#B4F04E',
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8 },
  subtitle: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(15),
    color: 'rgba(255,255,255,0.7)',
    lineHeight: getResponsiveFontSize(22),
    marginBottom: 24,
  },
  certCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  certIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(180, 240, 78, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  certInfo: { flex: 1 },
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
  certDocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  certDocName: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(11),
    color: 'rgba(255,255,255,0.4)',
  },
  removeBtn: { padding: 8 },
  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(180, 240, 78, 0.2)',
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(15),
    color: '#FFFFFF',
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
  },
  attachText: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255,255,255,0.6)',
    flex: 1,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  cancelText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255,255,255,0.5)',
    padding: 8,
  },
  addButton: { minWidth: 120 },
  addCertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(180, 240, 78, 0.2)',
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addCertText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(14),
    color: '#B4F04E',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 16,
  },
  skipButton: { padding: 16, minWidth: 60 },
  skipText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(15),
    color: 'rgba(255,255,255,0.6)',
  },
  nextButton: { flex: 1 },
});
