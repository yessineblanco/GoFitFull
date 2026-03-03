import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { ArrowLeft, Upload, FileText, CheckCircle, X } from 'lucide-react-native';
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

export const CoachCVUploadScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { uploadCV, loading } = useCoachStore();

  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; size?: number } | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.[0]) {
        const file = result.assets[0];
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedFile({ uri: file.uri, name: file.name, size: file.size ?? undefined });
        setUploaded(false);
      }
    } catch (error) {
      toastManager.error(t('coachOnboarding.cv.pickError'));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      await uploadCV(selectedFile.uri, selectedFile.name);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setUploaded(true);
    } catch (error) {
      toastManager.error(t('coachOnboarding.cv.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('CoachCertifications');
  };

  const handleSkip = () => {
    navigation.navigate('CoachCertifications');
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
        <Text style={styles.headerTitle}>{t('coachOnboarding.cv.title')}</Text>
        <View style={styles.stepBadge}>
          <Text style={styles.stepText}>2/4</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>{t('coachOnboarding.cv.subtitle')}</Text>

        {!selectedFile ? (
          <TouchableOpacity style={styles.uploadArea} onPress={handlePickDocument} activeOpacity={0.7}>
            <Upload size={48} color="rgba(255,255,255,0.3)" />
            <Text style={styles.uploadText}>{t('coachOnboarding.cv.tapToUpload')}</Text>
            <Text style={styles.uploadHint}>{t('coachOnboarding.cv.formats')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.fileCard}>
            <View style={styles.fileIcon}>
              {uploaded ? (
                <CheckCircle size={24} color={PRIMARY_GREEN} />
              ) : (
                <FileText size={24} color="#FFFFFF" />
              )}
            </View>
            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
              {selectedFile.size ? (
                <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => { setSelectedFile(null); setUploaded(false); }}
              style={styles.removeButton}
            >
              <X size={18} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>
        )}

        {selectedFile && !uploaded && (
          <CustomButton
            title={uploading ? t('coachOnboarding.cv.uploading') : t('coachOnboarding.cv.uploadButton')}
            onPress={handleUpload}
            loading={uploading}
            disabled={uploading}
            variant="secondary"
            style={styles.uploadButton}
          />
        )}

        {uploaded && (
          <Text style={styles.successText}>{t('coachOnboarding.cv.uploadSuccess')}</Text>
        )}
      </View>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>{t('coachOnboarding.cv.skip')}</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  subtitle: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(15),
    color: 'rgba(255,255,255,0.7)',
    lineHeight: getResponsiveFontSize(22),
    marginBottom: 32,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    borderRadius: 20,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  uploadText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(16),
    color: '#FFFFFF',
  },
  uploadHint: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(13),
    color: 'rgba(255,255,255,0.4)',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    gap: 12,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: { flex: 1 },
  fileName: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(14),
    color: '#FFFFFF',
  },
  fileSize: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(12),
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  removeButton: { padding: 8 },
  uploadButton: { marginTop: 16 },
  successText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(14),
    color: '#B4F04E',
    textAlign: 'center',
    marginTop: 16,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 16,
  },
  skipButton: { padding: 16 },
  skipText: {
    fontFamily: 'Barlow_500Medium',
    fontSize: getResponsiveFontSize(15),
    color: 'rgba(255,255,255,0.6)',
  },
  nextButton: { flex: 1 },
});
