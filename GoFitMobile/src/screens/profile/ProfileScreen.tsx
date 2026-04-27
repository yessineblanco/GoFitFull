import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { GradientBackground } from '@/components/shared/GradientBackground';
// Removed BlurView for neon aesthetic
import { useAuthStore } from '@/store/authStore';
import { useProfileStore } from '@/store/profileStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useTextSizeStore } from '@/store/textSizeStore';
import { getScaledFontSize } from '@/store/textSizeStore';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { scaleWidth, scaleHeight, getResponsiveSpacing, getResponsiveFontSize } from '@/utils/responsive';
import { StackNavigationProp } from '@react-navigation/stack';
import type { ProfileStackParamList } from '@/types';
import { Image as ExpoImage } from 'expo-image';
import { Settings, User, LogOut, Bell, Type, ChevronRight, FileText, Shield, Pencil, Target, Ruler, Globe, Package, BookOpen, Calendar, MessageCircle, Scan, Activity } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { dialogManager } from '@/components/shared/CustomDialog';
import { Alert } from 'react-native';
import { theme } from '@/theme';
import { getBackgroundColor, getTextColor, getPrimaryWithOpacity, getTextColorWithOpacity, getGlassBg, getGlassBorder, getOverlayColor, getTextSecondaryColor, getTextLightColor } from '@/utils/colorUtils';

type NavigationProp = StackNavigationProp<ProfileStackParamList, 'ProfileMain'>;

const getGoalPulseColors = (goal: string | undefined, isDark: boolean) => {
  switch (goal) {
    case 'strength':
      return [theme.colors.primary, '#6db52b'];
    case 'hiit':
      return ['#FF4757', '#FF6B81'];
    case 'cardio':
      return ['#F1C40F', '#E67E22'];
    case 'functional':
      return ['#52C1B8', '#3498DB'];
    default:
      return [theme.colors.primary, '#6db52b'];
  }
};

interface ProfileScreenProps {
  navigation: NavigationProp;
}

