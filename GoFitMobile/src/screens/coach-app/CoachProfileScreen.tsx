import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import {
  Package, FileText, User, Settings, LogOut, ChevronRight, Wallet,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { useCoachStore } from '@/store/coachStore';
import { useProfileStore } from '@/store/profileStore';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';
import { dialogManager } from '@/components/shared/CustomDialog';

const PRIMARY_GREEN = '#B4F04E';

export const CoachProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const { user, signOut } = useAuthStore();
  const { profile: coachProfile } = useCoachStore();
  const { profilePictureUri } = useProfileStore();

  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || 'Coach';

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

  const menuItems = [
    {
      icon: Package,
      label: t('coachApp.myPacks'),
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('SessionPacks');
      },
    },
    {
      icon: FileText,
      label: t('coachApp.myPrograms'),
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('ProgramsList');
      },
    },
    {
      icon: Wallet,
      label: t('coachApp.wallet'),
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('CoachWallet');
      },
    },
    {
      icon: Settings,
      label: t('coachApp.settings'),
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('CoachSettings');
      },
    },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {profilePictureUri ? (
              <ExpoImage source={{ uri: profilePictureUri }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{displayName[0].toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={styles.name}>{displayName}</Text>
          {coachProfile?.status && (
            <View style={[styles.statusBadge, coachProfile.status === 'approved' ? styles.statusApproved : styles.statusPending]}>
              <Text style={styles.statusText}>{coachProfile.status}</Text>
            </View>
          )}
        </View>

        {/* Menu */}
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.iconContainer}>
                    <item.icon size={20} color={PRIMARY_GREEN} />
                  </View>
                  <Text style={styles.menuItemText}>{item.label}</Text>
                </View>
                <View style={styles.menuItemRight}>
                  {item.comingSoon && <Text style={styles.comingSoonBadge}>{t('coachApp.soon')}</Text>}
                  <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
                </View>
              </TouchableOpacity>
              {index < menuItems.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#EF5350" />
          <Text style={styles.signOutText}>{t('profile.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  avatarContainer: {
    width: 88, height: 88, borderRadius: 30, overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(180,240,78,0.3)', marginBottom: 16,
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: {
    width: '100%', height: '100%', backgroundColor: 'rgba(180,240,78,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontFamily: 'Barlow_700Bold', fontSize: 28, color: '#B4F04E' },
  name: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(22), color: '#FFFFFF', marginBottom: 8 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusApproved: { backgroundColor: 'rgba(180,240,78,0.15)' },
  statusPending: { backgroundColor: 'rgba(255,193,7,0.15)' },
  statusText: { fontFamily: 'Barlow_600SemiBold', fontSize: 12, color: '#FFFFFF', textTransform: 'capitalize' },
  menuCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 16, paddingHorizontal: 16,
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconContainer: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(180,240,78,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuItemText: { fontFamily: 'Barlow_500Medium', fontSize: getResponsiveFontSize(15), color: '#FFFFFF' },
  menuItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  comingSoonBadge: {
    fontFamily: 'Barlow_500Medium', fontSize: 10, color: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: 16 },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(239,83,80,0.1)', borderWidth: 1, borderColor: 'rgba(239,83,80,0.3)',
    borderRadius: 16, padding: 16,
  },
  signOutText: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(16), color: '#EF5350' },
});
