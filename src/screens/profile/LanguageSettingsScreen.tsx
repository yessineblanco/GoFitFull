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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Removed BlurView
import { ArrowLeft, Globe, Check } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { ProfileStackParamList } from '@/types';
import { useLanguageStore, type Language } from '@/store/languageStore';
import { useTextSizeStore, getScaledFontSize } from '@/store/textSizeStore';
import { useThemeStore } from '@/store/themeStore';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { dialogManager } from '@/components/shared/CustomDialog';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity } from '@/utils/colorUtils';

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'LanguageSettings'>;

interface LanguageSettingsScreenProps {
  navigation: NavigationProp;
}

const LANGUAGE_OPTIONS: { value: Language; label: string; nativeName: string }[] = [
  {
    value: 'en',
    label: 'English',
    nativeName: 'English',
  },
  {
    value: 'fr',
    label: 'French',
    nativeName: 'Français',
  },
];

export const LanguageSettingsScreen: React.FC<LanguageSettingsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const { textSize } = useTextSizeStore();
  const { isDark } = useThemeStore();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(language);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedLanguage(language);
    setHasChanges(false);
  }, [language]);

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
      fontSize: getScaledFontSize(24),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
    },
    sectionTitle: {
      fontSize: getScaledFontSize(11),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
      marginBottom: 12,
    },
    optionLabel: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
    },
    optionNativeName: {
      fontSize: getScaledFontSize(14),
      fontWeight: '400' as const,
      color: 'rgba(255, 255, 255, 0.6)',
      fontFamily: 'Barlow_400Regular',
      marginTop: 2,
    },
    saveButtonText: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
    },
    divider: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    settingsCard: {
      borderRadius: 16,
      overflow: 'hidden' as const,
      borderWidth: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    glowWrapper: {
      padding: 0,
      borderRadius: 16,
      backgroundColor: 'transparent',
    },
  }), [textSize, isDark]);

  const handleLanguageSelect = (lang: Language) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedLanguage(lang);
    setHasChanges(lang !== language);
  };

  const handleSave = async () => {
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    setSaving(true);
    try {
      // Update language in store (this will trigger i18n change via subscription)
      setLanguage(selectedLanguage);

      // Also update i18n directly for immediate effect
      await i18n.changeLanguage(selectedLanguage);

      setHasChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      dialogManager.success(
        t('common.success'),
        t('language.languageChanged') + '\n\n' + t('language.restartRequired')
      );

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 500);
    } catch (error) {
      console.error('Error saving language:', error);
      dialogManager.error(t('common.error'), 'Failed to save language preference');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientBackground style={[dynamicStyles.container, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={[styles.header, dynamicStyles.header]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={BRAND_WHITE} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>{t('language.title')}</Text>
        <TouchableOpacity
          style={[styles.saveButton, (!hasChanges || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={BRAND_WHITE} />
          ) : (
            <Text style={dynamicStyles.saveButtonText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Language Selection */}
        <View style={styles.settingsContainer}>
          <Text style={dynamicStyles.sectionTitle}>{t('language.selectLanguage')}</Text>

          <View style={dynamicStyles.glowWrapper}>
            <View style={[styles.settingsCard, dynamicStyles.settingsCard]}>
              {LANGUAGE_OPTIONS.map((option, index) => {
                const isSelected = selectedLanguage === option.value;
                return (
                  <React.Fragment key={option.value}>
                    {index > 0 && <View style={[styles.divider, dynamicStyles.divider]} />}
                    <TouchableOpacity
                      style={styles.optionItem}
                      onPress={() => handleLanguageSelect(option.value)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionLeft}>
                        <View style={styles.iconContainer}>
                          <Globe size={18} color={BRAND_PRIMARY} />
                        </View>
                        <View style={styles.optionTextContainer}>
                          <Text style={dynamicStyles.optionLabel}>{option.label}</Text>
                          <Text style={dynamicStyles.optionNativeName}>{option.nativeName}</Text>
                        </View>
                      </View>
                      {isSelected && (
                        <View style={styles.checkContainer}>
                          <Check size={20} color={BRAND_PRIMARY} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(132, 196, 65, 0.3)',
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  settingsContainer: {
    marginBottom: 24,
  },
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(132, 196, 65, 0.3)',
    backgroundColor: 'transparent',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  checkContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginLeft: 48,
  },
});