import { useTabScroll } from '@/hooks/useTabScroll';

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const goalPulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(goalPulseAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(goalPulseAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  const { onScroll: handleTabScroll } = useTabScroll();
  const { t } = useTranslation();
  const { user, signOut, refreshUser } = useAuthStore();
  const { profile, profilePictureUri, loading, loadProfile } = useProfileStore();
  const { getOnboardingData } = useOnboardingStore();
  const { textSize } = useTextSizeStore();
  const { language } = useLanguageStore();
  const { isDark } = useThemeStore();
  const [imageLoading, setImageLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Theme colors
  const BRAND_BLACK = getBackgroundColor(isDark);
  const BRAND_WHITE = getTextColor(isDark);
  const BRAND_PRIMARY = theme.colors.primary;

  // Dynamic styles that react to text size changes
  // Using useMemo ensures styles update when textSize changes

  // Dynamic styles - Brand Gradient Mesh Aesthetic
  const dynamicStyles = React.useMemo(() => ({
    container: {
      flex: 1,
    },
    // Removed duplicate gradient styles as they are now in GradientBackground
    avatarOverlay: {
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    // Minimalist Card Style - No Borders, Dark Surface
    card: {
      borderRadius: 16,
      backgroundColor: getGlassBg(isDark),
      padding: 16,
      borderWidth: 0, // No borders
    },
    statBox: {
      borderRadius: 16,
      backgroundColor: getGlassBg(isDark),
      borderWidth: 0,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: 16,
    },
    currentGoalCard: {
      backgroundColor: getGlassBg(isDark),
      borderRadius: 16,
      borderWidth: 0,
      padding: 20,
    },
    // Removed glowWrapper styles - purely structural now if needed, or transparent
    glowWrapper: {
      padding: 0,
      backgroundColor: 'transparent',
      borderRadius: 16,
      shadowOpacity: 0,
    },
    settingsCard: {
      borderRadius: 16,
      backgroundColor: getGlassBg(isDark),
      borderWidth: 0,
      overflow: 'hidden' as const,
    },
    settingsItem: {
      backgroundColor: 'transparent',
      paddingVertical: 16, // More breathing room
    },
    iconContainer: {
      backgroundColor: 'rgba(132, 196, 65, 0.1)', // Subtle green background for icons
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    settingsItemValue: {
      color: getTextLightColor(isDark),
      fontSize: 14,
      fontFamily: 'Barlow_400Regular',
    },
    divider: {
      backgroundColor: getOverlayColor(isDark, 0.05),
      height: 1,
    },
    chevronIcon: {
      color: getOverlayColor(isDark, 0.3),
    },
    editBadge: {
      backgroundColor: theme.colors.primary,
      borderColor: BRAND_BLACK,
      borderWidth: 2,
    },
    userName: {
      fontSize: getScaledFontSize(24),
      fontWeight: '600' as const,
      color: BRAND_WHITE,
      marginBottom: getResponsiveSpacing(24),
      fontFamily: 'Barlow_600SemiBold',
      textAlign: 'center' as const,
    },
    avatarText: {
      fontSize: getScaledFontSize(36),
      fontWeight: '700' as const,
      color: BRAND_BLACK, // Black text on white/green placeholder
      fontFamily: 'Barlow_700Bold',
    },
    statValue: {
      fontSize: getScaledFontSize(20),
      fontWeight: '700' as const,
      color: theme.colors.primary, // Green text for stats
      fontFamily: 'Barlow_700Bold',
      marginBottom: 4,
    },
    statLabel: {
      fontSize: getScaledFontSize(11),
      fontWeight: '500' as const,
      color: getTextSecondaryColor(isDark),
      fontFamily: 'Barlow_400Regular',
      letterSpacing: 1,
      textTransform: 'uppercase' as const,
    },
    statLabelStatic: {
      color: getTextSecondaryColor(isDark),
    },
    sectionTitle: {
      fontSize: getScaledFontSize(14),
      fontWeight: '700' as const,
      color: getTextLightColor(isDark),
      fontFamily: 'Barlow_700Bold',
      marginBottom: getResponsiveSpacing(12),
      textTransform: 'uppercase' as const,
      letterSpacing: 1.5,
      marginLeft: 4,
    },
    settingsItemText: {
      fontSize: getScaledFontSize(15),
      fontWeight: '500' as const,
      color: BRAND_WHITE,
      fontFamily: 'Barlow_500Medium',
    },
    goalText: {
      fontSize: getScaledFontSize(12),
      fontWeight: '400' as const,
      color: getTextSecondaryColor(isDark),
      fontFamily: 'Barlow_400Regular',
    },
    signOutText: {
      fontSize: getScaledFontSize(16),
      fontWeight: '600' as const,
      color: '#ffffff',
      fontFamily: 'Barlow_600SemiBold',
      textAlign: 'center' as const,
    },
  }), [textSize, isDark]); // Re-compute when theme or textSize changes

  // Profile data is preloaded on app start, so we can use it immediately
  // Smart reload: only force reload if profile was updated recently (within 30 seconds)
  // This prevents unnecessary API calls while still ensuring fresh data after edits
  useFocusEffect(
    React.useCallback(() => {
      // Refresh user in background
      refreshUser();

      // Check if profile was recently updated (within last 30 seconds)
      const { getLastUpdateTime } = useProfileStore.getState();
      const lastUpdateTime = getLastUpdateTime();
      const shouldForceReload = lastUpdateTime && (Date.now() - lastUpdateTime) < 30000; // 30 seconds

      // Only force reload if profile was updated recently, otherwise use cache
      loadProfile(shouldForceReload || false);
    }, [refreshUser, loadProfile])
  );

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'User';
  const onboardingData = getOnboardingData();

  // Get weight and height from profile or onboarding data
  // Note: Values are stored in kg/cm, but we display in user's preferred unit
  const storedWeight = profile?.weight || onboardingData.weight;
  const weightUnit = profile?.weight_unit || onboardingData.weightUnit || 'kg';
  const storedHeight = profile?.height || onboardingData.height;
  const heightUnit = profile?.height_unit || onboardingData.heightUnit || 'cm';

  // Convert to display unit (stored in kg/cm, convert if user prefers lb/inches)
  const weight = storedWeight ? (weightUnit === 'lb' ? storedWeight * 2.20462 : storedWeight) : undefined;
  // Height: stored in cm, convert to inches if user preference is inches
  const height = storedHeight ? (heightUnit === 'inches' ? storedHeight / 2.54 : storedHeight) : undefined;

  // Helper to format height unit display
  const getHeightUnitDisplay = () => {
    if (heightUnit === 'inches') return 'IN';
    return 'CM';
  };
  const currentGoal = profile?.goal || onboardingData.goal;

  // Goal labels mapping
  const getGoalLabel = (goalId: string | undefined) => {
    if (!goalId) return 'Not set';
    const goalMap: Record<string, string> = {
      strength: 'Strength Training for Muscle Gain',
      hiit: 'High-Intensity Interval Training for Fat Loss',
      cardio: 'Cardiovascular Exercise for Fat Loss',
      functional: 'Functional Training for Overall Fitness',
    };
    return goalMap[goalId] || goalId;
  };

  const handleImagePicker = async () => {
    Alert.alert(
      'Profile Picture',
      'Choose an option',
      [
        {
          text: 'Camera',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                dialogManager.warning('Permission Required', 'Please grant camera permissions to take a photo.');
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                setUploading(true);
                try {
                  await useProfileStore.getState().uploadProfilePicture(result.assets[0].uri);
                  dialogManager.success('Success', 'Profile picture updated successfully!');
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile picture';
                  dialogManager.error('Error', errorMessage);
                } finally {
                  setUploading(false);
                }
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to take photo';
              dialogManager.error('Error', errorMessage);
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                dialogManager.warning('Permission Required', 'Please grant camera roll permissions to upload a profile picture.');
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });

              if (!result.canceled && result.assets[0]) {
                setUploading(true);
                try {
                  await useProfileStore.getState().uploadProfilePicture(result.assets[0].uri);
                  dialogManager.success('Success', 'Profile picture updated successfully!');
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : 'Failed to upload profile picture';
                  dialogManager.error('Error', errorMessage);
                } finally {
                  setUploading(false);
                }
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to pick image';
              dialogManager.error('Error', errorMessage);
            }
          },
        },
        ...(profilePictureUri ? [{
          text: 'Remove',
          style: 'destructive' as const,
          onPress: async () => {
            dialogManager.show(
              t('profile.removeProfilePicture'),
              t('profile.removeConfirm'),
              'warning',
              {
                showCancel: true,
                confirmText: t('profile.remove'),
                cancelText: t('common.cancel'),
                onConfirm: async () => {
                  setUploading(true);
                  try {
                    await useProfileStore.getState().deleteProfilePicture();
                    dialogManager.success(t('common.success'), t('profile.profilePictureRemoved'));
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to remove profile picture';
                    dialogManager.error('Error', errorMessage);
                  } finally {
                    setUploading(false);
                  }
                },
              }
            );
          },
        }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const handleSignOut = async () => {
    dialogManager.show(
      t('profile.signOut'),
      t('profile.signOutConfirm'),
      'error',
      {
        showCancel: true,
        confirmText: t('profile.signOut'),
        cancelText: t('common.cancel'),
        onConfirm: async () => {
          try {
            await signOut();
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : t('common.error');
            dialogManager.error(t('common.error'), errorMessage);
          }
        },
      }
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Memoized StatBox component to prevent unnecessary re-renders
  const StatBox = React.memo<{
    value: string;
    label: string;
    onPress: () => void;
    style?: any;
  }>(({ value, label, onPress, style }) => (
    <TouchableOpacity
      style={[styles.statBox, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[dynamicStyles.statValue, { textAlign: 'center' }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[dynamicStyles.statLabel, dynamicStyles.statLabelStatic]}>{label}</Text>
    </TouchableOpacity>
  ));

  return (
    <GradientBackground style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleTabScroll}
        scrollEventThrottle={16}
      >


        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={handleImagePicker}
            disabled={uploading}
          >
            {uploading ? (
              <View style={styles.avatarLoading}>
                <ActivityIndicator size="large" color={BRAND_PRIMARY} />
              </View>
            ) : profilePictureUri ? (
              <ExpoImage
                source={{ uri: profilePictureUri }}
                style={styles.avatar}
                contentFit="cover"
                transition={200}
                cachePolicy="disk"
                key={profilePictureUri}
                onLoadStart={() => setImageLoading(true)}
                onLoad={() => setImageLoading(false)}
                onError={() => setImageLoading(false)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={dynamicStyles.avatarText}>{getInitials(displayName)}</Text>
              </View>
            )}
            {imageLoading && (
              <View style={[styles.avatarOverlay, dynamicStyles.avatarOverlay]}>
                <ActivityIndicator size="small" color={BRAND_PRIMARY} />
              </View>
            )}
            <View style={[styles.editBadge, dynamicStyles.editBadge]}>
              <Pencil size={14} color={BRAND_BLACK} />
            </View>
          </TouchableOpacity>

          {/* Goal Pulse Glow */}
          <Animated.View
            style={[
              styles.goalPulseGlow,
              {
                borderColor: getGoalPulseColors(currentGoal, isDark)[0],
                transform: [{ scale: goalPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
                opacity: goalPulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.35] }),
              }
            ]}
          />

          <Text style={dynamicStyles.userName}>{displayName}</Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <StatBox
              style={dynamicStyles.statBox}
              value={weight ? `${Math.round(weight)} ${weightUnit.toUpperCase()}` : '--'}
              label="WEIGHT"
              onPress={() => navigation.navigate('EditWeightHeight', { initialTab: 'weight' })}
            />
            <StatBox
              style={dynamicStyles.statBox}
              value={height ? `${Math.round(height)} ${getHeightUnitDisplay()}` : '--'}
              label="HEIGHT"
              onPress={() => navigation.navigate('EditWeightHeight', { initialTab: 'height' })}
            />
          </View>
        </View>

        {/* Goals & Objectives Section */}
        <View style={styles.goalsContainer}>
          <Text style={dynamicStyles.sectionTitle}>Goals & Objectives</Text>

          {/* Settings Card: Goals */}
          <View style={[styles.settingsCard, dynamicStyles.settingsCard]}>
            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('Goals')}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <Target size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.goalContent}>
                  <Text style={dynamicStyles.settingsItemText}>{t('profile.fitnessGoal')}</Text>
                  <Text style={[dynamicStyles.goalText, { marginTop: 4 }]} numberOfLines={1}>
                    {getGoalLabel(currentGoal)}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('BodyMeasurement')}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <Scan size={20} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={dynamicStyles.settingsItemText}>Body measurements</Text>
                  <Text style={[dynamicStyles.goalText, { marginTop: 4, fontSize: 12 }]} numberOfLines={2}>
                    On-device estimate — photos stay private
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Coaching Section */}
        <View style={styles.settingsContainer}>
          <Text style={dynamicStyles.sectionTitle}>{t('profile.coaching')}</Text>
          <View style={[styles.settingsCard, dynamicStyles.settingsCard]}>
            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('MyPacks' as any)}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <Package size={20} color={theme.colors.primary} />
                </View>
                <Text style={dynamicStyles.settingsItemText}>{t('sessionPacks.myPacks')}</Text>
              </View>
              <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('MyPrograms' as any)}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <BookOpen size={20} color={theme.colors.primary} />
                </View>
                <Text style={dynamicStyles.settingsItemText}>{t('programs.myPrograms')}</Text>
              </View>
              <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('MyBookings' as any)}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <Calendar size={20} color={theme.colors.primary} />
                </View>
                <Text style={dynamicStyles.settingsItemText}>{t('booking.myBookings')}</Text>
              </View>
              <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('ClientConversations' as any)}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <MessageCircle size={20} color={theme.colors.primary} />
                </View>
                <Text style={dynamicStyles.settingsItemText}>{t('chat.conversations')}</Text>
              </View>
              <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings Sections */}
        <View style={styles.settingsContainer}>
          <Text style={dynamicStyles.sectionTitle}>{t('profile.appSettings')}</Text>

          <View style={[styles.settingsCard, dynamicStyles.settingsCard]}>
            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('AccountInformation')}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <User size={20} color={theme.colors.primary} />
                </View>
                <Text style={dynamicStyles.settingsItemText}>{t('profile.accountInformation')}</Text>
              </View>
              <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('NotificationsSettings')}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <Bell size={20} color={theme.colors.primary} />
                </View>
                <Text style={dynamicStyles.settingsItemText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{t('profile.notifications')}</Text>
              </View>
              <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('HealthSync')}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <Activity size={20} color={theme.colors.primary} />
                </View>
                <Text style={dynamicStyles.settingsItemText}>Health Sync</Text>
              </View>
              <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('UnitPreferences')}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <Ruler size={20} color={theme.colors.primary} />
                </View>
                <Text style={dynamicStyles.settingsItemText}>{t('profile.unitPreferences')}</Text>
              </View>
              <View style={styles.settingsItemRight}>
                <Text style={dynamicStyles.settingsItemValue}>
                  {weightUnit.toUpperCase()}/{getHeightUnitDisplay()}
                </Text>
                <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('TextSizeSettings')}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <Type size={20} color={theme.colors.primary} />
                </View>
                <Text style={dynamicStyles.settingsItemText}>{t('profile.textSize')}</Text>
              </View>
              <View style={styles.settingsItemRight}>
                <Text style={dynamicStyles.settingsItemValue}>
                  {textSize.charAt(0).toUpperCase() + textSize.slice(1)}
                </Text>
                <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('LanguageSettings')}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <Globe size={20} color={theme.colors.primary} />
                </View>
                <Text style={dynamicStyles.settingsItemText}>{t('profile.language')}</Text>
              </View>
              <View style={styles.settingsItemRight}>
                <Text style={dynamicStyles.settingsItemValue}>
                  {language === 'en' ? 'English' : 'Français'}
                </Text>
                <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
              </View>
            </TouchableOpacity>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('ThemeSettings')}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <Settings size={20} color={theme.colors.primary} />
                </View>
                <Text style={dynamicStyles.settingsItemText}>{t('profile.theme')}</Text>
              </View>
              <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>
          </View>
        </View>
        {/* Personal Information Section */}
        <View style={styles.settingsContainer}>
          <Text style={dynamicStyles.sectionTitle}>{t('profile.personalInformation')}</Text>

          <View style={[styles.settingsCard, dynamicStyles.settingsCard]}>
            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('EditProfile')}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <User size={20} color={theme.colors.primary} />
                </View>
                <Text style={dynamicStyles.settingsItemText}>{t('profile.editProfile')}</Text>
              </View>
              <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Support Section */}
        {/* Support Section */}
        <View style={styles.supportContainer}>
          <Text style={dynamicStyles.sectionTitle}>{t('profile.support')}</Text>

          <View style={[styles.settingsCard, dynamicStyles.settingsCard]}>
            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('TermsOfService')}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <FileText size={20} color={theme.colors.primary} />
                </View>
                <Text style={dynamicStyles.settingsItemText}>{t('profile.termsOfService')}</Text>
              </View>
              <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>

            <View style={[styles.divider, dynamicStyles.divider]} />

            <TouchableOpacity
              style={[styles.settingsItem, dynamicStyles.settingsItem]}
              onPress={() => navigation.navigate('PrivacyPolicy')}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                  <Shield size={20} color={theme.colors.primary} />
                </View>
                <Text style={dynamicStyles.settingsItemText}>{t('profile.privacyPolicy')}</Text>
              </View>
              <ChevronRight size={20} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Button */}
        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color={BRAND_WHITE} />
          <Text style={dynamicStyles.signOutText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => {
            dialogManager.show(
              t('profile.deleteAccount'),
              t('profile.deleteAccountConfirm'),
              'error',
              {
                showCancel: true,
                confirmText: t('profile.deleteAccount'),
                cancelText: t('common.cancel'),
                onConfirm: async () => {
                  try {
                    const { authService } = await import('@/services/auth');
                    await authService.deleteAccount();
                    await signOut(); // Sign out after deletion
                    dialogManager.success(t('common.success'), t('profile.accountDeleted'));
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : t('profile.failedToDeleteAccount');
                    dialogManager.error(t('common.error'), errorMessage);
                  }
                },
              }
            );
          }}
        >
          <Text style={styles.deleteAccountText}>{t('profile.deleteAccount')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </GradientBackground >
  );
};

