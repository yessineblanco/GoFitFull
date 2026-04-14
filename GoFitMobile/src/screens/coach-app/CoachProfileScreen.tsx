import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Easing, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import {
  Package, FileText, Settings, LogOut, ChevronRight, Wallet, Palette,
  Users, Star, Calendar,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { useCoachStore } from '@/store/coachStore';
import { useProfileStore } from '@/store/profileStore';
import { useBookingsStore } from '@/store/bookingsStore';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { dialogManager } from '@/components/shared/CustomDialog';
import { resolvePublicAvatarUrl } from '@/utils/avatarUrl';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import {
  getBackgroundColor, getGlassBg, getGlassBorder, getBlurTint,
  getSurfaceColor, getTextSecondaryColor,
} from '@/utils/colorUtils';

export const CoachProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { user, signOut } = useAuthStore();
  const { profile: coachProfile, updateProfile } = useCoachStore();
  const { profilePictureUri } = useProfileStore();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const { coachBookings } = useBookingsStore();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();

  const glowAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true, tension: 40, friction: 7 }).start();
  }, []);

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Coach';
  const displayedAvatarUri = resolvePublicAvatarUrl(
    profilePictureUri || coachProfile?.profile_picture_url || null,
  );
  const blurTint = getBlurTint(isDark);

  const handleAvatarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      t('profile.profilePicture', { defaultValue: 'Profile picture' }),
      t('profile.chooseOption', { defaultValue: 'Choose an option' }),
      [
        {
          text: t('common.cancel', { defaultValue: 'Cancel' }),
          style: 'cancel',
        },
        {
          text: t('profile.camera', { defaultValue: 'Camera' }),
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                dialogManager.warning(
                  t('profile.permissionRequired', { defaultValue: 'Permission required' }),
                  t('profile.cameraPermissionMessage', { defaultValue: 'Please grant camera access to take a photo.' }),
                );
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setUploadingAvatar(true);
                try {
                  const url = await useProfileStore.getState().uploadProfilePicture(result.assets[0].uri);
                  if (coachProfile?.id && url) {
                    await updateProfile({ profile_picture_url: url });
                  }
                  dialogManager.success(
                    t('common.success', { defaultValue: 'Success' }),
                    t('profile.pictureUpdated', { defaultValue: 'Profile picture updated.' }),
                  );
                } catch (error: unknown) {
                  const msg = error instanceof Error ? error.message : t('common.error', { defaultValue: 'Error' });
                  dialogManager.error(t('common.error', { defaultValue: 'Error' }), msg);
                } finally {
                  setUploadingAvatar(false);
                }
              }
            } catch (error: unknown) {
              const msg = error instanceof Error ? error.message : t('common.error', { defaultValue: 'Error' });
              dialogManager.error(t('common.error', { defaultValue: 'Error' }), msg);
            }
          },
        },
        {
          text: t('profile.gallery', { defaultValue: 'Gallery' }),
          onPress: async () => {
            try {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                dialogManager.warning(
                  t('profile.permissionRequired', { defaultValue: 'Permission required' }),
                  t('profile.galleryPermissionMessage', { defaultValue: 'Please grant photo library access.' }),
                );
                return;
              }
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setUploadingAvatar(true);
                try {
                  const url = await useProfileStore.getState().uploadProfilePicture(result.assets[0].uri);
                  if (coachProfile?.id && url) {
                    await updateProfile({ profile_picture_url: url });
                  }
                  dialogManager.success(
                    t('common.success', { defaultValue: 'Success' }),
                    t('profile.pictureUpdated', { defaultValue: 'Profile picture updated.' }),
                  );
                } catch (error: unknown) {
                  const msg = error instanceof Error ? error.message : t('common.error', { defaultValue: 'Error' });
                  dialogManager.error(t('common.error', { defaultValue: 'Error' }), msg);
                } finally {
                  setUploadingAvatar(false);
                }
              }
            } catch (error: unknown) {
              const msg = error instanceof Error ? error.message : t('common.error', { defaultValue: 'Error' });
              dialogManager.error(t('common.error', { defaultValue: 'Error' }), msg);
            }
          },
        },
        ...(displayedAvatarUri
          ? [
              {
                text: t('profile.remove', { defaultValue: 'Remove' }),
                style: 'destructive' as const,
                onPress: () => {
                  dialogManager.show(
                    t('profile.removeProfilePicture', { defaultValue: 'Remove picture' }),
                    t('profile.removeConfirm', { defaultValue: 'Remove your profile picture?' }),
                    'warning',
                    {
                      showCancel: true,
                      confirmText: t('profile.remove', { defaultValue: 'Remove' }),
                      cancelText: t('common.cancel', { defaultValue: 'Cancel' }),
                      onConfirm: async () => {
                        setUploadingAvatar(true);
                        try {
                          await useProfileStore.getState().deleteProfilePicture();
                          if (coachProfile?.id) {
                            await updateProfile({ profile_picture_url: null });
                          }
                          dialogManager.success(
                            t('common.success', { defaultValue: 'Success' }),
                            t('profile.pictureRemoved', { defaultValue: 'Profile picture removed.' }),
                          );
                        } catch (error: unknown) {
                          const msg = error instanceof Error ? error.message : t('common.error', { defaultValue: 'Error' });
                          dialogManager.error(t('common.error', { defaultValue: 'Error' }), msg);
                        } finally {
                          setUploadingAvatar(false);
                        }
                      },
                    },
                  );
                },
              },
            ]
          : []),
      ],
    );
  };

  const uniqueClients = new Set(coachBookings.map(b => b.client_id)).size;
  const completedSessions = coachBookings.filter(b => b.status === 'completed').length;

  const handleSignOut = async () => {
    dialogManager.show(t('profile.signOut'), t('profile.signOutConfirm'), 'error', {
      showCancel: true,
      confirmText: t('profile.signOut'),
      cancelText: t('common.cancel'),
      onConfirm: async () => {
        try { await signOut(); } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : t('common.error');
          dialogManager.error(t('common.error'), msg);
        }
      },
    });
  };

  const menuItems = [
    { icon: Package, label: t('coachApp.myPacks'), screen: 'SessionPacks' },
    { icon: FileText, label: t('coachApp.myPrograms'), screen: 'ProgramsList' },
    { icon: Wallet, label: t('coachApp.wallet'), screen: 'CoachWallet' },
    { icon: Palette, label: t('profile.theme'), screen: 'ThemeSettings' },
    { icon: Settings, label: t('coachApp.settings'), screen: 'CoachSettings' },
  ];

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

  const gradientColors: [string, string, string] = isDark
    ? ['#030303', '#0a1a0a', '#030303']
    : [colors.background, '#EAF0EA', colors.background];

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor(isDark) }]}>
      <LinearGradient colors={gradientColors} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Profile Header */}
        <Animated.View style={[styles.headerSection, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
          <View style={styles.avatarSection}>
            <Animated.View style={[styles.avatarGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}>
              <LinearGradient
                colors={['rgba(132,196,65,0.4)', 'rgba(132,196,65,0)']}
                style={styles.avatarGlowGradient}
              />
            </Animated.View>
            <TouchableOpacity
              style={[styles.avatarRing, { borderColor: isDark ? 'rgba(132,196,65,0.5)' : 'rgba(132,196,65,0.6)' }]}
              onPress={handleAvatarPress}
              activeOpacity={0.85}
              disabled={uploadingAvatar}
            >
              {displayedAvatarUri ? (
                <ExpoImage source={{ uri: displayedAvatarUri }} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? 'rgba(132,196,65,0.12)' : 'rgba(132,196,65,0.15)' }]}>
                  <Text style={styles.avatarInitial}>{displayName[0].toUpperCase()}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
          {coachProfile?.status && (
            <View style={[styles.statusBadge, {
              backgroundColor: coachProfile.status === 'approved' ? 'rgba(132,196,65,0.15)' : 'rgba(255,193,7,0.15)',
            }]}>
              <View style={[styles.statusIndicator, {
                backgroundColor: coachProfile.status === 'approved' ? '#84c441' : '#FFC107',
              }]} />
              <Text style={[styles.statusText, { color: colors.text }]}>{coachProfile.status}</Text>
            </View>
          )}
        </Animated.View>

        {/* Stats Row */}
        <Animated.View style={[styles.statsRow, { opacity: fadeAnim }]}>
          {[
            { icon: Users, label: 'Clients', value: uniqueClients },
            { icon: Calendar, label: 'Sessions', value: completedSessions },
            { icon: Star, label: 'Rating', value: coachProfile?.average_rating ? Number(coachProfile.average_rating).toFixed(1) : '--' },
          ].map((stat, i) => (
            <View key={i} style={[styles.statBox, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark) }]}>
              <stat.icon size={16} color={theme.colors.primary} />
              <Text style={[styles.statBoxValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statBoxLabel, { color: colors.textLight }]}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Menu */}
        <Animated.View style={[styles.menuCard, { backgroundColor: getGlassBg(isDark), borderColor: getGlassBorder(isDark), opacity: fadeAnim }]}>
          {menuItems.map((item, index) => (
            <React.Fragment key={item.screen}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate(item.screen);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(132,196,65,0.08)' : 'rgba(132,196,65,0.1)' }]}>
                    <item.icon size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>{item.label}</Text>
                </View>
                <ChevronRight size={18} color={isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)'} />
              </TouchableOpacity>
              {index < menuItems.length - 1 && (
                <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }]} />
              )}
            </React.Fragment>
          ))}
        </Animated.View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
          <LogOut size={18} color="#EF5350" />
          <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 22 },

  // Header
  headerSection: { alignItems: 'center', marginBottom: 20 },
  avatarSection: { position: 'relative', marginBottom: 16 },
  avatarGlow: { position: 'absolute', width: 120, height: 120, top: -16, left: -16, borderRadius: 60 },
  avatarGlowGradient: { width: '100%', height: '100%', borderRadius: 60 },
  avatarRing: {
    width: 88, height: 88, borderRadius: 30, overflow: 'hidden',
    borderWidth: 2.5,
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontFamily: 'Barlow_700Bold', fontSize: 30, color: '#84c441' },
  name: { fontFamily: 'Barlow_800ExtraBold', fontSize: getResponsiveFontSize(24), marginBottom: 8 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14,
  },
  statusIndicator: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: 'Barlow_600SemiBold', fontSize: 12, textTransform: 'capitalize' },

  // Stats
  statsRow: {
    flexDirection: 'row', gap: 10, marginBottom: 24,
  },
  statBox: {
    flex: 1, alignItems: 'center', paddingVertical: 14,
    borderRadius: 16, borderWidth: 1, gap: 4,
  },
  statBoxValue: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(18) },
  statBoxLabel: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(11) },

  // Menu
  menuCard: { borderRadius: 18, borderWidth: 1, marginBottom: 20, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 15, paddingHorizontal: 16,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  menuItemText: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(15) },
  divider: { height: 1, marginHorizontal: 16 },

  // Sign out
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(239,83,80,0.08)', borderWidth: 1, borderColor: 'rgba(239,83,80,0.2)',
    borderRadius: 16, padding: 15,
  },
  signOutText: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(15), color: '#EF5350' },
});
