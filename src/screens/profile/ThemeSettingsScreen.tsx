import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
} from 'react-native';
import { GradientBackground } from '@/components/shared/GradientBackground';
// Removed BlurView
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Moon, Sun, Monitor } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { ProfileStackParamList } from '@/types';
import { useThemeStore } from '@/store/themeStore';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useTranslation } from 'react-i18next';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity } from '@/utils/colorUtils';
import { AppText } from '@/components/shared/AppText';

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'ThemeSettings'>;

interface ThemeSettingsScreenProps {
  navigation: NavigationProp;
}

type ThemeOption = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeOption; labelKey: string; descKey: string; icon: any }[] = [
  { value: 'light', labelKey: 'light', descKey: 'lightDesc', icon: Sun },
  { value: 'dark', labelKey: 'dark', descKey: 'darkDesc', icon: Moon },
  { value: 'system', labelKey: 'system', descKey: 'systemDesc', icon: Monitor },
];

export const ThemeSettingsScreen: React.FC<ThemeSettingsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { theme: themePreference, setTheme, isDark } = useThemeStore();

  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
    },

    headerTitle: {
      fontSize: 24,
      fontWeight: '600' as const,
      fontFamily: 'Barlow_600SemiBold',
      color: '#ffffff',
    },
    description: {
      color: 'rgba(255, 255, 255, 0.7)',
      marginBottom: 24,
    },
    optionTitle: {
      color: '#ffffff',
      marginBottom: 4,
    },
    optionTitleSelected: {
      color: theme.colors.primary,
    },
    optionDesc: {
      color: 'rgba(255, 255, 255, 0.6)',
    },
    optionDescSelected: {
      color: 'rgba(132, 196, 65, 0.8)',
    },
    checkmarkText: {
      color: '#030303',
    },
    optionButton: {
      borderRadius: 16,
      overflow: 'hidden' as const,
    },
    glowWrapper: {
      padding: 0,
      borderRadius: 16,
      backgroundColor: 'transparent',
    },
    innerCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 16,
      borderWidth: 0,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      padding: 20,
    },
  }), [isDark]);

  const handleThemeChange = (newTheme: ThemeOption) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTheme(newTheme);
    dialogManager.success(t('common.success'), t('theme.themeChanged'));
    // Note: Theme changes will be applied on app restart or can be implemented
    // to update the app's color scheme dynamically using the theme store
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
          <AppText variant="h3" style={dynamicStyles.headerTitle}>{t('theme.title')}</AppText>
          <View style={styles.placeholder} />
        </View>

        {/* Description */}
        <AppText variant="caption" style={dynamicStyles.description}>{t('theme.selectTheme')}</AppText>

        {/* Theme Options */}
        <View style={styles.optionsContainer}>
          {THEME_OPTIONS.map((option) => {
            const isSelected = themePreference === option.value;
            const IconComponent = option.icon;

            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionButton, dynamicStyles.glowWrapper, isSelected && styles.optionButtonSelected]}
                onPress={() => handleThemeChange(option.value)}
              >
                <View style={dynamicStyles.innerCard}>
                  <View style={styles.optionContent}>
                    <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
                      <IconComponent
                        size={24}
                        color={isSelected ? BRAND_BLACK : BRAND_WHITE}
                      />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <AppText variant="bodyBold" style={[dynamicStyles.optionTitle, isSelected && dynamicStyles.optionTitleSelected]}>
                        {t(`theme.${option.labelKey}`)}
                      </AppText>
                      <AppText variant="caption" style={[dynamicStyles.optionDesc, isSelected && dynamicStyles.optionDescSelected]}>
                        {t(`theme.${option.descKey}`)}
                      </AppText>
                    </View>
                  </View>
                  {isSelected && (
                    <View style={styles.checkmark}>
                      <AppText variant="bodyBold" style={dynamicStyles.checkmarkText}>✓</AppText>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
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
  optionsContainer: {
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 0,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  optionContentBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    flex: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(132, 196, 65, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconContainerSelected: {
    backgroundColor: theme.colors.primary,
  },
  optionTextContainer: {
    flex: 1,
  },
  checkmark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});
