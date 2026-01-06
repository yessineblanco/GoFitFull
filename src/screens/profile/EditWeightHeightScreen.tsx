import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Animated,
} from 'react-native';
import { GradientBackground } from '@/components/shared/GradientBackground';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, RouteProp } from '@react-navigation/native';
import { useProfileStore } from '@/store/profileStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { ArrowLeft, Save, Ruler, Weight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import type { ProfileStackParamList } from '@/types';
import { userProfileService } from '@/services/userProfile';
import { useAuthStore } from '@/store/authStore';
import { VALIDATION_LIMITS } from '@/constants';
import { dialogManager } from '@/components/shared/CustomDialog';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@/store/themeStore';
import { theme } from '@/theme';
import { getTextColor } from '@/utils/colorUtils';
import { WeightScale } from '@/components/onboarding';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getResponsiveFontSize, getResponsiveSpacing, scaleWidth, scaleHeight } from '@/utils/responsive';

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'EditWeightHeight'>;
type RouteProps = RouteProp<ProfileStackParamList, 'EditWeightHeight'>;

interface EditWeightHeightScreenProps {
  navigation: NavigationProp;
  route: RouteProps;
}

export const EditWeightHeightScreen: React.FC<EditWeightHeightScreenProps> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile, loadProfile } = useProfileStore();
  const { getOnboardingData } = useOnboardingStore();
  const { user } = useAuthStore();
  const { isDark } = useThemeStore();

  // Active Tab State (default from params or 'weight')
  const [activeTab, setActiveTab] = useState<'weight' | 'height'>(route.params?.initialTab || 'weight');

  // State for Weight
  const [weight, setWeight] = useState<number>(70);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');

  // State for Height
  const [height, setHeight] = useState<number>(170);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'inches'>('cm');

  const [saving, setSaving] = useState(false);

  // Animations for Unit Toggles & Tab Switch
  const weightSlideAnim = useRef(new Animated.Value(0)).current;
  const heightSlideAnim = useRef(new Animated.Value(0)).current;

  // Theme colors
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
      backgroundColor: '#030303',
    },
    header: {
      borderBottomColor: 'rgba(255, 255, 255, 0.05)',
      // borderBottomWidth: 1, // Removed to blend with tabs
    },
    headerTitle: {
      color: '#ffffff',
    },
    sectionTitle: {
      color: '#ffffff',
    },
  }), [isDark]);

  const { minWeight, maxWeight } = useMemo(() => ({
    minWeight: weightUnit === 'kg' ? VALIDATION_LIMITS.WEIGHT_MIN_KG : VALIDATION_LIMITS.WEIGHT_MIN_LB,
    maxWeight: weightUnit === 'kg' ? VALIDATION_LIMITS.WEIGHT_MAX_KG : VALIDATION_LIMITS.WEIGHT_MAX_LB,
  }), [weightUnit]);

  const { minHeight, maxHeight } = useMemo(() => ({
    minHeight: heightUnit === 'cm' ? VALIDATION_LIMITS.HEIGHT_MIN_CM : VALIDATION_LIMITS.HEIGHT_MIN_INCHES,
    maxHeight: heightUnit === 'cm' ? VALIDATION_LIMITS.HEIGHT_MAX_CM : VALIDATION_LIMITS.HEIGHT_MAX_INCHES,
  }), [heightUnit]);

  const initializeValues = React.useCallback(() => {
    const onboardingData = getOnboardingData();
    const storedWeight = profile?.weight || onboardingData.weight;
    const preferredWeightUnit = profile?.weight_unit || onboardingData.weightUnit || 'kg';
    const storedHeight = profile?.height || onboardingData.height;
    const preferredHeightUnit = profile?.height_unit || onboardingData.heightUnit || 'cm';

    setWeightUnit(preferredWeightUnit);
    setHeightUnit(preferredHeightUnit);

    weightSlideAnim.setValue(preferredWeightUnit === 'lb' ? 0 : 1);
    heightSlideAnim.setValue(preferredHeightUnit === 'inches' ? 0 : 1);

    if (storedWeight) {
      const displayWeight = preferredWeightUnit === 'lb'
        ? Math.round(storedWeight * 2.20462)
        : Math.round(storedWeight);
      setWeight(displayWeight);
    }

    if (storedHeight) {
      const displayHeight = preferredHeightUnit === 'inches'
        ? Math.round(storedHeight / 2.54)
        : Math.round(storedHeight);
      setHeight(displayHeight);
    }
  }, [profile, getOnboardingData]);

  useEffect(() => {
    initializeValues();
  }, [initializeValues]);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleWeightUnitChange = (newUnit: 'kg' | 'lb') => {
    const oldUnit = weightUnit;
    setWeightUnit(newUnit);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (newUnit === 'lb' && oldUnit === 'kg') {
      setWeight(Math.round(weight * 2.20462));
    } else if (newUnit === 'kg' && oldUnit === 'lb') {
      setWeight(Math.round(weight / 2.20462));
    }

    Animated.spring(weightSlideAnim, {
      toValue: newUnit === 'lb' ? 0 : 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleHeightUnitChange = (newUnit: 'cm' | 'inches') => {
    const oldUnit = heightUnit;
    setHeightUnit(newUnit);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (newUnit === 'inches' && oldUnit === 'cm') {
      setHeight(Math.round(height / 2.54));
    } else if (newUnit === 'cm' && oldUnit === 'inches') {
      setHeight(Math.round(height * 2.54));
    }

    Animated.spring(heightSlideAnim, {
      toValue: newUnit === 'inches' ? 0 : 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleWeightAdjust = (delta: number) => {
    const newWeight = Math.max(minWeight, Math.min(maxWeight, weight + delta));
    setWeight(newWeight);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleHeightAdjust = (delta: number) => {
    const newHeight = Math.max(minHeight, Math.min(maxHeight, height + delta));
    setHeight(newHeight);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    if (!user?.id) {
      dialogManager.error(t('common.error'), t('account.userNotFound'));
      return;
    }

    if (weight < minWeight || weight > maxWeight) {
      dialogManager.error(t('common.error'), t('weightHeight.weightRange', { min: minWeight, max: maxWeight, unit: weightUnit }));
      return;
    }
    if (height < minHeight || height > maxHeight) {
      dialogManager.error(t('common.error'), t('weightHeight.heightRange', { min: minHeight, max: maxHeight, unit: heightUnit === 'inches' ? 'in' : heightUnit }));
      return;
    }

    setSaving(true);
    try {
      await userProfileService.updateUserProfile(user.id, {
        weight: weight,
        weightUnit: weightUnit,
        height: height,
        heightUnit: heightUnit,
      });
      useProfileStore.setState({ lastUpdated: Date.now() });
      await loadProfile(true);
      dialogManager.success(t('common.success'), t('weightHeight.updated'));
      navigation.goBack();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('weightHeight.failedToUpdate');
      dialogManager.error(t('common.error'), errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const weightTranslateX = weightSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, scaleWidth(100) + 2],
  });

  const heightTranslateX = heightSlideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [2, scaleWidth(100) + 2],
  });

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#030303', '#0a1a05', '#030303']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Glow */}
      <View style={styles.glowOrb} />
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={BRAND_WHITE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('weightHeight.title')}</Text>
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

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'weight' && styles.activeTab]}
          onPress={() => { setActiveTab('weight'); Haptics.selectionAsync(); }}
        >
          <Text style={[styles.tabText, activeTab === 'weight' && styles.activeTabText]}>{t('weightHeight.weight')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'height' && styles.activeTab]}
          onPress={() => { setActiveTab('height'); Haptics.selectionAsync(); }}
        >
          <Text style={[styles.tabText, activeTab === 'height' && styles.activeTabText]}>{t('weightHeight.height')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'weight' ? (
          /* Weight Section */
          <Animated.View style={styles.section}>
            {/* Note: Ideally use reanimated for smooth tab transitions, using simple rendering for now */}
            <View style={styles.iconHeader}>
              <LinearGradient
                colors={['rgba(132, 196, 65, 0.2)', 'rgba(132, 196, 65, 0.05)']}
                style={styles.iconCircle}
              >
                <Ionicons name="scale-outline" size={32} color={BRAND_PRIMARY} />
              </LinearGradient>
            </View>

            {/* Weight Unit Selector */}
            <View style={styles.unitSelectorContainer}>
              <View style={styles.unitSelector}>
                <Animated.View
                  style={[
                    styles.slidingBackground,
                    { transform: [{ translateX: weightTranslateX }] },
                  ]}
                />
                <Pressable style={styles.unitButton} onPress={() => handleWeightUnitChange('lb')}>
                  <Text style={[styles.unitText, weightUnit === 'lb' && styles.unitTextActive]}>lb</Text>
                </Pressable>
                <Pressable style={styles.unitButton} onPress={() => handleWeightUnitChange('kg')}>
                  <Text style={[styles.unitText, weightUnit === 'kg' && styles.unitTextActive]}>kg</Text>
                </Pressable>
              </View>
            </View>

            <WeightScale
              key="weight-scale"
              min={minWeight}
              max={maxWeight}
              initialValue={weight}
              unit={weightUnit}
              onValueChange={setWeight}
              containerStyle={styles.scaleContainer}
            />

            {/* Weight Adjust Buttons */}
            <View style={styles.adjustButtons}>
              <Pressable style={styles.adjustButton} onPress={() => handleWeightAdjust(-1)}>
                <View style={styles.adjustButtonInner}>
                  <Ionicons name="remove" size={24} color="#FFFFFF" />
                </View>
              </Pressable>
              <Pressable style={styles.adjustButton} onPress={() => handleWeightAdjust(1)}>
                <View style={styles.adjustButtonInner}>
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          /* Height Section */
          <Animated.View style={styles.section}>
            <View style={styles.iconHeader}>
              <LinearGradient
                colors={['rgba(132, 196, 65, 0.2)', 'rgba(132, 196, 65, 0.05)']}
                style={styles.iconCircle}
              >
                <Ionicons name="resize-outline" size={32} color={BRAND_PRIMARY} />
              </LinearGradient>
            </View>

            {/* Height Unit Selector */}
            <View style={styles.unitSelectorContainer}>
              <View style={styles.unitSelector}>
                <Animated.View
                  style={[
                    styles.slidingBackground,
                    { transform: [{ translateX: heightTranslateX }] },
                  ]}
                />
                <Pressable style={styles.unitButton} onPress={() => handleHeightUnitChange('inches')}>
                  <Text style={[styles.unitText, heightUnit === 'inches' && styles.unitTextActive]}>in</Text>
                </Pressable>
                <Pressable style={styles.unitButton} onPress={() => handleHeightUnitChange('cm')}>
                  <Text style={[styles.unitText, heightUnit === 'cm' && styles.unitTextActive]}>cm</Text>
                </Pressable>
              </View>
            </View>

            <WeightScale
              key="height-scale"
              min={minHeight}
              max={maxHeight}
              initialValue={height}
              unit={heightUnit}
              onValueChange={setHeight}
              containerStyle={styles.scaleContainer}
            />

            {/* Height Adjust Buttons */}
            <View style={styles.adjustButtons}>
              <Pressable style={styles.adjustButton} onPress={() => handleHeightAdjust(-1)}>
                <View style={styles.adjustButtonInner}>
                  <Ionicons name="remove" size={24} color="#FFFFFF" />
                </View>
              </Pressable>
              <Pressable style={styles.adjustButton} onPress={() => handleHeightAdjust(1)}>
                <View style={styles.adjustButtonInner}>
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                </View>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030303',
  },
  glowOrb: {
    position: 'absolute',
    width: scaleWidth(300),
    height: scaleWidth(300),
    borderRadius: scaleWidth(150),
    backgroundColor: 'rgba(132, 196, 65, 0.1)',
    top: scaleHeight(200),
    right: -scaleWidth(100),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Barlow_600SemiBold',
    color: '#FFFFFF',
  },
  saveButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    fontFamily: 'Barlow_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  // Content Styles
  section: {
    marginBottom: 40,
    alignItems: 'center',
  },
  iconHeader: {
    marginBottom: 30,
    alignItems: 'center',
  },
  iconCircle: {
    width: scaleWidth(80),
    height: scaleWidth(80),
    borderRadius: scaleWidth(24),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(132, 196, 65, 0.2)',
  },
  unitSelectorContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  unitSelector: {
    width: scaleWidth(200),
    height: scaleHeight(48),
    flexDirection: 'row',
    borderRadius: scaleWidth(24),
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  slidingBackground: {
    position: 'absolute',
    width: scaleWidth(96),
    height: scaleHeight(44),
    backgroundColor: '#84C441',
    borderRadius: scaleWidth(22),
    top: 2,
  },
  unitButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  unitText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(16),
    color: 'rgba(255, 255, 255, 0.5)',
  },
  unitTextActive: {
    color: '#FFFFFF',
  },
  scaleContainer: {
    marginBottom: 30,
  },
  adjustButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: getResponsiveSpacing(16),
  },
  adjustButton: {
    width: scaleWidth(56),
    height: scaleWidth(56),
    borderRadius: scaleWidth(18),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  adjustButtonInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
});
