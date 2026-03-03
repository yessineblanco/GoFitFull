import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';
import { getResponsiveFontSize } from '@/utils/responsive';
import { useTranslation } from 'react-i18next';

const PRIMARY_GREEN = '#B4F04E';

export const CoachChatScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#030303', '#0a1a0a', '#030303']} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.content, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>{t('coachApp.chat')}</Text>
        <View style={styles.placeholder}>
          <MessageCircle size={48} color="rgba(180,240,78,0.3)" />
          <Text style={styles.comingSoon}>{t('coachApp.comingSoon')}</Text>
          <Text style={styles.subtitle}>{t('coachApp.chatDesc')}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030303' },
  content: { flex: 1, paddingHorizontal: 24 },
  title: { fontFamily: 'Barlow_700Bold', fontSize: getResponsiveFontSize(24), color: '#FFFFFF', marginBottom: 40 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  comingSoon: { fontFamily: 'Barlow_600SemiBold', fontSize: getResponsiveFontSize(18), color: PRIMARY_GREEN },
  subtitle: { fontFamily: 'Barlow_400Regular', fontSize: getResponsiveFontSize(14), color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 260 },
});
