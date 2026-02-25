import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
// Removed BlurView
import { useProfileStore } from '@/store/profileStore';
import { ArrowLeft, Save, User } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { ProfileStackParamList } from '@/types';
import { userProfileService } from '@/services/userProfile';
import { useAuthStore } from '@/store/authStore';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useTranslation } from 'react-i18next';
import { getScaledFontSize } from '@/store/textSizeStore';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity } from '@/utils/colorUtils';
import { GradientBackground } from '@/components/shared/GradientBackground';

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'EditProfile'>;

interface EditProfileScreenProps {
  navigation: NavigationProp;
}

type GenderOption = 'male' | 'female' | 'other' | 'prefer_not_to_say';
type ActivityLevelOption = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';

const GENDER_OPTIONS: { value: GenderOption; labelKey: string }[] = [
  { value: 'male', labelKey: 'male' },
  { value: 'female', labelKey: 'female' },
  { value: 'other', labelKey: 'other' },
  { value: 'prefer_not_to_say', labelKey: 'preferNotToSay' },
];

const ACTIVITY_LEVELS: { value: ActivityLevelOption; labelKey: string; descKey: string }[] = [
  { value: 'sedentary', labelKey: 'sedentary', descKey: 'sedentaryDesc' },
  { value: 'lightly_active', labelKey: 'lightlyActive', descKey: 'lightlyActiveDesc' },
  { value: 'moderately_active', labelKey: 'moderatelyActive', descKey: 'moderatelyActiveDesc' },
  { value: 'very_active', labelKey: 'veryActive', descKey: 'veryActiveDesc' },
  { value: 'extra_active', labelKey: 'extraActive', descKey: 'extraActiveDesc' },
];

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile, loadProfile } = useProfileStore();
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const [age, setAge] = useState<string>('');
  const [gender, setGender] = useState<GenderOption | null>(null);
  const [activityLevel, setActivityLevel] = useState<ActivityLevelOption | null>(null);
  const [saving, setSaving] = useState(false);
  const BRAND_WHITE = getTextColor(isDark);

  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
    },

    headerTitle: {
      fontSize: getScaledFontSize(20),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
    },
    label: {
      fontSize: getScaledFontSize(14),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
      marginBottom: 12,
    },
    input: {
      padding: 16,
      fontSize: getScaledFontSize(16),
      color: BRAND_WHITE,
      fontFamily: 'Barlow_400Regular',
    },
    optionText: {
      fontSize: getScaledFontSize(15),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
    },
    optionTextSelected: {
      color: theme.colors.primary,
    },
    optionDesc: {
      fontSize: getScaledFontSize(12),
      color: 'rgba(255, 255, 255, 0.6)',
      fontFamily: 'Barlow_400Regular',
      marginTop: 4,
    },
    optionDescSelected: {
      color: 'rgba(132, 196, 65, 0.8)',
    },
    checkmarkText: {
      color: '#030303',
      fontSize: 14,
      fontWeight: 'bold' as const,
    },
    saveButtonText: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_600SemiBold',
    },
    optionButton: {
      borderRadius: 16,
      overflow: 'hidden' as const,
    },
    inputContainer: {
      borderRadius: 16,
      borderWidth: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      overflow: 'hidden' as const,
    },
    // Removed glowWrapper - kept structure for compatibility but transparent
    glowWrapper: {
      padding: 0,
      backgroundColor: 'transparent',
      borderRadius: 16,
    },
    innerCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 16,
      borderWidth: 0,
      overflow: 'hidden' as const,
    },
  }), [isDark]);

  const initializeValues = React.useCallback(() => {
    if (profile) {
      if (profile.age) setAge(profile.age.toString());
      if (profile.gender) setGender(profile.gender);
      if (profile.activity_level) setActivityLevel(profile.activity_level);
    }
  }, [profile]);

  useEffect(() => {
    initializeValues();
  }, [initializeValues]);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  useEffect(() => {
    initializeValues();
  }, [profile, initializeValues]);

  const handleSave = async () => {
    if (!user?.id) {
      dialogManager.error(t('common.error'), t('account.userNotFound'));
      return;
    }

    // Validate age
    if (age) {
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
        dialogManager.error(t('common.error'), t('profileFields.ageInvalid'));
        return;
      }
    }

    setSaving(true);
    try {
      await userProfileService.saveOnboardingData(user.id, {
        weight: profile?.weight || 70,
        weightUnit: (profile?.weight_unit || 'kg') as 'kg' | 'lb',
        height: profile?.height || 170,
        heightUnit: (profile?.height_unit || 'cm') as 'cm' | 'inches',
        goal: profile?.goal || 'strength',
        age: age ? parseInt(age, 10) : undefined,
        gender: gender || undefined,
        activityLevel: activityLevel || undefined,
      });

      await loadProfile();
      dialogManager.success(t('common.success'), t('profileFields.profileUpdated'));
      navigation.goBack();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('profileFields.failedToUpdate');
      dialogManager.error(t('common.error'), errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientBackground style={dynamicStyles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowLeft size={24} color={BRAND_WHITE} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>{t('profile.editProfile')}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Age Input */}
        <View style={styles.section}>
          <Text style={dynamicStyles.label}>{t('profileFields.age')}</Text>
          <View style={dynamicStyles.glowWrapper}>
            <View style={[styles.inputContainer, dynamicStyles.inputContainer]}>
              <TextInput
                style={dynamicStyles.input}
                value={age}
                onChangeText={setAge}
                placeholder={t('profileFields.enterAge')}
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                keyboardType="numeric"
                maxLength={3}
              />
            </View>
          </View>
        </View>

        {/* Gender Selection */}
        <View style={styles.section}>
          <Text style={dynamicStyles.label}>{t('profileFields.gender')}</Text>
          <View style={styles.optionsContainer}>
            {GENDER_OPTIONS.map((option) => {
              const isSelected = gender === option.value;
              return (
                <View key={option.value} style={dynamicStyles.glowWrapper}>
                  <TouchableOpacity
                    style={dynamicStyles.innerCard}
                    onPress={() => setGender(option.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionContent}>
                      <Text style={[dynamicStyles.optionText, isSelected && dynamicStyles.optionTextSelected]}>
                        {t(`profileFields.${option.labelKey}`)}
                      </Text>
                      {isSelected && (
                        <View style={styles.checkmark}>
                          <Text style={dynamicStyles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* Activity Level Selection */}
        <View style={styles.section}>
          <Text style={dynamicStyles.label}>{t('profileFields.activityLevel')}</Text>
          <View style={styles.optionsContainer}>
            {ACTIVITY_LEVELS.map((option) => {
              const isSelected = activityLevel === option.value;
              return (
                <View key={option.value} style={dynamicStyles.glowWrapper}>
                  <TouchableOpacity
                    style={dynamicStyles.innerCard}
                    onPress={() => setActivityLevel(option.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionContent}>
                      <View style={styles.activityOptionContent}>
                        <Text style={[dynamicStyles.optionText, isSelected && dynamicStyles.optionTextSelected]}>
                          {t(`profileFields.${option.labelKey}`)}
                        </Text>
                        <Text style={[dynamicStyles.optionDesc, isSelected && dynamicStyles.optionDescSelected]}>
                          {t(`profileFields.${option.descKey}`)}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.checkmark}>
                          <Text style={dynamicStyles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={BRAND_WHITE} />
          ) : (
            <>
              <Save size={20} color={BRAND_WHITE} />
              <Text style={dynamicStyles.saveButtonText}>{t('common.save')}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  section: {
    marginBottom: 32,
  },
  inputContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  blurContainer: {
    flex: 1,
    padding: 0,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  activityOptionContent: {
    flex: 1,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
});


