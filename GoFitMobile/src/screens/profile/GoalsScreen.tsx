import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Removed BlurView
import { useProfileStore } from '@/store/profileStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ArrowLeft, Target, Check } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { ProfileStackParamList } from '@/types';
import { userProfileService } from '@/services/userProfile';
import { useAuthStore } from '@/store/authStore';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/store/themeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity } from '@/utils/colorUtils';
import { GradientBackground } from '@/components/shared/GradientBackground';

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'Goals'>;

interface GoalsScreenProps {
  navigation: NavigationProp;
}

type GoalOption = {
  id: string;
  label: string;
  description: string;
};

// Goal options will be translated in the component
const GOAL_OPTIONS: GoalOption[] = [
  { id: 'strength', label: '', description: '' },
  { id: 'hiit', label: '', description: '' },
  { id: 'cardio', label: '', description: '' },
  { id: 'functional', label: '', description: '' },
];

export const GoalsScreen: React.FC<GoalsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile, loadProfile } = useProfileStore();
  const { getOnboardingData } = useOnboardingStore();
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Theme colors
  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
    },

    header: {
      borderBottomColor: 'rgba(255, 255, 255, 0.05)',
      borderBottomWidth: 1,
    },
    headerTitle: {
      color: BRAND_WHITE,
      fontSize: getResponsiveFontSize(18),
      fontWeight: '600' as const,
      fontFamily: 'Barlow_600SemiBold',
    },
    currentGoalCard: {
      borderRadius: scaleWidth(16),
      padding: getResponsiveSpacing(20),
      borderWidth: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.05)', // Subtle surface
      overflow: 'hidden' as const,
    },
    optionsCard: {
      borderRadius: scaleWidth(20),
      overflow: 'hidden' as const,
      borderWidth: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    glowWrapper: {
      padding: 0,
      borderRadius: 18,
      backgroundColor: 'transparent',
    },
    currentGoalTitle: {
      color: BRAND_WHITE,
    },
    sectionTitle: {
      color: BRAND_WHITE,
    },
    goalTitle: {
      color: BRAND_WHITE,
    },
    optionLabel: {
      color: BRAND_WHITE,
    },
    goalDescription: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    currentGoalDescription: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    optionDescription: {
      color: 'rgba(255, 255, 255, 0.6)',
    },
  }), [isDark]);

  useEffect(() => {
    // Get current goal from profile or onboarding data
    const currentGoal = profile?.goal || getOnboardingData().goal || 'strength';
    setSelectedGoal(currentGoal);
  }, [profile, getOnboardingData]);

  const handleSave = async () => {
    if (!user?.id) {
      dialogManager.error(t('common.error'), t('account.userNotFound'));
      return;
    }

    if (!selectedGoal) {
      dialogManager.error(t('common.error'), t('goals.pleaseSelectGoal'));
      return;
    }

    setSaving(true);
    try {
      await userProfileService.updateUserProfile(user.id, {
        goal: selectedGoal,
      });
      await loadProfile();
      dialogManager.success(t('common.success'), t('goals.goalUpdated'), () => {
        navigation.goBack();
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('goals.failedToUpdate');
      dialogManager.error(t('common.error'), errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const getGoalLabel = (goalId: string) => {
    const labels: Record<string, string> = {
      strength: t('goals.strength'),
      hiit: t('goals.hiit'),
      cardio: t('goals.cardio'),
      functional: t('goals.functional'),
    };
    return labels[goalId] || goalId;
  };

  const getGoalDescription = (goalId: string) => {
    const descriptions: Record<string, string> = {
      strength: t('goals.strengthDesc'),
      hiit: t('goals.hiitDesc'),
      cardio: t('goals.cardioDesc'),
      functional: t('goals.functionalDesc'),
    };
    return descriptions[goalId] || '';
  };

  // Memoized GoalOption component to prevent unnecessary re-renders
  const GoalOption = React.memo<{
    option: GoalOption;
    isSelected: boolean;
    onPress: () => void;
    disabled: boolean;
    getGoalLabel: (id: string) => string;
    getGoalDescription: (id: string) => string;
    optionLabelStyle: any;
    optionDescriptionStyle: any;
    brandBlack: string;
  }>(({ option, isSelected, onPress, disabled, getGoalLabel, getGoalDescription, optionLabelStyle, optionDescriptionStyle, brandBlack }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        isSelected && styles.optionItemSelected,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.optionContent}>
        <Text style={[styles.optionLabel, optionLabelStyle, isSelected && styles.optionLabelSelected]}>
          {getGoalLabel(option.id)}
        </Text>
        <Text style={[styles.optionDescription, optionDescriptionStyle]}>{getGoalDescription(option.id)}</Text>
      </View>
      {isSelected && (
        <View style={styles.checkIcon}>
          <Check size={20} color={brandBlack} />
        </View>
      )}
    </TouchableOpacity>
  ));

  return (
    <GradientBackground style={dynamicStyles.container}>
      {/* Header */}
      <View style={[styles.header, dynamicStyles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={BRAND_WHITE} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>{t('goals.title')}</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          disabled={saving || loading}
        >
          {saving ? (
            <ActivityIndicator size="small" color={BRAND_PRIMARY} />
          ) : (
            <Text style={styles.saveButtonText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Goal Display */}
        {selectedGoal && (
          <View style={styles.currentGoalContainer}>
            <View style={styles.currentGoalHeader}>
              <Target size={24} color={BRAND_PRIMARY} />
              <Text style={[styles.currentGoalTitle, dynamicStyles.currentGoalTitle]}>{t('goals.currentGoal')}</Text>
            </View>
            <View style={dynamicStyles.glowWrapper}>
              <View style={[styles.currentGoalCard, dynamicStyles.currentGoalCard]}>
                <Text style={styles.currentGoalText}>{getGoalLabel(selectedGoal)}</Text>
                <Text style={[styles.currentGoalDescription, dynamicStyles.currentGoalDescription]}>
                  {getGoalDescription(selectedGoal)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Goal Options */}
        <View style={styles.optionsContainer}>
          <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>{t('goals.selectYourGoal')}</Text>

          <View style={dynamicStyles.glowWrapper}>
            <View style={[styles.optionsCard, dynamicStyles.optionsCard]}>
              {GOAL_OPTIONS.map((option) => (
                <GoalOption
                  key={option.id}
                  option={option}
                  isSelected={selectedGoal === option.id}
                  onPress={() => setSelectedGoal(option.id)}
                  disabled={saving}
                  getGoalLabel={getGoalLabel}
                  getGoalDescription={getGoalDescription}
                  optionLabelStyle={dynamicStyles.optionLabel}
                  optionDescriptionStyle={dynamicStyles.optionDescription}
                  brandBlack={BRAND_BLACK}
                />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </GradientBackground>
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
    paddingHorizontal: getResponsiveSpacing(20),
    paddingBottom: getResponsiveSpacing(16),
    borderBottomWidth: 1,
    // borderBottomColor applied dynamically
  },
  backButton: {
    width: scaleWidth(40),
    height: scaleHeight(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    fontFamily: 'Barlow_600SemiBold',
    // color applied dynamically
  },
  saveButton: {
    width: scaleWidth(60),
    height: scaleHeight(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: theme.colors.primary,
    fontFamily: 'Barlow_600SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: getResponsiveSpacing(24),
  },
  currentGoalContainer: {
    marginBottom: getResponsiveSpacing(30),
  },
  currentGoalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSpacing(12),
    marginBottom: getResponsiveSpacing(12),
  },
  currentGoalTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    fontFamily: 'Barlow_600SemiBold',
    // color applied dynamically
  },
  currentGoalCard: {
    borderRadius: scaleWidth(16),
    padding: getResponsiveSpacing(20),
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  currentGoalText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: getResponsiveSpacing(8),
    fontFamily: 'Barlow_600SemiBold',
  },
  currentGoalDescription: {
    fontSize: getResponsiveFontSize(14),
    fontFamily: 'Barlow_400Regular',
    // color applied dynamically
  },
  optionsContainer: {
    marginTop: getResponsiveSpacing(10),
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    marginBottom: getResponsiveSpacing(16),
    fontFamily: 'Barlow_600SemiBold',
    // color applied dynamically
  },
  optionsCard: {
    borderRadius: scaleWidth(20),
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: getResponsiveSpacing(18),
    borderBottomWidth: 1,
    borderBottomColor: getTextColorWithOpacity(true, 0.08),
  },
  optionItemSelected: {
    backgroundColor: getPrimaryWithOpacity(0.15),
    borderBottomColor: getPrimaryWithOpacity(0.2),
  },
  optionContent: {
    flex: 1,
    marginRight: getResponsiveSpacing(12),
  },
  optionLabel: {
    fontSize: getResponsiveFontSize(15),
    fontWeight: '600',
    marginBottom: getResponsiveSpacing(4),
    fontFamily: 'Barlow_600SemiBold',
    // color applied dynamically
  },
  optionLabelSelected: {
    color: theme.colors.primary,
  },
  optionDescription: {
    fontSize: getResponsiveFontSize(12),
    fontFamily: 'Barlow_400Regular',
    // color applied dynamically
  },
  checkIcon: {
    width: scaleWidth(28),
    height: scaleHeight(28),
    borderRadius: scaleWidth(14),
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

