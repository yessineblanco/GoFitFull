import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { X } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { useTextSizeStore, getScaledFontSize } from '@/store/textSizeStore';
import { scaleWidth, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity } from '@/utils/colorUtils';
import { useTimerStore } from '@/store/timerStore';
import { useTranslation } from 'react-i18next';

interface RestTimerSettingsProps {
  visible: boolean;
  onClose: () => void;
}

export const RestTimerSettings: React.FC<RestTimerSettingsProps> = ({
  visible,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeStore();
  const { textSize } = useTextSizeStore();
  const { preferences, setPreferences } = useTimerStore();
  const { t } = useTranslation();

  if (!visible) return null;

  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  const toggleWarning = (seconds: number) => {
    const currentWarnings = preferences.warnings;
    if (currentWarnings.includes(seconds)) {
      setPreferences({
        warnings: currentWarnings.filter((w) => w !== seconds),
      });
    } else {
      setPreferences({
        warnings: [...currentWarnings, seconds].sort((a, b) => b - a),
      });
    }
  };

  const warningOptions = [30, 20, 10, 5];

  return (
    <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.container}>
      <LinearGradient
        colors={isDark
          ? ['rgba(3, 3, 3, 0.95)', 'rgba(3, 3, 3, 0.98)']
          : ['rgba(255, 255, 255, 0.95)', 'rgba(255, 255, 255, 0.98)']
        }
        style={StyleSheet.absoluteFill}
      />
      
      <View style={[styles.content, { paddingTop: insets.top + getResponsiveSpacing(20) }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: BRAND_WHITE }]}>
            {t('library.restTimer.title')}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: getPrimaryWithOpacity(0.2) }]}
            activeOpacity={0.7}
          >
            <X size={24} color={BRAND_PRIMARY} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + getResponsiveSpacing(100) }}
        >
          {/* Audio & Haptics */}
          <View style={styles.section}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: BRAND_WHITE }]}>
                  {t('library.restTimer.audioEnabled')}
                </Text>
                <Text style={[styles.settingDescription, { color: getTextColorWithOpacity(isDark, 0.6) }]}>
                  Play sounds for timer alerts
                </Text>
              </View>
              <Switch
                value={preferences.audio_enabled}
                onValueChange={(value) => setPreferences({ audio_enabled: value })}
                trackColor={{ false: '#767577', true: BRAND_PRIMARY }}
                thumbColor={BRAND_WHITE}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: BRAND_WHITE }]}>
                  {t('library.restTimer.hapticsEnabled')}
                </Text>
                <Text style={[styles.settingDescription, { color: getTextColorWithOpacity(isDark, 0.6) }]}>
                  Vibrate on timer alerts
                </Text>
              </View>
              <Switch
                value={preferences.haptics_enabled}
                onValueChange={(value) => setPreferences({ haptics_enabled: value })}
                trackColor={{ false: '#767577', true: BRAND_PRIMARY }}
                thumbColor={BRAND_WHITE}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: BRAND_WHITE }]}>
                  {t('library.restTimer.autoAdvance')}
                </Text>
                <Text style={[styles.settingDescription, { color: getTextColorWithOpacity(isDark, 0.6) }]}>
                  Automatically start next set when timer completes
                </Text>
              </View>
              <Switch
                value={preferences.auto_advance}
                onValueChange={(value) => setPreferences({ auto_advance: value })}
                trackColor={{ false: '#767577', true: BRAND_PRIMARY }}
                thumbColor={BRAND_WHITE}
              />
            </View>
          </View>

          {/* Warning Intervals */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: BRAND_WHITE }]}>
              {t('library.restTimer.warnings')}
            </Text>
            {warningOptions.map((seconds) => (
              <TouchableOpacity
                key={seconds}
                onPress={() => toggleWarning(seconds)}
                style={[
                  styles.warningOption,
                  {
                    backgroundColor: preferences.warnings.includes(seconds)
                      ? getPrimaryWithOpacity(0.2)
                      : isDark ? '#1a1a1a' : '#f5f5f5',
                    borderColor: preferences.warnings.includes(seconds)
                      ? BRAND_PRIMARY
                      : 'transparent',
                  },
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.checkbox}>
                  {preferences.warnings.includes(seconds) && (
                    <View style={[styles.checkboxInner, { backgroundColor: BRAND_PRIMARY }]} />
                  )}
                </View>
                <Text style={[styles.warningOptionText, { color: BRAND_WHITE }]}>
                  {t(`library.restTimer.warning${seconds}s`, { defaultValue: `${seconds} seconds` })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Default Rest Time */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: BRAND_WHITE }]}>
              {t('library.restTimer.defaultRestTime')}
            </Text>
            <View style={styles.presetContainer}>
              {[30, 60, 90, 120, 180].map((seconds) => (
                <TouchableOpacity
                  key={seconds}
                  onPress={() => setPreferences({ default_rest_seconds: seconds })}
                  style={[
                    styles.presetButton,
                    {
                      backgroundColor: preferences.default_rest_seconds === seconds
                        ? BRAND_PRIMARY
                        : getPrimaryWithOpacity(0.2),
                      borderColor: preferences.default_rest_seconds === seconds
                        ? BRAND_PRIMARY
                        : 'transparent',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetButtonText,
                      {
                        color: preferences.default_rest_seconds === seconds
                          ? BRAND_BLACK
                          : BRAND_WHITE,
                      },
                    ]}
                  >
                    {seconds}s
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  content: {
    flex: 1,
    paddingHorizontal: getResponsiveSpacing(24),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getResponsiveSpacing(24),
  },
  title: {
    fontSize: getResponsiveFontSize(24),
    fontFamily: 'Barlow_700Bold',
    fontWeight: '700',
  },
  closeButton: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    borderRadius: scaleWidth(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: getResponsiveSpacing(32),
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(18),
    fontFamily: 'Barlow_600SemiBold',
    marginBottom: getResponsiveSpacing(16),
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: getResponsiveSpacing(16),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingInfo: {
    flex: 1,
    marginRight: getResponsiveSpacing(16),
  },
  settingLabel: {
    fontSize: getResponsiveFontSize(16),
    fontFamily: 'Barlow_600SemiBold',
    marginBottom: getResponsiveSpacing(4),
  },
  settingDescription: {
    fontSize: getResponsiveFontSize(14),
    fontFamily: 'Barlow_400Regular',
  },
  warningOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: getResponsiveSpacing(16),
    borderRadius: getResponsiveSpacing(12),
    marginBottom: getResponsiveSpacing(8),
    borderWidth: 2,
  },
  checkbox: {
    width: scaleWidth(24),
    height: scaleWidth(24),
    borderRadius: scaleWidth(6),
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginRight: getResponsiveSpacing(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxInner: {
    width: scaleWidth(14),
    height: scaleWidth(14),
    borderRadius: scaleWidth(3),
  },
  warningOptionText: {
    fontSize: getResponsiveFontSize(16),
    fontFamily: 'Barlow_500Medium',
  },
  presetContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: getResponsiveSpacing(12),
  },
  presetButton: {
    paddingHorizontal: getResponsiveSpacing(20),
    paddingVertical: getResponsiveSpacing(12),
    borderRadius: getResponsiveSpacing(24),
    borderWidth: 2,
    minWidth: scaleWidth(70),
    alignItems: 'center',
  },
  presetButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontFamily: 'Barlow_600SemiBold',
    fontWeight: '600',
  },
});

