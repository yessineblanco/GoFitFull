import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { MessageCircle, Calendar } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useThemeColors } from '@/theme/useThemeColors';
import { getGlassBg, getGlassBorder, getTextSecondaryColor } from '@/utils/colorUtils';
import { getResponsiveFontSize, getResponsiveSpacing } from '@/utils/responsive';
import { resolvePublicAvatarUrl } from '@/utils/avatarUrl';
import { BlurView } from 'expo-blur';

export function ContactCoachCard() {
  const navigation = useNavigation<any>();
  const { isDark } = useThemeStore();
  const colors = useThemeColors();
  const { user, userType } = useAuthStore();
  const { conversations, loadConversationsForClient, setActiveConversation } = useChatStore();

  useEffect(() => {
    if (userType === 'client' && user?.id) {
      loadConversationsForClient(user.id);
    }
  }, [user?.id, userType, loadConversationsForClient]);

  if (userType !== 'client' || conversations.length === 0) {
    return null; // Only show for clients who have an assigned coach / active conversation
  }

  // Get the most recent conversation
  const latestConversation = conversations[0];

  const handleMessage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveConversation(latestConversation);
    navigation.navigate('ClientChatScreen', {
      conversationId: latestConversation.id,
      recipientName: latestConversation.other_user_name || 'Coach',
      recipientPictureUrl: latestConversation.other_user_picture
    });
  };

  const handleBook = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to coach detail or booking screen
    if (latestConversation.coach_id) {
      navigation.navigate('Marketplace', { 
        screen: 'CoachDetail', 
        params: { coachId: latestConversation.coach_id } 
      });
    }
  };

  const avatarUrl = resolvePublicAvatarUrl(latestConversation.other_user_picture);

  return (
    <View style={[styles.outer, { borderColor: getGlassBorder(isDark) }]}>
      <BlurView
        intensity={isDark ? 30 : 60}
        tint={isDark ? 'dark' : 'light'}
        style={styles.blur}
      />
      <View style={[styles.inner, { backgroundColor: getGlassBg(isDark) }]}>
        <Text style={[styles.title, { color: colors.text }]}>Your Coach</Text>
        
        <View style={styles.coachRow}>
          <ExpoImage 
            source={{ uri: avatarUrl || 'https://via.placeholder.com/150' }}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={styles.info}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {latestConversation.other_user_name || 'Coach'}
            </Text>
            <Text style={[styles.status, { color: getTextSecondaryColor(isDark) }]} numberOfLines={1}>
              {latestConversation.last_message || 'Start chatting...'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleMessage}>
            <MessageCircle size={16} color="#030303" />
            <Text style={styles.primaryText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton, { borderColor: getGlassBorder(isDark) }]} 
            onPress={handleBook}
          >
            <Calendar size={16} color={colors.text} />
            <Text style={[styles.secondaryText, { color: colors.text }]}>Book Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    marginHorizontal: getResponsiveSpacing(20),
    marginBottom: getResponsiveSpacing(24),
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  inner: {
    padding: getResponsiveSpacing(20),
  },
  title: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(14),
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(18),
    marginBottom: 4,
  },
  status: {
    fontFamily: 'Barlow_400Regular',
    fontSize: getResponsiveFontSize(14),
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#B4F04E',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  primaryText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(14),
    color: '#030303',
  },
  secondaryText: {
    fontFamily: 'Barlow_600SemiBold',
    fontSize: getResponsiveFontSize(14),
  },
});