// Base styles - colors will be applied dynamically
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: getResponsiveSpacing(20),
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  backgroundGradient: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: getResponsiveSpacing(40),
    paddingBottom: getResponsiveSpacing(30),
    zIndex: 1,
    position: 'relative',
  },
  goalPulseGlow: {
    position: 'absolute',
    top: getResponsiveSpacing(40),
    width: scaleWidth(120),
    height: scaleWidth(120),
    borderRadius: scaleWidth(60),
    borderWidth: 20,
    zIndex: -1,
  },
  avatarContainer: {
    width: scaleWidth(120),
    height: scaleHeight(120),
    borderRadius: scaleWidth(60),
    marginBottom: getResponsiveSpacing(20),
    position: 'relative',
  },
  avatar: {
    width: scaleWidth(120),
    height: scaleHeight(120),
    borderRadius: scaleWidth(60),
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarPlaceholder: {
    width: scaleWidth(120),
    height: scaleHeight(120),
    borderRadius: scaleWidth(60),
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  avatarText: {
    fontSize: getResponsiveFontSize(36),
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: 'Barlow_700Bold',
  },
  avatarLoading: {
    width: scaleWidth(120),
    height: scaleHeight(120),
    borderRadius: scaleWidth(60),
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: scaleWidth(60),
    // backgroundColor applied dynamically
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: scaleWidth(36),
    height: scaleHeight(36),
    borderRadius: scaleWidth(18),
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  userName: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: '600',
    marginBottom: getResponsiveSpacing(24),
    fontFamily: 'Barlow_600SemiBold',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveSpacing(12),
    paddingHorizontal: getResponsiveSpacing(24),
  },
  statBox: {
    width: scaleWidth(120),
    minWidth: scaleWidth(120),
    maxWidth: scaleWidth(120),
    flexShrink: 0,
    flexGrow: 0,
    borderRadius: scaleWidth(15),
    padding: getResponsiveSpacing(12),
    alignItems: 'center',
    justifyContent: 'center',
    // properties moved to dynamicStyles
  },
  statValue: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: theme.colors.primary,
    marginBottom: getResponsiveSpacing(4),
    fontFamily: 'Barlow_600SemiBold',
  },
  statLabel: {
    fontSize: getResponsiveFontSize(10),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Barlow_600SemiBold',
    // Color applied dynamically
  },
  goalsContainer: {
    paddingHorizontal: getResponsiveSpacing(24),
    marginTop: getResponsiveSpacing(30),
    zIndex: 1,
  },
  goalContent: {
    flex: 1,
    marginLeft: getResponsiveSpacing(12),
  },
  goalSubtext: {
    fontSize: getResponsiveFontSize(12),
    marginTop: getResponsiveSpacing(2),
    fontFamily: 'Barlow_400Regular',
    // Color applied dynamically
  },
  settingsContainer: {
    paddingHorizontal: getResponsiveSpacing(24),
    marginTop: getResponsiveSpacing(30),
    zIndex: 1,
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    marginBottom: getResponsiveSpacing(14),
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Barlow_700Bold',
    // Color applied dynamically
  },
  settingsCard: {
    borderRadius: scaleWidth(20),
    // properties moved to dynamicStyles
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: getResponsiveSpacing(18),
    // backgroundColor applied dynamically
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // Allow flex shrinking
  },
  iconContainer: {
    width: scaleWidth(36),
    height: scaleHeight(36),
    borderRadius: scaleWidth(18),
    // backgroundColor applied dynamically
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: getResponsiveSpacing(12),
  },
  settingsItemText: {
    fontSize: getResponsiveFontSize(15),
    fontWeight: '600',
    fontFamily: 'Barlow_600SemiBold',
    flexShrink: 1, // Allow text to shrink if needed
    // Color applied dynamically
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSpacing(8),
  },
  settingsItemValue: {
    fontSize: getResponsiveFontSize(10),
    fontWeight: '600',
    fontFamily: 'Barlow_600SemiBold',
    // Color applied dynamically
  },
  divider: {
    height: 1,
    marginHorizontal: getResponsiveSpacing(18),
    // backgroundColor applied dynamically
  },
  supportContainer: {
    paddingHorizontal: getResponsiveSpacing(24),
    marginTop: getResponsiveSpacing(30),
    zIndex: 1,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `rgba(239, 83, 80, 0.1)`,
    borderWidth: 1.5,
    borderColor: `rgba(239, 83, 80, 0.3)`,
    borderRadius: scaleWidth(16),
    padding: getResponsiveSpacing(18),
    marginHorizontal: getResponsiveSpacing(24),
    marginTop: getResponsiveSpacing(30),
    zIndex: 1,
  },
  signOutText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    marginLeft: getResponsiveSpacing(8),
    fontFamily: 'Barlow_600SemiBold',
    // Color applied dynamically
  },
  deleteAccountButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 83, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 83, 80, 0.3)',
    borderRadius: scaleWidth(16),
    padding: getResponsiveSpacing(18),
    marginHorizontal: getResponsiveSpacing(24),
    marginTop: getResponsiveSpacing(16),
    zIndex: 1,
  },
  deleteAccountText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#EF5350',
    fontFamily: 'Barlow_600SemiBold',
  },
});
