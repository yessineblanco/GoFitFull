import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { GradientBackground } from '@/components/shared/GradientBackground';
// Removed BlurView
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useProfileStore } from '@/store/profileStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ArrowLeft, Ruler, Save } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { ProfileStackParamList } from '@/types';
import { userProfileService } from '@/services/userProfile';
import { useAuthStore } from '@/store/authStore';
import * as Haptics from 'expo-haptics';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity } from '@/utils/colorUtils';

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'UnitPreferences'>;

interface UnitPreferencesScreenProps {
  navigation: NavigationProp;
}

export const UnitPreferencesScreen: React.FC<UnitPreferencesScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile, loadProfile } = useProfileStore();
  const { getOnboardingData } = useOnboardingStore();
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'inches'>('cm');
  const [saving, setSaving] = useState(false);

  // Theme colors
  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
      backgroundColor: '#030303',
    },


    header: {
      borderBottomColor: 'rgba(255, 255, 255, 0.05)',
      borderBottomWidth: 1,
    },
    headerTitle: {
      color: BRAND_WHITE,
    },
    sectionLabel: {
      color: BRAND_WHITE,
    },
    sectionDescription: {
      color: 'rgba(255, 255, 255, 0.6)',
    },
    checkmarkText: {
      color: BRAND_WHITE,
    },
    card: {
      borderRadius: 16,
      overflow: 'hidden' as const,
      borderWidth: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      padding: 20,
    },
    glowWrapper: {
      padding: 0,
      borderRadius: 18,
      backgroundColor: 'transparent',
    },
    optionTextActive: {
      color: theme.colors.primary,
    },
    unitOption: {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    unitOptionText: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
  }), [isDark]);

  useEffect(() => {
    // Initialize with current preferences
    const onboardingData = getOnboardingData();
    const currentWeightUnit = profile?.weight_unit || onboardingData.weightUnit || 'kg';
    const currentHeightUnit = profile?.height_unit || onboardingData.heightUnit || 'cm';
    setWeightUnit(currentWeightUnit);
    setHeightUnit(currentHeightUnit);
  }, [profile, getOnboardingData]);

  const handleSave = async () => {
    if (!user?.id) {
      dialogManager.error(t('common.error'), t('account.userNotFound'));
      return;
    }

    setSaving(true);
    try {
      // Update unit preferences in profile
      // We only update the units, not the actual weight/height values
      await userProfileService.updateUserProfile(user.id, {
        weightUnit,
        heightUnit,
      });
      await loadProfile();
      dialogManager.success(t('common.success'), t('units.preferencesUpdated'), () => {
        navigation.goBack();
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('units.failedToUpdate');
      dialogManager.error(t('common.error'), errorMessage);
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientBackground style={dynamicStyles.container}>

      {/* Header */}
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={BRAND_WHITE} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>{t('units.title')}</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={BRAND_PRIMARY} />
          ) : (
            <Save size={24} color={BRAND_PRIMARY} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Weight Unit Section */}
        <View style={dynamicStyles.glowWrapper}>
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.sectionHeader}>
              <Ruler size={20} color={BRAND_PRIMARY} />
              <Text style={[styles.sectionLabel, dynamicStyles.sectionLabel]}>{t('units.weightUnit')}</Text>
            </View>
            <Text style={[styles.sectionDescription, dynamicStyles.sectionDescription]}>
              {t('units.chooseWeightUnit')}
            </Text>

            <View style={styles.unitSelector}>
              <TouchableOpacity
                style={[
                  styles.unitOption,
                  dynamicStyles.unitOption,
                  weightUnit === 'kg' && styles.unitOptionActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setWeightUnit('kg');
                }}
              >
                <Text style={[
                  styles.unitOptionText,
                  dynamicStyles.unitOptionText,
                  weightUnit === 'kg' && [styles.unitOptionTextActive, dynamicStyles.optionTextActive],
                ]}>
                  {t('units.kilogram')}
                </Text>
                {weightUnit === 'kg' && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.unitOption,
                  dynamicStyles.unitOption,
                  weightUnit === 'lb' && styles.unitOptionActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setWeightUnit('lb');
                }}
              >
                <Text style={[
                  styles.unitOptionText,
                  dynamicStyles.unitOptionText,
                  weightUnit === 'lb' && styles.unitOptionTextActive,
                ]}>
                  {t('units.pound')}
                </Text>
                {weightUnit === 'lb' && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Height Unit Section */}
        <View style={dynamicStyles.glowWrapper}>
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.sectionHeader}>
              <Ruler size={20} color={BRAND_PRIMARY} />
              <Text style={[styles.sectionLabel, dynamicStyles.sectionLabel]}>{t('units.heightUnit')}</Text>
            </View>
            <Text style={[styles.sectionDescription, dynamicStyles.sectionDescription]}>
              {t('units.chooseHeightUnit')}
            </Text>

            <View style={styles.unitSelector}>
              <TouchableOpacity
                style={[
                  styles.unitOption,
                  dynamicStyles.unitOption,
                  heightUnit === 'cm' && styles.unitOptionActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHeightUnit('cm');
                }}
              >
                <Text style={[
                  styles.unitOptionText,
                  dynamicStyles.unitOptionText,
                  heightUnit === 'cm' && [styles.unitOptionTextActive, dynamicStyles.optionTextActive],
                ]}>
                  {t('units.centimeter')}
                </Text>
                {heightUnit === 'cm' && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.unitOption,
                  dynamicStyles.unitOption,
                  heightUnit === 'inches' && styles.unitOptionActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHeightUnit('inches');
                }}
              >
                <Text style={[
                  styles.unitOptionText,
                  dynamicStyles.unitOptionText,
                  heightUnit === 'inches' && [styles.unitOptionTextActive, dynamicStyles.optionTextActive],
                ]}>
                  {t('units.inch')}
                </Text>
                {heightUnit === 'inches' && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </GradientBackground >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    // borderBottomColor applied dynamically
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'Barlow_600SemiBold',
    // color applied dynamically
  },
  saveButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 16,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Barlow_600SemiBold',
    // color applied dynamically
  },
  sectionDescription: {
    fontSize: 13,
    // color applied dynamically
    marginBottom: 16,
    fontFamily: 'Barlow_400Regular',
  },
  unitSelector: {
    gap: 12,
  },
  unitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // backgroundColor and borderColor applied dynamically
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  unitOptionActive: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.primary,
    borderWidth: 1.5,
  },
  unitOptionText: {
    fontSize: 16,
    fontWeight: '600',
    // color applied dynamically
    fontFamily: 'Barlow_600SemiBold',
  },
  unitOptionTextActive: {
    // color applied dynamically
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Barlow_700Bold',
    // color applied dynamically
  },
});

