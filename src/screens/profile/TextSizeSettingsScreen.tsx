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
// Removed BlurView
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Type, Save, Check } from 'lucide-react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { ProfileStackParamList } from '@/types';
import { useTextSizeStore, type TextSize, getScaledFontSize } from '@/store/textSizeStore';
import * as Haptics from 'expo-haptics';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/store/themeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity, getBlackWithOpacity } from '@/utils/colorUtils';

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'TextSizeSettings'>;

interface TextSizeSettingsScreenProps {
  navigation: NavigationProp;
}

// Text size options will be translated in the component
const TEXT_SIZE_OPTIONS: { value: TextSize; label: string; description: string }[] = [
  { value: 'small', label: '', description: '' },
  { value: 'medium', label: '', description: '' },
  { value: 'large', label: '', description: '' },
];

export const TextSizeSettingsScreen: React.FC<TextSizeSettingsScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { textSize, setTextSize } = useTextSizeStore();
  const { isDark } = useThemeStore();
  const [selectedSize, setSelectedSize] = useState<TextSize>(textSize);
  const [hasChanges, setHasChanges] = useState(false);

  // Theme colors
  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  useEffect(() => {
    // Load initial value from store
    const currentSize = useTextSizeStore.getState().textSize;
    setSelectedSize(currentSize);
    setHasChanges(false);
  }, []);

  // Update when textSize changes externally
  useEffect(() => {
    if (textSize !== selectedSize) {
      setSelectedSize(textSize);
      setHasChanges(false);
    }
  }, [textSize]);

  const handleSizeSelect = (size: TextSize) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSize(size);
    setHasChanges(size !== textSize);
  };

  const handleSave = async () => {
    try {
      setTextSize(selectedSize);
      // Zustand persist should handle saving automatically
      // But let's wait a moment to ensure it's persisted
      await new Promise(resolve => setTimeout(resolve, 200));

      // Verify it was saved by checking the store
      const savedSize = useTextSizeStore.getState().textSize;
      if (savedSize !== selectedSize) {
        dialogManager.warning(t('common.warning'), t('textSize.mayNotBeSaved'));
        return;
      }

      setHasChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      dialogManager.success(t('common.success'), t('textSize.preferenceSaved'), () => {
        navigation.goBack();
      });
    } catch (error) {
      console.error('Error saving text size:', error);
      dialogManager.error(t('common.error'), t('textSize.failedToSave'));
    }
  };

  const getTextSizeLabel = (size: TextSize) => {
    const labels: Record<TextSize, string> = {
      small: t('textSize.small'),
      medium: t('textSize.medium'),
      large: t('textSize.large'),
    };
    return labels[size];
  };

  const getTextSizeDescription = (size: TextSize) => {
    const descriptions: Record<TextSize, string> = {
      small: t('textSize.smallDesc'),
      medium: t('textSize.mediumDesc'),
      large: t('textSize.largeDesc'),
    };
    return descriptions[size];
  };

  // Memoized TextSizeOption component to prevent unnecessary re-renders
  const TextSizeOption = React.memo<{
    option: { value: TextSize; label: string; description: string };
    isSelected: boolean;
    onPress: () => void;
    getTextSizeLabel: (size: TextSize) => string;
    getTextSizeDescription: (size: TextSize) => string;
    optionLabelStyle: any;
    optionLabelActiveStyle: any;
    optionDescriptionStyle: any;
    optionDescriptionActiveStyle: any;
    previewContainerStyle: any;
    previewTextStyle: any;
    brandWhite: string;
  }>(({
    option,
    isSelected,
    onPress,
    getTextSizeLabel,
    getTextSizeDescription,
    optionLabelStyle,
    optionLabelActiveStyle,
    optionDescriptionStyle,
    optionDescriptionActiveStyle,
    previewContainerStyle,
    previewTextStyle,
    brandWhite,
  }) => (
    <TouchableOpacity
      style={[
        styles.optionCard,
        dynamicStyles.glowWrapper, // Use glow wrapper here
        isSelected && styles.optionCardActive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={dynamicStyles.innerCard}>
        <View style={styles.optionContent}>
          <View style={styles.optionHeader}>
            <Text style={[
              optionLabelStyle,
              isSelected && optionLabelActiveStyle,
            ]}>
              {getTextSizeLabel(option.value)}
            </Text>
            {isSelected && (
              <View style={styles.checkIcon}>
                <Check size={20} color={brandWhite} />
              </View>
            )}
          </View>
          <Text style={[
            optionDescriptionStyle,
            isSelected && optionDescriptionActiveStyle,
          ]}>
            {getTextSizeDescription(option.value)}
          </Text>

          {/* Preview text with different sizes */}
          <View style={[styles.previewContainer, previewContainerStyle]}>
            <Text style={[
              styles.previewText,
              previewTextStyle,
              option.value === 'small' && { fontSize: getResponsiveFontSize(12) },
              option.value === 'medium' && { fontSize: getResponsiveFontSize(14) },
              option.value === 'large' && { fontSize: getResponsiveFontSize(16) },
            ]}>
              {t('textSize.previewText', { size: getTextSizeLabel(option.value).toLowerCase() })}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  ));

  // Get dynamic styles based on current text size and theme
  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
      backgroundColor: '#030303',
    },
    backgroundGradient: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    meshGradientTop: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: 600,
    },

    headerTitle: {
      fontSize: getScaledFontSize(18),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
    },
    infoText: {
      fontSize: getScaledFontSize(14),
      color: 'rgba(255, 255, 255, 0.8)',
      fontFamily: 'Barlow_400Regular',
      lineHeight: getScaledFontSize(20),
    },
    optionLabel: {
      fontSize: getScaledFontSize(18),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
    },
    optionDescription: {
      fontSize: getScaledFontSize(14),
      color: 'rgba(255, 255, 255, 0.6)',
      fontFamily: 'Barlow_400Regular',
      marginBottom: 16,
    },
    optionLabelActive: {
      color: theme.colors.primary,
    },
    optionDescriptionActive: {
      color: 'rgba(255, 255, 255, 0.8)',
    },
    previewText: {
      color: 'rgba(255, 255, 255, 0.9)',
    },
    previewContainer: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    glowWrapper: {
      padding: 0,
      borderRadius: 18,
      backgroundColor: 'transparent',
    },
    innerCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: 15,
      borderWidth: 0,
    },
  }), [textSize, isDark]);

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {/* Background Gradient Mesh */}
      <LinearGradient
        colors={['#0B120B', '#050505', '#000000']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={dynamicStyles.backgroundGradient}
      />
      <LinearGradient
        colors={['rgba(132, 196, 65, 0.08)', 'transparent']}
        style={dynamicStyles.meshGradientTop}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={BRAND_WHITE} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>{t('textSize.title')}</Text>
        <View style={styles.placeholder} />
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, (!hasChanges || selectedSize === textSize) && styles.saveButtonDisabled]}
          disabled={!hasChanges || selectedSize === textSize}
        >
          <Save size={24} color={hasChanges && selectedSize !== textSize ? BRAND_PRIMARY : 'rgba(255, 255, 255, 0.3)'} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.infoContainer}>
          <Text style={dynamicStyles.infoText}>
            {t('textSize.chooseTextSize')}
          </Text>
        </View>

        {/* Text Size Options */}
        <View style={styles.section}>
          {TEXT_SIZE_OPTIONS.map((option) => (
            <TextSizeOption
              key={option.value}
              option={option}
              isSelected={selectedSize === option.value}
              onPress={() => handleSizeSelect(option.value)}
              getTextSizeLabel={getTextSizeLabel}
              getTextSizeDescription={getTextSizeDescription}
              optionLabelStyle={dynamicStyles.optionLabel}
              optionLabelActiveStyle={dynamicStyles.optionLabelActive}
              optionDescriptionStyle={dynamicStyles.optionDescription}
              optionDescriptionActiveStyle={dynamicStyles.optionDescriptionActive}
              previewContainerStyle={dynamicStyles.previewContainer}
              previewTextStyle={dynamicStyles.previewText}
              brandWhite={BRAND_WHITE}
            />
          ))}
        </View>
      </ScrollView>
    </View>
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
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: scaleWidth(40),
    height: scaleHeight(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    width: scaleWidth(40),
    height: scaleHeight(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  placeholder: {
    width: scaleWidth(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: getResponsiveSpacing(24),
  },
  infoContainer: {
    marginBottom: getResponsiveSpacing(24),
    padding: getResponsiveSpacing(16),
    backgroundColor: 'transparent',
    borderRadius: scaleWidth(12),
    borderWidth: 1.5,
    borderColor: getPrimaryWithOpacity(0.3),
  },
  section: {
    gap: getResponsiveSpacing(16),
  },
  optionCard: {
    borderRadius: scaleWidth(16),
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'transparent',
  },
  optionCardActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'transparent',
  },
  blurContainer: {
    flex: 1,
    padding: 0,
  },
  optionContent: {
    padding: getResponsiveSpacing(20),
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSpacing(8),
  },
  checkIcon: {
    width: scaleWidth(24),
    height: scaleHeight(24),
    borderRadius: scaleWidth(12),
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    marginTop: getResponsiveSpacing(12),
    padding: getResponsiveSpacing(12),
    borderRadius: scaleWidth(8),
  },
  previewText: {
    fontFamily: 'Barlow_400Regular',
  },
});

